
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LineRuleType,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from 'docx';

const getNestedValue = (source: any, path: string[]) => {
  let current = source;
  for (const key of path) {
    current = current?.[key];
  }
  return typeof current === 'string' ? current.trim() : '';
};

const contentAliases: Record<string, string[]> = {
  statementOfProblem: ['problemStatement'],
  generalObjective: ['purpose'],
  specificObjectives: ['objectives'],
  body: ['content', 'literatureReview'],
  dataManagement: ['dataAnalysis'],
  qualityControl: ['qualityAssurance'],
  supervisorCommitment: ['commitmentForm', 'commitment'],
  approval: ['approvalSheet'],
  definitions: ['operationalDefinitions', 'definitionOfTerms'],
  acronyms: ['listOfAcronyms'],
  demographicCharacteristics: ['demographics'],
  discussionOfFindings: ['discussion'],
  limitationsOfTheStudy: ['limitations'],
  implicationsToNursingPractice: ['implications']
};

const getTemplateContent = (projectData: any, path: string[]) => {
  const direct = getNestedValue(projectData?.chapters, path);
  if (direct) return direct;

  const section = path[0];
  const key = path[1];
  for (const alias of contentAliases[key] || []) {
    const aliasValue = getNestedValue(projectData?.chapters, [section, alias]);
    if (aliasValue) return aliasValue;
  }

  return '';
};

const textRun = (text: string, options: { bold?: boolean; italics?: boolean; size?: number } = {}) =>
  new TextRun({
    text,
    bold: options.bold,
    italics: options.italics,
    size: options.size ?? 24,
    font: 'Times New Roman',
    color: '000000',
  });

const paragraph = (
  text: string,
  options: {
    bold?: boolean;
    italics?: boolean;
    alignment?: typeof AlignmentType[keyof typeof AlignmentType];
    spacingAfter?: number;
    hanging?: boolean;
  } = {}
) =>
  new Paragraph({
    alignment: options.alignment ?? AlignmentType.JUSTIFIED,
    indent: options.hanging ? { left: 720, hanging: 720 } : undefined,
    spacing: {
      after: options.spacingAfter ?? 0,
      line: 480,
      lineRule: LineRuleType.AUTO,
    },
    children: [textRun(text, { bold: options.bold, italics: options.italics })],
  });

const heading = (
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1,
  alignment: typeof AlignmentType[keyof typeof AlignmentType] = level === HeadingLevel.HEADING_1 ? AlignmentType.CENTER : AlignmentType.LEFT
) =>
  new Paragraph({
    heading: level,
    alignment,
    spacing: { before: 240, after: 0, line: 480, lineRule: LineRuleType.AUTO },
    children: [textRun(text, { bold: true, size: level === HeadingLevel.HEADING_1 ? 28 : 24 })],
  });

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const stripHtml = (html = '') =>
  html
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/(h[1-6]|p|div|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/td>\s*<td[^>]*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const cleanExportText = (content = '') => {
  const plain = stripHtml(content)
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/\s+#{1,6}\s+/g, '\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[oaicite:\d+\]|\bturn\d+search\d+\b|contentReference|attributableIndex/gi, '')
    .replace(/\s+\[/g, ' [')
    .replace(/\n{3,}/g, '\n\n');

  return plain
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => {
      if (!line) return false;
      if (/^[|_\-=–—.\s]+$/.test(line)) return false;
      if ((line.match(/\|/g) || []).length >= 2) return false;
      if (/^(?:[-–—_=]{5,}|[|]{2,})$/.test(line)) return false;
      return true;
    })
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const contentOrPlaceholder = (content: string, placeholder: string) => {
  const cleaned = cleanExportText(content);
  const blocks = cleaned
    ? cleaned.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)
    : [`[[${placeholder}]]`];

  return blocks.map((block) => paragraph(block, { italics: !cleaned }));
};

type CitationPair = {
  author: string;
  year: string;
  key: string;
};

const normalizeCitationAuthor = (author = '') => {
  const cleaned = author
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\bet\s+al\.?/gi, 'et al.')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ')
    .replace(/^[,;\s]+|[,;\s]+$/g, '')
    .trim();

  const aliases: Record<string, string> = {
    who: 'World Health Organization',
    moh: 'Ministry of Health',
    cdc: 'Centers for Disease Control and Prevention',
    iarc: 'International Agency for Research on Cancer',
  };
  return aliases[cleaned.toLowerCase()] || cleaned;
};

const makeCitationKey = (author: string, year: string) =>
  `${normalizeCitationAuthor(author).replace(/\bet\s+al\.$/i, '').trim()} ${year}`.trim();

const extractCitationPairs = (text = ''): CitationPair[] => {
  const pairs = new Map<string, CitationPair>();
  const clean = cleanExportText(text).replace(/\s+/g, ' ');

  const addPair = (author: string, year: string) => {
    const normalizedAuthor = normalizeCitationAuthor(author);
    const normalizedYear = year.trim();
    if (!normalizedAuthor || !/^(?:19|20)\d{2}[a-z]?$/.test(normalizedYear)) return;
    const key = makeCitationKey(normalizedAuthor, normalizedYear);
    if (!pairs.has(key.toLowerCase())) {
      pairs.set(key.toLowerCase(), { author: normalizedAuthor, year: normalizedYear, key });
    }
  };

  const parenthetical = /\(([^()]*?(?:19|20)\d{2}[a-z]?[^()]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = parenthetical.exec(clean))) {
    match[1].split(';').forEach((segment) => {
      const year = segment.match(/\b(?:19|20)\d{2}[a-z]?\b/)?.[0];
      if (!year) return;
      const author = segment
        .slice(0, segment.indexOf(year))
        .replace(/,\s*$/g, '')
        .trim();
      addPair(author, year);
    });
  }

  const narrative = /\b([A-Z][A-Za-z'’/-]+(?:\s+(?:et\s+al\.?|and|&|of|the|for|on|[A-Z][A-Za-z'’/-]+)){0,8})\s+\(((?:19|20)\d{2}[a-z]?)\)/g;
  while ((match = narrative.exec(clean))) {
    addPair(match[1], match[2]);
  }

  return Array.from(pairs.values()).sort((a, b) => a.author.localeCompare(b.author));
};

const collectProjectCitationText = (projectData: any) =>
  Object.entries(projectData?.chapters || {})
    .filter(([section]) => section !== 'references')
    .flatMap(([, sectionData]) =>
      Object.values(sectionData || {}).filter((value) => typeof value === 'string')
    )
    .join('\n\n');

const buildReferencePlaceholder = ({ author, year }: CitationPair) =>
  `${author}. (${year}). [[Add full APA 7th edition source details for this cited work: title, journal or publisher, volume(issue), pages, DOI/URL where available. Verify before submission.]]`;

const mergeReferenceEntries = (content: string, projectData: any) => {
  const existingEntries = content
    ? content.split(/\n{2,}|<\/p>\s*<p>/).map((entry) => cleanExportText(entry)).filter(Boolean)
    : [];
  const existingText = existingEntries.join('\n').toLowerCase();
  const autoEntries = extractCitationPairs(collectProjectCitationText(projectData))
    .filter((pair) => !(existingText.includes(pair.author.toLowerCase()) && existingText.includes(pair.year)))
    .map(buildReferencePlaceholder);

  if (existingEntries.length || autoEntries.length) return [...existingEntries, ...autoEntries];
  return ['[[List all cited sources in APA 7th edition format.]]'];
};

const referenceContentOrPlaceholder = (content: string, projectData: any) => {
  const entries = mergeReferenceEntries(content, projectData);
  const hasRealContent = Boolean(content || entries.some((entry) => !entry.includes('[[List all cited')));

  return entries.map((entry) => paragraph(entry, { italics: !hasRealContent || entry.includes('[[Add full APA'), hanging: true }));
};

const conceptualFrameworkPlaceholder = (text: string) => {
  const plain = cleanExportText(text);
  if (!/conceptual framework|theoretical framework/i.test(plain)) return null;
  if (!/[|_]{2,}|-{6,}/.test(stripHtml(text))) return null;
  return 'Conceptual framework: [[Insert the approved conceptual framework figure here, showing independent variables, intervening variables, and the dependent variable. Explain the diagram in the paragraph below.]]';
};

const tableFigureItems = (projectData: any) =>
  Array.isArray(projectData?.chapters?._tableFigureRegister)
    ? projectData.chapters._tableFigureRegister
    : [];

const listOfTablesPicturesFigures = (projectData: any) => {
  const items = tableFigureItems(projectData);
  if (!items.length) {
    return [paragraph('[[List tables, pictures, and figures with page numbers.]]', { italics: true })];
  }

  return items.map((item: any) => paragraph(`${item.number}: ${item.title} .......... [[page]]`));
};

const addRegisteredChapter4Assets = (children: Paragraph[], projectData: any) => {
  const items = tableFigureItems(projectData);
  if (!items.length) return;

  children.push(heading('Registered Tables, Figures and Pictures', HeadingLevel.HEADING_2));
  items.forEach((item: any) => {
    children.push(paragraph(`${item.number}: ${item.title}`, { bold: true, alignment: AlignmentType.CENTER }));
    if (Array.isArray(item.rows) && item.rows.length) {
      children.push(paragraph('Category    Frequency    Percentage', { bold: true }));
      item.rows.forEach((row: any) => {
        children.push(paragraph(`${row.label}    ${row.frequency}    ${row.percentage}%`));
      });
      children.push(paragraph(`Total    ${item.total ?? item.rows.reduce((sum: number, row: any) => sum + Number(row.frequency || 0), 0)}    100%`, { bold: true }));
    }
    if (item.chartType === 'bar' || item.chartType === 'pie') {
      children.push(paragraph(`[[Insert ${item.chartType === 'pie' ? 'pie chart' : 'bar graph'} based on the table above.]]`, { italics: true, alignment: AlignmentType.CENTER }));
    }
    if (item.imageName) {
      children.push(paragraph(`[[Insert uploaded image/result: ${item.imageName}]]`, { italics: true, alignment: AlignmentType.CENTER }));
    }
    children.push(paragraph(item.note || '[[Briefly interpret what this result shows.]]', { italics: !item.note }));
  });
};

const cleanTitle = (title?: string) => (title || 'RESEARCH TITLE').trim().toUpperCase();

const proposalSections = [
  { title: '1.0 Introduction', path: ['chapter1', 'introduction'], placeholder: 'Introduce Chapter One and mention background, problem statement, objectives, questions, justification, significance, and scope.' },
  { title: '1.1 Background to the Study', path: ['chapter1', 'background'], placeholder: 'Write the background from global to local context. Include brief current citations and show why the problem needs research.' },
  { title: '1.2 Statement of the Problem', path: ['chapter1', 'statementOfProblem'], placeholder: 'State the ideal situation, current situation, gap, magnitude, consequences, and why the problem requires investigation.' },
  { title: '1.3 Research Objectives', path: ['chapter1', 'researchObjectives'], placeholder: 'Introduce the general and specific objectives.' },
  { title: '1.3.1 Purpose of the Study or General Objective', path: ['chapter1', 'generalObjective'], placeholder: 'State one broad objective including variables, population, and study area.' },
  { title: '1.3.2 Specific Objectives', path: ['chapter1', 'specificObjectives'], placeholder: 'List 2-3 SMART specific objectives aligned to the general objective.' },
  { title: '1.3.3 Research Questions', path: ['chapter1', 'researchQuestions'], placeholder: 'List research questions that match the specific objectives.' },
  { title: '1.4 Justification of the Study', path: ['chapter1', 'justification'], placeholder: 'Explain why this topic was chosen and why the study is necessary now.' },
  { title: '1.5 Significance of the Study', path: ['chapter1', 'significance'], placeholder: 'Explain who will benefit and how each group may benefit.' },
  { title: '1.6 Scope of the Study', path: ['chapter1', 'scope'], placeholder: 'State content scope, geographical scope, and time scope.' },
  { title: '2.0 Introduction', path: ['chapter2', 'introduction'], placeholder: 'Introduce the literature review and explain that it is arranged according to objectives.' },
  { title: '2.1 Body', path: ['chapter2', 'body'], placeholder: 'Review literature according to the specific objectives. Use APA 7th edition citations and identify gaps.' },
  { title: '3.0 Introduction', path: ['chapter3', 'introduction'], placeholder: 'Introduce the methodology chapter.' },
  { title: '3.1 Study Design', path: ['chapter3', 'studyDesign'], placeholder: 'State and justify the study design.' },
  { title: '3.2 Study Setting', path: ['chapter3', 'studySetting'], placeholder: 'Describe the study area or facility and relevant local context.' },
  { title: '3.3 Study Population', path: ['chapter3', 'studyPopulation'], placeholder: 'State the target and accessible population.' },
  { title: '3.4 Sample Size', path: ['chapter3', 'sampleSize'], placeholder: 'State and justify the sample size. Add formula where required.' },
  { title: '3.5 Sampling Method', path: ['chapter3', 'samplingMethod'], placeholder: 'State the sampling method and explain selection procedures.' },
  { title: '3.6 Inclusion and Exclusion Criteria', path: ['chapter3', 'inclusionExclusion'], placeholder: 'List inclusion and exclusion criteria.' },
  { title: '3.7 Study Variables', path: ['chapter3', 'studyVariables'], placeholder: 'State dependent and independent variables.' },
  { title: '3.8 Research Instruments', path: ['chapter3', 'researchInstruments'], placeholder: 'Describe questionnaire, interview guide, checklist, or other tools.' },
  { title: '3.9 Data Collection Procedure', path: ['chapter3', 'dataCollection'], placeholder: 'Describe permissions, participant approach, consent, and data collection steps.' },
  { title: '3.10 Data Management and Analysis', path: ['chapter3', 'dataManagement'], placeholder: 'Describe data checking, coding, entry, cleaning, storage, and analysis.' },
  { title: '3.11 Data Presentation', path: ['chapter3', 'dataPresentation'], placeholder: 'State how findings will be presented.' },
  { title: '3.12 Quality Control', path: ['chapter3', 'qualityControl'], placeholder: 'Explain pretesting, supervision, training, validity, and reliability measures.' },
  { title: '3.13 Ethical Considerations', path: ['chapter3', 'ethicalConsiderations'], placeholder: 'Mention approvals, informed consent, confidentiality, and voluntary participation.' },
  { title: '3.14 Limitations of the Study', path: ['chapter3', 'limitations'], placeholder: 'State anticipated limitations and mitigation measures.' },
  { title: '3.15 Dissemination of Results', path: ['chapter3', 'dissemination'], placeholder: 'Explain how results will be shared with UHPAB, school, facility, and other audiences.' },
];

const reportExtraSections = [
  { title: '4.0 Introduction', path: ['chapter4', 'introduction'], placeholder: 'Introduce the findings chapter, sample size, and presentation style.' },
  { title: '4.1 Demographic Characteristics', path: ['chapter4', 'demographicCharacteristics'], placeholder: 'Present respondents demographic characteristics in tables and narrative.' },
  { title: '4.2 Findings Related to Objective One', path: ['chapter4', 'objective1Findings'], placeholder: 'Present findings for objective one using tables, figures, and brief interpretation.' },
  { title: '4.3 Findings Related to Objective Two', path: ['chapter4', 'objective2Findings'], placeholder: 'Present findings for objective two using tables, figures, and brief interpretation.' },
  { title: '4.4 Findings Related to Objective Three', path: ['chapter4', 'objective3Findings'], placeholder: 'Present findings for objective three using tables, figures, and brief interpretation.' },
  { title: '5.1 Discussion of Findings', path: ['chapter5', 'discussionOfFindings'], placeholder: 'Discuss findings objective by objective and compare with existing literature.' },
  { title: '5.2 Limitations of the Study', path: ['chapter5', 'limitationsOfTheStudy'], placeholder: 'State limitations encountered during the completed study.' },
  { title: '5.3 Conclusions', path: ['chapter5', 'conclusions'], placeholder: 'Give conclusions based on the major findings.' },
  { title: '5.4 Recommendations', path: ['chapter5', 'recommendations'], placeholder: 'Give clear recommendations based on findings. Keep them practical and limited.' },
  { title: '5.5 Implications to Nursing Practice', path: ['chapter5', 'implicationsToNursingPractice'], placeholder: 'Explain relevance of findings to nursing or midwifery practice.' },
];

const addSection = (children: Paragraph[], projectData: any, title: string, path: string[], placeholderText: string) => {
  children.push(heading(title, HeadingLevel.HEADING_2));
  const rawContent = getTemplateContent(projectData, path);
  const frameworkPlaceholder = conceptualFrameworkPlaceholder(rawContent);
  children.push(...contentOrPlaceholder(frameworkPlaceholder || rawContent, placeholderText));
};

const buildTemplateDocx = async (projectType: 'proposal' | 'report', projectData: any) => {
  const student = projectData?.student || {};
  const title = cleanTitle(projectData?.title || student.researchTopic);
  const studentName = (student.name || '[[Candidate name]]').toUpperCase();
  const htin = student.htin || student.studentId || '[[HTIN]]';
  const schoolName = student.schoolName || projectData?.schoolName || '[[Health training institution]]';
  const course = student.className || '[[Course or programme]]';
  const monthYear = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const documentName = projectType === 'proposal' ? 'RESEARCH PROPOSAL' : 'RESEARCH REPORT';

  const children: Paragraph[] = [
    paragraph(title, { bold: true, alignment: AlignmentType.CENTER, spacingAfter: 360 }),
    paragraph('BY', { bold: true, alignment: AlignmentType.CENTER }),
    paragraph(studentName, { bold: true, alignment: AlignmentType.CENTER }),
    paragraph(`HTIN: ${htin}`, { alignment: AlignmentType.CENTER }),
    paragraph('SUPERVISOR: [[Supervisor name]]', { alignment: AlignmentType.CENTER, spacingAfter: 360 }),
    paragraph(`A ${documentName} SUBMITTED TO UGANDA HEALTH PROFESSIONS ASSESSMENT BOARD`, { alignment: AlignmentType.CENTER }),
    paragraph(`IN PARTIAL FULFILMENT OF THE REQUIREMENTS FOR THE AWARD OF`, { alignment: AlignmentType.CENTER }),
    paragraph(course.toUpperCase(), { alignment: AlignmentType.CENTER }),
    paragraph(schoolName.toUpperCase(), { alignment: AlignmentType.CENTER, spacingAfter: 360 }),
    paragraph(monthYear.toUpperCase(), { alignment: AlignmentType.CENTER }),
    pageBreak(),
    heading('DECLARATION'),
    paragraph(`I, ${studentName}, declare that this ${projectType} is my original work and has not been submitted to any institution for any academic award.`),
    paragraph('Signature: ____________________________    Date: ____________________________'),
    pageBreak(),
    heading('APPROVAL'),
    paragraph(`This ${projectType} titled "${title}" has been submitted with the approval of the research supervisor and institution.`),
    paragraph('Supervisor name: _______________________ Signature: __________________ Date: __________'),
    paragraph('Principal name: ________________________ Signature: __________________ Date: __________'),
    pageBreak(),
    heading('COMMITMENT BY RESEARCH SUPERVISOR'),
    paragraph(`I, ____________________________, agree to supervise ${studentName} while conducting the study titled "${title}".`),
    paragraph('Supervisor signature: __________________ Date: __________________'),
    paragraph('Principal witness/stamp: __________________________________________'),
    pageBreak(),
  ];

  if (projectType === 'report') {
    children.push(
      heading('AUTHORIZATION AND COPYRIGHT'),
      paragraph('[[Write the authorization statement for use and access to this report according to institutional requirements.]]', { italics: true }),
      pageBreak(),
      heading('DEDICATION'),
      paragraph('[[Optional dedication.]]', { italics: true }),
      pageBreak(),
      heading('ACKNOWLEDGEMENT'),
      paragraph('[[Acknowledge people and institutions that supported the research.]]', { italics: true }),
      pageBreak()
    );
  }

  children.push(
    heading('TABLE OF CONTENTS'),
    paragraph('[[Update this table of contents after completing the document. Include accurate page numbers.]]', { italics: true }),
    pageBreak(),
    heading(projectType === 'report' ? 'LIST OF TABLES, PICTURES AND FIGURES' : 'ABBREVIATIONS/ACRONYMS'),
    ...(projectType === 'report'
      ? listOfTablesPicturesFigures(projectData)
      : [paragraph('[[List all abbreviations and acronyms alphabetically.]]', { italics: true })]),
    pageBreak()
  );

  if (projectType === 'report') {
    children.push(
      heading('ABBREVIATIONS/ACRONYMS'),
      paragraph('[[List all abbreviations and acronyms alphabetically.]]', { italics: true }),
      pageBreak(),
      heading('OPERATIONAL DEFINITIONS'),
      paragraph('[[Define key terms and variables as used in this study.]]', { italics: true }),
      pageBreak(),
      heading('ABSTRACT'),
      paragraph('[[Write a concise abstract of not more than 300 words after completing the report.]]', { italics: true }),
      pageBreak()
    );
  } else {
    children.push(
      heading('OPERATIONAL DEFINITIONS'),
      paragraph('[[Define key terms and variables as used in this study.]]', { italics: true }),
      pageBreak()
    );
  }

  children.push(heading('CHAPTER ONE: INTRODUCTION'));
  proposalSections.slice(0, 10).forEach((section) => addSection(children, projectData, section.title, section.path, section.placeholder));
  children.push(pageBreak(), heading('CHAPTER TWO: LITERATURE REVIEW'));
  proposalSections.slice(10, 12).forEach((section) => addSection(children, projectData, section.title, section.path, section.placeholder));
  children.push(pageBreak(), heading('CHAPTER THREE: METHODOLOGY'));
  proposalSections.slice(12).forEach((section) => addSection(children, projectData, section.title, section.path, section.placeholder));

  if (projectType === 'report') {
    children.push(pageBreak(), heading('CHAPTER FOUR: FINDINGS OF THE STUDY'));
    reportExtraSections.slice(0, 5).forEach((section) => addSection(children, projectData, section.title, section.path, section.placeholder));
    addRegisteredChapter4Assets(children, projectData);
    children.push(pageBreak(), heading('CHAPTER FIVE: DISCUSSION, CONCLUSIONS AND RECOMMENDATIONS'));
    reportExtraSections.slice(5).forEach((section) => addSection(children, projectData, section.title, section.path, section.placeholder));
  }

  children.push(
    pageBreak(),
    heading('REFERENCES'),
    ...referenceContentOrPlaceholder(getNestedValue(projectData?.chapters, ['references', 'content']), projectData),
    pageBreak(),
    heading('APPENDICES'),
    heading('Appendix 1: Work Plan', HeadingLevel.HEADING_2),
    paragraph('[[Insert work plan table.]]', { italics: true }),
    heading('Appendix 2: Budget', HeadingLevel.HEADING_2),
    paragraph('[[Insert budget table.]]', { italics: true }),
    heading('Appendix 3: Consent Form', HeadingLevel.HEADING_2),
    paragraph('[[Insert participant consent form.]]', { italics: true }),
    heading('Appendix 4: Data Collection Tools', HeadingLevel.HEADING_2),
    paragraph('[[Insert questionnaire, interview guide, checklist, or other tools.]]', { italics: true }),
    heading('Appendix 5: Map of Study Area', HeadingLevel.HEADING_2),
    paragraph('[[Insert map where applicable.]]', { italics: true })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  return Packer.toBlob(doc);
};

/**
 * Generate a downloadable report for a project
 */
export async function generateReport(
  projectId: string, 
  userId: string, 
  projectType: 'proposal' | 'report',
  format: 'pdf' | 'docx' | 'doc' = 'pdf',
  projectData?: any
): Promise<{ url: string; format: string }> {
  console.log(`Generating ${projectType} in ${format} format for project ${projectId} by user ${userId}`);
  console.log("Project data:", projectData);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const projectTitle = projectData?.title || `Research ${projectType === 'proposal' ? 'Proposal' : 'Report'}`;
  const documentTitle = `${projectTitle}_${timestamp}`;
  
  // Process project content if available
  let chapterContent = '';
  if (projectData && projectData.chapters) {
    const chapters = projectData.chapters;
    
    // Add chapter 1 content
    if (chapters.chapter1) {
      chapterContent += `CHAPTER ONE: INTRODUCTION\n\n`;
      
      if (chapters.chapter1.introduction) {
        chapterContent += `1.0 Introduction\n${chapters.chapter1.introduction}\n\n`;
      }
      
      if (chapters.chapter1.background) {
        chapterContent += `1.1 Background\n${chapters.chapter1.background}\n\n`;
      }
      
      if (chapters.chapter1.problemStatement) {
        chapterContent += `1.2 Problem Statement\n${chapters.chapter1.problemStatement}\n\n`;
      }
      
      if (chapters.chapter1.purpose) {
        chapterContent += `1.3 Purpose of the study\n${chapters.chapter1.purpose}\n\n`;
      }
      
      if (chapters.chapter1.objectives) {
        chapterContent += `1.4 Specific objectives\n${chapters.chapter1.objectives}\n\n`;
      }
      
      if (chapters.chapter1.researchQuestions) {
        chapterContent += `1.5 Research questions\n${chapters.chapter1.researchQuestions}\n\n`;
      }
      
      if (chapters.chapter1.justification) {
        chapterContent += `1.6 Justification\n${chapters.chapter1.justification}\n\n`;
      }
      
      if (chapters.chapter1.significance) {
        chapterContent += `1.7 Significance\n${chapters.chapter1.significance}\n\n`;
      }
    }
    
    // Add chapter 2 content
    if (chapters.chapter2) {
      chapterContent += `\nCHAPTER TWO: LITERATURE REVIEW\n\n`;
      
      if (chapters.chapter2.introduction) {
        chapterContent += `2.0 Introduction\n${chapters.chapter2.introduction}\n\n`;
      }
      
      if (chapters.chapter2.content) {
        chapterContent += `2.1 Body\n${chapters.chapter2.content}\n\n`;
      }
    }
    
    // Add chapter 3 content
    if (chapters.chapter3) {
      chapterContent += `\nCHAPTER THREE: METHODOLOGY\n\n`;
      
      if (chapters.chapter3.introduction) {
        chapterContent += `3.0 Introduction\n${chapters.chapter3.introduction}\n\n`;
      }
      
      if (chapters.chapter3.studyDesign) {
        chapterContent += `3.1 Study design\n${chapters.chapter3.studyDesign}\n\n`;
      }
      
      // Add other methodology sections as needed
      const methodSections = [
        { key: 'studySetting', label: '3.2 Study setting' },
        { key: 'studyPopulation', label: '3.3 Study population' },
        { key: 'sampleSize', label: '3.4 Sample size determination' },
        { key: 'samplingMethod', label: '3.5 Sampling method' },
        { key: 'inclusionExclusion', label: '3.6 Inclusion and exclusion criteria' },
        { key: 'studyVariables', label: '3.7 Study variables' },
        { key: 'researchInstruments', label: '3.8 Research instruments' },
        { key: 'dataCollection', label: '3.9 Data collection method' },
        { key: 'dataAnalysis', label: '3.10 Data management and analysis' },
        { key: 'qualityAssurance', label: '3.11 Quality Assurance' },
        { key: 'ethicalConsiderations', label: '3.12 Ethical considerations' }
      ];
      
      methodSections.forEach(section => {
        if (chapters.chapter3[section.key]) {
          chapterContent += `${section.label}\n${chapters.chapter3[section.key]}\n\n`;
        }
      });
    }
    
    // For reports, add chapters 4 and 5
    if (projectType === 'report') {
      if (chapters.chapter4) {
        chapterContent += `\nCHAPTER FOUR: FINDINGS OF THE STUDY\n\n`;
        
        if (chapters.chapter4.introduction) {
          chapterContent += `4.0 Introduction\n${chapters.chapter4.introduction}\n\n`;
        }
        
        if (chapters.chapter4.demographics) {
          chapterContent += `4.1 Demographic characteristics\n${chapters.chapter4.demographics}\n\n`;
        }
        
        // Add other findings sections
        const findingsSections = [
          { key: 'objective1Findings', label: '4.2 Research Objective 1 Findings' },
          { key: 'objective2Findings', label: '4.3 Research Objective 2 Findings' },
          { key: 'objective3Findings', label: '4.4 Research Objective 3 Findings' }
        ];
        
        findingsSections.forEach(section => {
          if (chapters.chapter4[section.key]) {
            chapterContent += `${section.label}\n${chapters.chapter4[section.key]}\n\n`;
          }
        });
      }
      
      if (chapters.chapter5) {
        chapterContent += `\nCHAPTER FIVE: DISCUSSION, CONCLUSIONS AND RECOMMENDATIONS\n\n`;
        
        const discussionSections = [
          { key: 'discussion', label: '5.1 Discussion' },
          { key: 'limitations', label: '5.2 Limitations' },
          { key: 'conclusions', label: '5.3 Conclusions' },
          { key: 'recommendations', label: '5.4 Recommendations' },
          { key: 'implications', label: '5.5 Implications to Nursing Practice' }
        ];
        
        discussionSections.forEach(section => {
          if (chapters.chapter5[section.key]) {
            chapterContent += `${section.label}\n${chapters.chapter5[section.key]}\n\n`;
          }
        });
      }
    }
    
    // Add references if available
    if (chapters.references && chapters.references.content) {
      chapterContent += `\nREFERENCES\n\n${chapters.references.content}\n\n`;
    }
    
    // Add appendices if available
    if (chapters.appendices && chapters.appendices.content) {
      chapterContent += `\nAPPENDICES\n\n${chapters.appendices.content}\n\n`;
    }
  }
  
  // Process the content to convert markdown-like syntax to plain text for PDF
  chapterContent = chapterContent
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1')     // Italic
    .replace(/__(.*?)__/g, '$1');    // Underline
  
  let content = '';
  let contentType = '';
  
  if (format === 'pdf') {
    contentType = 'application/pdf';
    content = `%PDF-1.5
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 6 0 R >>
endobj
4 0 obj
<< /Font << /F1 5 0 R /F2 7 0 R >> >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
6 0 obj
<< /Length 4000 >>
stream
BT
/F1 12 Tf
50 750 Td
0 -100 Td
(${projectData?.title?.toUpperCase() || 'KNOWLEDGE AND ATTITUDE OF PREGNANT MOTHERS TOWARDS'}) Tj

0 -20 Td
(MALARIA PREVENTION IN ALIBA PARISH RIGBO SUB-COUNTY) Tj

0 -20 Td
(MADI OKOLLO DISTRICT) Tj

0 -60 Td
(BY) Tj

0 -20 Td
(DRICIRU JOY) Tj

0 -20 Td
(JUL 24/U001/DNE/001) Tj

0 -20 Td
(SUPERVISOR: ACIO GRACE) Tj

0 -60 Td
(A RESEARCH ${projectType.toUpperCase()} SUBMITTED TO ARUA SCHOOL OF) Tj

0 -20 Td
(COMPREHENSIVE NURSING IN PARTIAL FULFILLMENT) Tj

0 -20 Td
(OF THE REQUIREMENTS FOR THE AWARD) Tj

0 -20 Td
(OF DIPLOMA IN NURSING) Tj

0 -20 Td
(EXTENSION) Tj

0 -60 Td
(APRIL, 2025) Tj

/F1 24 Tf
0 -60 Td
(${projectType === 'proposal' ? 'CHAPTER 1: INTRODUCTION' : 'TABLE OF CONTENTS'}) Tj

/F2 12 Tf
0 -30 Td
(${chapterContent.replace(/\\n/g, '\n').slice(0, 4000)}) Tj

/F2 10 Tf
0 -60 Td
(Generated by UHPAB Research Assistant on ${new Date().toLocaleString()}) Tj
ET
endstream
endobj
7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 8
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000210 00000 n
0000000254 00000 n
0000000321 00000 n
0000004374 00000 n
trailer
<< /Size 8 /Root 1 0 R >>
startxref
4438
%%EOF`;
  } else if (format === 'docx' || format === 'doc') {
    contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const blob = await buildTemplateDocx(projectType, projectData);
    const url = URL.createObjectURL(blob);
    return {
      url,
      format
    };
  }

  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  
  return {
    url: url,
    format: format
  };
}
