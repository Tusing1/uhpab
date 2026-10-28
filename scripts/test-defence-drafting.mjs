import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

mkdirSync('tmp/defence-draft-qa', { recursive: true });
const outfile = resolve('tmp/defence-draft-qa/draft.mjs');
await build({ stdin: { contents: `export * from './src/lib/defenceSlidesDraft'; export * from './src/lib/defenceSlides'; export { defenceDeckIsWorkingDraft, defenceSlideLayoutIssues } from './src/lib/defenceSlidesExport';`, resolveDir: process.cwd(), loader: 'ts' }, outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm', alias: { '@': resolve('src') }, define: { 'import.meta.env': '{}' } });
const { draftDefenceFacts, parseDefenceDraftResponse, emptyDefenceFacts, createDefenceDeck, validateDefenceDeck, defenceDeckIsWorkingDraft, defenceSlideLayoutIssues } = await import(pathToFileURL(outfile));
const title = 'Factors associated with handwashing among nurses at Test Health Centre IV';
const fixture = () => { const facts = emptyDefenceFacts(); facts.topic = { value: title, source: 'Student topic', status: 'confirmed' }; facts.candidate = { value: 'PRIVATE CANDIDATE', source: 'profile', status: 'found' }; return facts; };
const data = {
  background: ['Globally, handwashing is a focus of infection prevention.', 'At Test Health Centre IV, the proposed inquiry focuses on nurses.', 'The study will investigate an unknown local pattern of handwashing.'],
  problem: ['Ideally, nurses should practise handwashing at relevant care moments.', 'However, current handwashing practice at the study setting is not yet established for this proposal.', 'The factors influencing local practice remain unknown in the supplied information.', 'If barriers persist, opportunities for infection prevention may be missed.'],
  objectives: ['To assess the socio-demographic factors associated with handwashing among nurses at test health centre IV.', 'To assess the individual factors associated with handwashing among nurses at test health centre IV.', 'To determine the health facility-related factors associated with handwashing among nurses at test health centre IV.'],
  scope: ['Content: handwashing among nurses.', 'Place: Test Health Centre IV.', 'Period: Proposed six weeks after approval; dates are unconfirmed.'],
  literature: ['Published evidence will be examined for relevance to the local research gap.'],
  justification: ['The study is needed because the proposed inquiry addresses local evidence relevant to handwashing.'],
  contribution: ['Findings could inform nurses and managers in planning handwashing support.'],
  design: ['Proposed analytical cross-sectional design to examine associations at one time.'],
  setting: ['Proposed setting: Test Health Centre IV.'],
  population: ['Proposed population: nurses working at the named setting.'],
  eligibility: ['Proposed inclusion: consenting nurses; exclusion: nurses absent during collection.'],
  sample: ['Proposed census of eligible nurses; the number depends on the verified staff register.'],
  sampling: ['Proposed recruitment of all eligible nurses using the verified staff register.'],
  instruments: ['Proposed structured questionnaire and handwashing observation checklist.'],
  variables: ['Proposed outcome: handwashing practice; predictors: socio-demographic, individual and facility factors.'],
  collection: ['Proposed private questionnaires followed by consented observation of routine handwashing opportunities.'],
  quality: ['Proposed pretesting outside the study site, observer training and daily completeness checks.'],
  analysis: ['Proposed coded summaries and association tests appropriate to categorical measures and sample size.'],
  ethics: ['Proposed institutional approval and facility permission before recruitment; informed consent, anonymity and secure records.'],
};
const source = { title: 'Synthetic source for tests only', authors: 'QA', year: '2024', citationText: '(QA, 2024)', apaReference: 'QA. (2024). Synthetic source for tests only.', url: 'https://example.org/qa', notes: 'Test fixture only, not actual research evidence.' };
const grounded = { text: JSON.stringify([source]), citations: [{ url: source.url, title: source.title }] };
function response(prompt) { const keys = prompt.match(/Draft ONLY these empty fields: ([^.]+)\./)[1].split(', '); return JSON.stringify({ facts: Object.fromEntries(keys.map(key => [key, data[key]])) }); }
let checked = 0;
const check = async (name, run) => { await run(); console.log(`PASS ${name}`); checked++; };

await check('Topic-only creates real study content across all nine content slides', async () => {
  const original = fixture(), before = structuredClone(original), stages = [];
  let calls = 0;
  const result = await draftDefenceFacts(original, { onProgress: item => stages.push(item.stage) }, {
    research: async prompt => { assert.doesNotMatch(prompt, /PRIVATE CANDIDATE/); return grounded; },
    generate: async prompt => { calls++; assert.match(prompt, /240 characters|240 characters|240 character/); assert.match(prompt, /Citation policy:/); return response(prompt); },
  });
  assert.equal(calls, 2); assert.deepEqual(original, before); assert.deepEqual(stages, ['sources', 'focus', 'methods', 'checks']);
  assert.equal(result.facts.htin.value, ''); assert.equal(result.facts.supervisor.value, '');
  assert.ok(result.generatedKeys.includes('questions')); assert.ok(result.generatedKeys.includes('references'));
  const deck = createDefenceDeck(result.facts, { sourceName: title, durationMinutes: 10, generationWarnings: result.warnings });
  assert.ok(deck.slides.slice(1).every(slide => !/\[(?:Add|Review)/i.test(slide.bullets.join(' '))));
  assert.deepEqual(validateDefenceDeck(deck, { allowDraft: true }), []);
  assert.ok(deck.slides.every((slide, i) => !defenceSlideLayoutIssues(slide, i).length));
  assert.ok(defenceDeckIsWorkingDraft(deck)); assert.ok(deck.generationWarnings.length);
  assert.match(deck.slides[6].notes, /Suggested draft - not confirmed/);
  assert.ok(validateDefenceDeck(deck).some(error => /Review and confirm/.test(error)));
});
await check('Existing proposal text and manual choices are never replaced', async () => {
  const facts = fixture(); facts.design = { value: 'A supplied qualitative design.', source: 'Proposal section 3.1', status: 'confirmed' };
  facts.background = { value: 'PRIVATE LOCAL NOTES', source: 'Uploaded proposal', status: 'found' };
  const result = await draftDefenceFacts(facts, {}, { research: async prompt => { assert.doesNotMatch(prompt, /PRIVATE LOCAL/); return grounded; }, generate: async prompt => { assert.match(prompt, /PRIVATE LOCAL NOTES/); return response(prompt); } });
  assert.deepEqual(result.facts.design, facts.design); assert.deepEqual(result.facts.background, facts.background);
  assert.ok(!result.generatedKeys.includes('design'));
});
await check('Model-written source URLs alone never produce references', async () => {
  const result = await draftDefenceFacts(fixture(), {}, { research: async () => ({ ...grounded, citations: [] }), generate: async prompt => response(prompt) });
  assert.equal(result.facts.references.value, ''); assert.ok(result.warnings.some(warning => /No published sources/.test(warning)));
});
await check('Lookup unavailability still allows a clearly provisional text draft', async () => {
  const result = await draftDefenceFacts(fixture(), {}, { research: async () => { throw Object.assign(new Error('Search limited'), { status: 429 }); }, generate: async prompt => response(prompt) });
  assert.equal(result.facts.references.status, 'missing'); assert.ok(result.warnings.some(warning => /lookup was unavailable/.test(warning)));
});
await check('Authentication failures stop generation without wasteful retries', async () => {
  let calls = 0;
  await assert.rejects(draftDefenceFacts(fixture(), {}, { research: async () => { throw Object.assign(new Error('Invalid key'), { status: 401 }); }, generate: async () => { calls++; return ''; } }), /Invalid key/);
  assert.equal(calls, 0);
});
await check('One content-repair attempt is bounded, atomic and visible on failure', async () => {
  const facts = fixture(), before = structuredClone(facts); let calls = 0;
  await assert.rejects(draftDefenceFacts(facts, {}, { research: async () => grounded, generate: async () => { calls++; return 'not JSON'; } }), /did not meet the slide rules/);
  assert.equal(calls, 2); assert.deepEqual(facts, before);
});
await check('A malformed first draft can be repaired once', async () => {
  let calls = 0;
  const result = await draftDefenceFacts(fixture(), {}, { research: async () => grounded, generate: async prompt => { calls++; return calls === 1 ? '{}' : response(prompt); } });
  assert.equal(calls, 3); assert.ok(result.facts.problem.draft);
});
await check('Cancel prevents subsequent calls and never mutates source', async () => {
  const controller = new AbortController(), facts = fixture(), before = structuredClone(facts); let calls = 0;
  await assert.rejects(draftDefenceFacts(facts, { signal: controller.signal }, { research: async () => { controller.abort(); return grounded; }, generate: async () => { calls++; return ''; } }), { name: 'AbortError' });
  assert.equal(calls, 0); assert.deepEqual(facts, before);
});
await check('Incomplete topic fails before any provider request', async () => {
  const facts = fixture(); facts.topic.value = 'Handwashing'; let calls = 0;
  await assert.rejects(draftDefenceFacts(facts, {}, { research: async () => { calls++; return grounded; }, generate: async () => '' }), /supported topic/);
  assert.equal(calls, 0);
});
await check('Strict parsing rejects templates, excess words, fake sources and premature approvals', () => {
  const facts = fixture();
  for (const [key, points, pattern] of [
    ['design', ['[Add the design]'], /placeholders/],
    ['design', ['Proposed ' + 'word '.repeat(40)], /approximately/],
    ['ethics', ['The study was approved by the school.'], /future approval/],
    ['literature', ['An unsupported local claim (Invented, 2025).'], /invent citations/],
    ['scope', ['Content: handwashing among nurses (QA, 2024).', 'Place: Test Health Centre IV.', 'Period: six weeks.'], /citations are not allowed/],
  ]) assert.throws(() => parseDefenceDraftResponse(JSON.stringify({ facts: { [key]: points } }), [key], facts), pattern);
  assert.throws(() => parseDefenceDraftResponse(JSON.stringify({ facts: { candidate: ['Invented name'] } }), ['design'], facts), /exactly these/);
});
await check('Valid natural gap, beneficiary and six-week period wording meets component rules', () => {
  const facts = fixture();
  const values = parseDefenceDraftResponse(JSON.stringify({ facts: {
    background: ['Globally, handwashing is a focus of infection prevention.', 'At Test Health Centre IV, this proposal concerns nurses.', 'However, the factors influencing handwashing are not yet established in this proposal.'],
    contribution: ['Healthcare providers and hospital administrators may benefit by using findings to improve handwashing support.'],
    scope: ['Content: handwashing among nurses.', 'Place: Test Health Centre IV.', 'Period: A six-week collection period after approval; dates are unconfirmed.'],
  } }), ['background', 'contribution', 'scope'], facts);
  assert.ok(values.background); assert.ok(values.contribution); assert.ok(values.scope);
});
await check('Sample arithmetic, census consistency and unsupported facility details are checked', () => {
  const facts = fixture();
  const sample = 'Proposed sample size of 96 nurses, using Kish Leslie at assumed 50% prevalence, 5% precision and 95% confidence.';
  assert.throws(() => parseDefenceDraftResponse(JSON.stringify({ facts: { sample: [sample], sampling: ['Proposed census of all eligible nurses.'] } }), ['sample', 'sampling'], facts), /disagree.*rounded UP to 385/);
  assert.throws(() => parseDefenceDraftResponse(JSON.stringify({ facts: { setting: ['Proposed study at Test Health Centre IV, providing inpatient and outpatient care.'] } }), ['setting'], facts), /Do not invent facility/);
  assert.throws(() => parseDefenceDraftResponse(JSON.stringify({ facts: { problem: [data.problem[0], 'However, handwashing remains suboptimal.', ...data.problem.slice(2)] } }), ['problem'], facts), /current local magnitude/);
  const valid = parseDefenceDraftResponse(JSON.stringify({ facts: { sample: ['Proposed initial sample size of 385, using Kish Leslie at assumed 50% prevalence, 5% precision and 95% confidence.'], sampling: ['Proposed systematic random sampling from an eligible register.'] } }), ['sample', 'sampling'], facts);
  assert.match(valid.sample, /385/);
});
await check('Existing invalid objectives are retained rather than silently rewritten', async () => {
  const facts = fixture(); facts.objectives = { value: 'To recommend changes.', source: 'Student entry', status: 'confirmed' };
  await assert.rejects(draftDefenceFacts(facts, {}, { research: async () => grounded, generate: async prompt => response(prompt) }), /specific objectives/);
  assert.equal(facts.objectives.value, 'To recommend changes.');
});
console.log(`${checked} defence drafting checks passed.`);
