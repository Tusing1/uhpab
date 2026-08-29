import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { OperationProgress } from "@/components/ui/operation-progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { analyzeDocument, type AnalysisResult } from "@/utils/documentAnalysis";
import { useAuth } from "@/contexts/AuthContext";
import {
  createDocumentFingerprint,
  findReusableAnalysis,
  getAnalysisRecord,
  listAnalysisRecords,
  saveAnalysisRecord,
  type StoredAnalysisRecord,
} from "@/lib/documentAnalysisStore";
import { downloadMarkedAnalysisPdf, sampleAnalysisEvidence } from "@/lib/researchTextMarkers";
import {
  getToolHandoffLabel,
  getToolHandoffRoute,
  isReviewToolHandoff,
  loadToolHandoff,
  saveToolHandoff,
  type ReviewToolHandoff,
} from "@/lib/toolHandoff";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Info,
  ListChecks,
  Loader2,
  Download,
  RotateCcw,
  Upload,
} from "lucide-react";

const reportSections = [
  { value: "full", label: "Full report" },
  { value: "preliminary", label: "Preliminary pages" },
  { value: "introduction", label: "Introduction" },
  { value: "literature", label: "Literature review" },
  { value: "methodology", label: "Methodology" },
  { value: "results", label: "Results / findings" },
  { value: "discussion", label: "Discussion and conclusion" },
  { value: "references", label: "References" },
  { value: "appendices", label: "Appendices" },
];

const proposalSections = [
  { value: "full", label: "Full proposal" },
  { value: "preliminary", label: "Preliminary pages" },
  { value: "introduction", label: "Chapter one: Introduction" },
  { value: "literature", label: "Chapter two: Literature review" },
  { value: "methodology", label: "Chapter three: Methodology" },
  { value: "references", label: "References" },
  { value: "appendices", label: "Appendices" },
];

const analysisSteps = [
  "Read document",
  "Check saved work",
  "Apply marking guide",
  "Save result",
];

const statusStyles = {
  met: "border-emerald-200 bg-emerald-50 text-emerald-700",
  partial: "border-amber-200 bg-amber-50 text-amber-700",
  missing: "border-rose-200 bg-rose-50 text-rose-700",
};

const statusLabels = {
  met: "Awarded",
  partial: "Partial",
  missing: "Not awarded",
};

const hasReusedResult = (notes: string[]) => notes.some((note) => note.toLowerCase().includes("same file"));

const formatCriterionFinding = (text: string, status: "met" | "partial" | "missing") => {
  const cleaned = text
    .replace(/^Examiner note:\s*/i, "")
    .replace(/^Finding:\s*/i, "")
    .replace(/^Compare your findings with studies reviewed earlier\.$/i, "Findings are compared with studies reviewed earlier.")
    .replace(/^Explain what the findings mean for nursing or health practice\.$/i, "Implications for nursing or health practice are stated.");

  if (status === "met") return `Evidence identified: ${cleaned}`;
  if (status === "partial") return `Partial evidence identified: ${cleaned}`;
  return `Evidence not identified: ${cleaned}`;
};

type MarkingCriterion = NonNullable<AnalysisResult["rubricScore"]>["sections"][number]["criteria"][number];

const getRouteAnalysisRecordId = (state: unknown) => {
  if (!state || typeof state !== "object") return null;
  const candidate = state as { documentAnalysisRecordId?: unknown };
  return typeof candidate.documentAnalysisRecordId === "string" ? candidate.documentAnalysisRecordId : null;
};

const textFileNameFrom = (fileName?: string) => {
  const baseName = fileName?.trim()
    ? fileName.replace(/\.[a-z0-9]+$/i, "")
    : "pasted-marking-guide-text";

  return `${baseName.slice(0, 90)}.txt`;
};

const inferSectionFromHandoff = (handoff: ReviewToolHandoff) => {
  const haystack = `${handoff.section || ""} ${handoff.issueLabel || ""} ${handoff.selectedText.slice(0, 600)}`.toLowerCase();
  if (/preliminary|title page|contents|abstract|acronym|definition/.test(haystack)) return "preliminary";
  if (/chapter\s*(one|1)|introduction|background|problem|objective|question|justification|significance/.test(haystack)) return "introduction";
  if (/chapter\s*(two|2)|literature|framework/.test(haystack)) return "literature";
  if (/chapter\s*(three|3)|methodology|method|sampling|population|ethic|variable/.test(haystack)) return "methodology";
  if (/chapter\s*(four|4)|result|finding|table|figure/.test(haystack)) return "results";
  if (/chapter\s*(five|5)|discussion|conclusion|recommendation|practice/.test(haystack)) return "discussion";
  if (/reference|bibliography|citation/.test(haystack)) return "references";
  if (/appendix|appendices|consent|questionnaire|approval|map/.test(haystack)) return "appendices";
  return "full";
};

const DocumentAnalysis = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");
  const [manualFileName, setManualFileName] = useState("pasted-marking-guide-text.txt");
  const [handoff, setHandoff] = useState<ReviewToolHandoff | null>(null);
  const [documentType, setDocumentType] = useState<"proposal" | "report">("report");
  const [component, setComponent] = useState("full");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeRecord, setActiveRecord] = useState<StoredAnalysisRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<StoredAnalysisRecord[]>([]);
  const [cacheNotes, setCacheNotes] = useState<string[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState("Preparing document");

  const sectionOptions = documentType === "report" ? reportSections : proposalSections;
  const scorePercent = useMemo(() => {
    if (!result) return 0;
    return Math.round((result.matchedGuidelines / result.totalGuidelines) * 100);
  }, [result]);
  const markedEvidence = useMemo(() => (result ? sampleAnalysisEvidence(result).slice(0, 5) : []), [result]);
  const resultReused = hasReusedResult(cacheNotes);
  const routeAnalysisRecordId = useMemo(() => getRouteAnalysisRecordId(location.state), [location.state]);
  const handoffSourceLabel = handoff ? getToolHandoffLabel(handoff.sourceTool) : null;
  const hasManualText = manualText.trim().length > 0;

  const exportMarkingGuideReport = () => {
    if (!result) return;
    downloadMarkedAnalysisPdf(
      result,
      documentType,
      component,
      activeRecord?.fileName || file?.name || "document",
      user?.name || user?.email
    );
  };

  const sendCriterionToImprovement = (
    sectionTitle: string,
    criterion: MarkingCriterion,
    sourceRecord?: StoredAnalysisRecord | null
  ) => {
    const baseRecord = sourceRecord ?? activeRecord;
    const handoffPayload: ReviewToolHandoff = {
      sourceTool: "document-analysis",
      fileName: baseRecord?.fileName || file?.name,
      documentType: baseRecord?.documentType || documentType,
      section: sectionTitle,
      selectedText:
        criterion.evidenceSnippet ||
        `${criterion.label}. ${formatCriterionFinding(criterion.guidance, criterion.status)}`,
      issueLabel: criterion.label,
      pageNumber: criterion.pageNumber,
    };
    saveToolHandoff(handoffPayload);
    navigate("/content-improvement", { state: handoffPayload });
  };

  const improveCriterion = (sectionTitle: string, criterion: MarkingCriterion) => {
    sendCriterionToImprovement(sectionTitle, criterion);
  };

  const restoreStoredAnalysisRecord = (record: StoredAnalysisRecord) => {
    const restoredFile = new File([record.file], record.fileName, {
      type: record.fileType,
      lastModified: record.fileLastModified,
    });

    setFile(restoredFile);
    setDocumentType(record.documentType);
    setComponent(record.component);
    setResult(record.result);
    setActiveRecord(record);
    setCacheNotes(record.cacheNotes?.length ? record.cacheNotes : ["Saved marking-guide result restored."]);
    setAnalysisStatus("complete");
    toast.success("Saved marking-guide report opened");
  };

  const exportStoredAnalysisRecord = (record: StoredAnalysisRecord) => {
    downloadMarkedAnalysisPdf(
      record.result,
      record.documentType,
      record.component,
      record.fileName,
      user?.name || user?.email
    );
  };

  const improveStoredAnalysisRecord = (record: StoredAnalysisRecord) => {
    const section = record.result.rubricScore?.sections.find((item) =>
      item.criteria.some((criterion) => criterion.status !== "met")
    );
    const criterion = section?.criteria.find((item) => item.status !== "met");

    if (!section || !criterion) {
      toast.success("No missing or partial marking-guide criterion found in this saved result");
      return;
    }

    sendCriterionToImprovement(section.title, criterion, record);
  };

  useEffect(() => {
    const userId = user?.id || "guest";
    listAnalysisRecords(userId)
      .then(setRecentRecords)
      .catch((error) => console.error("Failed to load stored document checks:", error));
  }, [user?.id]);

  useEffect(() => {
    if (!routeAnalysisRecordId) return;

    let cancelled = false;
    const userId = user?.id || "guest";

    getAnalysisRecord(routeAnalysisRecordId)
      .then((record) => {
        if (cancelled || !record || record.userId !== userId) return;

        const restoredFile = new File([record.file], record.fileName, {
          type: record.fileType,
          lastModified: record.fileLastModified,
        });

        setFile(restoredFile);
        setDocumentType(record.documentType);
        setComponent(record.component);
        setResult(record.result);
        setActiveRecord(record);
        setCacheNotes(record.cacheNotes?.length ? record.cacheNotes : ["Saved marking-guide result restored from dashboard."]);
        setAnalysisStatus("complete");
      })
      .catch((error) => console.error("Failed to restore saved marking-guide result:", error));

    return () => {
      cancelled = true;
    };
  }, [routeAnalysisRecordId, user?.id]);

  useEffect(() => {
    if (routeAnalysisRecordId) return;

    const routeState = isReviewToolHandoff(location.state) ? location.state : null;
    const incoming = routeState ?? loadToolHandoff();
    if (!incoming?.selectedText?.trim()) return;

    if (routeState) saveToolHandoff(routeState);

    setHandoff(incoming);
    setFile(null);
    setManualText(incoming.selectedText);
    setManualFileName(textFileNameFrom(incoming.fileName));
    if (incoming.documentType === "proposal" || incoming.documentType === "report") {
      setDocumentType(incoming.documentType);
    }
    setComponent(inferSectionFromHandoff(incoming));
    setResult(null);
    setActiveRecord(null);
    setCacheNotes([]);
    setAnalysisStatus("idle");
    setAnalysisProgress(0);
    setAnalysisStage("Preparing document");
  }, [location.state, routeAnalysisRecordId]);

  const returnToSourceTool = () => {
    if (!handoff) return;
    navigate(getToolHandoffRoute(handoff.sourceTool), { state: handoff });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setHandoff(null);
      setResult(null);
      setActiveRecord(null);
      setCacheNotes([]);
      setAnalysisStatus("idle");
      setAnalysisProgress(0);
      setAnalysisStage("Preparing document");
    }
  };

  const handleManualTextChange = (value: string) => {
    setManualText(value);
    if (file) setFile(null);
    setResult(null);
    setActiveRecord(null);
    setCacheNotes([]);
    setAnalysisStatus("idle");
    setAnalysisProgress(0);
    setAnalysisStage("Preparing document");
  };

  const buildManualTextFile = () =>
    new File([manualText.trim()], manualFileName || "pasted-marking-guide-text.txt", {
      type: "text/plain",
      lastModified: Date.now(),
    });

  const handleAnalyze = async () => {
    const sourceFile = file ?? (hasManualText ? buildManualTextFile() : null);
    if (!sourceFile) return;
    const userId = user?.id || "guest";
    setAnalysisStatus("analyzing");
    setResult(null);
    setActiveRecord(null);
    setCacheNotes([]);
    setAnalysisProgress(8);
    setAnalysisStage("Reading the selected file and document details");

    try {
      setAnalysisProgress(18);
      setAnalysisStage("Creating a secure fingerprint for duplicate checks");
      const fingerprint = await createDocumentFingerprint(sourceFile);
      setAnalysisProgress(36);
      setAnalysisStage("Checking whether this exact document was marked before");
      const reusable = await findReusableAnalysis({
        userId,
        documentType,
        component,
        fileName: sourceFile.name,
        fingerprint,
      });

      if (reusable.record) {
        setAnalysisProgress(76);
        setAnalysisStage("Restoring the verified result from saved work");
        await new Promise((resolve) => setTimeout(resolve, 350));
        const notes = reusable.notes;
        const record = await saveAnalysisRecord({
          userId,
          documentType,
          component,
          file: sourceFile,
          fingerprint,
          result: reusable.record.result,
          reusedFromId: reusable.record.id,
          cacheNotes: notes,
        });

        setResult(record.result);
        setActiveRecord(record);
        setCacheNotes(notes);
        setRecentRecords(await listAnalysisRecords(userId));
        setAnalysisProgress(100);
        setAnalysisStage("Marking-guide result ready");
        setAnalysisStatus("complete");
        const rubric = record.result.rubricScore;
        toast.success("Saved marking-guide result restored", {
          description: rubric ? `${rubric.awarded}/${rubric.total} marks awarded.` : undefined,
        });
        return;
      }

      setAnalysisProgress(54);
      setAnalysisStage("Detecting sections and applying the relevant marking criteria");
      const analysis = await analyzeDocument(sourceFile, documentType, component);
      setAnalysisProgress(88);
      setAnalysisStage("Saving the marked document and exact score");
      const record = await saveAnalysisRecord({
        userId,
        documentType,
        component,
        file: sourceFile,
        fingerprint,
        result: analysis,
        cacheNotes: reusable.notes,
      });

      setResult(analysis);
      setActiveRecord(record);
      setCacheNotes(record.cacheNotes);
      setRecentRecords(await listAnalysisRecords(userId));
      setAnalysisProgress(100);
      setAnalysisStage("Marking-guide result ready");
      setAnalysisStatus("complete");
      const rubric = analysis.rubricScore;
      toast.success("Marking-guide check complete", {
        description: rubric ? `${rubric.awarded}/${rubric.total} marks awarded.` : undefined,
      });
    } catch (error) {
      console.error("Document analysis failed:", error);
      setAnalysisStatus("error");
      setAnalysisProgress(0);
      toast.error(error instanceof Error ? error.message : "The document could not be checked");
    }
  };

  return (
    <DashboardLayout>
      <WorkspacePage dockPadding={result ? "standard" : "none"}>
        <WorkspacePageHeader
          eyebrow="Document analysis"
          tone="info"
          icon={<ClipboardCheck size={14} />}
          title="Crosscheck your report against the marking guide"
          description="Upload a proposal or report, choose the section, and see which marking-guide marks are awarded, partial, or not awarded."
          actions={
            <>
              <Button asChild className="gap-2">
                <Link to="/marking-guide">
                  Open marking guide
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2 bg-white/80">
                <Link to="/guidelines">
                  UHPAB structure
                  <BookOpenCheck size={16} />
                </Link>
              </Button>
            </>
          }
          aside={
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-muted text-warning shadow-sm">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <h2 className="font-semibold">Marking guide focus</h2>
                  <p className="text-sm text-muted-foreground">The research report guide totals 100 marks.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-foreground/80">
                <div className="rounded-lg border bg-muted/45 p-3">Methodology carries the largest section weight: 23 marks.</div>
                <div className="rounded-lg border bg-muted/45 p-3">Discussion, conclusion, recommendations, and practice implications carry 19 marks.</div>
                <div className="rounded-lg border bg-muted/45 p-3">References and appendices are small but easy to lose marks on.</div>
              </div>
            </>
          }
        />

        <section className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="study-card animate-fade-up rounded-lg p-6 [animation-delay:120ms]">
            <WorkspaceSectionHeader
              title="1. Add the document"
              description="Upload a file, or paste text sent from another review tool."
              icon={<Upload size={18} />}
            />

            <DocumentUploadField
              id="file-upload"
              label="Research document"
              prompt="Choose your document"
              description="Select the proposal or report you want to check against the marking guide."
              accept=".pdf,.doc,.docx"
              fileName={file?.name}
              disabled={analysisStatus === "analyzing"}
              onChange={handleFileChange}
            />

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="marking-text">Or paste document text</Label>
                {hasManualText && (
                  <Badge variant="outline" className="bg-muted/60">
                    {manualText.trim().split(/\s+/).filter(Boolean).length} words
                  </Badge>
                )}
              </div>
              <Textarea
                id="marking-text"
                value={manualText}
                onChange={(event) => handleManualTextChange(event.target.value)}
                placeholder="Paste a proposal section, full report text, or text sent from Human Review, Originality Check, or Improve Writing..."
                disabled={analysisStatus === "analyzing"}
                className="min-h-52 resize-y bg-white/80 leading-6"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Text checks use the same marking guide. Uploaded files are still best when page evidence is required.
              </p>
            </div>

            {handoff && (
              <WorkspaceStatusNote
                tone="info"
                icon={<ArrowRight size={16} />}
                title={`Text received from ${handoffSourceLabel}`}
                description={
                  <>
                    {handoff.issueLabel || "Selected text"}
                    {handoff.section ? ` - ${handoff.section}` : ""}
                  </>
                }
                actions={
                  handoff.sourceTool !== "document-analysis" ? (
                    <Button type="button" variant="outline" size="sm" className="gap-2 bg-white" onClick={returnToSourceTool}>
                      Return to {handoffSourceLabel}
                      <ArrowRight size={14} />
                    </Button>
                  ) : undefined
                }
                className="mt-5"
              />
            )}

            <div className="mt-5 space-y-5">
              <div className="space-y-3">
                <Label>Document type</Label>
                <RadioGroup
                  value={documentType}
                  onValueChange={(value) => {
                    setDocumentType(value as "proposal" | "report");
                    setComponent("full");
                    setResult(null);
                    setActiveRecord(null);
                    setCacheNotes([]);
                    setAnalysisStatus("idle");
                  }}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <Label htmlFor="proposal" className="flex cursor-pointer items-center gap-3 rounded-md border bg-white/70 p-3 hover:border-primary/40">
                    <RadioGroupItem value="proposal" id="proposal" />
                    Proposal
                  </Label>
                  <Label htmlFor="report" className="flex cursor-pointer items-center gap-3 rounded-md border bg-white/70 p-3 hover:border-primary/40">
                    <RadioGroupItem value="report" id="report" />
                    Report
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Part to check</Label>
                <Select
                  value={component}
                  onValueChange={(value) => {
                    setComponent(value);
                    setResult(null);
                    setActiveRecord(null);
                    setCacheNotes([]);
                    setAnalysisStatus("idle");
                  }}
                >
                  <SelectTrigger className="bg-white/80">
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionOptions.map((section) => (
                      <SelectItem key={section.value} value={section.value}>
                        {section.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={(!file && !hasManualText) || analysisStatus === "analyzing"}
                className="w-full gap-2"
              >
                {analysisStatus === "analyzing" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Checking against guide
                  </>
                ) : (
                  <>
                    Start marking-guide check
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>

              {analysisStatus === "analyzing" && (
                <OperationProgress
                  title="Checking against the marking guide"
                  stage={analysisStage}
                  value={analysisProgress}
                  steps={analysisSteps}
                />
              )}
            </div>
          </Card>

          <Card className="study-card animate-fade-up rounded-lg p-6 [animation-delay:180ms]">
            <WorkspaceSectionHeader
              title="2. Marking-guide result"
              description="A practical scorecard for revision before submission."
              icon={<ListChecks size={18} />}
            />

            {!result && (
              <WorkspaceEmptyState
                tone="info"
                icon={<Info size={22} />}
                title="Your scorecard will appear here"
                description="Upload a document to get a section-aware marking tally with page evidence where text extraction can identify it."
              />
            )}

            {analysisStatus === "error" && (
              <Alert className="border-rose-200 bg-rose-50">
                <Info className="h-4 w-4 text-rose-700" />
                <AlertTitle className="text-rose-950">Analysis failed</AlertTitle>
                <AlertDescription className="text-rose-900">Please try again with a supported document file.</AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="space-y-5">
                <WorkspaceStatusNote
                  tone={resultReused ? "success" : "info"}
                  icon={resultReused ? <RotateCcw size={18} /> : <CheckCircle2 size={18} />}
                  title={resultReused ? "Previous result reused" : "Fresh marking-guide report created"}
                  description={
                    resultReused
                      ? "This exact document was already checked, so the saved marking-guide result was returned."
                      : file
                        ? "This document and its marking-guide result were saved for future duplicate checks."
                        : "This pasted text was checked against the marking guide and saved for exact repeat checks."
                  }
                  actions={
                    <Button className="w-full gap-2 sm:w-auto" onClick={exportMarkingGuideReport}>
                      <Download size={16} />
                      Export marking report
                    </Button>
                  }
                />

                <div className="rounded-lg border bg-white/80 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Marking-guide score</p>
                      <p className="text-3xl font-bold text-primary">{scorePercent}%</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.matchedGuidelines} / {result.totalGuidelines} marks awarded
                    </p>
                  </div>
                  <Progress value={scorePercent} className="mt-3" />
                </div>

                {result.rubricScore && (
                  <div className="space-y-3">
                    {result.rubricScore.sections.map((section) => {
                      const sectionPercent = Math.round((section.awarded / section.marks) * 100);
                      return (
                        <div key={section.id} className="rounded-lg border bg-white/75 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="font-semibold">{section.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {section.awarded} / {section.marks} marks
                              </p>
                            </div>
                            <Badge variant="outline" className="w-fit bg-primary/5 text-primary">
                              {sectionPercent}%
                            </Badge>
                          </div>
                          <Progress value={sectionPercent} className="mt-3" />
                          <div className="mt-4 grid gap-2">
                            {section.criteria.map((criterion) => (
                              <div key={criterion.id} className="rounded-md border bg-slate-50 px-3 py-2">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">{criterion.label}</p>
                                    {criterion.evidenceSnippet && (
                                      <p className="mt-1 break-words text-xs leading-5 text-slate-600">
                                        {criterion.pageNumber ? `Page ${criterion.pageNumber}: ` : ""}
                                        {criterion.evidenceSnippet}
                                      </p>
                                    )}
                                    {criterion.status !== "met" && (
                                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        {formatCriterionFinding(criterion.guidance, criterion.status)}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                                    <Badge variant="outline" className={statusStyles[criterion.status]}>
                                      {statusLabels[criterion.status]}: {criterion.awarded}/{criterion.marks}
                                    </Badge>
                                    {criterion.status !== "met" && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 bg-white"
                                        onClick={() => improveCriterion(section.title, criterion)}
                                      >
                                        Improve
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {markedEvidence.length > 0 && (
                  <div className="rounded-lg border bg-white/80 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">Color-marked evidence preview</h3>
                        <p className="text-sm text-muted-foreground">Common research language stays neutral; weak or missing rubric evidence gets attention.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-white"
                        onClick={exportMarkingGuideReport}
                      >
                        <Download size={15} />
                        Export PDF
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {markedEvidence.map((passage) => (
                        <div
                          key={passage.id}
                          className={
                            passage.tone === "missing"
                              ? "rounded-md border border-rose-200 bg-rose-50 p-3"
                              : "rounded-md border border-amber-200 bg-amber-50 p-3"
                          }
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold">{passage.label}</p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{passage.text}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 bg-white">
                              {passage.location}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Alert className={result.issues.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}>
                  <CheckCircle2 className={result.issues.length ? "h-4 w-4 text-amber-700" : "h-4 w-4 text-emerald-700"} />
                  <AlertTitle className={result.issues.length ? "text-amber-950" : "text-emerald-950"}>
                    {result.issues.length ? "Revision priorities" : "All criteria awarded"}
                  </AlertTitle>
                  <AlertDescription className={result.issues.length ? "text-amber-900" : "text-emerald-900"}>
                    {result.issues.length
                      ? result.issues.slice(0, 4).join(" | ")
                      : "No partial or not-awarded marking-guide criterion remains in this review."}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </Card>
        </section>

        <section className="mt-8">
          <Card className="study-card animate-fade-up rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Stored document checks"
              description="Upload history is stored locally in this browser with each file fingerprint and result."
              actions={<WorkspaceCountBadge count={recentRecords.length} />}
            />

            {recentRecords.length === 0 ? (
              <WorkspaceEmptyState
                icon={<ClipboardCheck size={20} />}
                title="No stored document checks yet"
                description="Run a document check and it will appear here. Re-uploading the exact same file returns the same stored result."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {recentRecords.map((record) => (
                  <SavedWorkCard
                    key={record.id}
                    title={record.fileName}
                    meta={`${record.documentType} - ${record.component} - ${record.analysisRuns} check${record.analysisRuns === 1 ? "" : "s"}`}
                    status={
                      <Badge variant="outline" className="bg-success-muted text-success-foreground">
                        {Math.round((record.result.matchedGuidelines / record.result.totalGuidelines) * 100)}%
                      </Badge>
                    }
                    summary={
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md bg-muted px-2 py-1">{Math.round(record.fileSize / 1024)} KB</span>
                        <span className="rounded-md bg-muted px-2 py-1">{record.pageCount ? `${record.pageCount} pages` : "pages unknown"}</span>
                      </div>
                    }
                    actions={
                      <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-white"
                        onClick={() => restoreStoredAnalysisRecord(record)}
                      >
                        <RotateCcw size={14} />
                        Resume
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-white"
                        onClick={() => exportStoredAnalysisRecord(record)}
                      >
                        <Download size={14} />
                        Export PDF
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2"
                        onClick={() => improveStoredAnalysisRecord(record)}
                      >
                        <ArrowRight size={14} />
                        Improve issue
                      </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </Card>
        </section>

        {result && (
          <WorkspaceActionDock
            title="Marking-guide report ready"
            description={`${result.matchedGuidelines}/${result.totalGuidelines} marks awarded - export a clean PDF for student or admin review.`}
            primaryAction={{
              label: "Export marking-guide PDF",
              icon: <Download size={16} />,
              onClick: exportMarkingGuideReport,
            }}
          />
        )}
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default DocumentAnalysis;
