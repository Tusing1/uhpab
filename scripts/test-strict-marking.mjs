import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function load(entry) {
  const bundle = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false });
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
}
const rubric = await load('src/data/markingGuide.ts');
const engine = await load('src/lib/strictResearchMarking.ts');
const retention = await load('src/lib/researchRetention.ts');
const cleanup = await load('supabase/functions/expire-research-documents/handler.ts');
let passed = 0;
async function check(name, test) { await test(); passed++; console.log(`PASS ${name}`); }
const report = rubric.getDocumentMarkingGuide('report');
const proposal = rubric.getDocumentMarkingGuide('proposal');
const criteria = [{ id: 'background', label: 'Background', marks: 3, guidance: 'Assess evidence and gap', standards: ['Evidence narrows to local problem', 'The study gap follows logically'] }];
const chunks = [{ id: 'c0-0', text: 'Local evidence shows a study-specific gap in treatment completion among the named respondents.', pageNumber: 4 }];
const response = (verdicts = ['met', 'partial']) => ({ criteria: [{ id: 'background', awarded: 999, checks: verdicts.map((verdict, index) => ({ index, verdict, chunkId: 'c0-0', quote: verdict === 'met' || verdict === 'partial' ? chunks[0].text : '', reason: verdict === 'met' ? 'The discussion locates an actual study-specific local gap.' : 'The passage identifies a gap but does not establish its magnitude.', improvement: verdict === 'met' ? '' : 'Add local evidence establishing the size and consequences of the gap.' })) }] });
const validate = payload => engine.validateStrictMarkingBatch(JSON.stringify(payload), criteria, chunks)[0];

await check('Report criteria and section totals equal exactly 100', () => {
  assert.equal(report.reduce((sum, section) => sum + section.marks, 0), 100);
  report.forEach(section => assert.equal(section.marks, section.criteria.reduce((sum, criterion) => sum + criterion.marks, 0)));
  assert.equal(report.find(section => section.id === 'introduction').criteria.find(c => c.id === 'background').marks, 3);
  assert.equal(report.find(section => section.id === 'methodology').criteria.find(c => c.id === 'study-design').marks, 2);
});
await check('Proposal excludes report-only work and includes budget and work plan', () => {
  const ids = proposal.flatMap(section => section.criteria.map(c => c.id));
  for (const id of ['abstract', 'similarity-report']) assert.ok(!ids.includes(id));
  assert.ok(ids.includes('introduction-letter'));
  assert.ok(ids.includes('work-plan') && ids.includes('budget'));
  assert.ok(!proposal.some(section => ['results', 'discussion'].includes(section.id)));
  assert.equal(proposal.reduce((sum, section) => sum + section.marks, 0), 64);
});
await check('Application computes partial marks and ignores model totals', () => {
  const score = validate(response());
  assert.equal(score.awarded, 2.25); assert.equal(score.status, 'partial'); assert.equal(score.pageNumber, 4);
  assert.equal(score.missing.length, 1); assert.equal(score.improvements.length, 1);
});
await check('Full credit needs every quality requirement met', () => assert.equal(validate(response(['met', 'met'])).awarded, 3));
await check('Unsupported and unassessable work earns zero confirmed credit', () => {
  const score = validate(response(['missing', 'unassessable']));
  assert.equal(score.awarded, 0); assert.equal(score.assessmentState, 'unassessable');
});
await check('Invented quotations are rejected rather than saved', () => {
  const payload = response(); payload.criteria[0].checks[0].quote = 'A fabricated sentence never present in this document';
  assert.throws(() => validate(payload), /not present/);
});
await check('Evidence cannot be borrowed from an invented chunk', () => {
  const payload = response(); payload.criteria[0].checks[0].chunkId = 'c999-0'; assert.throws(() => validate(payload), /not present/);
});
await check('Met verdict without quoted evidence is rejected', () => {
  const payload = response(); payload.criteria[0].checks[0].quote = ''; assert.throws(() => validate(payload), /without an exact/);
});
await check('Missing checks and vague deductions are rejected', () => {
  const payload = response(); payload.criteria[0].checks.pop(); assert.throws(() => validate(payload), /Every quality/);
  const vague = response(); vague.criteria[0].checks[1].improvement = 'Improve it'; assert.throws(() => validate(vague), /specific finding/);
});
await check('Duplicate requirement indices and malformed JSON are rejected', () => {
  const payload = response(); payload.criteria[0].checks[1].index = 0; assert.throws(() => validate(payload), /duplicated/);
  assert.throws(() => engine.validateStrictMarkingBatch('not JSON', criteria, chunks), /valid structured/);
});
await check('Basic redaction removes known names, email, contacts and HTIN', () => {
  const redacted = engine.redactResearchText('Student Alice Sample alice@example.com 0772123456 JAN23/U008/003', ['Alice Sample']);
  for (const token of ['Alice Sample', 'alice@example.com', '0772123456', 'JAN23/U008/003']) assert.ok(!redacted.includes(token));
});
await check('Strict prompt and evidence validator run together, not keyword scores', async () => {
  let prompt = '';
  const extracted = { chunks: [{ text: chunks[0].text, sectionTitle: 'introduction', chapter: 'Chapter One', pageNumber: 4 }], text: chunks[0].text, pageCount: 1, wordCount: 20, characterCount: 100, sourceType: 'text' };
  const result = await engine.markResearchStrictly(extracted, [{ id: 'introduction', title: 'Introduction', marks: 3, criteria }], async value => { prompt = value; return JSON.stringify(response()); }, { documentType: 'proposal' });
  assert.equal(result.awarded, 2.25); assert.equal(result.assessmentMode, 'strict');
  assert.ok(prompt.includes('heading, keyword, template')); assert.ok(prompt.includes('Document: proposal'));
  assert.equal(result.total, 3);
});
await check('An unidentified section never borrows text from another chapter', async () => {
  const extracted = { chunks: [{ text: chunks[0].text, sectionTitle: 'methodology', chapter: 'Chapter Three', pageNumber: 4 }], text: chunks[0].text, pageCount: 1, wordCount: 20, characterCount: 100, sourceType: 'pdf' };
  let calls = 0;
  const score = await engine.markResearchStrictly(extracted, [{ id: 'introduction', title: 'Introduction', marks: 3, criteria }], async () => { calls++; return JSON.stringify(response()); });
  assert.equal(calls, 0); assert.equal(score.awarded, 0); assert.equal(score.provisional, true);
  assert.equal(score.sections[0].criteria[0].assessmentState, 'unassessable');
  assert.match(score.sections[0].criteria[0].guidance, /absence has not been established/);
});
await check('Retention defaults to exactly seven days, including older local records', () => {
  const now = Date.parse('2026-10-17T12:00:00Z');
  assert.equal(retention.defaultDocumentExpiry(now), '2026-10-24T12:00:00.000Z');
  const record = { createdAt: new Date(now).toISOString() };
  assert.equal(retention.isResearchDocumentExpired(record, now + 7 * 86400000 - 1), false);
  assert.equal(retention.isResearchDocumentExpired(record, now + 7 * 86400000), true);
  assert.equal(retention.isResearchDocumentExpired({ ...record, keepDocument: true }, now + 90 * 86400000), false);
});
await check('Unreadable PDF pages force a provisional assessment', async () => {
  let prompt = '';
  const extracted = { chunks: [{ text: chunks[0].text, sectionTitle: 'introduction', chapter: 'Introduction', pageNumber: 1 }], text: chunks[0].text, pageCount: 2, wordCount: 20, characterCount: 100, sourceType: 'pdf' };
  const result = await engine.markResearchStrictly(extracted, [{ id: 'introduction', title: 'Introduction', marks: 3, criteria }], async value => { prompt = value; return JSON.stringify(response(['met', 'met'])); });
  assert.equal(result.provisional, true);
  assert.ok(prompt.includes('PDF pages with no readable text: 2'));
});
const request = (secret = 'test-cleanup-secret', method = 'POST') => new Request('https://example.test/cleanup', { method, headers: { authorization: `Bearer ${secret}` } });
await check('Cleanup rejects unauthorised requests before creating a privileged client', async () => {
  const handler = cleanup.createResearchCleanupHandler('test-cleanup-secret', () => { throw new Error('Must not run'); });
  assert.equal((await handler(request('wrong'))).status, 401);
  assert.equal((await handler(request(undefined, 'GET'))).status, 405);
});
await check('Storage failure keeps metadata queued for retry', async () => {
  const calls = [];
  const client = { rpc: async (name) => { calls.push(name); return { data: [{ id: 'id1', storage_path: 'private/path' }], error: null }; }, storage: { from: () => ({ remove: async () => ({ error: new Error('Storage unavailable') }) }) } };
  const result = await cleanup.createResearchCleanupHandler('test-cleanup-secret', () => client)(request());
  assert.equal(result.status, 503); assert.deepEqual(calls, ['claim_expired_research_documents']);
});
await check('Physical object removal happens before metadata cleanup', async () => {
  const order = [];
  const client = { rpc: async (name) => { order.push(name); return { data: name.startsWith('claim') ? [{ id: 'id1', storage_path: 'private/path' }] : null, error: null }; }, storage: { from: () => ({ remove: async () => { order.push('remove-object'); return { error: null }; } }) } };
  const result = await cleanup.createResearchCleanupHandler('test-cleanup-secret', () => client)(request());
  assert.equal(result.status, 200); assert.deepEqual(await result.json(), { deleted: 1, failed: 0 });
  assert.deepEqual(order, ['claim_expired_research_documents', 'remove-object', 'complete_research_document_deletion']);
});
console.log(`${passed} strict marking and retention tests passed.`);
