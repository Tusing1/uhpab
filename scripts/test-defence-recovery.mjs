import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import 'fake-indexeddb/auto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

mkdirSync('tmp/defence-recovery-qa', { recursive: true });
const outfile = resolve('tmp/defence-recovery-qa/recovery.mjs');
await build({ stdin: { contents: `export * from './src/lib/defenceSlidesDraft'; export * from './src/lib/defenceDraftCheckpoint'; export * from './src/lib/defenceDraftStore'; export * from './src/lib/researchServiceError'; export { emptyDefenceFacts } from './src/lib/defenceSlides'; export { OperationProgress } from './src/components/ui/operation-progress';`, resolveDir: process.cwd(), loader: 'ts' }, outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', alias: { '@': resolve('src') }, define: { 'import.meta.env': '{}' } });
const m = await import(pathToFileURL(outfile));
const input = m.emptyDefenceFacts();
input.topic = { value: 'Factors associated with handwashing among nurses at Test Health Centre IV', source: 'Student topic', status: 'confirmed' };
const rows = {
  background: ['Globally, handwashing is a focus of infection prevention.', 'At Test Health Centre IV, this proposal concerns nurses.', 'Local factors remain unknown in the supplied proposal.'],
  problem: ['Ideally, nurses should practise handwashing at appropriate care moments.', 'However, current practice is not yet established in this proposal.', 'Local factors influencing practice remain unknown.', 'If barriers persist, infection prevention opportunities may be missed.'],
  objectives: ['socio-demographic', 'individual', 'health facility-related'].map(category => `To assess the ${category} factors associated with handwashing among nurses at test health centre IV.`),
  scope: ['Content: handwashing among nurses.', 'Place: Test Health Centre IV.', 'Period: Proposed six weeks after approval; dates unconfirmed.'],
  literature: ['The proposed review examines published evidence relevant to the local research gap.'],
  justification: ['The study is needed to address a local evidence gap in the supplied proposal.'],
  contribution: ['Findings could inform nurses and managers in planning handwashing support.'],
  ...Object.fromEntries(['design', 'setting', 'population', 'eligibility', 'sample', 'sampling', 'instruments', 'variables', 'collection', 'quality', 'analysis', 'ethics'].map(key => [key, [`Proposed ${key} arrangements remain subject to supervisor review.`]])),
};
rows.setting = ['Proposed setting: Test Health Centre IV.'];
rows.sample = ['Proposed census of eligible nurses identified from a verified staff register.'];
rows.sampling = ['Proposed recruitment of all eligible nurses from that register.'];
const source = { title: 'Synthetic source', authors: 'QA', year: '2024', citationText: '(QA, 2024)', apaReference: 'QA. (2024). Synthetic source.', url: 'https://example.org/test-only', notes: 'Synthetic grounding fixture, not clinical evidence.' };
const grounded = { text: JSON.stringify([source]), citations: [{ url: source.url, title: source.title }] };
const response = prompt => { const keys = prompt.match(/Draft ONLY these empty fields: ([^.]+)\./)[1].split(', '); return JSON.stringify({ facts: Object.fromEntries(keys.map(key => [key, rows[key]])) }); };
const group = prompt => prompt.includes('Draft ONLY these empty fields: background') ? 'focus' : 'methods';
const session = (checkpoint, ownerId = crypto.randomUUID()) => ({ id: crypto.randomUUID(), ownerId, source: { name: input.topic.value, projectId: 'synthetic-project', version: 'version-1' }, durationMinutes: 10, testData: true, updatedAt: new Date().toISOString(), checkpoint });
let checked = 0, finalCheckpoint, partialCheckpoint;
const check = async (name, run) => { await run(); checked++; console.log(`PASS ${name}`); };

await check('A methods failure saves source/focus and resumes only methods after a fresh storage load', async () => {
  const owner = crypto.randomUUID(), before = structuredClone(input), calls = [];
  let saved = session(m.createDefenceDraftCheckpoint(input), owner);
  const services = { research: async () => { calls.push('sources'); return grounded; }, generate: async prompt => { calls.push(group(prompt)); if (group(prompt) === 'methods') throw new m.ResearchServiceError('Temporary capacity error', 503); return response(prompt); } };
  await assert.rejects(m.draftDefenceFacts(input, { onCheckpoint: async checkpoint => { saved = { ...saved, checkpoint, updatedAt: new Date().toISOString() }; await m.saveDefenceDraftSession(saved); } }, services), /Temporary capacity/);
  const reopened = await m.loadDefenceDraftSession(owner);
  partialCheckpoint = reopened.checkpoint;
  assert.deepEqual(reopened.checkpoint.completedStages, ['sources', 'focus']);
  assert.equal(m.nextDefenceDraftStage(reopened.checkpoint), 'methods');
  assert.equal(reopened.checkpoint.evidence[0].notes, source.notes);
  assert.ok(reopened.checkpoint.facts.questions.value.startsWith('What are'));
  const result = await m.draftDefenceFacts(input, { checkpoint: reopened.checkpoint, onCheckpoint: checkpoint => { finalCheckpoint = checkpoint; } }, {
    research: async () => { throw new Error('Source lookup must not repeat'); },
    generate: async prompt => { calls.push(group(prompt)); assert.match(prompt, /Synthetic grounding fixture/); return response(prompt); },
  });
  assert.deepEqual(calls, ['sources', 'focus', 'methods', 'methods']);
  assert.deepEqual(input, before); assert.deepEqual(finalCheckpoint.completedStages, ['sources', 'focus', 'methods', 'checks']);
  assert.equal(result.facts.background.value, reopened.checkpoint.facts.background.value);
  assert.equal(new Set(result.generatedKeys).size, result.generatedKeys.length);
});
await check('A ready-but-unapplied draft reopens without any provider request or duplicated warnings', async () => {
  const noCalls = async () => { throw new Error('Unexpected provider request'); };
  const result = await m.draftDefenceFacts(input, { checkpoint: finalCheckpoint }, { generate: noCalls, research: noCalls });
  assert.deepEqual(result.facts, finalCheckpoint.facts);
  assert.deepEqual(result.warnings, finalCheckpoint.warnings);
  assert.equal(m.nextDefenceDraftStage(finalCheckpoint), null);
});
await check('Cancellation after focus keeps the validated checkpoint and avoids methods until resumed', async () => {
  const controller = new AbortController(); let checkpoint, methods = 0;
  await assert.rejects(m.draftDefenceFacts(input, { signal: controller.signal, onCheckpoint: value => { checkpoint = value; if (value.completedStages.includes('focus')) controller.abort(); } }, {
    research: async () => grounded, generate: async prompt => { if (group(prompt) === 'methods') methods++; return response(prompt); },
  }), { name: 'AbortError' });
  assert.equal(methods, 0); assert.deepEqual(checkpoint.completedStages, ['sources', 'focus']);
  await m.draftDefenceFacts(input, { checkpoint }, { research: async () => { throw new Error('Repeated sources'); }, generate: async prompt => { methods++; return response(prompt); } });
  assert.equal(methods, 1);
});
await check('An unsuccessful source lookup and its evidence warning survive resume without another lookup', async () => {
  let checkpoint, lookups = 0;
  await assert.rejects(m.draftDefenceFacts(input, { onCheckpoint: value => { checkpoint = value; } }, {
    research: async () => { lookups++; throw new m.ResearchServiceError('Search limited', 429); },
    generate: async () => { throw new m.ResearchServiceError('Text temporarily unavailable', 503); },
  }), /temporarily/);
  assert.deepEqual(checkpoint.completedStages, ['sources']); assert.equal(checkpoint.evidence.length, 0);
  const result = await m.draftDefenceFacts(input, { checkpoint }, { research: async () => { lookups++; return grounded; }, generate: async prompt => response(prompt) });
  assert.equal(lookups, 1); assert.equal(result.facts.references.value, '');
  assert.equal(result.warnings.filter(warning => warning.includes('lookup was unavailable')).length, 1);
});
await check('Changed topic, manual facts, source anchors, engine, model or rules invalidate resume before API use', async () => {
  for (const key of ['topic', 'design']) {
    const changed = structuredClone(input); changed[key].value += ' Changed.';
    assert.equal(m.readDefenceDraftCheckpoint(finalCheckpoint, changed), null);
    await assert.rejects(m.draftDefenceFacts(changed, { checkpoint: finalCheckpoint }), /no longer matches/);
  }
  const changed = structuredClone(input); changed.topic.source = 'Another source version';
  assert.equal(m.readDefenceDraftCheckpoint(finalCheckpoint, changed), null);
  for (const key of ['version', 'engineVersion', 'rulesVersion', 'model']) assert.equal(m.readDefenceDraftCheckpoint({ ...finalCheckpoint, [key]: 'unsupported' }), null);
  const saved = session(finalCheckpoint);
  assert.equal(m.defenceDraftSessionMatches(saved, input, saved.source), true);
  assert.equal(m.defenceDraftSessionMatches(saved, input, { ...saved.source, version: 'version-2' }), false);
  assert.equal(m.defenceDraftSessionMatches(saved, input, { ...saved.source, projectId: 'another-project' }), false);
});
await check('Stored identity replacements, stage gaps, extra credentials and altered generated text are rejected', async () => {
  const identity = structuredClone(finalCheckpoint); identity.facts.candidate = { value: 'Invented', source: 'Model', status: 'found', draft: true }; identity.generatedKeys.push('candidate');
  assert.equal(m.readDefenceDraftCheckpoint(identity), null);
  assert.equal(m.readDefenceDraftCheckpoint({ ...finalCheckpoint, completedStages: ['sources', 'methods'] }), null);
  assert.equal(m.readDefenceDraftCheckpoint({ ...finalCheckpoint, apiKey: 'synthetic-secret' }), null);
  const altered = structuredClone(finalCheckpoint); altered.facts.design.value = '[Add the actual design]';
  await assert.rejects(m.draftDefenceFacts(input, { checkpoint: altered }), /placeholders/);
});
await check('Only fully validated batches become checkpoints', async () => {
  const checkpoints = [];
  await assert.rejects(m.draftDefenceFacts(input, { onCheckpoint: value => checkpoints.push(value) }, { research: async () => grounded, generate: async () => '{}' }), /did not meet/);
  assert.equal(checkpoints.length, 1); assert.deepEqual(checkpoints[0].completedStages, ['sources']);
  assert.equal(checkpoints[0].facts.background.value, '');
});
await check('Checkpoint callbacks are awaited before the next paid stage', async () => {
  let durableFocus = false;
  await m.draftDefenceFacts(input, { onCheckpoint: async checkpoint => { await new Promise(resolve => setTimeout(resolve, 5)); if (checkpoint.completedStages.includes('focus')) durableFocus = true; } }, {
    research: async () => grounded, generate: async prompt => { if (group(prompt) === 'methods') assert.equal(durableFocus, true); return response(prompt); },
  });
});
await check('Recovery is owner-scoped and never needs an API key or prompt in its stored record', async () => {
  const saved = session(finalCheckpoint); await m.saveDefenceDraftSession(saved);
  assert.equal(await m.loadDefenceDraftSession('another-account'), null);
  assert.equal(m.readDefenceDraftSession(saved, 'another-account'), null);
  assert.equal(m.readDefenceDraftSession({ ...saved, apiKey: 'synthetic-secret' }, saved.ownerId), null);
  assert.doesNotMatch(JSON.stringify(saved), /synthetic-secret|"apiKey"|"prompt"/);
  await m.discardDefenceDraftSession('another-account', saved.id);
  assert.ok(await m.loadDefenceDraftSession(saved.ownerId));
});
await check('Late writes and discard actions cannot overwrite or delete another draft', async () => {
  const first = session(finalCheckpoint), second = { ...session(finalCheckpoint, first.ownerId), updatedAt: '2099-01-01T00:00:00.000Z' };
  await m.saveDefenceDraftSession(first);
  await assert.rejects(m.saveDefenceDraftSession(second), m.DefenceDraftConflictError);
  await m.saveDefenceDraftSession(second, true);
  await assert.rejects(m.saveDefenceDraftSession(first), m.DefenceDraftConflictError);
  await m.discardDefenceDraftSession(first.ownerId, first.id);
  assert.equal((await m.loadDefenceDraftSession(first.ownerId)).id, second.id);
  await m.discardDefenceDraftSession(second.ownerId, second.id);
  assert.equal(await m.loadDefenceDraftSession(second.ownerId), null);
});
await check('A stale tab cannot roll back completed stages or erase a live provider retry delay', async () => {
  const saved = session(finalCheckpoint);
  await m.saveDefenceDraftSession(saved);
  await assert.rejects(m.saveDefenceDraftSession({ ...saved, checkpoint: partialCheckpoint, updatedAt: new Date(Date.now() + 1000).toISOString() }), m.DefenceDraftConflictError);
  const limited = { ...session(partialCheckpoint), retryAt: Date.now() + 60000 };
  await m.saveDefenceDraftSession(limited);
  await assert.rejects(m.saveDefenceDraftSession({ ...limited, retryAt: undefined }), m.DefenceDraftConflictError);
  await assert.rejects(m.saveDefenceDraftSession(session(partialCheckpoint, limited.ownerId), true), m.DefenceDraftConflictError);
});
await check('Unavailable device storage reports an actionable error, without deleting memory checkpoints', async () => {
  const idb = globalThis.indexedDB;
  try { globalThis.indexedDB = undefined; await assert.rejects(m.saveDefenceDraftSession(session(finalCheckpoint)), /open page only/); }
  finally { globalThis.indexedDB = idb; }
  assert.ok(m.readDefenceDraftCheckpoint(finalCheckpoint));
});
await check('Provider Retry-After seconds and HTTP dates produce a minimum retry time', () => {
  const now = Date.UTC(2026, 9, 28, 10);
  assert.equal(m.researchRetryAfter('45', now), 45);
  assert.equal(m.researchRetryAfter(new Date(now + 90000).toUTCString(), now), 90);
  assert.equal(m.researchRetryAfter('invalid', now), undefined);
  assert.equal(m.researchRetryAt(new m.ResearchServiceError('Limit', 429, '', 95), now), now + 95000);
  assert.equal(m.researchRetryAt(new m.ResearchServiceError('Limit', 429), now), now + 30000);
  assert.equal(m.researchRetryAt(new m.ResearchServiceError('Busy', 503), now), now + 15000);
  assert.equal(m.researchRetryAt(new m.ResearchServiceError('Key rejected', 401), now), undefined);
});
await check('A browser lock prevents concurrent same-account provider work', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator'); let held = false, release;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (_key, _options, work) => {
    if (held) return work(null);
    held = true; try { return await work({}); } finally { held = false; }
  } } } });
  try {
    const first = m.withDefenceDraftLock('test-owner', () => new Promise(resolve => { release = resolve; }));
    await assert.rejects(m.withDefenceDraftLock('test-owner', async () => 'Unexpected second call'), m.DefenceDraftConflictError);
    release('Complete'); assert.equal(await first, 'Complete');
  } finally { if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else delete globalThis.navigator; }
});
await check('Resumed progress marks the correct completed stages without changing other tools defaults', () => {
  const props = { title: 'Drafting', stage: 'Methods', value: 50, steps: ['Sources', 'Focus', 'Methods', 'Checks'] };
  const resumed = renderToStaticMarkup(React.createElement(m.OperationProgress, { ...props, activeStep: 2 }));
  assert.equal((resumed.match(/lucide-check/g) || []).length, 2);
  const unchangedDefault = renderToStaticMarkup(React.createElement(m.OperationProgress, props));
  assert.equal((unchangedDefault.match(/lucide-check/g) || []).length, 1);
});
console.log(`${checked} defence recovery checks passed. Mocked providers; account-scoped in-memory IndexedDB.`);
