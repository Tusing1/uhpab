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
  WorkspaceMetric,
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
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeFileName, triggerBrowserDownload } from "@/lib/download";
import { extractDocumentText, type ExtractedDocumentText } from "@/lib/documentTextExtraction";
import { getBrowserGeminiApiKey } from "@/lib/aiKeys";
import { generateContent } from "@/integrations/gemini";
import {
  humanizeResearchText,
  type HumanReviewCategory,
  type HumanReviewMode,
  type HumanReviewResult,
} from "@/lib/humanReviewEngine";
import { downloadHumanReviewPdf } from "@/lib/humanReviewReport";
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
import {
  ArrowRight,
  BadgeCheck,
  Clipboard,
  Download,
  FileText,
  Highlighter,
  Loader2,
  PenLine,
  RotateCcw,
  ScanText,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

const categoryStyles: Record<HumanReviewCategory, string> = {
  "Content specificity": "border-amber-200 bg-amber-50 text-amber-950",
  "Plain language": "border-emerald-200 bg-emerald-50 text-emerald-950",
  "Academic voice": "border-sky-200 bg-sky-50 text-sky-950",
  "Style cleanup": "border-violet-200 bg-violet-50 text-violet-950",
  "Citation integrity": "border-rose-200 bg-rose-50 text-rose-950",
  "Technical cleanup": "border-slate-200 bg-slate-50 text-slate-900",
};

const reviewSteps = [
  "Prepare text",
  "Scan patterns",
  "Clean wording",
  "Save review",
];

const deepReviewSteps = [
  "Prepare text",
  "Check saved work",
  "Review paragraphs",
  "Clean and rescan",
  "Save review",
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

const cleanAiReviewText = (value: string) =>
  value
    .replace(/^```(?:text|markdown)?/i, "")
    .replace(/```$/i, "")
    .replace(/^\s*(Revised text|Deep review|Human review)\s*:\s*/i, "")
    .trim();

const isAcceptableDeepRevision = (originalText: string, revisedCandidate: string) => {
  const originalWords = originalText.trim().split(/\s+/).filter(Boolean).length;
  const revisedWords = revisedCandidate.trim().split(/\s+/).filter(Boolean).length;
  if (revisedWords < 20) return false;
  if (originalWords > 0 && (revisedWords < originalWords * 0.55 || revisedWords > originalWords * 1.5)) return false;
  if (/\b(i cannot|i can't|as an ai|unable to|i'm sorry)\b/i.test(revisedCandidate)) return false;
  return true;
};

const createDeepReviewPrompt = (text: string, section?: string) => `You are improving a student's UHPAB nursing research writing.

Rewrite the text paragraph by paragraph so it sounds natural, student-reviewed, and academically clear.

Strict rules:
- Preserve the student's meaning, facts, figures, names, setting, citations, and research context.
- Do not invent sources, statistics, references, findings, dates, or health facts.
- Do not add new claims.
- Keep APA-style citations exactly as written.
- Remove generic AI-style phrasing, stiff transitions, inflated wording, and vague filler.
- Use simple formal academic language suitable for a Ugandan nursing research proposal or report.
- Return only the revised text. No notes, no headings unless they already exist.

${section ? `Section context: ${section}\n\n` : ""}Text to revise:
${text}`;

const createDeepReviewChunks = (text: string, maxCharacters = 7000) => {
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  if (paragraphs.length === 0) return [text.trim()];

  const chunks: string[] = [];
  let current = "";

  paragraphs.forEach((paragraph) => {
    if (!current) {
      current = paragraph;
      return;
    }

    if (current.length + paragraph.length + 2 <= maxCharacters) {
      current = `${current}\n\n${paragraph}`;
      return;
    }

    chunks.push(current);
    current = paragraph;
  });

  if (current) chunks.push(current);
  return chunks;
};

const Humanizer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [originalText, setOriginalText] = useState("");
  const [revisedText, setRevisedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewMode, setReviewMode] = useState<HumanReviewMode>("standard");
  const [extractedDocument, setExtractedDocument] = useState<ExtractedDocumentText | null>(null);
  const [result, setResult] = useState<HumanReviewResult | null>(null);
  const [handoff, setHandoff] = useState<ReviewToolHandoff | null>(null);
  const [recentResults, setRecentResults] = useState<StoredToolResultRecord<"humanizer">[]>([]);
  const [resultReused, setResultReused] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [reviewStage, setReviewStage] = useState("Preparing text");

  const userId = user?.id || "guest";
  const wordCount = useMemo(() => originalText.trim().split(/\s+/).filter(Boolean).length, [originalText]);
  const revisedWordCount = useMemo(() => revisedText.trim().split(/\s+/).filter(Boolean).length, [revisedText]);
  const routeToolResultRecordId = useMemo(() => getRouteToolResultRecordId(location.state), [location.state]);
  const handoffSourceLabel = handoff ? getToolHandoffLabel(handoff.sourceTool) : null;
  const highSignalCount = result?.signals.filter((signal) => signal.severity === "high").length ?? 0;
  const remainingSignalCount = result?.remainingSignals?.length ?? 0;
  const isDeepMode = reviewMode === "deep";
  const aiDeepReviewAvailable = Boolean(getBrowserGeminiApiKey());
  const runButtonLabel = isDeepMode ? "Run deep review" : "Run human review";

  useEffect(() => {
    listToolResultRecords(userId, "humanizer", 8)
      .then(setRecentResults)
      .catch((error) => console.error("Failed to load human review history:", error));
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
    setResult(null);
    setRevisedText("");
    setResultReused(false);
  }, [location.state, routeToolResultRecordId]);

  const resetWorkspace = () => {
    clearToolHandoff();
    setOriginalText("");
    setRevisedText("");
    setFileName("");
    setExtractedDocument(null);
    setResult(null);
    setHandoff(null);
    setResultReused(false);
    setReviewMode("standard");
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
    setRevisedText("");
    setFileName(file.name);
    setHandoff(null);
    setResultReused(false);

    try {
      const extracted = await extractDocumentText(file);
      setExtractedDocument(extracted);
      setOriginalText(extracted.text);
      toast.success(`Extracted ${extracted.wordCount.toLocaleString()} words from ${file.name}`);
    } catch (error) {
      console.error("Human review extraction failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to extract document text");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReview = async () => {
    if (!originalText.trim()) {
      toast.error("Paste text or upload a document first");
      return;
    }

    setIsReviewing(true);
    setResultReused(false);
    setReviewProgress(10);
    setReviewStage("Preparing the text for authenticity and style review");

    try {
      setReviewProgress(24);
      setReviewStage("Creating an exact fingerprint for saved-work checks");
      const baseFingerprint = await createToolTextFingerprint(originalText);
      const fingerprint = {
        ...baseFingerprint,
        contentHash: `${baseFingerprint.contentHash}:${reviewMode}:human-review-v3`,
      };
      setReviewProgress(40);
      setReviewStage(`Checking for a saved ${isDeepMode ? "deep" : "standard"} review of this exact text`);
      const reusable = await findReusableToolResult<"humanizer">({
        userId,
        tool: "humanizer",
        fingerprint,
      });

      if (reusable.record) {
        setReviewProgress(78);
        setReviewStage("Restoring the saved human review");
        const reusedResult: HumanReviewResult = {
          ...reusable.record.result,
          reviewMode: reusable.record.result.reviewMode ?? reviewMode,
          reviewMethod: reusable.record.result.reviewMethod ?? "local",
          sourceContext: handoff,
        };
        await saveToolResult({
          userId,
          tool: "humanizer",
          fingerprint,
          inputText: originalText,
          result: reusedResult,
          fileName: fileName || handoff?.fileName || "pasted-text.txt",
          sourceContext: handoff,
          reusedFromId: reusable.record.id,
        });
        setResult(reusedResult);
        setRevisedText(reusedResult.revisedText);
        setResultReused(true);
        setRecentResults(await listToolResultRecords(userId, "humanizer", 8));
        setReviewProgress(100);
        setReviewStage("Human review ready");
        toast.success("Saved human review reused for this exact text");
        return;
      }

      setReviewProgress(58);
      setReviewStage(isDeepMode ? "Preparing paragraph-level deep review" : "Scanning for generic generated-writing patterns");
      await new Promise((resolve) => setTimeout(resolve, 250));
      setReviewProgress(76);
      setReviewStage(
        isDeepMode
          ? aiDeepReviewAvailable
            ? "Running Advanced Researcher paragraph review with strict preservation rules"
            : "Running local deep cleanup for flow, specificity, and academic directness"
          : "Cleaning stiff wording, artifacts, dashes, filler, and vague phrasing"
      );

      let nextResult: HumanReviewResult;
      if (isDeepMode) {
        let aiDraft = "";
        let method: HumanReviewResult["reviewMethod"] = "local";
        const summary: string[] = [];

        if (aiDeepReviewAvailable) {
          try {
            const chunks = createDeepReviewChunks(originalText);
            const revisedChunks: string[] = [];

            for (let index = 0; index < chunks.length; index += 1) {
              setReviewStage(`Advanced Researcher paragraph review ${index + 1} of ${chunks.length}`);
              const chunkDraft = cleanAiReviewText(
                await generateContent(createDeepReviewPrompt(chunks[index], handoff?.section))
              );

              if (!isAcceptableDeepRevision(chunks[index], chunkDraft)) {
                throw new Error("Advanced Researcher revision changed a paragraph group too much.");
              }

              revisedChunks.push(chunkDraft);
            }

            aiDraft = revisedChunks.join("\n\n");
            if (isAcceptableDeepRevision(originalText, aiDraft)) {
              method = "ai-assisted";
              summary.push(`Advanced Researcher paragraph rewrite completed in ${chunks.length} group${chunks.length === 1 ? "" : "s"} with preservation rules.`);
            } else {
              method = "ai-fallback";
              aiDraft = "";
              summary.push("Advanced Researcher output was rejected because it changed length or format too much.");
            }
          } catch (error) {
            console.error("AI-assisted deep review unavailable:", error);
            method = "ai-fallback";
            summary.push("Advanced Researcher review was unavailable, so local deep review was used.");
          }
        } else {
          summary.push("No Advanced Researcher key was available, so local deep review was used.");
        }

        nextResult = humanizeResearchText(originalText, handoff, {
          mode: "deep",
          method,
          preRevisedText: aiDraft || undefined,
          deepReviewSummary: summary,
        });
      } else {
        nextResult = humanizeResearchText(originalText, handoff, { mode: "standard", method: "local" });
      }

      setReviewProgress(90);
      setReviewStage("Saving the revised text and signal list");
      await saveToolResult({
        userId,
        tool: "humanizer",
        fingerprint,
        inputText: originalText,
        result: nextResult,
        fileName: fileName || handoff?.fileName || "pasted-text.txt",
        sourceContext: handoff,
      });
      setResult(nextResult);
      setRevisedText(nextResult.revisedText);
      setRecentResults(await listToolResultRecords(userId, "humanizer", 8));
      setReviewProgress(100);
      setReviewStage(isDeepMode ? "Deep human review ready" : "Human review ready");
      toast.success(isDeepMode ? "Deep human review complete" : "Human review complete", {
        description: `${nextResult.signals.length} signal${nextResult.signals.length === 1 ? "" : "s"} found, ${nextResult.changes.length} cleanup ${nextResult.changes.length === 1 ? "change" : "changes"} applied.`,
      });
    } catch (error) {
      console.error("Failed to run or save human review:", error);
      const fallbackResult = humanizeResearchText(originalText, handoff, {
        mode: reviewMode,
        method: isDeepMode ? "ai-fallback" : "local",
      });
      setResult(fallbackResult);
      setRevisedText(fallbackResult.revisedText);
      setReviewProgress(100);
      setReviewStage(isDeepMode ? "Deep human review ready" : "Human review ready");
      toast.error("Local history was unavailable, so a fresh human review was created");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleCopy = async () => {
    if (!revisedText.trim()) return;
    await navigator.clipboard.writeText(revisedText);
    toast.success("Revised text copied");
  };

  const handleDownload = () => {
    if (!revisedText.trim()) return;
    const baseName = fileName ? fileName.replace(/\.[^.]+$/, "") : "research-text";
    if (result) {
      downloadHumanReviewPdf({ ...result, revisedText }, fileName || "research-text", user?.name || user?.email);
      return;
    }
    downloadTextFile(revisedText, sanitizeFileName(`human-review-${baseName}.txt`));
    toast.success("Human review text download started");
  };

  const loadSavedReview = (record: StoredToolResultRecord<"humanizer">) => {
    const savedHandoff = record.sourceContext ?? null;
    setOriginalText(record.inputText || record.result.originalText || record.inputPreview);
    setRevisedText(record.result.revisedText);
    setFileName(record.fileName || "saved-human-review.txt");
    setResult(record.result);
    setReviewMode(record.result.reviewMode ?? "standard");
    setHandoff(savedHandoff);
    setExtractedDocument(null);
    setResultReused(true);
    toast.success("Saved human review opened");
  };

  useEffect(() => {
    if (!routeToolResultRecordId) return;

    let cancelled = false;
    getToolResultRecord<"humanizer">(routeToolResultRecordId)
      .then((record) => {
        if (cancelled || !record || record.userId !== userId) return;
        loadSavedReview(record);
      })
      .catch((error) => console.error("Failed to restore saved human review:", error));

    return () => {
      cancelled = true;
    };
  }, [routeToolResultRecordId, userId]);

  const sendToContentImprovement = () => {
    const textToImprove = revisedText.trim() || originalText.trim();
    if (!textToImprove) {
      toast.error("No text available to improve");
      return;
    }

    const handoffPayload: ReviewToolHandoff = {
      sourceTool: "humanizer",
      fileName: fileName || "human-reviewed-content.txt",
      documentType: handoff?.documentType,
      section: handoff?.section,
      selectedText: textToImprove,
      issueLabel: handoff?.issueLabel ? `Human reviewed: ${handoff.issueLabel}` : "Human reviewed text",
      pageNumber: handoff?.pageNumber,
    };
    saveToolHandoff(handoffPayload);
    navigate("/content-improvement", { state: handoffPayload });
  };

  const runOriginalityCheck = () => {
    const textToCheck = revisedText.trim() || originalText.trim();
    if (!textToCheck) {
      toast.error("No text available to check");
      return;
    }

    const handoffPayload: ReviewToolHandoff = {
      sourceTool: "humanizer",
      fileName: fileName || "human-reviewed-content.txt",
      documentType: handoff?.documentType,
      section: handoff?.section,
      selectedText: textToCheck,
      issueLabel: handoff?.issueLabel ? `Human reviewed: ${handoff.issueLabel}` : "Human reviewed originality check",
      pageNumber: handoff?.pageNumber,
    };
    saveToolHandoff(handoffPayload);
    navigate("/plagiarism-checker", { state: handoffPayload });
  };

  return (
    <DashboardLayout>
      <WorkspacePage width="wide" dockPadding={revisedText.trim() ? "expanded" : "none"}>
        <WorkspacePageHeader
          eyebrow="Human review"
          tone="info"
          icon={<Wand2 size={14} />}
          title="Make research writing sound clear, specific, and student-reviewed"
          description="Scan pasted text or a document for robotic phrasing, vague claims, stiff transitions, dash overuse, chatbot artifacts, loose citation marks, and over-polished vocabulary. The tool rewrites only safe wording and keeps facts, citations, and data under student control."
          actions={
            <>
              <div className="grid grid-cols-2 rounded-lg border bg-white/80 p-1">
                <Button
                  type="button"
                  variant={reviewMode === "standard" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setReviewMode("standard")}
                  disabled={isReviewing}
                  className="gap-2"
                >
                  <ScanText size={15} />
                  Standard
                </Button>
                <Button
                  type="button"
                  variant={reviewMode === "deep" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setReviewMode("deep")}
                  disabled={isReviewing}
                  className="gap-2"
                >
                  <Sparkles size={15} />
                  Deep
                </Button>
              </div>
              <Button onClick={handleReview} disabled={isExtracting || isReviewing || !originalText.trim()} className="gap-2">
                {isReviewing ? <Loader2 size={16} className="animate-spin" /> : <ScanText size={16} />}
                {isReviewing ? "Reviewing text" : runButtonLabel}
              </Button>
              <Button type="button" variant="outline" onClick={resetWorkspace} className="gap-2 bg-white/80">
                <RotateCcw size={16} />
                Start fresh
              </Button>
              <Button asChild variant="outline" className="gap-2 bg-white/80">
                <Link to="/content-improvement">
                  Writing improvement
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </>
          }
          aside={
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-muted text-info shadow-sm">
                  <ShieldCheck size={21} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">Review status</h2>
                  <p className="truncate text-sm text-muted-foreground">
                    {result
                      ? `${result.readinessScore}/100 readiness after ${result.reviewMode === "deep" ? "deep" : "standard"} cleanup`
                      : `${isDeepMode ? "Deep" : "Standard"} mode selected.`}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <WorkspaceMetric label="Readiness" value={result ? `${result.readinessScore}/100` : "--"} tone={result ? "success" : "neutral"} />
                <WorkspaceMetric label="Signals" value={result?.signals.length ?? 0} tone={highSignalCount ? "warning" : "info"} />
                <WorkspaceMetric label="Remaining" value={remainingSignalCount} tone={remainingSignalCount ? "warning" : "success"} />
              </div>
              {isDeepMode && (
                <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-6 text-sky-950">
                  {aiDeepReviewAvailable
                    ? "Deep mode will use the configured Advanced Researcher key, then rescan locally."
                    : "Deep mode will use local paragraph review until an Advanced Researcher key is configured."}
                </div>
              )}
              {handoff && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-info-muted text-info-foreground">{handoffSourceLabel}</Badge>
                    {handoff.fileName && <Badge variant="outline" className="max-w-full truncate bg-muted/50">{handoff.fileName}</Badge>}
                    {handoff.section && <Badge variant="outline" className="max-w-full truncate bg-muted/50">{handoff.section}</Badge>}
                  </div>
                  {handoff.sourceTool !== "humanizer" && (
                    <Button type="button" variant="outline" size="sm" className="gap-2 bg-white" onClick={returnToSourceTool}>
                      Return to {handoffSourceLabel}
                      <ArrowRight size={14} />
                    </Button>
                  )}
                </div>
              )}
              {resultReused && (
                <WorkspaceStatusNote
                  tone="success"
                  icon={<RotateCcw size={16} />}
                  title="Saved review reused"
                  description="This exact text was already reviewed, so the verified saved result was restored."
                  className="mt-4"
                />
              )}
            </>
          }
        >
          {isReviewing && (
              <OperationProgress
              title={isDeepMode ? "Running deep human review" : "Running human review"}
              stage={reviewStage}
              value={reviewProgress}
              steps={isDeepMode ? deepReviewSteps : reviewSteps}
              className="mt-5"
            />
          )}
        </WorkspacePageHeader>

        <section className="mt-8 grid min-w-0 gap-5 xl:grid-cols-2">
          <Card className="study-card min-w-0 rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Original text"
              description={`${wordCount.toLocaleString()} words ready for human review.`}
              icon={<FileText size={18} />}
            />

            <div className="space-y-4">
              <DocumentUploadField
                id="human-review-file"
                label="Research document"
                prompt="Upload PDF, DOCX, or TXT"
                description="The extracted text will be placed in the editor below."
                accept=".pdf,.docx,.txt"
                fileName={fileName}
                disabled={isExtracting || isReviewing}
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
                  setRevisedText("");
                }}
                placeholder="Paste over-polished research wording here for review..."
                className="min-h-[520px] resize-y bg-white/85 text-sm leading-7"
              />
            </div>
          </Card>

          <Card className="study-card min-w-0 rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Revised text"
              description={`${revisedWordCount.toLocaleString()} words after safe cleanup.`}
              actions={
                <>
                  <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={handleCopy} disabled={!revisedText.trim()}>
                    <Clipboard size={15} />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={handleDownload} disabled={!revisedText.trim()}>
                    <Download size={15} />
                    Export PDF
                  </Button>
                </>
              }
            />

            <Textarea
              value={revisedText}
              onChange={(event) => setRevisedText(event.target.value)}
              placeholder="The cleaned, more natural version will appear here..."
              className="min-h-[520px] resize-y bg-white/85 text-sm leading-7"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              <Button onClick={sendToContentImprovement} disabled={!revisedText.trim() && !originalText.trim()} className="w-full gap-2 whitespace-normal text-center">
                <PenLine size={16} />
                Improve academic flow
              </Button>
              <Button variant="outline" className="w-full gap-2 whitespace-normal bg-white text-center" onClick={runOriginalityCheck} disabled={!revisedText.trim() && !originalText.trim()}>
                <Highlighter size={16} />
                Check originality
              </Button>
              <Button variant="outline" className="w-full gap-2 whitespace-normal bg-white text-center sm:col-span-2 2xl:col-span-1" onClick={handleReview} disabled={isExtracting || isReviewing || !originalText.trim()}>
                <Sparkles size={16} />
                Review again
              </Button>
            </div>
          </Card>
        </section>

        <section className="mt-8">
          <Card className="study-card rounded-lg p-6">
            <h2 className="text-xl font-semibold">Pattern review</h2>
            <p className="mt-1 text-sm text-muted-foreground">Signals found and safe cleanup actions applied.</p>

            {result && (
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                <WorkspaceMetric
                  label="Readiness after cleanup"
                  value={`${result.readinessScore}/100`}
                  detail="Higher means fewer style signals remain."
                  tone={result.readinessScore >= 80 ? "success" : result.readinessScore >= 55 ? "warning" : "danger"}
                />
                <WorkspaceMetric
                  label="Signals reviewed"
                  value={result.signals.length}
                  detail={`${highSignalCount} high-attention signal${highSignalCount === 1 ? "" : "s"}.`}
                  tone={highSignalCount ? "warning" : "info"}
                />
                <WorkspaceMetric
                  label="Signals remaining"
                  value={remainingSignalCount}
                  detail="After cleanup and rescan."
                  tone={remainingSignalCount ? "warning" : "success"}
                />
                <WorkspaceMetric
                  label="Safe cleanup changes"
                  value={result.changes.length}
                  detail="Facts, figures, and references stay under student control."
                  tone="success"
                />
              </div>
            )}

            {!result && (
              <WorkspaceEmptyState
                icon={<ScanText size={20} />}
                title="Pattern review will appear here"
                description="Run the review to see generic phrasing, artifact, style, and citation-integrity signals."
                className="mt-5"
              />
            )}

            {result && (
              <div className="mt-5 space-y-4">
                <div className="rounded-lg border bg-white/80 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary">
                      {result.reviewMode === "deep" ? "Deep review" : "Standard review"}
                    </Badge>
                    <Badge variant="outline" className="bg-muted/60 capitalize">
                      {(result.reviewMethod ?? "local").replace("-", " ")}
                    </Badge>
                    <Badge variant="outline" className={remainingSignalCount ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}>
                      {remainingSignalCount} remaining signal{remainingSignalCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  {result.deepReviewSummary && result.deepReviewSummary.length > 0 && (
                    <div className="mt-3 space-y-1 text-sm leading-6 text-muted-foreground">
                      {result.deepReviewSummary.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  )}
                </div>

                {result.signals.length > 0 ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {result.signals.map((signal) => (
                      <div key={signal.id} className={`rounded-lg border p-3 ${categoryStyles[signal.category]}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline" className="bg-white/80">{signal.category}</Badge>
                          <Badge variant="outline" className="bg-white/80 capitalize">{signal.severity}</Badge>
                        </div>
                        <p className="mt-3 font-semibold">{signal.label}</p>
                        <p className="mt-1 text-sm leading-6">{signal.description}</p>
                        <p className="mt-2 text-xs leading-5 opacity-80">{signal.suggestion}</p>
                        <div className="mt-3 space-y-2">
                          {signal.matches.slice(0, 3).map((match) => (
                            <div key={`${signal.id}-${match.index}`} className="rounded-md bg-white/70 p-2 text-xs leading-5">
                              <span className="font-semibold">{match.text}</span>
                              <span className="block opacity-75">{match.snippet}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    No major generated-writing style signals found.
                  </div>
                )}

                <Separator />

                <div className="grid gap-3 lg:grid-cols-2">
                  {result.changes.map((change, index) => (
                    <div key={`${change.category}-${index}`} className="rounded-lg border bg-white/75 p-3">
                      <Badge variant="outline" className="bg-primary/5 text-primary">{change.category}</Badge>
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
                    <p className="font-semibold text-amber-950">Student review needed</p>
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

        <section className="mt-8">
          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Recent human reviews"
              description="Saved locally and reused when the exact same text appears again."
              actions={<WorkspaceCountBadge count={recentResults.length} />}
            />

            {recentResults.length === 0 ? (
              <WorkspaceEmptyState
                icon={<Wand2 size={20} />}
                title="No saved human reviews yet"
                description="Human-reviewed sections will appear here after you run the tool."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {recentResults.map((record) => (
                  <SavedWorkCard
                    key={record.id}
                    title={record.issueLabel || record.fileName || "Human review"}
                    meta={`${record.wordCount.toLocaleString()} words - ${record.runs} run${record.runs === 1 ? "" : "s"}`}
                    status={
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge variant="outline" className="bg-muted/60">
                          {record.result.reviewMode === "deep" ? "Deep" : "Standard"}
                        </Badge>
                        <Badge variant="outline" className="bg-success-muted text-success-foreground">
                          {record.result.readinessScore}/100
                        </Badge>
                      </div>
                    }
                    summary={<p className="line-clamp-2">{record.inputPreview}</p>}
                    actions={
                      <>
                        <Button type="button" variant="outline" size="sm" className="gap-2 bg-white" onClick={() => loadSavedReview(record)}>
                          <RotateCcw size={14} />
                          Resume
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 bg-white"
                          onClick={() => {
                            downloadHumanReviewPdf(record.result, record.fileName || "saved-review", user?.name || user?.email);
                          }}
                        >
                          <Download size={14} />
                          Export PDF
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </Card>
        </section>

        {revisedText.trim() && (
          <WorkspaceActionDock
            width="wide"
            title="Human review ready"
            description="Copy, download, improve the flow, or check originality."
            primaryAction={{
              label: "Improve flow",
              icon: <PenLine size={16} />,
              onClick: sendToContentImprovement,
            }}
            secondaryActions={[
              {
                label: "Copy",
                icon: <Clipboard size={16} />,
                onClick: handleCopy,
                variant: "outline",
              },
              {
                label: "Export PDF",
                icon: <Download size={16} />,
                onClick: handleDownload,
                variant: "outline",
              },
              {
                label: "Originality",
                icon: <BadgeCheck size={16} />,
                onClick: runOriginalityCheck,
                variant: "outline",
              },
            ]}
          />
        )}
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default Humanizer;
