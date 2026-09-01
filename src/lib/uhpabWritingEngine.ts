export type UhpabWritingAction =
  | 'draft'
  | 'draftWithBackground'
  | 'improve'
  | 'academic'
  | 'shorten'
  | 'uhpab'
  | 'humanize'
  | 'interpret';

export interface UhpabSectionGuidelines {
  title?: string;
  requirements?: string[];
  formatting?: string;
}

export interface UhpabWritingContext {
  projectTitle?: string;
  projectType?: 'proposal' | 'report' | string;
  sectionKey: string;
  componentId: string;
  componentLabel: string;
  guidelines?: UhpabSectionGuidelines | null;
  currentDraft?: string;
  knownSources?: Array<{
    citationText?: string;
    apaReference?: string;
    title?: string;
    authors?: string;
    organization?: string;
    year?: string;
  }>;
}

export interface UhpabSectionContract {
  mode: 'deterministic' | 'generative';
  purpose: string;
  outputShape: string[];
  evidenceUse?: string;
  maxWords?: number;
  maxParagraphs?: number;
  listItems?: { min: number; max: number };
  preferredFormat?: 'paragraphs' | 'orderedList' | 'singleParagraph';
  allowedHtml: string[];
  forbidden: string[];
  fallback: (context: UhpabWritingContext) => string;
}

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const stripHtmlWithBreaks = (html = '') =>
  html
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/(h[1-6]|p|div|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/td>\s*<td[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const stripHtml = (html = '') =>
  stripHtmlWithBreaks(html).replace(/\s+/g, ' ').trim();

const generatedTextToParagraphHtml = (value = '') => {
  const text = stripHtmlWithBreaks(value)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*/g, '')
    .replace(/\r/g, '')
    .trim();

  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
};

const generatedTextToOrderedListHtml = (value = '', maxItems = 3) => {
  const items = stripHtmlWithBreaks(value)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*/g, '')
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .replace(/^<li>|<\/li>$/gi, '')
        .trim()
    )
    .filter(Boolean)
    .filter((line) => !/^<?ol>?|<\/?ol>?$/i.test(line))
    .slice(0, maxItems);

  return items.length
    ? `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`
    : '';
};

const normalizeObjectiveItems = (value = '', context: UhpabWritingContext) => {
  const continuation = getObjectiveContinuation(context.projectTitle);
  const items = stripHtmlWithBreaks(value)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*/g, '')
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .replace(/^<li>|<\/li>$/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)
    .filter((line) => !/^<?ol>?|<\/?ol>?$/i.test(line))
    .filter((line) => !/^specific objectives?$/i.test(line))
    .slice(0, 3)
    .map((line) => {
      const withoutEndPunctuation = line.replace(/[.?!]+$/, '');
      const startsWithTo = /^to\s+/i.test(withoutEndPunctuation);
      const objective = startsWithTo ? withoutEndPunctuation : `To ${withoutEndPunctuation.charAt(0).toLowerCase()}${withoutEndPunctuation.slice(1)}`;
      if (objective.toLowerCase().includes(continuation.toLowerCase())) {
        return `${objective}.`;
      }
      const beforePopulation = objective.replace(/\b(among|in|at)\b[\s\S]*$/i, '').trim();
      return `${beforePopulation} ${continuation}.`.replace(/\s+/g, ' ');
    });

  return items.length
    ? `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`
    : '';
};

const limitWords = (value = '', maxWords: number) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value.trim();
  return `${words.slice(0, maxWords).join(' ').replace(/[,:;]$/, '')}.`;
};

const getCleanProjectTitle = (projectTitle?: string) =>
  (projectTitle || 'the proposed study').trim().replace(/\s+/g, ' ');

const getTopicReference = (projectTitle?: string) => {
  const title = getCleanProjectTitle(projectTitle);
  return title === 'the proposed study' ? title : `the study titled "${title}"`;
};

const getObjectiveContinuation = (projectTitle?: string) => {
  const title = getCleanProjectTitle(projectTitle).toLowerCase();
  const amongIndex = title.search(/\b(among|in|at)\b/i);
  if (amongIndex >= 0) return title.slice(amongIndex).trim().replace(/[.]+$/, '');
  return 'among the selected respondents in the study area';
};

export const getChapterOneIntroductionHtml = () =>
  '<p>This chapter presents the background to the study, statement of the problem, purpose of the study, specific objectives, research questions, justification, significance, and scope of the study.</p>';

const getBackgroundStarterHtml = (context: UhpabWritingContext) => {
  const title = getCleanProjectTitle(context.projectTitle);
  const topicReference = getTopicReference(context.projectTitle);

  return [
    `<p>Globally, ${title.toLowerCase()} should be introduced by showing why the issue matters to health outcomes, service delivery, patients, families, or communities. Add one recent source to support the wider importance of the problem [citation needed].</p>`,
    '<p>In Africa or the East African region, explain how the problem appears in settings similar to Uganda. Focus on common patterns, affected groups, and health-service challenges without turning this section into a full literature review [citation needed].</p>',
    '<p>In Uganda, describe what is known about the problem and how it affects the target population, health workers, training institutions, or service use. Use national guidance, a recent study, or an official report where available [citation needed].</p>',
    '<p>At the selected study area, explain the local situation using clinic records, school experience, supervisor guidance, or observed service gaps where available [verify local statistic].</p>',
    `<p>Therefore, this study focuses on ${topicReference} in order to provide evidence that can guide health education, service improvement, and future research in the study area.</p>`
  ].join('');
};

const getProblemStatementStarterHtml = (context: UhpabWritingContext) => {
  const topicReference = getTopicReference(context.projectTitle);
  return [
    '<p>Ideally, the target population should receive appropriate health information, services, and support needed to prevent or reduce the problem under study.</p>',
    '<p>However, the current situation in the selected study area suggests that the problem is still affecting the target population [verify local statistic]. Evidence from recent literature should be used to show the nature and magnitude of the problem [citation needed].</p>',
    `<p>If this problem is not addressed, it may continue to affect health outcomes, service use, and quality of care. Therefore, this study will examine ${topicReference} to generate information that can guide practical interventions.</p>`
  ].join('');
};

const getResearchObjectivesIntroHtml = () =>
  '<p>The objectives of the study are organized into one general objective and specific objectives that guide data collection and analysis.</p>';

const getGeneralObjectiveStarterHtml = (context: UhpabWritingContext) =>
  `<p>The general objective of this study is to determine ${getTopicReference(context.projectTitle)}.</p>`;

const getSpecificObjectivesStarterHtml = () =>
  '<ol><li>To determine the level of the main outcome among the selected respondents in the study area.</li><li>To identify the socio-economic factors associated with the main outcome among the selected respondents in the study area.</li><li>To establish possible ways of improving the main outcome among the selected respondents in the study area.</li></ol>';

const getResearchQuestionsStarterHtml = () =>
  '<ol><li>What is the level of the main outcome among the selected respondents?</li><li>What factors are associated with the main outcome among the selected respondents?</li><li>What can be done to improve the main outcome in the study area?</li></ol>';

const getJustificationStarterHtml = (context: UhpabWritingContext) =>
  `<p>This study is justified because ${getTopicReference(context.projectTitle)} addresses a health problem that requires clearer local evidence. The findings may help explain the gap, support better health education, and guide service improvement in the study area.</p>`;

const getSignificanceStarterHtml = () =>
  '<p>The findings may benefit respondents by identifying gaps that affect their health outcomes and service use. They may also benefit health workers by guiding health education and care practices. The study may support the training institution, supervisors, and future researchers by providing organized local evidence for further work.</p>';

const getScopeStarterHtml = (context: UhpabWritingContext) =>
  `<p>The content scope of this study will focus on ${getTopicReference(context.projectTitle)}. The geographical scope will be the selected study area [insert study area]. The time scope will cover the approved study period [insert month and year].</p>`;

const getChapterIntroductionHtml = (context: UhpabWritingContext) => {
  const isReport = context.projectType === 'report';
  const chapterIntroFallbacks: Record<string, string> = {
    chapter2: '<p>This chapter presents the review of literature related to the study objectives. The review is arranged thematically according to the major variables and gaps identified in previous studies.</p>',
    chapter3: isReport
      ? '<p>This chapter presents the methodology that was used to conduct the study. It includes the study design, setting, population, sampling, data collection, data management, quality control, ethical considerations, limitations, and dissemination plan.</p>'
      : '<p>This chapter presents the methodology that will be used to conduct the study. It includes the study design, setting, population, sampling, data collection, data management, quality control, ethical considerations, limitations, and dissemination plan.</p>',
    chapter4: '<p>This chapter presents the findings of the study. The results are arranged according to respondent characteristics and the specific objectives, using tables, figures, pictures, and brief explanatory text where appropriate.</p>',
    chapter5: '<p>This chapter presents the discussion of findings, conclusions, recommendations, and implications to health profession practice. The discussion follows the study objectives and relates the findings to reviewed literature.</p>',
  };

  return chapterIntroFallbacks[context.sectionKey] || getGenericStarterHtml(context);
};

const getGenericStarterHtml = (context: UhpabWritingContext) => {
  const topicReference = getTopicReference(context.projectTitle);
  const sectionName = context.componentLabel || 'this section';
  const requirements = context.guidelines?.requirements?.slice(0, 4) || [];
  const requirementHtml = requirements.length
    ? `<p><strong>Before submission, make sure this section covers:</strong></p><ul>${requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';

  const templates: Record<string, string> = {
    statementOfProblem: getProblemStatementStarterHtml(context),
    researchObjectives: getResearchObjectivesIntroHtml(),
    generalObjective: getGeneralObjectiveStarterHtml(context),
    specificObjectives: getSpecificObjectivesStarterHtml(),
    researchQuestions: getResearchQuestionsStarterHtml(),
    justification: getJustificationStarterHtml(context),
    significance: getSignificanceStarterHtml(),
    scope: getScopeStarterHtml(context),
    studyDesign: '<p>This study will use a descriptive cross-sectional design because data will be collected from respondents at one point in time. The design is suitable for describing the study variables and identifying patterns related to the research objectives.</p>',
    studySetting: '<p>The study will be conducted at the selected study area. This setting is appropriate because it provides access to the target respondents and relates directly to the research problem.</p>',
    studyPopulation: '<p>The study population will include respondents who meet the inclusion criteria and are available during the data collection period. The population should be clearly described according to age, service area, role, or other relevant characteristics.</p>',
    sampleSize: '<p>The sample size will be determined using an appropriate method approved by the supervisor. The calculation or justification should match the study design, population size, and available data collection period.</p>',
    samplingMethod: '<p>The sampling method will be selected based on the available population and study objectives. The method should explain how respondents will be identified, approached, and included in the study.</p>',
    ethicalConsiderations: '<p>Ethical approval and permission will be obtained before data collection. Respondents will be informed about the purpose of the study, voluntary participation, confidentiality, and their right to withdraw at any time.</p>',
  };

  const sectionTemplate =
    context.sectionKey === 'chapter4' && context.componentId === 'introduction'
      ? `<p>This chapter presents the findings of ${topicReference}. The results should be arranged according to the study objectives and supported by clear tables, figures, percentages, and brief explanatory text.</p>`
      : context.sectionKey === 'chapter4' && context.componentId === 'demographicCharacteristics'
        ? '<p>This section presents the demographic characteristics of the respondents. Include relevant variables such as age, sex, education level, marital status, occupation, or other approved characteristics. Present the results in a table or figure, then briefly describe the main pattern without discussing the meaning.</p>'
        : context.sectionKey === 'chapter4' && context.componentId === 'objectiveFindings'
          ? '<p>This section presents findings according to the specific study objectives. For each objective, include a clear heading, a table or figure where appropriate, and a short narrative explaining the key percentages or responses. Do not discuss the findings here; reserve interpretation for Chapter Five.</p>'
          : context.sectionKey === 'chapter5' && context.componentId === 'introduction'
            ? `<p>This chapter presents the discussion, recommendations, conclusions, and implications to health profession practice for ${topicReference}. The discussion should follow the study objectives and compare the findings with studies reviewed in Chapter Two.</p>`
            : context.sectionKey === 'chapter5' && context.componentId === 'discussionOfFindings'
              ? '<p>The discussion should interpret the major findings according to each study objective. Compare the findings with previous studies reviewed in the literature, explain similarities or differences, and show what the findings mean for health practice.</p>'
              : context.sectionKey === 'chapter5' && context.componentId === 'recommendations'
                ? '<p>The recommendations should be based directly on the study findings. Organize them for relevant groups such as the health facility, health workers, training institution, community, policy makers, or future researchers where applicable.</p>'
                : context.sectionKey === 'chapter5' && context.componentId === 'conclusions'
                  ? '<p>The conclusion should briefly summarize the main findings of the study in relation to the objectives. Avoid introducing new data, and keep the conclusion focused on what the study found.</p>'
                  : context.sectionKey === 'chapter5' && context.componentId === 'implicationsToNursingPractice'
                    ? '<p>This section should explain how the findings can improve health profession practice. State practical actions, service improvements, health education needs, or supervision changes that follow from the findings.</p>'
                    : templates[context.componentId] || `<p>This section should explain ${sectionName.toLowerCase()} for ${topicReference}. Write directly, keep the wording academic, and only add facts that you can support with evidence.</p>`;

  const shouldHideChecklist = context.sectionKey === 'chapter1' && ['introduction', 'background'].includes(context.componentId);
  return [sectionTemplate, requirementHtml && !shouldHideChecklist ? requirementHtml : ''].filter(Boolean).join('');
};

const sectionContracts: Record<string, UhpabSectionContract> = {
  'chapter1.introduction': {
    mode: 'deterministic',
    purpose: 'A brief preview paragraph for Chapter One.',
    outputShape: ['one paragraph', '25-45 words', 'preview only'],
    maxWords: 45,
    maxParagraphs: 1,
    allowedHtml: ['p'],
    forbidden: ['citations', 'statistics', 'definitions', 'detailed background', 'topic explanation'],
    fallback: () => getChapterOneIntroductionHtml(),
  },
  'chapter2.introduction': {
    mode: 'deterministic',
    purpose: 'A brief preview paragraph for Chapter Two.',
    outputShape: ['one paragraph', 'chapter preview only'],
    maxWords: 45,
    maxParagraphs: 1,
    allowedHtml: ['p'],
    forbidden: ['citations', 'statistics', 'detailed literature review'],
    fallback: getChapterIntroductionHtml,
  },
  'chapter3.introduction': {
    mode: 'deterministic',
    purpose: 'A brief preview paragraph for Chapter Three.',
    outputShape: ['one paragraph', 'methodology preview only'],
    maxWords: 55,
    maxParagraphs: 1,
    allowedHtml: ['p'],
    forbidden: ['detailed methodology', 'sample-size calculations', 'extra headings'],
    fallback: getChapterIntroductionHtml,
  },
  'chapter4.introduction': {
    mode: 'deterministic',
    purpose: 'A brief preview paragraph for Chapter Four.',
    outputShape: ['one paragraph', 'findings preview only'],
    maxWords: 55,
    maxParagraphs: 1,
    allowedHtml: ['p'],
    forbidden: ['discussion', 'recommendations', 'invented results'],
    fallback: getChapterIntroductionHtml,
  },
  'chapter5.introduction': {
    mode: 'deterministic',
    purpose: 'A brief preview paragraph for Chapter Five.',
    outputShape: ['one paragraph', 'discussion chapter preview only'],
    maxWords: 55,
    maxParagraphs: 1,
    allowedHtml: ['p'],
    forbidden: ['new findings', 'recommendations list', 'conclusions list'],
    fallback: getChapterIntroductionHtml,
  },
  'chapter1.background': {
    mode: 'generative',
    purpose: 'Build the study context from the wider problem to the local study gap.',
    outputShape: ['4-6 paragraphs', 'global to local flow', 'end with the local gap/rationale'],
    evidenceUse: 'Use recent evidence where needed, but write [citation needed] or [verify local statistic] unless a real source is already known.',
    maxWords: 550,
    maxParagraphs: 6,
    preferredFormat: 'paragraphs',
    allowedHtml: ['p'],
    forbidden: ['literature review depth', 'invented sources', 'invented statistics', 'extra section headings'],
    fallback: getBackgroundStarterHtml,
  },
  'chapter1.statementOfProblem': {
    mode: 'generative',
    purpose: 'State the ideal situation, current situation, gap, and consequences of the problem.',
    outputShape: ['3 concise paragraphs', 'ideal situation', 'current situation and magnitude', 'gap/consequences and study need'],
    evidenceUse: 'Use brief citations/statistics only where real sources are known; otherwise use [citation needed] and [verify local statistic].',
    maxWords: 260,
    maxParagraphs: 3,
    preferredFormat: 'paragraphs',
    allowedHtml: ['p'],
    forbidden: ['literature review', 'recommendations', 'objectives list', 'invented statistics', 'extra headings'],
    fallback: getProblemStatementStarterHtml,
  },
  'chapter1.researchObjectives': {
    mode: 'deterministic',
    purpose: 'Introduce the objectives subsection only.',
    outputShape: ['one short paragraph', 'transition to general and specific objectives'],
    maxWords: 35,
    maxParagraphs: 1,
    preferredFormat: 'singleParagraph',
    allowedHtml: ['p'],
    forbidden: ['actual objective list', 'research questions', 'citations'],
    fallback: () => getResearchObjectivesIntroHtml(),
  },
  'chapter1.generalObjective': {
    mode: 'generative',
    purpose: 'Write one broad objective that matches the topic.',
    outputShape: ['one sentence only', 'starts with an action verb', 'includes variables, population, and study area when known'],
    maxWords: 40,
    maxParagraphs: 1,
    preferredFormat: 'singleParagraph',
    allowedHtml: ['p'],
    forbidden: ['more than one objective', 'citations', 'background explanation', 'numbered list'],
    fallback: getGeneralObjectiveStarterHtml,
  },
  'chapter1.specificObjectives': {
    mode: 'generative',
    purpose: 'Break the general objective into measurable SMART objectives.',
    outputShape: ['ordered list', '2-3 items', 'each item follows: To [action verb] [specific variable/factor/focus] [same topic continuation]'],
    listItems: { min: 2, max: 3 },
    preferredFormat: 'orderedList',
    allowedHtml: ['ol', 'li'],
    forbidden: ['paragraph essay', 'research questions', 'citations', 'more than three objectives', 'different population/place endings between items'],
    fallback: () => getSpecificObjectivesStarterHtml(),
  },
  'chapter1.researchQuestions': {
    mode: 'generative',
    purpose: 'Convert the specific objectives into matching answerable research questions.',
    outputShape: ['ordered list', '2-3 question items', 'each question mirrors one specific objective'],
    listItems: { min: 2, max: 3 },
    preferredFormat: 'orderedList',
    allowedHtml: ['ol', 'li'],
    forbidden: ['paragraph essay', 'objectives wording starting with To', 'citations', 'more than three questions'],
    fallback: () => getResearchQuestionsStarterHtml(),
  },
  'chapter1.justification': {
    mode: 'generative',
    purpose: 'Explain why the study is necessary now and why the topic was chosen.',
    outputShape: ['1-2 concise paragraphs', 'rationale', 'link to the local problem or knowledge gap'],
    evidenceUse: 'Use [citation needed] only for factual claims that require evidence.',
    maxWords: 160,
    maxParagraphs: 2,
    preferredFormat: 'paragraphs',
    allowedHtml: ['p'],
    forbidden: ['beneficiary list', 'recommendations', 'broad literature review', 'invented statistics'],
    fallback: getJustificationStarterHtml,
  },
  'chapter1.significance': {
    mode: 'generative',
    purpose: 'Explain who may benefit from the study and how.',
    outputShape: ['one concise paragraph or short bullets', 'name beneficiaries', 'explain practical or academic contribution'],
    maxWords: 180,
    maxParagraphs: 2,
    preferredFormat: 'paragraphs',
    allowedHtml: ['p', 'ul', 'li'],
    forbidden: ['justification only', 'new objectives', 'invented promises', 'long essay'],
    fallback: () => getSignificanceStarterHtml(),
  },
  'chapter1.scope': {
    mode: 'generative',
    purpose: 'Define the boundaries of the study.',
    outputShape: ['one paragraph', 'content scope', 'geographical scope', 'time scope'],
    maxWords: 110,
    maxParagraphs: 1,
    preferredFormat: 'singleParagraph',
    allowedHtml: ['p'],
    forbidden: ['background explanation', 'objectives list', 'citations', 'methodology details'],
    fallback: getScopeStarterHtml,
  },
};

const defaultContract: UhpabSectionContract = {
  mode: 'generative',
  purpose: 'Draft one UHPAB research section in the selected page only.',
  outputShape: ['section body only', 'concise academic paragraphs or lists where required'],
  allowedHtml: ['p', 'ol', 'ul', 'li'],
  forbidden: ['chapter title', 'section heading', 'notes', 'explanations', 'summaries', 'markdown'],
  fallback: getGenericStarterHtml,
};

export const getUhpabSectionContract = (context: UhpabWritingContext) =>
  sectionContracts[`${context.sectionKey}.${context.componentId}`] || defaultContract;

export const getUhpabLocalStarterDraft = (context: UhpabWritingContext) =>
  getUhpabSectionContract(context).fallback(context);

const actionInstructions: Record<UhpabWritingAction, string> = {
  draft: 'Draft this section from scratch using the project title and UHPAB requirements.',
  draftWithBackground: 'Draft both 1.0 Introduction and 1.1 Background to the Study as connected sections.',
  improve: 'Improve clarity, flow, and academic quality while preserving the student meaning.',
  academic: 'Rewrite in formal academic language suitable for a UHPAB research submission.',
  shorten: 'Shorten the content while keeping the required points and citations.',
  uhpab: 'Check against UHPAB requirements and return a corrected version, not a commentary.',
  humanize: 'Remove generic generated-writing patterns while preserving meaning.',
  interpret: 'Write a concise Chapter Four interpretation of the presented result in academic style.',
};

export const buildUhpabGenerationPrompt = (context: UhpabWritingContext, action: UhpabWritingAction) => {
  const contract = getUhpabSectionContract(context);
  const requirements = context.guidelines?.requirements || [];
  const formatting = context.guidelines?.formatting || '';
  const title = getCleanProjectTitle(context.projectTitle);
  const objectiveContinuation = getObjectiveContinuation(context.projectTitle);
  const knownCitationList = (context.knownSources || [])
    .map((source) => {
      const citation = source.citationText || [source.authors || source.organization, source.year].filter(Boolean).join(', ');
      const label = source.apaReference || source.title || '';
      return citation ? `- ${citation}${label ? `: ${label}` : ''}` : '';
    })
    .filter(Boolean)
    .join('\n');

  return `You are UHPAB Study's Advanced Researcher.

Project:
- Type: ${context.projectType || 'Research Proposal'}
- Title: ${title}

Selected section:
- ${context.componentLabel}

Task:
- ${actionInstructions[action] || actionInstructions.improve}

Section contract:
- Purpose: ${contract.purpose}
- Output shape: ${contract.outputShape.join('; ')}
- Allowed HTML: ${contract.allowedHtml.map((tag) => `<${tag}>`).join(', ')}
${contract.preferredFormat ? `- Preferred format: ${contract.preferredFormat}` : ''}
${contract.maxWords ? `- Maximum words: ${contract.maxWords}` : ''}
${contract.maxParagraphs ? `- Maximum paragraphs: ${contract.maxParagraphs}` : ''}
${contract.listItems ? `- List length: ${contract.listItems.min}-${contract.listItems.max} items` : ''}
${contract.evidenceUse ? `- Evidence rule: ${contract.evidenceUse}` : ''}
- Must not include: ${contract.forbidden.join(', ')}
${context.componentId === 'specificObjectives' ? `- Specific objective rule: after the action verb, write the exact variable, factor, or focus first, such as socio-economic factors, knowledge-related factors, practice-related factors, health facility factors, or level of the main outcome. Then end every item with the same continuation: "${objectiveContinuation}". Example shape: To determine socio-economic factors ${objectiveContinuation}.` : ''}
${context.componentId === 'researchQuestions' ? `- Research question rule: each question must mirror one specific objective and use the same population/place continuation: "${objectiveContinuation}".` : ''}

UHPAB requirements:
${requirements.map((req) => `- ${req}`).join('\n') || '- Follow the selected section title and UHPAB structure.'}
${formatting ? `\nFormatting notes:\n- ${formatting}` : ''}
${knownCitationList ? `\nSaved sources that may be cited:\n${knownCitationList}` : '\nSaved sources that may be cited:\n- None yet. Use [citation needed] instead of adding real-looking citations.'}

Rules:
- Return the section body only.
- Do not include the chapter title, section number, section heading, note, explanation, markdown, or summary.
- Do not invent citation authors, publication years, statistics, sample sizes, study results, locations, approvals, or institutional facts.
- Only use in-text citations from the saved sources list above. If no saved source matches, write [citation needed].
- If a claim needs evidence and no verified source is provided, write [citation needed] or [verify local statistic].
- If a student-specific detail is unknown, use a clear placeholder such as [insert sample size] or [insert supervisor name].
${context.currentDraft ? `\nCurrent draft/result to use:\n${context.currentDraft}` : ''}`;
};

export const buildChapterOneCombinedPrompt = (context: UhpabWritingContext) => {
  const title = getCleanProjectTitle(context.projectTitle);

  return `You are UHPAB Study's Advanced Researcher.

Project:
- Type: ${context.projectType || 'Research Proposal'}
- Title: ${title}

Return exactly these two sections, with these headings:

1.0 Introduction
Write ONE paragraph only, 25-45 words. It should only preview Chapter One by mentioning background, statement of the problem, purpose or general objective, specific objectives, research questions, justification, significance, and scope. Do not add citations, statistics, definitions, or detailed explanation.

1.1 Background to the Study
Write 4-6 concise paragraphs, 350-550 words maximum. Use this flow: global context, Africa or regional context, Uganda context, local study area, then the study gap/rationale. Use [citation needed] where evidence is required. Use [verify local statistic] for local numbers or institutional facts. Do not invent citation authors, years, statistics, sample sizes, approvals, or institutional facts.

Keep the language simple, academic, and suitable for Ugandan health profession students.`;
};

const cleanGeneratedChapterOneSection = (value = '', headingPattern: RegExp) =>
  stripHtmlWithBreaks(value)
    .replace(/```/g, '')
    .replace(/\*\*/g, '')
    .replace(headingPattern, '')
    .trim();

export const splitChapterOneDraft = (value = '') => {
  const text = stripHtmlWithBreaks(value)
    .replace(/```/g, '')
    .replace(/\*\*/g, '')
    .trim();
  const backgroundMatch = text.match(/(?:^|\n)\s*(?:1\.1\s+)?Background(?:\s+to\s+the\s+Study)?\s*:?\s*\n([\s\S]*)/i);
  const introMatch = text.match(/(?:^|\n)\s*(?:1\.0\s+)?Introduction\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:1\.1\s+)?Background(?:\s+to\s+the\s+Study)?\b|$)/i);
  const introText = cleanGeneratedChapterOneSection(
    introMatch?.[1] || text.split(/\n\s*(?:1\.1\s+)?Background(?:\s+to\s+the\s+Study)?\b/i)[0] || '',
    /^\s*(?:1\.0\s+)?Introduction\s*:?\s*/i
  );
  const backgroundText = cleanGeneratedChapterOneSection(
    backgroundMatch?.[1] || '',
    /^\s*(?:1\.1\s+)?Background(?:\s+to\s+the\s+Study)?\s*:?\s*/i
  );

  return {
    introduction: generatedTextToParagraphHtml(introText),
    background: generatedTextToParagraphHtml(backgroundText),
  };
};

const removeGeneratedSectionChrome = (value = '', componentLabel = '') => {
  const labelPattern = componentLabel
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');

  return stripHtmlWithBreaks(value)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*/g, '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return true;
      if (/^(chapter\s+(one|two|three|four|five)|chapter\s+\d+)/i.test(line)) return false;
      if (/^(section|draft|answer|output|note|explanation|summary)\s*:/i.test(line)) return false;
      if (/^#{1,6}\s+/.test(line)) return false;
      if (/^\d+\.\d+(\.\d+)?\s+[a-z]/i.test(line)) return false;
      if (labelPattern && new RegExp(`^${labelPattern}\\s*:?$`, 'i').test(line)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const constrainBackgroundDraft = (value = '') => {
  const paragraphs = stripHtmlWithBreaks(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 6);

  return generatedTextToParagraphHtml(limitWords(paragraphs.join('\n\n'), 550));
};

const constrainParagraphDraft = (value = '', maxWords?: number, maxParagraphs?: number) => {
  const paragraphs = stripHtmlWithBreaks(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, maxParagraphs || 8);

  const joined = paragraphs.join('\n\n');
  return generatedTextToParagraphHtml(maxWords ? limitWords(joined, maxWords) : joined);
};

export const normalizeUhpabGeneratedDraft = (value = '', context: UhpabWritingContext) => {
  const contract = getUhpabSectionContract(context);

  if (contract.mode === 'deterministic') {
    return contract.fallback(context);
  }

  const bodyOnly = removeGeneratedSectionChrome(value, context.componentLabel);

  if (context.sectionKey === 'chapter1' && context.componentId === 'background') {
    return constrainBackgroundDraft(bodyOnly);
  }

  const maxLimited = contract.maxWords ? limitWords(bodyOnly, contract.maxWords) : bodyOnly;

  if (contract.preferredFormat === 'orderedList') {
    const orderedList = context.componentId === 'specificObjectives'
      ? normalizeObjectiveItems(maxLimited, context)
      : generatedTextToOrderedListHtml(maxLimited, contract.listItems?.max || 3);
    return orderedList || contract.fallback(context);
  }

  if (contract.preferredFormat === 'singleParagraph') {
    return generatedTextToParagraphHtml(limitWords(stripHtmlWithBreaks(maxLimited).replace(/\n+/g, ' '), contract.maxWords || 80));
  }

  if (contract.preferredFormat === 'paragraphs') {
    return constrainParagraphDraft(bodyOnly, contract.maxWords, contract.maxParagraphs);
  }

  if (/<[a-z][\s\S]*>/i.test(maxLimited)) {
    return maxLimited;
  }

  return generatedTextToParagraphHtml(maxLimited);
};

export const hasUsableGeneratedContent = (html = '') => stripHtml(html).length > 0;
