import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import {
  DocumentUploadField,
  SavedWorkCard,
  WorkspaceActionDock,
  WorkspaceCountBadge,
  WorkspaceEmptyState,
  WorkspaceSectionHeader,
  WorkspaceStatusNote,
} from "@/components/workspace/WorkspaceWorkflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { OperationProgress } from "@/components/ui/operation-progress";
import { toast } from "sonner";
import {
  createImprovementDownload,
  improveResearchContent,
  type ImprovementCategory,
  type ImprovementResult,
} from "@/lib/contentImprovementEngine";
import {
  downloadCleanContentImprovementPdf,
  downloadContentImprovementPdf,
} from "@/lib/contentImprovementReport";
import { useAuth } from "@/contexts/AuthContext";
import { extractDocumentText, type ExtractedDocumentText } from "@/lib/documentTextExtraction";
import {
  clearToolHandoff,
  getToolHandoffLabel,
  getToolHandoffRoute,
  isReviewToolHandoff,
  loadToolHandoff,
  saveToolHandoff,
  type ReviewToolHandoff,
} from "@/lib/toolHandoff";
import {
  createToolTextFingerprint,
  findReusableToolResult,
  getToolResultRecord,
  listToolResultRecords,
  saveToolResult,
  type StoredToolResultRecord,
} from "@/lib/toolResultStore";
import { sanitizeFileName, triggerBrowserDownload } from "@/lib/download";
import {
  ArrowRight,
  Clipboard,
  Download,
  FileCheck2,
  FileText,
  Highlighter,
  Loader2,
  PenLine,
  Sparkles,
  RotateCcw,
  Wand2,
} from "lucide-react";

const categoryStyles: Record<ImprovementCategory, string> = {
  Grammar: "border-rose-200 bg-rose-50 text-rose-900",
  "Academic tone": "border-violet-200 bg-violet-50 text-violet-900",
  Structure: "border-sky-200 bg-sky-50 text-sky-900",
  "Citation support": "border-amber-200 bg-amber-50 text-amber-900",
  Clarity: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

const improvementSteps = [
  "Prepare text",
  "Review issues",
  "Improve wording",
  "Save result",
];

const downloadTextFile = (text: string, fileName: string) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, fileName);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
};

const getRouteToolResultRecordId = (state: unknown) => {
  if (!state || typeof state !== "object") return null;
  const candidate = state as { toolResultRecordId?: unknown };
  return typeof candidate.toolResultRecordId === "string" ? candidate.toolResultRecordId : null;
};

const ContentImprovement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [originalText, setOriginalText] = useState("");
  const [improvedText, setImprovedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [extractedDocument, setExtractedDocument] = useState<ExtractedDocumentText | null>(null);
  const [result, setResult] = useState<ImprovementResult | null>(null);
  const [handoff, setHandoff] = useState<ReviewToolHandoff | null>(null);
  const [recentResults, setRecentResults] = useState<StoredToolResultRecord<"content-improvement">[]>([]);
  const [resultReused, setResultReused] = useState(false);
  const [improvementProgress, setImprovementProgress] = useState(0);
  const [improvementStage, setImprovementStage] = useState("Preparing text");

  const userId = user?.id || "guest";
  const wordCount = useMemo(() => originalText.trim().split(/\s+/).filter(Boolean).length, [originalText]);
  const improvedWordCount = useMemo(() => improvedText.trim().split(/\s+/).filter(Boolean).length, [improvedText]);
  const issueCounts = useMemo(() => {
    const counts = new Map<ImprovementCategory, number>();
    result?.issues.forEach((issue) => counts.set(issue.category, (counts.get(issue.category) ?? 0) + 1));
    return counts;
  }, [result]);
  const handoffSourceLabel = handoff ? getToolHandoffLabel(handoff.sourceTool) : null;
  const routeToolResultRecordId = useMemo(
    () => getRouteToolResultRecordId(location.state),
    [location.state]
  );

  useEffect(() => {
    listToolResultRecords(userId, "content-improvement")
      .then(setRecentResults)
      .catch((error) => console.error("Failed to load improvement history:", error));
  }, [userId]);

  useEffect(() => {
    if (routeToolResultRecordId) return;
    const routeState = isReviewToolHandoff(location.state) ? location.state : null;
    const incoming = routeState ?? loadToolHandoff();
    if (!incoming?.selectedText) return;

    if (routeState) saveToolHandoff(routeState);
    setHandoff(incoming);
    setOriginalText(incoming.selectedText);
    setFileName(incoming.fileName || "handoff-section.txt");
    setResultReused(false);
  }, [location.state, routeToolResultRecordId]);

  const resetWorkspace = () => {
    clearToolHandoff();
    setOriginalText("");
    setImprovedText("");
    setFileName("");
    setExtractedDocument(null);
    setResult(null);
    setHandoff(null);
    setResultReused(false);
  };

  const returnToSourceTool = () => {
    if (!handoff) return;
    navigate(getToolHandoffRoute(handoff.sourceTool), { state: handoff });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setResult(null);
    setImprovedText("");
    setFileName(file.name);
    setHandoff(null);
    setResultReused(false);

    try {
      const extracted = await extractDocumentText(file);
      setExtractedDocument(extracted);
      setOriginalText(extracted.text);
      toast.success(`Extracted ${extracted.wordCount.toLocaleString()} words from ${file.name}`);
    } catch (error) {
      console.error("Content extraction failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to extract content");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImprove = async () => {
    if (!originalText.trim()) {
      toast.error("Add a paragraph or upload a document first");
      return;
    }

    setIsImproving(true);
    setResultReused(false);
    setImprovementProgress(10);
    setImprovementStage("Preparing the section without changing its meaning");

    try {
      setImprovementProgress(22);
      setImprovementStage("Creating a secure fingerprint for saved-work checks");
      const fingerprint = await createToolTextFingerprint(originalText);
      setImprovementProgress(38);
      setImprovementStage("Checking for a saved improvement of this exact text");
      const reusable = await findReusableToolResult<"content-improvement">({
        userId,
        tool: "content-improvement",
        fingerprint,
      });

      if (reusable.record) {
        setImprovementProgress(78);
        setImprovementStage("Restoring the verified writing improvement");
        await new Promise((resolve) => setTimeout(resolve, 350));
        const reusedResult: ImprovementResult = {
          ...reusable.record.result,
          sourceContext: handoff,
        };
        await saveToolResult({
          userId,
          tool: "content-improvement",
          fingerprint,
          inputText: originalText,
          result: reusedResult,
          fileName: fileName || handoff?.fileName || "pasted-text.txt",
          sourceContext: handoff,
          reusedFromId: reusable.record.id,
        });
        setResult(reusedResult);
        setImprovedText(reusedResult.improvedText);
        setResultReused(true);
        setRecentResults(await listToolResultRecords(userId, "content-improvement"));
        setImprovementProgress(100);
        setImprovementStage("Improved text ready");
        toast.success("Saved improvement reused for this exact text");
        return;
      }

      setImprovementProgress(54);
      setImprovementStage("Reviewing grammar, academic tone, structure, citations, and clarity");
      await new Promise((resolve) => setTimeout(resolve, 300));
      setImprovementProgress(72);
      setImprovementStage("Applying focused corrections while preserving facts and meaning");
      const nextResult = improveResearchContent(originalText, handoff);
      setImprovementProgress(88);
      setImprovementStage("Saving the improved text and change list");
      await saveToolResult({
        userId,
        tool: "content-improvement",
        fingerprint,
        inputText: originalText,
        result: nextResult,
        fileName: fileName || handoff?.fileName || "pasted-text.txt",
        sourceContext: handoff,
      });
      setResult(nextResult);
      setImprovedText(nextResult.improvedText);
      setRecentResults(await listToolResultRecords(userId, "content-improvement"));
      setImprovementProgress(100);
      setImprovementStage("Improved text ready");
      toast.success("Writing improvement complete", {
        description: `${nextResult.changes.length} ${nextResult.changes.length === 1 ? "change is" : "changes are"} ready to review.`,
      });
    } catch (error) {
      console.error("Failed to improve or store content:", error);
      const fallbackResult = improveResearchContent(originalText, handoff);
      setResult(fallbackResult);
      setImprovedText(fallbackResult.improvedText);
      setImprovementProgress(100);
      setImprovementStage("Improved text ready");
      toast.error("Local history was unavailable, so a fresh improvement was created");
    } finally {
      setIsImproving(false);
    }
  };

  const handleCopy = async () => {
    if (!improvedText.trim()) return;
    await navigator.clipboard.writeText(improvedText);
    toast.success("Improved text copied");
  };

  const handleDownload = () => {
    if (!improvedText.trim()) return;
    const baseName = fileName ? fileName.replace(/\.[^.]+$/, "") : "research-content";
    const payload = result
      ? createImprovementDownload({ ...result, improvedText })
      : improvedText;
    downloadTextFile(payload, sanitizeFileName(`improved-${baseName}.txt`));
  };

  const handleExportPdf = () => {
    if (!result) {
      toast.error("Run improvement before exporting a PDF review");
      return;
    }

    downloadContentImprovementPdf(
      { ...result, improvedText },
      fileName || result.sourceContext?.fileName || "content-improvement-review",
      user?.name || user?.email
    );
  };

  const handleExportCleanPdf = () => {
    if (!result) {
      toast.error("Run improvement before exporting a clean corrected PDF");
      return;
    }

    downloadCleanContentImprovementPdf(
      { ...result, improvedText },
      fileName || result.sourceContext?.fileName || "corrected-research-text"
    );
  };

  const loadSavedImprovement = (record: StoredToolResultRecord<"content-improvement">) => {
    const savedHandoff = record.sourceContext ?? null;
    setOriginalText(record.inputText || record.result.originalText || record.inputPreview);
    setImprovedText(record.result.improvedText);
    setFileName(record.fileName || "saved-improvement.txt");
    setResult(record.result);
    setHandoff(savedHandoff);
    setExtractedDocument(null);
    setResultReused(true);
    toast.success("Saved improvement opened");
  };

  useEffect(() => {
    if (!routeToolResultRecordId) return;

    let cancelled = false;
    getToolResultRecord<"content-improvement">(routeToolResultRecordId)
      .then((record) => {
        if (cancelled || !record || record.userId !== userId) return;
        loadSavedImprovement(record);
      })
      .catch((error) => console.error("Failed to restore saved improvement:", error));

    return () => {
      cancelled = true;
    };
  }, [routeToolResultRecordId, userId]);

  const downloadSavedImprovement = (record: StoredToolResultRecord<"content-improvement">) => {
    const baseName = (record.fileName || "saved-improvement").replace(/\.[^.]+$/, "");
    downloadTextFile(
      createImprovementDownload(record.result),
      sanitizeFileName(`improved-${baseName}.txt`)
    );
  };

  const exportSavedImprovementPdf = (record: StoredToolResultRecord<"content-improvement">) => {
    downloadContentImprovementPdf(
      record.result,
      record.fileName || "saved-improvement",
      user?.name || user?.email
    );
  };

  const exportSavedCleanImprovementPdf = (record: StoredToolResultRecord<"content-improvement">) => {
    downloadCleanContentImprovementPdf(
      record.result,
      record.fileName || "saved-improvement"
    );
  };

  const runPlagiarismCheck = () => {
    const textToCheck = improvedText.trim() || originalText.trim();
    if (!textToCheck) {
      toast.error("No text available to check");
      return;
    }

    const handoffPayload: ReviewToolHandoff = {
      sourceTool: "content-improvement",
      fileName: fileName || "improved-content.txt",
      documentType: handoff?.documentType,
      section: handoff?.section,
      selectedText: textToCheck,
      issueLabel: handoff?.issueLabel
        ? `Improved content: ${handoff.issueLabel}`
        : "Improved content originality check",
      pageNumber: handoff?.pageNumber,
    };
    saveToolHandoff(handoffPayload);
    navigate("/plagiarism-checker", { state: handoffPayload });
  };

  const runHumanReview = () => {
    const textToReview = improvedText.trim() || originalText.trim();
    if (!textToReview) {
      toast.error("No text available to review");
      return;
    }

    const handoffPayload: ReviewToolHandoff = {
      sourceTool: "content-improvement",
      fileName: fileName || "improved-content.txt",
      documentType: handoff?.documentType,
      section: handoff?.section,
      selectedText: textToReview,
      issueLabel: handoff?.issueLabel
        ? `Improved content: ${handoff.issueLabel}`
        : "Improved content human review",
      pageNumber: handoff?.pageNumber,
    };
    saveToolHandoff(handoffPayload);
    navigate("/humanizer", { state: handoffPayload });
  };

  const checkSavedImprovement = (record: StoredToolResultRecord<"content-improvement">) => {
    const textToCheck = record.result.improvedText.trim();
    if (!textToCheck) {
      toast.error("No improved text available to check");
      return;
    }

    const handoffPayload: ReviewToolHandoff = {
      sourceTool: "content-improvement",
      fileName: record.fileName || "saved-improvement.txt",
      documentType: record.documentType,
      section: record.section,
      selectedText: textToCheck,
      issueLabel: record.issueLabel
        ? `Saved improvement: ${record.issueLabel}`
        : "Saved improvement originality check",
      pageNumber: record.pageNumber,
    };
    saveToolHandoff(handoffPayload);
    navigate("/plagiarism-checker", { state: handoffPayload });
  };

  return (
    <DashboardLayout>
      <WorkspacePage width="wide" dockPadding={improvedText.trim() ? "expanded" : "none"}>
        <WorkspacePageHeader
          eyebrow="Correction workspace"
          tone="success"
          icon={<PenLine size={14} />}
          title="Improve weak research sections without changing their meaning"
          description="Paste a paragraph, upload a document, or open an issue from the marking guide. Improve academic tone, grammar, structure, clarity, and citation support without inventing data or references."
          actions={
            <>
              <Button onClick={handleImprove} disabled={isExtracting || isImproving || !originalText.trim()} className="gap-2">
                {isImproving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isImproving ? "Improving text" : "Improve content"}
              </Button>
              <Button type="button" variant="outline" onClick={resetWorkspace} className="gap-2 bg-white/80">
                <RotateCcw size={16} />
                Start fresh
              </Button>
              <Button asChild variant="outline" className="gap-2 bg-white/80">
                <Link to="/document-analysis">
                  Back to marking guide
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </>
          }
          aside={
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-muted text-info shadow-sm">
                  <PenLine size={21} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">Current source</h2>
                  <p className="truncate text-sm text-muted-foreground">
                    {handoff ? `${handoff.issueLabel || "Selected section"}${handoff.pageNumber ? `, page ${handoff.pageNumber}` : ""}` : "Paste text or upload a file to begin."}
                  </p>
                </div>
              </div>
              {handoff && (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-info-muted text-info-foreground">{handoffSourceLabel}</Badge>
                    {handoff.fileName && <Badge variant="outline" className="max-w-full truncate bg-muted/50">{handoff.fileName}</Badge>}
                    {handoff.documentType && <Badge variant="outline" className="bg-muted/50">{handoff.documentType}</Badge>}
                    {handoff.section && <Badge variant="outline" className="max-w-full truncate bg-muted/50">{handoff.section}</Badge>}
                  </div>
                  {handoff.sourceTool !== "content-improvement" && (
                    <Button type="button" variant="outline" size="sm" className="gap-2 bg-white" onClick={returnToSourceTool}>
                      Return to {handoffSourceLabel}
                      <ArrowRight size={14} />
                    </Button>
                  )}
                </div>
              )}
              {result && (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {Array.from(issueCounts.entries()).map(([category, count]) => (
                    <div key={category} className={`rounded-lg border px-3 py-2 text-sm ${categoryStyles[category]}`}>
                      <span className="font-semibold">{count}</span> {category}
                    </div>
                  ))}
                </div>
              )}
              {resultReused && (
                <WorkspaceStatusNote
                  tone="success"
                  icon={<RotateCcw size={16} />}
                  title="Saved improvement reused"
                  description="This exact text was already improved, so the verified saved result was restored."
                  className="mt-4"
                />
              )}
            </>
          }
        >
            {isImproving && (
              <OperationProgress
                title="Improving this research section"
                stage={improvementStage}
                value={improvementProgress}
                steps={improvementSteps}
                className="mt-5"
              />
            )}
        </WorkspacePageHeader>

        <section className="mt-8 grid min-w-0 gap-5 xl:grid-cols-[0.95fr_0.95fr_0.7fr]">
          <Card className="study-card min-w-0 rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Original text"
              description={`${wordCount.toLocaleString()} words ready for correction.`}
              icon={<FileText size={18} />}
            />

            <div className="space-y-4">
              <DocumentUploadField
                id="content-file"
                label="Research document"
                prompt="Upload PDF, DOCX, or TXT"
                description="The extracted text will be placed in the editor below."
                accept=".pdf,.docx,.txt"
                fileName={fileName}
                disabled={isExtracting || isImproving}
                onChange={handleFileUpload}
              />

              {isExtracting && (
                <div className="rounded-lg border bg-sky-50 p-3 text-sm text-sky-950">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Extracting document text...
                </div>
              )}

              {extractedDocument && (
                <div className="grid gap-2 rounded-lg border bg-white/75 p-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-semibold uppercase">{extractedDocument.sourceType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pages</p>
                    <p className="font-semibold">{extractedDocument.pageCount ?? "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sections</p>
                    <p className="font-semibold">{extractedDocument.chunks.length}</p>
                  </div>
                </div>
              )}

              <Textarea
                value={originalText}
                onChange={(event) => {
                  setOriginalText(event.target.value);
                  setResult(null);
                  setImprovedText("");
                }}
                placeholder="Paste the weak paragraph or section here..."
                className="min-h-[520px] resize-y bg-white/85 text-sm leading-7"
              />
            </div>
          </Card>

          <Card className="study-card min-w-0 rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Improved text"
              description={`${improvedWordCount.toLocaleString()} improved words ready for review.`}
              actions={
                <>
                <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={handleCopy} disabled={!improvedText.trim()}>
                  <Clipboard size={15} />
                  Copy
                </Button>
                <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={handleDownload} disabled={!improvedText.trim()}>
                  <Download size={15} />
                  Download TXT
                </Button>
                <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={handleExportPdf} disabled={!result}>
                  <FileText size={15} />
                  Review PDF
                </Button>
                <Button size="sm" className="gap-2" onClick={handleExportCleanPdf} disabled={!result}>
                  <FileCheck2 size={15} />
                  Clean PDF
                </Button>
                </>
              }
            />

            <Textarea
              value={improvedText}
              onChange={(event) => setImprovedText(event.target.value)}
              placeholder="Your improved content will appear here..."
              className="min-h-[520px] resize-y bg-white/85 text-sm leading-7"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button onClick={runPlagiarismCheck} disabled={!improvedText.trim() && !originalText.trim()} className="gap-2">
                <Highlighter size={16} />
                Run plagiarism check
              </Button>
              <Button variant="outline" className="gap-2 bg-white" onClick={runHumanReview} disabled={!improvedText.trim() && !originalText.trim()}>
                <Wand2 size={16} />
                Human review
              </Button>
              <Button variant="outline" className="gap-2 bg-white" onClick={handleImprove} disabled={isExtracting || isImproving || !originalText.trim()}>
                <Sparkles size={16} />
                Improve again
              </Button>
            </div>
          </Card>

          <Card className="study-card min-w-0 rounded-lg p-6">
            <h2 className="text-xl font-semibold">Change review</h2>
            <p className="mt-1 text-sm text-muted-foreground">What changed and what still needs student judgment.</p>

            {!result && (
              <WorkspaceEmptyState
                icon={<Sparkles size={20} />}
                title="Change review will appear here"
                description="Run improvement to see grammar, tone, structure, citation, and clarity notes."
                className="mt-5"
              />
            )}

            {result && (
              <div className="mt-5 space-y-4">
                {result.issues.length > 0 ? (
                  <div className="space-y-3">
                    {result.issues.map((issue) => (
                      <div key={`${issue.category}-${issue.label}`} className={`rounded-lg border p-3 ${categoryStyles[issue.category]}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline" className="bg-white/80">
                            {issue.category}
                          </Badge>
                          <Badge variant="outline" className="bg-white/80 capitalize">
                            {issue.severity}
                          </Badge>
                        </div>
                        <p className="mt-3 font-semibold">{issue.label}</p>
                        <p className="mt-1 text-sm leading-6">{issue.detail}</p>
                        <p className="mt-2 text-xs leading-5 opacity-80">{issue.action}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    No major issues detected after safe cleanup.
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  {result.changes.map((change, index) => (
                    <div key={`${change.category}-${index}`} className="rounded-lg border bg-white/75 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="bg-primary/5 text-primary">{change.category}</Badge>
                      </div>
                      <p className="mt-3 text-xs font-medium text-muted-foreground">Before</p>
                      <p className="break-words text-sm">{change.before}</p>
                      <p className="mt-2 text-xs font-medium text-muted-foreground">After</p>
                      <p className="break-words text-sm">{change.after}</p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{change.reason}</p>
                    </div>
                  ))}
                </div>

                {result.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-950">Review before submitting</p>
                    <div className="mt-2 space-y-2">
                      {result.warnings.map((warning) => (
                        <p key={warning} className="text-sm leading-6 text-amber-900">{warning}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </section>

        {result && result.comparisons.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Before / after comparison</h2>
                <p className="text-sm text-muted-foreground">Sentence-level changes for review before using the improved text.</p>
              </div>
              <Badge variant="outline" className="w-fit bg-primary/5 text-primary">
                {result.comparisons.filter((item) => item.changed).length} changed
              </Badge>
            </div>
            <div className="grid gap-3">
              {result.comparisons.slice(0, 8).map((comparison) => (
                <div key={comparison.index} className="grid gap-3 rounded-lg border bg-white/80 p-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="bg-slate-50">Original {comparison.index}</Badge>
                      {!comparison.changed && <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Unchanged</Badge>}
                    </div>
                    <p className="break-words text-sm leading-6 text-slate-700">{comparison.before || "No matching original sentence."}</p>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/5 text-primary">Improved {comparison.index}</Badge>
                    </div>
                    <p className="break-words text-sm leading-6">{comparison.after || "No matching improved sentence."}</p>
                  </div>
                </div>
              ))}
            </div>
            {result.comparisons.length > 8 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Showing the first 8 sentence comparisons. The download includes the complete improved text.
              </p>
            )}
          </section>
        )}

        <section className="mt-8">
          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Recent improvements"
              description="Saved locally in this browser and reused when the exact same text appears again."
              actions={<WorkspaceCountBadge count={recentResults.length} />}
            />

            {recentResults.length === 0 ? (
              <WorkspaceEmptyState
                icon={<PenLine size={20} />}
                title="No saved improvements yet"
                description="Improved sections will appear here after you run the correction tool."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {recentResults.map((record) => (
                  <SavedWorkCard
                    key={record.id}
                    title={record.issueLabel || record.fileName || "Improved text"}
                    meta={`${record.wordCount.toLocaleString()} words - ${record.runs} run${record.runs === 1 ? "" : "s"}`}
                    status={
                      <Badge variant="outline" className="bg-success-muted text-success-foreground">
                        Saved
                      </Badge>
                    }
                    summary={<p className="line-clamp-2">{record.inputPreview}</p>}
                    actions={
                      <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-white"
                        onClick={() => loadSavedImprovement(record)}
                      >
                        <RotateCcw size={14} />
                        Resume
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-white"
                        onClick={() => exportSavedImprovementPdf(record)}
                      >
                        <FileText size={14} />
                        Review PDF
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-white"
                        onClick={() => exportSavedCleanImprovementPdf(record)}
                      >
                        <FileCheck2 size={14} />
                        Clean PDF
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-white"
                        onClick={() => downloadSavedImprovement(record)}
                      >
                        <FileText size={14} />
                        TXT
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2"
                        onClick={() => checkSavedImprovement(record)}
                      >
                        <Highlighter size={14} />
                        Check originality
                      </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </Card>
        </section>

        {improvedText.trim() && (
          <WorkspaceActionDock
            width="wide"
            title="Improved section ready"
            description="Download the annotated correction review or the clean corrected document."
            primaryAction={{
              label: "Check originality",
              icon: <Highlighter size={16} />,
              onClick: runPlagiarismCheck,
            }}
            secondaryActions={[
              {
                label: "Human review",
                icon: <Wand2 size={16} />,
                onClick: runHumanReview,
                variant: "outline",
              },
              {
                label: "Download TXT",
                icon: <Download size={16} />,
                onClick: handleDownload,
                variant: "outline",
              },
              {
                label: "Review PDF",
                icon: <FileText size={16} />,
                onClick: handleExportPdf,
                variant: "outline",
              },
              {
                label: "Clean PDF",
                icon: <FileCheck2 size={16} />,
                onClick: handleExportCleanPdf,
                variant: "outline",
              },
            ]}
          />
        )}
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default ContentImprovement;
