import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import {
  SavedWorkCard,
  WorkspaceEmptyState,
  WorkspaceMetric,
} from "@/components/workspace/WorkspaceWorkflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { createImprovementDownload } from "@/lib/contentImprovementEngine";
import { downloadContentImprovementPdf } from "@/lib/contentImprovementReport";
import { createHumanReviewDownload } from "@/lib/humanReviewEngine";
import { downloadHumanReviewPdf } from "@/lib/humanReviewReport";
import {
  ANALYSIS_ENGINE_VERSION,
  deleteAnalysisRecord,
  listAnalysisRecords,
  saveAnalysisRecord,
  type StoredAnalysisRecord,
} from "@/lib/documentAnalysisStore";
import { sanitizeFileName, triggerBrowserDownload } from "@/lib/download";
import {
  downloadMarkedAnalysisPdf,
  downloadPlagiarismPdf,
} from "@/lib/researchTextMarkers";
import {
  deleteToolResultRecord,
  deleteToolResultsForSourceDocument,
  listToolResultRecords,
  type StoredToolResultRecord,
} from "@/lib/toolResultStore";
import {
  Archive,
  ArrowRight,
  Download,
  FileDown,
  FileSearch,
  FileText,
  PenLine,
  Search,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { analyzeDocument } from "@/utils/documentAnalysis";

type ArchiveFilter = "all" | "analysis" | "improvement" | "humanizer" | "originality";

type ArchiveItem =
  | { kind: "analysis"; record: StoredAnalysisRecord }
  | { kind: "improvement"; record: StoredToolResultRecord<"content-improvement"> }
  | { kind: "humanizer"; record: StoredToolResultRecord<"humanizer"> }
  | { kind: "originality"; record: StoredToolResultRecord<"plagiarism-checker"> };

type ReviewArchivePanelProps = {
  className?: string;
};

const formatArchiveDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved recently";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const fileBaseName = (value: string) => value.replace(/\.[^.]+$/, "") || "document";

const createTextDownload = (text: string, fileName: string) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, sanitizeFileName(fileName));
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export const ReviewArchivePanel = ({ className }: ReviewArchivePanelProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id || "guest";
  const reviewerName = user?.name || user?.email;
  const [analysisRecords, setAnalysisRecords] = useState<StoredAnalysisRecord[]>([]);
  const [improvementRecords, setImprovementRecords] = useState<
    StoredToolResultRecord<"content-improvement">[]
  >([]);
  const [humanReviewRecords, setHumanReviewRecords] = useState<
    StoredToolResultRecord<"humanizer">[]
  >([]);
  const [originalityRecords, setOriginalityRecords] = useState<
    StoredToolResultRecord<"plagiarism-checker">[]
  >([]);
  const [filter, setFilter] = useState<ArchiveFilter>("all");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [recheckingRecordId, setRecheckingRecordId] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadArchive = async () => {
      setIsLoading(true);
      try {
        const [analyses, improvements, humanReviews, originalityChecks] = await Promise.all([
          listAnalysisRecords(userId, 250),
          listToolResultRecords(userId, "content-improvement", 250),
          listToolResultRecords(userId, "humanizer", 250),
          listToolResultRecords(userId, "plagiarism-checker", 250),
        ]);

        if (cancelled) return;
        setAnalysisRecords(analyses);
        setImprovementRecords(improvements);
        setHumanReviewRecords(humanReviews);
        setOriginalityRecords(originalityChecks);
      } catch (error) {
        console.error("Failed to load the review archive:", error);
        toast.error("Saved review work could not be loaded");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadArchive();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const archiveItems = useMemo<ArchiveItem[]>(() => {
    const items: ArchiveItem[] = [
      ...analysisRecords.map((record) => ({ kind: "analysis" as const, record })),
      ...improvementRecords.map((record) => ({ kind: "improvement" as const, record })),
      ...humanReviewRecords.map((record) => ({ kind: "humanizer" as const, record })),
      ...originalityRecords.map((record) => ({ kind: "originality" as const, record })),
    ];

    return items.sort((a, b) => b.record.updatedAt.localeCompare(a.record.updatedAt));
  }, [analysisRecords, improvementRecords, humanReviewRecords, originalityRecords]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return archiveItems.filter((item) => {
      if (filter !== "all" && item.kind !== filter) return false;
      if (!normalizedQuery) return true;

      const record = item.record;
      const searchable = [
        record.fileName,
        "documentType" in record ? record.documentType : "",
        "component" in record ? record.component : "",
        "section" in record ? record.section : "",
        "issueLabel" in record ? record.issueLabel : "",
        item.kind,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [archiveItems, filter, query]);

  const openItem = (item: ArchiveItem) => {
    if (item.kind === "analysis") {
      navigate("/document-analysis", {
        state: { documentAnalysisRecordId: item.record.id },
      });
      return;
    }

    const route = item.kind === "improvement"
      ? "/content-improvement"
      : item.kind === "humanizer"
        ? "/humanizer"
        : "/plagiarism-checker";

    navigate(route, {
      state: { toolResultRecordId: item.record.id },
    });
  };

  const recheckAnalysis = async (record: StoredAnalysisRecord) => {
    if ((record.engineVersion ?? 0) >= ANALYSIS_ENGINE_VERSION) {
      toast.success("This report already uses the current marking engine");
      return;
    }

    setRecheckingRecordId(record.id);
    try {
      const file = new File([record.file], record.fileName, {
        type: record.fileType,
        lastModified: record.fileLastModified,
      });
      const result = await analyzeDocument(file, record.documentType, record.component);
      const updatedRecord = await saveAnalysisRecord({
        userId,
        documentType: record.documentType,
        component: record.component,
        fileName: record.fileName,
        file,
        fingerprint: {
          contentHash: record.contentHash,
          pageCount: record.pageCount,
        },
        result,
        reusedFromId: record.id,
        cacheNotes: ["Rechecked with the current marking engine using the stored original file."],
      });

      setAnalysisRecords((current) =>
        current
          .map((item) => (item.id === updatedRecord.id ? updatedRecord : item))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      );
      const rubric = updatedRecord.result.rubricScore;
      toast.success(
        rubric
          ? `Recheck complete: ${rubric.awarded}/${rubric.total} marks`
          : "Recheck complete"
      );
    } catch (error) {
      console.error("Failed to recheck saved document:", error);
      toast.error(error instanceof Error ? error.message : "The saved document could not be rechecked");
    } finally {
      setRecheckingRecordId(null);
    }
  };

  const deleteArchiveItem = async (item: ArchiveItem) => {
    setDeletingRecordId(item.record.id);

    try {
      if (item.kind === "analysis") {
        const deleted = await deleteAnalysisRecord(item.record.id, userId);
        if (!deleted) throw new Error("This saved document could not be found.");

        const linkedResultIds = await deleteToolResultsForSourceDocument(userId, item.record.fileName);
        const linkedIds = new Set(linkedResultIds);
        setAnalysisRecords((current) => current.filter((record) => record.id !== item.record.id));
        setImprovementRecords((current) => current.filter((record) => !linkedIds.has(record.id)));
        setHumanReviewRecords((current) => current.filter((record) => !linkedIds.has(record.id)));
        setOriginalityRecords((current) => current.filter((record) => !linkedIds.has(record.id)));
        toast.success(
          linkedResultIds.length > 0
            ? `Document and ${linkedResultIds.length} linked ${linkedResultIds.length === 1 ? "result" : "results"} removed`
            : "Saved document removed"
        );
        return;
      }

      const deleted = await deleteToolResultRecord(item.record.id, userId);
      if (!deleted) throw new Error("This saved review could not be found.");

      if (item.kind === "improvement") {
        setImprovementRecords((current) => current.filter((record) => record.id !== item.record.id));
      } else if (item.kind === "humanizer") {
        setHumanReviewRecords((current) => current.filter((record) => record.id !== item.record.id));
      } else {
        setOriginalityRecords((current) => current.filter((record) => record.id !== item.record.id));
      }
      toast.success("Saved review removed");
    } catch (error) {
      console.error("Failed to remove saved review:", error);
      toast.error(error instanceof Error ? error.message : "The saved review could not be removed");
    } finally {
      setDeletingRecordId(null);
    }
  };

  const exportItem = (item: ArchiveItem) => {
    if (item.kind === "analysis") {
      downloadMarkedAnalysisPdf(
        item.record.result,
        item.record.documentType,
        item.record.component,
        item.record.fileName,
        reviewerName
      );
      return;
    }

    if (item.kind === "improvement") {
      downloadContentImprovementPdf(
        item.record.result,
        item.record.fileName || "saved-improvement",
        reviewerName
      );
      return;
    }

    if (item.kind === "humanizer") {
      downloadHumanReviewPdf(
        item.record.result,
        item.record.fileName || "saved-human-review",
        reviewerName
      );
      return;
    }

    downloadPlagiarismPdf(
      item.record.result,
      item.record.fileName || "saved-originality-check",
      reviewerName
    );
  };

  const downloadSource = (item: ArchiveItem) => {
    if (item.kind === "analysis") {
      const url = URL.createObjectURL(item.record.file);
      triggerBrowserDownload(url, sanitizeFileName(item.record.fileName));
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      return;
    }

    if (item.kind === "improvement") {
      createTextDownload(
        createImprovementDownload(item.record.result),
        `improved-${fileBaseName(item.record.fileName || "saved-improvement")}.txt`
      );
      return;
    }

    if (item.kind === "humanizer") {
      createTextDownload(
        createHumanReviewDownload(item.record.result),
        `human-review-${fileBaseName(item.record.fileName || "saved-human-review")}.txt`
      );
      return;
    }

    createTextDownload(
      item.record.inputText || item.record.inputPreview,
      `originality-input-${fileBaseName(item.record.fileName || "saved-check")}.txt`
    );
  };

  const renderItemDetails = (item: ArchiveItem) => {
    if (item.kind === "analysis") {
      const rubric = item.record.result.rubricScore;
      const needsFreshCheck = (item.record.engineVersion ?? 0) < ANALYSIS_ENGINE_VERSION;
      const attentionCount = rubric?.sections.reduce(
        (sum, section) =>
          sum + section.criteria.filter((criterion) => criterion.status !== "met").length,
        0
      ) ?? 0;
      const awarded = rubric ? Math.min(rubric.awarded, rubric.total) : item.record.result.matchedGuidelines;
      const total = rubric?.total ?? item.record.result.totalGuidelines;

      return {
        title: item.record.fileName,
        label: "Marking guide",
        labelClass: "border-sky-200 bg-sky-50 text-sky-800",
        icon: <FileSearch className="h-5 w-5" />,
        primary: `${awarded}/${total} ${rubric ? "marks" : "checks"}`,
        secondary: needsFreshCheck
          ? "Recheck with the current marking engine"
          : `${attentionCount} criteria need revision`,
        context: `${item.record.documentType} - ${item.record.component} - ${item.record.analysisRuns} ${item.record.analysisRuns === 1 ? "run" : "runs"}${needsFreshCheck ? " - earlier engine" : ""}`,
        sourceLabel: "Original file",
        needsFreshCheck,
      };
    }

    if (item.kind === "improvement") {
      return {
        title: item.record.issueLabel || item.record.fileName || "Saved improvement",
        label: "Writing improvement",
        labelClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
        icon: <PenLine className="h-5 w-5" />,
        primary: `${item.record.result.changes.length} changes`,
        secondary: `${item.record.result.issues.length} issues reviewed`,
        context: item.record.section || item.record.fileName || "Academic writing correction",
        sourceLabel: "Improved TXT",
        needsFreshCheck: false,
      };
    }

    if (item.kind === "humanizer") {
      return {
        title: item.record.issueLabel || item.record.fileName || "Saved human review",
        label: "Human review",
        labelClass: "border-violet-200 bg-violet-50 text-violet-800",
        icon: <Wand2 className="h-5 w-5" />,
        primary: `${item.record.result.readinessScore}/100 readiness`,
        secondary: `${item.record.result.signals.length} signals, ${item.record.result.changes.length} cleanup changes`,
        context: item.record.section || item.record.fileName || "Authenticity and style cleanup",
        sourceLabel: "Review TXT",
        needsFreshCheck: false,
      };
    }

    return {
      title: item.record.fileName || item.record.issueLabel || "Saved originality check",
      label: "Originality",
      labelClass: "border-amber-200 bg-amber-50 text-amber-800",
      icon: <ShieldCheck className="h-5 w-5" />,
      primary: `${item.record.result.originalityScore}% original-looking`,
      secondary: `${item.record.result.uncommonFlagCount} ${item.record.result.uncommonFlagCount === 1 ? "passage needs" : "passages need"} review`,
      context: `${item.record.result.similarityScore}% review attention after common wording is excluded`,
      sourceLabel: "Input TXT",
      needsFreshCheck: false,
    };
  };

  return (
    <div className={className}>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <WorkspaceMetric
              label="All saved reviews"
              value={archiveItems.length}
              detail="Everything in this browser"
            />
            <WorkspaceMetric
              label="Marking-guide reports"
              value={analysisRecords.length}
              detail="Scored document checks"
              tone="info"
            />
            <WorkspaceMetric
              label="Writing improvements"
              value={improvementRecords.length}
              detail="Corrected sections"
              tone="success"
            />
            <WorkspaceMetric
              label="Human reviews"
              value={humanReviewRecords.length}
              detail="Style and authenticity checks"
              tone="neutral"
            />
            <WorkspaceMetric
              label="Originality reports"
              value={originalityRecords.length}
              detail="Marked similarity reviews"
              tone="warning"
            />
        </section>

        <section className="py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <Tabs value={filter} onValueChange={(value) => setFilter(value as ArchiveFilter)}>
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:w-auto sm:grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="analysis">Marking guide</TabsTrigger>
                <TabsTrigger value="improvement">Writing</TabsTrigger>
                <TabsTrigger value="humanizer">Human review</TabsTrigger>
                <TabsTrigger value="originality">Originality</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full xl:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search saved reviews"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search file, section, or issue"
                className="pl-9"
              />
            </div>
          </div>

          <div className="mt-5">
            {isLoading ? (
              <WorkspaceEmptyState
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Loading saved review work"
                description="Your saved marking, writing, human review, and originality results are being collected from this browser."
              />
            ) : visibleItems.length === 0 ? (
              <WorkspaceEmptyState
                icon={<Archive size={22} />}
                title="No saved review matches this view"
                description="Change the filter, clear the search, or run a new document check."
                actions={
                  <>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                    >
                      <Search className="h-4 w-4" />
                      Clear filters
                    </Button>
                    <Button className="gap-2" onClick={() => navigate("/document-analysis")}>
                      <FileSearch className="h-4 w-4" />
                      Check document
                    </Button>
                  </>
                }
              />
            ) : (
              <div className="space-y-3">
                {visibleItems.map((item) => {
                  const details = renderItemDetails(item);
                  return (
                    <SavedWorkCard
                      key={`${item.kind}-${item.record.id}`}
                      title={details.title}
                      meta={`${details.context} - ${formatArchiveDate(item.record.updatedAt)}`}
                      status={
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-primary/10 p-2 text-primary">{details.icon}</span>
                          <Badge variant="outline" className={details.labelClass}>{details.label}</Badge>
                        </div>
                      }
                    >
                        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(180px,1fr)_auto] lg:items-center">
                          <div className="rounded-md bg-muted/50 px-4 py-3">
                            <p className="font-semibold">{details.primary}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{details.secondary}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadSource(item)}>
                              <FileDown className="h-4 w-4" />
                              {details.sourceLabel}
                            </Button>
                            {!details.needsFreshCheck && (
                              <Button variant="outline" size="sm" className="gap-2" onClick={() => exportItem(item)}>
                                <Download className="h-4 w-4" />
                                Export PDF
                              </Button>
                            )}
                            <Button
                              variant={details.needsFreshCheck ? "outline" : "default"}
                              size="sm"
                              className="gap-2"
                              onClick={() => openItem(item)}
                            >
                              {details.needsFreshCheck ? "Open old result" : "Open"}
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            {item.kind === "analysis" && details.needsFreshCheck && (
                              <Button
                                size="sm"
                                className="gap-2"
                                onClick={() => recheckAnalysis(item.record)}
                                disabled={recheckingRecordId !== null}
                                aria-label={`Recheck ${details.title} with current marking engine`}
                              >
                                {recheckingRecordId === item.record.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                {recheckingRecordId === item.record.id ? "Rechecking" : "Recheck now"}
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 text-destructive hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                                  disabled={deletingRecordId !== null || recheckingRecordId !== null}
                                  aria-label={`Remove ${details.title} from saved reviews`}
                                  title="Remove saved review"
                                >
                                  {deletingRecordId === item.record.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove this saved review?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {item.kind === "analysis"
                                      ? `This permanently removes ${details.title}, its stored original file, marking result, and any writing or originality results sent directly from it.`
                                      : `This permanently removes the saved ${details.label.toLowerCase()} result for ${details.title}.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep review</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteArchiveItem(item)}
                                  >
                                    Remove permanently
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                    </SavedWorkCard>
                  );
                })}
              </div>
            )}
          </div>
        </section>
    </div>
  );
};

const ReviewArchive = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <WorkspacePage width="wide">
        <WorkspacePageHeader
          eyebrow="Saved review work"
          tone="info"
          icon={<Archive size={14} />}
          title="Review archive"
          description="Reopen every marking-guide check, writing correction, human review, and originality report saved in this browser."
          actions={
            <Button className="gap-2" onClick={() => navigate("/document-analysis")}>
              <FileText className="h-4 w-4" />
              Check another document
            </Button>
          }
        />

        <ReviewArchivePanel className="mt-6" />
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default ReviewArchive;
