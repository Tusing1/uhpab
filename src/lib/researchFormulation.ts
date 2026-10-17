export type ObjectiveCount = 2 | 3;
export type ResearchApproach = 'factors' | 'predictors' | 'determinants' | 'barriers' | 'kap' | 'knowledge' | 'prevalenceFactors' | 'prevalence' | 'utilization';

export class ResearchFormulationError extends Error {}

const approaches: Array<[ResearchApproach, RegExp, string, string]> = [
  ['prevalenceFactors', /^prevalence and factors associated with\s+/i, 'factors', 'associated with'],
  ['kap', /^knowledge,?\s+attitudes?\s+and practices?\s+(?:towards|of|on)\s+/i, '', ''],
  ['knowledge', /^knowledge and attitudes?\s+(?:towards|of|on)\s+/i, '', ''],
  ['factors', /^factors\s+(associated with|influencing|affecting)\s+/i, 'factors', 'associated with'],
  ['predictors', /^predictors of\s+/i, 'predictors', 'of'],
  ['determinants', /^determinants of\s+/i, 'determinants', 'of'],
  ['barriers', /^barriers to\s+/i, 'barriers', 'to'],
  ['prevalence', /^prevalence of\s+/i, '', ''],
  ['utilization', /^(?:utilization of|level of)\s+/i, '', ''],
];

const clean = (text = '') => text.replace(/\s+/g, ' ').trim().replace(/[.?!]+$/, '');
const sentenceText = (text: string) => text.toLowerCase()
  .replace(/\b(hiv|aids|tb|art|anc|pmtct|hc|iii|iv)\b/gi, value => value.toUpperCase());

export const hasSpecificStudySetting = (value: string) => {
  const place = clean(value).replace(/^(?:at|in|from)\s+/i, '');
  const generic = /^(?:uganda|the study area|selected (?:hospital|facility|community)|a hospital|hospital|health cent(?:re|er)(?:\s+(?:iii|iv|3|4))?|village|parish|district)$/i;
  return !generic.test(place)
    && /\b(?:hospital|hc\s*(?:iii|iv|3|4)|health cent(?:re|er)|clinic|village|parish|school|college|university|ward|community|settlement|division)\b/i.test(place)
    && place.split(/\s+/).length >= 2;
};

export interface ParsedResearchTopic {
  title: string;
  sentence: string;
  approach: ResearchApproach;
  issue: string;
  population: string;
  setting: string;
  populationAndSetting: string;
  noun: string;
  relationship: string;
}

export const parseResearchTopic = (value = ''): ParsedResearchTopic => {
  const title = clean(value);
  const spec = approaches.find(([, pattern]) => pattern.test(title));
  if (!spec) throw new ResearchFormulationError('Use a supported topic approach, such as factors, predictors, barriers, prevalence, or knowledge, attitude and practices.');
  const [approach, prefix, noun, defaultRelationship] = spec;
  const remainder = sentenceText(title.replace(prefix, ''));
  // Prefer "among" so an "in" inside the health issue cannot truncate it.
  const populationIndex = remainder.search(/\bamong\s+/i);
  const boundary = populationIndex >= 0 ? populationIndex : remainder.search(/\bin\s+/i);
  if (boundary < 1) throw new ResearchFormulationError('Add a specific respondent group and named study setting to the topic before generating objectives.');
  const issue = remainder.slice(0, boundary).trim();
  const populationAndSetting = remainder.slice(boundary).trim();
  const withoutConnector = populationAndSetting.replace(/^(?:among|in)\s+/i, '');
  const settingBoundary = withoutConnector.search(/\s+(?:at|in|from)\s+/i);
  if (settingBoundary < 1) throw new ResearchFormulationError('Add the named village, health facility, or other specific study setting after the respondent group.');
  const population = withoutConnector.slice(0, settingBoundary).trim();
  const setting = withoutConnector.slice(settingBoundary).replace(/^\s*(?:at|in|from)\s+/i, '');
  if (/^(?:people|respondents|participants|the population|selected respondents)$/i.test(population)) {
    throw new ResearchFormulationError('Replace the broad respondent group with the actual population, including an age range when known.');
  }
  if (!hasSpecificStudySetting(setting)) throw new ResearchFormulationError('Use a named village, health centre, hospital, or other specific setting; Uganda or a district alone is too broad.');
  const relationship = approach === 'factors' ? (title.match(prefix)?.[1] || defaultRelationship).toLowerCase() : defaultRelationship;
  return { title: title.toUpperCase(), sentence: sentenceText(title), approach, issue, population, setting, populationAndSetting, noun, relationship };
};

export const readResearchList = (value = '') => {
  const htmlItems = [...value.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(match => match[1]);
  return (htmlItems.length ? htmlItems : value.replace(/<\/(?:p|div)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').split(/\n+/))
    .map(item => item.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\*\*/g, '').replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
    .filter(item => item && !/^(?:```(?:html)?|specific objectives?:?|research questions?:?)$/i.test(item));
};

export const formulationListHtml = (items: string[]) => `<ol>${items.map(item => `<li>${item.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`).join('')}</ol>`;

export const buildGeneralObjective = (topic: ParsedResearchTopic) => {
  const verb = topic.approach === 'kap' || topic.approach === 'knowledge' ? 'assess' : 'determine';
  return `To ${verb} the ${topic.sentence}.`;
};

const measurableVerbs = 'identify|assess|explore|determine|establish|examine|evaluate|investigate|measure|estimate|describe';
const categoryPattern = /^(?:socio-demographic|sociodemographic|socio-economic|socioeconomic|individual(?:-related)?|patient(?:-related)?|respondent(?:-related)?|health facility(?:-related)?|health-facility(?:-related)?|health worker(?:-related)?|health-worker(?:-related)?|environmental|economic|behavio(?:u)?ral|socio-cultural|sociocultural|knowledge(?:-related|-based)?|practice(?:-related)?|occupational|community(?:-related)?|institutional|service(?:-related)?)(?: and (?:economic|environmental|behavio(?:u)?ral))?$/i;

const fixedFocusObjectives = (topic: ParsedResearchTopic, count: ObjectiveCount) => {
  const tail = `${topic.issue} ${topic.populationAndSetting}`;
  if (topic.approach === 'kap' && count === 2) return [
    `To assess the knowledge and attitude towards ${tail}.`,
    `To identify the practices towards ${tail}.`,
  ];
  return [
    `To determine the level of knowledge towards ${tail}.`,
    `To establish the attitude towards ${tail}.`,
    ...(topic.approach === 'kap' ? [`To identify the practices towards ${tail}.`] : []),
  ];
};

export const normalizeSpecificObjectives = (value: string, topic: ParsedResearchTopic, count: ObjectiveCount = 3) => {
  const items = readResearchList(value);
  if (topic.approach === 'kap' || topic.approach === 'knowledge') {
    const objectives = fixedFocusObjectives(topic, count);
    if (count !== objectives.length) throw new ResearchFormulationError(`This topic measures ${objectives.length} constructs. Use ${objectives.length} objectives or update the topic so its constructs match the chosen count.`);
    return objectives;
  }
  if (items.length !== count) throw new ResearchFormulationError(`Expected exactly ${count} specific objectives. Please generate again or edit the objectives.`);
  const categories = new Set<string>();
  let prevalenceCount = 0;
  const normalized = items.map(item => {
    const action = item.match(new RegExp(`^To (${measurableVerbs})\\s+(?:the\\s+)?`, 'i'));
    if (!action) throw new ResearchFormulationError('Each objective must start with To and a measurable action verb.');
    const focus = item.slice(action[0].length);
    if (topic.approach === 'prevalenceFactors' && /^prevalence\b/i.test(focus)) {
      prevalenceCount++;
      return `To determine the prevalence of ${topic.issue} ${topic.populationAndSetting}.`;
    }
    if (topic.noun) {
      const category = focus.match(/^(.+?)\s+(?:factors|predictors|determinants|barriers)\b/i)?.[1]?.toLowerCase();
      if (!category || !categoryPattern.test(category)) throw new ResearchFormulationError('Use a clear factor category, such as socio-demographic, patient-related, or health facility-related.');
      const key = category.replace(/[\s-]/g, '');
      if (categories.has(key)) throw new ResearchFormulationError('Specific objectives must use distinct categories rather than repeating the same focus.');
      categories.add(key);
      return `To ${action[1].toLowerCase()} the ${category} ${topic.noun} ${topic.relationship} ${topic.issue} ${topic.populationAndSetting}.`;
    }
    // Other descriptive approaches must already state the exact outcome and tail.
    const canonical = clean(item);
    if (!canonical.toLowerCase().endsWith(`${topic.issue} ${topic.populationAndSetting}`.toLowerCase())) {
      throw new ResearchFormulationError('Each objective must retain the exact health issue, respondent group, and study setting from the topic.');
    }
    return `${canonical}.`;
  });
  if (topic.approach === 'prevalenceFactors' && prevalenceCount !== 1) throw new ResearchFormulationError('Include exactly one prevalence objective, followed by objectives on associated factor categories.');
  if (new Set(normalized.map(item => item.toLowerCase())).size !== normalized.length) throw new ResearchFormulationError('Each specific objective must have a distinct measurable focus.');
  return normalized;
};

export const buildResearchQuestions = (objectives: string[], topic: ParsedResearchTopic) => objectives.map(objective => {
  const action = objective.match(new RegExp(`^To (${measurableVerbs})\\s+`, 'i'));
  if (!action) throw new ResearchFormulationError('Save measurable specific objectives before generating research questions.');
  const focus = clean(objective.slice(action[0].length)).replace(/^the\s+/i, '');
  if (!focus.toLowerCase().endsWith(topic.populationAndSetting.toLowerCase())) throw new ResearchFormulationError('The saved objectives do not all use the topic population and setting. Correct them before generating questions.');
  const plural = /^(?:.*\b(?:factors|predictors|determinants|barriers)\b|practices\b|knowledge and attitude\b)/i.test(focus);
  return `What ${plural ? 'are' : 'is'} the ${focus}?`;
});

export const buildFormulationRules = (topic: ParsedResearchTopic, count: ObjectiveCount) => `Act as a strict research methodology examiner supporting nurses, midwives and allied health students. Use precise, measurable wording, without creative additions or promises of marks.
Topic: ${topic.title}
General objective: ${buildGeneralObjective(topic)}
Health issue (retain verbatim): ${topic.issue}
Population and setting (repeat verbatim at the end of EVERY objective and question): ${topic.populationAndSetting}
Exactly ${count} specific objectives. Start each with To identify, To assess, To explore, To determine, To establish, or To examine.
After the action verb put the specific category FIRST, then ${topic.noun ? `the topic's exact relationship: ${topic.noun} ${topic.relationship} ${topic.issue}` : 'the measurable construct from the topic'}.
For factors/predictors/determinants/barriers, use distinct categories suitable for the actual population: socio-demographic, patient-related/individual, health facility-related/environmental, socio-economic or behavioural. Do not force clinical categories onto a community or occupational study. Do not add intervention recommendations as an objective.
For KAP, use knowledge, attitude and practices in that order, exactly one objective each by default. If two are explicitly selected, combine knowledge and attitude in objective one, then practices in objective two. Knowledge-and-attitude-only topics have two constructs, not three.
For prevalence and associated factors, put prevalence first, then factor categories.
Questions must mirror the saved specific objectives one-for-one, in the same order; do not invent new variables, populations, ages, places or time periods. No citations, headings or explanations.`;
