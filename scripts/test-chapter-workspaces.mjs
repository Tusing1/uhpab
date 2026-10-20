import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import JSZip from 'jszip';

mkdirSync('tmp/chapter-qa', { recursive: true });
async function bundle(entry, name, plugins = []) {
  const outfile = resolve(`tmp/chapter-qa/${name}.mjs`);
  await build({ entryPoints: [entry], outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm', alias: { '@': resolve('src') }, plugins });
  return import(pathToFileURL(outfile));
}
const model = await bundle('src/lib/chapterWorkspace.ts', 'model');
const engine = await bundle('src/lib/uhpabWritingEngine.ts', 'engine');
const sourceLookup = await bundle('src/lib/chapterSourceLookup.ts', 'lookup');
const api = await bundle('src/lib/api.ts', 'docx');
let checked = 0;
async function check(label, run) { await run(); checked++; console.log(`PASS ${label}`); }
const title = 'PREDICTORS OF TREATMENT DEFAULT AMONG DRUG-SENSITIVE TUBERCULOSIS PATIENTS AT KIYUMBA HEALTH CENTRE IV, KAMPALA';
const create = (key = 'chapter1', type = 'proposal') => model.newChapterWorkspace('qa', type, key, title, model.chapterSections(type, key).map(([id]) => id));
const source = { id: 'source', title: 'Evidence', authors: 'WHO', year: '2021', citationText: '(WHO, 2021)', apaReference: 'WHO. (2021). Evidence. https://example.invalid/source', notes: 'A supplied finding, not an invented statistic.', intendedUse: '', url: 'https://example.invalid/source' };

await check('Every chapter uses canonical sections and document numbering', () => {
  for (const type of ['proposal', 'report']) for (const key of ['chapter1', 'chapter2', 'chapter3']) {
    const w = create(key, type);
    model.validateChapterWorkspace(w);
    assert.ok(w.selectedSectionIds.length >= 2);
    assert.ok(!w.selectedSectionIds.includes('researchObjectives'));
    assert.match(model.chapterStructure(type, key).title, /CHAPTER/);
  }
  assert.throws(() => model.newChapterWorkspace('qa', 'proposal', 'chapter1', '', ['introduction']), /topic/);
  assert.throws(() => model.newChapterWorkspace('qa', 'proposal', 'chapter1', title, ['obsolete']), /section/);
});
await check('Chapter One introduction uses the short deterministic contract without a model', () => {
  const context = model.workspaceWritingContext(create(), 'introduction');
  const contract = engine.getUhpabSectionContract(context);
  assert.equal(contract.mode, 'deterministic');
  const output = contract.fallback(context);
  assert.ok(model.plainChapterText(output).split(/\s+/).length <= 45);
  assert.doesNotMatch(output, /citation needed|microvascular/);
});
await check('Narrative drafts can start from a topic without compulsory source forms', () => {
  assert.equal(model.generationNeeds(create(), 'background').length, 0);
  const w = create('chapter2');
  assert.equal(model.generationNeeds(w, 'body').length, 0);
  w.context.objectives = 'To assess the stated outcome.';
  w.sources = [{ ...source, notes: '' }];
  assert.equal(model.workspaceSources(w, 'body').length, 0);
  w.sources = [source];
  assert.equal(model.generationNeeds(w, 'body').length, 0);
});
await check('Sources scoped to another section do not substantiate the current draft', () => {
  const w = create(); w.context = { setting: 'Confirmed setting', rationale: 'Confirmed gap' };
  w.sources = [{ ...source, intendedUse: 'statementOfProblem' }];
  assert.equal(model.workspaceSources(w, 'background').length, 0);
  w.sources[0].intendedUse = 'background';
  assert.equal(model.generationNeeds(w, 'background').length, 0);
});
await check('Methodology requires actual design, sample justification and sampling choices only', () => {
  const w = create('chapter3');
  assert.equal(model.generationNeeds(w, 'sampleSize').length, 1);
  w.context.design = 'quantitative';
  assert.ok(model.generationNeeds(w, 'studyDesign').some(s => s.includes('actual study design')));
  w.context.design = 'Cross-sectional survey because the study measures the current situation.';
  assert.equal(model.generationNeeds(w, 'studyDesign').length, 0);
  assert.equal(model.generationNeeds(w, 'ethicalConsiderations').length, 0);
  assert.ok(model.workspaceWritingContext(w, 'sampleSize').studyContext.includes('Never invent numbers'));
});
await check('Topic, facts or source changes retain text but invalidate reviewed sections', () => {
  const w = create(); w.sections.introduction = { content: '<p>Existing work.</p>', status: 'reviewed' };
  const changed = model.changeWorkspaceContext(w, { topic: `${title} UPDATED` });
  assert.equal(changed.sections.introduction.content, '<p>Existing work.</p>');
  assert.equal(changed.sections.introduction.status, 'needs-information');
  assert.equal(model.changeWorkspaceContext(w, { context: w.context }).sections.introduction.status, 'reviewed');
});
await check('Reviewed objectives preserve separate lines for one-to-one questions', () => {
  const w = create();
  const context = model.workspaceWritingContext(w, 'specificObjectives');
  const content = engine.normalizeUhpabGeneratedDraft('<ol><li>To identify socio-demographic predictors.</li><li>To assess patient-related predictors.</li><li>To examine health facility-related predictors.</li></ol>', context);
  w.sections.specificObjectives = { content, status: 'drafting' };
  const reviewed = model.reviewWorkspaceSection(w, 'specificObjectives');
  assert.equal(reviewed.context.objectives.split('\n').length, 3);
  const questionsContext = model.workspaceWritingContext(reviewed, 'researchQuestions');
  assert.equal((engine.getUhpabSectionContract(questionsContext).fallback(questionsContext).match(/<li>/g) || []).length, 3);
  w.sections.specificObjectives.content = '<p>To investigate some factors.</p>';
  assert.throws(() => model.reviewWorkspaceSection(w, 'specificObjectives'), /exactly 3/);
});
await check('Review rejects unresolved placeholders and unsupported citations without deleting text', () => {
  const w = create(); w.sections.background = { content: '<p>Evidence (Invented, 2022).</p>', status: 'drafting' };
  assert.throws(() => model.reviewWorkspaceSection(w, 'background'), /not linked/);
  assert.match(w.sections.background.content, /Invented/);
  w.sections.background.content = '<p>[[Add evidence]]</p>';
  assert.throws(() => model.reviewWorkspaceSection(w, 'background'), /placeholders/);
});
await check('Narrative and parenthetical citations both retain their reference', () => {
  const w = create(); w.sources = [source];
  assert.equal(model.citedWorkspaceSources(w, '<p>WHO (2021) reports this.</p>').length, 1);
  assert.equal(model.citedWorkspaceSources(w, '<p>Evidence (WHO, 2021).</p>').length, 1);
  assert.equal(model.citedWorkspaceSources(w, '<p>No citation.</p>').length, 0);
});
await check('Website lookup never sends the hostname to an article search', async () => {
  const result = await sourceLookup.lookupChapterSource('nursesrevisionuganda.com', () => { throw new Error('Must not search articles'); });
  assert.match(result.url, /https:\/\/nursesrevisionuganda.com/);
  assert.match(result.apaReference, /Actual page title/);
  assert.equal(result.citationText, '');
});
await check('DOI lookup checks identity and title search rejects weak matches', async () => {
  const fixture = { DOI: '10.1234/example', title: ['Factors associated with treatment completion'], author: [{ family: 'Example', given: 'A' }], published: { 'date-parts': [[2021]] } };
  const result = await sourceLookup.lookupChapterSource('10.1234/example', async () => ({ ok: true, json: async () => ({ message: fixture }) }));
  assert.equal(result.citationText, '(Example, 2021)');
  assert.equal(result.notes, '');
  await assert.rejects(sourceLookup.lookupChapterSource('Factors associated with diabetes screening barriers', async () => ({ ok: true, json: async () => ({ message: { items: [fixture] } }) })), /No close/);
  await assert.rejects(sourceLookup.lookupChapterSource('10.1234/wrong', async () => ({ ok: true, json: async () => ({ message: fixture }) })), /does not match/);
});
await check('DOCX includes only selected sections, continuous body, formatting and editable tables', async () => {
  const blob = await api.buildTemplateDocx('proposal', { chapters: { chapter1: { introduction: '<p>A <strong>short introduction</strong>.</p>', background: '<p>Background (WHO, 2021).</p><table><tr><th>Category</th><th>Count</th></tr><tr><td>A</td><td>5</td></tr></table>', statementOfProblem: 'MUST NOT APPEAR' }, references: { content: source.apaReference } } }, { chapterKey: 'chapter1', sectionIds: ['introduction', 'background'] });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('word/document.xml').async('string');
  assert.match(xml, /1.0 Introduction/); assert.match(xml, /1.1 Background/);
  assert.doesNotMatch(xml, /MUST NOT APPEAR|APPENDICES|DECLARATION|CHAPTER TWO/);
  assert.match(xml, /<w:tbl>/); assert.match(xml, /<w:b\/>/);
  assert.match(xml, /w:line="480"/); assert.match(xml, /Times New Roman/);
  assert.match(xml, /w:start="1"/); assert.match(xml, /w:hanging="720"/);
  assert.equal((xml.match(/w:type="page"/g) || []).length, 1, 'Only references starts a new page');
  writeFileSync('tmp/chapter-qa/chapter-one.docx', Buffer.from(await blob.arrayBuffer()));
});
await check('Unmatched manual citations get an explicit reference placeholder', async () => {
  const blob = await api.buildTemplateDocx('report', { chapters: { chapter2: { introduction: '<p>Evidence (WHO, 2021).</p>' } } }, { chapterKey: 'chapter2', sectionIds: ['introduction'] });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('word/document.xml').async('string');
  assert.match(xml, /REFERENCES/); assert.match(xml, /Add full APA/);
  assert.doesNotMatch(xml, /CHAPTER THREE|DECLARATION/);
});
await check('Existing full-document export still includes cover, preliminaries and appendices', async () => {
  const blob = await api.buildTemplateDocx('proposal', { title, chapters: {} });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('word/document.xml').async('string');
  assert.match(xml, /DECLARATION/); assert.match(xml, /APPENDICES/); assert.match(xml, /CHAPTER THREE/);
  assert.doesNotMatch(xml, /COMMITMENT/);
});
const remoteCalls = [];
globalThis.chapterTestDb = { fail: false, rpc: async (name, args) => {
  remoteCalls.push({ name, args });
  return globalThis.chapterTestDb.fail ? { error: { message: 'Version conflict' } } : { data: { payload: args.p_payload, version: args.p_expected_version + 1, updated_at: '2026-10-18T12:00:00Z' } };
} };
const store = await bundle('src/lib/chapterWorkspaceStore.ts', 'store', [{ name: 'mock-db', setup(build) {
  build.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: 'test-db', namespace: 'test' }));
  build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const supabase = globalThis.chapterTestDb;', loader: 'js' }));
} }]);
await check('Cloud saves use versioned RPC and never silently fall back to browser storage', async () => {
  const w = create(); w.userId = '00000000-0000-4000-8000-000000000001';
  const saved = await store.saveChapterWorkspace(w);
  assert.equal(saved.version, 1); assert.equal(remoteCalls[0].name, 'save_chapter_workspace');
  assert.equal(remoteCalls[0].args.p_expected_version, 0);
  globalThis.chapterTestDb.fail = true;
  await assert.rejects(store.saveChapterWorkspace(saved), /Version conflict/);
  assert.equal(w.version, 0);
});
await check('Migration restricts owners, checks versions and keeps a transfer history', () => {
  const sql = readFileSync('supabase/migrations/202610180001_chapter_workspaces.sql', 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public.chapter_workspaces from anon, authenticated/);
  assert.match(sql, /user_id=auth.uid\(\) and version=p_expected_version/);
  assert.match(sql, /p.updated_at is distinct from p_project_updated_at/);
  assert.match(sql, /_chapterWorkspaceHistory/);
  assert.doesNotMatch(sql, /cron\.schedule|expires_at/);
});
console.log(`\n${checked} chapter workspace checks passed. No external API calls or student data used.`);
