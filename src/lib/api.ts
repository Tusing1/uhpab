
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LineRuleType,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
  Footer,
  PageNumber,
  NumberFormat,
  SectionType,
} from 'docx';
import { proposalStructure, reportStructure } from '@/data/uhpabGuidelines';
import { getAppendixSections, preliminaryKeys, legacySectionAliases } from '@/data/researchGuidelineRules';
import { chapterManuscriptBlocks } from '@/lib/chapterManuscriptDocx';

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
  definitions: ['operationalDefinitions', 'definitionOfTerms'],
  acronyms: ['listOfAcronyms'],
  demographicCharacteristics: ['demographics'],
  discussionOfFindings: ['discussion'],
  limitationsOfTheStudy: ['limitations'],
  implicationsToNursingPractice: ['implications'],
  ...legacySectionAliases,
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
    singleSpaced?: boolean;
  } = {}
) =>
  new Paragraph({
    alignment: options.alignment ?? AlignmentType.JUSTIFIED,
    indent: options.hanging ? { left: 720, hanging: 720 } : undefined,
    spacing: {
      after: options.spacingAfter ?? 0,
      line: options.singleSpaced ? 240 : 480,
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
    children: [textRun(text, { bold: true, size: 24 })],
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


const addSection = (children: Paragraph[], projectData: any, title: string, path: string[], placeholderText: string) => {
  children.push(heading(title, HeadingLevel.HEADING_2));
  const rawContent = getTemplateContent(projectData, path);
  const frameworkPlaceholder = conceptualFrameworkPlaceholder(rawContent);
  children.push(...contentOrPlaceholder(frameworkPlaceholder || rawContent, placeholderText));
};

export type ChapterExportScope = { chapterKey: 'chapter1' | 'chapter2' | 'chapter3'; sectionIds: string[] };

export const buildTemplateDocx = async (projectType: 'proposal' | 'report', projectData: any, scope?: ChapterExportScope) => {
  const structure = projectType === 'report' ? reportStructure : proposalStructure;
  if (scope) {
    const chapter = structure[scope.chapterKey];
    const selected = Object.entries(chapter?.sections || {}).filter(([id]) => scope.sectionIds.includes(id));
    if (!selected.length) throw new Error('Choose at least one valid chapter section to download.');
    const children: Array<Paragraph | import('docx').Table> = [heading(chapter.title)];
    for (const [id, section] of selected) {
      if (id === 'generalObjective' && !scope.sectionIds.includes('researchObjectives')) children.push(heading('1.3 Research Objectives', HeadingLevel.HEADING_2));
      children.push(heading(section.title, HeadingLevel.HEADING_2), ...chapterManuscriptBlocks(getTemplateContent(projectData, [scope.chapterKey, id]), section.description));
    }
    const references = getNestedValue(projectData?.chapters, ['references', 'content']);
    if (references || extractCitationPairs(collectProjectCitationText(projectData)).length) children.push(pageBreak(), heading('REFERENCES'), ...referenceContentOrPlaceholder(references, projectData));
    return Packer.toBlob(new Document({
      styles: { default: { document: { run: { font: 'Times New Roman', size: 24 }, paragraph: { spacing: { line: 480, after: 0 } } } } },
      sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: 'Times New Roman', size: 24 })] })] }) }, children }],
    }));
  }
  const student = projectData?.student || {};
  const title = cleanTitle(projectData?.title || student.researchTopic);
  const name = student.name || '[[Candidate name]]';
  const htin = student.htin || student.studentId || '[[HTIN]]';
  const course = student.className || '[[Course or programme]]';
  const date = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Africa/Kampala' });
  // Rebuild the title page to prevent old saved supervisor fields reappearing.
  const cover = [
    paragraph(title.toUpperCase(), { bold: true, alignment: AlignmentType.CENTER, spacingAfter: 360 }),
    paragraph('BY', { alignment: AlignmentType.CENTER }),
    paragraph(name.toUpperCase(), { alignment: AlignmentType.CENTER }),
    paragraph(htin, { alignment: AlignmentType.CENTER, spacingAfter: 360 }),
    paragraph(`A RESEARCH ${projectType.toUpperCase()} SUBMITTED IN PARTIAL FULFILMENT OF THE REQUIREMENTS FOR THE AWARD OF ${course.toUpperCase()} OF UGANDA HEALTH PROFESSIONS ASSESSMENT BOARD (UHPAB)`, { alignment: AlignmentType.CENTER, spacingAfter: 360 }),
    paragraph(date.toUpperCase(), { alignment: AlignmentType.CENTER }),
  ];
  const prelim: Paragraph[] = [];
  for (const key of preliminaryKeys(projectType).filter(key => key !== 'titlePage')) {
    if (prelim.length) prelim.push(pageBreak());
    const section = structure.preliminaryPages.sections[key];
    prelim.push(heading(section.title.replace(/^[ivx]+\.\s*/i, '').toUpperCase()));
    const saved = getTemplateContent(projectData, ['preliminaryPages', key]);
    if (key === 'tableOfContents') prelim.push(paragraph('[[Generate or update the table of contents in Word after completing this document. Use the current headings and final page numbers.]]', { italics: true }));
    else if (key === 'listOfTables') prelim.push(...listOfTablesPicturesFigures(projectData));
    else if (key === 'abstract') {
      const body = cleanExportText(saved) || '[[Complete the report, then summarise background/purpose, methodology, objective-based findings, conclusions, recommendations and health profession implications in no more than 300 words. No citations.]]';
      prelim.push(paragraph(body, { singleSpaced: true, italics: !saved }));
    } else if (saved) prelim.push(...contentOrPlaceholder(saved, section.description));
    else if (key === 'declaration') prelim.push(paragraph(`I, ${name}, declare that this research ${projectType} entitled "${title}" is my original work and has not been submitted elsewhere for an academic award.`), paragraph('Signature: __________________ Date: __________________'));
    else if (key === 'approval') prelim.push(paragraph(`This research ${projectType} has been read and approved by the supervisor and principal.`), paragraph('Supervisor name: __________________ Signature: __________________ Date: __________'), paragraph('Principal name: __________________ Signature: __________________ Date: __________'));
    else prelim.push(...contentOrPlaceholder('', section.description));
  }
  const main: Paragraph[] = [];
  for (const [key, chapter] of Object.entries(structure).filter(([key]) => /^chapter[1-5]$/.test(key))) {
    if (main.length) main.push(pageBreak());
    main.push(heading(chapter.title));
    for (const [field, section] of Object.entries(chapter.sections || {})) {
      if (field === 'researchObjectives') main.push(heading(section.title, HeadingLevel.HEADING_2));
      else addSection(main, projectData, section.title, [key, field], section.description);
    }
    if (key === 'chapter4') addRegisteredChapter4Assets(main, projectData);
  }
  main.push(pageBreak(), heading('REFERENCES'), ...referenceContentOrPlaceholder(getNestedValue(projectData?.chapters, ['references', 'content']), projectData), pageBreak(), heading('APPENDICES'));
  for (const [key, section] of Object.entries(getAppendixSections(projectType))) {
    let saved = getTemplateContent(projectData, ['appendices', key]);
    if (key === 'ethicalRequirements' && !saved) saved = ['consentForm', 'approvalLetters', 'introductionLetter', 'schoolApprovals'].map(field => getNestedValue(projectData?.chapters, ['appendices', field])).filter(Boolean).join('\n\n');
    main.push(heading(section.title, HeadingLevel.HEADING_2), ...contentOrPlaceholder(saved, section.description));
  }
  const footer = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: 'Times New Roman', size: 24 })] })] });
  const page = { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } };
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 }, paragraph: { spacing: { line: 480, after: 0 } } } } },
    sections: [
      { properties: { page }, children: cover },
      { properties: { type: SectionType.NEXT_PAGE, page: { ...page, pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } } }, footers: { default: footer() }, children: prelim },
      { properties: { type: SectionType.NEXT_PAGE, page: { ...page, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } }, footers: { default: footer() }, children: main },
    ],
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
  format: 'pdf' | 'docx' | 'doc' = 'docx',
  projectData?: any
): Promise<{ url: string; format: string }> {
  if (format !== 'docx') throw new Error('Research downloads are editable DOCX only. Choose DOCX.');
  const blob = await buildTemplateDocx(projectType, projectData);
  return { url: URL.createObjectURL(blob), format: 'docx' };
}
