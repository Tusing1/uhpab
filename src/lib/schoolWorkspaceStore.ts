import { reportMarkingGuide } from "@/data/markingGuide";
import { sanitizeFileName, triggerBrowserDownload } from "@/lib/download";
import type { User } from "@/types";

export type SchoolStudentStatus = "ready" | "on-track" | "needs-correction" | "not-submitted";
export type SchoolAssignmentStatus = "open" | "closing-soon" | "closed";
export type SchoolAccountStatus = "invited" | "active" | "blocked";
export type SchoolRegistrationStatus = "registered" | "profile-pending" | "needs-admin";
export type SchoolCohortStatus = "open" | "closed";
export type SchoolReviewDecision = "pending" | "needs-correction" | "reviewed" | "ready-for-admin" | "approved";
export type SchoolSupervisorCommentType = "general" | "chapter" | "marking-guide" | "citation" | "originality" | "formatting";
export type SchoolCriterionStatus = "awarded" | "partial" | "not-awarded";
export type SchoolCorrectionRequestStatus = "requested" | "student-responded" | "resolved";
export type SchoolCommentTag = "correction" | "strength" | "question" | "citation" | "formatting" | "originality";

export type SchoolCohort = {
  id: string;
  name: string;
  programme: string;
  academicYear: string;
  intake: string;
  capacity: number;
  registrationCode: string;
  supervisorLead: string;
  status: SchoolCohortStatus;
};

export type SchoolSupervisor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  assignedCount: number;
  available: boolean;
};

export type SchoolStudentRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  htin: string;
  candidateNumber: string;
  cohort: string;
  programme: string;
  topic: string;
  supervisor: string;
  status: SchoolStudentStatus;
  accountStatus: SchoolAccountStatus;
  registrationStatus: SchoolRegistrationStatus;
  currentStage: string;
  markingScore: number;
  originalityAttention: number;
  registeredAt: string;
  lastActivity: string;
};

export type SchoolAssignment = {
  id: string;
  title: string;
  documentType: "proposal" | "report";
  section: string;
  cohort: string;
  dueDate: string;
  status: SchoolAssignmentStatus;
  assignedCount: number;
  submittedCount: number;
};

export type SchoolSubmission = {
  id: string;
  studentId: string;
  assignmentId: string;
  fileName: string;
  submittedAt: string;
  documentType?: "proposal" | "report";
  fileType?: "pdf" | "docx" | "txt" | "manual";
  documentText?: string;
  pageCount?: number | null;
  wordCount?: number;
  version?: number;
  uploadedBy?: string;
  markingAwarded: number;
  markingTotal: number;
  originalityAttention: number;
  status: SchoolStudentStatus;
};

export type SchoolSupervisorCriterionMark = {
  id: string;
  section: string;
  criterion: string;
  status: SchoolCriterionStatus;
  awarded: number;
  total: number;
  evidenceSnippet: string;
  pageNumber?: number | null;
  note: string;
  updatedAt: string;
};

export type SchoolSupervisorReview = {
  id: string;
  studentId: string;
  submissionId?: string;
  supervisorName: string;
  supervisorEmail?: string;
  section: string;
  awarded: number;
  total: number;
  decision: SchoolReviewDecision;
  strengths: string;
  requiredCorrections: string;
  criteria: SchoolSupervisorCriterionMark[];
  createdAt: string;
  updatedAt: string;
};

export type SchoolSupervisorComment = {
  id: string;
  studentId: string;
  submissionId?: string;
  supervisorName: string;
  supervisorEmail?: string;
  type: SchoolSupervisorCommentType;
  tag?: SchoolCommentTag;
  section: string;
  text: string;
  paragraphIndex?: number | null;
  anchorText?: string;
  studentReply?: string;
  studentReplyAt?: string;
  resolved: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type SchoolCorrectionRequest = {
  id: string;
  studentId: string;
  submissionId?: string;
  supervisorName: string;
  supervisorEmail?: string;
  title: string;
  instructions: string;
  status: SchoolCorrectionRequestStatus;
  studentResponse?: string;
  createdAt: string;
  updatedAt: string;
};

export type SchoolWorkspaceState = {
  schoolId: string;
  schoolName: string;
  cohorts: SchoolCohort[];
  supervisors: SchoolSupervisor[];
  students: SchoolStudentRecord[];
  assignments: SchoolAssignment[];
  submissions: SchoolSubmission[];
  supervisorReviews: SchoolSupervisorReview[];
  supervisorComments: SchoolSupervisorComment[];
  correctionRequests: SchoolCorrectionRequest[];
  updatedAt: string;
};

export type CandidateRegistrationInput = {
  name: string;
  email?: string;
  phone?: string;
  htin: string;
  candidateNumber?: string;
  cohort: string;
  programme: string;
  topic?: string;
  supervisor?: string;
};

export type CohortInput = {
  name: string;
  programme: string;
  academicYear: string;
  intake: string;
  capacity: number;
  supervisorLead: string;
};

export type SupervisorReviewInput = {
  studentId: string;
  submissionId?: string;
  supervisorName: string;
  supervisorEmail?: string;
  section: string;
  awarded: number;
  total: number;
  decision: SchoolReviewDecision;
  strengths: string;
  requiredCorrections: string;
  criteria?: SchoolSupervisorCriterionMark[];
};

export type SupervisorCommentInput = {
  studentId: string;
  submissionId?: string;
  supervisorName: string;
  supervisorEmail?: string;
  type: SchoolSupervisorCommentType;
  tag?: SchoolCommentTag;
  section: string;
  text: string;
  paragraphIndex?: number | null;
  anchorText?: string;
};

export type CorrectionRequestInput = {
  studentId: string;
  submissionId?: string;
  supervisorName: string;
  supervisorEmail?: string;
  title: string;
  instructions: string;
};

export type StudentSubmissionInput = {
  studentId: string;
  assignmentId: string;
  fileName: string;
  documentType?: "proposal" | "report";
  fileType?: "pdf" | "docx" | "txt" | "manual";
  documentText?: string;
  pageCount?: number | null;
  wordCount?: number;
  uploadedBy?: string;
};

export type SupervisorProfileInput = {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  available?: boolean;
};

export type SchoolReviewTimelineEvent = {
  id: string;
  type: "submission" | "review" | "comment" | "correction";
  title: string;
  detail: string;
  date: string;
  status?: string;
};

const storagePrefix = "uhpab-school-workspace:";

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const workspaceKey = (schoolId: string) => `${storagePrefix}${schoolId || "demo-school"}`;

const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const slugCode = (value: string) =>
  value
    .replace(/[^A-Za-z0-9]+/g, "")
    .slice(0, 8)
    .toUpperCase() || "CLASS";

export const createSchoolInviteCode = (schoolId: string, cohortName: string) =>
  `${slugCode(schoolId)}-${slugCode(cohortName)}`;

const normalizeLookup = (value?: string) => (value || "").trim().toLowerCase();

const clampMark = (value: number, total: number) =>
  Math.max(0, Math.min(Number.isFinite(value) ? value : 0, Math.max(0, total)));

const statusFromMarks = (awarded: number, total: number): SchoolCriterionStatus => {
  if (awarded >= total) return "awarded";
  if (awarded > 0) return "partial";
  return "not-awarded";
};

export const createDefaultSupervisorCriterionMarks = (updatedAt = new Date().toISOString()) =>
  reportMarkingGuide.flatMap((section) =>
    section.criteria.map((criterion) => ({
      id: `${section.id}:${criterion.id}`,
      section: section.title,
      criterion: criterion.label,
      status: "not-awarded" as SchoolCriterionStatus,
      awarded: 0,
      total: criterion.marks,
      evidenceSnippet: "",
      pageNumber: null,
      note: criterion.guidance,
      updatedAt,
    }))
  );

const normalizeSupervisorCriteria = (
  criteria?: Partial<SchoolSupervisorCriterionMark>[] | null,
  updatedAt = new Date().toISOString()
): SchoolSupervisorCriterionMark[] => {
  const defaults = createDefaultSupervisorCriterionMarks(updatedAt);
  const byId = new Map((criteria || []).map((criterion) => [criterion.id, criterion]));
  const byLabel = new Map((criteria || []).map((criterion) => [normalizeLookup(criterion.criterion), criterion]));

  return defaults.map((criterion) => {
    const saved = byId.get(criterion.id) || byLabel.get(normalizeLookup(criterion.criterion));
    const total = Math.max(0.5, Number(saved?.total ?? criterion.total) || criterion.total);
    const awarded = clampMark(Number(saved?.awarded ?? criterion.awarded), total);
    const status = saved?.status || statusFromMarks(awarded, total);

    return {
      ...criterion,
      ...saved,
      id: criterion.id,
      section: saved?.section || criterion.section,
      criterion: saved?.criterion || criterion.criterion,
      status,
      awarded,
      total,
      evidenceSnippet: saved?.evidenceSnippet || "",
      pageNumber: saved?.pageNumber ?? null,
      note: saved?.note || criterion.note,
      updatedAt: saved?.updatedAt || updatedAt,
    };
  });
};

const createSeedCriterionMarks = (score: number, updatedAt: string) => {
  const defaults = createDefaultSupervisorCriterionMarks(updatedAt);
  const total = defaults.reduce((sum, criterion) => sum + criterion.total, 0);
  let remaining = Math.round((Math.max(0, Math.min(100, score)) / 100) * total);

  return defaults.map((criterion) => {
    const awarded = clampMark(Math.min(criterion.total, remaining), criterion.total);
    remaining -= awarded;
    return {
      ...criterion,
      awarded,
      status: statusFromMarks(awarded, criterion.total),
      evidenceSnippet:
        awarded > 0
          ? `Supervisor evidence recorded for ${criterion.section.toLowerCase()}.`
          : "",
      note:
        awarded > 0
          ? "Verified during seed supervisor review."
          : criterion.note,
    };
  });
};

const anitahSeedDocument = `TITLE PAGE
Knowledge and attitude towards cervical cancer screening among women attending ANC
Candidate: Anitah N.  HTIN: UHPAB/24/DN/001
Supervisor: Sr. Akello

ABSTRACT
Background: Cervical cancer screening remains a public health concern among women attending antenatal care. Methodology: A descriptive cross-sectional study was conducted. Results: Most respondents had heard about screening, although service uptake remained low. Conclusion: More health education is needed.

CHAPTER ONE: INTRODUCTION
This chapter presents the background of the study, problem statement, purpose of the study, objectives, research questions, justification and significance of the study.

CHAPTER TWO: LITERATURE REVIEW
The literature review presents studies related to knowledge, attitude and cervical cancer screening. Reviewed studies show that awareness, partner support and health worker counselling influence screening decisions.

CHAPTER THREE: METHODOLOGY
The study used a descriptive cross-sectional design. The study population consisted of women attending ANC. Simple random sampling was used and informed consent was obtained.

CHAPTER FOUR: RESULTS
The findings are presented according to the study objectives. Most respondents knew that cervical cancer can be prevented by screening, but fewer had ever been screened.

CHAPTER FIVE: DISCUSSION, CONCLUSION AND RECOMMENDATIONS
The findings show that knowledge is present but uptake remains low. The discussion should compare each key finding with studies reviewed earlier and explain implications for nursing practice.

REFERENCES
Ministry of Health. Cervical cancer prevention guidelines.`;

const nicholasSeedDocument = `TITLE PAGE
Factors influencing uptake of palliative care services among terminally ill patients
Candidate: Nicholas K.  HTIN: UHPAB/24/DN/014
Supervisor: Mr. Bosco

ABSTRACT
Background: Palliative care improves quality of life for terminally ill patients. Methodology: A descriptive study design was used. Results: Uptake was affected by knowledge, availability of services and family support. Conclusion: Service awareness should be strengthened.

CHAPTER ONE: INTRODUCTION
This chapter presents the background of the study, problem statement, purpose of the study, objectives, research questions, justification and significance of the study.

CHAPTER TWO: LITERATURE REVIEW
Studies reviewed show that palliative care uptake is influenced by referral systems, health worker attitudes and patient knowledge.

CHAPTER THREE: METHODOLOGY
The report states the study design, setting, population, sample size, sampling procedure, data collection method, ethical considerations and limitations.

CHAPTER FOUR: RESULTS AND FINDINGS
Findings are organized by objectives and supported with tables.

CHAPTER FIVE: DISCUSSION, CONCLUSION AND RECOMMENDATIONS
The discussion compares the study findings with earlier reviewed studies and makes recommendations for nursing practice.

REFERENCES
World Health Organization. Palliative care fact sheet.`;

const createSeedSupervisors = (): SchoolSupervisor[] => [
  {
    id: "sup-akello",
    name: "Sr. Akello",
    email: "akello@school.example",
    phone: "+256 700 000 101",
    department: "Nursing",
    assignedCount: 1,
    available: true,
  },
  {
    id: "sup-bosco",
    name: "Mr. Bosco",
    email: "bosco@school.example",
    phone: "+256 700 000 102",
    department: "Research coordination",
    assignedCount: 1,
    available: true,
  },
  {
    id: "sup-nabukeera",
    name: "Ms. Nabukeera",
    email: "nabukeera@school.example",
    phone: "+256 700 000 103",
    department: "Midwifery",
    assignedCount: 1,
    available: true,
  },
  {
    id: "sup-kato",
    name: "Dr. Kato",
    email: "kato@school.example",
    phone: "+256 700 000 104",
    department: "Laboratory sciences",
    assignedCount: 1,
    available: false,
  },
];

const createSeedCohorts = (schoolId: string): SchoolCohort[] => [
  {
    id: `${schoolId}-cohort-dn3`,
    name: "Diploma Nursing - Year 3",
    programme: "Diploma in Nursing",
    academicYear: "2026",
    intake: "January intake",
    capacity: 80,
    registrationCode: createSchoolInviteCode(schoolId, "Diploma Nursing - Year 3"),
    supervisorLead: "Sr. Akello",
    status: "open",
  },
  {
    id: `${schoolId}-cohort-dm3`,
    name: "Diploma Midwifery - Year 3",
    programme: "Diploma in Midwifery",
    academicYear: "2026",
    intake: "January intake",
    capacity: 60,
    registrationCode: createSchoolInviteCode(schoolId, "Diploma Midwifery - Year 3"),
    supervisorLead: "Ms. Nabukeera",
    status: "open",
  },
  {
    id: `${schoolId}-cohort-dn2`,
    name: "Diploma Nursing - Year 2",
    programme: "Diploma in Nursing",
    academicYear: "2026",
    intake: "August intake",
    capacity: 75,
    registrationCode: createSchoolInviteCode(schoolId, "Diploma Nursing - Year 2"),
    supervisorLead: "Sr. Namugga",
    status: "open",
  },
  {
    id: `${schoolId}-cohort-mlt3`,
    name: "Medical Laboratory - Year 3",
    programme: "Medical Laboratory",
    academicYear: "2026",
    intake: "January intake",
    capacity: 45,
    registrationCode: createSchoolInviteCode(schoolId, "Medical Laboratory - Year 3"),
    supervisorLead: "Dr. Kato",
    status: "open",
  },
];

const createSeedWorkspace = (schoolId: string, schoolName: string): SchoolWorkspaceState => {
  const cohorts = createSeedCohorts(schoolId);
  const supervisors = createSeedSupervisors();
  const students: SchoolStudentRecord[] = [
    {
      id: `${schoolId}-stu-001`,
      name: "Anitah N.",
      email: "anitah@example.edu",
      phone: "+256 701 000 001",
      htin: "UHPAB/24/DN/001",
      candidateNumber: "DN-001",
      cohort: "Diploma Nursing - Year 3",
      programme: "Diploma in Nursing",
      topic: "Knowledge and attitude towards cervical cancer screening among women attending ANC",
      supervisor: "Sr. Akello",
      status: "needs-correction",
      accountStatus: "active",
      registrationStatus: "registered",
      currentStage: "Chapter four results",
      markingScore: 62,
      originalityAttention: 18,
      registeredAt: daysAgo(42),
      lastActivity: daysAgo(1),
    },
    {
      id: `${schoolId}-stu-002`,
      name: "Nicholas K.",
      email: "nicholas@example.edu",
      phone: "+256 701 000 014",
      htin: "UHPAB/24/DN/014",
      candidateNumber: "DN-014",
      cohort: "Diploma Nursing - Year 3",
      programme: "Diploma in Nursing",
      topic: "Factors influencing uptake of palliative care services among terminally ill patients",
      supervisor: "Mr. Bosco",
      status: "on-track",
      accountStatus: "active",
      registrationStatus: "registered",
      currentStage: "Full report review",
      markingScore: 78,
      originalityAttention: 6,
      registeredAt: daysAgo(39),
      lastActivity: daysAgo(0),
    },
    {
      id: `${schoolId}-stu-003`,
      name: "Caroline A.",
      email: "caroline@example.edu",
      phone: "+256 701 000 023",
      htin: "UHPAB/24/DM/023",
      candidateNumber: "DM-023",
      cohort: "Diploma Midwifery - Year 3",
      programme: "Diploma in Midwifery",
      topic: "Utilization of focused antenatal care among pregnant mothers in a rural health centre",
      supervisor: "Ms. Nabukeera",
      status: "ready",
      accountStatus: "active",
      registrationStatus: "registered",
      currentStage: "Final report",
      markingScore: 88,
      originalityAttention: 3,
      registeredAt: daysAgo(36),
      lastActivity: daysAgo(2),
    },
    {
      id: `${schoolId}-stu-004`,
      name: "Moses T.",
      email: "moses@example.edu",
      phone: "+256 701 000 041",
      htin: "UHPAB/24/DN/041",
      candidateNumber: "DN-041",
      cohort: "Diploma Nursing - Year 2",
      programme: "Diploma in Nursing",
      topic: "Hand hygiene practice among student nurses during clinical placement",
      supervisor: "Sr. Namugga",
      status: "not-submitted",
      accountStatus: "invited",
      registrationStatus: "profile-pending",
      currentStage: "Proposal title",
      markingScore: 0,
      originalityAttention: 0,
      registeredAt: daysAgo(14),
      lastActivity: daysAgo(8),
    },
    {
      id: `${schoolId}-stu-005`,
      name: "Brenda L.",
      email: "brenda@example.edu",
      phone: "+256 701 000 052",
      htin: "UHPAB/24/DN/052",
      candidateNumber: "DN-052",
      cohort: "Diploma Nursing - Year 3",
      programme: "Diploma in Nursing",
      topic: "Adherence to malaria prevention guidelines among pregnant mothers",
      supervisor: "Mr. Ocen",
      status: "needs-correction",
      accountStatus: "active",
      registrationStatus: "registered",
      currentStage: "Chapter three methodology",
      markingScore: 54,
      originalityAttention: 11,
      registeredAt: daysAgo(31),
      lastActivity: daysAgo(3),
    },
    {
      id: `${schoolId}-stu-006`,
      name: "Joseph W.",
      email: "joseph@example.edu",
      phone: "+256 701 000 017",
      htin: "UHPAB/24/MLT/017",
      candidateNumber: "MLT-017",
      cohort: "Medical Laboratory - Year 3",
      programme: "Medical Laboratory",
      topic: "Turnaround time for laboratory results in outpatient departments",
      supervisor: "Dr. Kato",
      status: "on-track",
      accountStatus: "active",
      registrationStatus: "registered",
      currentStage: "Chapter two literature review",
      markingScore: 71,
      originalityAttention: 8,
      registeredAt: daysAgo(28),
      lastActivity: daysAgo(4),
    },
  ];

  const assignments: SchoolAssignment[] = [
    {
      id: `${schoolId}-asg-001`,
      title: "Submit full report for marking-guide review",
      documentType: "report",
      section: "Full report",
      cohort: "Diploma Nursing - Year 3",
      dueDate: daysFromNow(7),
      status: "open",
      assignedCount: 3,
      submittedCount: 2,
    },
    {
      id: `${schoolId}-asg-002`,
      title: "Correct methodology and consent appendices",
      documentType: "proposal",
      section: "Methodology and appendices",
      cohort: "All cohorts",
      dueDate: daysFromNow(3),
      status: "closing-soon",
      assignedCount: students.length,
      submittedCount: 4,
    },
  ];

  const submissions: SchoolSubmission[] = [
    {
      id: `${schoolId}-sub-001`,
      studentId: students[0].id,
      assignmentId: assignments[0].id,
      fileName: "anitah-report-review.pdf",
      submittedAt: daysAgo(1),
      documentType: "report",
      fileType: "pdf",
      documentText: anitahSeedDocument,
      pageCount: 32,
      wordCount: anitahSeedDocument.split(/\s+/).length,
      version: 1,
      uploadedBy: students[0].name,
      markingAwarded: 62,
      markingTotal: 100,
      originalityAttention: 18,
      status: "needs-correction",
    },
    {
      id: `${schoolId}-sub-002`,
      studentId: students[1].id,
      assignmentId: assignments[0].id,
      fileName: "nicholas-final-report.pdf",
      submittedAt: daysAgo(0),
      documentType: "report",
      fileType: "pdf",
      documentText: nicholasSeedDocument,
      pageCount: 41,
      wordCount: nicholasSeedDocument.split(/\s+/).length,
      version: 1,
      uploadedBy: students[1].name,
      markingAwarded: 78,
      markingTotal: 100,
      originalityAttention: 6,
      status: "on-track",
    },
    {
      id: `${schoolId}-sub-003`,
      studentId: students[2].id,
      assignmentId: assignments[1].id,
      fileName: "caroline-clean-report.pdf",
      submittedAt: daysAgo(2),
      documentType: "report",
      fileType: "pdf",
      documentText: "CHAPTER ONE: INTRODUCTION\nThe report gives a clear background, problem statement, purpose, objectives and research questions.\n\nCHAPTER THREE: METHODOLOGY\nThe methodology states the study design, setting, population, sampling and ethical considerations.\n\nCHAPTER FIVE: CONCLUSION AND RECOMMENDATIONS\nThe conclusion follows the findings and the recommendations are practical for midwifery service improvement.",
      pageCount: 36,
      wordCount: 52,
      version: 1,
      uploadedBy: students[2].name,
      markingAwarded: 88,
      markingTotal: 100,
      originalityAttention: 3,
      status: "ready",
    },
    {
      id: `${schoolId}-sub-004`,
      studentId: students[4].id,
      assignmentId: assignments[1].id,
      fileName: "brenda-methodology.docx",
      submittedAt: daysAgo(3),
      documentType: "proposal",
      fileType: "docx",
      documentText: "CHAPTER THREE: METHODOLOGY\nThe study design is described, but the sampling procedure, inclusion criteria, exclusion criteria and ethical considerations need more detail before the proposal can be approved.",
      pageCount: null,
      wordCount: 24,
      version: 1,
      uploadedBy: students[4].name,
      markingAwarded: 54,
      markingTotal: 100,
      originalityAttention: 11,
      status: "needs-correction",
    },
  ];

  const supervisorReviews: SchoolSupervisorReview[] = [
    {
      id: `${schoolId}-rev-001`,
      studentId: students[0].id,
      submissionId: submissions[0].id,
      supervisorName: "Sr. Akello",
      supervisorEmail: "akello@school.example",
      section: "Chapter four results",
      awarded: 62,
      total: 100,
      decision: "needs-correction",
      strengths: "The candidate has presented the main findings and kept the topic aligned to the study objectives.",
      requiredCorrections: "Clarify the discussion of findings and improve comparison with earlier reviewed studies.",
      criteria: createSeedCriterionMarks(62, daysAgo(1)),
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: `${schoolId}-rev-002`,
      studentId: students[2].id,
      submissionId: submissions[2].id,
      supervisorName: "Ms. Nabukeera",
      supervisorEmail: "nabukeera@school.example",
      section: "Final report",
      awarded: 88,
      total: 100,
      decision: "ready-for-admin",
      strengths: "The report is clearly organized, with a strong methodology and low originality attention.",
      requiredCorrections: "Confirm final reference formatting before admin approval.",
      criteria: createSeedCriterionMarks(88, daysAgo(2)),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
  ];

  const supervisorComments: SchoolSupervisorComment[] = [
    {
      id: `${schoolId}-com-001`,
      studentId: students[0].id,
      submissionId: submissions[0].id,
      supervisorName: "Sr. Akello",
      supervisorEmail: "akello@school.example",
      type: "marking-guide",
      tag: "correction",
      section: "Discussion",
      text: "Compare each key finding with at least one study reviewed in chapter two, then state whether your result agrees or differs.",
      paragraphIndex: 8,
      anchorText: "The findings show that knowledge is present but uptake remains low.",
      resolved: false,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: `${schoolId}-com-002`,
      studentId: students[0].id,
      submissionId: submissions[0].id,
      supervisorName: "Sr. Akello",
      supervisorEmail: "akello@school.example",
      type: "formatting",
      tag: "formatting",
      section: "References",
      text: "Standardize the reference list before the final submission is sent to the school office.",
      paragraphIndex: 10,
      anchorText: "Ministry of Health. Cervical cancer prevention guidelines.",
      resolved: false,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ];

  const correctionRequests: SchoolCorrectionRequest[] = [
    {
      id: `${schoolId}-corr-001`,
      studentId: students[0].id,
      submissionId: submissions[0].id,
      supervisorName: "Sr. Akello",
      supervisorEmail: "akello@school.example",
      title: "Strengthen chapter five discussion",
      instructions: "Compare each key finding with a study from chapter two and add the nursing practice implication after the comparison.",
      status: "requested",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ];

  return {
    schoolId,
    schoolName,
    cohorts,
    supervisors,
    students,
    assignments,
    submissions,
    supervisorReviews,
    supervisorComments,
    correctionRequests,
    updatedAt: new Date().toISOString(),
  };
};

const cohortFromStudent = (schoolId: string, cohort: string, index: number): SchoolCohort => ({
  id: `${schoolId}-cohort-${index}`,
  name: cohort,
  programme: cohort.split(" - ")[0] || "Research programme",
  academicYear: String(new Date().getFullYear()),
  intake: "Current intake",
  capacity: 60,
  registrationCode: createSchoolInviteCode(schoolId, cohort),
  supervisorLead: "Research coordinator",
  status: "open",
});

const normalizeStudent = (
  student: Partial<SchoolStudentRecord>,
  schoolId: string,
  index: number
): SchoolStudentRecord => {
  const cohort = student.cohort || "Unassigned cohort";
  const programme = student.programme || cohort.split(" - ")[0] || "Research programme";
  const htin = student.htin || student.candidateNumber || `${schoolId.toUpperCase()}-${index + 1}`;

  return {
    id: student.id || `${schoolId}-stu-${index + 1}`,
    name: student.name || "Unnamed candidate",
    email: student.email || "",
    phone: student.phone || "",
    htin,
    candidateNumber: student.candidateNumber || htin,
    cohort,
    programme,
    topic: student.topic || "",
    supervisor: student.supervisor || "Not assigned",
    status: student.status || "not-submitted",
    accountStatus: student.accountStatus || "invited",
    registrationStatus: student.registrationStatus || "profile-pending",
    currentStage: student.currentStage || "Registration",
    markingScore: Number(student.markingScore) || 0,
    originalityAttention: Number(student.originalityAttention) || 0,
    registeredAt: student.registeredAt || new Date().toISOString(),
    lastActivity: student.lastActivity || new Date().toISOString(),
  };
};

const normalizeWorkspace = (
  value: Partial<SchoolWorkspaceState>,
  schoolId: string,
  schoolName: string
): SchoolWorkspaceState => {
  const normalizedStudents = Array.isArray(value.students)
    ? value.students.map((student, index) => normalizeStudent(student, schoolId, index))
    : [];
  const fallbackCohorts = Array.from(new Set(normalizedStudents.map((student) => student.cohort))).map((cohort, index) =>
    cohortFromStudent(schoolId, cohort, index)
  );
  const normalizedSubmissions = Array.isArray(value.submissions)
    ? value.submissions.map((submission) => {
        if (submission.documentText) return submission;
        const fileName = normalizeLookup(submission.fileName);
        const student = normalizedStudents.find((item) => item.id === submission.studentId);
        const documentText = fileName.includes("anitah")
          ? anitahSeedDocument
          : fileName.includes("nicholas")
            ? nicholasSeedDocument
            : "";

        return {
          ...submission,
          documentText,
          documentType: submission.documentType || "report",
          fileType: submission.fileType || (fileName.endsWith(".docx") ? "docx" : fileName.endsWith(".txt") ? "txt" : "pdf"),
          pageCount: submission.pageCount ?? null,
          wordCount: submission.wordCount || documentText.split(/\s+/).filter(Boolean).length,
          version: submission.version || 1,
          uploadedBy: submission.uploadedBy || student?.name,
        };
      })
    : [];
  const normalizedReviews = Array.isArray(value.supervisorReviews)
    ? value.supervisorReviews.map((review) => ({
        ...review,
        criteria:
          !review.criteria?.length ||
          (Number(review.awarded) > 0 && review.criteria.every((criterion) => Number(criterion.awarded || 0) === 0))
            ? createSeedCriterionMarks(
                Math.round((Number(review.awarded || 0) / Math.max(1, Number(review.total || 100))) * 100),
                review.updatedAt || new Date().toISOString()
              )
            : normalizeSupervisorCriteria(review.criteria, review.updatedAt || new Date().toISOString()),
        createdAt: review.createdAt || new Date().toISOString(),
        updatedAt: review.updatedAt || new Date().toISOString(),
      }))
    : [];
  const migratedCorrectionRequests = Array.isArray(value.correctionRequests) ? value.correctionRequests : [];
  const anitah = normalizedStudents.find((student) => normalizeLookup(student.name).includes("anitah"));
  const anitahSubmission = anitah
    ? normalizedSubmissions.find((submission) => submission.studentId === anitah.id)
    : undefined;
  const migratedSupervisorComments = Array.isArray(value.supervisorComments)
    ? value.supervisorComments.map((comment) => ({
        ...comment,
        tag:
          comment.tag ||
          (comment.type === "formatting"
            ? "formatting"
            : comment.type === "citation"
              ? "citation"
              : comment.type === "originality"
                ? "originality"
                : comment.type === "marking-guide"
                  ? "correction"
                  : "question"),
        paragraphIndex: comment.paragraphIndex ?? null,
        anchorText: comment.anchorText || "",
        updatedAt: comment.updatedAt || comment.createdAt || new Date().toISOString(),
      }))
    : [];
  const supervisorComments =
    !anitah || migratedSupervisorComments.some((comment) => comment.studentId === anitah.id)
      ? migratedSupervisorComments
      : [
          {
            id: `${schoolId}-com-001`,
            studentId: anitah.id,
            submissionId: anitahSubmission?.id,
            supervisorName: "Sr. Akello",
            supervisorEmail: "akello@school.example",
            type: "marking-guide" as SchoolSupervisorCommentType,
            tag: "correction" as SchoolCommentTag,
            section: "Discussion",
            text: "Compare each key finding with at least one study reviewed in chapter two, then state whether your result agrees or differs.",
            paragraphIndex: 8,
            anchorText: "The findings show that knowledge is present but uptake remains low.",
            resolved: false,
            createdAt: daysAgo(1),
            updatedAt: daysAgo(1),
          },
          {
            id: `${schoolId}-com-002`,
            studentId: anitah.id,
            submissionId: anitahSubmission?.id,
            supervisorName: "Sr. Akello",
            supervisorEmail: "akello@school.example",
            type: "formatting" as SchoolSupervisorCommentType,
            tag: "formatting" as SchoolCommentTag,
            section: "References",
            text: "Standardize the reference list before the final submission is sent to the school office.",
            paragraphIndex: 10,
            anchorText: "Ministry of Health. Cervical cancer prevention guidelines.",
            resolved: false,
            createdAt: daysAgo(1),
            updatedAt: daysAgo(1),
          },
          ...migratedSupervisorComments,
        ];
  const correctionRequests =
    migratedCorrectionRequests.length || !anitah
      ? migratedCorrectionRequests
      : [
          {
            id: `${schoolId}-corr-001`,
            studentId: anitah.id,
            submissionId: anitahSubmission?.id,
            supervisorName: "Sr. Akello",
            supervisorEmail: "akello@school.example",
            title: "Strengthen chapter five discussion",
            instructions: "Compare each key finding with a study from chapter two and add the nursing practice implication after the comparison.",
            status: "requested" as SchoolCorrectionRequestStatus,
            createdAt: daysAgo(1),
            updatedAt: daysAgo(1),
          },
        ];

  return {
    schoolId: value.schoolId || schoolId,
    schoolName: value.schoolName || schoolName,
    cohorts: Array.isArray(value.cohorts) && value.cohorts.length > 0 ? value.cohorts : fallbackCohorts,
    supervisors: Array.isArray(value.supervisors) && value.supervisors.length > 0 ? value.supervisors : createSeedSupervisors(),
    students: normalizedStudents,
    assignments: Array.isArray(value.assignments) ? value.assignments : [],
    submissions: normalizedSubmissions,
    supervisorReviews: normalizedReviews,
    supervisorComments,
    correctionRequests,
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
};

const isWorkspaceState = (value: unknown): value is Partial<SchoolWorkspaceState> => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SchoolWorkspaceState>;
  return Array.isArray(candidate.students) && Array.isArray(candidate.assignments) && Array.isArray(candidate.submissions);
};

export const loadSchoolWorkspace = (schoolId: string, schoolName: string): SchoolWorkspaceState => {
  if (typeof window === "undefined") return createSeedWorkspace(schoolId, schoolName);

  const stored = window.localStorage.getItem(workspaceKey(schoolId));
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (isWorkspaceState(parsed)) {
        const normalized = normalizeWorkspace(parsed, schoolId, schoolName);
        saveSchoolWorkspace(normalized);
        return normalized;
      }
    } catch (error) {
      console.error("Failed to load school workspace:", error);
    }
  }

  const seeded = createSeedWorkspace(schoolId, schoolName);
  saveSchoolWorkspace(seeded);
  return seeded;
};

export const saveSchoolWorkspace = (workspace: SchoolWorkspaceState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    workspaceKey(workspace.schoolId),
    JSON.stringify({ ...workspace, updatedAt: new Date().toISOString() })
  );
};

export const registerCandidate = (
  workspace: SchoolWorkspaceState,
  candidate: CandidateRegistrationInput
): SchoolWorkspaceState => {
  const candidateId = createId(`${workspace.schoolId}-stu`);
  const supervisor = candidate.supervisor || "Not assigned";
  const nextStudent: SchoolStudentRecord = {
    id: candidateId,
    name: candidate.name.trim(),
    email: candidate.email?.trim() || "",
    phone: candidate.phone?.trim() || "",
    htin: candidate.htin.trim(),
    candidateNumber: candidate.candidateNumber?.trim() || candidate.htin.trim(),
    cohort: candidate.cohort,
    programme: candidate.programme,
    topic: candidate.topic?.trim() || "",
    supervisor,
    status: "not-submitted",
    accountStatus: candidate.email ? "invited" : "invited",
    registrationStatus: candidate.topic ? "registered" : "profile-pending",
    currentStage: candidate.topic ? "Topic registered" : "Profile setup",
    markingScore: 0,
    originalityAttention: 0,
    registeredAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };

  return {
    ...workspace,
    students: [nextStudent, ...workspace.students],
    supervisors: workspace.supervisors.map((item) =>
      item.name === supervisor ? { ...item, assignedCount: item.assignedCount + 1 } : item
    ),
    updatedAt: new Date().toISOString(),
  };
};

export const createCohort = (workspace: SchoolWorkspaceState, cohort: CohortInput): SchoolWorkspaceState => {
  const nextCohort: SchoolCohort = {
    id: createId(`${workspace.schoolId}-cohort`),
    name: cohort.name.trim(),
    programme: cohort.programme.trim(),
    academicYear: cohort.academicYear.trim(),
    intake: cohort.intake.trim(),
    capacity: Math.max(1, Number(cohort.capacity) || 1),
    supervisorLead: cohort.supervisorLead,
    registrationCode: createSchoolInviteCode(workspace.schoolId, cohort.name),
    status: "open",
  };

  return {
    ...workspace,
    cohorts: [nextCohort, ...workspace.cohorts],
    updatedAt: new Date().toISOString(),
  };
};

export const createAssignment = (
  workspace: SchoolWorkspaceState,
  assignment: Omit<SchoolAssignment, "id" | "assignedCount" | "submittedCount" | "status">
): SchoolWorkspaceState => {
  const assignedCount =
    assignment.cohort === "All cohorts"
      ? workspace.students.length
      : workspace.students.filter((student) => student.cohort === assignment.cohort).length;
  const dueTime = new Date(assignment.dueDate).getTime();
  const daysLeft = Number.isFinite(dueTime)
    ? Math.ceil((dueTime - Date.now()) / (1000 * 60 * 60 * 24))
    : 7;

  return {
    ...workspace,
    assignments: [
      {
        ...assignment,
        id: createId(`${workspace.schoolId}-asg`),
        assignedCount,
        submittedCount: 0,
        status: daysLeft <= 3 ? "closing-soon" : "open",
      },
      ...workspace.assignments,
    ],
    updatedAt: new Date().toISOString(),
  };
};

export const resolveSupervisorForUser = (workspace: SchoolWorkspaceState, user?: User | null) => {
  if (!user) return null;
  const byId = user.supervisorId
    ? workspace.supervisors.find((supervisor) => supervisor.id === user.supervisorId)
    : undefined;
  if (byId) return byId;

  const byEmail = workspace.supervisors.find(
    (supervisor) => normalizeLookup(supervisor.email) === normalizeLookup(user.email)
  );
  if (byEmail) return byEmail;

  const byName = workspace.supervisors.find(
    (supervisor) =>
      normalizeLookup(supervisor.name) === normalizeLookup(user.supervisorName) ||
      normalizeLookup(supervisor.name) === normalizeLookup(user.name)
  );
  return byName || null;
};

export const getSupervisorAssignedStudents = (
  workspace: SchoolWorkspaceState,
  supervisorName: string
) =>
  workspace.students.filter(
    (student) => normalizeLookup(student.supervisor) === normalizeLookup(supervisorName)
  );

export const getStudentSubmissions = (workspace: SchoolWorkspaceState, studentId: string) =>
  workspace.submissions
    .filter((submission) => submission.studentId === studentId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

export const getLatestStudentSubmission = (workspace: SchoolWorkspaceState, studentId: string) =>
  getStudentSubmissions(workspace, studentId)[0];

export const resolveStudentForUser = (workspace: SchoolWorkspaceState, user?: User | null) => {
  if (!user) return null;
  const possibleIds = [user.id, user.studentId, user.htin, user.email]
    .filter((value): value is string => Boolean(value))
    .map(normalizeLookup);

  return (
    workspace.students.find((student) =>
      [student.id, student.htin, student.candidateNumber, student.email]
        .map(normalizeLookup)
        .some((value) => possibleIds.includes(value))
    ) || null
  );
};

export const getSupervisorLatestReview = (
  workspace: SchoolWorkspaceState,
  studentId: string,
  supervisorName: string
) =>
  workspace.supervisorReviews
    .filter(
      (review) =>
        review.studentId === studentId &&
        normalizeLookup(review.supervisorName) === normalizeLookup(supervisorName)
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

export const getSupervisorComments = (
  workspace: SchoolWorkspaceState,
  studentId: string,
  supervisorName?: string
) =>
  workspace.supervisorComments
    .filter(
      (comment) =>
        comment.studentId === studentId &&
        (!supervisorName || normalizeLookup(comment.supervisorName) === normalizeLookup(supervisorName))
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const getStudentCorrectionRequests = (workspace: SchoolWorkspaceState, studentId: string) =>
  workspace.correctionRequests
    .filter((request) => request.studentId === studentId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const getSupervisorReviewCriteria = (review?: Pick<SchoolSupervisorReview, "criteria" | "updatedAt"> | null) =>
  normalizeSupervisorCriteria(review?.criteria, review?.updatedAt || new Date().toISOString());

export const getSubmissionDocumentText = (
  submission?: SchoolSubmission | null,
  student?: Pick<SchoolStudentRecord, "name" | "topic" | "currentStage" | "supervisor" | "htin"> | null
) =>
  submission?.documentText ||
  `TITLE PAGE
${student?.topic || "Research title not provided"}
Candidate: ${student?.name || "Student"}
HTIN: ${student?.htin || "Not provided"}
Supervisor: ${student?.supervisor || "Not assigned"}

CURRENT STAGE
${student?.currentStage || "No current stage recorded."}

No extracted document text has been stored for this submission yet. Future uploads will appear here for supervisor review.`;

const decisionToStudentStatus = (decision: SchoolReviewDecision): SchoolStudentStatus | null => {
  if (decision === "needs-correction") return "needs-correction";
  if (decision === "ready-for-admin" || decision === "approved") return "ready";
  if (decision === "reviewed") return "on-track";
  return null;
};

export const addSupervisorComment = (
  workspace: SchoolWorkspaceState,
  comment: SupervisorCommentInput
): SchoolWorkspaceState => {
  const text = comment.text.trim();
  if (!text) return workspace;

  const nextComment: SchoolSupervisorComment = {
    id: createId(`${workspace.schoolId}-com`),
    studentId: comment.studentId,
    submissionId: comment.submissionId,
    supervisorName: comment.supervisorName,
    supervisorEmail: comment.supervisorEmail,
    type: comment.type,
    tag: comment.tag,
    section: comment.section,
    text,
    paragraphIndex: comment.paragraphIndex ?? null,
    anchorText: comment.anchorText?.trim() || "",
    resolved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    ...workspace,
    supervisorComments: [nextComment, ...workspace.supervisorComments],
    updatedAt: new Date().toISOString(),
  };
};

export const resolveSupervisorComment = (
  workspace: SchoolWorkspaceState,
  commentId: string
): SchoolWorkspaceState => ({
  ...workspace,
  supervisorComments: workspace.supervisorComments.map((comment) =>
    comment.id === commentId ? { ...comment, resolved: true, updatedAt: new Date().toISOString() } : comment
  ),
  updatedAt: new Date().toISOString(),
});

export const respondToSupervisorComment = (
  workspace: SchoolWorkspaceState,
  commentId: string,
  studentReply: string
): SchoolWorkspaceState => {
  const reply = studentReply.trim();
  if (!reply) return workspace;
  const now = new Date().toISOString();
  const target = workspace.supervisorComments.find((comment) => comment.id === commentId);

  return {
    ...workspace,
    supervisorComments: workspace.supervisorComments.map((comment) =>
      comment.id === commentId
        ? {
            ...comment,
            studentReply: reply,
            studentReplyAt: now,
            updatedAt: now,
          }
        : comment
    ),
    students: workspace.students.map((student) =>
      target && student.id === target.studentId
        ? {
            ...student,
            currentStage: `Replied to supervisor comment - ${target.section}`,
            lastActivity: now,
          }
        : student
    ),
    updatedAt: now,
  };
};

export const createCorrectionRequest = (
  workspace: SchoolWorkspaceState,
  request: CorrectionRequestInput
): SchoolWorkspaceState => {
  const title = request.title.trim();
  const instructions = request.instructions.trim();
  if (!title || !instructions) return workspace;
  const now = new Date().toISOString();
  const nextRequest: SchoolCorrectionRequest = {
    id: createId(`${workspace.schoolId}-corr`),
    studentId: request.studentId,
    submissionId: request.submissionId,
    supervisorName: request.supervisorName,
    supervisorEmail: request.supervisorEmail,
    title,
    instructions,
    status: "requested",
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...workspace,
    students: workspace.students.map((student) =>
      student.id === request.studentId
        ? {
            ...student,
            status: "needs-correction",
            currentStage: `Correction requested - ${title}`,
            lastActivity: now,
          }
        : student
    ),
    correctionRequests: [nextRequest, ...workspace.correctionRequests],
    updatedAt: now,
  };
};

export const respondToCorrectionRequest = (
  workspace: SchoolWorkspaceState,
  requestId: string,
  studentResponse: string
): SchoolWorkspaceState => {
  const response = studentResponse.trim();
  if (!response) return workspace;
  const now = new Date().toISOString();
  const target = workspace.correctionRequests.find((request) => request.id === requestId);

  return {
    ...workspace,
    correctionRequests: workspace.correctionRequests.map((request) =>
      request.id === requestId
        ? {
            ...request,
            studentResponse: response,
            status: "student-responded",
            updatedAt: now,
          }
        : request
    ),
    students: workspace.students.map((student) =>
      target && student.id === target.studentId
        ? {
            ...student,
            status: "on-track",
            currentStage: `Student responded - ${target.title}`,
            lastActivity: now,
          }
        : student
    ),
    updatedAt: now,
  };
};

export const resolveCorrectionRequest = (
  workspace: SchoolWorkspaceState,
  requestId: string
): SchoolWorkspaceState => {
  const now = new Date().toISOString();
  return {
    ...workspace,
    correctionRequests: workspace.correctionRequests.map((request) =>
      request.id === requestId
        ? {
            ...request,
            status: "resolved",
            updatedAt: now,
          }
        : request
    ),
    updatedAt: now,
  };
};

export const upsertSupervisorReview = (
  workspace: SchoolWorkspaceState,
  review: SupervisorReviewInput
): SchoolWorkspaceState => {
  const now = new Date().toISOString();
  const existingReview = getSupervisorLatestReview(workspace, review.studentId, review.supervisorName);
  const criteriaSource = review.criteria?.length ? review.criteria : existingReview?.criteria;
  const criteria = normalizeSupervisorCriteria(criteriaSource, now).map((criterion) => {
    const total = Math.max(0.5, Number(criterion.total) || 0.5);
    const awarded = clampMark(Number(criterion.awarded), total);
    return {
      ...criterion,
      total,
      awarded,
      status: criterion.status || statusFromMarks(awarded, total),
      updatedAt: now,
    };
  });
  const shouldUseCriterionTotals = Boolean(criteriaSource?.length);
  const criteriaTotal = criteria.reduce((sum, criterion) => sum + criterion.total, 0);
  const criteriaAwarded = criteria.reduce((sum, criterion) => sum + criterion.awarded, 0);
  const totalMarks = shouldUseCriterionTotals ? criteriaTotal : Math.max(1, Number(review.total) || 100);
  const awardedMarks = shouldUseCriterionTotals
    ? criteriaAwarded
    : Math.max(0, Math.min(Number(review.awarded) || 0, totalMarks));
  const nextReview: SchoolSupervisorReview = {
    id: existingReview?.id || createId(`${workspace.schoolId}-rev`),
    studentId: review.studentId,
    submissionId: review.submissionId,
    supervisorName: review.supervisorName,
    supervisorEmail: review.supervisorEmail,
    section: review.section.trim() || "General review",
    awarded: Math.round(awardedMarks * 10) / 10,
    total: Math.round(totalMarks * 10) / 10,
    decision: review.decision,
    strengths: review.strengths.trim(),
    requiredCorrections: review.requiredCorrections.trim(),
    criteria,
    createdAt: existingReview?.createdAt || now,
    updatedAt: now,
  };
  const nextStatus = decisionToStudentStatus(review.decision);

  return {
    ...workspace,
    students: workspace.students.map((student) =>
      student.id === review.studentId
        ? {
            ...student,
            status: nextStatus || student.status,
            markingScore: Math.round((nextReview.awarded / nextReview.total) * 100),
            currentStage: `${nextReview.section} - supervisor ${review.decision.replace(/-/g, " ")}`,
            lastActivity: now,
          }
        : student
    ),
    supervisorReviews: existingReview
      ? workspace.supervisorReviews.map((item) => (item.id === existingReview.id ? nextReview : item))
      : [nextReview, ...workspace.supervisorReviews],
    updatedAt: now,
  };
};

export const createSupervisorProfile = (
  workspace: SchoolWorkspaceState,
  supervisor: SupervisorProfileInput
): SchoolWorkspaceState => {
  const name = supervisor.name.trim();
  const email = supervisor.email.trim();
  if (!name || !email) return workspace;

  if (
    workspace.supervisors.some(
      (item) => normalizeLookup(item.email) === normalizeLookup(email) || normalizeLookup(item.name) === normalizeLookup(name)
    )
  ) {
    return workspace;
  }

  const now = new Date().toISOString();
  return {
    ...workspace,
    supervisors: [
      {
        id: createId(`${workspace.schoolId}-sup`),
        name,
        email,
        phone: supervisor.phone?.trim() || "",
        department: supervisor.department?.trim() || "Research supervision",
        assignedCount: 0,
        available: supervisor.available ?? true,
      },
      ...workspace.supervisors,
    ],
    updatedAt: now,
  };
};

export const assignStudentSupervisor = (
  workspace: SchoolWorkspaceState,
  studentId: string,
  supervisorName: string
): SchoolWorkspaceState => {
  const now = new Date().toISOString();
  const students = workspace.students.map((student) =>
    student.id === studentId
      ? {
          ...student,
          supervisor: supervisorName,
          currentStage: supervisorName === "Not assigned" ? "Awaiting supervisor assignment" : `Assigned to ${supervisorName}`,
          lastActivity: now,
        }
      : student
  );

  return {
    ...workspace,
    students,
    supervisors: workspace.supervisors.map((supervisor) => ({
      ...supervisor,
      assignedCount: students.filter((student) => student.supervisor === supervisor.name).length,
    })),
    updatedAt: now,
  };
};

export const uploadStudentSubmission = (
  workspace: SchoolWorkspaceState,
  submission: StudentSubmissionInput
): SchoolWorkspaceState => {
  const now = new Date().toISOString();
  const previousSubmissions = getStudentSubmissions(workspace, submission.studentId);
  const nextVersion =
    Math.max(0, ...previousSubmissions.map((item) => Number(item.version) || 0)) + 1;
  const existingForAssignment = workspace.submissions.some(
    (item) => item.studentId === submission.studentId && item.assignmentId === submission.assignmentId
  );
  const assignment = workspace.assignments.find((item) => item.id === submission.assignmentId);
  const nextSubmission: SchoolSubmission = {
    id: createId(`${workspace.schoolId}-sub`),
    studentId: submission.studentId,
    assignmentId: submission.assignmentId,
    fileName: submission.fileName.trim() || `submission-v${nextVersion}.txt`,
    submittedAt: now,
    documentType: submission.documentType || assignment?.documentType || "report",
    fileType: submission.fileType || "manual",
    documentText: submission.documentText?.trim() || "",
    pageCount: submission.pageCount ?? null,
    wordCount: submission.wordCount ?? submission.documentText?.trim().split(/\s+/).filter(Boolean).length ?? 0,
    version: nextVersion,
    uploadedBy: submission.uploadedBy,
    markingAwarded: 0,
    markingTotal: 100,
    originalityAttention: 0,
    status: "on-track",
  };

  return {
    ...workspace,
    students: workspace.students.map((student) =>
      student.id === submission.studentId
        ? {
            ...student,
            status: "on-track",
            currentStage: `Submitted ${assignment?.section || "document"} v${nextVersion}`,
            lastActivity: now,
          }
        : student
    ),
    assignments: workspace.assignments.map((item) =>
      item.id === submission.assignmentId
        ? {
            ...item,
            submittedCount: existingForAssignment
              ? item.submittedCount
              : Math.min(item.assignedCount || item.submittedCount + 1, item.submittedCount + 1),
          }
        : item
    ),
    submissions: [nextSubmission, ...workspace.submissions],
    updatedAt: now,
  };
};

export const getStudentReviewTimeline = (
  workspace: SchoolWorkspaceState,
  studentId: string
): SchoolReviewTimelineEvent[] => {
  const submissionEvents: SchoolReviewTimelineEvent[] = workspace.submissions
    .filter((submission) => submission.studentId === studentId)
    .map((submission) => ({
      id: submission.id,
      type: "submission",
      title: `Submitted ${submission.fileName}`,
      detail: `${submission.markingAwarded}/${submission.markingTotal} marks recorded - ${submission.originalityAttention}% originality attention`,
      date: submission.submittedAt,
      status: submission.status,
    }));
  const reviewEvents: SchoolReviewTimelineEvent[] = workspace.supervisorReviews
    .filter((review) => review.studentId === studentId)
    .map((review) => ({
      id: review.id,
      type: "review",
      title: `Supervisor review: ${review.section}`,
      detail: `${review.awarded}/${review.total} marks - ${review.decision.replace(/-/g, " ")}`,
      date: review.updatedAt,
      status: review.decision,
    }));
  const commentEvents: SchoolReviewTimelineEvent[] = workspace.supervisorComments
    .filter((comment) => comment.studentId === studentId)
    .map((comment) => ({
      id: comment.id,
      type: "comment",
      title: `${comment.section} comment`,
      detail: comment.studentReply ? `${comment.text} Student replied: ${comment.studentReply}` : comment.text,
      date: comment.updatedAt || comment.createdAt,
      status: comment.resolved ? "resolved" : comment.studentReply ? "student replied" : "open",
    }));
  const correctionEvents: SchoolReviewTimelineEvent[] = workspace.correctionRequests
    .filter((request) => request.studentId === studentId)
    .map((request) => ({
      id: request.id,
      type: "correction",
      title: request.title,
      detail: request.studentResponse || request.instructions,
      date: request.updatedAt,
      status: request.status,
    }));

  return [...submissionEvents, ...reviewEvents, ...commentEvents, ...correctionEvents].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
};

export const parseCandidateImport = (
  text: string,
  defaults: Pick<CandidateRegistrationInput, "cohort" | "programme" | "supervisor">
) => {
  const seen = new Set<string>();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t|,/).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 2)
    .map((cells) => {
      const [name, htin, email = "", phone = "", topic = ""] = cells;
      const key = `${name.toLowerCase()}-${htin.toLowerCase()}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        name,
        htin,
        email,
        phone,
        topic,
        cohort: defaults.cohort,
        programme: defaults.programme,
        supervisor: defaults.supervisor,
      };
    })
    .filter((candidate): candidate is CandidateRegistrationInput => Boolean(candidate));
};

export const importCandidates = (
  workspace: SchoolWorkspaceState,
  candidates: CandidateRegistrationInput[]
) => {
  const existing = new Set(workspace.students.map((student) => student.htin.toLowerCase()));
  let added = 0;
  let skipped = 0;
  let nextWorkspace = workspace;

  candidates.forEach((candidate) => {
    if (!candidate.name.trim() || !candidate.htin.trim() || existing.has(candidate.htin.toLowerCase())) {
      skipped += 1;
      return;
    }
    existing.add(candidate.htin.toLowerCase());
    nextWorkspace = registerCandidate(nextWorkspace, candidate);
    added += 1;
  });

  return { workspace: nextWorkspace, added, skipped };
};

const createCsvDownload = (rows: string[][], fileName: string, message: string) => {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, sanitizeFileName(fileName), { message });
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export const exportCandidateRegisterCsv = (workspace: SchoolWorkspaceState, cohort: string) => {
  const students = cohort === "All cohorts"
    ? workspace.students
    : workspace.students.filter((student) => student.cohort === cohort);
  const rows = [
    [
      "Candidate name",
      "Email",
      "Phone",
      "HTIN",
      "Candidate number",
      "Programme",
      "Cohort",
      "Supervisor",
      "Account status",
      "Registration status",
      "Topic",
    ],
    ...students.map((student) => [
      student.name,
      student.email,
      student.phone,
      student.htin,
      student.candidateNumber,
      student.programme,
      student.cohort,
      student.supervisor,
      student.accountStatus,
      student.registrationStatus,
      student.topic,
    ]),
  ];

  createCsvDownload(
    rows,
    `${workspace.schoolName}-${cohort}-candidate-register.csv`,
    "Candidate register export started"
  );
};

export const exportSchoolSummaryCsv = (workspace: SchoolWorkspaceState, cohort: string) => {
  const students = cohort === "All cohorts"
    ? workspace.students
    : workspace.students.filter((student) => student.cohort === cohort);
  const rows = [
    ["Student", "HTIN", "Cohort", "Supervisor", "Stage", "Status", "Marking score", "Originality attention", "Account", "Topic"],
    ...students.map((student) => [
      student.name,
      student.htin,
      student.cohort,
      student.supervisor,
      student.currentStage,
      student.status,
      String(student.markingScore),
      String(student.originalityAttention),
      student.accountStatus,
      student.topic,
    ]),
  ];

  createCsvDownload(
    rows,
    `${workspace.schoolName}-${cohort}-research-summary.csv`,
    "Class summary export started"
  );
};

export const exportSupervisorRegisterCsv = (
  workspace: SchoolWorkspaceState,
  supervisorName: string
) => {
  const students = getSupervisorAssignedStudents(workspace, supervisorName);
  const rows = [
    [
      "Student",
      "HTIN",
      "Cohort",
      "Programme",
      "Topic",
      "Current stage",
      "Student status",
      "Latest submission",
      "Latest review decision",
      "Latest review marks",
      "Open comments",
    ],
    ...students.map((student) => {
      const submission = getLatestStudentSubmission(workspace, student.id);
      const review = getSupervisorLatestReview(workspace, student.id, supervisorName);
      const comments = getSupervisorComments(workspace, student.id, supervisorName).filter((comment) => !comment.resolved);
      return [
        student.name,
        student.htin,
        student.cohort,
        student.programme,
        student.topic,
        student.currentStage,
        student.status,
        submission?.fileName || "No submission",
        review?.decision || "pending",
        review ? `${review.awarded}/${review.total}` : "Not marked",
        String(comments.length),
      ];
    }),
  ];

  createCsvDownload(
    rows,
    `${workspace.schoolName}-${supervisorName}-supervisor-register.csv`,
    "Supervisor register export started"
  );
};
