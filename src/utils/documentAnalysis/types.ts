
export interface AnalysisResult {
  matchedGuidelines: number;
  totalGuidelines: number;
  issues: string[];
  detailedIssues?: DetailedIssue[];
  suggestions?: string[];
  guidelineRequirements?: string[];
  requirementsSourceTitle?: string;
  rubricScore?: RubricScore;
}

export interface DetailedIssue {
  section: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  guideline: string;
  suggestion: string;
}

export interface RubricCriterionScore {
  id: string;
  label: string;
  marks: number;
  awarded: number;
  status: 'met' | 'partial' | 'missing';
  guidance: string;
  evidenceSnippet?: string;
  pageNumber?: number | null;
}

export interface RubricSectionScore {
  id: string;
  title: string;
  marks: number;
  awarded: number;
  criteria: RubricCriterionScore[];
}

export interface RubricScore {
  awarded: number;
  total: number;
  sections: RubricSectionScore[];
}

export type DocumentType = 'proposal' | 'report';
export type ExportFormat = 'pdf' | 'docx' | 'doc';
