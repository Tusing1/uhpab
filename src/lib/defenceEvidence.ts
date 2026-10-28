import { z } from 'zod';
import type { DefenceFacts, DefenceFactKey, DefenceSlide } from './defenceSlides';
import { extractResearchCitations, parseResearchReferences, type ResearchCitation } from './researchCitations';
import { parseResearchTopic } from './researchFormulation';

export const publicEvidenceUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
      && url.hostname.includes('.') && !/^(?:localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(url.hostname)
      && !/\.(?:local|internal)$/i.test(url.hostname);
  } catch { return false; }
};
const urlSchema = z.string().url().max(5000).refine(publicEvidenceUrl);
export const defenceEvidenceSchema = z.object({
  id: z.string().min(1).max(200), title: z.string().min(1).max(5000), authors: z.string().min(1).max(5000), year: z.string().min(1).max(100),
  citationText: z.string().min(1).max(5000), notes: z.string().min(1).max(5000), apaReference: z.string().min(1).max(5000), url: urlSchema,
  retrievedAt: z.string().datetime(), annotations: z.array(z.object({ url: urlSchema, title: z.string().max(5000) }).strict()).min(1).max(6),
}).strict().refine(source => source.annotations.some(annotation => canonicalSourceUrl(annotation.url) === canonicalSourceUrl(source.url)));
export type DefenceEvidence = z.infer<typeof defenceEvidenceSchema>;
export const canonicalSourceUrl = (value: string) => { try { const url = new URL(value); return `${url.origin}${url.pathname}`.replace(/\/$/, ''); } catch { return ''; } };
export function readDefenceEvidence(value: unknown): DefenceEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap(item => { const parsed = defenceEvidenceSchema.safeParse(item); return parsed.success ? [parsed.data] : []; });
}

export function applyDefenceEvidence(facts: DefenceFacts, records: unknown, source: DefenceEvidence) {
  const parsed = defenceEvidenceSchema.parse(source);
  const evidence = readDefenceEvidence(records);
  const old = evidence.find(item => canonicalSourceUrl(item.url) === canonicalSourceUrl(parsed.url));
  if (!old && evidence.length >= 12) throw new Error('This presentation already has 12 retrieved sources. Replace an existing source first.');
  let references = facts.references.value;
  if (old && references.includes(old.apaReference)) references = references.replace(old.apaReference, parsed.apaReference).replace(old.url, parsed.url);
  else if (!references.includes(parsed.apaReference)) references = `${references.trim()}\n\n${parsed.apaReference}\n${parsed.url}`.trim();
  return {
    facts: { ...facts, references: { value: references, source: 'Student-selected source drafts - verify APA details and findings', status: 'found' as const, draft: true } },
    evidence: [...evidence.filter(item => item.id !== old?.id), { ...parsed, id: old?.id || parsed.id }],
  };
}

export type EvidenceIssue = { code: string; section: string; field?: DefenceFactKey; slideIndex?: number; detail: string; excerpt: string };
export type CitationLink = { citation: ResearchCitation; section: string; references: string[]; sources: DefenceEvidence[]; excerpt: string };
export type DefenceEvidenceAudit = { issues: EvidenceIssue[]; citations: CitationLink[]; evidence: DefenceEvidence[]; referenceCount: number };
const evidenceFields: DefenceFactKey[] = ['background', 'problem', 'literature'];
const normal = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const percentages = (text: string) => [...text.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:%|per\s*cent\b|percent\b)/gi)].map(match => Number(match[1]));

export function auditDefenceEvidence(facts: DefenceFacts, records: unknown = [], slides: DefenceSlide[] = []): DefenceEvidenceAudit {
  const evidence = readDefenceEvidence(records), references = parseResearchReferences(facts.references.value);
  const issues: EvidenceIssue[] = [], citations: CitationLink[] = [];
  if (Array.isArray(records) && records.length !== evidence.length) issues.push({ code: 'invalid-source-record', section: 'Sources', field: 'references', excerpt: '', detail: 'Some saved source records are incomplete or invalid. Retrieve those sources again; they are not counted as retrieved evidence.' });
  for (const source of evidence) {
    const pairs = extractResearchCitations(source.citationText), entry = parseResearchReferences(source.apaReference);
    if (pairs.length !== 1 || entry.length !== 1 || entry[0].key !== pairs[0]?.key || pairs[0]?.year.replace(/\s/g, '') !== source.year.replace(/\s/g, '')) issues.push({ code: 'source-metadata', section: 'Sources', field: 'references', excerpt: source.apaReference, detail: 'Retrieved source metadata disagrees with its citation or year. Check the author, date and APA entry against the original page.' });
  }
  let setting = normal(facts.setting.value.replace(/^Proposed\s+(?:setting:\s*)?/i, ''));
  try { setting = normal(parseResearchTopic(facts.topic.value).setting); } catch { /* A partial topic still permits citation matching. */ }
  const texts = [
    ...evidenceFields.map(field => ({ section: field === 'problem' ? 'Problem statement' : field === 'literature' ? 'Literature review' : 'Background', field, text: facts[field].value })),
    ...slides.map((slide, slideIndex) => ({ section: `Slide ${slideIndex + 1}: ${slide.title}`, slideIndex, text: slide.bullets.join('\n') })),
  ];
  const used = new Set<string>();
  for (const item of texts) {
    const location = { section: item.section, ...('field' in item ? { field: item.field } : { slideIndex: item.slideIndex }) };
    for (const citation of extractResearchCitations(item.text)) {
      used.add(citation.key);
      const matches = references.filter(reference => reference.key === citation.key);
      const sources = evidence.filter(source => extractResearchCitations(source.citationText).some(known => known.key === citation.key));
      citations.push({ citation, section: item.section, references: matches.map(match => match.text), sources, excerpt: item.text });
      if (matches.length !== 1) issues.push({ ...location, code: matches.length ? 'ambiguous-reference' : 'missing-reference', excerpt: citation.text, detail: matches.length ? `${citation.text} matches more than one reference. Check author lists and year suffixes.` : `${citation.text} has no matching author-year reference.` });
      else if (!sources.length) issues.push({ ...location, code: 'source-not-retrieved', excerpt: citation.text, detail: `${citation.text} has a reference, but no source retrieval record. Open the source and check its details and findings.` });
      else if (sources.length > 1) issues.push({ ...location, code: 'ambiguous-source', excerpt: citation.text, detail: `${citation.text} identifies multiple retrieved works. Check author lists and year suffixes before linking a finding.` });
      else if (!normal(matches[0].text).includes(normal(sources[0].apaReference))) issues.push({ ...location, code: 'source-reference-disagreement', excerpt: citation.text, detail: 'The author and year match, but the bibliography differs from the retrieved APA draft. Check that these are the same work, not different sources with the same author and year.' });
    }
    for (const sentence of item.text.split(/\n+|(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean)) {
      const figures = percentages(sentence);
      if (!figures.length || ('slideIndex' in item && !slides[item.slideIndex].sourceKeys.some(key => evidenceFields.includes(key)))) continue;
      const linked = extractResearchCitations(sentence).flatMap(citation => evidence.filter(source => extractResearchCitations(source.citationText).some(known => known.key === citation.key)));
      if (!linked.length) issues.push({ ...location, code: 'unsupported-statistic', excerpt: sentence, detail: 'This percentage has no retrieved source linked in the same point. Check the original finding and its citation.' });
      else if (figures.some(figure => !linked.some(source => percentages(source.notes).includes(figure)))) issues.push({ ...location, code: 'statistic-not-in-source', excerpt: sentence, detail: 'A percentage in this point is absent from the recorded source findings. Verify its value, population and denominator.' });
      const localClaim = /\b(?:this|the|our|study) (?:facility|hospital|health centre|site)\b/i.test(sentence) || setting.length > 8 && normal(sentence).includes(setting);
      if (localClaim && !linked.some(source => setting.length > 8 && normal(source.notes).includes(setting))) issues.push({ ...location, code: 'local-scope-unverified', excerpt: sentence, detail: 'The percentage is presented as a study-site finding, but the recorded evidence does not name that site. Do not turn global, national or other-facility findings into local results.' });
    }
  }
  for (const reference of references) {
    if (!reference.key || /\[\[|\b(?:TBD|TODO)\b/i.test(reference.text)) issues.push({ code: 'reference-metadata', section: 'References', field: 'references', excerpt: reference.text, detail: 'This entry needs complete author-year metadata before citation matching is possible.' });
    else if (!used.has(reference.key)) issues.push({ code: 'uncited-reference', section: 'References', field: 'references', excerpt: reference.text, detail: 'No matching citation was found in the reviewed background, problem, literature or slide points. Cite it where used, or remove it from this presentation bibliography.' });
  }
  return { issues, citations, evidence, referenceCount: references.length };
}

export function defenceEvidenceReport(facts: DefenceFacts, records: unknown = [], slides: DefenceSlide[] = []): string {
  const audit = auditDefenceEvidence(facts, records, slides);
  return ['EVIDENCE AND CITATION REVIEW', 'Automated APA matching and provider retrieval records are not proof that a claim is true or a source supports it. Check original sources with your supervisor.',
    `${audit.referenceCount} reference entries; ${audit.evidence.length} retrieved source records; ${audit.issues.length} review items.`,
    ...audit.issues.map(issue => `${issue.section}: ${issue.detail}\nWording: ${issue.excerpt}`),
    ...audit.evidence.map(source => `${source.citationText} - ${source.title}\nRetrieved: ${source.retrievedAt}\nURL: ${source.url}\nProvider annotations: ${source.annotations.map(annotation => `${annotation.title}: ${annotation.url}`).join('; ')}\nRecorded findings (check against original): ${source.notes}\nAPA draft: ${source.apaReference}`),
  ].join('\n\n');
}
