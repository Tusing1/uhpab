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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { OperationProgress } from "@/components/ui/operation-progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildMarkedPlagiarismReport,
  downloadPlagiarismPdf,
  passageReviewLabel,
  type MarkerTone,
  type PlagiarismReport,
} from "@/lib/researchTextMarkers";
import { extractDocumentText, type ExtractedDocumentText } from "@/lib/documentTextExtraction";
import {
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
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileCheck,
  FileText,
  Highlighter,
  Info,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Upload,
  Wand2,
} from "lucide-react";

const demoText = `This chapter presents the background of the study, problem statement, purpose of the study, objectives, research questions, justification and significance of the study. It is against this background that the study sought to assess factors associated with uptake of cervical cancer screening among women of reproductive age. According to Ministry of Health (2023), cervical cancer screening remains an important public health intervention. The findings of the study revealed that knowledge, accessibility and attitude influence service uptake. The researcher recommends that health workers strengthen health education and community sensitization.`;

const toneStyles: Record<MarkerTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-800",
  common: "border-slate-200 bg-slate-100 text-slate-700",
  moderate: "border-amber-200 bg-amber-50 text-amber-950",
  high: "border-rose-200 bg-rose-50 text-rose-950",
  citation: "border-blue-200 bg-blue-50 text-blue-950",
  missing: "border-rose-200 bg-rose-50 text-rose-950",
};

const toneBadgeStyles: Record<MarkerTone, string> = {
  neutral: "bg-white text-slate-700",
  common: "bg-white text-slate-700",
  moderate: "bg-white text-amber-700",
  high: "bg-white text-rose-700",
  citation: "bg-white text-blue-700",
  missing: "bg-white text-rose-700",
};

const legend = [
  { tone: "common" as MarkerTone, label: "Excluded common wording" },
  { tone: "citation" as MarkerTone, label: "Citation check" },
  { tone: "moderate" as MarkerTone, label: "Review wording" },
  { tone: "high" as MarkerTone, label: "High attention" },
];

const originalitySteps = [
  "Prepare text",
  "Exclude common wording",
  "Mark passages",
  "Save report",
];

const getRouteToolResultRecordId = (state: unknown) => {
  if (!state || typeof state !== "object") return null;
  const candidate = state as { toolResultRecordId?: unknown };
  return typeof candidate.toolResultRecordId === "string" ? candidate.toolResultRecordId : null;
};

const PlagiarismChecker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [documentText, setDocumentText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState("Preparing document text");
  const [report, setReport] = useState<PlagiarismReport | null>(null);
  const [extractedDocument, setExtractedDocument] = useState<ExtractedDocumentText | null>(null);
  const [handoff, setHandoff] = useState<ReviewToolHandoff | null>(null);
  const [recentResults, setRecentResults] = useState<StoredToolResultRecord<"plagiarism-checker">[]>([]);
  const [resultReused, setResultReused] = useState(false);

  const userId = user?.id || "guest";
  const highAttention = useMemo(() => report?.passages.filter((passage) => passage.tone === "high") ?? [], [report]);
  const moderateAttention = useMemo(() => report?.passages.filter((passage) => passage.tone === "moderate") ?? [], [report]);
  const handoffSourceLabel = handoff ? getToolHandoffLabel(handoff.sourceTool) : null;
  const routeToolResultRecordId = useMemo(
    () => getRouteToolResultRecordId(location.state),
    [location.state]
  );

  useEffect(() => {
    listToolResultRecords(userId, "plagiarism-checker")
      .then(setRecentResults)
      .catch((error) => console.error("Failed to load originality history:", error));
  }, [userId]);

  useEffect(() => {
    if (routeToolResultRecordId) return;
    const routeState = isReviewToolHandoff(location.state) ? location.state : null;
    const incoming = routeState ?? loadToolHandoff();
    if (!incoming?.selectedText) return;

    if (routeState) saveToolHandoff(routeState);
    setHandoff(incoming);
    setDocumentText(incoming.selectedText);
    setFileName(incoming.fileName || "handoff-text.txt");
    setExtractedDocument({
      text: incoming.selectedText,
      pageCount: incoming.pageNumber ? 1 : null,
      wordCount: incoming.selectedText.trim().split(/\s+/).filter(Boolean).length,
      characterCount: incoming.selectedText.length,
      sourceType: "text",
      chunks: [
        {
          pageNumber: incoming.pageNumber ?? null,
          sectionTitle: incoming.section || "handoff",
          chapter: incoming.section || "Selected text",
          text: incoming.selectedText,
        },
      ],
    });
    setReport(null);
    setResultReused(false);
  }, [location.state, routeToolResultRecordId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setReport(null);
    setExtractedDocument(null);
    setHandoff(null);
    setResultReused(false);
    setIsExtracting(true);

    try {
      const extracted = await extractDocumentText(file);
      setDocumentText(extracted.text);
      setExtractedDocument(extracted);
      toast.success(`Extracted ${extracted.wordCount.toLocaleString()} words from ${file.name}`);
    } catch (error) {
      console.error("Failed to extract document text:", error);
      toast.error(error instanceof Error ? error.message : "Failed to extract document text");
      setDocumentText("");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCheck = async () => {
    if (!documentText.trim()) {
      toast.error("Paste text or upload a text-based document first");
      return;
    }

    setIsChecking(true);
    setReport(null);
    setResultReused(false);
    setScanProgress(8);
    setScanStage("Preparing the text for a consistent originality check");

    try {
      setScanProgress(18);
      setScanStage("Creating a secure text fingerprint");
      const fingerprint = await createToolTextFingerprint(documentText);
      setScanProgress(34);
      setScanStage("Checking for a saved result from this exact text");
      const reusable = await findReusableToolResult<"plagiarism-checker">({
        userId,
        tool: "plagiarism-checker",
        fingerprint,
      });

      if (reusable.record) {
        setScanProgress(78);
        setScanStage("Restoring the verified saved originality report");
        await new Promise((resolve) => setTimeout(resolve, 350));
        await saveToolResult({
          userId,
          tool: "plagiarism-checker",
          fingerprint,
          inputText: documentText,
          result: reusable.record.result,
          fileName: fileName || handoff?.fileName || "document-text.txt",
          sourceContext: handoff,
          reusedFromId: reusable.record.id,
        });
        setReport(reusable.record.result);
        setScanProgress(100);
        setScanStage("Originality report ready");
        setResultReused(true);
        setRecentResults(await listToolResultRecords(userId, "plagiarism-checker"));
        toast.success("Saved originality report reused for this exact text");
        return;
      }

      setScanProgress(50);
      setScanStage("Excluding standard research structure and common academic wording");
      await new Promise((resolve) => setTimeout(resolve, 350));
      setScanProgress(72);
      setScanStage("Marking passages that need a citation or wording review");
      const markedReport = buildMarkedPlagiarismReport(documentText);
      setScanProgress(88);
      setScanStage("Saving the marked report to the review archive");
      await saveToolResult({
        userId,
        tool: "plagiarism-checker",
        fingerprint,
        inputText: documentText,
        result: markedReport,
        fileName: fileName || handoff?.fileName || "document-text.txt",
        sourceContext: handoff,
      });
      setReport(markedReport);
      setScanProgress(100);
      setScanStage("Originality report ready");
      setRecentResults(await listToolResultRecords(userId, "plagiarism-checker"));
      toast.success("Originality review complete", {
        description: `${markedReport.uncommonFlagCount} ${markedReport.uncommonFlagCount === 1 ? "passage needs" : "passages need"} review.`,
      });
    } catch (error) {
      console.error("Failed to check or store originality report:", error);
      const markedReport = buildMarkedPlagiarismReport(documentText);
      setReport(markedReport);
      setScanProgress(100);
      setScanStage("Originality report ready");
      toast.error("Local history was unavailable, so a fresh report was created");
    } finally {
      setIsChecking(false);
    }
  };

  const loadDemo = () => {
    setDocumentText(demoText);
    setFileName("demo-research-extract.txt");
    setHandoff(null);
    setResultReused(false);
    setExtractedDocument({
      text: demoText,
      pageCount: 1,
      wordCount: demoText.trim().split(/\s+/).length,
      characterCount: demoText.length,
      sourceType: "text",
      chunks: [
        {
          pageNumber: 1,
          sectionTitle: "introduction",
          chapter: "Chapter One",
          text: demoText,
        },
      ],
    });
    setReport(null);
  };

  const buildImprovementHandoff = (
    passage: PlagiarismReport["passages"][number],
    baseFileName: string,
    baseHandoff?: ReviewToolHandoff | null
  ): ReviewToolHandoff => {
    const pageMatch = passage.location.match(/page\s+(\d+)/i);

    return {
      sourceTool: "plagiarism-checker",
      fileName: baseFileName || "flagged-passage.txt",
      documentType: baseHandoff?.documentType,
      section: baseHandoff?.section ? `${baseHandoff.section} - ${passage.location}` : passage.location,
      selectedText: passage.text,
      issueLabel: baseHandoff?.issueLabel ? `${passage.label} from ${baseHandoff.issueLabel}` : passage.label,
      pageNumber: pageMatch ? Number(pageMatch[1]) : baseHandoff?.pageNumber ?? null,
    };
  };

  const improveFlaggedPassage = (passage: PlagiarismReport["passages"][number]) => {
    const handoffPayload = buildImprovementHandoff(passage, fileName || "flagged-passage.txt", handoff);
    saveToolHandoff(handoffPayload);
    navigate("/content-improvement", { state: handoffPayload });
  };

  const humanReviewFlaggedPassage = (passage: PlagiarismReport["passages"][number]) => {
    const handoffPayload = buildImprovementHandoff(passage, fileName || "flagged-passage.txt", handoff);
    saveToolHandoff(handoffPayload);
    navigate("/humanizer", { state: handoffPayload });
  };

  const loadSavedOriginalityCheck = (record: StoredToolResultRecord<"plagiarism-checker">) => {
    const inputText = record.inputText || record.inputPreview;
    setDocumentText(inputText);
    setFileName(record.fileName || "saved-originality-check.txt");
    setReport(record.result);
    setHandoff(record.sourceContext ?? null);
    setResultReused(true);
    setScanProgress(100);
    setExtractedDocument({
      text: inputText,
      pageCount: record.pageNumber ? 1 : null,
      wordCount: record.wordCount,
      characterCount: record.characterCount,
      sourceType: "text",
      chunks: [
        {
          pageNumber: record.pageNumber ?? null,
          sectionTitle: record.section || "saved check",
          chapter: record.section || "Saved originality check",
          text: inputText,
        },
      ],
    });
    toast.success("Saved originality report opened");
  };

  useEffect(() => {
    if (!routeToolResultRecordId) return;

    let cancelled = false;
    getToolResultRecord<"plagiarism-checker">(routeToolResultRecordId)
      .then((record) => {
        if (cancelled || !record || record.userId !== userId) return;
        loadSavedOriginalityCheck(record);
      })
      .catch((error) => console.error("Failed to restore saved originality check:", error));

    return () => {
      cancelled = true;
    };
  }, [routeToolResultRecordId, userId]);

  const improveSavedOriginalityFlag = (record: StoredToolResultRecord<"plagiarism-checker">) => {
    const passage = record.result.passages.find((item) => item.tone !== "common" && item.tone !== "neutral");
    if (!passage) {
      toast.success("No passage needs correction in this saved report");
      return;
    }

    const handoffPayload = buildImprovementHandoff(
      passage,
      record.fileName || "saved-originality-flag.txt",
      record.sourceContext
    );
    saveToolHandoff(handoffPayload);
    navigate("/content-improvement", { state: handoffPayload });
  };

  const humanReviewSavedOriginalityFlag = (record: StoredToolResultRecord<"plagiarism-checker">) => {
    const passage = record.result.passages.find((item) => item.tone !== "common" && item.tone !== "neutral");
    if (!passage) {
      toast.success("No passage needs human review in this saved report");
      return;
    }

    const handoffPayload = buildImprovementHandoff(
      passage,
      record.fileName || "saved-originality-flag.txt",
      record.sourceContext
    );
    saveToolHandoff(handoffPayload);
    navigate("/humanizer", { state: handoffPayload });
  };

  return (
    <DashboardLayout>
      <WorkspacePage dockPadding={report ? "standard" : "none"}>
        <WorkspacePageHeader
          eyebrow="Originality review"
          tone="danger"
          icon={<ShieldCheck size={14} />}
          title="Highlight what matters, ignore ordinary research wording"
          description="Common research terms stay neutral. The checker focuses attention on uncommon phrasing, template-like sentences, missing citation cues, and passages students should rewrite."
          actions={
            <>
              <Button onClick={loadDemo} variant="outline" className="gap-2 bg-white/80">
                <Highlighter size={16} />
                Load demo text
              </Button>
              <Button asChild className="gap-2">
                <Link to="/document-analysis">
                  Marking-guide analysis
                  <FileCheck size={16} />
                </Link>
              </Button>
            </>
          }
          aside={
            <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-muted text-success shadow-sm">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="font-semibold">Marker legend</h2>
                <p className="text-sm text-muted-foreground">Consistent review colors across every report.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {legend.map((item) => (
                <div key={item.tone} className={`rounded-lg border px-3 py-2 text-sm ${toneStyles[item.tone]}`}>
                  {item.label}
                </div>
              ))}
            </div>
            {handoff && (
              <div className="mt-5 rounded-lg border bg-muted/40 p-4">
                <p className="text-sm font-semibold">Current source</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Checking text sent from {handoffSourceLabel}
                  {handoff.issueLabel ? ` for ${handoff.issueLabel}` : ""}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {handoff.fileName && <Badge variant="outline" className="max-w-full truncate bg-white">{handoff.fileName}</Badge>}
                  {handoff.documentType && <Badge variant="outline" className="bg-white">{handoff.documentType}</Badge>}
                  {handoff.section && <Badge variant="outline" className="max-w-full truncate bg-white">{handoff.section}</Badge>}
                </div>
                {handoff.sourceTool !== "plagiarism-checker" && (
                  <Button asChild variant="outline" size="sm" className="mt-4 gap-2 bg-white">
                    <Link to={getToolHandoffRoute(handoff.sourceTool)} state={handoff}>
                      Return to {handoffSourceLabel}
                      <ArrowRight size={14} />
                    </Link>
                  </Button>
                )}
              </div>
            )}
            </>
          }
        >
          <div className="mt-4 grid gap-2 text-sm leading-6 text-muted-foreground">
            <p>This local review does not claim verified matches against internet, publication, or student-paper databases.</p>
            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-foreground/75">
              Standard chapter-opening lists and other expected research structure are excluded from review attention.
            </p>
          </div>
        </WorkspacePageHeader>

        <section className="mt-8 grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
          <Card className="study-card animate-fade-up rounded-lg p-6 [animation-delay:120ms]">
            <WorkspaceSectionHeader
              title="1. Add text to scan"
              description="Paste text or upload a text-based file."
              icon={<Upload size={18} />}
            />

            <div className="space-y-5">
              <DocumentUploadField
                id="document-upload"
                label="Research document"
                prompt="Upload PDF, DOCX, or TXT"
                description="The extracted text will be placed in the scanning area below."
                accept=".txt,.docx,.pdf"
                fileName={fileName}
                disabled={isChecking || isExtracting}
                onChange={handleFileUpload}
              />

              {isExtracting && (
                <div className="rounded-lg border bg-sky-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-sky-950">
                    <Loader2 size={16} className="animate-spin" />
                    Extracting text from uploaded document...
                  </div>
                  <p className="mt-1 text-xs text-sky-900/75">Long PDFs may take a few seconds.</p>
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
                    <p className="text-xs text-muted-foreground">Words</p>
                    <p className="font-semibold">{extractedDocument.wordCount.toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="document-text">Document text</Label>
                <Textarea
                  id="document-text"
                  value={documentText}
                  onChange={(event) => {
                    setDocumentText(event.target.value);
                    setReport(null);
                    setResultReused(false);
                  }}
                  placeholder="Paste your research text here..."
                  className="min-h-[420px] resize-y bg-white/85 text-sm leading-7 lg:min-h-[560px]"
                  disabled={isChecking || isExtracting}
                />
              </div>

              <Button onClick={handleCheck} disabled={isChecking || isExtracting || !documentText.trim()} size="lg" className="w-full gap-2">
                {isChecking ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Building marked report
                  </>
                ) : (
                  <>
                    <Highlighter size={16} />
                    Check and mark text
                  </>
                )}
              </Button>
            </div>
          </Card>

          <Card className="study-card animate-fade-up rounded-lg p-6 [animation-delay:180ms]">
            <WorkspaceSectionHeader
              title="2. Marked originality report"
              description="A PDF-ready report with color-coded passages and actions."
              actions={report && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit gap-2 bg-white"
                  onClick={() => downloadPlagiarismPdf(report, fileName || "document-text", user?.name || user?.email)}
                >
                  <Download size={15} />
                  Export PDF
                </Button>
              )}
            />

            {isChecking && (
              <OperationProgress
                title="Building the originality report"
                stage={scanStage}
                value={scanProgress}
                steps={originalitySteps}
              />
            )}

            {!isChecking && !report && (
              <WorkspaceEmptyState
                tone="danger"
                icon={<FileText size={22} />}
                title="Marked output will appear here"
                description="Red and amber passages deserve attention. Grey passages are normal research language and should not distract students."
              />
            )}

            {report && (
              <div className="space-y-5">
                {resultReused && (
                  <WorkspaceStatusNote
                    tone="success"
                    icon={<RotateCcw size={16} />}
                    title="Saved originality report reused"
                    description="This exact text was already checked, so the verified saved report was restored."
                  />
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <WorkspaceMetric label="Original-looking wording" value={`${report.originalityScore}%`} tone="success" />
                  <WorkspaceMetric label="Review attention" value={`${report.similarityScore}%`} tone="danger" />
                  <WorkspaceMetric label="Common wording excluded" value={`${report.commonLanguagePercent}%`} />
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-lg border bg-white/75 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <BookOpenCheck className="h-5 w-5 text-primary" />
                      <p className="font-semibold">Filtered from report</p>
                    </div>
                    <div className="grid gap-2">
                      {report.filteredFromReport.map((item) => (
                        <div key={item} className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-white/75 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-primary" />
                      <p className="font-semibold">Possible source types</p>
                    </div>
                    {report.topSources.length > 0 ? (
                      <div className="space-y-2">
                        {report.topSources.map((source) => (
                          <div key={`${source.type}-${source.name}`} className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium">{source.type}</p>
                              <p className="text-xs text-muted-foreground">{source.name}</p>
                            </div>
                            <Badge variant="outline" className="bg-white">
                              Review
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
                        No meaningful source group after filtering common wording.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border bg-white/75 p-4">
                  <p className="mb-3 font-semibold">Review groups</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {report.matchGroups.map((group) => (
                      <div key={group.label} className={`rounded-md border p-3 ${toneStyles[group.tone]}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{group.count} {group.label}</p>
                            <p className="mt-1 text-xs leading-5 opacity-80">{group.description}</p>
                          </div>
                          <Badge variant="outline" className={toneBadgeStyles[group.tone]}>
                            {group.percent}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-700" />
                  <AlertTitle className="text-blue-950">Smart marking rule</AlertTitle>
                  <AlertDescription className="text-blue-900">
                    Ordinary research words like methodology, objectives, sample size, ethical considerations, and references are treated as neutral by default.
                  </AlertDescription>
                </Alert>

                {(highAttention.length > 0 || moderateAttention.length > 0) && (
                  <div className="rounded-lg border bg-white/75 p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <p className="font-semibold">Priority review</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {highAttention.length} high attention passage{highAttention.length === 1 ? "" : "s"} and {moderateAttention.length} wording review{moderateAttention.length === 1 ? "" : "s"} found.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {report.passages.map((passage) => (
                    <div key={passage.id} className={`rounded-lg border p-4 ${toneStyles[passage.tone]}`}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{passage.label}</p>
                            <Badge variant="outline" className={toneBadgeStyles[passage.tone]}>
                              {passageReviewLabel(passage.tone)}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6">{passage.text}</p>
                          <p className="mt-2 text-xs leading-5 opacity-80">{passage.reason}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 bg-white">
                          {passage.location}
                        </Badge>
                      </div>
                      {passage.tone !== "common" && passage.tone !== "neutral" && (
                        <div className="mt-3 flex flex-col gap-3 rounded-md bg-white/70 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                          <span>
                            <strong>Action:</strong> {passage.suggestion}
                          </span>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="bg-white"
                              onClick={() => humanReviewFlaggedPassage(passage)}
                            >
                              <Wand2 className="mr-1 h-3.5 w-3.5" />
                              Human review
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="bg-white"
                              onClick={() => improveFlaggedPassage(passage)}
                            >
                              Improve flagged passage
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {report.uncommonFlagCount === 0 && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                      <p className="font-semibold">No major uncommon flags detected</p>
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
              title="Recent originality checks"
              description="Saved locally in this browser and reused when the exact same text is checked again."
              actions={<WorkspaceCountBadge count={recentResults.length} />}
            />

            {recentResults.length === 0 ? (
              <WorkspaceEmptyState
                icon={<ShieldCheck size={20} />}
                title="No saved originality checks yet"
                description="Originality reports will appear here after you run a check."
              />
            ) : (
              <div className="grid min-w-0 gap-3 md:grid-cols-2">
                {recentResults.map((record) => (
                  <SavedWorkCard
                    key={record.id}
                    title={record.issueLabel || record.fileName || "Originality check"}
                    meta={`${record.wordCount.toLocaleString()} words - ${record.runs} run${record.runs === 1 ? "" : "s"}`}
                    status={
                      <Badge variant="outline" className="bg-success-muted text-success-foreground">
                        {record.result.originalityScore}% original-looking
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
                        onClick={() => loadSavedOriginalityCheck(record)}
                      >
                        <RotateCcw size={14} />
                        Resume
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-white"
                        onClick={() => downloadPlagiarismPdf(record.result, record.fileName || "saved-originality-check", user?.name || user?.email)}
                      >
                        <Download size={14} />
                        Export PDF
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2"
                        onClick={() => improveSavedOriginalityFlag(record)}
                      >
                        <ArrowRight size={14} />
                        Improve flag
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-white"
                        onClick={() => humanReviewSavedOriginalityFlag(record)}
                      >
                        <Wand2 size={14} />
                        Human review
                      </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </Card>
        </section>

        {report && (
          <WorkspaceActionDock
            title="Originality report ready"
            description={`${report.uncommonFlagCount} passage${report.uncommonFlagCount === 1 ? "" : "s"} need review after filtering common research wording.`}
            primaryAction={{
              label: "Export originality PDF",
              icon: <Download size={16} />,
              onClick: () => downloadPlagiarismPdf(report, fileName || "document-text", user?.name || user?.email),
            }}
          />
        )}
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default PlagiarismChecker;
