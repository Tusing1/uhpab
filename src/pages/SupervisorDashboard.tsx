import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardCheck,
  Download,
  FileCheck2,
  GraduationCap,
  MessageSquareText,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  exportSupervisorRegisterCsv,
  getLatestStudentSubmission,
  getSupervisorAssignedStudents,
  getSupervisorComments,
  getSupervisorLatestReview,
  loadSchoolWorkspace,
  resolveSupervisorForUser,
  saveSchoolWorkspace,
  type SchoolStudentRecord,
  type SchoolStudentStatus,
  type SchoolWorkspaceState,
} from "@/lib/schoolWorkspaceStore";

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

const SupervisorDashboard = () => {
  const { user, school } = useAuth();
  const navigate = useNavigate();
  const identity = getSchoolIdentity(user?.schoolId || school?.id, user?.schoolName || school?.name);
  const [workspace, setWorkspace] = useState<SchoolWorkspaceState>(() =>
    loadSchoolWorkspace(identity.id, identity.name)
  );

  useEffect(() => {
    const nextIdentity = getSchoolIdentity(user?.schoolId || school?.id, user?.schoolName || school?.name);
    const nextWorkspace = loadSchoolWorkspace(nextIdentity.id, nextIdentity.name);
    saveSchoolWorkspace(nextWorkspace);
    setWorkspace(nextWorkspace);
  }, [school?.id, school?.name, user?.schoolId, user?.schoolName]);

  const supervisor = resolveSupervisorForUser(workspace, user);
  const supervisorName = supervisor?.name || user?.supervisorName || user?.name || "Supervisor";
  const assignedStudents = useMemo(
    () => getSupervisorAssignedStudents(workspace, supervisorName),
    [supervisorName, workspace]
  );

  const queue = useMemo(
    () =>
      assignedStudents
        .map((student) => {
          const submission = getLatestStudentSubmission(workspace, student.id);
          const review = getSupervisorLatestReview(workspace, student.id, supervisorName);
          const comments = getSupervisorComments(workspace, student.id, supervisorName).filter((comment) => !comment.resolved);
          return { student, submission, review, comments };
        })
        .sort((a, b) => (b.submission?.submittedAt || b.student.lastActivity).localeCompare(a.submission?.submittedAt || a.student.lastActivity)),
    [assignedStudents, supervisorName, workspace]
  );

  const pendingReviews = queue.filter((item) => item.submission && (!item.review || item.review.decision === "pending"));
  const needsCorrection = assignedStudents.filter((student) => student.status === "needs-correction");
  const readyForAdmin = queue.filter((item) => item.review?.decision === "ready-for-admin" || item.review?.decision === "approved");
  const openComments = queue.reduce((sum, item) => sum + item.comments.length, 0);
  const averageScore =
    assignedStudents.length > 0
      ? Math.round(assignedStudents.reduce((sum, student) => sum + student.markingScore, 0) / assignedStudents.length)
      : 0;

  const handleExport = () => {
    exportSupervisorRegisterCsv(workspace, supervisorName);
  };

  return (
    <DashboardLayout>
      <WorkspacePage width="wide">
        <WorkspacePageHeader
          eyebrow="Supervisor workspace"
          tone="info"
          icon={<GraduationCap size={14} />}
          title={`${supervisorName}'s review desk`}
          description="Track assigned candidates, review submissions, add supervisor comments, and send ready work back to the school office."
          actions={
            <>
              <Button className="gap-2" onClick={() => navigate("/supervisor-students")}>
                Open assigned students
                <ArrowRight size={16} />
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExport}>
                <Download size={16} />
                Export supervisor register
              </Button>
            </>
          }
          aside={
            <div className="space-y-3 text-sm">
              <p className="font-semibold">{workspace.schoolName}</p>
              <p className="text-muted-foreground">
                Supervisors see only candidates assigned to them. The school admin keeps full oversight from the school workspace.
              </p>
              <div className="rounded-lg border bg-muted/35 p-3">
                <p className="font-medium">Next useful action</p>
                <p className="mt-1 text-muted-foreground">
                  Review pending submissions first, then clear comments marked as needing correction.
                </p>
              </div>
            </div>
          }
        />

        {!supervisor && (
          <WorkspaceStatusNote
            className="mt-6"
            tone="warning"
            icon={<Search size={18} />}
            title="Supervisor profile not matched"
            description="This account is logged in as a supervisor, but its email/name does not match a supervisor in the school workspace yet."
          />
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <WorkspaceMetric label="Assigned students" value={assignedStudents.length} detail="Visible to this supervisor" tone="info" />
          <WorkspaceMetric label="Pending reviews" value={pendingReviews.length} detail="Submitted work awaiting decision" tone={pendingReviews.length ? "warning" : "success"} />
          <WorkspaceMetric label="Needs correction" value={needsCorrection.length} detail="Students requiring follow-up" tone={needsCorrection.length ? "warning" : "success"} />
          <WorkspaceMetric label="Average mark" value={`${averageScore}%`} detail={`${openComments} open supervisor comments`} tone="neutral" />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Review queue"
              description="Latest submitted work from your assigned candidates."
              icon={<FileCheck2 size={18} />}
              actions={<Badge variant="outline" className="bg-white">{pendingReviews.length} pending</Badge>}
            />
            <div className="space-y-3">
              {queue.slice(0, 6).map((item) => (
                <SupervisorStudentCard
                  key={item.student.id}
                  item={item}
                  onOpen={() => navigate(`/supervisor-students/${item.student.id}`)}
                />
              ))}
              {queue.length === 0 && (
                <WorkspaceEmptyState
                  icon={<Users size={20} />}
                  title="No assigned students yet"
                  description="When the school admin assigns candidates to this supervisor, they will appear here."
                />
              )}
            </div>
          </Card>

          <Card className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Supervisor follow-up"
              description="Correction pressure, comments, and work ready for school review."
              icon={<MessageSquareText size={18} />}
            />
            <div className="space-y-3">
              <SavedWorkCard
                title="Correction queue"
                meta={`${needsCorrection.length} candidates`}
                status={<Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">Follow up</Badge>}
                summary="Students whose latest work still needs supervisor correction guidance."
              />
              <SavedWorkCard
                title="Open comments"
                meta={`${openComments} unresolved notes`}
                status={<Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">Comments</Badge>}
                summary="Comments remain visible on each assigned student until the supervisor marks the issue resolved later."
              />
              <SavedWorkCard
                title="Ready for admin"
                meta={`${readyForAdmin.length} candidates`}
                status={<Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">Ready</Badge>}
                summary="Work that can be escalated to school administration for final monitoring."
              />
            </div>
          </Card>
        </section>
      </WorkspacePage>
    </DashboardLayout>
  );
};

type QueueItem = {
  student: SchoolStudentRecord;
  submission: ReturnType<typeof getLatestStudentSubmission>;
  review: ReturnType<typeof getSupervisorLatestReview>;
  comments: ReturnType<typeof getSupervisorComments>;
};

const SupervisorStudentCard = ({ item, onOpen }: { item: QueueItem; onOpen: () => void }) => {
  const meta = statusMeta[item.student.status];
  const reviewLabel = item.review?.decision ? item.review.decision.replace(/-/g, " ") : "not reviewed";
  const score = item.review ? Math.round((item.review.awarded / item.review.total) * 100) : item.student.markingScore;

  return (
    <SavedWorkCard
      title={item.student.name}
      meta={`${item.student.htin} - ${item.student.cohort}`}
      status={<Badge variant="outline" className={meta.className}>{meta.label}</Badge>}
      summary={
        <div className="space-y-3">
          <p className="line-clamp-2 text-foreground">{item.student.topic || "Topic not registered yet"}</p>
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <span>{item.submission ? `Submitted ${formatActivity(item.submission.submittedAt)}` : "No submission yet"}</span>
            <span>{reviewLabel}</span>
            <span>{item.comments.length} open comments</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>
      }
      actions={
        <>
          <Button size="sm" className="gap-2" onClick={onOpen}>
            Review student
            <ArrowRight size={14} />
          </Button>
          {item.submission?.originalityAttention ? (
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/plagiarism-checker">
                <ShieldCheck size={14} />
                Check originality
              </Link>
            </Button>
          ) : null}
        </>
      }
    />
  );
};

export default SupervisorDashboard;
