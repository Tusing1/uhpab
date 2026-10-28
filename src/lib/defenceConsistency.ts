import { z } from 'zod';
import { DEFENCE_FACT_FIELDS, buildDefenceSlide, type DefenceDeck, type DefenceFactKey, type DefenceFacts, type DefenceSlide } from './defenceSlides';
import { reviewDefenceRules } from './defenceSectionRules';
import { parseResearchTopic } from './researchFormulation';
import { extractResearchCitations } from './researchCitations';

export interface DefenceSourceSnapshot {
  version: 1;
  kind: 'project' | 'upload' | 'topic' | 'handoff' | 'reviewed';
  name: string;
  projectId?: string;
  sourceVersion?: string;
  capturedAt: string;
  facts: DefenceFacts;
}
const factSchema = z.object({ value: z.string().max(100000), source: z.string().max(5000), status: z.enum(['found', 'confirmed', 'missing']), draft: z.boolean().optional() }).strict();
export const defenceSourceSnapshotSchema = z.object({
  version: z.literal(1), kind: z.enum(['project', 'upload', 'topic', 'handoff', 'reviewed']), name: z.string().min(1).max(1000),
  projectId: z.string().min(1).max(200).optional(), sourceVersion: z.string().min(1).max(200).optional(), capturedAt: z.string().datetime(),
  facts: z.record(factSchema).refine(facts => Object.keys(facts).length === DEFENCE_FACT_FIELDS.length && DEFENCE_FACT_FIELDS.every(({ key }) => key in facts)),
}).strict().refine(snapshot => JSON.stringify(snapshot).length <= 500000);

export function readDefenceSourceSnapshot(value: unknown): DefenceSourceSnapshot | null {
  const parsed = defenceSourceSnapshotSchema.safeParse(value);
  return parsed.success ? { ...parsed.data, version: 1, kind: parsed.data.kind, name: parsed.data.name, capturedAt: parsed.data.capturedAt, facts: parsed.data.facts as DefenceFacts } : null;
}
export function captureDefenceSource(facts: DefenceFacts, source: Omit<DefenceSourceSnapshot, 'version' | 'facts' | 'capturedAt'>): DefenceSourceSnapshot {
  const snapshot = readDefenceSourceSnapshot({ version: 1, ...source, capturedAt: new Date().toISOString(), facts: structuredClone(facts) });
  if (!snapshot) throw new Error('The proposal snapshot is incomplete or too large. Your presentation is unchanged.');
  return snapshot;
}

const compact = (text: string) => text.replace(/\s+/g, ' ').trim();
const normal = (text: string) => compact(text).toLowerCase().replace(/[\u2010-\u2015]/g, '-').replace(/[.,;:!?]+$/g, '');
const tokens = (text: string): string[] => normal(text).match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g) || [];
const marker = (text: string) => /\[(?:add|review|insert|provide|verify)\b|^\s*$/i.test(text);
const available = (facts: DefenceFacts, key: DefenceFactKey) => facts[key].status !== 'missing' && !marker(facts[key].value);
const labelFor = (key: DefenceFactKey) => DEFENCE_FACT_FIELDS.find(field => field.key === key)!.label;
const numericValues = (text: string) => {
  const body = extractResearchCitations(text).reduce((value, citation) => value.split(citation.text).join(' '), text);
  return [...body.matchAll(/\b\d+(?:\.\d+)?\b/g)].map(match => match[0]);
};
const supportedRoles = new Set(['title', 'background', 'problem', 'objectives', 'questions-scope', 'literature-value', 'design-population', 'sample-measurement', 'execution-ethics', 'closing']);

/** Extract only labelled fields in multi-section slides; unlabelled custom text is not guessed. */
function fieldPattern(key: DefenceFactKey) {
  const escaped = labelFor(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const aliases = key === 'aim' ? 'general objective|aim' : key === 'scope' ? 'content|place|period|scope' : key === 'problem' ? 'ideal situation|current situation|research gap|consequence/study need' : key === 'background' ? 'wider context|local context|study gap' : escaped;
  return new RegExp(`^(?:${aliases})\\s*:\\s*`, 'i');
}
function fieldBulletIndexes(slide: DefenceSlide, key: DefenceFactKey): number[] {
  if (key === 'topic') return [];
  if (slide.sourceKeys.length === 1) return slide.bullets.map((_, index) => index);
  if (key === 'objectives' && slide.role === 'objectives') return slide.bullets.flatMap((text, index) => !fieldPattern('aim').test(text) ? [index] : []);
  if (key === 'questions' && slide.role === 'questions-scope') return slide.bullets.flatMap((text, index) => !fieldPattern('scope').test(text) ? [index] : []);
  return slide.bullets.flatMap((text, index) => fieldPattern(key).test(text) ? [index] : []);
}
export function defenceSlideFieldText(slide: DefenceSlide, key: DefenceFactKey): string | null {
  if (slide.role === 'title' && key === 'topic') return slide.title;
  const pattern = fieldPattern(key);
  const labelled = slide.bullets.filter(text => pattern.test(text));
  if (labelled.length) return labelled.map(text => text.replace(pattern, '')).join('\n');
  if (slide.sourceKeys.length === 1) return slide.bullets.join('\n');
  return null;
}

const designTerms = ['cross-sectional', 'case-control', 'cohort', 'longitudinal', 'randomised controlled trial', 'quasi-experimental', 'phenomenological', 'ethnographic', 'grounded theory'];
const recruitmentTerms = ['simple random', 'systematic random', 'stratified', 'cluster sampling', 'convenience', 'consecutive', 'purposive', 'snowball', 'census'];
const termSet = (text: string, terms: string[]) => terms.filter(term => normal(text).replace(/cross sectional/g, 'cross-sectional').replace(/case control/g, 'case-control').replace(/randomized/g, 'randomised').includes(term));
const periodTerms = (text: string) => [...text.toLowerCase().matchAll(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)[ -]+(?:days?|weeks?|months?|years?)\b/g)].map(match => match[0].replace(/-/g, ' '));
const completedApproval = /\b(?:approval (?:has been|was|is) (?:obtained|granted)|approved by|consent (?:was|has been) obtained)\b/i;
const completedStudy = /\b(?:data (?:were|was|have been) collected|participants (?:were|have been) recruited|results (?:showed|demonstrated|confirmed)|study (?:found|revealed))\b/i;
const orderedSubset = (source: string, display: string) => {
  const original = tokens(source); let at = 0;
  return tokens(display).every(word => { const next = original.indexOf(word, at); at = next + 1; return next >= 0; });
};
export type DefenceConsistencyFinding = {
  code: string; level: 'difference' | 'review'; field: DefenceFactKey; slideIndex: number;
  title: string; detail: string; sourceText: string; slideText: string;
};
export function reviewDefenceConsistency(deck: DefenceDeck): DefenceConsistencyFinding[] {
  const findings: DefenceConsistencyFinding[] = [];
  const add = (slideIndex: number, field: DefenceFactKey, code: string, level: DefenceConsistencyFinding['level'], title: string, detail: string, sourceText: string, slideText: string) => {
    if (!findings.some(item => item.slideIndex === slideIndex && item.field === field && item.code === code)) findings.push({ slideIndex, field, code, level, title, detail, sourceText, slideText });
  };
  const rules = reviewDefenceRules(deck.facts, deck.slides).filter(item => item.target === 'slide');
  for (const [index, slide] of deck.slides.entries()) {
    if (!supportedRoles.has(slide.role)) continue;
    const expected = buildDefenceSlide(index, deck.facts);
    if (normal(slide.title) === normal(expected.title) && JSON.stringify(slide.bullets.map(normal)) === JSON.stringify(expected.bullets.map(normal))) continue;
    for (const rule of rules.filter(item => slide.sourceKeys.includes(item.key))) add(index, rule.key, `section-rule:${rule.title}`, 'difference', rule.title, rule.detail, deck.facts[rule.key].value, defenceSlideFieldText(slide, rule.key) || slide.bullets.join('\n'));
    for (const key of slide.sourceKeys) {
      if (['references', 'objectives', 'questions', 'aim'].includes(key)) continue;
      const display = defenceSlideFieldText(slide, key);
      if (display === null) continue;
      const original = deck.facts[key].value;
      const expectedText = defenceSlideFieldText(expected, key) || '';
      if (marker(display) || normal(display) === normal(expectedText)) continue;
      if (!available(deck.facts, key)) {
        add(index, key, 'unsupplied-detail', 'difference', 'Detail added without a source field', 'This detail is not present in the reviewed study facts. Confirm its source before presenting.', original, display);
        continue;
      }
      if (DEFENCE_FACT_FIELDS.find(field => field.key === key)!.group === 'Identity') {
        if (normal(display) !== normal(original)) add(index, key, 'identity-changed', 'difference', 'Identity differs from study details', 'The displayed name or identifier differs from the saved field. Update the study detail first if it has genuinely changed.', original, display);
        continue;
      }
      const freshNumbers = [...new Set(numericValues(display).filter(number => !numericValues(original).includes(number)))];
      if (freshNumbers.length) add(index, key, 'numbers-changed', 'difference', 'New numbers or dates on the slide', `Not found in this source field: ${freshNumbers.join(', ')}. Check ages, dates, sample sizes and assumptions in context.`, original, display);
      if (['scope', 'collection'].includes(key)) {
        const newPeriod = periodTerms(display).filter(part => !periodTerms(original).includes(part));
        if (newPeriod.length) add(index, key, 'period-changed', 'difference', 'Study period wording changed', `Not found in this source field: ${newPeriod.join(', ')}. Check collection dates and duration.`, original, display);
      }
      for (const [terms, applies, code, title] of [
        [designTerms, key === 'design', 'design-changed', 'Different study design named'],
        [recruitmentTerms, ['sample', 'sampling'].includes(key), 'recruitment-changed', 'Different recruitment method named'],
      ] as const) {
        const newTerms = applies ? termSet(display, [...terms]).filter(term => !termSet(original, [...terms]).includes(term)) : [];
        if (newTerms.length) add(index, key, code, 'difference', title, `The slide introduces ${newTerms.join(', ')}; this is not named in the saved field.`, original, display);
      }
      if (completedApproval.test(display) && !completedApproval.test(original)) add(index, key, 'new-approval', 'difference', 'A proposed approval became a completed approval', 'The slide now claims approval or consent was obtained. Do not convert a future arrangement into a completed event.', original, display);
      if (['sample', 'sampling', 'collection', 'analysis', 'ethics'].includes(key) && completedStudy.test(display) && !completedStudy.test(original)) add(index, key, 'new-results', 'difference', 'A proposed study became completed work', 'The slide claims completed collection, recruitment or findings that are absent from the reviewed field.', original, display);
      if (['population', 'eligibility', 'setting', 'scope'].includes(key)) {
        let topicDetail = '';
        try { const topic = parseResearchTopic(deck.facts.topic.value); topicDetail = key === 'setting' ? topic.setting : key === 'scope' ? '' : topic.population; } catch { /* Partial topics still permit field comparisons. */ }
        if (topicDetail && normal(expectedText).includes(normal(topicDetail)) && !normal(display).includes(normal(topicDetail))) add(index, key, 'topic-detail-missing', 'review', 'Population or place wording needs review', `The source names "${topicDetail}". Check that the edited wording still identifies the same population, ages and setting.`, original, display);
      }
      const missingNumbers = [...new Set(numericValues(expectedText).filter(number => !numericValues(display).includes(number)))];
      const lostQualification = ['not', 'only', 'excluding', 'unconfirmed', 'assumed', 'proposed'].some(word => new RegExp(`\\b${word}\\b`, 'i').test(expectedText) && !new RegExp(`\\b${word}\\b`, 'i').test(display));
      const hasFinding = findings.some(item => item.slideIndex === index && item.field === key);
      if (!hasFinding && (missingNumbers.length || lostQualification || !orderedSubset(original, display))) add(index, key, 'wording-review', 'review', 'Edited wording needs comparison', missingNumbers.length ? `The shortened point omits source numbers: ${missingNumbers.join(', ')}. Check that important assumptions or dates were not lost.` : 'This edit is not a simple extract from the reviewed field. Compare its meaning and qualifications with the source; a wording difference alone is not proof of an error.', original, display);
    }
    const mapped = new Set(slide.sourceKeys.flatMap(key => fieldBulletIndexes(slide, key)));
    const unmapped = slide.bullets.filter((text, index) => !mapped.has(index) && !marker(text) && !expected.bullets.some(point => normal(point) === normal(text)) && !(slide.role === 'title' && slide.sourceKeys.some(key => normal(deck.facts[key].value) === normal(text))));
    if (slide.sourceKeys.length > 1 && unmapped.length && !findings.some(item => item.slideIndex === index) && !['objectives', 'questions-scope'].includes(slide.role)) add(index, slide.sourceKeys[0], 'custom-wording', 'review', 'Custom slide wording needs comparison', 'These edited points cannot be linked unambiguously to one source field. Compare them with the source before presenting.', slide.sourceKeys.map(key => `${labelFor(key)}: ${deck.facts[key].value}`).join('\n\n'), unmapped.join('\n'));
  }
  return findings;
}

export function changedDefenceSourceFields(deck: DefenceDeck, source: DefenceSourceSnapshot): DefenceFactKey[] {
  return DEFENCE_FACT_FIELDS.filter(({ key }) => normal(source.facts[key].value) !== normal(deck.facts[key].value) || (source.facts[key].status === 'missing') !== (deck.facts[key].status === 'missing')).map(({ key }) => key);
}

/** A preview is data only. The caller applies it explicitly and keeps the previous deck for undo. */
export function previewDefenceSlideUpdate(deck: DefenceDeck, indexes: number[], revision?: DefenceSourceSnapshot): DefenceDeck {
  if (!indexes.length || indexes.some(index => !Number.isInteger(index) || index < 0 || index >= 10) || new Set(indexes).size !== indexes.length) throw new Error('Select one or more distinct slides to update.');
  const source = revision ? readDefenceSourceSnapshot(revision) : null;
  if (revision && !source) throw new Error('The revised proposal snapshot is invalid. Nothing was changed.');
  if (source && available(source.facts, 'topic') && normal(source.facts.topic.value) !== normal(deck.facts.topic.value) && !indexes.includes(0)) throw new Error('The proposal topic changed. Include the title slide before updating other slides.');
  const next = structuredClone(deck);
  const changedKeys = new Set<DefenceFactKey>();
  if (source) {
    const keys = new Set(indexes.flatMap(index => deck.slides[index].sourceKeys));
    for (const key of keys) {
      // A revised document's missing section must not erase accepted or suggested work.
      if (!available(source.facts, key)) continue;
      if (normal(next.facts[key].value) !== normal(source.facts[key].value)) changedKeys.add(key);
      next.facts[key] = { ...source.facts[key], source: `${source.name} [${source.sourceVersion || source.capturedAt}]: ${source.facts[key].source}` };
    }
    next.comparisonSource = structuredClone(source);
    const remaining = changedDefenceSourceFields(next, source).filter(key => available(source.facts, key));
    if (!remaining.length && source.projectId === next.projectId && source.sourceVersion) { next.sourceVersion = source.sourceVersion; next.sourceName = source.name; }
  }
  next.slides = next.slides.map((slide, index) => {
    if (!indexes.includes(index)) return slide;
    const generated = buildDefenceSlide(index, next.facts);
    let bullets = generated.bullets;
    if (source) {
      const fields = slide.sourceKeys.filter(key => changedKeys.has(key) && key !== 'topic');
      const locations = fields.map(key => ({ key, indexes: fieldBulletIndexes(slide, key), replacements: fieldBulletIndexes(generated, key).map(at => generated.bullets[at]) }));
      if (locations.every(item => item.indexes.length > 0)) bullets = slide.bullets.flatMap((text, at) => {
        const location = locations.find(item => item.indexes.includes(at));
        return !location ? [text] : at === location.indexes[0] ? location.replacements : [];
      });
    }
    return { ...slide, ...generated, bullets, id: slide.id, title: index === 0 ? generated.title : slide.title, notes: slide.notes, bodyFontSize: slide.bodyFontSize };
  });
  next.updatedAt = new Date().toISOString();
  return next;
}

export function defenceConsistencyReport(deck: DefenceDeck): string {
  const snapshot = readDefenceSourceSnapshot(deck.sourceSnapshot);
  const revision = readDefenceSourceSnapshot(deck.comparisonSource);
  const findings = reviewDefenceConsistency(deck);
  const changed = snapshot ? changedDefenceSourceFields(deck, snapshot) : [];
  return ['PROPOSAL AND SLIDE CONSISTENCY REVIEW',
    'These checks compare wording, figures and formulation. They do not prove that every slide preserves the proposal meaning or has academic approval. Review source changes with your supervisor.',
    snapshot ? `Original source: ${snapshot.name}\nCaptured: ${snapshot.capturedAt}\nOriginal source version: ${snapshot.sourceVersion || 'Not supplied'}\nInput kind: ${snapshot.kind}` : 'No original import snapshot was saved for this older presentation. Comparison uses its reviewed study fields, not a reconstructed original proposal.',
    ...(revision ? [`COMPARED REVISION\n${revision.name}\nRevision: ${revision.sourceVersion || revision.capturedAt}\nSource updates preserve speaker notes. Review retained notes against the updated study details. Missing revision fields do not remove existing work.`] : []),
    ...(changed.length ? [`REVIEWED DETAILS DIFFER FROM ORIGINAL INPUT\n${changed.map(key => `${labelFor(key)}\nOriginal: ${snapshot!.facts[key].value || '[Not supplied]'}\nReviewed: ${deck.facts[key].value || '[Not supplied]'}`).join('\n\n')}`] : []),
    `${findings.length} slide wording review items.`, ...findings.map(item => `Slide ${item.slideIndex + 1} / ${labelFor(item.field)}: ${item.title}\n${item.detail}\nReviewed source: ${item.sourceText}\nSlide wording: ${item.slideText}`),
  ].join('\n\n');
}
