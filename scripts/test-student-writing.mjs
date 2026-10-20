import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

mkdirSync('tmp/writing-qa', { recursive: true });
async function bundle(entry, name) {
  const outfile = resolve(`tmp/writing-qa/${name}.mjs`);
  await build({ entryPoints: [entry], outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm', alias: { '@': resolve('src') } });
  return import(pathToFileURL(outfile));
}
const engine = await bundle('src/lib/uhpabWritingEngine.ts', 'engine');
const flow = await bundle('src/lib/projectWritingFlow.ts', 'flow');
const model = await bundle('src/lib/chapterWorkspace.ts', 'model');
const failures = await bundle('src/lib/writingFailure.ts', 'failure');
const editor = await bundle('src/pages/Projects/ProjectEditorContent.tsx', 'editor');
let checks = 0;
function check(label, run) { run(); checks++; console.log(`PASS ${label}`); }
const topic = 'PREDICTORS OF TREATMENT DEFAULT AMONG DRUG-SENSITIVE TUBERCULOSIS PATIENTS AT KIYUMBA HEALTH CENTRE IV, KAMPALA';
const empty = () => ({ title: topic, chapters: {}, progress: {} });
const background = { projectTitle: topic, projectType: 'proposal', sectionKey: 'chapter1', componentId: 'background', componentLabel: 'Background to the Study', requireEvidence: true };

check('HTML paragraph boundaries and punctuation survive normalization', () => {
  const input = ['Global evidence informs this study.', 'Regional research provides further context.', 'National findings inform the research gap.', 'The confirmed local context motivates the study.'].map(p => `<p>${p}</p>`).join('');
  const output = engine.normalizeUhpabGeneratedDraft(input, background);
  assert.equal((output.match(/<p>/g) || []).length, 4);
  assert.doesNotMatch(output, /\.\.|<\/p>\./);
  assert.match(output, /context motivates the study\.<\/p>$/);
});
check('Strict generation rejects oversized, flattened and unsupported drafts', () => {
  assert.throws(() => engine.normalizeUhpabGeneratedDraft(`<p>${'word '.repeat(551)}</p>`, background), /word limit/);
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('<p>Only one paragraph.</p>', background), /4-6/);
  for (const marker of ['[citation needed]', '[insert local data]', '[[unknown]]']) {
    assert.throws(() => engine.normalizeUhpabGeneratedDraft(`<p>${marker}</p>`, background), /missing evidence/);
  }
  assert.throws(() => engine.normalizeUhpabGeneratedDraft('<p>Evidence (Invented, 2025).</p>', background), /saved source/);
});
check('Every save merges the active text without mutating previously saved data', () => {
  const before = { ...empty(), chapters: { chapter1: { introduction: 'Old draft', background: 'Keep this background' }, references: { content: 'Keep these references', items: [] } } };
  const next = flow.mergeActiveWriting(before, 'proposal', 'chapter1', 'introduction', '<p>Latest student edit.</p>', false, { section: 'chapter1', component: 'background' });
  assert.equal(before.chapters.chapter1.introduction, 'Old draft');
  assert.equal(next.chapters.chapter1.introduction, '<p>Latest student edit.</p>');
  assert.equal(next.chapters.chapter1.background, 'Keep this background');
  assert.equal(next.chapters.references.content, 'Keep these references');
  assert.deepEqual(next.chapters._activeWritingStep, { section: 'chapter1', component: 'background' });
});
check('Progress counts reviewed sections, never word count or prefilled approvals', () => {
  const long = flow.mergeActiveWriting(empty(), 'proposal', 'chapter1', 'introduction', 'word '.repeat(1000), false);
  assert.equal(long.progress.chapter1, 0);
  const reviewed = flow.mergeActiveWriting(long, 'proposal', 'chapter1', 'introduction', 'Reviewed introduction.', true);
  assert.equal(reviewed.progress.chapter1, Math.round(100 / flow.writingSections('proposal', 'chapter1').length));
  assert.ok(!flow.writingSections('proposal', 'chapter1').some(([id]) => id === 'researchObjectives'));
  assert.equal(flow.sectionReviewed({ ...empty(), chapters: { preliminaryPages: { approval: 'Template approval' } } }, 'preliminaryPages', 'approval'), false);
});
check('Changed facts invalidate review without deleting the draft', () => {
  const saved = flow.mergeActiveWriting(empty(), 'proposal', 'chapter1', 'introduction', 'Reviewed introduction.', true);
  assert.equal(flow.sectionReviewed(saved, 'chapter1', 'introduction'), true);
  for (const changed of [{ ...saved, title: 'Changed title' }, { ...saved, chapters: { ...saved.chapters, _studyContext: { design: 'Changed design' } } }]) {
    assert.equal(flow.sectionReviewed(changed, 'chapter1', 'introduction'), false);
    assert.equal(changed.chapters.chapter1.introduction, 'Reviewed introduction.');
  }
});
check('Full-project drafting uses the same evidence and methodology gates', () => {
  assert.equal(flow.projectChapterWorkspace(empty(), 'proposal', 'chapter1').id, flow.projectChapterWorkspace(empty(), 'proposal', 'chapter1').id, 'Study fields must retain their DOM identity while typing');
  assert.ok(model.generationNeeds(flow.projectChapterWorkspace(empty(), 'proposal', 'chapter2'), 'body').some(s => /objectives/.test(s)));
  assert.ok(model.generationNeeds(flow.projectChapterWorkspace(empty(), 'proposal', 'chapter1'), 'background').some(s => /source/.test(s)));
  assert.ok(model.generationNeeds(flow.projectChapterWorkspace(empty(), 'proposal', 'chapter3'), 'studyDesign').length);
  const stale = { ...empty(), chapters: { _studyContext: { objectives: 'Old confirmed objectives' }, chapter1: { specificObjectives: 'New unreviewed objectives' } } };
  assert.equal(flow.projectChapterWorkspace(stale, 'proposal', 'chapter2').context.objectives, undefined);
});
check('Cited saved evidence is retained in the reference list', () => {
  const source = { id: 'qa', title: 'Evidence', authors: 'WHO', year: '2021', citationText: '(WHO, 2021)', apaReference: 'WHO. (2021). Evidence.', notes: 'Supporting finding.', intendedUse: '', url: '' };
  const before = { ...empty(), chapters: { _sourcesLibrary: [source], references: { content: 'Existing reference' } } };
  const next = flow.mergeActiveWriting(before, 'proposal', 'chapter1', 'background', '<p>Evidence (WHO, 2021).</p>', false);
  assert.match(next.chapters.references.content, /Existing reference/);
  assert.match(next.chapters.references.content, /WHO\. \(2021\)/);
  const again = flow.mergeActiveWriting(next, 'proposal', 'chapter1', 'background', '<p>Evidence (WHO, 2021).</p>', false);
  assert.equal(again.chapters.references.content, next.chapters.references.content);
});
check('Provider failures are distinguished from invalid drafts', () => {
  assert.equal(failures.writingFailure(new Error('503 high demand')).retryable, true);
  assert.match(failures.writingFailure(new Error('Invalid API key')).title, /key/);
  assert.equal(failures.writingFailure(new Error('Objectives do not align')).retryable, false);
});
check('Save/navigation UI uses the unified persistence path and accessible collapsed steps', () => {
  const page = readFileSync('src/pages/Projects/ProjectEdit.tsx', 'utf8');
  assert.match(page, /const value = isEditing \? sanitizeChapterHtml\(temporaryContent\) : selectedContent/);
  assert.match(page, /if \(!await saveWriting/);
  assert.match(page, /aria-expanded/);
  assert.doesNotMatch(page, /humanizeResearchText/);
  const content = readFileSync('src/pages/Projects/ProjectEditorContent.tsx', 'utf8');
  assert.match(content, /<details/);
  assert.match(content, /<fieldset disabled=\{busy\}/);
  assert.doesNotMatch(content, /Writing box:|Human review|Generate intro \+ background/);
});
check('Focused editor keeps the roadmap in a closed drawer and section preparation collapsible', () => {
  const page = readFileSync('src/pages/Projects/ProjectEdit.tsx', 'utf8');
  assert.match(page, /\[roadmapVisible, setRoadmapVisible\] = useState\(false\)/);
  assert.match(page, /<Sheet open=\{roadmapVisible\}/);
  assert.match(page, /setRoadmapVisible\(false\)/);
  assert.doesNotMatch(page, /xl:grid-cols-\[360px_minmax/);
  assert.match(page, /key=\{`\$\{selectedSection\}-\$\{selectedComponent\}`\} type="single" collapsible/);
});
check('Empty and populated sections have distinguishable primary actions and a single save footer', () => {
  const base = { isEditing: false, startEditing() {}, cancelEditing() {}, saveContent() {}, temporaryContent: '', setTemporaryContent() {}, improveWithAI() {}, label: 'Introduction', description: 'Brief chapter preview.', currentValue: '', canNext: true, nextLabel: 'Background', onReview() {} };
  const render = props => renderToStaticMarkup(React.createElement(editor.ProjectEditorContent, { ...base, ...props }));
  const empty = render({});
  assert.match(empty, /Generate draft/);
  assert.match(empty, /Write myself/);
  assert.match(empty, /Finish later/);
  assert.match(empty, /Next: Background/);
  const populated = render({ currentValue: '<p>Existing draft.</p>' });
  assert.doesNotMatch(populated, /Generate draft/);
  assert.match(populated, /Edit section/);
  assert.equal((populated.match(/Save and Next/g) || []).length, 1);
  const editing = render({ isEditing: true, temporaryContent: '<p>Current edit.</p>' });
  assert.match(editing, /Cancel editing/);
  assert.equal((editing.match(/Save and Next/g) || []).length, 1);
  assert.match(editing, /fixed inset-x-0 bottom-0/);
});
console.log(`\n${checks} student-writing checks passed. No student documents or external API calls used.`);
