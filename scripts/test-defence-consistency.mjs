import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';
import 'fake-indexeddb/auto';

mkdirSync('tmp/defence-consistency-qa', { recursive: true });
const outfile = resolve('tmp/defence-consistency-qa/consistency.mjs');
await build({ stdin: { contents: `export * from './src/lib/defenceConsistency'; export * from './src/lib/defenceSlides'; export * from './src/lib/defenceSlidesStore'; export * from './src/lib/defenceDraftStore'; export { createDefenceDraftCheckpoint } from './src/lib/defenceDraftCheckpoint'; export { buildDefenceHandout, buildDefencePptx } from './src/lib/defenceSlidesExport';`, resolveDir: process.cwd(), loader: 'ts' }, outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm', alias: { '@': resolve('src') }, define: { 'import.meta.env': '{}' } });
const m = await import(pathToFileURL(outfile));
const title = 'Factors associated with handwashing among nurses aged 18-49 years at Test Health Centre IV';
function factsFixture() {
  const facts = m.emptyDefenceFacts();
  const data = {
    topic: title, candidate: 'Synthetic Candidate', htin: 'TEST-001', school: 'Test School', course: 'Test Programme', supervisor: 'Synthetic Supervisor',
    background: 'Globally, handwashing is studied (QA, 2024). At Test Health Centre IV, this proposal concerns nurses. Local factors remain unknown.',
    problem: 'Ideally, nurses should receive handwashing supplies. However, local practice is not yet established (QA, 2024). A research gap remains. If barriers persist, infection prevention opportunities may be missed.',
    aim: 'To determine the factors associated with handwashing among nurses aged 18-49 years at test health centre IV.',
    objectives: ['socio-demographic', 'individual', 'health facility-related'].map(category => `To assess the ${category} factors associated with handwashing among nurses aged 18-49 years at test health centre IV.`).join('\n'),
    questions: ['socio-demographic', 'individual', 'health facility-related'].map(category => `What are the ${category} factors associated with handwashing among nurses aged 18-49 years at test health centre IV?`).join('\n'),
    scope: 'Content: handwashing among nurses aged 18-49 years.\nPlace: Test Health Centre IV.\nPeriod: Proposed six weeks in November 2026, subject to approval.',
    literature: 'A local evidence gap remains (QA, 2024).', justification: 'The study is needed because local evidence is incomplete.', contribution: 'Findings could inform nurses and managers in planning handwashing support.',
    design: 'Proposed analytical cross-sectional study to examine associations at one time.', setting: 'Proposed setting: Test Health Centre IV.', population: 'Proposed population: nurses aged 18-49 years at Test Health Centre IV.',
    eligibility: 'Proposed inclusion of consenting nurses only, excluding those on leave.', sample: 'Proposed sample size of 385, with assumed p=50%, d=5% and 95% confidence.', sampling: 'Proposed simple random sampling from the verified register.',
    instruments: 'Proposed questionnaire and observation checklist.', variables: 'Proposed outcome: handwashing; predictors: individual and facility factors.', collection: 'Proposed collection over six weeks after approval.', quality: 'Proposed training, pretesting and completeness checks.',
    analysis: 'Proposed descriptive summaries and appropriate association tests.', ethics: 'Proposed institutional approval and informed consent before recruitment.', references: 'QA. (2024). Synthetic test source, not actual evidence.',
  };
  for (const [key, value] of Object.entries(data)) facts[key] = { value, source: `Synthetic proposal / ${key}`, status: 'found' };
  return facts;
}
const snapshot = (facts = factsFixture(), version = 'version-1') => m.captureDefenceSource(facts, { kind: 'project', name: 'Synthetic proposal', projectId: 'synthetic-project', sourceVersion: version });
const fixture = () => { const facts = factsFixture(); return m.createDefenceDeck(facts, { sourceName: 'Synthetic proposal', projectId: 'synthetic-project', sourceVersion: 'version-1', durationMinutes: 10, sourceSnapshot: snapshot(facts) }); };
const editField = (deck, index, key, value) => { const label = m.DEFENCE_FACT_FIELDS.find(field => field.key === key).label; const at = deck.slides[index].bullets.findIndex(text => text.startsWith(`${label}:`)); assert.ok(at >= 0); deck.slides[index].bullets[at] = `${label}: ${value}`; };
const has = (deck, code, field) => m.reviewDefenceConsistency(deck).some(item => item.code === code && (!field || item.field === field));
let checked = 0;
const check = async (name, run) => { await run(); checked++; console.log(`PASS ${name}`); };

await check('Original snapshots are independent of later edits and validated as untrusted data', () => {
  const facts = factsFixture(), captured = snapshot(facts), before = structuredClone(captured);
  facts.design.value = 'Changed'; assert.deepEqual(captured, before);
  assert.equal(m.readDefenceSourceSnapshot({ ...captured, apiKey: 'not allowed' }), null);
  assert.equal(m.readDefenceSourceSnapshot({ ...captured, capturedAt: 'bad date' }), null);
  const bad = structuredClone(captured); delete bad.facts.design; assert.equal(m.readDefenceSourceSnapshot(bad), null);
});
await check('Canonical slides have no consistency findings and review is read-only', () => {
  const deck = fixture(), before = structuredClone(deck);
  assert.deepEqual(m.reviewDefenceConsistency(deck), []); assert.deepEqual(deck, before);
});
await check('Harmless extractive shortening preserves design and qualifications without a false contradiction', () => {
  const deck = fixture(); editField(deck, 6, 'design', 'Proposed cross-sectional study.');
  assert.deepEqual(m.reviewDefenceConsistency(deck), []);
});
await check('Paraphrases are review items, not asserted research contradictions', () => {
  const deck = fixture(); editField(deck, 6, 'design', 'Proposed cross-sectional approach examining relationships.');
  const issues = m.reviewDefenceConsistency(deck).filter(item => item.field === 'design');
  assert.equal(issues.length, 1); assert.equal(issues[0].level, 'review'); assert.match(issues[0].detail, /not proof/);
});
await check('Different design and recruitment methods are compared with their correct source fields', () => {
  const deck = fixture(); editField(deck, 6, 'design', 'Proposed longitudinal cohort study.'); editField(deck, 7, 'sampling', 'Proposed convenience sampling.');
  assert.ok(has(deck, 'design-changed', 'design')); assert.ok(has(deck, 'recruitment-changed', 'sampling'));
});
await check('Changed sample figures and assumptions cannot borrow numbers from unrelated sections', () => {
  const deck = fixture(); deck.facts.background.value += ' A different source mentioned 120.';
  editField(deck, 7, 'sample', 'Proposed sample size of 120 with 90% confidence.');
  assert.ok(has(deck, 'numbers-changed', 'sample'));
});
await check('Citation years are not mislabelled as sample figures or study dates', () => {
  const deck = fixture(); deck.slides[1].bullets = deck.slides[1].bullets.map(text => text.replace('(QA, 2024)', '(Another, 2025)'));
  assert.equal(has(deck, 'numbers-changed', 'background'), false);
});
await check('Age-range and named setting losses remain visible outside objectives', () => {
  const deck = fixture(); editField(deck, 6, 'population', 'Proposed population: nurses aged 18-65 years at Another Hospital.'); editField(deck, 6, 'setting', 'Proposed setting: Another Hospital.');
  assert.ok(has(deck, 'numbers-changed', 'population')); assert.ok(has(deck, 'topic-detail-missing', 'population')); assert.ok(has(deck, 'topic-detail-missing', 'setting'));
});
await check('Calendar months and written collection durations are checked', () => {
  const deck = fixture(); deck.slides[4].bullets = deck.slides[4].bullets.map(text => text.replace('November', 'December'));
  editField(deck, 8, 'collection', 'Proposed collection over eight weeks after approval.');
  assert.ok(has(deck, 'period-changed', 'scope')); assert.ok(has(deck, 'period-changed', 'collection'));
});
await check('Dropping assumed, unconfirmed, only or excluding qualifications requires review', () => {
  const deck = fixture(); editField(deck, 6, 'eligibility', 'Proposed inclusion of consenting nurses.');
  assert.ok(has(deck, 'wording-review', 'eligibility'));
});
await check('New completed approvals and research results are never silently accepted as proposal facts', () => {
  const deck = fixture(); editField(deck, 8, 'ethics', 'Approval was obtained and consent was obtained.'); editField(deck, 8, 'collection', 'Data were collected and participants were recruited.');
  assert.ok(has(deck, 'new-approval', 'ethics')); assert.ok(has(deck, 'new-results', 'collection'));
});
await check('Changed or newly invented identities are caught without generating a replacement person', () => {
  const deck = fixture(); editField(deck, 0, 'candidate', 'Different Person'); assert.ok(has(deck, 'identity-changed', 'candidate'));
  deck.facts.supervisor = { value: '', source: '', status: 'missing' }; assert.ok(has(deck, 'unsupplied-detail', 'supervisor'));
});
await check('Objective categories, counts and population changes reuse the established formulation review', () => {
  const deck = fixture(); deck.slides[3].bullets[1] = deck.slides[3].bullets[1].replace('socio-demographic', 'individual');
  assert.ok(m.reviewDefenceConsistency(deck).some(item => item.field === 'objectives' && item.code.startsWith('section-rule:')));
});
await check('Unlabelled custom points need manual review instead of guessed field attribution', () => {
  const deck = fixture(); deck.slides[7].bullets = ['We will use a different strategy.'];
  assert.ok(has(deck, 'custom-wording'));
});
await check('Legacy presentations disclose the lack of an original import snapshot', () => {
  const deck = fixture(); delete deck.sourceSnapshot;
  assert.match(m.defenceConsistencyReport(deck), /No original import snapshot/);
  assert.deepEqual(m.reviewDefenceConsistency(deck), []);
});
await check('Update previews do not mutate input, touch unselected slides or change custom notes and sizes', () => {
  const deck = fixture(); deck.slides[6].notes = 'Custom speaker notes must survive.'; deck.slides[6].bodyFontSize = 20;
  editField(deck, 6, 'design', 'Proposed cohort study.'); const before = structuredClone(deck);
  const next = m.previewDefenceSlideUpdate(deck, [6]);
  assert.deepEqual(deck, before); assert.equal(next.slides[6].notes, before.slides[6].notes); assert.equal(next.slides[6].bodyFontSize, 20);
  next.slides.forEach((slide, index) => { if (index !== 6) assert.deepEqual(slide, before.slides[index]); });
  assert.deepEqual(next.facts, before.facts); assert.deepEqual(next.sourceSnapshot, before.sourceSnapshot);
});
await check('A source revision updates selected fields and retains unrelated edits inside the same slide', () => {
  const deck = fixture(); editField(deck, 6, 'population', 'My custom population wording.');
  const updated = factsFixture(); updated.design.value = 'Proposed cohort study.';
  const next = m.previewDefenceSlideUpdate(deck, [6], snapshot(updated, 'version-2'));
  assert.equal(next.facts.design.value, updated.design.value); assert.ok(next.slides[6].bullets.includes('Study population: My custom population wording.'));
  assert.deepEqual(next.sourceSnapshot, deck.sourceSnapshot); assert.equal(next.comparisonSource.sourceVersion, 'version-2');
  assert.match(next.facts.design.source, /version-2/);
});
await check('Missing revision fields never erase supplied details, draft methods or identities', () => {
  const deck = fixture(), updated = factsFixture(); updated.design = { value: '', source: '', status: 'missing' }; updated.candidate = { value: '', source: '', status: 'missing' };
  const next = m.previewDefenceSlideUpdate(deck, [0, 6], snapshot(updated, 'version-2'));
  assert.deepEqual(next.facts.design, deck.facts.design); assert.deepEqual(next.facts.candidate, deck.facts.candidate);
});
await check('A changed topic requires including the title before applying a source revision', () => {
  const deck = fixture(), updated = factsFixture(); updated.topic.value = title.replace('handwashing', 'infection prevention');
  assert.throws(() => m.previewDefenceSlideUpdate(deck, [6], snapshot(updated, 'version-2')), /Include the title/);
  const next = m.previewDefenceSlideUpdate(deck, [0], snapshot(updated, 'version-2')); assert.equal(next.slides[0].title, updated.topic.value);
});
await check('Partial proposal adoption cannot claim that all source changes were applied', () => {
  const deck = fixture(), updated = factsFixture(); updated.design.value = 'Proposed cohort study.'; updated.sample.value = 'Proposed sample size of 120.';
  const revision = snapshot(updated, 'version-2'), partial = m.previewDefenceSlideUpdate(deck, [6], revision);
  assert.equal(partial.sourceVersion, 'version-1'); assert.ok(m.changedDefenceSourceFields(partial, revision).includes('sample'));
  const complete = m.previewDefenceSlideUpdate(partial, [7], revision); assert.equal(complete.sourceVersion, 'version-2');
});
await check('Invalid selections and corrupt revision records fail without changing a deck', () => {
  const deck = fixture(), before = structuredClone(deck);
  for (const indexes of [[], [1, 1], [-1], [10], [1.5]]) assert.throws(() => m.previewDefenceSlideUpdate(deck, indexes), /Select/);
  assert.throws(() => m.previewDefenceSlideUpdate(deck, [6], { ...snapshot(), version: 2 }), /invalid/); assert.deepEqual(deck, before);
});
await check('Source snapshots survive owner-scoped recovery and deck storage without keys or prompts', async () => {
  const deck = fixture(), owner = 'synthetic-consistency-owner'; await m.saveDefenceDeck(owner, deck);
  assert.deepEqual((await m.listDefenceDecks(owner))[0].sourceSnapshot, deck.sourceSnapshot);
  assert.deepEqual(await m.listDefenceDecks('unrelated-owner'), []);
  const session = { id: 'snapshot-recovery', ownerId: owner, source: { name: deck.sourceName }, sourceSnapshot: deck.sourceSnapshot, durationMinutes: 10, testData: true, updatedAt: new Date().toISOString(), checkpoint: m.createDefenceDraftCheckpoint(deck.facts) };
  await m.saveDefenceDraftSession(session); const restored = await m.loadDefenceDraftSession(owner);
  assert.deepEqual(restored.sourceSnapshot, deck.sourceSnapshot); assert.doesNotMatch(JSON.stringify(restored), /apiKey|systemPrompt/);
});
await check('Screen findings and original-input limitations are retained in handout and PowerPoint notes', async () => {
  const deck = fixture(); editField(deck, 7, 'sample', 'Proposed sample size of 120.');
  const report = m.defenceConsistencyReport(deck); assert.match(report, /120/); assert.match(report, /Original source version: version-1/);
  assert.ok(m.buildDefenceHandout(deck).includes(report));
  const zip = await JSZip.loadAsync(await (await m.buildDefencePptx(deck)).arrayBuffer());
  const notes = await zip.file('ppt/notesSlides/notesSlide10.xml').async('string');
  assert.match(notes, /PROPOSAL AND SLIDE CONSISTENCY REVIEW/); assert.match(notes, /New numbers or dates/);
});
console.log(`${checked} defence consistency checks passed. Synthetic fixtures; no model or network requests.`);
