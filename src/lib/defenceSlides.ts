import { htmlToDOM, type Element } from 'html-react-parser';
import type { Project, User } from '@/types';
import { readResearchList } from './researchFormulation';
import { DEFENCE_RULES_VERSION, getRuleAwareDefencePoints } from './defenceSectionRules';
import { defenceSlideLayoutIssues } from './defenceSlidesExport';
import { readDefenceEvidence, type DefenceEvidence } from './defenceEvidence';
import { readDefenceSourceSnapshot, type DefenceSourceSnapshot } from './defenceConsistency';

export type DefenceFactKey = 'topic' | 'candidate' | 'htin' | 'school' | 'course' | 'supervisor'
  | 'background' | 'problem' | 'aim' | 'objectives' | 'questions' | 'scope' | 'literature'
  | 'justification' | 'design' | 'setting' | 'population' | 'eligibility' | 'sample' | 'sampling'
  | 'instruments' | 'variables' | 'collection' | 'quality' | 'analysis' | 'ethics'
  | 'contribution' | 'references';

export interface DefenceFact {
  value: string;
  source: string;
  status: 'found' | 'confirmed' | 'missing';
  draft?: boolean;
}
export type DefenceFacts = Record<DefenceFactKey, DefenceFact>;
export interface DefenceSlide {
  id: string;
  role: string;
  title: string;
  bullets: string[];
  notes: string;
  sourceKeys: DefenceFactKey[];
  approvedShortening?: boolean;
  rulesVersion?: number;
  bodyFontSize?: 18 | 20 | 22 | 24;
}
export interface DefenceDeck {
  version: 1;
  id: string;
  projectId?: string;
  sourceName: string;
  sourceVersion?: string;
  updatedAt: string;
  durationMinutes: number;
  facts: DefenceFacts;
  slides: DefenceSlide[];
  rulesVersion?: number;
  testData?: boolean;
  generationWarnings?: string[];
  evidence?: DefenceEvidence[];
  sourceSnapshot?: DefenceSourceSnapshot;
  comparisonSource?: DefenceSourceSnapshot;
}

type DefenceFactField = {
  key: DefenceFactKey;
  label: string;
  group: 'Identity' | 'Study focus' | 'Methods' | 'Sources';
  required: boolean;
  multiline?: boolean;
};

export const DEFENCE_FACT_FIELDS: DefenceFactField[] = [
  { key: 'topic', label: 'Research topic', group: 'Identity', required: true, multiline: true },
  { key: 'candidate', label: 'Candidate name', group: 'Identity', required: true },
  { key: 'htin', label: 'HTIN', group: 'Identity', required: true },
  { key: 'school', label: 'School', group: 'Identity', required: true },
  { key: 'course', label: 'Course or programme', group: 'Identity', required: true },
  { key: 'supervisor', label: 'Supervisor', group: 'Identity', required: false },
  { key: 'background', label: 'Background', group: 'Study focus', required: true, multiline: true },
  { key: 'problem', label: 'Problem statement', group: 'Study focus', required: true, multiline: true },
  { key: 'aim', label: 'General objective', group: 'Study focus', required: true, multiline: true },
  { key: 'objectives', label: 'Specific objectives', group: 'Study focus', required: true, multiline: true },
  { key: 'questions', label: 'Research questions', group: 'Study focus', required: true, multiline: true },
  { key: 'scope', label: 'Study scope', group: 'Study focus', required: true, multiline: true },
  { key: 'literature', label: 'Literature review and gap', group: 'Study focus', required: true, multiline: true },
  { key: 'justification', label: 'Justification', group: 'Study focus', required: true, multiline: true },
  { key: 'design', label: 'Study design', group: 'Methods', required: true, multiline: true },
  { key: 'setting', label: 'Study setting', group: 'Methods', required: true, multiline: true },
  { key: 'population', label: 'Study population', group: 'Methods', required: true, multiline: true },
  { key: 'eligibility', label: 'Eligibility criteria', group: 'Methods', required: true, multiline: true },
  { key: 'sample', label: 'Sample size and justification', group: 'Methods', required: true, multiline: true },
  { key: 'sampling', label: 'Sampling procedure', group: 'Methods', required: true, multiline: true },
  { key: 'instruments', label: 'Research instruments', group: 'Methods', required: true, multiline: true },
  { key: 'variables', label: 'Study variables', group: 'Methods', required: true, multiline: true },
  { key: 'collection', label: 'Data collection', group: 'Methods', required: true, multiline: true },
  { key: 'quality', label: 'Quality control', group: 'Methods', required: true, multiline: true },
  { key: 'analysis', label: 'Data management and analysis', group: 'Methods', required: true, multiline: true },
  { key: 'ethics', label: 'Ethical arrangements', group: 'Methods', required: true, multiline: true },
  { key: 'contribution', label: 'Expected contribution', group: 'Study focus', required: true, multiline: true },
  { key: 'references', label: 'References', group: 'Sources', required: true, multiline: true },
];

const fieldFor = (key: DefenceFactKey) => DEFENCE_FACT_FIELDS.find(field => field.key === key)!;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const record = (value: unknown): Record<string, unknown> => isRecord(value) ? value : {};
const compact = (value: string) => value.replace(/\s+/g, ' ').trim();
const hasText = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const instructional = (value: string) => /\bthis section (?:should|must|needs to) (?:explain|describe|cover|present|include)\b|\bbefore submission,?\s*make sure\b|\bwrite directly, keep the wording academic\b|\bthe population should be clearly described\b|\bthe (?:method|calculation or justification) should (?:explain|match)\b|\bthe sampling method will be selected based on the available population\b|\bthe sample size will be determined using an appropriate method\b|\bthe study will be conducted at the selected study area\b/i.test(compact(value));
const unresolved = (value: string) => !value.trim()
  || /\[\[|\[(?:add|insert|enter|provide|replace|verify|citation needed|name the actual|review full text)\b|^(?:tbd|todo|not (?:provided|assigned|specified|available))\.?$/i.test(value.trim())
  || instructional(value);
const usable = (fact: DefenceFact | undefined) => !!fact && fact.status !== 'missing'
  && typeof fact.value === 'string' && !unresolved(fact.value);
const placeholder = (key: DefenceFactKey) => `[Add ${fieldFor(key).label.toLowerCase()}]`;

// Preserve paragraph/list boundaries and decode entities without needing a browser DOM.
function plainText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const visit = (node: Element['children'][number]): string => {
    if (node.type === 'text') return node.data;
    if (!('children' in node)) return '';
    const name = 'name' in node ? node.name.toLowerCase() : '';
    if (['script', 'style', 'template'].includes(name)) return '';
    if (name === 'br') return '\n';
    const content = node.children.map(visit).join('');
    if (name === 'li') return `- ${content.trim()}\n`;
    return /^(?:p|div|h[1-6]|tr|section|ul|ol|blockquote)$/.test(name) ? `\n${content}\n` : name === 'td' ? `${content}\t` : content;
  };
  return htmlToDOM(value).map(visit).join('').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ')
    .split('\n').map(line => line.replace(/[\t ]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function researchListItems(value: string, key: 'objectives' | 'questions'): string[] {
  const isScaffold = (item: string) => {
    const text = item.replace(/^\s*(?:\d+(?:\.\d+)*[.)]?|[ivxlcdm]+[.)])\s+/i, '').trim();
    return !text || instructional(text)
      || /^(?:(?:specific|general|main)\s+)?(?:research\s+)?(?:objectives?|questions?)\b/i.test(text)
      || /^(?:to achieve|in order to|to (?:meet|address|fulfil))\b.*\b(?:aim|objectives?|purpose)\b/i.test(text)
      || /^(?:the (?:study|following)|this study)\b.*\b(?:objectives?|questions?)\b/i.test(text);
  };
  // HTML list items take precedence over surrounding headings, introductions and
  // a general question. Plain sources retain list markers for the same selection.
  let source = value;
  if (!/<li\b/i.test(value)) {
    const lines = plainText(value).split(/\n+|\s+(?=\d+[.)]\s+(?:To|What|How|Which|Is|Are|Does|Do|Why|When|Where)\b)/i).filter(Boolean);
    const marked = lines.filter(line => /^\s*(?:[-*\u2022]|\d+[.)]|[ivxlcdm]+[.)])\s+/i.test(line));
    source = (marked.length ? marked : lines).join('\n');
  }
  return readResearchList(source).map(item => plainText(item).replace(/^[ivxlcdm]+[.)]\s+/i, ''))
    .filter(item => !isScaffold(item))
    .filter(item => key !== 'questions' || !/^general (?:research )?question\b/i.test(item));
}

export function emptyDefenceFacts(): DefenceFacts {
  return Object.fromEntries(DEFENCE_FACT_FIELDS.map(({ key }) =>
    [key, { value: '', source: '', status: 'missing' }])) as DefenceFacts;
}

export function missingDefenceFacts(facts: DefenceFacts): DefenceFactField[] {
  return DEFENCE_FACT_FIELDS.filter(field => field.required && (!usable(facts?.[field.key])
    || ((field.key === 'objectives' || field.key === 'questions') && !researchListItems(facts[field.key].value, field.key).length)));
}

const chapterFields: Partial<Record<DefenceFactKey, [string, string]>> = {
  background: ['chapter1', 'background'], problem: ['chapter1', 'statementOfProblem'],
  aim: ['chapter1', 'generalObjective'], objectives: ['chapter1', 'specificObjectives'],
  questions: ['chapter1', 'researchQuestions'], scope: ['chapter1', 'scope'],
  justification: ['chapter1', 'justification'], contribution: ['chapter1', 'significance'],
  literature: ['chapter2', 'body'], design: ['chapter3', 'studyDesign'],
  setting: ['chapter3', 'studySetting'], population: ['chapter3', 'studyPopulation'],
  eligibility: ['chapter3', 'inclusionExclusion'], sample: ['chapter3', 'sampleSize'],
  sampling: ['chapter3', 'samplingMethod'], instruments: ['chapter3', 'researchInstruments'],
  variables: ['chapter3', 'studyVariables'], collection: ['chapter3', 'dataCollection'],
  quality: ['chapter3', 'qualityControl'], analysis: ['chapter3', 'dataManagement'],
  ethics: ['chapter3', 'ethicalConsiderations'], references: ['references', 'content'],
};

export function extractProjectDefenceFacts(project: Project, user?: User): DefenceFacts {
  if (project.type !== 'proposal') throw new Error('Defence slides require a proposal project, not a report.');
  const facts = emptyDefenceFacts();
  const chapters = record(project.chapters);
  const context = record(chapters._studyContext);
  const source = `Project ${project.id}`;
  const set = (key: DefenceFactKey, value: unknown, anchor: string) => {
    const text = plainText(value);
    const noItems = (key === 'objectives' || key === 'questions') && typeof value === 'string' && !researchListItems(value, key).length;
    if (text) facts[key] = { value: text, source: `${source}: ${anchor}`, status: unresolved(text) || noItems ? 'missing' : 'found' };
  };
  set('topic', project.title, 'title');
  // A viewer/supervisor profile must never become the candidate on someone else's project.
  if (user?.id === project.userId) {
    for (const [key, profileKey] of [
      ['candidate', 'name'], ['htin', 'htin'], ['school', 'schoolName'],
      ['course', 'className'], ['supervisor', 'supervisorName'],
    ] as const) set(key, user[profileKey], `profile.${profileKey}`);
    if (!facts.htin.value) set('htin', user.studentId, 'profile.studentId');
  }
  for (const field of DEFENCE_FACT_FIELDS) {
    const path = chapterFields[field.key];
    if (!path) continue;
    const [chapter, section] = path;
    set(field.key, record(chapters[chapter])[section], `chapters.${chapter}.${section}`);
    if (chapter === 'references' && typeof chapters.references === 'string')
      set('references', chapters.references, 'chapters.references');
  }
  // Manuscript wording wins on conflicts; shared facts only fill genuinely empty sections.
  for (const key of ['objectives', 'design', 'setting', 'population', 'eligibility', 'sample',
    'sampling', 'instruments', 'variables', 'collection', 'quality', 'analysis', 'ethics'] as const) {
    if (!facts[key].value) set(key, context[key], `chapters._studyContext.${key}`);
  }
  if (!facts.problem.value) set('problem', context.rationale, 'chapters._studyContext.rationale');
  if (!facts.contribution.value) set('contribution', context.beneficiaries, 'chapters._studyContext.beneficiaries');
  if (!facts.scope.value && hasText(context.period)) set('scope', `Study period: ${plainText(context.period)}`, 'chapters._studyContext.period');

  let confirmations: Record<string, unknown> = {};
  try { confirmations = record(JSON.parse(typeof context._confirmedStudyFields === 'string' ? context._confirmedStudyFields : '{}')); }
  catch { /* A damaged or legacy confirmation is not evidence of confirmation. */ }
  for (const key of ['objectives', 'design', 'setting', 'population', 'sample', 'sampling'] as const) {
    const candidate = plainText(context[key]) || facts[key].value;
    const profileValue = key === 'objectives' ? readResearchList(candidate).join('\n') : candidate;
    const factValue = key === 'objectives' ? readResearchList(facts[key].value).join('\n') : facts[key].value;
    const signature = JSON.stringify([project.title, profileValue, ...(key === 'objectives' ? [chapters._objectiveCount === 2 ? 2 : 3] : [])]);
    if (usable(facts[key]) && profileValue === factValue && confirmations[key] === signature) facts[key].status = 'confirmed';
  }
  return facts;
}

const headingAliases: Partial<Record<DefenceFactKey, string[]>> = {
  topic: ['topic', 'research topic', 'title', 'research title'],
  candidate: ['candidate', 'candidate name', 'student name', 'name of candidate'],
  htin: ['htin', 'health trainee identification number', 'student number', 'registration number'],
  school: ['school', 'school name', 'institution', 'training institution'],
  course: ['course', 'programme', 'program', 'course or programme'], supervisor: ['supervisor', 'supervisor name'],
  background: ['background', 'background to the study', 'background of the study'],
  problem: ['problem statement', 'statement of the problem', 'statement of problem'],
  aim: ['aim', 'general objective', 'purpose of the study', 'purpose of the study or general objective', 'main objective', 'study aim'],
  objectives: ['specific objectives', 'specific objectives of the study'],
  questions: ['research questions', 'study questions'],
  scope: ['scope', 'scope of the study', 'study scope', 'content scope', 'geographical scope', 'time scope'],
  literature: ['literature review', 'review of literature', 'literature review and gap', 'body', 'literature synthesis', 'research gap'],
  justification: ['justification', 'justification of the study', 'rationale of the study'],
  contribution: ['significance', 'significance of the study', 'expected contribution', 'beneficiaries'],
  design: ['study design', 'research design', 'study design and approach'],
  setting: ['study setting', 'study area', 'research setting'], population: ['study population', 'target population', 'accessible population'],
  eligibility: ['eligibility criteria', 'inclusion and exclusion criteria', 'inclusion exclusion criteria', 'inclusion criteria', 'exclusion criteria'],
  sample: ['sample size', 'sample size determination', 'sample size and justification'],
  sampling: ['sampling method', 'sampling methods', 'sampling procedure', 'sampling technique'],
  instruments: ['research instruments', 'data collection tools', 'data collection instruments', 'instruments'],
  variables: ['study variables', 'variables', 'dependent variables', 'independent variables'],
  collection: ['data collection', 'data collection procedure', 'data collection procedures'],
  quality: ['quality control', 'data quality control', 'reliability and validity', 'validity and reliability'],
  analysis: ['data management', 'data analysis', 'data management and analysis', 'data processing and analysis'],
  ethics: ['ethical considerations', 'ethical arrangements', 'research ethics'], references: ['references', 'bibliography'],
};
const normalizedHeading = (value: string) => value.toLowerCase().replace(/&/g, ' and ')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const headingKeys = new Map(Object.entries(headingAliases).flatMap(([key, aliases]) =>
  aliases.map(alias => [alias, key as DefenceFactKey] as const)));
const boundaryHeadings = new Set(['introduction', 'research objectives', 'methodology', 'research methodology',
  'limitations', 'limitations of the study', 'study limitations', 'dissemination', 'dissemination of results',
  'data presentation', 'work plan', 'budget', 'approval', 'declaration', 'operational definitions',
  'definitions', 'acknowledgement', 'acknowledgements', 'abstract', 'list of tables', 'list of figures',
  'list of abbreviations', 'acronyms', 'appendices', 'appendix']);

function readHeading(line: string) {
  const clean = line.trim().replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '').replace(/\s+#+$/, '');
  const number = clean.match(/^(\d+(?:\.\d+)*[.)]?|[ivxlcdm]+[.)])\s+/i)?.[0] || '';
  const bare = clean.slice(number.length);
  const colon = bare.indexOf(':');
  const name = normalizedHeading(colon < 0 ? bare : bare.slice(0, colon));
  const key = headingKeys.get(name);
  return { key, boundary: boundaryHeadings.has(name) || /^appendix\b/.test(name), number,
    inline: colon < 0 ? '' : bare.slice(colon + 1).trim(), name };
}

export function extractTextDefenceFacts(text: string, sourceName: string): DefenceFacts {
  const facts = emptyDefenceFacts();
  const lines = (/<\/?[a-z][^>]*>/i.test(text) ? plainText(text) : text.replace(/\r\n?/g, '\n')).split('\n');
  let inContents = false;
  let chapter = 0;
  let inAppendices = false;
  let current: { key: DefenceFactKey; heading: string; line: number; body: string[] } | undefined;
  const flush = () => {
    if (!current) return;
    const value = current.body.join('\n').trim();
    if (value) {
      const previous = facts[current.key];
      const anchor = `${sourceName}: line ${current.line} (${current.heading})`;
      const joined = previous.value ? `${previous.value}\n\n${value}` : value;
      facts[current.key] = { value: joined, source: previous.source ? `${previous.source}; ${anchor}` : anchor,
        status: unresolved(joined) || ((current.key === 'objectives' || current.key === 'questions') && !researchListItems(joined, current.key).length) ? 'missing' : 'found' };
    }
    current = undefined;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const heading = readHeading(line);
    if (/^(?:table of )?contents$/i.test(heading.name)) { flush(); inContents = true; continue; }
    // Page-numbered headings are TOC entries, not manuscript evidence.
    const withoutPage = line.replace(/\s+(?:\d+|[ivxlcdm]+)\s*$/i, '');
    const pageHeading = readHeading(withoutPage);
    if (/(?:\.{2,}|\u2026|\t)\s*(?:\d+|[ivxlcdm]+)\s*$/i.test(line)
      || (!heading.inline && withoutPage !== line && (pageHeading.key || /^chapter\b/i.test(line) || pageHeading.boundary))) { flush(); continue; }
    const chapterHeading = line.match(/^(?:#{1,6}\s*)?CHAPTER\s+(ONE|TWO|THREE|FOUR|FIVE|[1-5])(?:\s*[:.-]\s*.*|\s+.*)?$/i);
    if (chapterHeading) {
      flush(); inContents = false;
      chapter = ({ ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as Record<string, number>)[chapterHeading[1].toUpperCase()] || Number(chapterHeading[1]);
      if (chapter > 3) throw new Error('Defence slides require a proposal, not a completed research report.');
      if (chapter === 2) current = { key: 'literature', heading: line, line: i + 1, body: [] };
      continue;
    }
    if (inContents) continue;
    if (/^(?:a\s+)?(?:research|final research|study) report\b/i.test(line))
      throw new Error('Defence slides require a proposal, not a research report.');
    if (/^appendi(?:ces|x)\b/.test(heading.name)) { flush(); inAppendices = true; continue; }
    if (inAppendices) continue;
    if (/^\d+$/.test(line)) continue;
    // Objective-led Chapter Two subheadings stay in literature, never Chapter One facts.
    if (chapter === 2 && heading.key !== 'references') {
      if (!current) current = { key: 'literature', heading: line, line: i + 1, body: [] };
      if (heading.key !== 'literature' && heading.name !== 'introduction') current.body.push(line);
      else if (heading.inline) current.body.push(heading.inline);
      continue;
    }
    if (heading.key) {
      flush();
      const scopePart = heading.key === 'scope' && ['content scope', 'geographical scope', 'time scope'].includes(heading.name);
      const initial = scopePart ? [`${heading.name}: ${heading.inline}`.trim()] : heading.inline ? [heading.inline] : [];
      current = { key: heading.key, heading: line.split(':')[0], line: i + 1, body: initial };
      if (fieldFor(heading.key).group === 'Identity' && heading.inline) flush();
      if (heading.key === 'references') chapter = 0;
    } else if (heading.boundary || (/^\d+\.\d+/.test(heading.number) && !['literature', 'references'].includes(current?.key || ''))
      || (/^[A-Z][A-Z /&-]{3,}$/.test(line) && !current?.key.match(/^(?:objectives|questions|references)$/))) {
      flush();
    } else if (current) current.body.push(line);
  }
  flush();
  const nonempty = lines.filter(line => line.trim());
  if (!facts.topic.value && nonempty.length === 1 && !readHeading(nonempty[0]).key
    && !readHeading(nonempty[0]).boundary && nonempty[0].length <= 400 && !inContents) {
    facts.topic = { value: nonempty[0].trim(), source: `${sourceName}: line ${lines.indexOf(nonempty[0]) + 1} (topic)`, status: unresolved(nonempty[0]) ? 'missing' : 'found' };
  }
  return facts;
}

const slideDefinitions: Array<{ role: string; title: string; keys: DefenceFactKey[] }> = [
  { role: 'title', title: 'Proposal defence', keys: ['topic', 'candidate', 'htin', 'school', 'course', 'supervisor'] },
  { role: 'background', title: 'Background', keys: ['background'] },
  { role: 'problem', title: 'Problem statement', keys: ['problem'] },
  { role: 'objectives', title: 'Aim and specific objectives', keys: ['aim', 'objectives'] },
  { role: 'questions-scope', title: 'Research questions and scope', keys: ['questions', 'scope'] },
  { role: 'literature-value', title: 'Literature gap and justification', keys: ['literature', 'justification'] },
  { role: 'design-population', title: 'Design, setting and population', keys: ['design', 'setting', 'population', 'eligibility'] },
  { role: 'sample-measurement', title: 'Sample and measurement', keys: ['sample', 'sampling', 'instruments', 'variables'] },
  { role: 'execution-ethics', title: 'Collection, analysis and ethics', keys: ['collection', 'quality', 'analysis', 'ethics'] },
  { role: 'closing', title: 'Closing and next steps', keys: ['contribution', 'references'] },
];

// Only whole sentences are selected. Bracketed citations, decimals and common
// scholarly abbreviations cannot create a sentence boundary.
function sentences(text: string): string[] {
  const value = compact(text);
  const result: string[] = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === '(' || char === '[') depth++;
    if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
    if (depth || !/[.!?]/.test(char) || (i + 1 < value.length && value[i + 1] !== ' ')) continue;
    const word = value.slice(start, i).match(/([\w.]+)$/)?.[1] || '';
    if (char === '.' && /^(?:al|et|e\.g|i\.e|dr|mr|mrs|ms|prof|fig|no|vs|[A-Z])$/i.test(word)) continue;
    const rest = value.slice(i + 1).trimStart();
    if (/^(?:\([^)]*(?:\b(?:19|20)\d{2}|n\.d\.)[^)]*\)|\[\d+(?:[,-]\s*\d+)*\])/.test(rest)) continue;
    result.push(value.slice(start, i + 1).trim());
    start = i + 1;
  }
  if (value.slice(start).trim()) result.push(value.slice(start).trim());
  return result;
}

function factBullets(key: DefenceFactKey, fact: DefenceFact, count = 1): string[] {
  if (!usable(fact)) return [placeholder(key)];
  const headingNames = [...(headingAliases[key] || []), fieldFor(key).label]
    .sort((a, b) => b.length - a.length)
    .map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const value = plainText(fact.value).replace(new RegExp(`^(?:\\d+(?:\\.\\d+)*\\s+)?(?:${headingNames})\\s*(?::|\\n|(?=[A-Z]))\\s*`, 'i'), '').trim();
  if (key === 'objectives' || key === 'questions') {
    const items = researchListItems(fact.value, key);
    return items.length ? items : [placeholder(key)];
  }
  const label = fieldFor(key).label;
  if (key === 'aim' || fieldFor(key).group === 'Identity') return [`${label}: ${compact(value)}`];
  if (key === 'references') return ['References: Supplied entries in speaker notes.'];
  const allSentences = sentences(value);
  const focus: Partial<Record<DefenceFactKey, RegExp>> = {
    problem: /\b(?:however|despite|gap|paucity|unknown|limited|low uptake|suboptimal)\b/i,
    literature: /\b(?:gap|paucity|inconsistent|understudied|limited evidence|limited research)\b/i,
    contribution: /\b(?:will (?:inform|guide|contribute|help|support|benefit)|expected to|findings will)\b/i,
    sample: /\b(?:total sample size|final sample size|sample size of \d|total of \d|target of \d)\b/i,
    population: /\b(?:accessible population|consists of|comprises)\b/i,
  };
  const focused = focus[key] ? allSentences.filter(sentence => sentence.length <= 240 && focus[key]!.test(sentence)) : [];
  const selected = (focused.length ? focused : allSentences).slice(0, count);
  // A long sentence is not silently cut mid-claim or separated from its citation.
  return selected.map(sentence => sentence.length > 240
    ? `${label}: [Review full text in speaker notes]` : `${label}: ${sentence}`);
}

/** Zero-based index. Regenerating one slide never modifies facts or other slides. */
export function buildDefenceSlide(index: number, facts: DefenceFacts): DefenceSlide {
  if (!Number.isInteger(index) || index < 0 || index >= slideDefinitions.length)
    throw new RangeError('Choose a slide index from 0 to 9.');
  const definition = slideDefinitions[index];
  const keys = definition.keys;
  const notes = keys.map(key => {
    const fact = facts[key];
    return `${fieldFor(key).label}\nSource: ${fact?.source || 'Not supplied'}\nStatus: ${fact?.draft ? 'Suggested draft - not confirmed' : fact?.status || 'missing'}\n${fact?.value || (fieldFor(key).required ? placeholder(key) : 'Not supplied (optional)')}`;
  }).join('\n\n');
  return {
    id: `defence-${definition.role}`, role: definition.role,
    rulesVersion: DEFENCE_RULES_VERSION,
    title: index === 0 ? usable(facts.topic) ? compact(plainText(facts.topic.value)) : placeholder('topic') : definition.title,
    bullets: [
      ...keys.filter(key => (index !== 0 || key !== 'topic') && (definition.role !== 'closing' || key !== 'references') && (fieldFor(key).required || usable(facts[key])))
        .flatMap(key => getRuleAwareDefencePoints(key, facts) ?? factBullets(key, facts[key], index === 1 || index === 2 ? 2 : 1)),
      ...(definition.role === 'closing' ? ['Questions and discussion'] : []),
    ],
    notes, sourceKeys: [...keys],
  };
}

export function createDefenceDeck(facts: DefenceFacts, options: {
  sourceName: string;
  projectId?: string;
  sourceVersion?: string;
  durationMinutes: number;
  testData?: boolean;
  generationWarnings?: string[];
  evidence?: DefenceEvidence[];
  sourceSnapshot?: DefenceSourceSnapshot;
}): DefenceDeck {
  if (!hasText(options.sourceName)) throw new Error('Provide a source name for the proposal or topic.');
  if (!Number.isFinite(options.durationMinutes) || options.durationMinutes <= 0)
    throw new RangeError('Presentation duration must be a positive number of minutes.');
  const snapshot = Object.fromEntries(DEFENCE_FACT_FIELDS.map(({ key }) => [key, { ...facts[key] }])) as DefenceFacts;
  return {
    version: 1, rulesVersion: DEFENCE_RULES_VERSION, id: `defence-${crypto.randomUUID()}`, sourceName: options.sourceName,
    ...(options.projectId === undefined ? {} : { projectId: options.projectId }),
    ...(options.sourceVersion === undefined ? {} : { sourceVersion: options.sourceVersion }),
    updatedAt: new Date().toISOString(), durationMinutes: options.durationMinutes, facts: snapshot,
    ...(options.testData ? { testData: true } : {}),
    ...(options.generationWarnings?.length ? { generationWarnings: [...options.generationWarnings] } : {}),
    ...(options.evidence?.length ? { evidence: structuredClone(readDefenceEvidence(options.evidence)) } : {}),
    ...(options.sourceSnapshot ? { sourceSnapshot: structuredClone(options.sourceSnapshot) } : {}),
    slides: slideDefinitions.map((_, index) => buildDefenceSlide(index, snapshot)),
  };
}

/** Returns structural errors and actionable draft warnings; never trusts saved JSON. */
export function validateDefenceDeck(deck: DefenceDeck, options: { allowDraft?: boolean; allowEditedNotes?: boolean } = {}): string[] {
  const errors: string[] = [];
  if (!isRecord(deck)) return ['The saved defence deck is not an object. Create a new deck.'];
  if (deck.version !== 1) errors.push('Unsupported defence deck version. Create a version 1 deck.');
  if (!hasText(deck.id)) errors.push('The deck needs a non-empty ID.');
  if (!hasText(deck.sourceName)) errors.push('Add the proposal source name.');
  if (!hasText(deck.updatedAt) || !/^\d{4}-\d\d-\d\dT/.test(deck.updatedAt) || !Number.isFinite(Date.parse(deck.updatedAt)))
    errors.push('The deck needs a valid updatedAt ISO timestamp.');
  for (const key of ['projectId', 'sourceVersion'] as const)
    if (deck[key] !== undefined && !hasText(deck[key])) errors.push(`${key} must be a non-empty string when supplied.`);
  if (typeof deck.durationMinutes !== 'number' || !Number.isFinite(deck.durationMinutes) || deck.durationMinutes <= 0)
    errors.push('Set a positive presentation duration in minutes.');
  if (deck.testData !== undefined && typeof deck.testData !== 'boolean') errors.push('Test presentation must be a boolean when supplied.');
  if (deck.generationWarnings !== undefined && (!Array.isArray(deck.generationWarnings) || !deck.generationWarnings.every(hasText))) errors.push('Generation warnings must be a list of text notes.');
  if (deck.evidence !== undefined && (!Array.isArray(deck.evidence) || readDefenceEvidence(deck.evidence).length !== deck.evidence.length)) errors.push('Some source retrieval records are invalid. Look up those sources again before exporting.');
  for (const key of ['sourceSnapshot', 'comparisonSource'] as const) if (deck[key] !== undefined && !readDefenceSourceSnapshot(deck[key])) errors.push('A saved proposal snapshot is invalid. Reopen the original proposal before updating slides.');
  const facts = record(deck.facts);
  const validFacts = new Set<DefenceFactKey>();
  for (const field of DEFENCE_FACT_FIELDS) {
    const fact = record(facts[field.key]);
    if (typeof fact.value !== 'string' || typeof fact.source !== 'string' || !['found', 'confirmed', 'missing'].includes(String(fact.status))) {
      errors.push(`Repair the ${field.label.toLowerCase()} fact: value, source and a valid status are required.`);
      continue;
    }
    validFacts.add(field.key);
    if (fact.draft !== undefined && typeof fact.draft !== 'boolean') errors.push(`Invalid draft status for ${field.label.toLowerCase()}.`);
    if (!options.allowDraft && fact.draft === true) errors.push(`Review and confirm the suggested ${field.label.toLowerCase()} before presenting.`);
    if (fact.status !== 'missing' && unresolved(fact.value as string)) errors.push(`Resolve the placeholder in ${field.label.toLowerCase()} or mark it missing.`);
    if (fact.status !== 'missing' && !hasText(fact.source)) errors.push(`Add a source anchor for ${field.label.toLowerCase()}.`);
    const noItems = (field.key === 'objectives' || field.key === 'questions') && !researchListItems(fact.value as string, field.key).length;
    if (noItems && fact.status !== 'missing') errors.push(`Add actual ${field.label.toLowerCase()} list items or mark the field missing; headings and introductions are not study facts.`);
    if (!options.allowDraft && field.required && (fact.status === 'missing' || unresolved(fact.value as string) || noItems)) errors.push(`Add ${field.label.toLowerCase()} before presenting this draft.`);
  }
  if (!Array.isArray(deck.slides)) return [...errors, 'The deck must contain exactly ten slides.'];
  if (deck.slides.length !== 10) errors.push('The deck must contain exactly ten slides.');
  const ids = new Set<string>();
  const roles = new Set<string>();
  deck.slides.forEach((slide: unknown, index: number) => {
    const label = `Slide ${index + 1}`;
    if (!isRecord(slide)) { errors.push(`${label} is invalid. Regenerate this slide.`); return; }
    if (slide.approvedShortening !== undefined && typeof slide.approvedShortening !== 'boolean')
      errors.push(`${label} approvedShortening must be a boolean when supplied.`);
    if (slide.bodyFontSize !== undefined && ![18, 20, 22, 24].includes(slide.bodyFontSize as number))
      errors.push(`${label} text size must be Auto, 18, 20, 22 or 24 points.`);
    if (!hasText(slide.id) || ids.has(slide.id)) errors.push(`${label} needs a unique non-empty ID.`);
    else ids.add(slide.id);
    const definition = slideDefinitions[index];
    if (!definition || slide.role !== definition.role || roles.has(String(slide.role))) errors.push(`${label} has an invalid or misplaced role. Restore the ten-slide order.`);
    roles.add(String(slide.role));
    if (!hasText(slide.title)) errors.push(`${label} needs a title.`);
    const bulletsValid = Array.isArray(slide.bullets) && slide.bullets.length > 0 && slide.bullets.every(hasText);
    if (!bulletsValid) errors.push(`${label} needs a non-empty list of text bullets.`);
    else {
      const bullets = slide.bullets as string[];
      if (!options.allowDraft && /\[(?:Add|Review)\b[^\]]+\]/i.test([slide.title, ...bullets].join('\n')))
        errors.push(`${label} is a draft: resolve its [Add ...] or [Review ...] placeholders before presenting.`);
      if (bullets.some(instructional)) errors.push(`${label} contains instructional template text, not study facts. Replace it with the actual study detail or an [Add ...] placeholder.`);
      if (bullets.length > 50 || bullets.some(bullet => bullet.length > 10000) || bullets.join(' ').length > 30000)
        errors.push(`${label} (${String(slide.role)}) has too much text. ${slide.role === 'objectives' || slide.role === 'questions-scope'
          ? 'Keep every objective/question intact; review the layout or explicitly approve revised wording. Nothing has been truncated.'
          : 'Move supporting detail to speaker notes or shorten the presentation wording.'}`);
      else errors.push(...defenceSlideLayoutIssues(slide as unknown as DefenceSlide, index));
    }
    if (!hasText(slide.notes)) errors.push(`${label} needs speaker notes with original text and source anchors.`);
    if (!Array.isArray(slide.sourceKeys) || !slide.sourceKeys.length) {
      errors.push(`${label} needs fact source keys.`);
      return;
    }
    const keys = new Set<unknown>();
    for (const key of slide.sourceKeys) {
      if (typeof key !== 'string' || !DEFENCE_FACT_FIELDS.some(field => field.key === key) || keys.has(key)) {
        errors.push(`${label} has an invalid or duplicate source key.`);
        continue;
      }
      keys.add(key);
      if (!validFacts.has(key as DefenceFactKey)) continue;
      const fact = facts[key] as DefenceFact;
      if (!options.allowEditedNotes && typeof slide.notes === 'string' && fact.value && !slide.notes.includes(fact.value)) errors.push(`${label} notes must retain the full original ${fieldFor(key as DefenceFactKey).label.toLowerCase()}.`);
      if (!options.allowEditedNotes && typeof slide.notes === 'string' && fact.source && !slide.notes.includes(fact.source)) errors.push(`${label} notes are missing the source anchor for ${key}.`);
      if ((key === 'objectives' || key === 'questions') && usable(fact) && bulletsValid && slide.approvedShortening !== true) {
        const original = researchListItems(fact.value, key);
        if (original.some(item => !(slide.bullets as string[]).some(bullet => compact(bullet).includes(compact(item)))))
          errors.push(`${label} must preserve every original ${key === 'objectives' ? 'objective' : 'research question'} verbatim. Restore missing or shortened wording.`);
      }
    }
    if (definition?.keys.some(key => !keys.has(key))) errors.push(`${label} is missing source keys for its ${definition.role} role. Regenerate it.`);
  });
  return errors;
}
