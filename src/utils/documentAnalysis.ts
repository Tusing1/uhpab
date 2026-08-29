
/**
 * Utility functions for document analysis against UHPAB guidelines
 */

import { proposalStructure, reportStructure } from '@/data/uhpabGuidelines';
import { getMarkingGuideSection, reportMarkingGuide, type MarkingGuideSection } from '@/data/markingGuide';
import { extractDocumentText, type ExtractedDocumentText } from '@/lib/documentTextExtraction';
import { scoreMarkingGuideSections } from '@/lib/markingGuideScoring';
import { getSuggestionForIssue } from './documentAnalysis/suggestionHelpers';
import { generateDetailedReport } from './documentAnalysis/exportReport';
import type {
  AnalysisResult,
  DetailedIssue,
  DocumentType,
  ExportFormat,
  RubricScore,
} from './documentAnalysis/types';

// Re-export the types for use elsewhere
export type { AnalysisResult, DetailedIssue, DocumentType, ExportFormat };

export const analyzeDocument = async (
  file: File,
  documentType: DocumentType,
  componentToAnalyze: string
): Promise<AnalysisResult> => {
  console.log(`Analyzing document: ${file.name} as ${documentType}, component: ${componentToAnalyze}`);
  
  const normalizedComponent = componentToAnalyze.toLowerCase();
  const proposalRubricSectionIds = new Set([
    'preliminary',
    'introduction',
    'literature',
    'methodology',
    'references',
    'appendices',
  ]);
  const selectedRubricSections =
    normalizedComponent === 'full'
      ? documentType === 'proposal'
        ? reportMarkingGuide.filter((section) => proposalRubricSectionIds.has(section.id))
        : reportMarkingGuide
      : [getMarkingGuideSection(normalizedComponent)].filter(
          (section): section is MarkingGuideSection =>
            Boolean(section) && (documentType === 'report' || proposalRubricSectionIds.has(section.id))
        );
  
  let extractedDocument: ExtractedDocumentText | null = null;
  try {
    const extracted = await extractDocumentText(file);
    extractedDocument = extracted;
  } catch (error) {
    console.warn('Document text extraction failed; falling back to limited metadata analysis.', error);
  }
  
  // --- Section: Get UHPAB guideline requirements
  let guidelineRequirements: string[] | undefined = undefined;
  let requirementsSourceTitle: string | undefined = undefined;
  {
    const structure = documentType === 'report' ? reportStructure : proposalStructure;
    for (const sectionKey in structure) {
      const section = structure[sectionKey];
      if (section.sections) {
        for (const compKey in section.sections) {
          const comp = section.sections[compKey];
          if (
            compKey.toLowerCase() === componentToAnalyze.toLowerCase() ||
            (comp.title && comp.title.toLowerCase().includes(componentToAnalyze.toLowerCase()))
          ) {
            guidelineRequirements = comp.requirements;
            requirementsSourceTitle = comp.title;
            break;
          }
        }
      }
    }
  }

  // --- Existing guideline adjustments
  // Generate results based on the component being analyzed
  const guideline = normalizedComponent;
  let totalGuidelines = 12;
  let matchedGuidelines = 7;
  
  // Adjust guidelines based on document type and component
  if (documentType === 'proposal') {
    if (guideline.includes('chapter 1') || guideline.includes('introduction')) {
      totalGuidelines = 15;
      matchedGuidelines = 10;
    } else if (guideline.includes('chapter 2') || guideline.includes('literature')) {
      totalGuidelines = 18;
      matchedGuidelines = 13;
    } else if (guideline.includes('chapter 3') || guideline.includes('methodology')) {
      totalGuidelines = 14;
      matchedGuidelines = 9;
    } else if (guideline.includes('appendices')) {
      totalGuidelines = 8;
      matchedGuidelines = 6;
    } else if (guideline.includes('references')) {
      totalGuidelines = 10;
      matchedGuidelines = 7;
    }
  } else if (documentType === 'report') {
    if (guideline.includes('abstract')) {
      totalGuidelines = 10;
      matchedGuidelines = 7;
    } else if (guideline.includes('chapter 1')) {
      totalGuidelines = 15;
      matchedGuidelines = 10;
    } else if (guideline.includes('chapter 2')) {
      totalGuidelines = 18;
      matchedGuidelines = 13;
    } else if (guideline.includes('chapter 3')) {
      totalGuidelines = 14;
      matchedGuidelines = 9;
    } else if (guideline.includes('chapter 4') || guideline.includes('results')) {
      totalGuidelines = 16;
      matchedGuidelines = 11;
    } else if (guideline.includes('chapter 5') || guideline.includes('discussion')) {
      totalGuidelines = 12;
      matchedGuidelines = 8;
    } else if (guideline.includes('references')) {
      totalGuidelines = 10;
      matchedGuidelines = 7;
    } else if (guideline.includes('appendices')) {
      totalGuidelines = 8;
      matchedGuidelines = 6;
    }
  }
  
  // Fallback structural guidance is used only when no criterion-based rubric applies.
  const possibleIssues = {
    general: [
      "Missing proper title page format",
      "Background section needs more global context",
      "Problem statement exceeds recommended length",
      "Objectives not aligned with SMART criteria"
    ],
    introduction: [
      "Introduction lacks clear problem statement",
      "Research gap not explicitly stated",
      "Background lacks sufficient context",
      "Significance of study not adequately justified"
    ],
    literature: [
      "Literature review has insufficient sources",
      "Sources older than 5 years without justification",
      "Critical analysis of previous studies lacking",
      "Theoretical framework not well established"
    ],
    methodology: [
      "Methodology lacks clear sampling technique",
      "Data collection methods inadequately described",
      "Research design not justified",
      "Ethical considerations section incomplete"
    ],
    results: [
      "Statistical analysis procedures not explained",
      "Tables missing proper captions",
      "Figures not properly referenced in text",
      "Results presented without clear organization"
    ],
    discussion: [
      "Discussion does not link findings to literature",
      "Limitations of study not acknowledged",
      "Implications of findings not discussed",
      "Future research directions not suggested"
    ],
    conclusion: [
      "Conclusion does not align with objectives",
      "Summary of findings too detailed",
      "Recommendations not practical",
      "Conclusion exceeds recommended length"
    ],
    references: [
      "References not in proper APA format",
      "In-text citations missing for some references",
      "Some cited works not included in reference list",
      "Electronic sources missing retrieval dates"
    ],
    abstract: [
      "Abstract exceeds recommended word count",
      "Key findings not clearly stated",
      "Research methods not summarized",
      "Implications of study not mentioned"
    ],
    chapter1: [
      "Introduction lacks clear problem statement",
      "Background needs more context",
      "Objectives not clearly defined",
      "Research questions not aligned with objectives"
    ],
    chapter2: [
      "Literature review structure not logical",
      "Gap in research not identified",
      "Theoretical framework missing",
      "Recent studies not included"
    ],
    chapter3: [
      "Research design not justified",
      "Data collection methods vague",
      "Sampling technique not explained",
      "Data analysis procedures inadequately described"
    ],
    chapter4: [
      "Results not organized by objectives",
      "Tables and figures not properly labeled",
      "Statistical tests not appropriate",
      "Data presentation not clear"
    ],
    chapter5: [
      "Discussion not linked to objectives",
      "Findings not compared with literature",
      "Conclusions not supported by results",
      "Recommendations not practical"
    ],
    appendices: [
      "Appendices not properly labeled",
      "Materials not relevant to the study",
      "Raw data not organized",
      "Supplementary materials missing explanations"
    ]
  };
  
  // Determine which issue set to use
  let issueSet: string[] = possibleIssues.general;
  
  Object.entries(possibleIssues).forEach(([key, issues]) => {
    if (guideline.includes(key)) {
      issueSet = issues;
    }
  });
  
  // Also map chapter numbers to appropriate issue sets
  if (guideline.includes('chapter 1')) issueSet = possibleIssues.chapter1;
  if (guideline.includes('chapter 2')) issueSet = possibleIssues.chapter2;
  if (guideline.includes('chapter 3')) issueSet = possibleIssues.chapter3;
  if (guideline.includes('chapter 4')) issueSet = possibleIssues.chapter4;
  if (guideline.includes('chapter 5')) issueSet = possibleIssues.chapter5;
  
  const sectionsToScore = selectedRubricSections.filter(
    (section): section is MarkingGuideSection => Boolean(section)
  );
  const rubricScore: RubricScore | undefined =
    sectionsToScore.length > 0 ? scoreMarkingGuideSections(extractedDocument, sectionsToScore) : undefined;

  if (rubricScore) {
    totalGuidelines = rubricScore.total;
    matchedGuidelines = rubricScore.awarded;
  }

  const rubricCriteriaNeedingRevision =
    rubricScore?.sections.flatMap((section) =>
      section.criteria
        .filter((criterion) => criterion.status !== 'met')
        .map((criterion) => ({ section: section.title, criterion }))
    ) ?? [];

  const fallbackIssues: string[] = [];
  if (!rubricScore) {
    const numIssues = Math.max(1, totalGuidelines - matchedGuidelines);
    const availableIssues = [...issueSet];
    for (let i = 0; i < numIssues; i++) {
      if (availableIssues.length === 0 || fallbackIssues.length >= 8) break;
      const issueIndex = (file.name.length + i) % availableIssues.length;
      fallbackIssues.push(availableIssues[issueIndex]);
      availableIssues.splice(issueIndex, 1);
    }
  }

  const issues = rubricScore
    ? rubricCriteriaNeedingRevision.map(({ section, criterion }) => `${section}: ${criterion.label}`)
    : fallbackIssues;

  const detailedIssues: DetailedIssue[] = rubricScore
    ? rubricCriteriaNeedingRevision.map(({ section, criterion }) => ({
        section,
        issue: criterion.label,
        severity: criterion.status === 'missing' ? 'high' : 'medium',
        guideline: `Research report marking guide - ${criterion.awarded}/${criterion.marks} marks`,
        suggestion: criterion.guidance,
      }))
    : fallbackIssues.map((issue, index) => ({
        section: componentToAnalyze,
        issue,
        severity: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
        guideline: `UHPAB Guidelines section ${index + 1}`,
        suggestion: getSuggestionForIssue(issue),
      }));

  const fallbackSuggestions = [
    "Consider reviewing UHPAB's latest guidelines for proper formatting requirements.",
    "Ensure all citations are properly formatted according to APA 7th edition.",
    "Check for consistency in terminology throughout your document.",
    "Review your research questions to ensure alignment with your objectives."
  ];
  const suggestions = rubricScore
    ? rubricCriteriaNeedingRevision.slice(0, 4).map(({ criterion }) => criterion.guidance)
    : fallbackSuggestions;
  
  // If compliance is above 70%, this would trigger document storage
  if (matchedGuidelines / totalGuidelines >= 0.7) {
    await storeDocumentForTraining(file, documentType, componentToAnalyze);
  }

  // --- MODIFIED: Return guidelines in result for reference by the user ---
  return {
    matchedGuidelines,
    totalGuidelines,
    issues,
    detailedIssues,
    suggestions,
    ...(rubricScore ? { rubricScore } : {}),
    ...(guidelineRequirements
      ? { guidelineRequirements, requirementsSourceTitle }
      : {})
  };
};

// Re-export the generateDetailedReport function
export { generateDetailedReport };

// Helper function to store document for training
const storeDocumentForTraining = async (file: File, documentType: DocumentType, componentName: string): Promise<void> => {
  // In a production environment, this would:
  // 1. Upload the file to a storage service (e.g., S3, Firebase Storage)
  // 2. Store metadata in a database (e.g., Firebase Firestore, Supabase)
  // 3. Queue the document for processing in a training pipeline
  
  console.log(`[TRAINING DB] Storing ${documentType} document ${file.name} for component: ${componentName}`);
  
  // Simulate a delay for storing the document
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // This would be replaced with actual API calls in production
  // Example API call structure:
  /*
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  formData.append('componentName', componentName);
  
  const response = await fetch('/api/store-training-document', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Failed to store document for training');
  }
  */
  
  // For now, we'll just log the success
  console.log(`[TRAINING DB] Successfully stored ${documentType} document ${file.name} for training`);
};
