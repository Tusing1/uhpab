import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  Copy,
  Download,
  FileCheck2,
  GraduationCap,
  ListChecks,
  Mail,
  Plus,
  School,
  Search,
  Send,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
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
  assignStudentSupervisor,
  createAssignment,
  createCohort,
  createSchoolInviteCode,
  createSupervisorProfile,
  exportCandidateRegisterCsv,
  exportSchoolSummaryCsv,
  importCandidates,
  loadSchoolWorkspace,
  parseCandidateImport,
  registerCandidate,
  saveSchoolWorkspace,
  type SchoolAccountStatus,
  type SchoolAssignment,
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

const assignmentStatusMeta: Record<SchoolAssignment["status"], { label: string; className: string }> = {
  open: { label: "Open", className: "border-sky-200 bg-sky-50 text-sky-800" },
  "closing-soon": { label: "Closing soon", className: "border-amber-200 bg-amber-50 text-amber-900" },
  closed: { label: "Closed", className: "border-slate-200 bg-slate-50 text-slate-800" },
};

const accountStatusMeta: Record<SchoolAccountStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  invited: { label: "Invited", className: "border-sky-200 bg-sky-50 text-sky-800" },
  blocked: { label: "Blocked", className: "border-rose-200 bg-rose-50 text-rose-800" },
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatActivity = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const days = Math.max(0, Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
};

const average = (values: number[]) => {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
};

const todayInputValue = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const currentYear = () => String(new Date().getFullYear());

const getInitialSchoolIdentity = (schoolId?: string, schoolName?: string) => ({
  id: schoolId || "demo-school",
  name: schoolName || "UHPAB Demo Health Training School",
});

const SchoolDashboard = () => {
  const { user, school, isSchoolAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const identity = getInitialSchoolIdentity(user?.schoolId || school?.id, user?.schoolName || school?.name);
  const [workspace, setWorkspace] = useState<SchoolWorkspaceState>(() =>
    loadSchoolWorkspace(identity.id, identity.name)
  );
  const [selectedCohort, setSelectedCohort] = useState("All cohorts");
  const firstCohort = workspace.cohorts[0];
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [candidateHtin, setCandidateHtin] = useState("");
  const [candidateTopic, setCandidateTopic] = useState("");
  const [candidateCohort, setCandidateCohort] = useState(firstCohort?.name || "");
  const [candidateProgramme, setCandidateProgramme] = useState(firstCohort?.programme || "");
  const [candidateSupervisor, setCandidateSupervisor] = useState(workspace.supervisors[0]?.name || "Not assigned");
  const [bulkCandidateText, setBulkCandidateText] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | SchoolAccountStatus | "profile-pending">("all");
  const [cohortName, setCohortName] = useState("");
  const [cohortProgramme, setCohortProgramme] = useState("Diploma in Nursing");
  const [cohortAcademicYear, setCohortAcademicYear] = useState(currentYear);
  const [cohortIntake, setCohortIntake] = useState("January intake");
  const [cohortCapacity, setCohortCapacity] = useState("60");
  const [cohortLead, setCohortLead] = useState(workspace.supervisors[0]?.name || "Research coordinator");
  const [assignmentTitle, setAssignmentTitle] = useState("Submit corrected marking-guide report");
  const [assignmentSection, setAssignmentSection] = useState("Full report");
  const [assignmentType, setAssignmentType] = useState<"proposal" | "report">("report");
  const [assignmentDueDate, setAssignmentDueDate] = useState(todayInputValue);
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [supervisorPhone, setSupervisorPhone] = useState("");
  const [supervisorDepartment, setSupervisorDepartment] = useState("Research supervision");
  const [supervisorAvailability, setSupervisorAvailability] = useState<"available" | "limited">("available");
  const [reassignStudentId, setReassignStudentId] = useState(workspace.students[0]?.id || "");
  const [reassignSupervisor, setReassignSupervisor] = useState(workspace.supervisors[0]?.name || "Not assigned");

  useEffect(() => {
    const nextIdentity = getInitialSchoolIdentity(user?.schoolId || school?.id, user?.schoolName || school?.name);
    setWorkspace(loadSchoolWorkspace(nextIdentity.id, nextIdentity.name));
  }, [school?.id, school?.name, user?.schoolId, user?.schoolName]);

  useEffect(() => {
    if (!location.hash) return;
    const section = document.getElementById(location.hash.slice(1));
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  useEffect(() => {
    if (workspace.cohorts.length === 0) return;
    const currentCandidateCohort = workspace.cohorts.find((cohort) => cohort.name === candidateCohort);
    if (!currentCandidateCohort) {
      const nextCohort = workspace.cohorts[0];
      setCandidateCohort(nextCohort.name);
      setCandidateProgramme(nextCohort.programme);
      setCohortLead(nextCohort.supervisorLead);
    }
  }, [candidateCohort, workspace.cohorts]);

  useEffect(() => {
    if (workspace.students.length && !workspace.students.some((student) => student.id === reassignStudentId)) {
      setReassignStudentId(workspace.students[0].id);
    }
    if (workspace.supervisors.length && !workspace.supervisors.some((supervisor) => supervisor.name === reassignSupervisor)) {
      setReassignSupervisor(workspace.supervisors[0].name);
    }
  }, [reassignStudentId, reassignSupervisor, workspace.students, workspace.supervisors]);

  const cohorts = useMemo(
    () => ["All cohorts", ...workspace.cohorts.map((cohort) => cohort.name)],
    [workspace.cohorts]
  );

  const visibleCohorts = useMemo(
    () =>
      selectedCohort === "All cohorts"
        ? workspace.cohorts
        : workspace.cohorts.filter((cohort) => cohort.name === selectedCohort),
    [selectedCohort, workspace.cohorts]
  );

  const visibleStudents = useMemo(
    () =>
      selectedCohort === "All cohorts"
        ? workspace.students
        : workspace.students.filter((student) => student.cohort === selectedCohort),
    [selectedCohort, workspace.students]
  );

  const visibleSubmissions = useMemo(() => {
    const visibleIds = new Set(visibleStudents.map((student) => student.id));
    return workspace.submissions
      .filter((submission) => visibleIds.has(submission.studentId))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [visibleStudents, workspace.submissions]);

  const visibleRegister = useMemo(() => {
    const normalizedQuery = candidateSearch.trim().toLowerCase();
    return visibleStudents.filter((student) => {
      if (accountFilter !== "all") {
        if (accountFilter === "profile-pending" && student.registrationStatus !== "profile-pending") return false;
        if (accountFilter !== "profile-pending" && student.accountStatus !== accountFilter) return false;
      }
      if (!normalizedQuery) return true;

      return [
        student.name,
        student.email,
        student.phone,
        student.htin,
        student.candidateNumber,
        student.cohort,
        student.programme,
        student.topic,
        student.supervisor,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [accountFilter, candidateSearch, visibleStudents]);

  const metrics = useMemo(() => {
    const submittedStudentIds = new Set(workspace.submissions.map((submission) => submission.studentId));
    const submitted = visibleStudents.filter((student) => submittedStudentIds.has(student.id)).length;
    const needsCorrection = visibleStudents.filter((student) => student.status === "needs-correction").length;
    const ready = visibleStudents.filter((student) => student.status === "ready").length;
    const activeAccounts = visibleStudents.filter((student) => student.accountStatus === "active").length;
    const invitedAccounts = visibleStudents.filter((student) => student.accountStatus === "invited").length;
    const pendingProfiles = visibleStudents.filter((student) => student.registrationStatus === "profile-pending").length;
    const noSupervisor = visibleStudents.filter((student) => !student.supervisor || student.supervisor === "Not assigned").length;
    const averageMark = average(visibleStudents.filter((student) => student.markingScore > 0).map((student) => student.markingScore));
    const originalityAttention = average(visibleStudents.map((student) => student.originalityAttention));
    const cohortCapacity = visibleCohorts.reduce((sum, cohort) => sum + cohort.capacity, 0);
    const capacityUsed = visibleStudents.length;

    return {
      submitted,
      needsCorrection,
      ready,
      activeAccounts,
      invitedAccounts,
      pendingProfiles,
      noSupervisor,
      averageMark,
      originalityAttention,
      cohortCapacity,
      capacityUsed,
      capacityRate: cohortCapacity ? Math.round((capacityUsed / cohortCapacity) * 100) : 0,
      submissionRate: visibleStudents.length ? Math.round((submitted / visibleStudents.length) * 100) : 0,
    };
  }, [visibleCohorts, visibleStudents, workspace.submissions]);

  const persistWorkspace = (nextWorkspace: SchoolWorkspaceState) => {
    setWorkspace(nextWorkspace);
    saveSchoolWorkspace(nextWorkspace);
  };

  const selectedInviteCode =
    selectedCohort === "All cohorts"
      ? createSchoolInviteCode(workspace.schoolId, "All cohorts")
      : workspace.cohorts.find((cohort) => cohort.name === selectedCohort)?.registrationCode ||
        createSchoolInviteCode(workspace.schoolId, selectedCohort);

  const handleRegisterCandidate = () => {
    if (!candidateName.trim() || !candidateHtin.trim() || !candidateCohort) {
      toast.error("Add candidate name, HTIN/candidate number, and cohort");
      return;
    }

    if (workspace.students.some((student) => student.htin.toLowerCase() === candidateHtin.trim().toLowerCase())) {
      toast.error("A candidate with this HTIN is already registered");
      return;
    }

    const nextWorkspace = registerCandidate(workspace, {
      name: candidateName,
      email: candidateEmail,
      phone: candidatePhone,
      htin: candidateHtin,
      cohort: candidateCohort,
      programme: candidateProgramme,
      topic: candidateTopic,
      supervisor: candidateSupervisor,
    });

    persistWorkspace(nextWorkspace);
    toast.success("Candidate registered", {
      description: `${candidateName.trim()} was added to ${candidateCohort}.`,
    });
    setCandidateName("");
    setCandidateEmail("");
    setCandidatePhone("");
    setCandidateHtin("");
    setCandidateTopic("");
  };

  const handleBulkImport = () => {
    if (!bulkCandidateText.trim()) {
      toast.error("Paste candidate lines before importing");
      return;
    }

    const candidates = parseCandidateImport(bulkCandidateText, {
      cohort: candidateCohort,
      programme: candidateProgramme,
      supervisor: candidateSupervisor,
    });
    const result = importCandidates(workspace, candidates);
    persistWorkspace(result.workspace);
    toast.success(`${result.added} candidates imported`, {
      description: result.skipped ? `${result.skipped} duplicate or incomplete lines skipped.` : "Candidate register updated.",
    });
    if (result.added > 0) setBulkCandidateText("");
  };

  const handleCreateCohort = () => {
    if (!cohortName.trim() || !cohortProgramme.trim()) {
      toast.error("Add cohort name and programme");
      return;
    }

    if (workspace.cohorts.some((cohort) => cohort.name.toLowerCase() === cohortName.trim().toLowerCase())) {
      toast.error("This cohort already exists");
      return;
    }

    const nextWorkspace = createCohort(workspace, {
      name: cohortName,
      programme: cohortProgramme,
      academicYear: cohortAcademicYear,
      intake: cohortIntake,
      capacity: Number(cohortCapacity),
      supervisorLead: cohortLead,
    });
    persistWorkspace(nextWorkspace);
    toast.success("Cohort created", {
      description: `${cohortName.trim()} is ready for candidate registration.`,
    });
    setCohortName("");
  };

  const handleCreateAssignment = () => {
    if (!assignmentTitle.trim()) {
      toast.error("Add an assignment title first");
      return;
    }

    const nextWorkspace = createAssignment(workspace, {
      title: assignmentTitle.trim(),
      documentType: assignmentType,
      section: assignmentSection,
      cohort: selectedCohort,
      dueDate: assignmentDueDate,
    });
    persistWorkspace(nextWorkspace);
    toast.success("Assignment created", {
      description: `${assignmentTitle.trim()} assigned to ${selectedCohort}.`,
    });
    setAssignmentTitle("");
  };

  const handleCreateSupervisor = () => {
    if (!supervisorName.trim() || !supervisorEmail.trim()) {
      toast.error("Add supervisor name and email");
      return;
    }

    if (
      workspace.supervisors.some(
        (supervisor) =>
          supervisor.email.toLowerCase() === supervisorEmail.trim().toLowerCase() ||
          supervisor.name.toLowerCase() === supervisorName.trim().toLowerCase()
      )
    ) {
      toast.error("This supervisor is already registered");
      return;
    }

    const nextWorkspace = createSupervisorProfile(workspace, {
      name: supervisorName,
      email: supervisorEmail,
      phone: supervisorPhone,
      department: supervisorDepartment,
      available: supervisorAvailability === "available",
    });
    persistWorkspace(nextWorkspace);
    toast.success("Supervisor added", {
      description: `${supervisorName.trim()} can now be assigned to candidates.`,
    });
    setSupervisorName("");
    setSupervisorEmail("");
    setSupervisorPhone("");
    setSupervisorDepartment("Research supervision");
    setSupervisorAvailability("available");
  };

  const handleAssignSupervisor = () => {
    if (!reassignStudentId || !reassignSupervisor) {
      toast.error("Choose a candidate and supervisor");
      return;
    }

    const student = workspace.students.find((item) => item.id === reassignStudentId);
    const nextWorkspace = assignStudentSupervisor(workspace, reassignStudentId, reassignSupervisor);
    persistWorkspace(nextWorkspace);
    toast.success("Supervisor assignment updated", {
      description: student ? `${student.name} assigned to ${reassignSupervisor}.` : undefined,
    });
  };

  const handleExportSummary = () => {
    exportSchoolSummaryCsv(workspace, selectedCohort);
  };

  const handleExportRegister = () => {
    exportCandidateRegisterCsv(workspace, selectedCohort);
  };

  const handleCopyInvite = async () => {
    await navigator.clipboard.writeText(selectedInviteCode);
    toast.success("School invite code copied", {
      description: selectedInviteCode,
    });
  };

  const studentName = (studentId: string) =>
    workspace.students.find((student) => student.id === studentId)?.name || "Student";

  const assignmentName = (assignmentId: string) =>
    workspace.assignments.find((assignment) => assignment.id === assignmentId)?.title || "Assignment";

  return (
    <DashboardLayout>
      <WorkspacePage width="wide" className="space-y-8">
        <WorkspacePageHeader
          eyebrow="School administration"
          tone="info"
          icon={<School size={14} />}
          title="School command center"
          description="Register candidates, manage cohorts, assign supervisors, monitor submissions, and keep the school research office moving from one dashboard."
          actions={
            <>
              <Button className="gap-2" onClick={() => document.getElementById("candidate-registration")?.scrollIntoView({ behavior: "smooth" })}>
                <UserPlus size={16} />
                Register candidate
              </Button>
              <Button variant="outline" className="gap-2 bg-white/80" onClick={handleCopyInvite}>
                <Copy size={16} />
                Copy invite code
              </Button>
              <Button variant="outline" className="gap-2 bg-white/80" onClick={handleExportRegister}>
                <Download size={16} />
                Export register
              </Button>
            </>
          }
          aside={
            <>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-info-muted text-info">
                  <GraduationCap size={22} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">{workspace.schoolName}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {isSchoolAdmin() ? "Admin view" : "School workspace preview"} - {selectedCohort}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <WorkspaceMetric label="Candidates" value={visibleStudents.length} detail="In current view" tone="info" />
                <WorkspaceMetric label="Invited" value={metrics.invitedAccounts} detail="Need account activation" tone={metrics.invitedAccounts ? "warning" : "success"} />
                <WorkspaceMetric label="Need correction" value={metrics.needsCorrection} detail="Require follow-up" tone={metrics.needsCorrection ? "warning" : "success"} />
              </div>
            </>
          }
        />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SchoolWorkflowCard
            title="Candidate registration"
            detail={`${metrics.activeAccounts} active accounts, ${metrics.pendingProfiles} profiles pending`}
            icon={<UserPlus className="h-5 w-5" />}
            tone={metrics.pendingProfiles ? "warning" : "success"}
          />
          <SchoolWorkflowCard
            title="Cohort capacity"
            detail={`${metrics.capacityUsed}/${metrics.cohortCapacity || "unlimited"} seats used`}
            icon={<Users className="h-5 w-5" />}
            tone={metrics.capacityRate > 90 ? "warning" : "info"}
          />
          <SchoolWorkflowCard
            title="Supervisor coverage"
            detail={metrics.noSupervisor ? `${metrics.noSupervisor} candidates unassigned` : "All candidates have supervisors"}
            icon={<Mail className="h-5 w-5" />}
            tone={metrics.noSupervisor ? "warning" : "success"}
          />
          <SchoolWorkflowCard
            title="Submission control"
            detail={`${metrics.submissionRate}% submitted, ${metrics.ready} ready`}
            icon={<ClipboardCheck className="h-5 w-5" />}
            tone={metrics.submissionRate >= 70 ? "success" : "warning"}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          <Card id="candidate-registration" className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Register candidates"
              description="Add one candidate at a time or paste a class list. This is for school admin staff, not research writing."
              icon={<UserPlus size={18} />}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="candidate-name">Candidate name</Label>
                <Input
                  id="candidate-name"
                  value={candidateName}
                  onChange={(event) => setCandidateName(event.target.value)}
                  placeholder="Example: Achen Caroline"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="candidate-htin">HTIN / candidate number</Label>
                <Input
                  id="candidate-htin"
                  value={candidateHtin}
                  onChange={(event) => setCandidateHtin(event.target.value)}
                  placeholder="Example: UHPAB/24/DN/082"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="candidate-email">Email</Label>
                <Input
                  id="candidate-email"
                  type="email"
                  value={candidateEmail}
                  onChange={(event) => setCandidateEmail(event.target.value)}
                  placeholder="student@example.edu"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="candidate-phone">Phone</Label>
                <Input
                  id="candidate-phone"
                  value={candidatePhone}
                  onChange={(event) => setCandidatePhone(event.target.value)}
                  placeholder="+256 ..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Cohort</Label>
                <Select
                  value={candidateCohort}
                  onValueChange={(value) => {
                    const cohort = workspace.cohorts.find((item) => item.name === value);
                    setCandidateCohort(value);
                    if (cohort) {
                      setCandidateProgramme(cohort.programme);
                      setCandidateSupervisor(cohort.supervisorLead);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspace.cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.name}>{cohort.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Supervisor</Label>
                <Select value={candidateSupervisor} onValueChange={setCandidateSupervisor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not assigned">Not assigned</SelectItem>
                    {workspace.supervisors.map((supervisor) => (
                      <SelectItem key={supervisor.id} value={supervisor.name}>{supervisor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="candidate-topic">Research topic</Label>
                <Input
                  id="candidate-topic"
                  value={candidateTopic}
                  onChange={(event) => setCandidateTopic(event.target.value)}
                  placeholder="Optional at registration. Student can complete later."
                />
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button className="gap-2" onClick={handleRegisterCandidate}>
                <UserPlus size={16} />
                Add candidate
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleCopyInvite}>
                <Send size={16} />
                Copy invite for {candidateCohort || "cohort"}
              </Button>
            </div>

            <div className="mt-6 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Upload className="mt-0.5 h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Bulk import class list</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Paste one candidate per line: name, HTIN, email, phone, topic.
                  </p>
                </div>
              </div>
              <Textarea
                value={bulkCandidateText}
                onChange={(event) => setBulkCandidateText(event.target.value)}
                className="mt-3 min-h-28 bg-card"
                placeholder={"Achen Caroline, UHPAB/24/DN/082, caroline@example.edu, +256 700 111 222, Palliative care uptake\nKusiima Nicholas, UHPAB/24/DN/014, nicholas@example.edu"}
              />
              <div className="mt-3 flex justify-end">
                <Button variant="outline" className="gap-2 bg-card" onClick={handleBulkImport}>
                  <Upload size={16} />
                  Import candidates
                </Button>
              </div>
            </div>
          </Card>

          <Card id="create-cohort" className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Create cohort"
              description="Prepare a class/intake before registering candidates into it."
              icon={<Users size={18} />}
            />
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cohort-name">Cohort name</Label>
                <Input
                  id="cohort-name"
                  value={cohortName}
                  onChange={(event) => setCohortName(event.target.value)}
                  placeholder="Example: Diploma Nursing - Year 3"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cohort-programme">Programme</Label>
                <Input
                  id="cohort-programme"
                  value={cohortProgramme}
                  onChange={(event) => setCohortProgramme(event.target.value)}
                  placeholder="Diploma in Nursing"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="cohort-year">Academic year</Label>
                  <Input id="cohort-year" value={cohortAcademicYear} onChange={(event) => setCohortAcademicYear(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cohort-capacity">Seats</Label>
                  <Input id="cohort-capacity" type="number" min="1" value={cohortCapacity} onChange={(event) => setCohortCapacity(event.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cohort-intake">Intake</Label>
                <Input id="cohort-intake" value={cohortIntake} onChange={(event) => setCohortIntake(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Lead supervisor</Label>
                <Select value={cohortLead} onValueChange={setCohortLead}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspace.supervisors.map((supervisor) => (
                      <SelectItem key={supervisor.id} value={supervisor.name}>{supervisor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="gap-2" onClick={handleCreateCohort}>
                <Plus size={16} />
                Create cohort
              </Button>
            </div>
          </Card>
        </section>

        <section>
          <Card id="candidate-register" className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Candidate register"
              description="Manage candidates, account status, HTIN, cohort, supervisor, and research topic readiness."
              icon={<ClipboardCheck size={18} />}
              actions={
                <Button variant="outline" className="gap-2 bg-white" onClick={handleExportRegister}>
                  <Download size={15} />
                  Export register
                </Button>
              }
            />
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={candidateSearch}
                  onChange={(event) => setCandidateSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Search candidate, HTIN, supervisor, topic, cohort"
                />
              </div>
              <Select value={accountFilter} onValueChange={(value) => setAccountFilter(value as typeof accountFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active accounts</SelectItem>
                  <SelectItem value="invited">Invited accounts</SelectItem>
                  <SelectItem value="profile-pending">Profile pending</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="min-w-[1050px]">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_0.9fr_0.9fr_0.75fr] gap-3 border-b pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Candidate</span>
                  <span>Contact</span>
                  <span>Cohort / programme</span>
                  <span>Supervisor</span>
                  <span>Research status</span>
                  <span>Account</span>
                </div>
                <div className="divide-y">
                  {visibleRegister.map((student) => (
                    <CandidateRow key={student.id} student={student} />
                  ))}
                </div>
              </div>
            </div>

            {visibleRegister.length === 0 && (
              <WorkspaceEmptyState
                className="mt-5"
                icon={<Search size={20} />}
                title="No candidate matches this view"
                description="Change the search or status filter to return to the full register."
                actions={
                  <Button variant="outline" onClick={() => { setCandidateSearch(""); setAccountFilter("all"); }}>
                    Clear filters
                  </Button>
                }
              />
            )}
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
          <Card id="cohorts-invites" className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Cohorts and invite codes"
              description="Track class capacity and share the right registration code."
              icon={<Users size={18} />}
            />
            <div className="flex flex-wrap gap-2">
              {cohorts.map((cohort) => (
                <Button
                  key={cohort}
                  type="button"
                  variant={selectedCohort === cohort ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setSelectedCohort(cohort)}
                >
                  {cohort}
                </Button>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {visibleCohorts.map((cohort) => {
                const count = workspace.students.filter((student) => student.cohort === cohort.name).length;
                const capacityPercent = cohort.capacity ? Math.round((count / cohort.capacity) * 100) : 0;
                return (
                  <SavedWorkCard
                    key={cohort.id}
                    title={cohort.name}
                    meta={`${cohort.programme} - ${cohort.intake} - ${cohort.academicYear}`}
                    status={<Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">{cohort.status}</Badge>}
                    summary={
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span>{count}/{cohort.capacity} candidates</span>
                          <span>Lead: {cohort.supervisorLead}</span>
                        </div>
                        <Progress value={capacityPercent} className="mt-2 h-2" />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="bg-white">Code: {cohort.registrationCode}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-white"
                            onClick={() => {
                              void navigator.clipboard.writeText(cohort.registrationCode);
                              toast.success("Cohort invite code copied", { description: cohort.registrationCode });
                            }}
                          >
                            <Copy size={14} />
                            Copy
                          </Button>
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </div>
          </Card>

          <Card id="supervisor-workload" className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Supervisor workload"
              description="See who is available and where candidates are already assigned."
              icon={<Mail size={18} />}
            />
            <div className="grid gap-3 md:grid-cols-2">
              {workspace.supervisors.map((supervisor) => {
                const assignedCount = workspace.students.filter((student) => student.supervisor === supervisor.name).length || supervisor.assignedCount;
                const reviewCount = workspace.supervisorReviews.filter((review) => review.supervisorName === supervisor.name).length;
                const openComments = workspace.supervisorComments.filter(
                  (comment) => comment.supervisorName === supervisor.name && !comment.resolved
                ).length;
                return (
                  <div key={supervisor.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{supervisor.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{supervisor.department}</p>
                      </div>
                      <Badge variant="outline" className={supervisor.available ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}>
                        {supervisor.available ? "Available" : "Limited"}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm">
                      <p className="truncate text-muted-foreground">{supervisor.email}</p>
                      <p className="text-muted-foreground">{supervisor.phone}</p>
                      <p className="font-medium">{assignedCount} candidates assigned</p>
                      <p className="text-xs text-muted-foreground">{reviewCount} reviews saved - {openComments} open comments</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <p className="font-semibold">Add supervisor</p>
                </div>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="supervisor-name">Name</Label>
                    <Input id="supervisor-name" value={supervisorName} onChange={(event) => setSupervisorName(event.target.value)} placeholder="Example: Sr. Atim" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="supervisor-email">Email</Label>
                    <Input id="supervisor-email" type="email" value={supervisorEmail} onChange={(event) => setSupervisorEmail(event.target.value)} placeholder="supervisor@school.edu" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="supervisor-phone">Phone</Label>
                      <Input id="supervisor-phone" value={supervisorPhone} onChange={(event) => setSupervisorPhone(event.target.value)} placeholder="+256 ..." />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supervisor-department">Department</Label>
                      <Input id="supervisor-department" value={supervisorDepartment} onChange={(event) => setSupervisorDepartment(event.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Availability</Label>
                    <Select value={supervisorAvailability} onValueChange={(value) => setSupervisorAvailability(value as "available" | "limited")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="gap-2" onClick={handleCreateSupervisor}>
                    <UserPlus size={16} />
                    Add supervisor
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <p className="font-semibold">Assign candidate</p>
                </div>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label>Candidate</Label>
                    <Select value={reassignStudentId} onValueChange={setReassignStudentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose candidate" />
                      </SelectTrigger>
                      <SelectContent>
                        {workspace.students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>{student.name} - {student.htin}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Supervisor</Label>
                    <Select value={reassignSupervisor} onValueChange={setReassignSupervisor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not assigned">Not assigned</SelectItem>
                        {workspace.supervisors.map((supervisor) => (
                          <SelectItem key={supervisor.id} value={supervisor.name}>{supervisor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <WorkspaceStatusNote
                    tone="info"
                    title="Assignment rule"
                    description="Changing the supervisor updates the candidate register and the supervisor workload counts."
                  />
                  <Button variant="outline" className="gap-2 bg-white" onClick={handleAssignSupervisor}>
                    <Mail size={16} />
                    Update assignment
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card id="create-assignment" className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Create assignment"
              description="Assign document tasks to a cohort or to all candidates."
              icon={<CalendarClock size={18} />}
            />
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="assignment-title">Assignment title</Label>
                <Input
                  id="assignment-title"
                  value={assignmentTitle}
                  onChange={(event) => setAssignmentTitle(event.target.value)}
                  placeholder="Example: Upload corrected chapter three"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Document type</Label>
                  <Select value={assignmentType} onValueChange={(value) => setAssignmentType(value as "proposal" | "report")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proposal">Research proposal</SelectItem>
                      <SelectItem value="report">Final report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Section</Label>
                  <Select value={assignmentSection} onValueChange={setAssignmentSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full report">Full report</SelectItem>
                      <SelectItem value="Preliminary pages">Preliminary pages</SelectItem>
                      <SelectItem value="Chapter one">Chapter one</SelectItem>
                      <SelectItem value="Chapter two">Chapter two</SelectItem>
                      <SelectItem value="Chapter three">Chapter three</SelectItem>
                      <SelectItem value="Results and discussion">Results and discussion</SelectItem>
                      <SelectItem value="References and appendices">References and appendices</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignment-due">Due date</Label>
                <Input
                  id="assignment-due"
                  type="date"
                  value={assignmentDueDate}
                  onChange={(event) => setAssignmentDueDate(event.target.value)}
                />
              </div>
              <Button className="gap-2" onClick={handleCreateAssignment}>
                <ListChecks size={16} />
                Assign to {selectedCohort}
              </Button>
            </div>
          </Card>

          <Card id="assignments-submissions" className="study-card rounded-lg p-6">
            <WorkspaceSectionHeader
              title="Assignments and submissions"
              description="Open tasks, completion progress, and latest submitted files."
              icon={<FileCheck2 size={18} />}
              actions={
                <Button variant="outline" className="gap-2 bg-white" onClick={handleExportSummary}>
                  <Download size={15} />
                  Export summary
                </Button>
              }
            />
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="space-y-3">
                {workspace.assignments.map((assignment) => {
                  const progress = assignment.assignedCount
                    ? Math.round((assignment.submittedCount / assignment.assignedCount) * 100)
                    : 0;
                  const meta = assignmentStatusMeta[assignment.status];
                  return (
                    <SavedWorkCard
                      key={assignment.id}
                      title={assignment.title}
                      meta={`${assignment.cohort} - due ${formatDate(assignment.dueDate)}`}
                      status={<Badge variant="outline" className={meta.className}>{meta.label}</Badge>}
                      summary={
                        <div>
                          <div className="flex items-center justify-between text-xs">
                            <span>{assignment.section}</span>
                            <span>{assignment.submittedCount}/{assignment.assignedCount} submitted</span>
                          </div>
                          <Progress value={progress} className="mt-2 h-2" />
                        </div>
                      }
                    />
                  );
                })}
              </div>
              <div className="space-y-3">
                {visibleSubmissions.slice(0, 5).map((submission) => {
                  const meta = statusMeta[submission.status];
                  return (
                    <SavedWorkCard
                      key={submission.id}
                      title={submission.fileName}
                      meta={`${studentName(submission.studentId)} - ${formatActivity(submission.submittedAt)}`}
                      status={<Badge variant="outline" className={meta.className}>{meta.label}</Badge>}
                      summary={
                        <div className="grid gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Assignment</p>
                            <p className="line-clamp-1 text-sm text-foreground">{assignmentName(submission.assignmentId)}</p>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-foreground">
                              {submission.markingAwarded}/{submission.markingTotal} marks - {submission.originalityAttention}% attention
                            </p>
                            <Button size="sm" variant="outline" className="gap-2 bg-white" onClick={() => navigate("/projects?view=archive")}>
                              Open
                              <ArrowRight size={14} />
                            </Button>
                          </div>
                        </div>
                      }
                    />
                  );
                })}
                {visibleSubmissions.length === 0 && (
                  <WorkspaceEmptyState
                    icon={<FileCheck2 size={20} />}
                    title="No submissions yet"
                    description="Submitted student documents for this cohort will appear here."
                  />
                )}
              </div>
            </div>
          </Card>
        </section>

        <WorkspaceStatusNote
          tone="info"
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Production note"
          description="This dashboard is wired to local school workspace storage for now. A production school rollout should connect these same actions to Supabase tables, role permissions, email/SMS invites, and audit logs."
        />
      </WorkspacePage>
    </DashboardLayout>
  );
};

const SchoolWorkflowCard = ({
  title,
  detail,
  icon,
  tone,
}: {
  title: string;
  detail: string;
  icon: React.ReactNode;
  tone: "info" | "success" | "warning";
}) => {
  const toneClasses = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
  }[tone];

  return (
    <Card className={`rounded-lg border p-4 ${toneClasses}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white/75">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-80">{detail}</p>
        </div>
      </div>
    </Card>
  );
};

const CandidateRow = ({ student }: { student: SchoolStudentRecord }) => {
  const meta = statusMeta[student.status];
  const account = accountStatusMeta[student.accountStatus];
  return (
    <div className="grid grid-cols-[1.2fr_1fr_1fr_0.9fr_0.9fr_0.75fr] gap-3 py-4 text-sm">
      <div className="min-w-0">
        <p className="font-semibold">{student.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{student.htin}</p>
        <p className="mt-1 text-xs text-muted-foreground">Candidate: {student.candidateNumber}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate">{student.email || "No email yet"}</p>
        <p className="mt-1 text-xs text-muted-foreground">{student.phone || "No phone yet"}</p>
      </div>
      <div className="min-w-0">
        <p className="line-clamp-1">{student.cohort}</p>
        <p className="mt-1 text-xs text-muted-foreground">{student.programme}</p>
      </div>
      <div>{student.supervisor}</div>
      <div className="min-w-0">
        <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {student.topic || "Topic pending"}
        </p>
      </div>
      <div>
        <Badge variant="outline" className={account.className}>{account.label}</Badge>
        {student.registrationStatus === "profile-pending" && (
          <p className="mt-2 text-xs leading-5 text-amber-700">Profile pending</p>
        )}
      </div>
    </div>
  );
};

export default SchoolDashboard;
