import { z } from 'zod';
import { DEFENCE_FACT_FIELDS, type DefenceFactKey, type DefenceFacts } from './defenceSlides';
import { DEFENCE_RULES_VERSION } from './defenceSectionRules';
import { runtimeConfig } from './runtimeConfig';

// Bump when generation prompts or validation change enough to invalidate saved stages.
export const DEFENCE_DRAFT_ENGINE_VERSION = 1;
export const DEFENCE_DRAFT_STAGES = ['sources', 'focus', 'methods', 'checks'] as const;
export type DefenceDraftStage = typeof DEFENCE_DRAFT_STAGES[number];
export const DEFENCE_DRAFT_STAGE_LABELS: Record<DefenceDraftStage, string> = {
  sources: 'Source lookup', focus: 'Study focus', methods: 'Proposed methods', checks: 'Section and length checks',
};
const factKeys = DEFENCE_FACT_FIELDS.map(field => field.key) as [DefenceFactKey, ...DefenceFactKey[]];
const factSchema = z.object({ value: z.string().max(100000), source: z.string().max(5000), status: z.enum(['found', 'confirmed', 'missing']), draft: z.boolean().optional() }).strict();
export const defenceFactsSchema = z.record(factSchema).refine(value => Object.keys(value).length === factKeys.length && factKeys.every(key => key in value))
  .transform(value => value as DefenceFacts);
const evidenceSchema = z.object({ citationText: z.string().min(1).max(5000), notes: z.string().min(1).max(5000), apaReference: z.string().min(1).max(5000), url: z.string().url().max(5000).startsWith('https://') }).strict();
export type DefenceDraftEvidence = z.infer<typeof evidenceSchema>;
const checkpointSchema = z.object({
  version: z.literal(1), engineVersion: z.literal(DEFENCE_DRAFT_ENGINE_VERSION), rulesVersion: z.literal(DEFENCE_RULES_VERSION),
  model: z.string().min(1).max(200), inputFacts: defenceFactsSchema, facts: defenceFactsSchema,
  generatedKeys: z.array(z.enum(factKeys)).max(factKeys.length), warnings: z.array(z.string().min(1).max(5000)).max(20),
  evidence: z.array(evidenceSchema).max(3), completedStages: z.array(z.enum(DEFENCE_DRAFT_STAGES)).max(4), updatedAt: z.string().datetime(),
}).strict();
export type DefenceDraftCheckpoint = z.infer<typeof checkpointSchema>;

export const sameDefenceDraftInput = (left: DefenceFacts, right: DefenceFacts) => factKeys.every(key => {
  const a = left[key], b = right[key];
  return a?.value === b?.value && a?.source === b?.source && a?.status === b?.status && Boolean(a?.draft) === Boolean(b?.draft);
});

export function createDefenceDraftCheckpoint(input: DefenceFacts): DefenceDraftCheckpoint {
  return { version: 1, engineVersion: DEFENCE_DRAFT_ENGINE_VERSION, rulesVersion: DEFENCE_RULES_VERSION, model: runtimeConfig.googleAiModel,
    inputFacts: structuredClone(input), facts: structuredClone(input), generatedKeys: [], warnings: [], evidence: [], completedStages: [], updatedAt: new Date().toISOString() };
}

/** Stored drafts are untrusted input; identities and supplied study facts cannot be replaced. */
export function readDefenceDraftCheckpoint(value: unknown, input?: DefenceFacts): DefenceDraftCheckpoint | null {
  const parsed = checkpointSchema.safeParse(value);
  if (!parsed.success || JSON.stringify(parsed.data).length > 400000) return null;
  const checkpoint = parsed.data;
  if (checkpoint.model !== runtimeConfig.googleAiModel || input && !sameDefenceDraftInput(input, checkpoint.inputFacts)) return null;
  if (checkpoint.completedStages.some((stage, i) => stage !== DEFENCE_DRAFT_STAGES[i])) return null;
  const generated = new Set(checkpoint.generatedKeys);
  if (generated.size !== checkpoint.generatedKeys.length) return null;
  for (const field of DEFENCE_FACT_FIELDS) {
    const original = checkpoint.inputFacts[field.key], fact = checkpoint.facts[field.key];
    if (generated.has(field.key)) {
      if (field.group === 'Identity' || original.value.trim() || !fact.value.trim() || !fact.source.trim() || fact.status !== 'found' || fact.draft !== true) return null;
    } else if (!sameDefenceDraftInput({ ...checkpoint.inputFacts, [field.key]: fact }, checkpoint.inputFacts)) return null;
  }
  if (generated.has('references')) {
    const expected = checkpoint.evidence.map(source => `${source.apaReference}\n${source.url}`).join('\n\n');
    if (!checkpoint.completedStages.includes('sources') || !expected || checkpoint.facts.references.value !== expected) return null;
  } else if (checkpoint.evidence.length) return null;
  return checkpoint;
}

export const nextDefenceDraftStage = (checkpoint: DefenceDraftCheckpoint): DefenceDraftStage | null => DEFENCE_DRAFT_STAGES[checkpoint.completedStages.length] || null;
