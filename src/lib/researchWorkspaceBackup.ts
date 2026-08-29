import { ANALYSIS_ENGINE_VERSION, listAnalysisRecords } from "@/lib/documentAnalysisStore";
import {
  listToolResultRecords,
  TOOL_ENGINE_VERSION,
  type StoredToolKind,
} from "@/lib/toolResultStore";
import { sanitizeFileName, triggerBrowserDownload } from "@/lib/download";

const BACKUP_SCHEMA_VERSION = 1;
const MAX_RECORDS_PER_TOOL = 10_000;

export type WorkspaceStorageSummary = {
  projects: number;
  markingReports: number;
  writingReviews: number;
  humanReviews: number;
  originalityReports: number;
  usedBytes: number | null;
  quotaBytes: number | null;
};

const toolKinds: StoredToolKind[] = [
  "content-improvement",
  "humanizer",
  "plagiarism-checker",
];

const readProjects = (userId: string): unknown[] => {
  try {
    const stored = window.localStorage.getItem(`projects_${userId}`);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getStorageEstimate = async () => {
  if (!navigator.storage?.estimate) {
    return { usedBytes: null, quotaBytes: null };
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usedBytes: estimate.usage ?? null,
      quotaBytes: estimate.quota ?? null,
    };
  } catch {
    return { usedBytes: null, quotaBytes: null };
  }
};

const loadWorkspaceRecords = async (userId: string) => {
  const [markingReports, writingReviews, humanReviews, originalityReports] =
    await Promise.all([
      listAnalysisRecords(userId, MAX_RECORDS_PER_TOOL),
      listToolResultRecords(userId, "content-improvement", MAX_RECORDS_PER_TOOL),
      listToolResultRecords(userId, "humanizer", MAX_RECORDS_PER_TOOL),
      listToolResultRecords(userId, "plagiarism-checker", MAX_RECORDS_PER_TOOL),
    ]);

  return {
    projects: readProjects(userId),
    markingReports,
    writingReviews,
    humanReviews,
    originalityReports,
  };
};

export const getWorkspaceStorageSummary = async (
  userId: string
): Promise<WorkspaceStorageSummary> => {
  const [records, estimate] = await Promise.all([
    loadWorkspaceRecords(userId),
    getStorageEstimate(),
  ]);

  return {
    projects: records.projects.length,
    markingReports: records.markingReports.length,
    writingReviews: records.writingReviews.length,
    humanReviews: records.humanReviews.length,
    originalityReports: records.originalityReports.length,
    ...estimate,
  };
};

const serializeAnalysisRecord = ({
  file: _file,
  ...record
}: Awaited<ReturnType<typeof listAnalysisRecords>>[number]) => ({
  ...record,
  originalFileIncluded: false,
});

export const downloadWorkspaceBackup = async (
  userId: string,
  accountEmail?: string
) => {
  const records = await loadWorkspaceRecords(userId);
  const createdAt = new Date();
  const backup = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: createdAt.toISOString(),
    product: "UHPAB Research Assistant",
    account: {
      userId,
      email: accountEmail || null,
    },
    engineVersions: {
      markingGuide: ANALYSIS_ENGINE_VERSION,
      tools: TOOL_ENGINE_VERSION,
    },
    notes: [
      "This backup contains project text and saved review results.",
      "Original uploaded PDF and DOCX files are not embedded; keep your original documents separately.",
    ],
    projects: records.projects,
    markingReports: records.markingReports.map(serializeAnalysisRecord),
    toolResults: {
      writing: records.writingReviews,
      humanReview: records.humanReviews,
      originality: records.originalityReports,
    },
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const date = createdAt.toISOString().slice(0, 10);
  const fileName = sanitizeFileName(`uhpab-workspace-backup-${date}.json`);

  triggerBrowserDownload(url, fileName, {
    message: "Workspace backup started",
  });
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
};

export const getStoredReviewCount = (summary: WorkspaceStorageSummary) =>
  toolKinds.reduce((total, tool) => {
    if (tool === "content-improvement") return total + summary.writingReviews;
    if (tool === "humanizer") return total + summary.humanReviews;
    return total + summary.originalityReports;
  }, summary.markingReports);
