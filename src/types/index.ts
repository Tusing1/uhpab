
export type UserRole = 'free' | 'premium' | 'school-admin' | 'school-supervisor' | 'school-student';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  studentId?: string;
  htin?: string;
  className?: string;
  researchTopic?: string;
  schoolId?: string;
  schoolName?: string;
  schoolLocation?: string;
  supervisorId?: string;
  supervisorName?: string;
}

export interface School {
  id: string;
  name: string;
  email: string;
  location?: string;
  category?: string;
  subscriptionTier: 'basic' | 'standard' | 'enterprise';
  studentLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  type: 'proposal' | 'report';
  createdAt: string;
  updatedAt: string;
  progress: {
    chapter1: number;
    chapter2: number;
    chapter3: number;
    chapter4?: number;
    chapter5?: number;
    preliminaryPages?: number;
    appendices: number;
    references?: number;
  };
  chapters: {
    chapter1?: unknown;
    chapter2?: unknown;
    chapter3?: unknown;
    chapter4?: unknown;
    chapter5?: unknown;
    preliminaryPages?: unknown;
    appendices?: unknown;
    references?: unknown;
    [key: string]: unknown;
  };
  preliminaryPages?: {
    [key: string]: string;
  };
  importedFrom?: {
    fileName: string;
    importDate: string;
    analysisIssues: string[];
  };
  schoolId?: string;
  plagiarismScore?: number;
}

export type AccessTier = 'free' | 'premium' | 'school';

export interface FeatureAccess {
  feature: string;
  tier: AccessTier;
  description: string;
}

export type DocumentType = 'proposal' | 'report';
export type ExportFormat = 'pdf' | 'doc' | 'docx';

export interface DetailedIssue {
  section: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  guideline: string;
  suggestion: string;
}

// Add the gemini-specific types if needed in the future
export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface PlagiarismReport {
  id: string;
  projectId: string;
  userId: string;
  schoolId?: string;
  originalityScore: number;
  scanDate: string;
  issues: PlagiarismIssue[];
  reportUrl?: string;
}

export interface PlagiarismIssue {
  text: string;
  reviewLevel: 'no-concern' | 'citation-check' | 'review-wording' | 'high-attention';
  suggestions: string;
  location: string;
}
