export type ReviewToolHandoff = {
  sourceTool: "document-analysis" | "content-improvement" | "plagiarism-checker" | "humanizer";
  fileName?: string;
  documentType?: string;
  section?: string;
  selectedText: string;
  issueLabel?: string;
  pageNumber?: number | null;
  createdAt?: string;
};

const HANDOFF_STORAGE_KEY = "uhpab-review-tool-handoff";

export const toolHandoffLabels: Record<ReviewToolHandoff["sourceTool"], string> = {
  "document-analysis": "Document Analysis",
  "content-improvement": "Content Improvement",
  "plagiarism-checker": "Plagiarism Checker",
  humanizer: "Human Review",
};

export const toolHandoffRoutes: Record<ReviewToolHandoff["sourceTool"], string> = {
  "document-analysis": "/document-analysis",
  "content-improvement": "/content-improvement",
  "plagiarism-checker": "/plagiarism-checker",
  humanizer: "/humanizer",
};

export const isReviewToolHandoff = (value: unknown): value is ReviewToolHandoff => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ReviewToolHandoff>;
  return (
    candidate.sourceTool === "document-analysis" ||
    candidate.sourceTool === "content-improvement" ||
    candidate.sourceTool === "plagiarism-checker" ||
    candidate.sourceTool === "humanizer"
  ) && typeof candidate.selectedText === "string";
};

export const getToolHandoffLabel = (sourceTool: ReviewToolHandoff["sourceTool"]) =>
  toolHandoffLabels[sourceTool];

export const getToolHandoffRoute = (sourceTool: ReviewToolHandoff["sourceTool"]) =>
  toolHandoffRoutes[sourceTool];

export const saveToolHandoff = (handoff: ReviewToolHandoff) => {
  const payload: ReviewToolHandoff = {
    ...handoff,
    createdAt: new Date().toISOString(),
  };

  window.localStorage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(payload));
};

export const loadToolHandoff = (): ReviewToolHandoff | null => {
  const raw = window.localStorage.getItem(HANDOFF_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (isReviewToolHandoff(parsed)) return parsed;
    window.localStorage.removeItem(HANDOFF_STORAGE_KEY);
    return null;
  } catch {
    window.localStorage.removeItem(HANDOFF_STORAGE_KEY);
    return null;
  }
};

export const clearToolHandoff = () => {
  window.localStorage.removeItem(HANDOFF_STORAGE_KEY);
};
