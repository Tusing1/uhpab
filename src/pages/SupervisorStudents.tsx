import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardCheck,
  Download,
  FileCheck2,
  GraduationCap,
  Search,
  Users,
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import {
  SavedWorkCard,
  WorkspaceEmptyState,
  WorkspaceSectionHeader,
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
  type SchoolStudentStatus,
  type SchoolWorkspaceState,
} from "@/lib/schoolWorkspaceStore";

const statusMeta: Record<SchoolStudentStatus, { label: string; className: string }> = {
  ready: { label: "Ready", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  "on-track": { label: "On track", className: "border-sky-200 bg-sky-50 text-sky-800" },
  "needs-correction": { label: "Needs correction", className: "border-amber-200 bg-amber-50 text-amber-900" },
  "not-submitted": { label: "Not submitted", className: "border-rose-200 bg-rose-50 text-rose-800" },
};

const getSchoolIdentity = (schoolId?: string, schoolName?: string) => ({
  id: schoolId || "school1",
  name: schoolName || "Kampala Nursing School",
});

const SupervisorStudents = () => {
  const { user, school } = useAuth();
  const navigate = useNavigate();
  const identity = getSchoolIdentity(user?.schoolId || school?.id, user?.schoolName || school?.name);
  const [workspace, setWorkspace] = useState<SchoolWorkspaceState>(() =>
    loadSchoolWorkspace(identity.id, identity.name)
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SchoolStudentStatus>("all");

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

  const visibleStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assignedStudents.filter((student) => {
      if (statusFilter !== "all" && student.status !== statusFilter) return false;
      if (!normalized) return true;
      return [
        student.name,
        student.htin,
        student.cohort,
        student.programme,
        student.topic,
        student.currentStage,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [assignedStudents, query, statusFilter]);

  return (
    <DashboardLayout>
      <WorkspacePage width="wide">
        <WorkspacePageHeader
          eyebrow="Assigned students"
          tone="info"
          icon={<Users size={14} />}
          title="Supervisor student list"
          description="Review only the candidates assigned to this supervisor. Search by name, HTIN, cohort, topic, or current stage."
          actions={
            <>
              <Button className="gap-2" onClick={() => navigate("/supervisor-dashboard")}>
                Supervisor dashboard
                <GraduationCap size={16} />
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => exportSupervisorRegisterCsv(workspace, supervisorName)}>
                <Download size={16} />
                Export list
              </Button>
            </>
          }
        />

        <Card className="study-card mt-6 rounded-lg p-6">
          <WorkspaceSectionHeader
            title="Students assigned to me"
            description={`${visibleStudents.length} of ${assignedStudents.length} assigned candidates visible.`}
            icon={<ClipboardCheck size={18} />}
          />
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="Search student, HTIN, cohort, topic, stage"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | SchoolStudentStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="needs-correction">Needs correction</SelectItem>
                <SelectItem value="on-track">On track</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="not-submitted">Not submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {visibleStudents.map((student) => {
              const status = statusMeta[student.status];
              const submission = getLatestStudentSubmission(workspace, student.id);
              const review = getSupervisorLatestReview(workspace, student.id, supervisorName);
              const comments = getSupervisorComments(workspace, student.id, supervisorName).filter((comment) => !comment.resolved);
              const score = review ? Math.round((review.awarded / review.total) * 100) : student.markingScore;

              return (
                <SavedWorkCard
                  key={student.id}
                  title={student.name}
                  meta={`${student.htin} - ${student.cohort}`}
                  status={<Badge variant="outline" className={status.className}>{status.label}</Badge>}
                  summary={
                    <div className="space-y-3">
                      <p className="line-clamp-2 text-foreground">{student.topic || "Topic not registered yet"}</p>
                      <div className="grid gap-2 text-xs md:grid-cols-3">
                        <span>{submission ? submission.fileName : "No submission yet"}</span>
                        <span>{review ? review.decision.replace(/-/g, " ") : "Not marked"}</span>
                        <span>{comments.length} open comments</span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  }
                  actions={
                    <Button size="sm" className="gap-2" onClick={() => navigate(`/supervisor-students/${student.id}`)}>
                      Open review
                      <ArrowRight size={14} />
                    </Button>
                  }
                />
              );
            })}
          </div>

          {visibleStudents.length === 0 && (
            <WorkspaceEmptyState
              className="mt-5"
              icon={<FileCheck2 size={20} />}
              title="No assigned student matches this view"
              description="Change the search or status filter to return to the full supervisor list."
              actions={
                <Button variant="outline" onClick={() => { setQuery(""); setStatusFilter("all"); }}>
                  Clear filters
                </Button>
              }
            />
          )}
        </Card>
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default SupervisorStudents;
