
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
  found?: string[];
  missing?: string[];
  improvements?: string[];
  assessmentState?: 'assessed' | 'unassessable';
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
  rubricVersion?: string;
  assessmentMode?: 'strict' | 'structural';
  provisional?: boolean;
}

export type DocumentType = 'proposal' | 'report';
export type ExportFormat = 'pdf' | 'docx' | 'doc';
