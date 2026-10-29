import { getDocumentMarkingGuide, MARKING_RUBRIC_VERSION } from '@/data/markingGuide';
import { extractDocumentText } from '@/lib/documentTextExtraction';
import { applyUserSelectedSection } from '@/lib/documentSectionDetection';
import { scoreMarkingGuideSections } from '@/lib/markingGuideScoring';
import { markResearchStrictly } from '@/lib/strictResearchMarking';
import { generateContent } from '@/integrations/gemini';
import { getBrowserGeminiApiKey } from '@/lib/aiKeys';
import { generateDetailedReport } from './documentAnalysis/exportReport';
import type { AnalysisResult, DocumentType, RubricScore } from './documentAnalysis/types';

export type { AnalysisResult, DetailedIssue, DocumentType, ExportFormat } from './documentAnalysis/types';
export { generateDetailedReport };

export interface MarkingOptions {
  mode?: 'strict' | 'structural';
  externalProcessingConfirmed?: boolean;
  identities?: string[];
  onProgress?: (done: number, total: number, section: string) => void;
}

export const analyzeDocument = async (file: File, documentType: DocumentType, component: string, options: MarkingOptions = {}): Promise<AnalysisResult> => {
  const guide = getDocumentMarkingGuide(documentType).filter(section => component === 'full' || section.id === component.toLowerCase());
  if (!guide.length) throw new Error('Choose a valid marking-guide area for this document type.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Use a document smaller than 25 MB.');
  const extracted = await extractDocumentText(file);
  extracted.chunks = applyUserSelectedSection(extracted.chunks, component.toLowerCase());
  if (extracted.characterCount < 100 || extracted.wordCount < 20) throw new Error('The document has too little readable text to mark. Upload a text-based PDF or DOCX, or paste its text. Scanned pages need OCR first.');
  if (extracted.pageCount && extracted.pageCount > 100) throw new Error('Upload up to 100 pages or review a chapter separately.');
  let rubricScore: RubricScore;
  if (options.mode === 'strict') {
    if (!options.externalProcessingConfirmed) throw new Error('Confirm that this document is non-confidential and may be sent to Gemini before requesting examiner review.');
    if (!getBrowserGeminiApiKey()) throw new Error('Add your personal Gemini key in Settings before examiner review.');
    rubricScore = await markResearchStrictly(extracted, guide, generateContent, { ...options, documentType });
  } else {
    const structure = scoreMarkingGuideSections(extracted, guide);
    // Structural evidence is a checklist, never an academic-quality award.
    rubricScore = {
      ...structure, awarded: 0, rubricVersion: MARKING_RUBRIC_VERSION, assessmentMode: 'structural', provisional: true,
      sections: structure.sections.map(section => ({ ...section, awarded: 0, criteria: section.criteria.map(criterion => ({ ...criterion, awarded: 0, status: 'missing' as const, assessmentState: 'unassessable' as const, found: criterion.evidenceSnippet ? [criterion.evidenceSnippet] : [], missing: ['Substantive quality has not been reviewed.'], improvements: ['Run the strict examiner review on material eligible for external processing.'], guidance: 'Structural evidence only. No quality marks have been awarded.' })) })),
    };
  }
  const weak = rubricScore.sections.flatMap(section => section.criteria.filter(criterion => criterion.status !== 'met').map(criterion => ({ section, criterion })));
  return {
    matchedGuidelines: rubricScore.awarded,
    totalGuidelines: rubricScore.total,
    rubricScore,
    issues: weak.map(({ section, criterion }) => `${section.title}: ${(criterion.missing || [criterion.guidance]).join(' ')}`),
    detailedIssues: weak.map(({ section, criterion }) => ({ section: section.title, issue: (criterion.missing || [criterion.guidance]).join(' '), severity: criterion.awarded === 0 ? 'high' : 'medium', guideline: `${MARKING_RUBRIC_VERSION}: ${criterion.awarded}/${criterion.marks}`, suggestion: (criterion.improvements || [criterion.guidance]).join(' ') })),
    suggestions: weak.slice(0, 5).map(({ criterion }) => (criterion.improvements || [criterion.guidance]).join(' ')),
  };
};
