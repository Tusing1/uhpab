import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';

const bundle = await build({ entryPoints: ['src/lib/documentSectionDetection.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { detectDocumentSection, headingSection, partitionPageLines, applyUserSelectedSection } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const prelim = { sectionTitle: 'preliminary', chapter: 'Preliminary pages' };
const methods = { sectionTitle: 'methodology', chapter: 'Chapter Three' };
assert.equal(headingSection('CHAPTER TWO: LITERATURE REVIEW').sectionTitle, 'literature');
assert.equal(headingSection('CHAPTER ONE INTRODUCTION').sectionTitle, 'introduction');
assert.equal(headingSection('CHAPTER THREE: METHODOLOGY\t23'), null);
assert.equal(headingSection('CHAPTER THREE ........... 23'), null);
assert.equal(detectDocumentSection('The study design responds to the research questions.', methods).sectionTitle, 'methodology');
assert.equal(detectDocumentSection('This chapter discusses the results and references in detail.', methods).sectionTitle, 'methodology');
assert.equal(detectDocumentSection('1.2 Statement of the problem', prelim).sectionTitle, 'introduction');
assert.equal(detectDocumentSection('2.1 Introduction', prelim).sectionTitle, 'literature');
assert.equal(detectDocumentSection('2.1 Introduction', methods).sectionTitle, 'methodology');
assert.equal(detectDocumentSection('REFERENCES', methods).sectionTitle, 'references');
assert.equal(detectDocumentSection('This study used references and appendices.', methods).sectionTitle, 'methodology');
assert.equal(detectDocumentSection('Literature Review', { sectionTitle: 'discussion', chapter: 'Discussion' }).sectionTitle, 'discussion');
assert.equal(detectDocumentSection('CHAPTER TWO: LITERATURE REVIEW', methods).sectionTitle, 'literature');
console.log('PASS Standalone section headings are recognised without reclassifying normal prose or table-of-contents entries');

const page = partitionPageLines(['Continued introduction text.', 'CHAPTER TWO: LITERATURE REVIEW', 'Literature content.', 'CHAPTER THREE: METHODOLOGY', 'Methods content.'], 7, { sectionTitle: 'introduction', chapter: 'Chapter One' });
assert.deepEqual(page.chunks.map(c => c.sectionTitle), ['introduction', 'literature', 'methodology']);
assert.ok(page.chunks.every(c => c.pageNumber === 7));
assert.equal(page.lastSection.sectionTitle, 'methodology');
console.log('PASS Mixed-section PDF pages retain separate section chunks and the actual page number');
const unknownChunks = [{ sectionTitle: 'unknown', chapter: 'Unknown section', pageNumber: null, text: 'A deliberately unheaded excerpt.' }];
assert.equal(applyUserSelectedSection(unknownChunks, 'methodology')[0].sectionTitle, 'methodology');
assert.equal(applyUserSelectedSection(unknownChunks, 'full')[0].sectionTitle, 'unknown');
assert.equal(applyUserSelectedSection([{ ...unknownChunks[0], sectionTitle: 'introduction' }], 'methodology')[0].sectionTitle, 'introduction');
assert.equal(unknownChunks[0].sectionTitle, 'unknown');
console.log('PASS Explicit section selection applies only to unclassified excerpts and preserves identified chapters');

await build({ entryPoints: ['src/lib/markingGuidePdf.ts'], outfile: 'tmp/document-sections-pdf-qa.mjs', bundle: true, packages: 'external', platform: 'node', format: 'esm', alias: { '@': resolve('src') } });
const { createMarkingGuidePdfDocument } = await import(pathToFileURL(resolve('tmp/document-sections-pdf-qa.mjs')));
const report = { matchedGuidelines: 0, totalGuidelines: 1, issues: [], rubricScore: { awarded: 0, total: 1, sections: [], provisional: true } };
const historical = createMarkingGuidePdfDocument(report, 'proposal', 'full', 'TEST ONLY', undefined, true).output();
const current = createMarkingGuidePdfDocument(report, 'proposal', 'full', 'TEST ONLY').output();
assert.match(historical, /HISTORICAL REPORT/);
assert.match(historical, /another chapter/);
assert.doesNotMatch(current, /HISTORICAL REPORT/);
console.log('PASS Older marking exports carry a clear warning while current reports do not');
if (process.argv.includes('--pdf')) {
  writeFileSync('tmp/student-journey-qa/historical-marking.pdf', Buffer.from(createMarkingGuidePdfDocument(report, 'proposal', 'full', 'TEST ONLY', undefined, true).output('arraybuffer')));
}

if (process.argv[2] && process.argv[2] !== '--pdf') {
  const mammoth = (await import('mammoth')).default;
  const doc = await mammoth.extractRawText({ path: process.argv[2] });
  const paragraphs = doc.value.split(/\n{2,}/).filter(Boolean);
  let section;
  const seen = new Set();
  for (const paragraph of paragraphs) { section = detectDocumentSection(paragraph, section); seen.add(section.sectionTitle); }
  assert.ok(paragraphs.length > 20);
  assert.ok(seen.has('introduction') && seen.has('methodology'));
  console.log(`PASS Local DOCX: ${paragraphs.length} paragraphs and ${seen.size} section types recognised; no document text or identifiers printed`);
}
