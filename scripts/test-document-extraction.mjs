import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const worker = pathToFileURL(resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
await build({
  entryPoints: ['src/lib/documentTextExtraction.ts'], outfile: 'tmp/document-extraction-qa.mjs',
  bundle: true, packages: 'external', platform: 'node', format: 'esm',
  plugins: [{ name: 'node-pdfjs-fixture', setup(builder) {
    builder.onResolve({ filter: /^pdfjs-dist\/build\/pdf\.worker\.mjs\?url$/ }, () => ({ path: 'worker', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export default ${JSON.stringify(worker)};`, loader: 'js' }));
    builder.onResolve({ filter: /^pdfjs-dist$/ }, () => ({ path: 'pdfjs-dist/legacy/build/pdf.mjs', external: true }));
    builder.onResolve({ filter: /^mammoth$/ }, () => ({ path: 'mammoth/mammoth.browser.js', external: true }));
  } }],
});
const { extractDocumentText } = await import(pathToFileURL(resolve('tmp/document-extraction-qa.mjs')));
const synthetic = new File(['CHAPTER ONE: INTRODUCTION\n\nSynthetic introduction.\n\nCHAPTER TWO: LITERATURE REVIEW\n\nThis paragraph mentions research questions but remains in chapter two.'], 'test-only.txt');
const extracted = await extractDocumentText(synthetic);
assert.equal(extracted.sourceType, 'text');
assert.deepEqual(extracted.chunks.map(chunk => chunk.sectionTitle), ['introduction', 'introduction', 'literature', 'literature']);
assert.equal(extracted.pageCount, null);
console.log('PASS The application TXT reader keeps paragraph content in the identified chapter');

for (const input of process.argv.slice(2)) {
  const file = new File([await readFile(input)], basename(input));
  const result = await extractDocumentText(file);
  assert.ok(result.wordCount > 20 && result.chunks.length > 0);
  if (result.sourceType === 'pdf') {
    assert.ok(result.pageCount > 0);
    assert.ok(result.chunks.every(chunk => chunk.pageNumber >= 1 && chunk.pageNumber <= result.pageCount));
  } else {
    assert.equal(result.sourceType, 'docx');
    assert.ok(result.chunks.every(chunk => chunk.pageNumber === null));
  }
  console.log(`PASS Local ${result.sourceType.toUpperCase()} extraction: ${result.pageCount ?? 'unknown'} pages, ${result.chunks.length} text chunks; no document text or identifiers printed`);
}
