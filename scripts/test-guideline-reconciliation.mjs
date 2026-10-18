import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import JSZip from 'jszip';

async function load(path) {
  const bundled = await build({ entryPoints: [path], bundle: true, platform: 'node', format: 'esm', write: false });
  return import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
}
const rules = await load('src/data/researchGuidelineRules.ts');
const proposal = (await load('src/data/proposalStructure.ts')).default;
const report = (await load('src/data/reportStructure.ts')).default;
const engine = await load('src/lib/uhpabWritingEngine.ts');
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
await check('Preliminary order is shared and removes retired pages', () => {
  for (const [type, structure] of [['proposal', proposal], ['report', report]]) {
    assert.deepEqual(Object.keys(structure.preliminaryPages.sections), rules.preliminaryKeys(type));
    assert.ok(!Object.keys(structure.preliminaryPages.sections).some(key => /commitment|authorization/i.test(key)));
    assert.ok(structure.preliminaryPages.sections.approval);
  }
  assert.equal(Object.keys(report.preliminaryPages.sections).indexOf('abstract'), 9);
});
await check('Appendix order, ethical documents and report-only similarity are correct', () => {
  assert.deepEqual(Object.keys(proposal.appendices.sections), ['tools', 'ethicalRequirements', 'maps', 'pictures', 'informationSheets', 'budget', 'workPlan']);
  assert.deepEqual(Object.keys(report.appendices.sections), ['tools', 'ethicalRequirements', 'maps', 'pictures', 'informationSheets', 'similarityReport']);
});
await check('Training snapshots no longer require title-page supervisor details', () => {
  for (const file of ['uhpab_code.json', 'uhpab_report_guidelines.json', 'uhpab_proposal_guidelines.json']) {
    const rows = JSON.parse(readFileSync(`src/data/${file}`));
    assert.ok(!rows.some(row => /supervisor_commitment|copyright|authorization/.test(row.section_id)));
    const title = rows.find(row => /title_page$|titlePage$/.test(row.section_id));
    assert.ok(!title.rules_and_guidelines.some(rule => /supervisor|qualifications/i.test(rule)));
  }
});
await check('Gemini receives canonical rules and retains approval but not retired sections', () => {
  const prompt = engine.buildUhpabGenerationPrompt({ projectType: 'proposal', sectionKey: 'chapter3', componentId: 'studyDesign', componentLabel: '3.1 Study design' }, 'draft');
  assert.ok(prompt.includes(rules.GUIDELINE_VERSION)); assert.ok(prompt.includes('Supervisor/principal approval remains required'));
  assert.ok(prompt.includes('similarity report')); assert.ok(prompt.includes('distinguish study design'));
});
const context = { projectType: 'report', sectionKey: 'preliminaryPages', componentId: 'abstract', componentLabel: 'Abstract' };
await check('Abstract citations and excessive length are rejected', () => {
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('The study found a gap (WHO, 2024).', context), /Citations/);
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('word '.repeat(301), context), /300-word/);
});
await check('Retired sections and report-only proposal sections are rejected', () => {
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('text', { ...context, componentId: 'supervisorCommitment' }), /not part/);
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('text', { ...context, projectType: 'proposal' }), /report-only/);
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('text', { ...context, sectionKey: 'appendices', componentId: 'workPlan' }), /proposal only/);
});
await check('A quantitative approach alone cannot pass as a design', () => {
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('The study design is quantitative.', { ...context, sectionKey: 'chapter3', componentId: 'studyDesign' }), /actual study design/);
});
await check('Unknown citations are rejected; saved citations are allowed', () => {
  const c = { ...context, sectionKey: 'chapter1', componentId: 'background' };
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('Evidence supports the study (WHO, 2024).', c), /not linked/);
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('According to WHO (2024), evidence supports the study.', c), /not linked/);
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('Evidence supports the study (WHO, 2024; Smith, 2023).', { ...c, knownSources: [{ organization: 'WHO', year: '2024' }] }), /not linked/);
  assert.ok(engine.normalizeUhpabGeneratedDraft('Evidence supports the study (WHO, 2024).', { ...c, knownSources: [{ organization: 'WHO', year: '2024' }] }).includes('WHO'));
});
mkdirSync('tmp', { recursive: true });
await build({ entryPoints: ['src/lib/api.ts'], bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: 'tmp/guideline-export.cjs' });
const { buildTemplateDocx } = createRequire(import.meta.url)('../tmp/guideline-export.cjs');
const data = { title: 'FACTORS ASSOCIATED WITH TREATMENT COMPLETION AMONG ADULT PATIENTS AT KIYUMBA HEALTH CENTRE IV, KAMPALA', student: { name: 'QA Student', htin: 'JAN26/U001/001', className: 'Diploma in Nursing' }, chapters: { preliminaryPages: { titlePage: '<p>SUPERVISOR: OLD NAME</p>', supervisorCommitment: '<p>OLD COMMITMENT</p>', ivDedication: '<p>Legacy dedication preserved.</p>' }, chapter1: { statementOfProblem: '<p>Existing research problem preserved.</p>' }, appendices: { consentForm: '<p>Legacy consent preserved.</p>', tools: '<p>Saved questionnaire preserved.</p>' } } };
for (const type of ['proposal', 'report']) await check(`${type} DOCX has corrected structure, numbering and preserved legacy work`, async () => {
  const blob = await buildTemplateDocx(type, data);
  const buffer = Buffer.from(await blob.arrayBuffer());
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml').async('string');
  assert.ok(!xml.includes('OLD NAME') && !xml.includes('OLD COMMITMENT') && !xml.includes('AUTHORIZATION AND COPYRIGHT'));
  assert.ok(xml.includes('APPROVAL') && xml.includes('Supervisor name:'));
  assert.ok(xml.includes('Existing research problem preserved.') && xml.includes('Legacy consent preserved.'));
  assert.ok(xml.includes('w:fmt="lowerRoman"') && xml.includes('w:fmt="decimal"'));
  assert.equal((xml.match(/<w:sectPr/g) || []).length, 3);
  assert.ok(!xml.includes('w:sz w:val="28"'));
  assert.ok(xml.indexOf('Appendix 1: Data collection tools') < xml.indexOf('Appendix 2: Ethical requirements'));
  if (type === 'proposal') { assert.ok(xml.includes('Proposed budget') && xml.includes('Work plan')); assert.ok(!xml.includes('Similarity index report') && !xml.includes('ABSTRACT')); }
  else { assert.ok(!xml.includes('Proposed budget') && !xml.includes('Work plan')); assert.ok(xml.includes('Similarity index report') && xml.includes('Legacy dedication preserved.')); assert.ok(xml.includes('5.2 Recommendations') && xml.includes('5.4 Implications')); }
  writeFileSync(`tmp/uhpab-${type}-reconciled-qa.docx`, buffer);
});
console.log(`${passed} guideline reconciliation checks passed.`);
