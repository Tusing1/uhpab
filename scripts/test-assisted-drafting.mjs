import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

mkdirSync('tmp/assisted-qa', { recursive: true });
async function bundle(entry, name) {
  const outfile = resolve(`tmp/assisted-qa/${name}.mjs`);
  await build({ entryPoints: [entry], outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm', alias: { '@': resolve('src') }, define: { 'import.meta.env': '{}' } });
  return import(pathToFileURL(outfile));
}
const draft = await bundle('src/lib/assistedChapterDraft.ts', 'draft');
const model = await bundle('src/lib/chapterWorkspace.ts', 'model');
const transport = await bundle('src/integrations/gemini.ts', 'transport');
// Synthetic key fixture, used only by mocked transport requests below.
globalThis.window = { localStorage: { getItem: () => 'AIza' + 'S'.repeat(35) } };
const failures = await bundle('src/lib/writingFailure.ts', 'failures');
const title = 'FACTORS ASSOCIATED WITH HANDWASHING AMONG NURSES AT TEST HEALTH CENTRE IV, KAMPALA';
const create = (chapter = 'chapter1') => model.newChapterWorkspace('qa', 'proposal', chapter, title, model.chapterSections('proposal', chapter).map(([id]) => id));
const source = { title: 'Synthetic guidance', authors: 'WHO', year: '2024', citationText: '(WHO, 2024)', apaReference: 'WHO. (2024). Synthetic guidance. https://example.org/guidance', url: 'https://example.org/guidance', notes: 'A generic published recommendation, not facility-specific results.' };
const grounded = { text: JSON.stringify([source]), citations: [{ url: source.url, title: source.title }] };
let checked = 0;
async function check(name, run) { await run(); checked++; console.log(`PASS ${name}`); }

await check('Topic supplies population and location without a compulsory form', () => {
  const w = create();
  assert.match(model.inferredStudyContext(w).setting, /test health centre IV, kampala/i);
  assert.equal(model.inferredStudyContext(w).population, 'nurses');
  assert.equal(model.inferredStudyContext({ ...w, context: { setting: 'Corrected setting' } }).setting, 'Corrected setting');
  assert.deepEqual(model.generationNeeds(w, 'statementOfProblem'), []);
});
await check('Grounding annotations, not model-written URLs, authorize source drafts', () => {
  assert.equal(draft.sourcesFromGrounding(grounded, 'background').length, 1);
  assert.equal(draft.sourcesFromGrounding({ ...grounded, citations: [] }, 'background').length, 0);
  assert.equal(draft.sourcesFromGrounding({ ...grounded, text: 'Not JSON' }, 'background').length, 0);
  assert.equal(draft.sourcesFromGrounding({ ...grounded, text: JSON.stringify([{ ...source, notes: '' }]) }, 'background').length, 0);
});
await check('Public links reject credentials, tokens and local/private addresses', () => {
  assert.deepEqual(draft.publicSourceLinks('https://10.1.2.3/a https://example.org/private?token=secret https://u:p@example.org/a http://example.org https://localhost/a'), []);
  assert.deepEqual(draft.publicSourceLinks('example.org/guidance https://example.org/guidance'), ['https://example.org/guidance']);
});
await check('Supporting-file controls enforce format, size, count, readable text and purpose', () => {
  const file = { name: 'synthetic.txt', size: 100 };
  const docs = draft.attachSupportingText(file, 'Synthetic sample only.', 'example', []);
  assert.equal(docs[0].purpose, 'example');
  assert.equal(draft.supportingDocuments(JSON.stringify(docs))[0].text, 'Synthetic sample only.');
  assert.deepEqual(draft.supportingDocuments('malformed'), []);
  assert.throws(() => draft.validateSupportingFile({ ...file, name: 'program.exe' }, []), /PDF, DOCX or TXT/);
  assert.throws(() => draft.validateSupportingFile({ ...file, size: 11 * 1024 * 1024 }, []), /10 MB/);
  assert.throws(() => draft.validateSupportingFile(file, [...docs, ...docs, ...docs]), /3 files/);
  assert.throws(() => draft.attachSupportingText(file, '', 'evidence', []), /no readable text/);
  assert.throws(() => draft.attachSupportingText(file, 'x'.repeat(100001), 'evidence', []), /shorter extract/);
});
await check('Link retrieval is separate from drafting and persists APA/source findings', async () => {
  const w = create(); w.context.sourceLinks = source.url;
  const result = await draft.assistedChapterDraft(w, 'background', 'draft', {
    research: async (prompt, tools) => { assert.deepEqual(tools, ['url_context']); assert.match(prompt, /example.org/); return grounded; },
    generate: async prompt => { assert.match(prompt, /WHO. \(2024\)/); assert.match(prompt, /published recommendation/); return '<p>Published guidance informs this study (WHO, 2024).</p>'; },
  });
  assert.equal(result.workspace.sources.length, 1);
  assert.match(result.text, /WHO, 2024/);
  assert.equal(w.sources.length, 0, 'Original workspace must not be mutated');
});
await check('Search never receives private notes or uploaded text; drafting does', async () => {
  const w = create();
  w.context.additional = 'PRIVATE CONFIRMED LOCAL FACT';
  w.context.supportingDocuments = JSON.stringify([{ id: 'qa', name: 'private.txt', purpose: 'evidence', text: 'PRIVATE MONTHLY STATEMENT' }]);
  await draft.assistedChapterDraft(w, 'background', 'draft', {
    research: async (prompt, tools) => { assert.doesNotMatch(prompt, /PRIVATE/); assert.deepEqual(tools, ['google_search', 'url_context']); return grounded; },
    generate: async prompt => { assert.match(prompt, /PRIVATE CONFIRMED LOCAL FACT/); assert.match(prompt, /PRIVATE MONTHLY STATEMENT/); assert.match(prompt, /Example reports guide style only/); return '<p>A draft requiring review.</p>'; },
  });
});
await check('Inaccessible sources do not prevent a clearly marked editable draft', async () => {
  const result = await draft.assistedChapterDraft(create(), 'background', 'draft', {
    research: async () => { throw new Error('Retrieval temporarily unavailable'); },
    generate: async () => '<p>[citation needed]</p><p>[insert local evidence]</p>',
  });
  assert.ok(result.notices.some(n => n.includes('retrieval was unavailable')));
  assert.throws(() => model.reviewWorkspaceSection({ ...result.workspace, sections: { background: { content: result.text, status: 'drafting' } } }, 'background'), /placeholders/);
});
await check('Invalid API keys and permission failures stay visible', async () => {
  for (const message of ['Invalid API key', '403 permission denied']) {
    let drafted = false;
    await assert.rejects(draft.assistedChapterDraft(create(), 'background', 'draft', { research: async () => { throw new Error(message); }, generate: async () => { drafted = true; return 'bad'; } }), new RegExp(message));
    assert.equal(drafted, false);
  }
});
await check('A source lookup limit allows one text-only draft with explicit evidence gaps', async () => {
  let drafted = 0;
  const result = await draft.assistedChapterDraft(create(), 'background', 'draft', {
    research: async () => { throw Object.assign(new Error('Google request limited'), {status:429,code:'too_many_requests'}); },
    generate: async prompt => { drafted++; assert.match(prompt, /None yet. Use \[citation needed\]/); return '<p>Draft context. [citation needed]</p>'; },
  });
  assert.equal(drafted, 1);
  assert.equal(result.workspace.sources.length, 0);
  assert.ok(result.notices.some(n => n.includes('Google limited the source lookup')));
  assert.throws(() => model.reviewWorkspaceSection({...result.workspace,sections:{background:{content:result.text,status:'drafting'}}},'background'), /placeholders/);
});
await check('Text-generation limits still stop the draft without retrying or inventing sources', async () => {
  let count = 0;
  await assert.rejects(draft.assistedChapterDraft(create(), 'background', 'draft', {
    research: async () => { throw new Error('429 quota exhausted'); },
    generate: async () => { count++; throw Object.assign(new Error('Google request limited'), {status:429,code:'quota_exceeded'}); },
  }), /Google request limited/);
  assert.equal(count, 1);
});
await check('Quota, outage, authentication, model and billing errors have distinct messages', () => {
  const error = (status, code, message = 'Google rejected request') => Object.assign(new Error(message), {status,code});
  assert.equal(failures.writingFailure(error(429,'too_many_requests')).title, 'Google usage limit reached');
  assert.match(failures.writingFailure(error(429,'quota_exceeded')).message, /same Google project/);
  assert.match(failures.writingFailure(Object.assign(error(429,'rate_limit_exceeded'),{retryAfter:35})).message, /35 seconds/);
  assert.equal(failures.writingFailure(error(503,'service_unavailable')).title, 'Research service is temporarily unavailable');
  assert.doesNotMatch(failures.writingFailure(error(503,'service_unavailable')).message, /usage limit was reached/);
  assert.equal(failures.writingFailure(error(401,'authentication')).title, 'Check your research key');
  assert.equal(failures.writingFailure(error(404,'model_not_found')).retryable, false);
  assert.equal(failures.writingFailure(error(402,'payment_required')).retryable, false);
});
await check('Unknown citations still fail validation in draft mode', async () => {
  await assert.rejects(draft.assistedChapterDraft(create(), 'background', 'draft', { research: async () => ({ text: '[]', citations: [] }), generate: async () => '<p>Unsupported (Invented, 2024).</p>' }), /not linked/);
});
await check('Introduction is local and uses no model or source calls', async () => {
  const fail = async () => { throw new Error('Must not call provider'); };
  const result = await draft.assistedChapterDraft(create(), 'introduction', 'draft', { generate: fail, research: fail });
  assert.ok(model.plainChapterText(result.text).split(/\s+/).length <= 45);
});
await check('Questions can start without a manual objectives form and remain aligned', async () => {
  const result = await draft.assistedChapterDraft(create(), 'researchQuestions', 'draft', {
    research: async () => { throw new Error('No evidence lookup for questions'); },
    generate: async () => '<ol><li>To identify socio-demographic factors.</li><li>To assess health facility-related factors.</li><li>To examine behavioural factors.</li></ol>',
  });
  assert.equal((result.text.match(/<li>/g) || []).length, 3);
  assert.match(result.workspace.context.objectives, /handwashing among nurses at test health centre IV, kampala/i);
  assert.ok(result.notices.some(n => n.includes('Suggested objectives')));
});
await check('Existing sources are reused without extra lookup when no new link is supplied', async () => {
  const w = create(); w.sources = [{ ...source, id: 'qa', intendedUse: 'background' }];
  await draft.assistedChapterDraft(w, 'background', 'draft', { research: async () => { throw new Error('Must reuse sources'); }, generate: async () => '<p>Guidance (WHO, 2024).</p>' });
});
await check('Transport preserves only provider citations and search display metadata', () => {
  const data = { steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Example', annotations: [{ type: 'url_citation', url: source.url, title: source.title }] }] }, { type: 'google_search_result', result: [{ search_suggestions: '<div>Search</div>' }] }] };
  assert.equal(transport.groundingCitations(data).length, 1);
  assert.equal(transport.groundingSuggestions(data), '<div>Search</div>');
});
await check('Transport excludes tool/thought text from the manuscript', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async (_, request) => {
      const body = JSON.parse(request.body);
      assert.deepEqual(body.tools, ['url_context']);
      return { ok: true, json: async () => ({ steps: [{ type: 'thought', output_text: 'PRIVATE THOUGHT' }, { type: 'url_context_result', content: [{ text: 'RAW TOOL OUTPUT' }] }, { type: 'model_output', content: [{ type: 'text', text: 'Only manuscript.' }] }] }) };
    };
    const result = await transport.generateResearchResponse('Synthetic prompt', ['url_context']);
    assert.equal(result.text, 'Only manuscript.');
  } finally { globalThis.fetch = previous; }
});
await check('Transport preserves status, provider code and retry delay', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({error:{message:'Limited',code:'too_many_requests'}}),{status:429,headers:{'retry-after':'35'}});
    await assert.rejects(transport.generateResearchResponse('Synthetic prompt'), error => {
      assert.equal(error.status,429); assert.equal(error.code,'too_many_requests'); assert.equal(error.retryAfter,35); return true;
    });
  } finally { globalThis.fetch = previous; }
});
await check('Proxy uses stateless interactions and allowlists retrieval tools', async () => {
  const proxy = await import('../functions/api/gemini.js');
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async (_, request) => {
      const body = JSON.parse(request.body);
      assert.equal(body.store, false);
      assert.deepEqual(body.tools, [{ type: 'url_context' }]);
      return { ok: true, json: async () => ({ steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Synthetic reply.' }] }] }) };
    };
    const result = await proxy.onRequestPost({ request: new Request('https://example.org/api/gemini', { method: 'POST', body: JSON.stringify({ prompt: 'Synthetic prompt', tools: ['url_context', 'url_context', 'arbitrary_tool'] }) }), env: { GEMINI_API_KEY: 'synthetic-fixture-not-a-real-key' } });
    assert.equal((await result.json()).text, 'Synthetic reply.');
  } finally { globalThis.fetch = previous; }
});
await check('An unreadable endpoint gives connection advice, not a JSON parser error', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ json: async () => { throw new Error('Unexpected end of JSON input'); } });
    await assert.rejects(transport.generateResearchResponse('Synthetic prompt'), /endpoint returned an unreadable response/);
  } finally { globalThis.fetch = previous; }
});
console.log(`\n${checked} assisted-drafting checks passed. Mocked providers only; no student data or credentials used.`);
