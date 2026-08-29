import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, FileCheck2, FileText, Highlighter, Lightbulb, MessageSquare, MessageSquareReply, SearchCheck, Send, UploadCloud } from "lucide-react";
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
import { extractDocumentText } from "@/lib/documentTextExtraction";
import {
  getLatestStudentSubmission,
  getStudentCorrectionRequests,
  getStudentSubmissions,
  getSubmissionDocumentText,
  getSupervisorComments,
  loadSchoolWorkspace,
  resolveStudentForUser,
  respondToSupervisorComment,
  respondToCorrectionRequest,
  saveSchoolWorkspace,
  uploadStudentSubmission,
  type SchoolCommentTag,
  type SchoolWorkspaceState,
} from "@/lib/schoolWorkspaceStore";

const getSchoolIdentity = (schoolId?: string, schoolName?: string) => ({
  id: schoolId || "school1",
  name: schoolName || "Kampala Nursing School",
});

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

const SchoolStudentWorkspace = () => {
  const { user, school } = useAuth();
  const identity = getSchoolIdentity(user?.schoolId || school?.id, user?.schoolName || school?.name);
  const [workspace, setWorkspace] = useState<SchoolWorkspaceState>(() =>
    loadSchoolWorkspace(identity.id, identity.name)
  );
  const student = resolveStudentForUser(workspace, user);
  const assignments = useMemo(
    () =>
      student
        ? workspace.assignments.filter((assignment) => assignment.cohort === "All cohorts" || assignment.cohort === student.cohort)
        : [],
    [student, workspace.assignments]
  );
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [commentReplyDrafts, setCommentReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const nextIdentity = getSchoolIdentity(user?.schoolId || school?.id, user?.schoolName || school?.name);
    const nextWorkspace = loadSchoolWorkspace(nextIdentity.id, nextIdentity.name);
    saveSchoolWorkspace(nextWorkspace);
    setWorkspace(nextWorkspace);
  }, [school?.id, school?.name, user?.schoolId, user?.schoolName]);

  useEffect(() => {
    if (assignments.length && !assignments.some((assignment) => assignment.id === assignmentId)) {
      setAssignmentId(assignments[0].id);
    }
  }, [assignmentId, assignments]);

  const submissions = useMemo(
    () => (student ? getStudentSubmissions(workspace, student.id) : []),
    [student, workspace]
  );
  const latestSubmission = student ? getLatestStudentSubmission(workspace, student.id) : undefined;
  const supervisorComments = useMemo(
    () => (student ? getSupervisorComments(workspace, student.id) : []),
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
    const grouped = new Map<number, typeof supervisorComments>();
    supervisorComments.forEach((comment) => {
      if (typeof comment.paragraphIndex !== "number") return;
      const existing = grouped.get(comment.paragraphIndex) || [];
      grouped.set(comment.paragraphIndex, [...existing, comment]);
    });
    return grouped;
  }, [supervisorComments]);
  const correctionRequests = useMemo(
    () => (student ? getStudentCorrectionRequests(workspace, student.id) : []),
    [student, workspace]
  );
  const openCorrections = correctionRequests.filter((request) => request.status !== "resolved").length;
  const openSupervisorComments = supervisorComments.filter((comment) => !comment.resolved).length;
  const selectedAssignment = assignments.find((assignment) => assignment.id === assignmentId);

  const persistWorkspace = (nextWorkspace: SchoolWorkspaceState) => {
    setWorkspace(nextWorkspace);
    saveSchoolWorkspace(nextWorkspace);
  };

  const handleUploadSubmission = async () => {
    if (!student) return;
    if (!assignmentId) {
      toast.error("Choose an assignment before uploading");
      return;
    }
    if (!selectedFile && !manualText.trim()) {
      toast.error("Upload a document or paste your revised text");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Preparing submission", {
      description: selectedFile ? "Extracting document text for supervisor review." : "Saving pasted text.",
    });

    try {
      const extracted = selectedFile ? await extractDocumentText(selectedFile) : null;
      const text = extracted?.text || manualText;
      const nextWorkspace = uploadStudentSubmission(workspace, {
        studentId: student.id,
        assignmentId,
        fileName: selectedFile?.name || `${student.name}-manual-submission.txt`,
        documentType: selectedAssignment?.documentType || "report",
        fileType: extracted?.sourceType || "manual",
        documentText: text,
        pageCount: extracted?.pageCount ?? null,
        wordCount: extracted?.wordCount ?? text.trim().split(/\s+/).filter(Boolean).length,
        uploadedBy: student.name,
      });
      persistWorkspace(nextWorkspace);
      setSelectedFile(null);
      setManualText("");
      toast.success("Submission uploaded", {
        id: toastId,
        description: "Your supervisor can now review the latest version.",
      });
    } catch (error) {
      console.error(error);
      toast.error("Upload failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Please try another PDF, DOCX, or TXT file.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendResponse = (requestId: string) => {
    const response = responseDrafts[requestId] || "";
    if (!response.trim()) {
      toast.error("Write your response before sending");
      return;
    }

    const nextWorkspace = respondToCorrectionRequest(workspace, requestId, response);
    persistWorkspace(nextWorkspace);
    setResponseDrafts((current) => ({ ...current, [requestId]: "" }));
    toast.success("Response sent", {
      description: "Your supervisor will see this in the correction queue.",
    });
  };

  const handleSendCommentReply = (commentId: string) => {
    const reply = commentReplyDrafts[commentId] || "";
    if (!reply.trim()) {
      toast.error("Write your reply before sending");
      return;
    }

    const nextWorkspace = respondToSupervisorComment(workspace, commentId, reply);
    persistWorkspace(nextWorkspace);
    setCommentReplyDrafts((current) => ({ ...current, [commentId]: "" }));
    toast.success("Comment reply sent", {
      description: "Your supervisor can see the reply in the review thread.",
    });
  };

  if (!student) {
    return (
      <DashboardLayout>
        <WorkspacePage>
          <WorkspaceEmptyState
            tone="warning"
            icon={<FileCheck2 size={22} />}
            title="No school candidate record found"
            description="Your account is signed in, but it is not linked to a registered school candidate record yet. Ask your school admin to confirm your HTIN or email."
          />
        </WorkspacePage>
      </DashboardLayout>
    );
  }

  const submittedAssignmentIds = new Set(submissions.map((submission) => submission.assignmentId));
  const submissionProgress = assignments.length
    ? Math.round((submittedAssignmentIds.size / assignments.length) * 100)
    : 0;

  return (
    <DashboardLayout>
      <WorkspacePage width="wide" className="space-y-6">
        <WorkspacePageHeader
          eyebrow="School student workspace"
          tone={openCorrections ? "warning" : "success"}
          icon={<FileCheck2 size={14} />}
          title={`Welcome, ${student.name}`}
          description={`${student.htin} - ${student.cohort} - ${student.programme}`}
          aside={
            <div className="space-y-3 text-sm">
              <p className="font-semibold">{student.topic || "Research topic not yet registered"}</p>
              <Progress value={submissionProgress} className="h-2" />
              <p className="text-muted-foreground">{submissionProgress}% of current school assignments submitted.</p>
            </div>
          }
        />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            {
              title: "Find a topic",
              description: "Build a clean UHPAB title before opening a proposal or report.",
              href: "/research-topic-generator",
              icon: <Lightbulb size={18} />,
              label: "Topic builder",
            },
            {
              title: "Start proposal",
              description: "Create the structured proposal workspace.",
              href: "/projects/new?type=proposal",
              icon: <FileText size={18} />,
              label: "Create proposal",
            },
            {
              title: "Start report",
              description: "Create the full report workspace with Chapters 1-5.",
              href: "/projects/new?type=report",
              icon: <BookOpen size={18} />,
              label: "Create report",
            },
            {
              title: "Continue work",
              description: "Open saved proposals, reports, and review archive.",
              href: "/projects",
              icon: <BookOpen size={18} />,
              label: "My research work",
            },
            {
              title: "Check document",
              description: "Upload existing work for marking-guide review.",
              href: "/document-analysis",
              icon: <SearchCheck size={18} />,
              label: "Check document",
            },
          ].map((action) => (
            <Card key={action.title} className="study-card rounded-lg p-4">
              <div className="flex h-full flex-col gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {action.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{action.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{action.description}</p>
                </div>
                <Button asChild variant="outline" className="justify-start gap-2 bg-white">
                  <Link to={action.href}>
                    {action.icon}
                    {action.label}
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <WorkspaceMetric label="Assignments" value={assignments.length} detail="Open for your cohort" tone="info" />
          <WorkspaceMetric label="Submissions" value={submissions.length} detail="Versions uploaded" tone="success" />
          <WorkspaceMetric label="Corrections" value={openCorrections} detail="Need response or revision" tone={openCorrections ? "warning" : "success"} />
          <WorkspaceMetric label="Supervisor comments" value={openSupervisorComments} detail="Visible on your document" tone={openSupervisorComments ? "warning" : "success"} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.82fr]">
          <Card className="study-card rounded-lg p-0">
            <div className="border-b p-6">
              <WorkspaceSectionHeader
                title="Annotated document"
                description="Supervisor comments are shown on the paragraph where they were sent."
                icon={<Highlighter size={18} />}
                actions={
                  latestSubmission ? (
                    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                      {latestSubmission.fileName}
                    </Badge>
                  ) : null
                }
              />
            </div>
            <div className="max-h-[680px] overflow-auto bg-slate-50/70 p-4">
              <article className="mx-auto min-h-[500px] max-w-3xl rounded-md border bg-white px-7 py-8 shadow-sm">
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
                    return (
                      <div
                        key={`${paragraph}-${index}`}
                        className={[
                          "rounded-md border-l-4 px-4 py-3",
                          paragraphAnnotations.length ? commentTagMeta[primaryTag].markerClassName : "border-l-transparent",
                        ].join(" ")}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-md border bg-white px-2 py-1 text-xs font-medium text-muted-foreground">
                            Paragraph {index + 1}
                          </span>
                          {paragraphAnnotations.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <MessageSquare size={13} />
                              {paragraphAnnotations.length} supervisor comment{paragraphAnnotations.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                        {isHeading ? (
                          <h3 className="pt-1 text-base font-bold uppercase tracking-normal text-slate-950">{paragraph}</h3>
                        ) : (
                          <p className="whitespace-pre-wrap">{paragraph}</p>
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
              title="Supervisor comment threads"
              description="Reply after you have made the change or need clarification."
              icon={<MessageSquareReply size={18} />}
            />
            <div className="max-h-[680px] space-y-3 overflow-auto pr-1">
              {supervisorComments.map((comment) => {
                const tag = comment.tag || "question";
                return (
                  <SavedWorkCard
                    key={comment.id}
                    title={comment.section}
                    meta={`${comment.supervisorName} - ${typeof comment.paragraphIndex === "number" ? `paragraph ${comment.paragraphIndex + 1}` : "general note"}`}
                    status={
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={commentTagMeta[tag].className}>{commentTagMeta[tag].label}</Badge>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-800">
                          {comment.resolved ? "Resolved" : comment.studentReply ? "Reply sent" : "Needs reply"}
                        </Badge>
                      </div>
                    }
                    summary={
                      <div className="space-y-3">
                        {comment.anchorText && (
                          <p className="rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">{comment.anchorText}</p>
                        )}
                        <p>{comment.text}</p>
                        {comment.studentReply && (
                          <p className="rounded-md border bg-sky-50 p-3 text-sky-950">
                            Reply sent: {comment.studentReply}
                          </p>
                        )}
                        {!comment.resolved && (
                          <div className="grid gap-2">
                            <Label htmlFor={`comment-reply-${comment.id}`}>Your reply</Label>
                            <Textarea
                              id={`comment-reply-${comment.id}`}
                              value={commentReplyDrafts[comment.id] || ""}
                              onChange={(event) =>
                                setCommentReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))
                              }
                              className="min-h-24 bg-white"
                              placeholder="Example: I have revised this paragraph and added comparison with chapter two evidence."
                            />
                          </div>
                        )}
                      </div>
                    }
                    actions={
                      !comment.resolved ? (
                        <Button size="sm" className="gap-2" onClick={() => handleSendCommentReply(comment.id)}>
                          <Send size={14} />
                          Send reply
                        </Button>
                      ) : null
                    }
                  />
                );
              })}
              {supervisorComments.length === 0 && (
                <WorkspaceEmptyState
                  icon={<MessageSquareReply size={20} />}
                  title="No supervisor comments yet"
                  description="When your supervisor comments on the document, the notes will appear here."
                />
              )}
            </div>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Upload revised work"
              description="Submit PDF, DOCX, TXT, or paste text for supervisor review."
              icon={<UploadCloud size={18} />}
            />
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Assignment</Label>
                <Select value={assignmentId} onValueChange={setAssignmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {assignment.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="submission-file">Document file</Label>
                <Input
                  id="submission-file"
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="submission-text">Or paste text</Label>
                <Textarea
                  id="submission-text"
                  value={manualText}
                  onChange={(event) => setManualText(event.target.value)}
                  className="min-h-36"
                  placeholder="Paste revised chapter text if you are not uploading a file."
                />
              </div>
              <Button className="gap-2" onClick={handleUploadSubmission} disabled={isUploading || assignments.length === 0}>
                <UploadCloud size={16} />
                {isUploading ? "Uploading..." : "Submit for review"}
              </Button>
              {selectedAssignment && (
                <WorkspaceStatusNote
                  tone="info"
                  title={selectedAssignment.section}
                  description={`Due ${formatDate(selectedAssignment.dueDate)}. Your supervisor will see the extracted text after upload.`}
                />
              )}
            </div>
          </Card>

          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Correction requests"
              description="Respond after you have made the required changes."
              icon={<MessageSquareReply size={18} />}
            />
            <div className="space-y-3">
              {correctionRequests.map((request) => (
                <SavedWorkCard
                  key={request.id}
                  title={request.title}
                  meta={`${request.supervisorName} - ${request.status.replace(/-/g, " ")}`}
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
                      {request.status === "resolved" ? "Resolved" : request.status === "student-responded" ? "Sent" : "Action needed"}
                    </Badge>
                  }
                  summary={
                    <div className="space-y-3">
                      <p>{request.instructions}</p>
                      {request.studentResponse && (
                        <p className="rounded-md border bg-sky-50 p-3 text-sky-950">
                          Response sent: {request.studentResponse}
                        </p>
                      )}
                      {request.status !== "resolved" && (
                        <div className="grid gap-2">
                          <Label htmlFor={`response-${request.id}`}>Your response</Label>
                          <Textarea
                            id={`response-${request.id}`}
                            value={responseDrafts[request.id] || ""}
                            onChange={(event) =>
                              setResponseDrafts((current) => ({ ...current, [request.id]: event.target.value }))
                            }
                            className="min-h-24 bg-white"
                            placeholder="Example: I have compared findings with chapter two studies and added nursing practice implications."
                          />
                        </div>
                      )}
                    </div>
                  }
                  actions={
                    request.status !== "resolved" ? (
                      <Button size="sm" className="gap-2" onClick={() => handleSendResponse(request.id)}>
                        <Send size={14} />
                        Send response
                      </Button>
                    ) : null
                  }
                />
              ))}
              {correctionRequests.length === 0 && (
                <WorkspaceEmptyState
                  icon={<MessageSquareReply size={20} />}
                  title="No correction requests"
                  description="Your supervisor has not sent any correction tasks yet."
                />
              )}
            </div>
          </Card>
        </section>

        <Card className="study-card rounded-lg p-6">
          <WorkspaceSectionHeader
            title="Submission history"
            description="Every uploaded version stays visible for supervision tracking."
            icon={<FileCheck2 size={18} />}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {submissions.map((submission) => (
              <SavedWorkCard
                key={submission.id}
                title={submission.fileName}
                meta={`Version ${submission.version || 1} - submitted ${formatDate(submission.submittedAt)}`}
                status={<Badge variant="outline">{submission.status.replace(/-/g, " ")}</Badge>}
                summary={`${submission.wordCount || 0} words${submission.pageCount ? ` - ${submission.pageCount} pages` : ""}`}
              />
            ))}
            {submissions.length === 0 && (
              <WorkspaceEmptyState
                icon={<FileCheck2 size={20} />}
                title="No submission yet"
                description="Upload your first school assignment when ready."
              />
            )}
          </div>
        </Card>
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default SchoolStudentWorkspace;
