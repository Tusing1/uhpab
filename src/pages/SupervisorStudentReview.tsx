import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Highlighter,
  ListChecks,
  MessageSquare,
  MessageSquarePlus,
  Save,
  SearchCheck,
  Send,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import {
  SavedWorkCard,
  WorkspaceEmptyState,
  WorkspaceMetric,
  WorkspaceSectionHeader,
  WorkspaceStatusNote,
} from "@/components/workspace/WorkspaceWorkflow";
import { useAuth } from "@/contexts/AuthContext";
import {
  addSupervisorComment,
  createCorrectionRequest,
  getLatestStudentSubmission,
  getStudentCorrectionRequests,
  getStudentReviewTimeline,
  getStudentSubmissions,
  getSubmissionDocumentText,
  getSupervisorComments,
  getSupervisorLatestReview,
  getSupervisorReviewCriteria,
  loadSchoolWorkspace,
  resolveCorrectionRequest,
  resolveSupervisorComment,
  resolveSupervisorForUser,
  saveSchoolWorkspace,
  upsertSupervisorReview,
  type SchoolCriterionStatus,
  type SchoolCommentTag,
  type SchoolReviewDecision,
  type SchoolStudentStatus,
  type SchoolSupervisorCriterionMark,
  type SchoolSupervisorCommentType,
  type SchoolWorkspaceState,
} from "@/lib/schoolWorkspaceStore";
import { downloadSupervisorReviewPdf } from "@/lib/supervisorReviewReport";

const statusMeta: Record<SchoolStudentStatus, { label: string; className: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  ready: {
    label: "Ready",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    tone: "success",
  },
  "on-track": {
    label: "On track",
    className: "border-sky-200 bg-sky-50 text-sky-800",
    tone: "success",
  },
  "needs-correction": {
    label: "Needs correction",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    tone: "warning",
  },
  "not-submitted": {
    label: "Not submitted",
    className: "border-rose-200 bg-rose-50 text-rose-800",
    tone: "danger",
  },
};

const decisionLabels: Record<SchoolReviewDecision, string> = {
  pending: "Pending",
  "needs-correction": "Needs correction",
  reviewed: "Reviewed",
  "ready-for-admin": "Ready for admin",
  approved: "Approved",
};

const commentTypeLabels: Record<SchoolSupervisorCommentType, string> = {
  general: "General",
  chapter: "Chapter",
  "marking-guide": "Marking guide",
  citation: "Citation",
  originality: "Originality",
  formatting: "Formatting",
};

const criterionStatusMeta: Record<SchoolCriterionStatus, { label: string; className: string }> = {
  awarded: { label: "Awarded", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  partial: { label: "Partial", className: "border-amber-200 bg-amber-50 text-amber-900" },
  "not-awarded": { label: "Not awarded", className: "border-rose-200 bg-rose-50 text-rose-800" },
};

const commentTagMeta: Record<SchoolCommentTag, { label: string; className: string; markerClassName: string }> = {
  correction: {
    label: "Correction",
    className: "border-rose-200 bg-rose-50 text-rose-800",
    markerClassName: "border-l-rose-500 bg-rose-50/80",
  },
  strength: {
    label: "Strength",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    markerClassName: "border-l-emerald-500 bg-emerald-50/80",
  },
  question: {
    label: "Question",
    className: "border-sky-200 bg-sky-50 text-sky-800",
    markerClassName: "border-l-sky-500 bg-sky-50/80",
  },
  citation: {
    label: "Citation",
    className: "border-blue-200 bg-blue-50 text-blue-800",
    markerClassName: "border-l-blue-500 bg-blue-50/80",
  },
  formatting: {
    label: "Formatting",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    markerClassName: "border-l-amber-500 bg-amber-50/80",
  },
  originality: {
    label: "Originality",
    className: "border-violet-200 bg-violet-50 text-violet-800",
    markerClassName: "border-l-violet-500 bg-violet-50/80",
  },
};

const typeToDefaultTag: Record<SchoolSupervisorCommentType, SchoolCommentTag> = {
  general: "question",
  chapter: "correction",
  "marking-guide": "correction",
  citation: "citation",
  originality: "originality",
  formatting: "formatting",
};

const formatActivity = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const getSchoolIdentity = (schoolId?: string, schoolName?: string) => ({
  id: schoolId || "school1",
  name: schoolName || "Kampala Nursing School",
});

const SupervisorStudentReview = () => {
  const { studentId } = useParams();
  const { user, school } = useAuth();
  const navigate = useNavigate();
  const identity = getSchoolIdentity(user?.schoolId || school?.id, user?.schoolName || school?.name);
  const [workspace, setWorkspace] = useState<SchoolWorkspaceState>(() =>
    loadSchoolWorkspace(identity.id, identity.name)
  );

  const supervisor = resolveSupervisorForUser(workspace, user);
  const supervisorName = supervisor?.name || user?.supervisorName || user?.name || "Supervisor";
  const student = workspace.students.find((item) => item.id === studentId);
  const latestSubmission = student ? getLatestStudentSubmission(workspace, student.id) : undefined;
  const latestReview = student ? getSupervisorLatestReview(workspace, student.id, supervisorName) : undefined;

  const [commentType, setCommentType] = useState<SchoolSupervisorCommentType>("general");
  const [commentTag, setCommentTag] = useState<SchoolCommentTag>("correction");
  const [commentSection, setCommentSection] = useState("General");
  const [commentText, setCommentText] = useState("");
  const [selectedParagraphIndex, setSelectedParagraphIndex] = useState<number | null>(null);
  const [annotationFilter, setAnnotationFilter] = useState<"all" | "open" | "replied" | "resolved">("all");
  const [reviewSection, setReviewSection] = useState(latestReview?.section || student?.currentStage || "General review");
  const [decision, setDecision] = useState<SchoolReviewDecision>(latestReview?.decision || "pending");
  const [strengths, setStrengths] = useState(latestReview?.strengths || "");
  const [requiredCorrections, setRequiredCorrections] = useState(latestReview?.requiredCorrections || "");
  const [criteria, setCriteria] = useState<SchoolSupervisorCriterionMark[]>(() =>
    getSupervisorReviewCriteria(latestReview)
  );
  const [correctionTitle, setCorrectionTitle] = useState("Required research corrections");
  const [correctionInstructions, setCorrectionInstructions] = useState("");

  useEffect(() => {
    const nextIdentity = getSchoolIdentity(user?.schoolId || school?.id, user?.schoolName || school?.name);
    const nextWorkspace = loadSchoolWorkspace(nextIdentity.id, nextIdentity.name);
    saveSchoolWorkspace(nextWorkspace);
    setWorkspace(nextWorkspace);
  }, [school?.id, school?.name, user?.schoolId, user?.schoolName]);

  useEffect(() => {
    setReviewSection(latestReview?.section || student?.currentStage || "General review");
    setDecision(latestReview?.decision || "pending");
    setStrengths(latestReview?.strengths || "");
    setRequiredCorrections(latestReview?.requiredCorrections || "");
    setCriteria(getSupervisorReviewCriteria(latestReview));
  }, [
    latestReview?.decision,
    latestReview?.id,
    latestReview?.updatedAt,
    latestReview?.requiredCorrections,
    latestReview?.section,
    latestReview?.strengths,
    student?.currentStage,
  ]);

  const submissions = useMemo(
    () => (student ? getStudentSubmissions(workspace, student.id) : []),
    [student, workspace]
  );
  const comments = useMemo(
    () => (student ? getSupervisorComments(workspace, student.id, supervisorName) : []),
    [student, supervisorName, workspace]
  );
  const correctionRequests = useMemo(
    () => (student ? getStudentCorrectionRequests(workspace, student.id) : []),
    [student, workspace]
  );
  const reviewTimeline = useMemo(
    () => (student ? getStudentReviewTimeline(workspace, student.id) : []),
    [student, workspace]
  );
  const documentText = useMemo(
    () => getSubmissionDocumentText(latestSubmission, student),
    [latestSubmission, student]
  );
  const documentParagraphs = useMemo(
    () => documentText.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean),
    [documentText]
  );
  const annotationsByParagraph = useMemo(() => {
    const grouped = new Map<number, typeof comments>();
    comments.forEach((comment) => {
      if (typeof comment.paragraphIndex !== "number") return;
      const existing = grouped.get(comment.paragraphIndex) || [];
      grouped.set(comment.paragraphIndex, [...existing, comment]);
    });
    return grouped;
  }, [comments]);
  const selectedParagraphText =
    selectedParagraphIndex !== null ? documentParagraphs[selectedParagraphIndex] || "" : "";
  const selectedParagraphComments =
    selectedParagraphIndex !== null ? annotationsByParagraph.get(selectedParagraphIndex) || [] : [];
  const visibleComments = useMemo(
    () =>
      comments.filter((comment) => {
        if (annotationFilter === "open") return !comment.resolved && !comment.studentReply;
        if (annotationFilter === "replied") return Boolean(comment.studentReply) && !comment.resolved;
        if (annotationFilter === "resolved") return comment.resolved;
        return true;
      }),
    [annotationFilter, comments]
  );
  const criteriaAwarded = useMemo(
    () => Math.round(criteria.reduce((sum, criterion) => sum + Number(criterion.awarded || 0), 0) * 10) / 10,
    [criteria]
  );
  const criteriaTotal = useMemo(
    () => Math.round(criteria.reduce((sum, criterion) => sum + Number(criterion.total || 0), 0) * 10) / 10,
    [criteria]
  );
  const criteriaStatusCounts = useMemo(
    () =>
      criteria.reduce(
        (counts, criterion) => {
          counts[criterion.status] += 1;
          return counts;
        },
        { awarded: 0, partial: 0, "not-awarded": 0 } as Record<SchoolCriterionStatus, number>
      ),
    [criteria]
  );

  const persistWorkspace = (nextWorkspace: SchoolWorkspaceState) => {
    setWorkspace(nextWorkspace);
    saveSchoolWorkspace(nextWorkspace);
  };

  const handleSelectParagraph = (index: number, paragraph: string) => {
    setSelectedParagraphIndex(index);
    const heading =
      paragraph.length < 90 && /^(title page|abstract|chapter|references|appendix|current stage)/i.test(paragraph)
        ? paragraph
        : documentParagraphs
            .slice(0, index)
            .reverse()
            .find((item) => item.length < 90 && /^(title page|abstract|chapter|references|appendix|current stage)/i.test(item));
    setCommentSection(heading || commentSection || "General");
  };

  const updateCriterion = (criterionId: string, patch: Partial<SchoolSupervisorCriterionMark>) => {
    setCriteria((current) =>
      current.map((criterion) => {
        if (criterion.id !== criterionId) return criterion;
        const total = Math.max(0.5, Number(patch.total ?? criterion.total) || criterion.total);
        let awarded = Math.max(0, Math.min(Number(patch.awarded ?? criterion.awarded) || 0, total));
        let status = patch.status ?? criterion.status;

        if (patch.status) {
          awarded =
            patch.status === "awarded"
              ? total
              : patch.status === "partial"
                ? Math.max(0.5, Math.round((total / 2) * 10) / 10)
                : 0;
          status = patch.status;
        } else if ("awarded" in patch || "total" in patch) {
          status = awarded >= total ? "awarded" : awarded > 0 ? "partial" : "not-awarded";
        }

        return {
          ...criterion,
          ...patch,
          total,
          awarded,
          status,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleAddComment = () => {
    if (!student) return;
    if (!commentText.trim()) {
      toast.error("Add a comment before saving");
      return;
    }

    const nextWorkspace = addSupervisorComment(workspace, {
      studentId: student.id,
      submissionId: latestSubmission?.id,
      supervisorName,
      supervisorEmail: supervisor?.email || user?.email,
      type: commentType,
      tag: commentTag,
      section: commentSection.trim() || "General",
      text: commentText,
      paragraphIndex: selectedParagraphIndex,
      anchorText: selectedParagraphText.slice(0, 240),
    });
    persistWorkspace(nextWorkspace);
    setCommentText("");
    setSelectedParagraphIndex(null);
    toast.success("Supervisor comment saved", {
      description: `${commentTagMeta[commentTag].label} comment sent to ${student.name}.`,
    });
  };

  const handleSaveReview = () => {
    if (!student) return;
    const nextWorkspace = upsertSupervisorReview(workspace, {
      studentId: student.id,
      submissionId: latestSubmission?.id,
      supervisorName,
      supervisorEmail: supervisor?.email || user?.email,
      section: reviewSection,
      awarded: criteriaAwarded,
      total: criteriaTotal || 100,
      decision,
      strengths,
      requiredCorrections,
      criteria,
    });
    persistWorkspace(nextWorkspace);
    toast.success("Supervisor review updated", {
      description: `${student.name} marked as ${decisionLabels[decision].toLowerCase()}.`,
    });
  };

  const handleResolveComment = (commentId: string) => {
    const nextWorkspace = resolveSupervisorComment(workspace, commentId);
    persistWorkspace(nextWorkspace);
    toast.success("Comment marked resolved");
  };

  const handleCreateCorrectionRequest = () => {
    if (!student) return;
    if (!correctionTitle.trim() || !correctionInstructions.trim()) {
      toast.error("Add a correction title and clear instructions");
      return;
    }

    const nextWorkspace = createCorrectionRequest(workspace, {
      studentId: student.id,
      submissionId: latestSubmission?.id,
      supervisorName,
      supervisorEmail: supervisor?.email || user?.email,
      title: correctionTitle,
      instructions: correctionInstructions,
    });
    persistWorkspace(nextWorkspace);
    setCorrectionTitle("Required research corrections");
    setCorrectionInstructions("");
    toast.success("Correction request sent", {
      description: `${student.name} will see the correction task in their workspace.`,
    });
  };

  const handleResolveCorrection = (requestId: string) => {
    const nextWorkspace = resolveCorrectionRequest(workspace, requestId);
    persistWorkspace(nextWorkspace);
    toast.success("Correction request resolved");
  };

  const handleExportReport = () => {
    if (!student) return;
    downloadSupervisorReviewPdf({
      schoolName: workspace.schoolName,
      supervisorName,
      student,
      submission: latestSubmission,
      review: getSupervisorLatestReview(workspace, student.id, supervisorName),
      comments,
      corrections: correctionRequests,
      timeline: reviewTimeline,
    });
  };

  if (!student) {
    return (
      <DashboardLayout>
        <WorkspacePage>
          <WorkspaceEmptyState
            tone="warning"
            icon={<SearchCheck size={20} />}
            title="Student not found"
            description="This candidate may have been removed or is not available in the current school workspace."
            actions={
              <Button onClick={() => navigate("/supervisor-students")}>
                Back to assigned students
              </Button>
            }
          />
        </WorkspacePage>
      </DashboardLayout>
    );
  }

  const status = statusMeta[student.status];
  const reviewPercent = Math.round((criteriaAwarded / Math.max(1, criteriaTotal || 100)) * 100);
  const openComments = comments.filter((comment) => !comment.resolved).length;
  const openCorrectionRequests = correctionRequests.filter((request) => request.status !== "resolved").length;

  return (
    <DashboardLayout>
      <WorkspacePage width="wide">
        <WorkspacePageHeader
          eyebrow="Supervisor review"
          tone={status.tone}
          icon={<UserCheck size={14} />}
          title={student.name}
          description={`${student.htin} - ${student.cohort} - ${student.programme}`}
          actions={
            <>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/supervisor-students")}>
                <ArrowLeft size={16} />
                Assigned students
              </Button>
              <Button variant="outline" className="gap-2 bg-white/80" onClick={handleExportReport}>
                <Download size={16} />
                Export report
              </Button>
              <Button className="gap-2" onClick={handleSaveReview}>
                <Save size={16} />
                Save review
              </Button>
            </>
          }
          aside={
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">Current status</span>
                <Badge variant="outline" className={status.className}>{status.label}</Badge>
              </div>
              <p className="leading-6 text-muted-foreground">{student.topic || "Topic not registered yet."}</p>
              <Progress value={student.markingScore} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Latest school mark: {student.markingScore}% - Originality attention: {student.originalityAttention}%
              </p>
            </div>
          }
        />

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <WorkspaceMetric label="Submissions" value={submissions.length} detail={latestSubmission?.fileName || "No submission yet"} tone="info" />
          <WorkspaceMetric label="Open comments" value={openComments} detail="Supervisor notes still active" tone={openComments ? "warning" : "success"} />
          <WorkspaceMetric label="Correction tasks" value={openCorrectionRequests} detail="Open student action items" tone={openCorrectionRequests ? "warning" : "success"} />
          <WorkspaceMetric label="Guide tally" value={`${criteriaAwarded}/${criteriaTotal}`} detail={`${reviewPercent}% from marking rows`} tone="neutral" />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className="study-card rounded-lg p-0">
            <div className="border-b p-6">
              <WorkspaceSectionHeader
                title="Submitted document"
                description="Stored submission text for supervisor reading and evidence checking."
                icon={<FileText size={18} />}
                actions={
                  latestSubmission ? (
                    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                      v{latestSubmission.version || 1}
                    </Badge>
                  ) : null
                }
              />
            </div>
            <div className="max-h-[720px] overflow-auto bg-slate-50/70 p-4">
              <article className="mx-auto min-h-[520px] max-w-3xl rounded-md border bg-white px-7 py-8 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-xs text-muted-foreground">
                  <span>{latestSubmission?.fileName || "No uploaded file"}</span>
                  <span>
                    {latestSubmission?.wordCount || documentText.split(/\s+/).filter(Boolean).length} words
                    {latestSubmission?.pageCount ? ` - ${latestSubmission.pageCount} pages` : ""}
                  </span>
                </div>
                <div className="space-y-4 text-sm leading-7 text-slate-900">
                  {documentParagraphs.map((paragraph, index) => {
                    const isHeading = paragraph.length < 90 && /^(title page|abstract|chapter|references|appendix|current stage)/i.test(paragraph);
                    const paragraphAnnotations = annotationsByParagraph.get(index) || [];
                    const primaryTag = paragraphAnnotations[0]?.tag || "question";
                    const isSelected = selectedParagraphIndex === index;
                    return (
                      <div
                        key={`${paragraph}-${index}`}
                        className={[
                          "group rounded-md border-l-4 px-4 py-3 transition-colors",
                          paragraphAnnotations.length ? commentTagMeta[primaryTag].markerClassName : "border-l-transparent",
                          isSelected ? "bg-primary/10 ring-2 ring-primary/30" : "hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-md border bg-white px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm hover:text-foreground"
                            onClick={() => handleSelectParagraph(index, paragraph)}
                          >
                            <Highlighter size={13} />
                            Review paragraph {index + 1}
                          </button>
                          {paragraphAnnotations.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={commentTagMeta[primaryTag].className}>
                                {commentTagMeta[primaryTag].label}
                              </Badge>
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                <MessageSquare size={13} />
                                {paragraphAnnotations.length} sent
                              </span>
                            </div>
                          )}
                        </div>
                        {isHeading ? (
                          <h3 className="pt-1 text-base font-bold uppercase tracking-normal text-slate-950">
                            {paragraph}
                          </h3>
                        ) : (
                          <p className="whitespace-pre-wrap">
                            {paragraph}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            </div>
          </Card>

          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Marking guide panel"
              description="Award marks only where the submitted document gives evidence."
              icon={<ListChecks size={18} />}
              actions={<Badge variant="outline">{criteriaAwarded}/{criteriaTotal} marks</Badge>}
            />
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-semibold">{criteriaStatusCounts.awarded}</p>
                <p>Awarded</p>
              </div>
              <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">{criteriaStatusCounts.partial}</p>
                <p>Partial</p>
              </div>
              <div className="rounded-lg border bg-rose-50 p-3 text-sm text-rose-900">
                <p className="font-semibold">{criteriaStatusCounts["not-awarded"]}</p>
                <p>Not awarded</p>
              </div>
            </div>
            <div className="max-h-[650px] space-y-3 overflow-auto pr-1">
              {criteria.map((criterion) => {
                const meta = criterionStatusMeta[criterion.status];
                return (
                  <div key={criterion.id} className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{criterion.section}</p>
                        <h3 className="mt-1 break-words font-semibold leading-6">{criterion.criterion}</h3>
                      </div>
                      <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[160px_110px_1fr]">
                      <div className="grid gap-2">
                        <Label>Status</Label>
                        <Select value={criterion.status} onValueChange={(value) => updateCriterion(criterion.id, { status: value as SchoolCriterionStatus })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="awarded">Awarded</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                            <SelectItem value="not-awarded">Not awarded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Marks</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={criterion.awarded}
                            onChange={(event) => updateCriterion(criterion.id, { awarded: Number(event.target.value) })}
                            className="h-10"
                          />
                          <span className="text-sm text-muted-foreground">/{criterion.total}</span>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Evidence snippet</Label>
                        <Input
                          value={criterion.evidenceSnippet}
                          onChange={(event) => updateCriterion(criterion.id, { evidenceSnippet: event.target.value })}
                          placeholder="Paste the exact sentence or short evidence seen in the document"
                        />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[110px_1fr]">
                      <div className="grid gap-2">
                        <Label>Page</Label>
                        <Input
                          type="number"
                          min="1"
                          value={criterion.pageNumber || ""}
                          onChange={(event) => updateCriterion(criterion.id, { pageNumber: event.target.value ? Number(event.target.value) : null })}
                          placeholder="Page"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Supervisor note</Label>
                        <Input
                          value={criterion.note}
                          onChange={(event) => updateCriterion(criterion.id, { note: event.target.value })}
                          placeholder="What the student should fix for this criterion"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Mark and decide"
              description="Confirm the reviewed section, final decision, strengths, and required corrections."
              icon={<ClipboardCheck size={18} />}
            />
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="review-section">Section reviewed</Label>
                <Input id="review-section" value={reviewSection} onChange={(event) => setReviewSection(event.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Marking guide tally</p>
                  <p className="mt-2 text-2xl font-bold">{criteriaAwarded}/{criteriaTotal} marks</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Awarded from {criteria.length} guide criteria. No confidence labels are used.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Decision</Label>
                  <Select value={decision} onValueChange={(value) => setDecision(value as SchoolReviewDecision)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose decision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="needs-correction">Needs correction</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="ready-for-admin">Ready for admin</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="strengths">Strengths</Label>
                <Textarea
                  id="strengths"
                  value={strengths}
                  onChange={(event) => setStrengths(event.target.value)}
                  className="min-h-24"
                  placeholder="What is already acceptable in this student's work?"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="required-corrections">Required corrections</Label>
                <Textarea
                  id="required-corrections"
                  value={requiredCorrections}
                  onChange={(event) => setRequiredCorrections(event.target.value)}
                  className="min-h-28"
                  placeholder="List the exact corrections the student must make before the next review."
                />
              </div>
              <Button className="gap-2" onClick={handleSaveReview}>
                <Save size={16} />
                Save review decision
              </Button>
            </div>
          </Card>

          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Tagged document comments"
              description="Select a paragraph from the document, choose a tag, then send a comment the student can see."
              icon={<MessageSquarePlus size={18} />}
            />
            <div className="grid gap-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Selected passage</p>
                  {selectedParagraphIndex !== null ? (
                    <Badge variant="outline">Paragraph {selectedParagraphIndex + 1}</Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">No paragraph selected</Badge>
                  )}
                </div>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">
                  {selectedParagraphText || "Click Review paragraph beside a passage in the submitted document."}
                </p>
                {selectedParagraphComments.length > 0 && (
                  <p className="mt-2 text-xs font-medium text-primary">
                    {selectedParagraphComments.length} comment{selectedParagraphComments.length === 1 ? "" : "s"} already sent on this passage.
                  </p>
                )}
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Comment type</Label>
                  <Select
                    value={commentType}
                    onValueChange={(value) => {
                      const nextType = value as SchoolSupervisorCommentType;
                      setCommentType(nextType);
                      setCommentTag(typeToDefaultTag[nextType]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="chapter">Chapter</SelectItem>
                      <SelectItem value="marking-guide">Marking guide</SelectItem>
                      <SelectItem value="citation">Citation</SelectItem>
                      <SelectItem value="originality">Originality</SelectItem>
                      <SelectItem value="formatting">Formatting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Visible tag</Label>
                  <Select value={commentTag} onValueChange={(value) => setCommentTag(value as SchoolCommentTag)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="correction">Correction</SelectItem>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="citation">Citation</SelectItem>
                      <SelectItem value="formatting">Formatting</SelectItem>
                      <SelectItem value="originality">Originality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="comment-section">Section</Label>
                  <Input id="comment-section" value={commentSection} onChange={(event) => setCommentSection(event.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="comment-text">Comment</Label>
                <Textarea
                  id="comment-text"
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  className="min-h-36"
                  placeholder="Write a clear correction note. Example: Link this finding back to objective two and compare it with a study from chapter two."
                />
              </div>
              <Button variant="outline" className="gap-2 bg-white" onClick={handleAddComment}>
                <Send size={16} />
                Send tagged comment
              </Button>
            </div>
          </Card>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Correction request"
              description="Send a formal task the student can respond to after making changes."
              icon={<Send size={18} />}
            />
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="correction-title">Request title</Label>
                <Input
                  id="correction-title"
                  value={correctionTitle}
                  onChange={(event) => setCorrectionTitle(event.target.value)}
                  placeholder="Example: Strengthen chapter five discussion"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="correction-instructions">Student instructions</Label>
                <Textarea
                  id="correction-instructions"
                  value={correctionInstructions}
                  onChange={(event) => setCorrectionInstructions(event.target.value)}
                  className="min-h-32"
                  placeholder="State exactly what must be corrected, where, and what evidence the student should add."
                />
              </div>
              <Button className="gap-2" onClick={handleCreateCorrectionRequest}>
                <Send size={16} />
                Send correction request
              </Button>
            </div>
          </Card>

          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Student correction queue"
              description="Track requests, student responses, and resolved items."
              icon={<CheckCircle2 size={18} />}
            />
            <div className="space-y-3">
              {correctionRequests.map((request) => (
                <SavedWorkCard
                  key={request.id}
                  title={request.title}
                  meta={`${request.status.replace(/-/g, " ")} - ${formatActivity(request.updatedAt)}`}
                  status={
                    <Badge
                      variant="outline"
                      className={
                        request.status === "resolved"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : request.status === "student-responded"
                            ? "border-sky-200 bg-sky-50 text-sky-800"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                      }
                    >
                      {request.status === "student-responded" ? "Student responded" : request.status === "resolved" ? "Resolved" : "Awaiting student"}
                    </Badge>
                  }
                  summary={
                    <div className="space-y-2">
                      <p>{request.instructions}</p>
                      {request.studentResponse && (
                        <div className="rounded-md border bg-sky-50 p-3 text-sky-950">
                          <p className="text-xs font-semibold uppercase">Student response</p>
                          <p className="mt-1">{request.studentResponse}</p>
                        </div>
                      )}
                    </div>
                  }
                  actions={
                    request.status !== "resolved" ? (
                      <Button size="sm" variant="outline" className="bg-white" onClick={() => handleResolveCorrection(request.id)}>
                        Mark resolved
                      </Button>
                    ) : null
                  }
                />
              ))}
              {correctionRequests.length === 0 && (
                <WorkspaceEmptyState
                  icon={<Send size={20} />}
                  title="No correction requests yet"
                  description="Send a correction request when the student needs to revise and respond."
                />
              )}
            </div>
          </Card>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader title="Submitted work" description="Latest files recorded for this candidate." icon={<FileCheck2 size={18} />} />
            <div className="space-y-3">
              {submissions.map((submission) => (
                <SavedWorkCard
                  key={submission.id}
                  title={submission.fileName}
                  meta={`Submitted ${formatActivity(submission.submittedAt)}`}
                  status={<Badge variant="outline" className={statusMeta[submission.status].className}>{statusMeta[submission.status].label}</Badge>}
                  summary={`${submission.markingAwarded}/${submission.markingTotal} marks - ${submission.originalityAttention}% originality attention`}
                  actions={
                    <>
                      <Button asChild size="sm" variant="outline" className="gap-2">
                        <Link to="/document-analysis">
                          <ClipboardCheck size={14} />
                          Marking guide
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="gap-2">
                        <Link to="/plagiarism-checker">
                          <ShieldCheck size={14} />
                          Originality
                        </Link>
                      </Button>
                    </>
                  }
                />
              ))}
              {submissions.length === 0 && (
                <WorkspaceEmptyState
                  icon={<FileCheck2 size={20} />}
                  title="No submission yet"
                  description="When the student submits work, the supervisor review queue will show it here."
                />
              )}
            </div>
          </Card>

          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Annotation history"
              description="Sent document comments, replies, and resolved review threads."
              icon={<MessageSquarePlus size={18} />}
              actions={
                <Select value={annotationFilter} onValueChange={(value) => setAnnotationFilter(value as typeof annotationFilter)}>
                  <SelectTrigger className="h-9 w-[150px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All comments</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="replied">Student replied</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
            <div className="space-y-3">
              {visibleComments.map((comment) => {
                const tag = comment.tag || typeToDefaultTag[comment.type];
                return (
                <SavedWorkCard
                  key={comment.id}
                  title={comment.section}
                  meta={`${commentTypeLabels[comment.type]} - sent ${formatActivity(comment.createdAt)}${typeof comment.paragraphIndex === "number" ? ` - paragraph ${comment.paragraphIndex + 1}` : ""}`}
                  status={
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={commentTagMeta[tag].className}>{commentTagMeta[tag].label}</Badge>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-800">
                        {comment.resolved ? "Resolved" : comment.studentReply ? "Student replied" : "Sent"}
                      </Badge>
                    </div>
                  }
                  summary={
                    <div className="space-y-3">
                      {comment.anchorText && (
                        <p className="rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                          {comment.anchorText}
                        </p>
                      )}
                      <p>{comment.text}</p>
                      {comment.studentReply && (
                        <div className="rounded-md border bg-sky-50 p-3 text-sky-950">
                          <p className="text-xs font-semibold uppercase">Student reply</p>
                          <p className="mt-1">{comment.studentReply}</p>
                        </div>
                      )}
                    </div>
                  }
                  actions={
                    !comment.resolved ? (
                      <Button size="sm" variant="outline" className="bg-white" onClick={() => handleResolveComment(comment.id)}>
                        Mark resolved
                      </Button>
                    ) : null
                  }
                />
                );
              })}
              {visibleComments.length === 0 && (
                <WorkspaceEmptyState
                  icon={<MessageSquarePlus size={20} />}
                  title="No matching annotations"
                  description="Select a paragraph and send a tagged comment to start a review thread."
                />
              )}
            </div>
          </Card>
        </section>

        <Card className="study-card mt-6 rounded-lg p-6">
          <WorkspaceSectionHeader
            title="Review timeline"
            description="Combined trail of submissions, reviews, comments, correction requests, and student responses."
            icon={<Clock3 size={18} />}
          />
          <div className="space-y-3">
            {reviewTimeline.map((event) => (
              <div key={`${event.type}-${event.id}`} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[150px_1fr]">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{formatActivity(event.date)}</p>
                  <p className="capitalize">{event.type}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words font-semibold">{event.title}</h3>
                    {event.status && (
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-800">
                        {event.status.replace(/-/g, " ")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{event.detail}</p>
                </div>
              </div>
            ))}
            {reviewTimeline.length === 0 && (
              <WorkspaceEmptyState
                icon={<Clock3 size={20} />}
                title="No review activity yet"
                description="The timeline will build as submissions, comments, and review decisions are saved."
              />
            )}
          </div>
        </Card>
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default SupervisorStudentReview;
