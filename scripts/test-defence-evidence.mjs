import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';
import 'fake-indexeddb/auto';

mkdirSync('tmp/defence-evidence-qa', { recursive: true });
const outfile = resolve('tmp/defence-evidence-qa/evidence.mjs');
await build({ stdin: { contents: `export * from './src/lib/defenceEvidence'; export * from './src/lib/researchCitations'; export * from './src/lib/defenceSourceLookup'; export * from './src/lib/defenceSlides'; export * from './src/lib/defenceSlidesStore'; export * from './src/lib/defenceDraftCheckpoint'; export { defenceDraftSessionMatches } from './src/lib/defenceDraftStore'; export { draftDefenceFacts, parseDefenceDraftResponse } from './src/lib/defenceSlidesDraft'; export { buildDefenceHandout, buildDefencePptx } from './src/lib/defenceSlidesExport';`, resolveDir: process.cwd(), loader: 'ts' }, outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm', alias: { '@': resolve('src') }, define: { 'import.meta.env': '{}' } });
const m = await import(pathToFileURL(outfile));
const topic = 'Factors associated with handwashing among nurses at Test Health Centre IV';
const source = { title: 'Synthetic study, not actual evidence', authors: 'QA', year: '2024', citationText: '(QA, 2024)', apaReference: 'QA. (2024). Synthetic study, not actual evidence.', url: 'https://example.org/qa-study', notes: 'Synthetic fixture: 40% in a national sample, not the study facility.' };
const response = { text: JSON.stringify([source]), citations: [{ url: source.url, title: source.title }] };
const records = () => m.defenceEvidenceFromGrounding(response, '2026-10-28T08:00:00.000Z');
const fixture = () => { const facts = m.emptyDefenceFacts(); for (const [key, value] of Object.entries({ topic, setting: 'Test Health Centre IV', references: source.apaReference, literature: 'Nationally, 40% was reported (QA, 2024).' })) facts[key] = { value, source: 'Synthetic student fixture', status: 'found' }; return facts; };
let checked = 0;
const check = async (name, run) => { await run(); checked++; console.log(`PASS ${name}`); };
const codes = (facts, evidence = records(), slides) => m.auditDefenceEvidence(facts, evidence, slides).issues.map(issue => issue.code);

await check('Parenthetical, narrative, multi-source and year-suffix citations retain exact identities', () => {
  const pairs = m.extractResearchCitations('QA (2024) and (QA, 2024; Smith et al., 2023a, 2023b). Nsubuga and Achen (2022).');
  assert.deepEqual(pairs.map(item => item.key).sort(), ['nsubuga:2022', 'qa:2024', 'smith:2023a', 'smith:2023b']);
});
await check('Organisation aliases and undated citations match without turning dates into citations', () => {
  assert.equal(m.extractResearchCitations('(World Health Organization [WHO], 2024)')[0].key, m.extractResearchCitations('WHO (2024)')[0].key);
  assert.equal(m.extractResearchCitations('(QA, n.d.)')[0].key, 'qa:n.d.');
  assert.deepEqual(m.extractResearchCitations('During (2024) and (n = 50), ages (18-49) were planned.'), []);
});
await check('Wrapped and adjacent references are distinct; author-year pairs cannot cross entries', () => {
  const entries = m.parseResearchReferences('QA. (2024). Title.\nhttps://example.org/qa\nSmith, A. (2025). Another.');
  assert.deepEqual(entries.map(entry => entry.key), ['qa:2024', 'smith:2025']);
  const facts = fixture(); facts.literature.value = 'Something (QA, 2025).'; facts.references.value = entries.map(entry => entry.text).join('\n');
  assert.ok(codes(facts).includes('missing-reference'));
});
await check('A matching reference and annotated finding produce links, never a factual accuracy verdict', () => {
  const audit = m.auditDefenceEvidence(fixture(), records());
  assert.deepEqual(audit.issues, []); assert.equal(audit.citations[0].sources.length, 1); assert.equal(audit.referenceCount, 1);
  assert.match(m.defenceEvidenceReport(fixture(), records()), /not proof/);
});
await check('Missing, uncited, ambiguous and incomplete reference entries are actionable', () => {
  const facts = fixture(); facts.references.value = 'Other. (2023). Another work.\n\nUnknown source without a date';
  assert.ok(codes(facts).includes('missing-reference')); assert.ok(codes(facts).includes('uncited-reference')); assert.ok(codes(facts).includes('reference-metadata'));
  facts.references.value = `${source.apaReference}\nQA. (2024). A different work.`;
  assert.ok(codes(facts).includes('ambiguous-reference'));
});
await check('A bibliography alone is not labelled retrieved evidence; existing prose is read-only', () => {
  const facts = fixture(), before = structuredClone(facts);
  assert.ok(codes(facts, []).includes('source-not-retrieved'));
  assert.ok(codes(facts, []).includes('unsupported-statistic')); assert.deepEqual(facts, before);
});
await check('Ungrounded, inaccessible, mismatched annotations and unsafe URLs are rejected', () => {
  assert.deepEqual(m.defenceEvidenceFromGrounding({ ...response, citations: [] }), []);
  assert.deepEqual(m.defenceEvidenceFromGrounding({ text: 'Could not access source', citations: response.citations }), []);
  assert.deepEqual(m.defenceEvidenceFromGrounding({ ...response, citations: [{ url: 'https://example.org/other', title: 'Other' }] }), []);
  for (const url of ['http://example.org/x', 'https://127.0.0.1/x', 'https://10.0.0.1/x', 'https://[::1]/x', 'https://host.internal/x', 'https://example.org/x?token=secret', 'https://user:pass@example.org/x']) assert.equal(m.publicEvidenceUrl(url), false);
});
await check('Retrieval records preserve provider annotations, dates, bibliographic details and findings', () => {
  const [record] = records();
  assert.equal(record.retrievedAt, '2026-10-28T08:00:00.000Z'); assert.deepEqual(record.annotations, response.citations);
  for (const key of Object.keys(source)) assert.equal(record[key], source[key]);
  assert.deepEqual(m.readDefenceEvidence([{ ...record, apiKey: 'not allowed' }]), []);
});
await check('Incorrect source metadata and different works with the same author-year need review', () => {
  const facts = fixture();
  assert.ok(codes(facts, [{ ...records()[0], year: '2025' }]).includes('source-metadata'));
  facts.references.value = 'QA. (2024). A completely different work.';
  assert.ok(codes(facts).includes('source-reference-disagreement'));
});
await check('Contradictory percentage, nearby but uncited figure, and percent wording are flagged', () => {
  const facts = fixture(); facts.literature.value = 'Nationally, 60 per cent was reported (QA, 2024).';
  assert.ok(codes(facts).includes('statistic-not-in-source'));
  facts.literature.value = 'Nationally, 40% was reported. Related evidence was discussed (QA, 2024).';
  assert.ok(codes(facts).includes('unsupported-statistic'));
});
await check('National findings cannot silently become a study-facility percentage', () => {
  const facts = fixture(); facts.literature.value = 'At Test Health Centre IV, 40% was reported (QA, 2024).';
  assert.ok(codes(facts).includes('local-scope-unverified'));
  const local = records(); local[0].notes = 'Synthetic example only: 40% at Test Health Centre IV.';
  assert.ok(!codes(facts, local).includes('local-scope-unverified'));
});
await check('Generated narrative citations use exact known identities and reject invented ones', () => {
  const facts = fixture(), parse = value => m.parseDefenceDraftResponse(JSON.stringify({ facts: { literature: [value] } }), ['literature'], facts, [source.citationText], records());
  assert.ok(parse('QA (2024) informs a provisional review of the research gap.').literature);
  assert.throws(() => parse('Invented (2025) confirms a local evidence gap.'), /invent citations/);
  assert.throws(() => parse('Nationally, 60% was reported (QA, 2024).'), /absent from/);
  assert.throws(() => parse('At Test Health Centre IV, 40% was reported (QA, 2024).'), /study-site/);
});
await check('Focused retrieval sends only the topic and public URL, with cancellation and no substitutions', async () => {
  let called = 0;
  const sources = await m.retrieveDefenceEvidence(topic, source.url, {}, async (prompt, tools) => { called++; assert.match(prompt, /Read this source only/); assert.doesNotMatch(prompt, /PRIVATE CANDIDATE|PRIVATE MANUSCRIPT/); assert.deepEqual(tools, ['url_context']); return response; });
  assert.equal(called, 1); assert.equal(sources.length, 1);
  assert.deepEqual(await m.retrieveDefenceEvidence(topic, 'https://example.org/different', {}, async () => response), []);
  await assert.rejects(m.retrieveDefenceEvidence(topic, 'https://example.org/x?secret=1', {}, async () => { throw new Error('must not request'); }), /public HTTPS/);
  const controller = new AbortController();
  await assert.rejects(m.retrieveDefenceEvidence(topic, '', { signal: controller.signal }, async () => { controller.abort(); return response; }), { name: 'AbortError' });
});
await check('Adding or refreshing one source never rewrites accepted content or duplicates its reference', () => {
  const facts = fixture(), before = structuredClone(facts);
  const added = m.applyDefenceEvidence(facts, [], records()[0]);
  assert.deepEqual(facts, before); assert.equal(added.facts.literature.value, before.literature.value);
  assert.equal(added.facts.references.value, source.apaReference);
  const refreshed = { ...records()[0], id: 'new-id', notes: 'A corrected finding summary.', apaReference: 'QA. (2024). Corrected source title.' };
  const next = m.applyDefenceEvidence(added.facts, added.evidence, refreshed);
  assert.equal(next.evidence.length, 1); assert.equal(next.evidence[0].id, added.evidence[0].id);
  assert.equal(next.facts.references.value, refreshed.apaReference); assert.deepEqual(next.facts.literature, before.literature);
});
await check('Student-selected sources are reused in drafting and recovery; changed findings invalidate matching', async () => {
  const facts = fixture(); for (const key of Object.keys(facts)) if (!facts[key].value) facts[key] = { value: 'Supplied synthetic detail.', source: 'Synthetic proposal', status: 'found' };
  facts.literature = { value: '', source: '', status: 'missing' };
  const evidence = records(); let final;
  const result = await m.draftDefenceFacts(facts, { evidence, onCheckpoint: checkpoint => { final = checkpoint; } }, {
    research: async () => { throw new Error('Source lookup must not repeat'); },
    generate: async prompt => { assert.match(prompt, /40% in a national sample/); return JSON.stringify({ facts: { literature: ['Nationally, 40% was reported (QA, 2024).'] } }); },
  });
  assert.deepEqual(result.evidence, evidence); assert.ok(m.readDefenceDraftCheckpoint(final, facts));
  const origin = { name: 'Test topic' }, session = { source: origin, checkpoint: final };
  assert.ok(m.defenceDraftSessionMatches(session, facts, origin, evidence));
  assert.equal(m.defenceDraftSessionMatches(session, facts, origin, [{ ...evidence[0], notes: 'Changed finding.' }]), false);
  const invalid = structuredClone(final); invalid.evidence[0].notes = 'Changed without a new draft.';
  assert.equal(m.readDefenceDraftCheckpoint(invalid, facts), null);
});
await check('Source records survive account-scoped deck storage; legacy decks remain readable', async () => {
  const deck = m.createDefenceDeck(fixture(), { sourceName: topic, durationMinutes: 10, evidence: records() });
  await m.saveDefenceDeck('synthetic-evidence-owner', deck);
  assert.deepEqual((await m.listDefenceDecks('synthetic-evidence-owner'))[0].evidence, records().map((source, i) => ({ ...source, id: deck.evidence[i].id })));
  assert.deepEqual(await m.listDefenceDecks('another-owner'), []);
  const legacy = { ...deck, id: 'legacy', evidence: undefined }; await m.saveDefenceDeck('synthetic-evidence-owner', legacy);
  assert.equal((await m.listDefenceDecks('synthetic-evidence-owner')).length, 2);
});
await check('Exports retain the exact on-screen limitations, metadata and retrieval records', async () => {
  const facts = fixture(); facts.literature.value = 'Nationally, 60% was reported (QA, 2024).';
  const deck = m.createDefenceDeck(facts, { sourceName: topic, durationMinutes: 10, evidence: records() });
  const report = m.defenceEvidenceReport(deck.facts, deck.evidence, deck.slides), handout = m.buildDefenceHandout(deck);
  assert.ok(handout.includes(report)); assert.match(report, /absent from the recorded/); assert.match(report, /2026-10-28T08:00:00.000Z/);
  const blob = await m.buildDefencePptx(deck), zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const notes = await zip.file('ppt/notesSlides/notesSlide10.xml').async('string');
  assert.match(notes, /EVIDENCE AND CITATION REVIEW/); assert.match(notes, /absent from the recorded/); assert.match(notes, /Provider annotations/);
});
console.log(`${checked} defence evidence checks passed. Synthetic fixtures and mocked retrieval only.`);
