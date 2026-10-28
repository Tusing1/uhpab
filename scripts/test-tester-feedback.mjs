import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

mkdirSync('tmp/feedback-qa', { recursive: true });
const outfile = resolve('tmp/feedback-qa/feedback.mjs');
await build({ entryPoints: ['src/lib/testerFeedback.ts'], outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm' });
const m = await import(pathToFileURL(outfile));
let passed = 0;
const check = (name, run) => { run(); passed++; console.log(`PASS ${name}`); };
const diag = m.feedbackDiagnostic('/defence-slides?project=PRIVATE', { stage: 'export', errorCode: 'export-failed' }, 'Mozilla Chrome/123.0', 390);
const base = { requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category: 'problem', description: 'Synthetic issue with the export button.', diagnostic: diag, screenshot: null, consent: true };

check('Diagnostic context contains only approved fields and hides query parameters', () => {
  assert.deepEqual(Object.keys(diag), ['tool','release','stage','errorCode','browser','device']);
  assert.equal(diag.tool, 'defence-slides'); assert.equal(diag.browser, 'Chrome'); assert.equal(diag.device, 'mobile');
  assert.ok(!JSON.stringify(diag).includes('PRIVATE'));
  assert.equal(m.feedbackTool('/projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/edit'), 'projects');
  assert.equal(m.feedbackTool('/supervisor-students/secret'), 'supervisor-workspace');
});
check('Unknown diagnostics are discarded and browser identification uses only family', () => {
  const value = m.feedbackDiagnostic('/unknown/private', { tool: 'https://secret', stage: 'private', errorCode: 'leak' }, 'Mozilla Edg/123 Chrome/123 user@example.invalid', 1500);
  assert.deepEqual([value.tool,value.stage,value.errorCode,value.browser,value.device], ['other','general','none','Edge','desktop']);
  assert.ok(!JSON.stringify(value).includes('@'));
});
check('Only broad error categories are carried across from service errors', () => {
  assert.equal(m.feedbackErrorCode({ status: 429, message: 'private writing' }), 'rate-limit');
  assert.equal(m.feedbackErrorCode({ code: 'API_KEY_INVALID', message: 'secret' }), 'authentication');
  assert.equal(m.feedbackErrorCode({ status: 503 }), 'provider-unavailable');
  assert.equal(m.feedbackErrorCode({ code: 'private-provider-message' }), 'unknown');
});
check('Common keys, tokens, emails, links, identifiers and paths are removed before preview', () => {
  const secret = 'AIza' + 'T'.repeat(35);
  const original = `Tester api_key="private secret" ${secret} Bearer abcdefgh example@example.invalid https://example.invalid/path?token=abc aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa C:\\Users\\person\\private.txt`;
  const cleaned = m.redactFeedbackText(original);
  for (const term of [secret,'private secret','abcdefgh','example@example.invalid','https://','aaaaaaaa-aaaa','C:\\Users']) assert.ok(!cleaned.includes(term), term);
  assert.match(cleaned, /\[key removed\]/); assert.match(cleaned, /\[email removed\]/);
});
check('Redaction preserves ordinary text and line breaks', () => {
  assert.equal(m.redactFeedbackText('  Cannot save.\nPlease help.  '), 'Cannot save.\nPlease help.');
});
check('Consent is required and extra top-level data is rejected', () => {
  assert.equal(m.feedbackSubmissionSchema.safeParse(base).success, true);
  assert.equal(m.feedbackSubmissionSchema.safeParse({ ...base, consent: false }).success, false);
  assert.equal(m.feedbackSubmissionSchema.safeParse({ ...base, document: 'private text' }).success, false);
  assert.equal(m.feedbackSubmissionSchema.safeParse({ ...base, diagnostic: { ...diag, prompt: 'private' } }).success, false);
});
check('Description length, category, request id and screenshot size are bounded', () => {
  assert.equal(m.feedbackSubmissionSchema.safeParse({ ...base, description: 'short' }).success, false);
  assert.equal(m.feedbackSubmissionSchema.safeParse({ ...base, category: 'unrecognised' }).success, false);
  assert.equal(m.feedbackSubmissionSchema.safeParse({ ...base, requestId: 'wrong' }).success, false);
  assert.equal(m.feedbackSubmissionSchema.safeParse({ ...base, screenshot: 'x'.repeat(1398105) }).success, false);
});
check('PNG dimensions come from the actual PNG header', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
  assert.deepEqual(m.screenshotDimensions(png, 'image/png'), { width: 1, height: 1 });
  assert.throws(() => m.screenshotDimensions(Buffer.from('<svg onload="alert(1)"/>'), 'image/png'));
});
check('JPEG dimensions come from a recognised frame header', () => {
  const jpeg = Uint8Array.from([255,216,255,192,0,11,8,0,10,0,20,1,1,17,0,255,217]);
  assert.deepEqual(m.screenshotDimensions(jpeg, 'image/jpeg'), { width: 20, height: 10 });
  assert.throws(() => m.screenshotDimensions(jpeg, 'image/png'));
});
check('Failure messages do not expose provider details or claim a delivery without a receipt', () => {
  assert.match(m.feedbackFailure({ message: 'FEEDBACK_RATE_LIMIT' }), /wait/i);
  assert.match(m.feedbackFailure({ message: 'FEEDBACK_CONFLICT' }), /changed/i);
  assert.ok(!m.feedbackFailure({ message: 'private content' }).includes('private content'));
  assert.match(m.feedbackFailure({ message: 'network failure' }), /confirmed/i);
});
console.log(`${passed} feedback checks passed.`);
