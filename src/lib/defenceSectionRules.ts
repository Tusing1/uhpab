import { htmlToDOM, type Element } from 'html-react-parser';
import proposalStructure from '@/data/proposalStructure';
import { getUhpabSectionContract, sectionCitationPolicy } from './uhpabWritingEngine';
import {
  parseResearchTopic, buildGeneralObjective, normalizeSpecificObjectives,
  buildResearchQuestions, readResearchList, type ParsedResearchTopic,
} from './researchFormulation';
import type { DefenceFactKey, DefenceFacts, DefenceSlide } from './defenceSlides';

export const DEFENCE_RULES_VERSION = 2;
export type DefenceRuleFinding = {
  key: DefenceFactKey;
  title: string;
  detail: string;
  suggestion?: string;
  target?: 'source' | 'slide';
};

const sections: Partial<Record<DefenceFactKey, [string, string]>> = {
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
  ethics: ['chapter3', 'ethicalConsiderations'],
};
const compact = (value: string) => value.replace(/\s+/g, ' ').trim();
const comparable = (value: string) => compact(value).toLowerCase().replace(/[.?!]+$/, '');
const marker = (value: string) => /\[(?:add|review|insert|provide|verify)\b/i.test(value);
const instruction = (value: string) => /^(?:write|describe|explain|include|mention|add|insert|provide|ensure|avoid|do not|state|outline|define|keep|present|summari[sz]e|discuss|show|list|name|use|move|end by)\b|\bthis section (?:should|must|needs to)\b|\bbefore submission\b|\bwrite directly, keep\b/i.test(value);

function plain(value: string): string {
  const visit = (node: Element['children'][number]): string => {
    if (node.type === 'text') return node.data;
    if (!('children' in node)) return '';
    const name = 'name' in node ? node.name.toLowerCase() : '';
    if (['script', 'style', 'template'].includes(name)) return '';
    if (name === 'br') return '\n';
    const text = node.children.map(visit).join('');
    return /^(?:p|div|h[1-6]|li|ul|ol|section)$/.test(name) ? `\n${text}\n` : text;
  };
  return htmlToDOM(value).map(visit).join('').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
}

const headings: Partial<Record<DefenceFactKey, string>> = {
  problem: 'statement of the problem|statement of problem|problem statement',
  background: 'background to the study|background of the study|background',
  justification: 'justification of the study|justification|rationale of the study',
  contribution: 'significance of the study|significance|expected contribution|beneficiaries',
  scope: 'scope of the study|study scope|scope', aim: 'purpose of the study or general objective|purpose of the study|general objective|main objective|aim',
};
function body(key: DefenceFactKey, value: string): string {
  const pattern = headings[key];
  return plain(value).split('\n').map(line => {
    const text = line.trim().replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '');
    return pattern ? text.replace(new RegExp(`^(?:\\d+(?:\\.\\d+)*[.)]?\\s+)?(?:${pattern})(?=\\s|:|$)\\s*:?\\s*`, 'i'), '') : text;
  }).join('\n').trim();
}

function list(value: string): string[] {
  // Keep actual HTML list items ahead of surrounding headings and introductions.
  const htmlItems = [...value.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(match => plain(match[1]));
  const lines = htmlItems.length ? htmlItems : plain(value).split(/\n+|\s+(?=\d+[.)]\s+(?:To|What|How|Which|Is|Are|Does|Do|Why|When|Where)\b)/i);
  const marked = htmlItems.length ? [] : lines.filter(line => /^\s*(?:[-*\u2022]|\d+[.)]|[ivxlcdm]+[.)])\s+/i.test(line));
  return readResearchList((marked.length ? marked : lines).join('\n')).map(item => item.replace(/^[ivxlcdm]+[.)]\s+/i, '').trim())
    .filter(item => !instruction(item) && !/^(?:\d+(?:\.\d+)*\s+)?(?:(?:specific|general|main)\s+)?(?:research\s+)?(?:objectives?|questions?)\b|^(?:to achieve|in order to|the (?:study|following)|this study)\b.*\b(?:aim|objectives?|questions?)\b/i.test(item));
}

/** Slide requirements are semantic content, not manuscript pagination or typography. */
export function getDefenceSectionRule(key: DefenceFactKey, facts: DefenceFacts): {
  purpose: string;
  requirements: string[];
  citationPolicy: 'evidence' | 'only-if-borrowed' | 'none';
} | null {
  const path = sections[key];
  if (!path) return null;
  const [sectionKey, componentId] = path;
  const chapter = proposalStructure[sectionKey];
  const guideline = chapter && 'sections' in chapter ? chapter.sections[componentId] : undefined;
  const objectiveCount = list(facts.objectives?.value || '').length === 2 ? 2 : 3;
  let contract;
  try {
    contract = getUhpabSectionContract({ sectionKey, componentId, componentLabel: guideline?.title || key,
      projectTitle: facts.topic?.value, projectType: 'proposal', objectiveCount });
  } catch {
    // The shared specific-objective contract needs a parseable topic; other rules remain usable.
    return null;
  }
  const formatOnly = /\b(?:paragraphs?|pages?|words?|font|times new roman|tnr|spacing|ordered list|short bullets)\b|at least 20 in-text citations/i;
  const requirements = [...contract.outputShape, ...(guideline?.requirements || [])]
    .filter(requirement => !formatOnly.test(requirement) && !/general research question may be included/i.test(requirement));
  if (contract.forbidden.length) requirements.push(`Exclude: ${contract.forbidden.filter(item => !formatOnly.test(item)).join('; ')}.`);
  if (['objectives', 'questions'].includes(key)) requirements.push(`Use ${objectiveCount} items; retain the exact health issue, population, age range and setting, in matching order.`);
  return {
    purpose: contract.purpose === 'Draft one UHPAB research section in the selected page only.' && guideline
      ? guideline.description : contract.purpose,
    requirements: [...new Set(requirements)], citationPolicy: sectionCitationPolicy(sectionKey, componentId),
  };
}

// Never split inside a decimal, scholarly abbreviation, bracket or supporting citation.
function sentences(value: string): string[] {
  const result: string[] = [];
  for (const line of value.split('\n').map(compact).filter(Boolean)) {
    let start = 0, depth = 0;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '(' || char === '[') depth++;
      if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
      if (depth || !/[.!?]/.test(char) || (i + 1 < line.length && line[i + 1] !== ' ')) continue;
      const word = line.slice(start, i).match(/([\w.]+)$/)?.[1] || '';
      if (char === '.' && /^(?:al|et|e\.g|i\.e|dr|mr|mrs|ms|prof|fig|no|vs|[A-Z])$/i.test(word)) continue;
      if (/^(?:\([^)]*(?:\b(?:19|20)\d{2}|n\.d\.)[^)]*\)|\[\d+(?:[,-]\s*\d+)*\])/.test(line.slice(i + 1).trimStart())) continue;
      result.push(line.slice(start, i + 1).trim());
      start = i + 1;
    }
    if (line.slice(start).trim()) result.push(line.slice(start).trim());
  }
  return result.map(text => text.replace(/^(?:[-*\u2022]|\d+[.)](?!\d))\s+/, ''))
    .filter(text => !instruction(text) && !marker(text) && !/^\d+(?:\.\d+)*$/.test(text));
}

const gap = /\b(?:gap|paucity|unknown|unclear|overlook\w*|understudied|undocumented|not (?:well )?(?:known|understood|documented)|(?:limited|little|no|insufficient) (?:local )?(?:evidence|research|information|knowledge|data))\b/i;
const ideal = /\bideally\b|\bin an ideal\b|\b(?:should|ought to|expected to)\b/i;
const consequence = /^(?:if\b|therefore\b|thus\b|consequently\b)|\b(?:consequen\w*|not addressed|persists?|study (?:is needed|is necessary|will (?:examine|investigate|assess)))\b/i;
const current = /\b(?:however|despite|currently|uptake|remains?|reported|screening rate|prevalence|low|poor|suboptimal)\b/i;
const benefit = /\b(?:health workers?|nurses?|midwives?|staff|patients?|respondents?|participants?|women|mothers|communities|community|managers?|policy\s?makers?|ministry|institutions?|researchers?|planners?|students?|facilit(?:y|ies))\b/i;
const howBenefit = /\b(?:inform|guide|support|enable|tailor|improve|prioriti[sz]e|plan|develop|identify|understand)\w*\b|\b(?:by|through|use .+ to)\b/i;
const rationale = /\b(?:because|justifi\w*|necessar\w*|needed|need for|chosen|rationale|address\w*|local evidence)\b/i;
const period = /\b(?:19|20)\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\b\d+\s+(?:days|weeks|months|years)\b/i;
function consequenceClause(text: string): string | undefined {
  const split = text.search(/,\s+(?:leading to|resulting in|contributing to)\b/i);
  if (split < 0 || /[()[\]]/.test(text.slice(split))) return undefined;
  const prefix = text.slice(0, split);
  // Only a complete conditional plus main clause may lose an uncited effect adjunct.
  if (!/^If\s+[^,]+,\s+[^,;]+\s+(?:(?:will|would|may|might|can|could)\s+(?:not\s+)?(?:persist|continue|remain|increase|decrease|worsen|improve|affect)\b[^,;]*|(?:persists?|continues?|remains?|increases?|worsens?)\b[^,;]*)$/i.test(prefix)) return undefined;
  return prefix.length <= 239 ? `${prefix}.` : undefined;
}
function idealClause(text: string): string | undefined {
  const split = text.search(/\s+to\s+(?:enable|promote|support|ensure|improve|reduce|prevent|facilitate)\b/i);
  if (split < 0 || /[()[\]]/.test(text.slice(split))) return undefined;
  const prefix = text.slice(0, split).replace(/,$/, '');
  if (!/^Ideally,\s+.+\bshould\s+(?:not\s+)?(?:receive|undergo|access|obtain|provide)\s+.+$/i.test(prefix)) return undefined;
  return prefix.length <= 160 ? `${prefix}.` : undefined;
}
const point = (label: string, candidates: string[]) => {
  const concise = (label === 'Ideal situation' ? candidates.map(idealClause).find(Boolean) : undefined)
    || candidates.filter(text => text.length <= 240).sort((a, b) => a.length - b.length)[0]
    || (label === 'Consequence/study need' ? candidates.map(consequenceClause).find(Boolean) : undefined);
  const scopePrefix = label === 'Content' ? /^(?:content scope|content)\s*:\s*/i
    : label === 'Place' ? /^(?:geographical scope|geographic scope|place|setting)\s*:\s*/i
      : label === 'Period' ? /^(?:time scope|temporal scope|study period|period)\s*:\s*/i : undefined;
  return concise ? `${label}: ${scopePrefix ? concise.replace(scopePrefix, '') : concise}` : candidates.length
    ? `[Review ${label.toLowerCase()} in source notes]` : `[Add ${label.toLowerCase()}]`;
};
const problemLabels = ['Ideal situation', 'Current situation', 'Gap', 'Consequence/study need'];
function problemRole(value: string): number {
  const text = value.replace(/^(?:problem statement|statement of the problem|ideal situation|current situation|gap|consequence(?:\/study need)?|study need)\s*:\s*/i, '');
  return ideal.test(text) && !/^(?:however|despite|if|therefore)\b/i.test(text) ? 0
    : /^(?:if|therefore|thus|consequently)\b/i.test(text) ? 3
      : gap.test(text) ? 2 : consequence.test(text) ? 3 : current.test(text) ? 1 : -1;
}

/** Extractive presentation only. Callers retain the entire raw fact in source notes. */
export function getRuleAwareDefencePoints(key: DefenceFactKey, facts: DefenceFacts): string[] | null {
  if (!['problem', 'background', 'justification', 'contribution', 'scope'].includes(key)) return null;
  const source = body(key, facts[key]?.value || '');
  const items = sentences(source);
  if (key === 'problem') {
    const groups: string[][] = [[], [], [], []];
    for (const item of items) {
      // Assign each whole sentence once; two ideal sentences can never fill current/gap slots.
      const role = problemRole(item);
      if (role >= 0) groups[role].push(item);
    }
    return problemLabels.map((label, i) => point(label, groups[i]));
  }
  if (key === 'background') {
    let setting = '';
    try { setting = parseResearchTopic(facts.topic?.value).setting; } catch { /* No inferred local setting. */ }
    const local = (text: string) => /\b(?:locally|local (?:study|setting|area|evidence)|at the study)\b/i.test(text)
      || (!!setting && comparable(text).includes(comparable(setting)));
    return [point('Wider context', items.filter(text => !gap.test(text) && !local(text) && /\b(?:globally|worldwide|global|international|Africa|regional|Uganda|national)\b/i.test(text))),
      point('Local context', items.filter(text => local(text) && !gap.test(text))), point('Study gap', items.filter(text => gap.test(text)))];
  }
  if (key === 'justification') return [point('Why the study is needed', items.filter(text => (rationale.test(text) || gap.test(text))
    && !(benefit.test(text) && howBenefit.test(text) && !/\b(?:because|needed|necessary|chosen|justified)\b/i.test(text))))];
  if (key === 'contribution') return [point('Who benefits and how', items.filter(text => benefit.test(text) && howBenefit.test(text)
    && !/\b(?:study is (?:needed|necessary)|study is justified)\b/i.test(text)))];
  const scopeItems = sentences(source.replace(/(?:^|\s)(?:\d+(?:\.\d+)*\s+)?((?:content|geographical|geographic|time|temporal) scope)\s*:/gi, '\n$1: '));
  return [point('Content', scopeItems.filter(text => /^(?:content(?: scope)?\s*:)|\b(?:content scope|focus(?:es)? on|examine|investigate|assess|cover)\b/i.test(text))),
    point('Place', scopeItems.filter(text => /^(?:place|setting|geograph(?:ical|ic)(?: scope)?)\s*:|\bgeographical scope\b|\b(?:conducted|carried out|take place|located)\b.*\b(?:at|in)\b/i.test(text))),
    point('Period', scopeItems.filter(text => period.test(text) && /^(?:(?:study )?period|time(?: scope)?|temporal scope)\s*:|\b(?:period|during|between|from|time scope|over|for)\b/i.test(text)))];
}

const hasCitation = (text: string) => /\([^)]*[A-Za-z][^)]*,?\s*(?:19|20)\d{2}[a-z]?[^)]*\)|\b[A-Z][A-Za-z'-]+(?:\s+et al\.?)?\s*\((?:(?:19|20)\d{2}|n\.d\.)\)|\[\d+(?:\s*[,\u2013-]\s*\d+)*\]/.test(text);
const focus = (text: string) => comparable(text).replace(/^to\s+\w+\s+(?:the\s+)?/, '').replace(/^the\s+/, '');
const exactTail = (text: string, topic: ParsedResearchTopic) => comparable(text).endsWith(comparable(`${topic.issue} ${topic.populationAndSetting}`));
const category = (text: string) => focus(text).match(/^(.+?)\s+(?:factors|predictors|determinants|barriers)\b/i)?.[1]?.replace(/[\s-]/g, '');
const constructs = (text: string) => (text.toLowerCase().match(/\b(?:knowledge|attitudes?|practices?)\b/g) || []).map(word => word.replace(/s$/, '')).join(',');

/** Bounded text/formulation checks, not a claim of full semantic or evidence verification. */
export function reviewDefenceRules(facts: DefenceFacts, slides?: DefenceSlide[]): DefenceRuleFinding[] {
  const findings: DefenceRuleFinding[] = [];
  const add = (key: DefenceFactKey, title: string, detail: string, target: 'source' | 'slide' = 'source', suggestion?: string) =>
    findings.push({ key, title, detail, target, ...(suggestion ? { suggestion } : {}) });
  const supplied = (key: DefenceFactKey) => !!facts[key]?.value?.trim() && facts[key].status !== 'missing' && !/^\s*\[(?:add|insert|provide)\b/i.test(facts[key].value);
  for (const key of Object.keys(sections) as DefenceFactKey[]) {
    if (!supplied(key)) continue;
    const path = sections[key]!;
    const policy = sectionCitationPolicy(...path);
    const text = plain(facts[key].value);
    if (policy === 'none' && (hasCitation(text) || /\[citation needed\]/i.test(text)))
      add(key, 'Citation-free section', 'Remove citations and citation-needed markers from this section of the proposal. Keep supporting evidence in the sections that require it.');
    if (policy === 'evidence' && !hasCitation(text))
      add(key, 'Review supporting evidence', 'Check the factual claims against the proposal sources and retain their citations. Add missing supporting evidence before presenting.');
  }
  for (const key of ['problem', 'background', 'justification', 'contribution', 'scope'] as const) {
    if (!supplied(key)) continue;
    const unresolved = getRuleAwareDefencePoints(key, facts)!.filter(marker);
    if (unresolved.length) add(key, 'Review section components', `${unresolved.join('; ')}. Select a concise whole sentence for each component from the proposal notes, or leave its draft marker visible.`);
  }
  let topic: ParsedResearchTopic;
  if (!supplied('topic')) return findings;
  try { topic = parseResearchTopic(plain(facts.topic.value)); }
  catch (error) {
    add('topic', 'Review topic formulation', error instanceof Error ? error.message : String(error));
    return findings;
  }
  if (supplied('aim') && comparable(body('aim', facts.aim.value)) !== comparable(buildGeneralObjective(topic)))
    add('aim', 'Review general objective', 'Use To + a measurable verb + the complete topic, including the exact health issue, population, age range and named setting.', 'source', buildGeneralObjective(topic));
  const objectives = list(facts.objectives?.value || '');
  let validObjectives = false;
  if (supplied('objectives')) {
    if (objectives.length !== 2 && objectives.length !== 3) add('objectives', 'Objective count', `Found ${objectives.length} specific objectives; the shared rules require 2 or 3.`);
    else {
      try {
        const normalized = normalizeSpecificObjectives(objectives.join('\n'), topic, objectives.length);
        validObjectives = objectives.every((item, i) => exactTail(item, topic) && focus(item) === focus(normalized[i]));
        if (!validObjectives) add('objectives', 'Review objective formulation', `Keep each objective's distinct category or topic construct and the exact ending "${topic.issue} ${topic.populationAndSetting}". Check alternative wording against the proposal before using it.`);
      } catch (error) {
        add('objectives', 'Review objective formulation', `${error instanceof Error ? error.message : String(error)} Retain the exact health issue, population, age range and setting without changing the intended categories.`);
      }
    }
  }
  const questions = list(facts.questions?.value || '');
  if (supplied('questions')) {
    let expected: string[] | undefined;
    if (validObjectives) expected = buildResearchQuestions(objectives, topic);
    if (questions.length !== objectives.length || ![2, 3].includes(questions.length)
      || questions.some((item, i) => !exactTail(item, topic) || (expected && comparable(item) !== comparable(expected[i] || ''))))
      add('questions', 'Review question alignment', `Found ${questions.length} questions for ${objectives.length} objectives. Questions must mirror the original objectives one-for-one in the same order, retaining the exact health issue, population, age range, setting and category/construct. Wording alternatives require manual review.`, 'source', expected?.join('\n'));
  }
  if (supplied('scope')) {
    const points = getRuleAwareDefencePoints('scope', facts)!;
    if (!marker(points[0]) && (!comparable(points[0]).includes(comparable(topic.issue)) || !comparable(points[0]).includes(comparable(topic.population))))
      add('scope', 'Review content scope alignment', 'Check that the content scope covers the complete health issue and population, including the age range, stated in the topic.');
    if (!marker(points[1]) && !comparable(points[1]).includes(comparable(topic.setting)))
      add('scope', 'Review place scope alignment', `Check that the geographical scope names the study setting: "${topic.setting}".`);
  }
  for (const slide of slides || []) {
    if (!Array.isArray(slide?.bullets)) continue;
    if (slide.role === 'objectives' && (slide.sourceKeys || []).includes('aim')) {
      const aim = slide.bullets.find(text => /^(?:general objective|aim)\s*:/i.test(text));
      const displayed = aim?.replace(/^(?:general objective|aim)\s*:\s*/i, '');
      if (displayed && !marker(displayed) && (!/^To\s+\w+\b/i.test(displayed)
        || !comparable(displayed).endsWith(comparable(topic.sentence))))
        add('aim', 'Slide general objective changed', `The displayed aim on "${slide.title}" must start with To and retain the complete topic. The shared general objective is "${buildGeneralObjective(topic)}". Shortening approval does not waive these requirements.`, 'slide');
    }
    if (slide.role === 'problem' && (slide.sourceKeys || []).includes('problem')) {
      const covered = new Set<number>();
      for (const bullet of slide.bullets) {
        const text = compact(plain(bullet));
        if (marker(text)) {
          // An explicit draft role is disclosed, not silently replaced by another claim.
          if (/\[(?:add|review)\s+(?:full |long )?(?:problem statement|problem)(?:\s|\])/i.test(text)) {
            problemLabels.forEach((_, i) => covered.add(i));
          } else {
            const role = /ideal/i.test(text) ? 0 : /current/i.test(text) ? 1 : /gap/i.test(text) ? 2 : /consequence|study need/i.test(text) ? 3 : -1;
            if (role >= 0) covered.add(role);
          }
          continue;
        }
        for (const sentence of sentences(text)) {
          const role = problemRole(sentence);
          if (role >= 0) covered.add(role);
        }
      }
      const absent = problemLabels.filter((_, i) => !covered.has(i));
      if (absent.length) add('problem', 'Slide problem components missing', `Add ${absent.join(', ').toLowerCase()} from the proposal notes to "${slide.title}", or show an [Add ...] or [Review ...] marker for each missing component. Two ideal sentences do not replace the other components.`, 'slide');
    }
    for (const key of ['objectives', 'questions'] as const) {
      if (slide.role !== (key === 'objectives' ? 'objectives' : 'questions-scope')) continue;
      if (!(slide.sourceKeys || []).includes(key)) continue;
      const originals = key === 'objectives' ? objectives : questions;
      const entries = slide.bullets.map(text => compact(plain(text)))
        .filter(text => !marker(text) && !/^(?:general objective|aim|(?:study )?scope|content|place|(?:study )?period|geographical scope|time scope)\s*:/i.test(text)
          && comparable(text) !== comparable(body('aim', facts.aim?.value || '')))
        .map(text => text.replace(/^(?:specific objectives?|research questions?)\s*:\s*/i, '').replace(/^\d+[.)]\s+/, ''));
      if (!entries.length || entries.every(marker)) continue;
      if (originals.length && entries.length !== originals.length)
        add(key, 'Slide item count changed', `Slide "${slide.title}" has ${entries.length} ${key} for ${originals.length} source items. Approval to shorten cannot remove or add objectives/questions.`, 'slide');
      entries.forEach((entry, i) => {
        if (marker(entry)) return;
        if (!exactTail(entry, topic)) add(key, 'Slide loses exact topic details', `Item ${i + 1} on "${slide.title}" must retain "${topic.issue} ${topic.populationAndSetting}". Shortening approval does not waive the health issue, population, age or setting.`, 'slide');
        const original = objectives[i];
        if (!original) return;
        const originalCategory = category(original), displayedCategory = category(entry.replace(/^what\s+(?:are|is)\s+(?:the\s+)?/i, '').replace(/^what\s+(?:the\s+)?/i, ''));
        if ((originalCategory && displayedCategory !== originalCategory)
          || (['kap', 'knowledge'].includes(topic.approach) && constructs(entry) !== constructs(original)))
          add(key, 'Slide category or construct changed', `Item ${i + 1} on "${slide.title}" must preserve the same source objective category/construct and order. Shortening approval cannot reassign a focus.`, 'slide');
      });
    }
  }
  return findings;
}
