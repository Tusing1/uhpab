import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';

await build({ entryPoints: ['src/lib/researchTextMarkers.ts'], outfile: 'tmp/originality-scope-qa.mjs', bundle: true, packages: 'external', platform: 'node', format: 'esm', alias: { '@': resolve('src') } });
const { buildMarkedPlagiarismReport, normaliseLocalReview, createPlagiarismPdfDocument, localReviewScope } = await import(pathToFileURL(resolve('tmp/originality-scope-qa.mjs')));
const text = Array.from({ length: 20 }, (_, index) => `Synthetic test passage number ${index + 1} contains a sufficiently long statement for review.`).join(' ');
const result = buildMarkedPlagiarismReport(text);
assert.equal(result.passages.length, 14);
assert.equal(result.passages[4].location, 'Passage 5');
assert.match(localReviewScope, /at most the first 14/);
assert.match(localReviewScope, /does not search source databases/);
assert.deepEqual(result.topSources, []);
assert.equal(result.originalityScore, 0);
assert.equal(result.similarityScore, 0);
console.log('PASS Synthetic text is explicitly limited to fourteen passages without invented source scores or pages');

const oldReport = { ...result, originalityScore: 100, similarityScore: 23, topSources: [{ type: 'Internet', name: 'Fake estimate', percent: 23 }], passages: [{ ...result.passages[0], location: 'Page 42, Paragraph 1', label: 'Original-looking wording', tone: 'neutral' }] };
const safe = normaliseLocalReview(oldReport);
assert.equal(safe.passages[0].location, 'Passage 1');
assert.equal(safe.passages[0].label, 'No reuse cue detected');
assert.deepEqual(safe.topSources, []);
assert.equal(oldReport.passages[0].location, 'Page 42, Paragraph 1');
console.log('PASS Legacy reports are presented without fake locations or source categories and are not mutated');

const pdf = createPlagiarismPdfDocument(oldReport, 'SYNTHETIC TEST ONLY').output();
assert.match(pdf, /No source databases were searched/);
assert.match(pdf, /at most the first 14/);
assert.doesNotMatch(pdf, /Page 42, Paragraph 1|Fake estimate|Original-looking wording|23% review attention/);
console.log('PASS PDF export discloses limitations and sanitises legacy reports');
if (process.argv.includes('--pdf')) {
  writeFileSync('tmp/student-journey-qa/originality-scope.pdf', Buffer.from(createPlagiarismPdfDocument(result, 'SYNTHETIC TEST ONLY').output('arraybuffer')));
}
