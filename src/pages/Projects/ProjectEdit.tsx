import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { WorkspaceEmptyState } from '@/components/workspace/WorkspaceWorkflow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjects } from '@/contexts/ProjectContext';
import { toast } from "sonner";
import { 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight,
  Save, 
  Download, 
  Sparkles, 
  FileText, 
  BookText, 
  Copy, 
  Download as DownloadIcon, 
  Wand,
  Bold,
  Italic,
  Underline,
  Pilcrow,
  PilcrowLeft,
  PilcrowRight,
  IndentDecrease,
  IndentIncrease,
  ChevronRight,
  Clock,
  CheckCircle2,
  Loader2,
  Plus,
  Quote,
  Search,
  TableProperties,
  Trash2,
  Pencil,
  BarChart3,
  PieChart as PieChartIcon,
  ClipboardCheck,
  Library,
  Link as LinkIcon
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { OperationProgress } from '@/components/ui/operation-progress';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { useAuth } from '@/contexts/AuthContext';
import { generateReport } from '@/lib/api';
import { sanitizeFileName, triggerBrowserDownload } from '@/lib/download';
import { AIContentGenerator } from '@/components/projects/AIContentGenerator';
import { humanizeResearchText } from '@/lib/humanReviewEngine';
import { Label } from '@/components/ui/label';
import { proposalStructure, reportStructure } from '@/data/uhpabGuidelines';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SectionNavigation } from "./SectionNavigation";
import { ProjectEditorContent } from "./ProjectEditorContent";
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { generateContent } from '@/integrations/gemini';

const projectDownloadSteps = [
  'Collect sections',
  'Apply UHPAB format',
  'Build DOCX',
  'Start download',
];

const buildDefaultChapters = (projectType: 'proposal' | 'report') => {
  const base: any = {
    preliminaryPages: {
      titlePage: '',
      declaration: '',
      approval: '',
      supervisorCommitment: '',
      tableOfContents: '',
      acronyms: '',
      definitions: ''
    },
    chapter1: {
      introduction: '',
      background: '',
      statementOfProblem: '',
      researchObjectives: '',
      generalObjective: '',
      specificObjectives: '',
      researchQuestions: '',
      justification: '',
      significance: '',
      scope: ''
    },
    chapter2: {
      introduction: '',
      body: ''
    },
    chapter3: {
      introduction: '',
      studyDesign: '',
      studySetting: '',
      studyPopulation: '',
      sampleSize: '',
      samplingMethod: '',
      inclusionExclusion: '',
      studyVariables: '',
      researchInstruments: '',
      dataCollection: '',
      dataManagement: '',
      dataPresentation: '',
      qualityControl: '',
      ethicalConsiderations: '',
      limitations: '',
      dissemination: ''
    },
    references: { content: '' },
    appendices: {
      workPlan: '',
      budget: '',
      consentForm: '',
      tools: '',
      maps: ''
    }
  };

  if (projectType === 'report') {
    base.preliminaryPages = {
      titlePage: '',
      iDeclaration: '',
      iiApproval: '',
      iiiCommitmentByResearchSupervisor: '',
      ivDedication: '',
      vAcknowledgement: '',
      viTableOfContents: '',
      viiListOfTablesPicturesAndFigures: '',
      viiiAbbreviationsAcronyms: '',
      ixOperationalDefinitions: '',
      xAbstract: ''
    };
    base.chapter4 = {
      introduction: '',
      demographicCharacteristics: '',
      objectiveFindings: ''
    };
    base.chapter5 = {
      introduction: '',
      discussionOfFindings: '',
      recommendations: '',
      conclusions: '',
      implicationsToNursingPractice: ''
    };
  }

  return base;
};

const buildDefaultProgress = (projectType: 'proposal' | 'report') => ({
  preliminaryPages: 0,
  chapter1: 0,
  chapter2: 0,
  chapter3: 0,
  ...(projectType === 'report' ? { chapter4: 0, chapter5: 0 } : {}),
  references: 0,
  appendices: 0
});

const autoFilledComponentIds = new Set([
  'titlePage',
  'declaration',
  'approval',
  'approvalSheet',
  'supervisorCommitment',
  'commitment',
  'commitmentForm',
  'iDeclaration',
  'iiApproval',
  'iiiCommitmentByResearchSupervisor',
  'authorization',
  'viTableOfContents',
  'tableOfContents',
  'viiListOfTablesPicturesAndFigures',
  'listOfTables',
  'listOfFigures'
]);

const deferredFinalPageIds = new Set([
  'tableOfContents',
  'viTableOfContents',
  'acronyms',
  'viiiAbbreviationsAcronyms',
  'listOfAcronyms',
  'definitions',
  'ixOperationalDefinitions',
  'operationalDefinitions',
  'viiListOfTablesPicturesAndFigures',
  'listOfTables',
  'listOfFigures',
  'xAbstract',
  'abstract'
]);

const isAutoFilledComponent = (section: string, component: string) =>
  section === 'preliminaryPages' && autoFilledComponentIds.has(component);

const getWorkflowOrder = (projectType: 'proposal' | 'report') => [
  'preliminaryPages',
  'chapter1',
  'chapter2',
  'chapter3',
  ...(projectType === 'report' ? ['chapter4', 'chapter5'] : []),
  'references',
  'appendices'
];

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

const getComponentContent = (chapters: any, section: string, component: string) => {
  const sectionData = chapters?.[section] || {};
  const directValue = sectionData[component];
  if (typeof directValue === 'string' && directValue.trim()) return directValue;

  for (const alias of contentAliases[component] || []) {
    const aliasValue = sectionData[alias];
    if (typeof aliasValue === 'string' && aliasValue.trim()) return aliasValue;
  }

  return directValue || '';
};

const getAutoFilledPreview = (component: string, projectTitle: string, user: any, projectType?: 'proposal' | 'report') => {
  const title = projectTitle || user?.researchTopic || '[[Research title]]';
  const name = user?.name || '[[Candidate name]]';
  const htin = user?.htin || user?.studentId || '[[HTIN]]';
  const school = user?.schoolName || '[[Health training institution]]';
  const course = user?.className || '[[Course or programme]]';
  const documentLabel = projectType === 'report' ? 'research report' : 'research proposal';

  if (['titlePage'].includes(component)) {
    return [
      `<div style="text-align:center">`,
      `<p><strong>${title.toUpperCase()}</strong></p>`,
      `<p>BY<br/>${name.toUpperCase()}<br/>HTIN: ${htin}</p>`,
      `<p>A ${documentLabel.toUpperCase()} SUBMITTED TO UGANDA HEALTH PROFESSIONS ASSESSMENT BOARD IN PARTIAL FULFILMENT OF THE REQUIREMENTS FOR THE AWARD OF ${course.toUpperCase()}.</p>`,
      `<p>${school.toUpperCase()}</p>`,
      `</div>`
    ].join('');
  }

  if (['declaration', 'iDeclaration'].includes(component)) {
    return `<p>I, ${name}, declare that this ${documentLabel} titled "${title}" is my original work.</p><p>Signature: __________________ Date: __________________</p>`;
  }

  if (['approval', 'approvalSheet', 'iiApproval'].includes(component)) {
    return `<p>This ${documentLabel} has been submitted with the approval of the research supervisor and institution.</p><p>Supervisor: __________________ Signature: __________________ Date: __________________</p><p>Principal: __________________ Signature: __________________ Date: __________________</p>`;
  }

  if (['supervisorCommitment', 'commitment', 'commitmentForm', 'iiiCommitmentByResearchSupervisor'].includes(component)) {
    return `<p>The research supervisor commits to guide ${name} while conducting the study titled "${title}".</p><p>Supervisor signature: __________________ Date: __________________</p><p>Principal witness/stamp: __________________</p>`;
  }

  if (['tableOfContents', 'viTableOfContents'].includes(component)) {
    return '<p>[[The DOCX template includes all required headings. Update page numbers after writing the document.]]</p>';
  }

  if (['viiListOfTablesPicturesAndFigures', 'listOfTables', 'listOfFigures'].includes(component)) {
    return '<p>[[List tables, pictures, and figures with page numbers after completing data presentation.]]</p>';
  }

  return '<p>[[This page is supplied as a structured placeholder in the DOCX template. Edit only if your school requires extra wording.]]</p>';
};

const getLocalStarterDraft = (
  componentId: string,
  componentLabel: string,
  projectTitle: string,
  requirements: string[] = [],
  sectionKey = ''
) => {
  const title = (projectTitle || 'the proposed study').trim().replace(/\s+/g, ' ');
  const topicReference = title === 'the proposed study'
    ? title
    : `the study titled "${title}"`;
  const requirementList = requirements.slice(0, 4);
  const requirementHtml = requirementList.length
    ? `<ul>${requirementList.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : '';

  const sectionName = componentLabel || 'this section';
  const reportTemplates: Record<string, string> = {
    chapter4Introduction: `<p>This chapter presents the findings of ${topicReference}. The results should be arranged according to the study objectives and supported by clear tables, figures, percentages, and brief explanatory text.</p>`,
    demographicCharacteristics: `<p>This section presents the demographic characteristics of the respondents. Include relevant variables such as age, sex, education level, marital status, occupation, or other characteristics approved for the study. Present the results in a table or figure, then briefly describe the main pattern without discussing the meaning.</p>`,
    objectiveFindings: `<p>This section presents findings according to the specific study objectives. For each objective, include a clear heading, a table or figure where appropriate, and a short narrative explaining the key percentages or responses. Do not discuss the findings here; reserve interpretation for Chapter Five.</p>`,
    chapter5Introduction: `<p>This chapter presents the discussion, recommendations, conclusions, and implications to health profession practice for ${topicReference}. The discussion should follow the study objectives and compare the findings with studies reviewed in Chapter Two.</p>`,
    discussionOfFindings: `<p>The discussion should interpret the major findings according to each study objective. Compare the findings with previous studies reviewed in the literature, explain similarities or differences, and show what the findings mean for nursing or health practice.</p>`,
    recommendations: `<p>The recommendations should be based directly on the study findings. Organize them for relevant groups such as the health facility, health workers, training institution, community, policy makers, or future researchers where applicable.</p>`,
    conclusions: `<p>The conclusion should briefly summarize the main findings of the study in relation to the objectives. Avoid introducing new data, and keep the conclusion focused on what the study found.</p>`,
    implicationsToNursingPractice: `<p>This section should explain how the findings can improve nursing or health profession practice. State practical actions, service improvements, health education needs, or supervision changes that follow from the findings.</p>`,
  };
  const localTemplates: Record<string, string> = {
    introduction: `<p>This chapter presents the background to the study, statement of the problem, objectives, research questions, justification, significance, scope, and key definitions for ${topicReference}.</p>`,
    background: `<p>The topic, "${title}", is an important area of nursing and public health practice because it affects service use, patient education, prevention, and health outcomes. This section should explain the wider problem, the local situation, and why the study population and study area require attention.</p><p>Use recent sources to show what is already known, then narrow the discussion to the specific gap your study will address.</p>`,
    statementOfProblem: `<p>Although health services and education are available, the problem addressed by this study remains a concern among the selected respondents at the study area. The exact size, causes, and effects of this problem need to be described using local evidence and recent literature.</p><p>This study therefore seeks to examine ${topicReference} in order to provide information that can guide nursing practice, health education, and service improvement.</p>`,
    researchObjectives: `<p>The objectives of the study are organized into one general objective and specific objectives that guide data collection and analysis.</p>`,
    generalObjective: `<p>The general objective of this study is to assess ${topicReference}.</p>`,
    specificObjectives: `<ol><li>To determine the level of the main outcome among the selected respondents.</li><li>To identify factors associated with the main outcome among the selected respondents.</li><li>To establish possible ways of improving the main outcome in the study area.</li></ol>`,
    researchQuestions: `<ol><li>What is the level of the main outcome among the selected respondents?</li><li>What factors are associated with the main outcome among the selected respondents?</li><li>What can be done to improve the main outcome in the study area?</li></ol>`,
    justification: `<p>This study is justified because it will generate information that can help students, supervisors, health workers, and the study institution understand the problem more clearly. The findings may support better health education, service planning, and nursing interventions.</p>`,
    significance: `<p>The study may benefit the respondents by identifying gaps that affect health service use and health outcomes. It may also support health workers, school supervisors, and future researchers by providing organized evidence on the selected topic.</p>`,
    scope: `<p>The study will focus on ${topicReference}. It will be conducted among the selected respondents in the stated study area during the approved study period. The content scope will follow the objectives and variables approved for this research.</p>`,
    studyDesign: `<p>This study will use a descriptive cross-sectional design because data will be collected from respondents at one point in time. The design is suitable for describing the study variables and identifying patterns related to the research objectives.</p>`,
    studySetting: `<p>The study will be conducted at the selected study area. This setting is appropriate because it provides access to the target respondents and relates directly to the research problem.</p>`,
    studyPopulation: `<p>The study population will include respondents who meet the inclusion criteria and are available during the data collection period. The population should be clearly described according to age, service area, role, or other relevant characteristics.</p>`,
    sampleSize: `<p>The sample size will be determined using an appropriate method approved by the supervisor. The calculation or justification should match the study design, population size, and available data collection period.</p>`,
    samplingMethod: `<p>The sampling method will be selected based on the available population and study objectives. The method should explain how respondents will be identified, approached, and included in the study.</p>`,
    ethicalConsiderations: `<p>Ethical approval and permission will be obtained before data collection. Respondents will be informed about the purpose of the study, voluntary participation, confidentiality, and their right to withdraw at any time.</p>`,
  };

  const reportTemplate =
    sectionKey === 'chapter4' && componentId === 'introduction' ? reportTemplates.chapter4Introduction :
    sectionKey === 'chapter5' && componentId === 'introduction' ? reportTemplates.chapter5Introduction :
    sectionKey === 'chapter4' || sectionKey === 'chapter5' ? reportTemplates[componentId] :
    undefined;

  const template = reportTemplate || localTemplates[componentId] || `<p>This section should explain ${sectionName.toLowerCase()} for ${topicReference}. Write directly, keep the wording academic, and only add facts that you can support with evidence.</p>`;

  return [
    template,
    requirementHtml ? `<p><strong>Before submission, make sure this section covers:</strong></p>${requirementHtml}` : '',
  ].filter(Boolean).join('');
};

const toRoman = (value: number) => {
  const numerals: Array<[number, string]> = [
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i']
  ];
  let remaining = value;
  let output = '';
  for (const [number, numeral] of numerals) {
    while (remaining >= number) {
      output += numeral;
      remaining -= number;
    }
  }
  return output;
};

const estimateWords = (html = '') =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&amp;|&lt;|&gt;/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const stripHtml = (html = '') =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&amp;|&lt;|&gt;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const hasDocumentArtifacts = (content = '') => {
  const text = stripHtmlWithBreaks(content);
  if (!text) return false;

  if (/(^|\s)#{1,6}\s+/m.test(text)) return true;
  if (/\*\*[^*]+\*\*|__[^_]+__|`[^`]+`/.test(text)) return true;
  if (/\[oaicite:\d+\]|\bturn\d+search\d+\b|contentReference|attributableIndex/i.test(text)) return true;

  return text.split(/\n+/).some((line) => {
    const cleanLine = line.trim();
    if (!cleanLine) return false;
    const pipeCount = (cleanLine.match(/\|/g) || []).length;
    if (pipeCount >= 2) return true;
    if (/^[|=\-. ]{8,}$/.test(cleanLine)) return true;
    return false;
  });
};

const cleanSavedResearchContent = (content = '') => {
  if (!content || typeof content !== 'string') return content;

  const originalText = stripHtmlWithBreaks(content);
  const markdownCleaned = originalText
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/\s+#{1,6}\s+/g, '\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[oaicite:\d+\]|\bturn\d+search\d+\b|contentReference|attributableIndex/gi, '')
    .replace(/\s+\[/g, ' [')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (
    /conceptual framework|theoretical framework|study variables/i.test(markdownCleaned) &&
    /[|_]{2,}|-{6,}|={6,}/.test(originalText)
  ) {
    return [
      '<p>Conceptual framework: [[Insert the approved conceptual framework figure here, showing independent variables, intervening variables, and the dependent variable.]]</p>',
      '<p>Explain the relationship between these variables in one clear paragraph after adding the figure.</p>',
    ].join('');
  }

  const cleanedLines = markdownCleaned
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => {
      if (!line) return false;
      const pipeCount = (line.match(/\|/g) || []).length;
      if (pipeCount >= 2) return false;
      if (/^[|_\-=.\s]+$/.test(line)) return false;
      if (/^(?:[-_=]{5,}|\|{2,})$/.test(line)) return false;
      return true;
    });

  return cleanedLines.length
    ? cleanedLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')
    : '';
};

const extractCitationKeys = (text = '') => {
  const clean = stripHtml(text);
  const keys = new Set<string>();
  const parenthetical = /\(([A-Z][A-Za-z'’-]+)(?:\s+et\s+al\.)?(?:\s*&\s*[A-Z][A-Za-z'’-]+)?(?:,\s*\d{4}[a-z]?)+[^)]*\)/g;
  const narrative = /\b([A-Z][A-Za-z'’-]+)(?:\s+et\s+al\.)?\s+\((\d{4}[a-z]?)\)/g;

  let match: RegExpExecArray | null;
  while ((match = parenthetical.exec(clean))) {
    const year = match[0].match(/\d{4}[a-z]?/)?.[0];
    if (year) keys.add(`${match[1]} ${year}`);
  }
  while ((match = narrative.exec(clean))) {
    keys.add(`${match[1]} ${match[2]}`);
  }

  return Array.from(keys).sort();
};

const parseReferenceEntries = (html = '') =>
  stripHtml(html)
    .split(/\s{2,}|\n+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 12);

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
  return aliases[cleaned.toLowerCase()] || cleaned.replace(/\bet\s+al\.$/i, '').trim();
};

const extractCitationKeysWide = (text = '') => {
  const clean = stripHtml(text);
  const keys = new Set<string>();

  const addKey = (author: string, year: string) => {
    const normalizedAuthor = normalizeCitationAuthor(author);
    if (!normalizedAuthor || !/^(?:19|20)\d{2}[a-z]?$/.test(year)) return;
    keys.add(`${normalizedAuthor} ${year}`);
  };

  const parenthetical = /\(([^()]*?(?:19|20)\d{2}[a-z]?[^()]*)\)/g;
  const narrative = /\b([A-Z][A-Za-z'’/-]+(?:\s+(?:et\s+al\.?|and|&|of|the|for|on|[A-Z][A-Za-z'’/-]+)){0,8})\s+\(((?:19|20)\d{2}[a-z]?)\)/g;

  let match: RegExpExecArray | null;
  while ((match = parenthetical.exec(clean))) {
    match[1].split(';').forEach((segment) => {
      const year = segment.match(/\b(?:19|20)\d{2}[a-z]?\b/)?.[0];
      if (!year) return;
      const author = segment
        .slice(0, segment.indexOf(year))
        .replace(/,\s*$/g, '')
        .trim();
      addKey(author, year);
    });
  }
  while ((match = narrative.exec(clean))) {
    addKey(match[1], match[2]);
  }

  return Array.from(keys).sort();
};

const buildReferencePlaceholderFromKey = (key: string) => {
  const match = key.match(/^(.*)\s+((?:19|20)\d{2}[a-z]?|n\.d\.)$/i);
  const author = match?.[1]?.trim() || key;
  const year = match?.[2]?.trim() || 'n.d.';
  return `${author}. (${year}). [[Add full APA 7th edition source details: title, journal or publisher, volume(issue), pages, DOI/URL where available. Verify before submission.]]`;
};

const splitCitationKey = (key: string) => {
  const match = key.match(/^(.*)\s+((?:19|20)\d{2}[a-z]?|n\.d\.)$/i);
  return {
    author: match?.[1]?.trim() || key,
    year: match?.[2]?.trim() || '',
  };
};

const getReferenceYear = (entry: string) => entry.match(/\((\d{4}[a-z]?)\)|\b(19|20)\d{2}\b/)?.[1]?.replace(/[a-z]$/, '') || entry.match(/\b(19|20)\d{2}\b/)?.[0] || '';

const makeReferenceParagraph = (reference: string) =>
  `<p style="padding-left:0.5in; text-indent:-0.5in; margin:0; line-height:2;">${reference}</p>`;

const buildReferenceItem = (reference: string, sourceType: string, acceptedOld = false) => ({
  id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  reference,
  sourceType,
  acceptedOld,
  year: getReferenceYear(reference),
  createdAt: new Date().toISOString()
});

const extractDoi = (value = '') => {
  const match = value.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  return match?.[0]?.replace(/[.,;)]$/, '') || '';
};

const getUrlFromInput = (value = '') => {
  const trimmed = value.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed) ? `https://${trimmed}` : '';
  if (!candidate) return null;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
};

const makeWebpageReference = (url: URL) => {
  const hostname = url.hostname.replace(/^www\./, '');
  const organization = hostname
    .split('.')
    .slice(0, -1)
    .join(' ')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || hostname;
  const pageTitle = url.pathname
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || '[[Page title]]';

  return {
    reference: `${organization}. (n.d.). <em>${pageTitle}</em>. Retrieved ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, from ${url.href}`,
    author: organization,
    year: 'n.d.'
  };
};

const chapter4ObjectiveOptions = [
  { value: 'demographics', label: 'Demographics / characteristics' },
  { value: 'objective1', label: 'Objective 1 findings' },
  { value: 'objective2', label: 'Objective 2 findings' },
  { value: 'objective3', label: 'Objective 3 findings' },
  { value: 'other', label: 'Other Chapter 4 result' }
];

const buildAssetCaptionHtml = (item: any) => [
  `<p style="text-align:center; margin:12px 0 4px;"><strong>${item.number}: ${item.title}</strong></p>`,
  item.imageName ? `<p style="text-align:center; font-style:italic;">[[Insert uploaded image/result: ${item.imageName}]]</p>` : '',
  item.note ? `<p>${item.note}</p>` : '<p>[[Briefly interpret what this result shows.]]</p>'
].filter(Boolean).join('');

const buildTablesFiguresListHtml = (items: any[] = []) => {
  if (!items.length) {
    return '<p>[[List tables, pictures, and figures with page numbers after completing data presentation.]]</p>';
  }

  return items
    .map((item) => `<p>${item.number}: ${item.title} .......... [[page]]</p>`)
    .join('');
};

const chartColors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];

const normalizeResultRows = (rows: Array<{ label: string; frequency: string | number }>) => {
  const cleanRows = rows
    .map((row) => ({
      label: String(row.label || '').trim(),
      frequency: Number(row.frequency || 0)
    }))
    .filter((row) => row.label && Number.isFinite(row.frequency) && row.frequency >= 0);
  const total = cleanRows.reduce((sum, row) => sum + row.frequency, 0);
  return cleanRows.map((row) => ({
    ...row,
    percentage: total > 0 ? Number(((row.frequency / total) * 100).toFixed(1)) : 0
  }));
};

const getResultInterpretation = (rows: Array<{ label: string; frequency: number; percentage: number }>, title: string) => {
  if (!rows.length) return '[[Briefly interpret what this result shows.]]';
  const highest = [...rows].sort((a, b) => b.frequency - a.frequency)[0];
  return `Most respondents were in the "${highest.label}" category, with ${highest.frequency} (${highest.percentage}%), for ${title.toLowerCase()}.`;
};

const buildResultTableHtml = (item: any) => {
  const rows = item.rows || [];
  const total = rows.reduce((sum: number, row: any) => sum + Number(row.frequency || 0), 0);
  return [
    `<p style="text-align:center; margin:12px 0 4px;"><strong>${item.number}: ${item.title}</strong></p>`,
    '<table style="width:100%; border-collapse:collapse; margin:12px 0;">',
    '<tr><th style="border:1px solid #94a3b8; padding:6px;">Category</th><th style="border:1px solid #94a3b8; padding:6px;">Frequency</th><th style="border:1px solid #94a3b8; padding:6px;">Percentage</th></tr>',
    ...rows.map((row: any) => `<tr><td style="border:1px solid #94a3b8; padding:6px;">${row.label}</td><td style="border:1px solid #94a3b8; padding:6px; text-align:center;">${row.frequency}</td><td style="border:1px solid #94a3b8; padding:6px; text-align:center;">${row.percentage}%</td></tr>`),
    `<tr><td style="border:1px solid #94a3b8; padding:6px;"><strong>Total</strong></td><td style="border:1px solid #94a3b8; padding:6px; text-align:center;"><strong>${total}</strong></td><td style="border:1px solid #94a3b8; padding:6px; text-align:center;"><strong>${total > 0 ? '100%' : '0%'}</strong></td></tr>`,
    '</table>',
    `<p>${item.note || getResultInterpretation(rows, item.title)}</p>`
  ].join('');
};

const shouldCreateChartFigure = (chartType: string) => chartType === 'bar' || chartType === 'pie' || chartType === 'table-bar' || chartType === 'table-pie';

const sourceUseOptions = [
  { value: 'background', label: 'Chapter 1 background' },
  { value: 'objective1', label: 'Literature objective 1' },
  { value: 'objective2', label: 'Literature objective 2' },
  { value: 'objective3', label: 'Literature objective 3' },
  { value: 'methodology', label: 'Methodology' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'other', label: 'Other' }
];

const sourceTypeOptions = ['article', 'website', 'guideline', 'report', 'pdf', 'other'];

const makeCitationText = (source: any) => {
  const author = source.authors || source.organization || 'Source';
  const firstAuthor = String(author).split(/,|&| and /)[0].trim();
  return `(${firstAuthor}, ${source.year || 'n.d.'})`;
};

const buildApaFromSource = (source: any) => {
  if (source.apaReference?.trim()) return source.apaReference.trim();
  const author = source.authors || source.organization || '[[Author or organization]]';
  const year = source.year || 'n.d.';
  const title = source.title || '[[Title]]';
  const locator = source.doi ? ` https://doi.org/${source.doi.replace(/^https?:\/\/doi\.org\//i, '')}` : source.url ? ` ${source.url}` : '';
  return `${author}. (${year}). ${title}.${locator}`.replace(/\s+/g, ' ').trim();
};

const buildSourceItem = (draft: any) => {
  const apaReference = buildApaFromSource(draft);
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: draft.title.trim() || 'Untitled source',
    authors: draft.authors.trim(),
    year: draft.year.trim() || 'n.d.',
    sourceType: draft.sourceType,
    doi: draft.doi.trim(),
    url: draft.url.trim(),
    apaReference,
    citationText: makeCitationText({ ...draft, apaReference }),
    notes: draft.notes.trim(),
    intendedUse: draft.intendedUse,
    acceptedOld: false,
    createdAt: new Date().toISOString()
  };
};

const generateEvidenceSearchStrings = (title: string, sectionLabel: string) => {
  const core = title
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 8);
  const base = core.length ? core.join(' AND ') : 'research topic';
  const sectionHint = sectionLabel.toLowerCase().includes('literature') ? 'literature review' : sectionLabel;
  return [
    base,
    `${base} AND Uganda`,
    `${base} AND Africa`,
    `${base} AND "${sectionHint}"`,
    `${base} AND (knowledge OR attitude OR practice OR factors) AND Uganda`
  ];
};

const runUhpabChecks = (projectData: any, formData: any, citationKeys: string[], missingReferenceKeys: string[], oldReferenceEntries: any[], tableFigureItems: any[]) => {
  const checks: Array<{ label: string; status: 'Passed' | 'Needs attention' | 'Missing'; detail: string; section: string }> = [];
  const structure = projectData?.type === 'report' ? reportStructure : proposalStructure;
  Object.entries(structure).forEach(([sectionKey, sectionData]: [string, any]) => {
    const components = sectionData?.sections ? Object.entries(sectionData.sections) : [];
    components.forEach(([componentKey, component]: [string, any]) => {
      if (sectionKey === 'preliminaryPages' && deferredFinalPageIds.has(componentKey)) return;
      const content = getComponentContent(formData.chapters, sectionKey, componentKey);
      checks.push({
        label: component?.title || componentKey,
        status: content || isAutoFilledComponent(sectionKey, componentKey) ? 'Passed' : 'Missing',
        detail: content ? 'Content found.' : 'This required section is still empty.',
        section: sectionKey
      });
    });
  });
  checks.push({
    label: 'Citation-reference matching',
    status: missingReferenceKeys.length ? 'Needs attention' : 'Passed',
    detail: missingReferenceKeys.length ? `${missingReferenceKeys.length} citation(s) need matching references.` : `${citationKeys.length} citation(s) checked.`,
    section: 'references'
  });
  checks.push({
    label: 'Reference age',
    status: oldReferenceEntries.length ? 'Needs attention' : 'Passed',
    detail: oldReferenceEntries.length ? `${oldReferenceEntries.length} source(s) are older than 10 years.` : 'No unaccepted old sources found.',
    section: 'references'
  });
  if (projectData?.type === 'report') {
    checks.push({
      label: 'Chapter 4 tables and figures',
      status: tableFigureItems.length ? 'Passed' : 'Needs attention',
      detail: tableFigureItems.length ? `${tableFigureItems.length} table/figure item(s) registered.` : 'Add result tables or figure placeholders for findings.',
      section: 'chapter4'
    });
  }
  return checks;
};

const normalizeLookupText = (value = '') =>
  value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const isPlausibleCrossrefMatch = (query: string, work: any) => {
  const title = normalizeLookupText(work?.title?.[0] || '');
  const cleanQuery = normalizeLookupText(query);
  if (!title || !cleanQuery) return false;
  const queryWords = cleanQuery.split(' ').filter((word) => word.length > 3);
  if (queryWords.length < 3) return false;
  const hits = queryWords.filter((word) => title.includes(word)).length;
  return hits / queryWords.length >= 0.55;
};

const formatApaAuthors = (authors: any[] = []) => {
  if (!authors.length) return '[[Author]]';
  const names = authors.slice(0, 20).map((author) => {
    const family = author.family || author.name || '[[Author]]';
    const initials = String(author.given || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}.`)
      .join(' ');
    return initials ? `${family}, ${initials}` : family;
  });
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
};

const getCrossrefYear = (work: any) =>
  work?.published?.['date-parts']?.[0]?.[0] ||
  work?.['published-print']?.['date-parts']?.[0]?.[0] ||
  work?.['published-online']?.['date-parts']?.[0]?.[0] ||
  work?.issued?.['date-parts']?.[0]?.[0] ||
  'n.d.';

const formatCrossrefApa = (work: any) => {
  const authors = formatApaAuthors(work.author);
  const year = getCrossrefYear(work);
  const title = (work.title?.[0] || '[[Title]]').replace(/\.$/, '');
  const container = work['container-title']?.[0] || work.publisher || '';
  const volume = work.volume || '';
  const issue = work.issue ? `(${work.issue})` : '';
  const pages = work.page ? `, ${work.page}` : '';
  const doi = work.DOI ? ` https://doi.org/${work.DOI}` : '';
  const source = container ? ` <em>${container}</em>${volume ? `, ${volume}${issue}` : ''}${pages}.` : '';
  return `${authors} (${year}). ${title}.${source}${doi}`.replace(/\s+/g, ' ').trim();
};

const getCitationDraftFromWork = (work: any) => ({
  author: work?.author?.[0]?.family || work?.publisher || 'Source',
  year: String(getCrossrefYear(work)).replace(/[^\d]/g, '').slice(0, 4)
});

const ProjectEdit = () => {
  
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [activeTab, setActiveTab] = useState('editor');
  const [selectedSection, setSelectedSection] = useState('preliminaryPages');
  const [selectedComponent, setSelectedComponent] = useState('titlePage');
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'docx' | 'doc'>('pdf');
  const [lastDownload, setLastDownload] = useState<{ url: string; fileName: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [temporaryContent, setTemporaryContent] = useState('');
  const [citationDraft, setCitationDraft] = useState({ author: '', year: '', lookup: '' });
  const [manualReference, setManualReference] = useState('');
  const [editingReferenceId, setEditingReferenceId] = useState<string | null>(null);
  const [editingReferenceText, setEditingReferenceText] = useState('');
  const [isLookingUpReference, setIsLookingUpReference] = useState(false);
  const [assetDraft, setAssetDraft] = useState({ type: 'Table', title: '', objectiveKey: 'demographics', note: '', imageName: '' });
  const [resultDraft, setResultDraft] = useState({
    title: '',
    objectiveKey: 'demographics',
    chartType: 'table-bar',
    rows: [
      { label: 'Yes', frequency: '' },
      { label: 'No', frequency: '' }
    ]
  });
  const [resultPaste, setResultPaste] = useState('');
  const [sourceDraft, setSourceDraft] = useState({
    title: '',
    authors: '',
    year: '',
    sourceType: 'article',
    doi: '',
    url: '',
    apaReference: '',
    notes: '',
    intendedUse: 'background'
  });
  const editorPanelRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [supportPanelOpen, setSupportPanelOpen] = useState(false);
  
  const { projects, getProject, updateProject, isLoading } = useProjects();
  const { user } = useAuth();
  const [projectData, setProjectData] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    title: '',
    chapters: buildDefaultChapters('proposal'),
    progress: buildDefaultProgress('proposal')
  });

  // Track recently edited sections
  const [recentSections, setRecentSections] = useState<Array<{
    section: string;
    component: string;
    label: string;
    timestamp: Date;
  }>>([]);

  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId) || getProject(projectId);
      
      if (project) {
        setProjectData(project);

        const fullStructure = buildDefaultChapters(project.type);
        const progressStructure = buildDefaultProgress(project.type);
        
        setFormData({
          title: project.title,
          chapters: {
            ...fullStructure,
            ...project.chapters
          },
          progress: {
            ...progressStructure,
            ...project.progress
          }
        });
      }
    }
  }, [projectId, projects, getProject]);

  useEffect(() => {
    if (isLoading) return;
    editorPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedSection, selectedComponent, isLoading]);

  useEffect(() => {
    setSupportPanelOpen(false);
  }, [selectedSection, selectedComponent]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getContentProgress = (value: string) => {
    const contentLength = value.length;
    let progress = 0;

    if (contentLength > 0) {
      if (contentLength < 300) {
        progress = Math.max(5, Math.round((contentLength / 300) * 25));
      } else if (contentLength < 1000) {
        progress = 25 + Math.round(((contentLength - 300) / 700) * 45);
      } else {
        progress = 70 + Math.round(Math.min(((contentLength - 1000) / 1500) * 30, 30));
      }
    }

    return progress;
  };

  const buildFormDataWithChapterChange = (baseData: any, chapter: string, field: string, value: string) => {
    const progress = getContentProgress(value);
    return {
      ...baseData,
      chapters: {
        ...baseData.chapters,
        [chapter]: {
          ...baseData.chapters?.[chapter],
          [field]: value
        }
      },
      progress: {
        ...baseData.progress,
        [chapter]: Math.max(baseData.progress?.[chapter] || 0, progress)
      }
    };
  };

  const handleChapterChange = (chapter: string, field: string, value: string) => {
    setFormData(prev => buildFormDataWithChapterChange(prev, chapter, field, value));
  };

  const persistProjectFormData = async (nextFormData: any, successMessage?: string) => {
    if (!projectId || !projectData) {
      toast.error("Project data is missing. Cannot save changes.");
      return null;
    }

    const updatedProject = {
      ...projectData,
      title: nextFormData.title,
      chapters: nextFormData.chapters,
      progress: nextFormData.progress,
      updatedAt: new Date().toISOString()
    };

    const savedProject = await updateProject(updatedProject);
    setProjectData(savedProject);
    if (successMessage) toast.success(successMessage);
    return savedProject;
  };

  const handleSave = async () => {
    if (!projectId || !projectData) {
      toast.error("Project data is missing. Cannot save changes.");
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    try {
      await persistProjectFormData(formData, "Project saved successfully!");
      setIsEditing(false);
      navigate(`/projects/${projectId}/edit`);
    } catch (err: any) {
      console.error("Error saving project:", err);
      setError(`Failed to save project: ${err?.message || "Unknown error"}`);
      toast.error(`Failed to save project: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'docx' | 'doc') => {
    if (!projectId || !user?.id || !projectData) {
      toast.error("Project ID or User ID is missing.");
      return;
    }

    setIsDownloading(true);
    setDownloadFormat(format);
    setLastDownload(null);
    setDownloadProgress(10);
    setDownloadStatus('Collecting project sections...');
    const downloadToastId = toast.loading(`Preparing ${format.toUpperCase()}`, {
      description: 'Collecting the project sections.',
    });

    try {
      setDownloadProgress(32);
      setDownloadStatus('Applying the UHPAB document structure...');
      const report = await generateReport(projectId, user.id, projectData.type, format, {
        title: formData.title,
        chapters: formData.chapters,
        student: user
      });
      
      if (report && report.url) {
        const fileName = `${sanitizeFileName(formData.title || projectData.title || 'research')}.${format}`;
        setDownloadProgress(82);
        setDownloadStatus(`Building the final ${format.toUpperCase()} file...`);
        setDownloadProgress(100);
        setDownloadStatus(`${format.toUpperCase()} download started.`);
        triggerBrowserDownload(report.url, fileName, { notify: false });
        setLastDownload({ url: report.url, fileName });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.success('Download started', {
          id: downloadToastId,
          description: `${fileName} is being saved. A backup link is shown on this page.`,
        });
      } else {
        throw new Error("Failed to generate report or URL is missing.");
      }
    } catch (err) {
      console.error("Download failed:", err);
      setDownloadProgress(0);
      setDownloadStatus('');
      toast.error("Failed to generate report. Please try again.", { id: downloadToastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const getGuidelineForComponent = (component: string) => {
    const structure = projectData?.type === 'report' ? reportStructure : proposalStructure;
    
    for (const sectionKey in structure) {
      const section = structure[sectionKey];
      if (!section.sections) continue;
      
      for (const compKey in section.sections) {
        const comp = section.sections[compKey];
        if (compKey === component) {
          return comp;
        }
      }
    }
    return null;
  };

  const handleImproveWithAI = async (action = 'improve') => {
    if (!selectedSection || !selectedComponent) {
      toast.error("Please select a section to generate content for.");
      return;
    }

    if (isAutoFilledComponent(selectedSection, selectedComponent)) {
      toast.info("This page is prefilled from your profile and the DOCX template.");
      return;
    }

    if (action === 'humanize') {
      const rawContent = temporaryContent || getComponentContent(formData.chapters, selectedSection, selectedComponent);
      const sourceText = stripHtml(rawContent);
      if (!sourceText.trim()) {
        toast.error("Add text to this section before running human review.");
        return;
      }

      const humanReview = humanizeResearchText(sourceText);
      setTemporaryContent(humanReview.revisedText);
      setIsEditing(true);
      toast.success("Human review applied", {
        description: `${humanReview.signals.length} signal${humanReview.signals.length === 1 ? "" : "s"} checked and ${humanReview.changes.length} cleanup ${humanReview.changes.length === 1 ? "change" : "changes"} applied.`,
      });
      return;
    }

    setIsGenerating(true);
    try {
      const componentGuidelines = getGuidelineForComponent(selectedComponent);
      const componentLabel = componentGuidelines?.title || sectionComponents.find(c => c.id === selectedComponent)?.label || '';
      const requirements = componentGuidelines?.requirements || [];
      const formatting = componentGuidelines?.formatting || '';
      const actionInstructions: Record<string, string> = {
        draft: 'Draft this section from scratch using the project title and UHPAB requirements.',
        improve: 'Improve clarity, flow, and academic quality while preserving the student meaning.',
        academic: 'Rewrite in formal academic language suitable for a UHPAB research submission.',
        shorten: 'Shorten the content while keeping the required points and citations.',
        uhpab: 'Check against UHPAB requirements and return a corrected version, not a commentary.',
        humanize: 'Remove generic generated-writing patterns while preserving meaning.',
        interpret: 'Write a concise Chapter Four interpretation of the presented result in academic style.'
      };

      const generatedDraft = await generateContent(
        `You are helping write a ${projectData?.type || 'proposal'} for the research titled: "${projectData?.title}".
                
                Task: ${actionInstructions[action] || actionInstructions.improve}
                Section: "${componentLabel}".
                
                Project Context:
                - Type: ${projectData?.type || 'Research Proposal'}
                - Title: ${projectData?.title}
                
                Section Requirements:
                ${requirements.map(req => `- ${req}`).join('\n')}
                ${formatting ? `\nFormatting: ${formatting}` : ''}
                
                Guidelines:
                - Use formal academic writing style
                - Be concise and precise
                - Content must be specifically about ${projectData?.title?.split(' ').slice(0, 8).join(' ')}
                - Follow UHPAB research standards
                - Do not invent citation authors, publication years, statistics, sample sizes, study results, locations, approvals, or institutional facts.
                - If a claim needs evidence and no verified source is provided, write [citation needed] or [verify local statistic] instead of naming a source.
                - If a student-specific detail is unknown, use a clear placeholder such as [insert sample size] or [insert supervisor name].
                ${temporaryContent ? '\n\nCurrent draft/result to use:\n' + temporaryContent : ''}`
      );

      if (generatedDraft) {
        let generatedText = generatedDraft;
        generatedText = generatedText.split(/Note:|Explanation:|Summary:|Generated by/)[0].trim();
        const humanReview = humanizeResearchText(generatedText);
        generatedText = humanReview.revisedText;
        
        setTemporaryContent(generatedText);
        setIsEditing(true);
        if (humanReview.signals.length > 0 || humanReview.changes.length > 0) {
          toast.success("Generated draft cleaned by Human Review", {
            description: `${humanReview.changes.length} safe cleanup ${humanReview.changes.length === 1 ? "change" : "changes"} applied before editing.`,
          });
        }
      } else {
        throw new Error("Invalid response from AI");
      }
    } catch (error) {
      console.error("AI generation failed:", error);
      const message = error instanceof Error ? error.message : "";
      const shouldUseStarterFallback =
        /not configured|api key/i.test(message) ||
        action === 'draft' ||
        !stripHtml(temporaryContent || getComponentContent(formData.chapters, selectedSection, selectedComponent)).trim();

      if (shouldUseStarterFallback) {
        const componentGuidelines = getGuidelineForComponent(selectedComponent);
        const componentLabel = componentGuidelines?.title || sectionComponents.find(c => c.id === selectedComponent)?.label || '';
        const starterDraft = getLocalStarterDraft(selectedComponent, componentLabel, projectData?.title || formData.title, componentGuidelines?.requirements || [], selectedSection);
        setTemporaryContent(starterDraft);
        setIsEditing(true);
        toast.warning(action === 'draft' ? "Local starter used" : "Starter draft added", {
          description: action === 'draft'
            ? "Advanced Researcher drafting did not finish, so a local UHPAB starter was inserted to keep you moving."
            : "A local UHPAB starter was inserted. Edit it with your real details before saving.",
        });
      } else {
        toast.error("Advanced Researcher writing could not finish", {
          description: "Your work is safe. Continue manually or try the action again later.",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartEditing = () => {
    const rawContent = getComponentContent(formData.chapters, selectedSection, selectedComponent);
    const autoPreview = isAutoFilledComponent(selectedSection, selectedComponent)
      ? getAutoFilledPreview(selectedComponent, formData.title, user, projectData?.type)
      : '';
    setIsEditing(true);
    setTemporaryContent(rawContent || autoPreview);
  };

  const handleSaveContent = async () => {
    const nextFormData = buildFormDataWithChapterChange(formData, selectedSection, selectedComponent, temporaryContent);
    setFormData(nextFormData);
    setIsEditing(false);
    try {
      await persistProjectFormData(nextFormData, "Section saved.");
    } catch (error) {
      console.error("Section save failed:", error);
      toast.error("Section could not be saved. Please try again.");
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setTemporaryContent('');
  };
  
  // Rich text editing functions
  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = temporaryContent.substring(start, end);
    
    let formattedText = '';
    let cursorOffset = 0;
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        cursorOffset = 1;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        cursorOffset = 2;
        break;
    }
    
    const newContent = temporaryContent.substring(0, start) + formattedText + temporaryContent.substring(end);
    setTemporaryContent(newContent);
    
    // Set focus back and restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newPosition = end + (2 * cursorOffset);
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };
  
  const insertParagraph = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const newContent = temporaryContent.substring(0, start) + "\n\n" + temporaryContent.substring(start);
    setTemporaryContent(newContent);
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + 2;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };
  
  const insertIndent = (increase: boolean) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const text = temporaryContent;
    
    // Find the beginning of the current line
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    let newContent: string;
    if (increase) {
      // Add four spaces at the beginning of the line
      newContent = text.substring(0, lineStart) + '    ' + text.substring(lineStart);
      setTemporaryContent(newContent);
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + 4;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      // Remove up to four spaces from beginning of line if they exist
      const linePrefix = text.substring(lineStart, lineStart + 4);
      const spacesToRemove = linePrefix.match(/^ {1,4}/)?.[0].length || 0;
      
      if (spacesToRemove > 0) {
        newContent = text.substring(0, lineStart) + text.substring(lineStart + spacesToRemove);
        setTemporaryContent(newContent);
        setTimeout(() => {
          textarea.focus();
          const newPosition = Math.max(lineStart, start - spacesToRemove);
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
      }
    }
  };
  
  const alignText = (align: 'left' | 'center' | 'right') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const text = temporaryContent;
    
    // Find the current line
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    let lineEnd = start;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }
    
    const currentLine = text.substring(lineStart, lineEnd);
    const trimmedLine = currentLine.trim();
    
    let formattedLine = '';
    switch (align) {
      case 'left':
        // Remove any existing center/right alignment
        formattedLine = trimmedLine;
        break;
      case 'center':
        formattedLine = '<div style="text-align:center">' + trimmedLine + '</div>';
        break;
      case 'right':
        formattedLine = '<div style="text-align:right">' + trimmedLine + '</div>';
        break;
    }
    
    const newContent = text.substring(0, lineStart) + formattedLine + text.substring(lineEnd);
    setTemporaryContent(newContent);
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = lineStart + formattedLine.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Add section to recent when edited
  const addToRecent = (section: string, component: string, label: string) => {
    setRecentSections(prev => {
      const newRecent = prev.filter(
        item => !(item.section === section && item.component === component)
      );
      return [{
        section,
        component,
        label,
        timestamp: new Date()
      }, ...newRecent].slice(0, 5); // Keep last 5 edited sections
    });
  };

  // Get section label
  const getSectionLabel = (section: string) => {
    switch (section) {
      case 'preliminaryPages': return 'Preliminary Pages';
      case 'chapter1': return 'Chapter 1: Introduction';
      case 'chapter2': return 'Chapter 2: Literature Review';
      case 'chapter3': return 'Chapter 3: Methodology';
      case 'chapter4': return 'Chapter 4: Findings';
      case 'chapter5': return 'Chapter 5: Discussion';
      case 'references': return 'References';
      case 'appendices': return 'Appendices';
      default: return section;
    }
  };

  const getDeferredPageMilestone = (componentId: string) => {
    if (projectData?.type !== 'report') return 'Chapter Three';
    if (['viiListOfTablesPicturesAndFigures', 'listOfTables', 'listOfFigures'].includes(componentId)) {
      return 'Chapter Four';
    }
    if (['xAbstract', 'abstract', 'tableOfContents', 'viTableOfContents'].includes(componentId)) {
      return 'Chapter Five';
    }
    return 'Chapter Three';
  };

  const isFinalPageDeferred = (section: string, componentId: string) => {
    if (section !== 'preliminaryPages' || !deferredFinalPageIds.has(componentId)) return false;

    if (projectData?.type !== 'report') return (formData.progress.chapter3 || 0) < 70;
    if (['viiListOfTablesPicturesAndFigures', 'listOfTables', 'listOfFigures'].includes(componentId)) {
      return (formData.progress.chapter4 || 0) < 70;
    }
    if (['xAbstract', 'abstract', 'tableOfContents', 'viTableOfContents'].includes(componentId)) {
      return (formData.progress.chapter5 || 0) < 70;
    }
    return (formData.progress.chapter3 || 0) < 70;
  };

  const isComponentDone = (section: string, component: string) => {
    if (isAutoFilledComponent(section, component) && !deferredFinalPageIds.has(component)) return true;
    return !!getComponentContent(formData.chapters, section, component);
  };

  const getComponentStatus = (section: string, component: string) => {
    if (isFinalPageDeferred(section, component)) return 'Finish later';
    if (section === selectedSection && component === selectedComponent && isEditing) return 'Drafting';
    if (isComponentDone(section, component)) return 'Done';
    return 'Not started';
  };

  const getSectionHelperBadge = (section: string) => {
    if (section === 'references') return 'APA tools';
    if (section === 'chapter4') return 'Tables + charts';
    if (section === 'preliminaryPages') return 'Auto later';
    return '';
  };

  const getComponentsForSection = (data: any) => {
    const sectionEntries = data?.sections ? Object.entries(data.sections) : [];
    const entries = sectionEntries.length ? sectionEntries : [['content', data]];
    return entries.map(([id, content]: [string, any]) => ({
      id,
      label: content?.title || data?.title || id,
      description: content?.description || data?.description || ''
    }));
  };

  const selectComponent = (section: string, component: string) => {
    setSelectedSection(section);
    setSelectedComponent(component);
    setIsEditing(false);
    setTemporaryContent('');
    requestAnimationFrame(() => {
      editorPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // Render section card with progress
  const renderSectionCard = (section: string, components: any[]) => {
    const progress = formData.progress[section] || 0;
    const isSelected = selectedSection === section;
    const doneCount = components.filter(comp => isComponentDone(section, comp.id)).length;
    
    return (
      <div
        key={section}
        className={cn(
          "rounded-lg border bg-white/75 p-3 transition-all hover:border-primary/50 dark:bg-card/75",
          isSelected ? "border-primary shadow-sm" : "border-border"
        )}
        onClick={() => {
          const firstOpenComponent = components.find(comp => !isFinalPageDeferred(section, comp.id));
          if (firstOpenComponent) selectComponent(section, firstOpenComponent.id);
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{getSectionLabel(section)}</h3>
              {getSectionHelperBadge(section) && (
                <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-800">
                  {getSectionHelperBadge(section)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{doneCount}/{components.length} items ready</p>
          </div>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            progress >= 70 ? "bg-emerald-100 text-emerald-700" : isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {progress >= 70 ? 'Done' : isSelected && isEditing ? 'Drafting' : progress > 0 ? `${progress}%` : 'Not started'}
          </span>
        </div>
        <Progress value={progress} className="h-1.5 mb-3" />
        <div className={cn(
          "grid transition-all duration-300",
          isSelected ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}>
          <div className="min-h-0 overflow-hidden">
        <div className="space-y-1">
            {components.map(comp => {
              const deferred = isFinalPageDeferred(section, comp.id);
              const done = isComponentDone(section, comp.id);
              const status = getComponentStatus(section, comp.id);
              return (
              <Button
                key={comp.id}
                variant={selectedComponent === comp.id ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-auto min-h-8 w-full justify-start gap-2 whitespace-normal py-1.5 text-left text-xs",
                  deferred && "opacity-55"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  selectComponent(section, comp.id);
                  if (deferred) {
                    toast.info(`This page is normally finalized after ${getDeferredPageMilestone(comp.id)}. You can review it now and continue.`);
                  }
                }}
              >
                <span className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[0px]",
                  done ? "border-emerald-500 bg-emerald-500 text-white" : deferred ? "border-muted-foreground/40" : "border-primary/50"
                )}>
                  {done && <CheckCircle2 className="h-3 w-3" />}
                  {!done && deferred && <span className="text-[10px]">-</span>}
                </span>
                <span className="flex-1">
                  <span className="block">{comp.label}</span>
                  <span className={cn(
                    "block text-[11px]",
                    status === 'Done' ? "text-emerald-700" : status === 'Drafting' ? "text-primary" : "text-muted-foreground"
                  )}>
                    {status}
                  </span>
                </span>
              </Button>
            )})}
        </div>
          </div>
        </div>
      </div>
    );
  };

  // Display loading state while fetching data
  if (isLoading) {
    return (
      <DashboardLayout>
        <WorkspacePage width="wide">
          <WorkspaceEmptyState
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            title="Loading project editor"
            description="Your writing workspace is being prepared."
          />
        </WorkspacePage>
      </DashboardLayout>
    );
  }

  // If project not found
  if (!projectData && !isLoading) {
    return (
      <DashboardLayout>
        <WorkspacePage width="wide">
          <WorkspaceEmptyState
            tone="warning"
            icon={<FileText className="h-5 w-5" />}
            title="Project not found"
            description="The project you are trying to edit does not exist or has been deleted."
            actions={<Button onClick={() => navigate('/projects')}>Back to projects</Button>}
          />
        </WorkspacePage>
      </DashboardLayout>
    );
  }

  // Calculate average progress
  const getAverageProgress = () => {
    if (!formData.progress) return 0;
    
    const values = Object.values(formData.progress) as number[];
    const average = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    return Math.round(average); // Return a rounded integer percentage
  };

  // Get structure based on project type
  const structure = projectData?.type === 'proposal' ? proposalStructure : reportStructure;

  // Get current section components
  const getCurrentSectionComponents = () => {
    if (!structure || !selectedSection) return [];
    
    const section = structure[selectedSection as keyof typeof structure];
    if (!section) return [];
    
    return getComponentsForSection(section);
  };

  const sectionComponents = getCurrentSectionComponents();
  const selectedComponentMeta = sectionComponents.find(c => c.id === selectedComponent);
  const isCurrentComponentAutoFilled = isAutoFilledComponent(selectedSection, selectedComponent);
  const selectedContent =
    getComponentContent(formData.chapters, selectedSection, selectedComponent) ||
    (['viiListOfTablesPicturesAndFigures', 'listOfTables', 'listOfFigures'].includes(selectedComponent)
      ? buildTablesFiguresListHtml(Array.isArray(formData.chapters?._tableFigureRegister) ? formData.chapters._tableFigureRegister : [])
      : '') ||
    (isCurrentComponentAutoFilled ? getAutoFilledPreview(selectedComponent, formData.title, user, projectData?.type) : '');
  const workflowSteps = getWorkflowOrder(projectData?.type || 'proposal')
    .filter((section) => structure[section as keyof typeof structure])
    .flatMap((section) => {
      const data = structure[section as keyof typeof structure] as any;
      return getComponentsForSection(data).map((component) => ({
        section,
        component: component.id,
        label: component.label,
        sectionLabel: getSectionLabel(section),
        deferred: isFinalPageDeferred(section, component.id)
      }));
    });
  const currentStepIndex = workflowSteps.findIndex(
    (step) => step.section === selectedSection && step.component === selectedComponent
  );
  const currentStep = currentStepIndex >= 0 ? workflowSteps[currentStepIndex] : workflowSteps[0];
  const canPreviousStep = currentStepIndex > 0;
  const canNextStep = currentStepIndex >= 0 && currentStepIndex < workflowSteps.length - 1;

  const goToWorkflowStep = (index: number) => {
    const nextStep = workflowSteps[index];
    if (!nextStep) return;
    selectComponent(nextStep.section, nextStep.component);
  };

  const handleSaveAndNext = async () => {
    const nextFormData = buildFormDataWithChapterChange(formData, selectedSection, selectedComponent, temporaryContent);
    setFormData(nextFormData);
    addToRecent(
      selectedSection,
      selectedComponent,
      selectedComponentMeta?.label || ''
    );
    setIsEditing(false);
    try {
      await persistProjectFormData(nextFormData);
      toast.success("Saved. Moving to the next page.");
      goToWorkflowStep(currentStepIndex + 1);
    } catch (error) {
      console.error("Save and next failed:", error);
      toast.error("Section could not be saved. Please try again.");
    }
  };

  const updateReferencesContent = (content: string, items?: any[]) => {
    setFormData(prev => ({
      ...prev,
      chapters: {
        ...prev.chapters,
        references: {
          ...(prev.chapters?.references || {}),
          content,
          ...(items ? { items } : {})
        }
      }
    }));
  };

  const syncReferenceItems = (items: any[]) => {
    updateReferencesContent(
      items.map((item: any) => makeReferenceParagraph(item.reference)).join(''),
      items
    );
  };

  const appendReference = (reference: string, sourceType: string, acceptedOld = false) => {
    const current = formData.chapters?.references?.content || '';
    const currentItems = Array.isArray(formData.chapters?.references?.items)
      ? formData.chapters.references.items
      : [];
    const cleanReference = reference.trim();
    updateReferencesContent(
      `${current}${makeReferenceParagraph(cleanReference)}`,
      [...currentItems, buildReferenceItem(cleanReference, sourceType, acceptedOld)]
    );
    toast.info('Remember to click Save Changes when you are done.');
  };

  const handleInsertCitation = () => {
    const author = citationDraft.author.trim();
    const year = citationDraft.year.trim();
    if (!author || !(/^(\d{4}[a-z]?|n\.d\.)$/i.test(year))) {
      toast.info('Enter an author or organization and a year, for example 2021 or n.d.');
      return;
    }

    const citation = `(${author}, ${year})`;
    if (!isEditing) {
      setIsEditing(true);
      setTemporaryContent(`${selectedContent}${selectedContent ? ' ' : ''}${citation}`);
    } else {
      setTemporaryContent(prev => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}${citation}`);
    }
    toast.success(`Inserted citation ${citation}`);
  };

  const handleAddReferencePlaceholder = (key: string) => {
    const placeholder = buildReferencePlaceholderFromKey(key);
    appendReference(placeholder, 'placeholder');
    toast.success(`Added a reference placeholder for ${key}.`);
  };

  const handleAddAllReferencePlaceholders = async () => {
    if (!missingReferenceKeys.length) {
      toast.success('All detected citations already have matching reference entries.');
      return;
    }

    const currentItems = Array.isArray(formData.chapters?.references?.items)
      ? formData.chapters.references.items
      : [];
    const nextItems = [
      ...currentItems,
      ...missingReferenceKeys.map((key) => buildReferenceItem(buildReferencePlaceholderFromKey(key), 'placeholder')),
    ];
    const nextReferences = {
      ...(formData.chapters?.references || {}),
      content: nextItems.map((item: any) => makeReferenceParagraph(item.reference)).join(''),
      items: nextItems,
    };
    const nextFormData = {
      ...formData,
      chapters: {
        ...formData.chapters,
        references: nextReferences,
      },
      progress: {
        ...formData.progress,
        references: 100,
      },
    };

    setFormData(nextFormData);
    await persistProjectFormData(nextFormData, `Added ${missingReferenceKeys.length} reference placeholder${missingReferenceKeys.length === 1 ? '' : 's'}.`);
    setSelectedSection('references');
    setSelectedComponent('content');
  };

  const handleRepairDocument = async () => {
    if (!projectId || !projectData) {
      toast.error("Project data is missing. Cannot repair the document.");
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      let cleanedCount = 0;
      const cleanedChapters: any = { ...(formData.chapters || {}) };

      Object.entries(formData.chapters || {}).forEach(([sectionKey, sectionData]: [string, any]) => {
        if (sectionKey === 'references' || sectionKey.startsWith('_')) return;
        if (!sectionData || typeof sectionData !== 'object' || Array.isArray(sectionData)) return;

        const cleanedSection: any = { ...sectionData };
        Object.entries(sectionData).forEach(([componentKey, value]) => {
          if (typeof value !== 'string') return;
          const cleaned = cleanSavedResearchContent(value);
          if (cleaned !== value) {
            cleanedSection[componentKey] = cleaned;
            cleanedCount += 1;
          }
        });
        cleanedChapters[sectionKey] = cleanedSection;
      });

      const currentItems = Array.isArray(formData.chapters?.references?.items)
        ? formData.chapters.references.items
        : referenceEntries.filter((item: any) => String(item.id).startsWith('legacy-'));
      const placeholderItems = missingReferenceKeys.map((key) =>
        buildReferenceItem(buildReferencePlaceholderFromKey(key), 'placeholder')
      );
      const nextItems = [...currentItems, ...placeholderItems];
      const nextReferences = {
        ...(formData.chapters?.references || {}),
        content: nextItems.map((item: any) => makeReferenceParagraph(item.reference)).join(''),
        items: nextItems,
      };
      const nextFormData = {
        ...formData,
        chapters: {
          ...cleanedChapters,
          references: nextReferences,
        },
        progress: {
          ...formData.progress,
          references: nextItems.length ? 100 : formData.progress?.references || 0,
        },
      };

      setFormData(nextFormData);
      await persistProjectFormData(
        nextFormData,
        `Repaired ${cleanedCount} section${cleanedCount === 1 ? '' : 's'} and added ${placeholderItems.length} reference placeholder${placeholderItems.length === 1 ? '' : 's'}.`
      );

      if (placeholderItems.length) {
        setSelectedSection('references');
        setSelectedComponent('content');
      }
    } catch (err: any) {
      console.error("Document repair failed:", err);
      setError(`Document repair failed: ${err?.message || "Unknown error"}`);
      toast.error(`Document repair failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddManualReference = () => {
    const reference = manualReference.trim();
    if (!reference || reference.length < 12) {
      toast.info('Paste or type the full APA reference first.');
      return;
    }
    appendReference(reference, 'manual');
    setManualReference('');
    toast.success('Manual reference added.');
  };

  const handleStartEditReference = (item: any) => {
    if (String(item.id).startsWith('legacy-')) {
      toast.info('Legacy references can be edited by adding a fresh manual reference, then deleting old text later.');
      return;
    }
    setEditingReferenceId(item.id);
    setEditingReferenceText(item.reference);
  };

  const handleSaveReferenceEdit = () => {
    const nextText = editingReferenceText.trim();
    if (!editingReferenceId || nextText.length < 12) {
      toast.info('Keep the full APA reference before saving.');
      return;
    }
    const currentItems = Array.isArray(formData.chapters?.references?.items)
      ? formData.chapters.references.items
      : [];
    syncReferenceItems(currentItems.map((item: any) => item.id === editingReferenceId
      ? { ...item, reference: nextText, year: getReferenceYear(nextText) }
      : item
    ));
    setEditingReferenceId(null);
    setEditingReferenceText('');
    toast.success('Reference updated.');
    toast.info('Remember to click Save Changes when you are done.');
  };

  const handleDeleteReference = (id: string) => {
    if (String(id).startsWith('legacy-')) {
      toast.info('This old reference is stored as plain text. Add structured references from now on for edit/delete controls.');
      return;
    }
    const currentItems = Array.isArray(formData.chapters?.references?.items)
      ? formData.chapters.references.items
      : [];
    syncReferenceItems(currentItems.filter((item: any) => item.id !== id));
    toast.success('Reference deleted.');
    toast.info('Remember to click Save Changes when you are done.');
  };

  const handleInsertCitationFromReference = (item: any) => {
    const author = String(item.reference || '').split(/[.(]/)[0]?.replace(/,\s*[A-Z].*$/, '').trim() || 'Source';
    const year = item.year || getReferenceYear(item.reference) || 'n.d.';
    setCitationDraft(prev => ({ ...prev, author, year }));
    const citation = `(${author}, ${year})`;
    if (!isEditing) {
      setIsEditing(true);
      setTemporaryContent(`${selectedContent}${selectedContent ? ' ' : ''}${citation}`);
    } else {
      setTemporaryContent(prev => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}${citation}`);
    }
    toast.success(`Inserted citation ${citation}`);
  };

  const handleLookupReference = async () => {
    const query = citationDraft.lookup.trim();
    if (!query) {
      toast.info('Paste a DOI, DOI URL, article title, or source title first.');
      return;
    }

    setIsLookingUpReference(true);
    try {
      const doi = extractDoi(query);
      const url = getUrlFromInput(query);

      if (url && !doi) {
        const webpage = makeWebpageReference(url);
        appendReference(webpage.reference, 'website');
        setCitationDraft(prev => ({ ...prev, author: webpage.author, year: webpage.year }));
        toast.success('Website reference draft added. Please edit the page title/date if needed.');
        return;
      }

      const endpoint = doi
        ? `https://api.crossref.org/works/${encodeURIComponent(doi)}`
        : `https://api.crossref.org/works?rows=1&query.bibliographic=${encodeURIComponent(query)}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Lookup failed with status ${response.status}`);
      const data = await response.json();
      const work = doi ? data.message : data.message?.items?.[0];
      if (!work) throw new Error('No matching source found.');
      if (!doi && !isPlausibleCrossrefMatch(query, work)) {
        throw new Error('Crossref returned a weak match. Try a DOI, DOI URL, or paste a more exact article title.');
      }

      const reference = formatCrossrefApa(work);
      appendReference(reference, doi ? 'doi' : 'crossref');
      setCitationDraft(prev => ({ ...prev, ...getCitationDraftFromWork(work) }));
      toast.success('Reference found and added. Citation fields are ready.');
    } catch (err: any) {
      console.error('Reference lookup failed:', err);
      toast.error(`Could not find source metadata. ${err?.message || 'Try a DOI or more exact title.'}`);
    } finally {
      setIsLookingUpReference(false);
    }
  };

  const tableFigureItems = Array.isArray(formData.chapters?._tableFigureRegister)
    ? formData.chapters._tableFigureRegister
    : [];

  const sourceItems = Array.isArray(formData.chapters?._sourcesLibrary)
    ? formData.chapters._sourcesLibrary
    : [];

  const syncSourceItems = (items: any[]) => {
    setFormData(prev => ({
      ...prev,
      chapters: {
        ...prev.chapters,
        _sourcesLibrary: items
      }
    }));
  };

  const handleSaveSource = () => {
    if (!sourceDraft.title.trim() && !sourceDraft.doi.trim() && !sourceDraft.url.trim() && !sourceDraft.apaReference.trim()) {
      toast.info('Add a title, DOI, URL, or APA reference first.');
      return;
    }
    const source = buildSourceItem(sourceDraft);
    syncSourceItems([source, ...sourceItems]);
    setSourceDraft({
      title: '',
      authors: '',
      year: '',
      sourceType: 'article',
      doi: '',
      url: '',
      apaReference: '',
      notes: '',
      intendedUse: sourceDraft.intendedUse
    });
    toast.success('Source saved to My Sources.');
    toast.info('Remember to click Save Changes when you are done.');
  };

  const handleDeleteSource = (id: string) => {
    syncSourceItems(sourceItems.filter((source: any) => source.id !== id));
    toast.info('Remember to click Save Changes when you are done.');
  };

  const handleAddSourceToReferences = (source: any) => {
    appendReference(source.apaReference || buildApaFromSource(source), source.sourceType, source.acceptedOld);
    toast.success('Source added to References.');
  };

  const handleInsertSourceCitation = (source: any) => {
    const citation = source.citationText || makeCitationText(source);
    if (!isEditing) {
      setIsEditing(true);
      setTemporaryContent(`${selectedContent}${selectedContent ? ' ' : ''}${citation}`);
    } else {
      setTemporaryContent(prev => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}${citation}`);
    }
    toast.success(`Inserted citation ${citation}`);
  };

  const copySearchString = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Search string copied.');
    } catch {
      toast.info(value);
    }
  };

  const toggleReferenceAcceptedOld = (id: string) => {
    const currentItems = Array.isArray(formData.chapters?.references?.items)
      ? formData.chapters.references.items
      : [];
    updateReferencesContent(
      formData.chapters?.references?.content || '',
      currentItems.map((item: any) => item.id === id ? { ...item, acceptedOld: !item.acceptedOld } : item)
    );
  };

  const handleAddTableFigure = () => {
    const title = assetDraft.title.trim();
    if (!title) {
      toast.info('Add a short table or figure title first.');
      return;
    }
    const sameTypeCount = tableFigureItems.filter((item: any) => item.type === assetDraft.type).length;
    const item = {
      id: crypto.randomUUID?.() || `${Date.now()}`,
      type: assetDraft.type,
      number: `${assetDraft.type} 4.${sameTypeCount + 1}`,
      title,
      objectiveKey: assetDraft.objectiveKey,
      note: assetDraft.note.trim(),
      imageName: assetDraft.imageName.trim()
    };
    setFormData(prev => ({
      ...prev,
      chapters: {
        ...prev.chapters,
        _tableFigureRegister: [...tableFigureItems, item]
      }
    }));
    setAssetDraft({ type: assetDraft.type, title: '', objectiveKey: assetDraft.objectiveKey, note: '', imageName: '' });
    toast.success(`${item.number} added.`);
    toast.info('Remember to click Save Changes when you are done.');
  };

  const handleRemoveTableFigure = (id: string) => {
    setFormData(prev => ({
      ...prev,
      chapters: {
        ...prev.chapters,
        _tableFigureRegister: tableFigureItems.filter((item: any) => item.id !== id)
      }
    }));
    toast.info('Remember to click Save Changes when you are done.');
  };

  const handleInsertAssetCaption = (item: any) => {
    const caption = item.rows?.length ? buildResultTableHtml(item) : buildAssetCaptionHtml(item);
    if (!isEditing) {
      setIsEditing(true);
      setTemporaryContent(`${selectedContent}${selectedContent ? '<p><br/></p>' : ''}${caption}`);
    } else {
      setTemporaryContent(prev => `${prev}${prev ? '<p><br/></p>' : ''}${caption}`);
    }
    toast.success(`${item.number} inserted into this section.`);
    editorPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateResultRow = (index: number, field: 'label' | 'frequency', value: string) => {
    setResultDraft(prev => ({
      ...prev,
      rows: prev.rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row)
    }));
  };

  const addResultRow = () => {
    setResultDraft(prev => ({
      ...prev,
      rows: [...prev.rows, { label: '', frequency: '' }]
    }));
  };

  const removeResultRow = (index: number) => {
    setResultDraft(prev => ({
      ...prev,
      rows: prev.rows.filter((_, rowIndex) => rowIndex !== index)
    }));
  };

  const handleApplyResultPaste = () => {
    const rows = resultPaste
      .split(/\n+/)
      .map((line) => line.split(/\t|,|;/).map((cell) => cell.trim()))
      .filter((cells) => cells[0] && cells[1])
      .map((cells) => ({ label: cells[0], frequency: cells[1].replace(/[^\d.]/g, '') }));
    if (rows.length < 2) {
      toast.info('Paste at least two rows like: Yes, 24');
      return;
    }
    setResultDraft(prev => ({ ...prev, rows }));
    setResultPaste('');
    toast.success('Pasted result rows applied.');
  };

  const resultRows = normalizeResultRows(resultDraft.rows);
  const resultTotal = resultRows.reduce((sum, row) => sum + row.frequency, 0);

  const handleAddResultItem = () => {
    const title = resultDraft.title.trim();
    if (!title) {
      toast.info('Add a short result title first.');
      return;
    }
    if (resultRows.length < 2 || resultTotal <= 0) {
      toast.info('Add at least two categories with frequencies greater than zero.');
      return;
    }

    const nextItems = [...tableFigureItems];
    const tableNumber = `Table 4.${nextItems.filter((item: any) => item.type === 'Table').length + 1}`;
    const interpretation = getResultInterpretation(resultRows, title);
    const tableItem = {
      id: crypto.randomUUID?.() || `${Date.now()}-table`,
      type: 'Table',
      number: tableNumber,
      title,
      objectiveKey: resultDraft.objectiveKey,
      note: interpretation,
      imageName: '',
      chartType: resultDraft.chartType,
      rows: resultRows,
      total: resultTotal
    };
    nextItems.push(tableItem);

    if (shouldCreateChartFigure(resultDraft.chartType)) {
      const figureNumber = `Figure 4.${nextItems.filter((item: any) => item.type === 'Figure').length + 1}`;
      nextItems.push({
        id: crypto.randomUUID?.() || `${Date.now()}-figure`,
        type: 'Figure',
        number: figureNumber,
        title: `${resultDraft.chartType.includes('pie') ? 'Pie chart' : 'Bar graph'} showing ${title.toLowerCase()}`,
        objectiveKey: resultDraft.objectiveKey,
        note: interpretation,
        imageName: '[[Chart will be inserted after final review]]',
        chartType: resultDraft.chartType.includes('pie') ? 'pie' : 'bar',
        rows: resultRows,
        total: resultTotal
      });
    }

    setFormData(prev => ({
      ...prev,
      chapters: {
        ...prev.chapters,
        _tableFigureRegister: nextItems
      }
    }));
    setResultDraft({
      title: '',
      objectiveKey: resultDraft.objectiveKey,
      chartType: resultDraft.chartType,
      rows: [
        { label: 'Yes', frequency: '' },
        { label: 'No', frequency: '' }
      ]
    });
    toast.success('Chapter 4 result added with percentages.');
    toast.info('Remember to click Save Changes when you are done.');
  };

  const getPageMeta = () => {
    const isPreliminary = selectedSection === 'preliminaryPages';
    const selectedLabel = selectedComponentMeta?.label || currentStep?.label || '';

    if (isPreliminary) {
      const prelimComponents = getComponentsForSection(structure.preliminaryPages);
      const prelimIndex = prelimComponents.findIndex((component) => component.id === selectedComponent);
      const isTitlePage = selectedComponent === 'titlePage';
      return {
        pageNumberKind: isTitlePage ? 'none' as const : 'roman' as const,
        pageNumber: isTitlePage || prelimIndex <= 0 ? undefined : toRoman(prelimIndex),
        sectionTitle: isTitlePage ? undefined : selectedLabel,
        isTitlePage,
        isPreliminary: true,
        continuesFromPrevious: false
      };
    }

    let wordsBefore = 0;
    for (const step of workflowSteps) {
      if (step.section === selectedSection && step.component === selectedComponent) break;
      if (step.section === 'preliminaryPages') continue;
      const content = getComponentContent(formData.chapters, step.section, step.component);
      wordsBefore += estimateWords(content);
    }

    const estimatedPage = Math.max(1, Math.floor(wordsBefore / 420) + 1);
    const continuesFromPrevious = wordsBefore > 0 && wordsBefore % 420 !== 0;
    const sectionData = structure[selectedSection as keyof typeof structure] as any;

    return {
      pageNumberKind: 'arabic' as const,
      pageNumber: String(estimatedPage),
      chapterTitle: selectedSection.startsWith('chapter') ? sectionData?.title : undefined,
      sectionTitle: selectedLabel,
      isTitlePage: false,
      isPreliminary: false,
      continuesFromPrevious
    };
  };

  const pageMeta = getPageMeta();
  const citationKeys = extractCitationKeysWide(
    Object.entries(formData.chapters || {})
      .filter(([section]) => section !== 'references')
      .flatMap(([, sectionData]: [string, any]) =>
        Object.values(sectionData || {}).filter((value) => typeof value === 'string')
      )
      .join(' ')
  );
  const documentArtifactItems = Object.entries(formData.chapters || {})
    .filter(([section]) => section !== 'references' && !section.startsWith('_'))
    .flatMap(([, sectionData]: [string, any]) =>
      Object.values(sectionData || {}).filter((value) => typeof value === 'string')
    )
    .filter((value: any) => hasDocumentArtifacts(value));
  const documentArtifactSections = Object.entries(formData.chapters || {})
    .filter(([section]) => section !== 'references' && !section.startsWith('_'))
    .flatMap(([section, sectionData]: [string, any]) => {
      if (!sectionData || typeof sectionData !== 'object' || Array.isArray(sectionData)) return [];
      return Object.entries(sectionData)
        .filter(([, value]) => typeof value === 'string' && hasDocumentArtifacts(value))
        .map(([component]) => {
          const componentMeta = getComponentsForSection((structure as any)[section])?.find((item) => item.id === component);
          return `${getSectionLabel(section)}: ${componentMeta?.label || component}`;
        });
    });
  const documentArtifactCount = documentArtifactItems.length;
  const referencesText = stripHtml(formData.chapters?.references?.content || '');
  const referenceItems = Array.isArray(formData.chapters?.references?.items)
    ? formData.chapters.references.items
    : [];
  const parsedReferenceEntries = parseReferenceEntries(formData.chapters?.references?.content || '');
  const referenceEntries = referenceItems.length
    ? referenceItems
    : parsedReferenceEntries.map((entry, index) => ({
        id: `legacy-${index}`,
        reference: entry,
        sourceType: 'legacy',
        acceptedOld: false,
        year: getReferenceYear(entry)
      }));
  const oldReferenceEntries = referenceEntries.filter((item: any) => {
    const year = Number(item.year || getReferenceYear(item.reference));
    return year && year < new Date().getFullYear() - 10 && !item.acceptedOld;
  });
  const missingReferenceKeys = citationKeys.filter((key) => {
    const { author, year } = splitCitationKey(key);
    return !(referencesText.toLowerCase().includes(author.toLowerCase()) && referencesText.includes(year));
  });
  const selectedSectionLabel = selectedComponentMeta?.label || getSectionLabel(selectedSection);
  const evidenceSearchStrings = generateEvidenceSearchStrings(formData.title || projectData?.title || '', selectedSectionLabel);
  const documentChecks = runUhpabChecks(projectData, formData, citationKeys, missingReferenceKeys, oldReferenceEntries, tableFigureItems);
  const checkSummary = {
    passed: documentChecks.filter((check) => check.status === 'Passed').length,
    attention: documentChecks.filter((check) => check.status === 'Needs attention').length,
    missing: documentChecks.filter((check) => check.status === 'Missing').length
  };
  const showEvidenceTools = ['chapter1', 'chapter2', 'chapter3', 'chapter5', 'references'].includes(selectedSection);
  const showSpecialSupportTools = selectedSection === 'references' || (selectedSection === 'chapter4' && projectData?.type === 'report');
  const shouldShowSupportPanel = showSpecialSupportTools || (showEvidenceTools && supportPanelOpen);

  return (
    <DashboardLayout>
      <WorkspacePage width="wide" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="h-auto border-none bg-transparent px-0 text-2xl font-bold shadow-none hover:bg-muted/20 focus-visible:ring-0 sm:text-3xl"
              />
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{projectData?.type === 'proposal' ? 'Research Proposal' : 'Final Report'}</span>
                <span>-</span>
                <span>Overall Progress: {getAverageProgress()}%</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            {(documentArtifactCount > 0 || missingReferenceKeys.length > 0) && (
              <Button variant="outline" onClick={handleRepairDocument} disabled={isSaving || isDownloading} className="gap-2 bg-white">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand className="h-4 w-4" />}
                Repair document
              </Button>
            )}
            <Button variant="outline" onClick={() => handleDownload('docx')} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing DOCX...
                </>
              ) : (
                <>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Download DOCX
                </>
              )}
            </Button>
            
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? 'Saving...' : 'Save Changes'}
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isDownloading && (
          <OperationProgress
            title={`Preparing editable ${downloadFormat.toUpperCase()}`}
            stage={downloadStatus || 'Starting document preparation'}
            value={downloadProgress}
            steps={projectDownloadSteps}
          />
        )}

        {lastDownload && (
          <Alert>
            <DownloadIcon className="h-4 w-4" />
            <AlertTitle>Download ready</AlertTitle>
            <AlertDescription>
              If the file did not save automatically, click this link:
              {' '}
              <a href={lastDownload.url} download={lastDownload.fileName} className="font-medium text-primary underline">
                {lastDownload.fileName}
              </a>
            </AlertDescription>
          </Alert>
        )}

        {documentArtifactCount > 0 && (
          <Alert>
            <Wand className="h-4 w-4" />
            <AlertTitle>Document cleanup needed</AlertTitle>
            <AlertDescription>
              {documentArtifactCount} section{documentArtifactCount === 1 ? '' : 's'} contain{documentArtifactCount === 1 ? 's' : ''} raw markdown, diagram lines, or export artifacts.
              {documentArtifactSections.length ? ` Check ${documentArtifactSections.slice(0, 3).join('; ')}${documentArtifactSections.length > 3 ? ` and ${documentArtifactSections.length - 3} more` : ''}.` : ''}
              {' '}Use repair before downloading the final document.
            </AlertDescription>
            <div className="mt-3">
              <Button type="button" size="sm" className="gap-2" onClick={handleRepairDocument} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand className="h-4 w-4" />}
                Clean document formatting
              </Button>
            </div>
          </Alert>
        )}

        {(selectedSection === 'references' || missingReferenceKeys.length > 0) && (
          <Alert>
            <BookText className="h-4 w-4" />
            <AlertTitle>Reference tracker</AlertTitle>
            <AlertDescription>
              {citationKeys.length === 0 ? (
                'No APA-style citations detected yet. As students write citations like (WHO, 2021), they will appear here.'
              ) : missingReferenceKeys.length === 0 ? (
                `Detected ${citationKeys.length} citation${citationKeys.length === 1 ? '' : 's'} and every one appears to have a matching reference entry.`
              ) : (
                <>
                  Detected {citationKeys.length} citation{citationKeys.length === 1 ? '' : 's'}. Missing reference entries for:{' '}
                  <span className="font-medium">{missingReferenceKeys.slice(0, 8).join(', ')}</span>
                  {missingReferenceKeys.length > 8 ? ` and ${missingReferenceKeys.length - 8} more` : ''}.
                </>
              )}
            </AlertDescription>
            {missingReferenceKeys.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button type="button" size="sm" className="gap-2" onClick={handleAddAllReferencePlaceholders}>
                  <BookText className="h-4 w-4" />
                  Add all missing reference placeholders
                </Button>
                <Button type="button" size="sm" variant="outline" className="gap-2 bg-white" onClick={() => selectComponent('references', 'content')}>
                  Open References
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Alert>
        )}

        {!shouldShowSupportPanel && showEvidenceTools && (
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Need sources for this section?</p>
              <p className="text-sm text-muted-foreground">
                Keep writing first, or open evidence search and source tools when you are ready to add citations.
              </p>
            </div>
            <Button variant="outline" className="gap-2 bg-white" onClick={() => setSupportPanelOpen(true)}>
              <Search className="h-4 w-4" />
              Open evidence tools
            </Button>
          </div>
        )}

        <div className={cn(
          "grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]",
          !shouldShowSupportPanel && "hidden",
          selectedSection === 'chapter4' && projectData?.type !== 'report' && "hidden"
        )}>
          <div className="hidden xl:block" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {selectedSection === 'references'
                ? 'APA tools appear here only while you are working on References.'
                : selectedSection === 'chapter4'
                  ? 'Tables, charts, and result helpers appear here only while you are working on Chapter 4.'
                  : 'Evidence tools appear here only while you are writing sections that need sources.'}
            </p>
          <Accordion
            type="multiple"
            key={selectedSection}
            defaultValue={
              selectedSection === 'references'
                ? ['sources-library', 'references-manager']
                : selectedSection === 'chapter4'
                  ? ['results-helper', 'table-figure-manager']
                  : ['evidence-search']
            }
            className="space-y-3"
          >
          <AccordionItem value="evidence-search" className={cn("rounded-lg border bg-card px-4", !showEvidenceTools && "hidden")}>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Find evidence for this section
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="font-medium">Search strings</p>
                    <p className="text-xs text-muted-foreground">Copy one into Google Scholar, PubMed, or another source database.</p>
                    <div className="mt-3 space-y-2">
                      {evidenceSearchStrings.map((query) => (
                        <div key={query} className="flex items-center justify-between gap-2 rounded-md border bg-white p-2 text-sm">
                          <span className="line-clamp-2">{query}</span>
                          <Button size="sm" variant="outline" onClick={() => copySearchString(query)}>
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="font-medium">UHPAB checker</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700">{checkSummary.passed} passed</span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-800">{checkSummary.attention} attention</span>
                      <span className="rounded-full bg-destructive/10 px-2 py-1 font-medium text-destructive">{checkSummary.missing} missing</span>
                    </div>
                    <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {documentChecks.filter((check) => check.status !== 'Passed').slice(0, 8).map((check) => (
                        <div key={`${check.section}-${check.label}`} className="rounded-md border bg-white p-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{check.label}</span>
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", check.status === 'Missing' ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-800")}>{check.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{check.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-white/70 p-3 dark:bg-card/70">
                  <p className="font-medium">Save a source</p>
                  <p className="text-xs text-muted-foreground">Paste article/PDF details now; full PDF chat can plug into this same library later.</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <Input value={sourceDraft.title} onChange={(event) => setSourceDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="Title" />
                    <Input value={sourceDraft.authors} onChange={(event) => setSourceDraft(prev => ({ ...prev, authors: event.target.value }))} placeholder="Authors or organization" />
                    <Input value={sourceDraft.year} onChange={(event) => setSourceDraft(prev => ({ ...prev, year: event.target.value.replace(/[^\d]/g, '').slice(0, 4) }))} placeholder="Year" />
                    <Select value={sourceDraft.sourceType} onValueChange={(value) => setSourceDraft(prev => ({ ...prev, sourceType: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sourceTypeOptions.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={sourceDraft.doi} onChange={(event) => setSourceDraft(prev => ({ ...prev, doi: event.target.value }))} placeholder="DOI, optional" />
                    <Input value={sourceDraft.url} onChange={(event) => setSourceDraft(prev => ({ ...prev, url: event.target.value }))} placeholder="URL, optional" />
                    <Select value={sourceDraft.intendedUse} onValueChange={(value) => setSourceDraft(prev => ({ ...prev, intendedUse: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sourceUseOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={sourceDraft.notes} onChange={(event) => setSourceDraft(prev => ({ ...prev, notes: event.target.value }))} placeholder="Key finding or note" />
                    <Textarea className="md:col-span-2" value={sourceDraft.apaReference} onChange={(event) => setSourceDraft(prev => ({ ...prev, apaReference: event.target.value }))} placeholder="APA reference if you already have it" />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button onClick={handleSaveSource} className="gap-2">
                      <Library className="h-4 w-4" />
                      Save to My Sources
                    </Button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sources-library" className={cn("rounded-lg border bg-card px-4", !showEvidenceTools && "hidden")}>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Library className="h-4 w-4" />
                My Sources
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {sourceItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sources saved yet. Save articles, websites, PDFs, and guideline sources here as you work.</p>
              ) : (
                <div className="grid gap-2 lg:grid-cols-2">
                  {sourceItems.map((source: any) => (
                    <div key={source.id} className="rounded-lg border bg-white/70 p-3 text-sm dark:bg-card/70">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{source.title}</p>
                          <p className="text-xs text-muted-foreground">{source.authors || 'Unknown author'} • {source.year || 'n.d.'} • {source.sourceType}</p>
                        </div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{sourceUseOptions.find((option) => option.value === source.intendedUse)?.label || 'Other'}</span>
                      </div>
                      {source.notes && <p className="mt-2 text-xs">{source.notes}</p>}
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{source.apaReference}</p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleInsertSourceCitation(source)}>
                          <Quote className="mr-1 h-3 w-3" />
                          Cite
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleAddSourceToReferences(source)}>
                          <BookText className="mr-1 h-3 w-3" />
                          Add reference
                        </Button>
                        {source.url && (
                          <Button size="sm" variant="ghost" onClick={() => window.open(source.url, '_blank')}>
                            <LinkIcon className="mr-1 h-3 w-3" />
                            Open
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteSource(source.id)}>
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="references-manager" className={cn("rounded-lg border bg-card px-4", selectedSection !== 'references' && "hidden")}>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <BookText className="h-4 w-4" />
                References manager
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <Quote className="h-4 w-4 text-primary" />
                      Insert citation
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={citationDraft.author}
                        onChange={(event) => setCitationDraft(prev => ({ ...prev, author: event.target.value }))}
                        placeholder="WHO or Ministry of Health"
                      />
                      <Input
                        value={citationDraft.year}
                        onChange={(event) => setCitationDraft(prev => ({ ...prev, year: event.target.value }))}
                        placeholder="2021 or n.d."
                      />
                      <Button onClick={handleInsertCitation} className="w-full gap-2">
                        <Quote className="h-4 w-4" />
                        Insert citation
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <Search className="h-4 w-4 text-primary" />
                      Lookup source
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={citationDraft.lookup}
                        onChange={(event) => setCitationDraft(prev => ({ ...prev, lookup: event.target.value }))}
                        placeholder="DOI, website URL, or exact title"
                      />
                      <Button variant="outline" onClick={handleLookupReference} disabled={isLookingUpReference} className="w-full gap-2">
                        {isLookingUpReference ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        Lookup source
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Websites become safe APA drafts. Weak article matches are rejected.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <BookText className="h-4 w-4 text-primary" />
                      Add manual reference
                    </div>
                    <div className="space-y-2">
                      <Textarea
                        value={manualReference}
                        onChange={(event) => setManualReference(event.target.value)}
                        placeholder="Paste the full APA reference here"
                        className="min-h-[92px]"
                      />
                      <Button variant="outline" onClick={handleAddManualReference} className="w-full gap-2">
                        <Plus className="h-4 w-4" />
                        Add manual reference
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border bg-white/70 p-3 text-sm dark:bg-card/70">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">
                      {citationKeys.length} citations detected
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-800">
                      {missingReferenceKeys.length} missing references
                    </span>
                    <span className="rounded-full bg-destructive/10 px-2 py-1 font-medium text-destructive">
                      {oldReferenceEntries.length} older than 10 years
                    </span>
                  </div>
                  {missingReferenceKeys.length > 0 && (
                    <div className="space-y-2">
                      <Button size="sm" className="w-full gap-2" onClick={handleAddAllReferencePlaceholders}>
                        <BookText className="h-4 w-4" />
                        Add all missing placeholders
                      </Button>
                      {missingReferenceKeys.slice(0, 6).map((key) => (
                        <div key={key} className="flex items-center justify-between gap-2 rounded-md border p-2">
                          <span>{key}</span>
                          <Button size="sm" variant="outline" onClick={() => handleAddReferencePlaceholder(key)}>
                            Add placeholder
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {oldReferenceEntries.length > 0 && (
                    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                      <p className="font-medium">Check older sources before submission.</p>
                      {oldReferenceEntries.slice(0, 3).map((item: any) => (
                        <div key={item.id} className="flex items-start justify-between gap-2 rounded-md bg-white/70 p-2">
                          <span className="line-clamp-2">{item.reference}</span>
                          {!String(item.id).startsWith('legacy-') && (
                            <Button size="sm" variant="outline" onClick={() => toggleReferenceAcceptedOld(item.id)}>
                              Accept
                            </Button>
                          )}
                        </div>
                      ))}
                      {oldReferenceEntries.length > 3 ? <p>And {oldReferenceEntries.length - 3} more older source(s).</p> : null}
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="font-medium">Saved references</p>
                    {referenceEntries.length === 0 ? (
                      <p className="text-muted-foreground">No references saved yet.</p>
                    ) : (
                      referenceEntries.slice(0, 8).map((item: any) => (
                        <div key={item.id} className="rounded-md border p-2">
                          {editingReferenceId === item.id ? (
                            <div className="space-y-2">
                              <Textarea value={editingReferenceText} onChange={(event) => setEditingReferenceText(event.target.value)} />
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" onClick={handleSaveReferenceEdit}>Save reference</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingReferenceId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="line-clamp-3">{item.reference}</p>
                              <div className="flex flex-wrap gap-1">
                                <Button size="sm" variant="outline" onClick={() => handleInsertCitationFromReference(item)}>
                                  <Quote className="mr-1 h-3 w-3" />
                                  Cite
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleStartEditReference(item)}>
                                  <Pencil className="mr-1 h-3 w-3" />
                                  Edit
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => toggleReferenceAcceptedOld(item.id)} disabled={String(item.id).startsWith('legacy-')}>
                                  {item.acceptedOld ? 'Unmark old' : 'Accept old'}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteReference(item.id)}>
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="results-helper" className={cn("rounded-lg border bg-card px-4", selectedSection !== 'chapter4' && "hidden")}>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Chapter 4 results/data helper
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <div className="grid gap-2 lg:grid-cols-[1fr_190px_190px]">
                    <Input
                      value={resultDraft.title}
                      onChange={(event) => setResultDraft(prev => ({ ...prev, title: event.target.value }))}
                      placeholder="Result title e.g. Respondents' knowledge about malaria prevention"
                    />
                    <Select value={resultDraft.objectiveKey} onValueChange={(value) => setResultDraft(prev => ({ ...prev, objectiveKey: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {chapter4ObjectiveOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={resultDraft.chartType} onValueChange={(value) => setResultDraft(prev => ({ ...prev, chartType: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="table">Table only</SelectItem>
                        <SelectItem value="bar">Bar graph</SelectItem>
                        <SelectItem value="pie">Pie chart</SelectItem>
                        <SelectItem value="table-bar">Table + bar graph</SelectItem>
                        <SelectItem value="table-pie">Table + pie chart</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-3 rounded-md border bg-white p-2">
                      <p className="text-xs font-medium text-muted-foreground">Paste from Excel/CSV</p>
                      <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_auto]">
                        <Textarea
                          value={resultPaste}
                          onChange={(event) => setResultPaste(event.target.value)}
                          placeholder={'Yes, 24\nNo, 6'}
                          className="min-h-[70px]"
                        />
                        <Button variant="outline" onClick={handleApplyResultPaste}>Apply rows</Button>
                      </div>
                    </div>
                    <div className="mb-2 grid grid-cols-[1fr_120px_90px_40px] gap-2 text-xs font-medium text-muted-foreground">
                      <span>Category</span>
                      <span>Frequency</span>
                      <span>%</span>
                      <span />
                    </div>
                    <div className="space-y-2">
                      {resultDraft.rows.map((row, index) => {
                        const calculated = resultRows.find((item) => item.label === row.label.trim());
                        return (
                          <div key={index} className="grid grid-cols-[1fr_120px_90px_40px] gap-2">
                            <Input value={row.label} onChange={(event) => updateResultRow(index, 'label', event.target.value)} placeholder="Yes" />
                            <Input value={row.frequency} onChange={(event) => updateResultRow(index, 'frequency', event.target.value.replace(/[^\d.]/g, ''))} placeholder="24" />
                            <div className="flex items-center rounded-md border bg-white px-2 text-sm">
                              {calculated ? `${calculated.percentage}%` : '-'}
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => removeResultRow(index)} disabled={resultDraft.rows.length <= 2}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Total respondents: <strong>{resultTotal}</strong></span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={addResultRow}>
                          <Plus className="mr-1 h-3 w-3" />
                          Add row
                        </Button>
                        <Button size="sm" onClick={handleAddResultItem}>
                          Add result to Chapter 4
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-white/70 p-3 dark:bg-card/70">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">Preview</p>
                      <p className="text-xs text-muted-foreground">{resultRows.length ? getResultInterpretation(resultRows, resultDraft.title || 'this result') : 'Enter rows to preview charts.'}</p>
                    </div>
                    {resultDraft.chartType.includes('pie') ? <PieChartIcon className="h-5 w-5 text-primary" /> : <BarChart3 className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="h-64 rounded-md border bg-white p-2">
                    {resultRows.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No chart data yet</div>
                    ) : resultDraft.chartType.includes('pie') ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={resultRows} dataKey="frequency" nameKey="label" outerRadius={82} label={(entry) => `${entry.label} ${entry.percentage}%`}>
                            {resultRows.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={resultRows}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis allowDecimals={false} />
                          <RechartsTooltip />
                          <Bar dataKey="frequency" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="table-figure-manager" className={cn("rounded-lg border bg-card px-4", selectedSection !== 'chapter4' && "hidden")}>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <TableProperties className="h-4 w-4" />
                Tables, figures and pictures
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="mb-3 text-sm text-muted-foreground">
                    Register Chapter 4 tables, figures, and result pictures here first. The list page and DOCX captions will use the same numbers.
                  </p>
                <div className="grid gap-2 lg:grid-cols-[130px_190px_1fr]">
                  <Select value={assetDraft.type} onValueChange={(value) => setAssetDraft(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Table">Table</SelectItem>
                      <SelectItem value="Figure">Figure</SelectItem>
                      <SelectItem value="Picture">Picture</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={assetDraft.objectiveKey} onValueChange={(value) => setAssetDraft(prev => ({ ...prev, objectiveKey: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {chapter4ObjectiveOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={assetDraft.title}
                    onChange={(event) => setAssetDraft(prev => ({ ...prev, title: event.target.value }))}
                    placeholder="Title e.g. Demographic characteristics of respondents"
                  />
                </div>
                <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_220px_auto]">
                  <Input
                    value={assetDraft.note}
                    onChange={(event) => setAssetDraft(prev => ({ ...prev, note: event.target.value }))}
                    placeholder="Short interpretation note, optional"
                  />
                  <Input
                    value={assetDraft.imageName}
                    onChange={(event) => setAssetDraft(prev => ({ ...prev, imageName: event.target.value }))}
                    placeholder="Image/result file name, optional"
                  />
                  <Button onClick={handleAddTableFigure} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add item
                  </Button>
                </div>
                </div>
                {tableFigureItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No Chapter 4 tables or figures registered yet.</p>
                ) : (
                  <div className="space-y-2">
                    {tableFigureItems.map((item: any) => (
                      <div key={item.id} className="rounded-md border bg-white/70 p-3 text-sm dark:bg-card/70">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p><strong>{item.number}:</strong> {item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {chapter4ObjectiveOptions.find((option) => option.value === item.objectiveKey)?.label || 'Chapter 4'}
                              {item.imageName ? ` • Placeholder: ${item.imageName}` : ''}
                            </p>
                            {item.note && <p className="mt-1 text-xs">{item.note}</p>}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleInsertAssetCaption(item)}>
                              Insert caption
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveTableFigure(item.id)} title="Remove">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
          </Accordion>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          {/* Left Sidebar - Section Navigation */}
          <div className="xl:sticky xl:top-24 xl:self-start">
            <ScrollArea className="h-auto xl:h-[calc(100vh-8rem)]">
              <div className="space-y-5 pr-1 xl:pr-4">
                <GlassmorphismCard>
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">Research roadmap</h2>
                        <p className="text-xs text-muted-foreground">
                          Follow the document from the first page. Some preliminary lists are reviewed now and finished later.
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {getAverageProgress()}%
                      </span>
                    </div>
                  </div>
                </GlassmorphismCard>

                {/* Recently Edited */}
                {recentSections.length > 0 && (
                  <GlassmorphismCard>
                    <div className="p-4">
                      <h3 className="font-medium flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4" />
                        Recently Edited
                      </h3>
                      <div className="space-y-1">
                        {recentSections.map((item, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            className="w-full justify-start text-sm"
                            onClick={() => {
                              selectComponent(item.section, item.component);
                            }}
                          >
                            <div className="truncate">
                              <div className="font-medium">{item.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {getSectionLabel(item.section)}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </GlassmorphismCard>
                )}

                {/* Section Navigation */}
                <div className="space-y-3">
                  {getWorkflowOrder(projectData?.type || 'proposal')
                    .filter((section) => structure[section as keyof typeof structure])
                    .map((section) => {
                    const data = structure[section as keyof typeof structure] as any;
                    const components = getComponentsForSection(data);
                    return renderSectionCard(section, components);
                  })}
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Main Content Area */}
          <div ref={editorPanelRef} className="min-w-0 scroll-mt-24">
            <GlassmorphismCard className="overflow-hidden">
              <div className="border-b p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{getSectionLabel(selectedSection)}</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>{sectionComponents.find(c => c.id === selectedComponent)?.label}</span>
                </div>
              </div>
              <div className="p-6 relative min-h-[400px]">
                {isGenerating ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <ProjectEditorContent
                    isEditing={isEditing}
                    startEditing={handleStartEditing}
                    cancelEditing={handleCancelEditing}
                    saveContent={() => {
                      handleSaveContent();
                      addToRecent(
                        selectedSection,
                        selectedComponent,
                        sectionComponents.find(c => c.id === selectedComponent)?.label || ''
                      );
                    }}
                    temporaryContent={temporaryContent}
                    setTemporaryContent={setTemporaryContent}
                    improveWithAI={isCurrentComponentAutoFilled ? () => toast.info('This page is prefilled from your profile and the DOCX template.') : handleImproveWithAI}
                    label={selectedComponentMeta?.label || ''}
                    description={
                      isCurrentComponentAutoFilled
                        ? `${selectedComponentMeta?.description || ''} This page is mostly auto-filled from the title, profile, school, HTIN, and signature placeholders.`
                        : selectedComponentMeta?.description || ''
                    }
                    currentValue={selectedContent}
                    allowAI={!isCurrentComponentAutoFilled}
                    aiActions={
                      selectedSection === 'references'
                        ? []
                        : selectedSection === 'chapter4'
                          ? [
                              { id: 'draft', label: 'Draft starter' },
                              { id: 'interpret', label: 'Interpret result' },
                              { id: 'academic', label: 'Make academic' },
                              { id: 'humanize', label: 'Human review' },
                              { id: 'uhpab', label: 'Check UHPAB' }
                            ]
                          : [
                              { id: 'draft', label: 'Draft starter' },
                              { id: 'improve', label: 'Improve' },
                              { id: 'academic', label: 'Make academic' },
                              { id: 'humanize', label: 'Human review' },
                              { id: 'shorten', label: 'Shorten' },
                              { id: 'uhpab', label: 'Check UHPAB' }
                            ]
                    }
                    stepLabel={
                      currentStep
                        ? `Step ${currentStepIndex + 1} of ${workflowSteps.length}`
                        : undefined
                    }
                    canPrevious={canPreviousStep}
                    canNext={canNextStep}
                    onPrevious={() => goToWorkflowStep(currentStepIndex - 1)}
                    onNext={() => goToWorkflowStep(currentStepIndex + 1)}
                    onSaveAndNext={handleSaveAndNext}
                    isAutoFilled={isCurrentComponentAutoFilled}
                    isDeferredFinalPage={!!currentStep?.deferred}
                    onInsertCitation={handleInsertCitation}
                    pageMeta={pageMeta}
                  />
                )}
              </div>
            </GlassmorphismCard>
          </div>
        </div>
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default ProjectEdit;
