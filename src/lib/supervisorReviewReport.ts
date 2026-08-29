import { jsPDF } from "jspdf";

import { sanitizeFileName, triggerBrowserDownload } from "@/lib/download";
import {
  accent,
  cleanPdfText,
  createFormalReportId,
  drawFormalFooters,
  drawFormalHero,
  drawFormalReportPage,
  drawFormalStatsBar,
  formatFormalReportDate,
  page,
  reportFamily,
  sectionTitle,
  setRgb,
} from "@/lib/pdfReportTheme";
import type {
  SchoolCorrectionRequest,
  SchoolStudentRecord,
  SchoolSubmission,
  SchoolSupervisorComment,
  SchoolSupervisorReview,
  SchoolReviewTimelineEvent,
} from "@/lib/schoolWorkspaceStore";

type SupervisorReviewReportInput = {
  schoolName: string;
  supervisorName: string;
  student: SchoolStudentRecord;
  submission?: SchoolSubmission;
  review?: SchoolSupervisorReview;
  comments: SchoolSupervisorComment[];
  corrections: SchoolCorrectionRequest[];
  timeline: SchoolReviewTimelineEvent[];
};

const reportTitle = "Supervisor Review Report";

const statusLabel = (value?: string) => (value || "pending").replace(/-/g, " ");

const addPage = (doc: jsPDF) => {
  doc.addPage();
  drawFormalReportPage(doc, reportTitle);
  return 32;
};

const ensureSpace = (doc: jsPDF, y: number, neededHeight: number) =>
  y + neededHeight > page.contentBottom ? addPage(doc) : y;

const drawWrapped = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  size = 8,
  color = reportFamily.text
) => {
  setRgb(doc, color);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(cleanPdfText(text), width);
  doc.text(lines, x, y);
  return y + lines.length * (size * 0.45) + 3;
};

const drawInfoRow = (doc: jsPDF, label: string, value: string, x: number, y: number, width = 84) => {
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.7);
  doc.text(label.toUpperCase(), x, y);
  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.text(doc.splitTextToSize(value || "Not provided", width), x, y + 5);
};

const drawCard = (
  doc: jsPDF,
  title: string,
  meta: string,
  body: string,
  y: number,
  tone = accent.blue
) => {
  const bodyLines = doc.splitTextToSize(cleanPdfText(body), page.contentWidth - 20);
  const height = Math.max(26, 18 + bodyLines.length * 4);
  y = ensureSpace(doc, y, height + 5);
  setRgb(doc, reportFamily.card, "fill");
  setRgb(doc, reportFamily.border, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, height, 3, 3, "FD");
  setRgb(doc, tone, "fill");
  doc.roundedRect(page.margin, y, 3, height, 1.5, 1.5, "F");
  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(title, page.contentWidth - 24), page.margin + 8, y + 8);
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text(meta, page.margin + 8, y + 14);
  setRgb(doc, reportFamily.text);
  doc.setFontSize(7.6);
  doc.text(bodyLines, page.margin + 8, y + 21);
  return y + height + 5;
};

const drawCriterionTable = (doc: jsPDF, review: SchoolSupervisorReview | undefined, y: number) => {
  y = sectionTitle(doc, "Marking Guide Decisions", y, "Criterion outcomes are recorded as Awarded, Partial, or Not awarded.");

  if (!review?.criteria?.length) {
    return drawWrapped(doc, "No criterion-level marks have been saved yet.", page.margin, y, page.contentWidth);
  }

  review.criteria.forEach((criterion) => {
    const body = [
      criterion.evidenceSnippet ? `Evidence: ${criterion.evidenceSnippet}` : "Evidence: Not recorded",
      criterion.note ? `Note: ${criterion.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const tone =
      criterion.status === "awarded"
        ? accent.green
        : criterion.status === "partial"
          ? accent.amber
          : accent.rose;
    y = drawCard(
      doc,
      `${criterion.criterion} (${criterion.awarded}/${criterion.total})`,
      `${criterion.section} - ${statusLabel(criterion.status)}${criterion.pageNumber ? ` - Page ${criterion.pageNumber}` : ""}`,
      body,
      y,
      tone
    );
  });

  return y;
};

export const downloadSupervisorReviewPdf = ({
  schoolName,
  supervisorName,
  student,
  submission,
  review,
  comments,
  corrections,
  timeline,
}: SupervisorReviewReportInput) => {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const reportId = createFormalReportId(`${student.id}-${review?.updatedAt || student.lastActivity}`, "SUP");
  const awarded = review?.awarded ?? student.markingScore ?? 0;
  const total = review?.total ?? 100;
  const progress = Math.round((awarded / Math.max(1, total)) * 100);

  drawFormalHero(doc, {
    reportId,
    fileName: student.name,
    metaLines: [
      `${schoolName} | ${student.htin} | ${student.programme}`,
      `Supervisor: ${supervisorName} | Generated ${formatFormalReportDate()}`,
    ],
    chips: [
      { label: statusLabel(student.status), tone: student.status === "ready" ? "success" : student.status === "needs-correction" ? "warning" : "blue" },
      { label: submission?.fileName || "No file", tone: submission ? "blue" : "danger" },
      { label: statusLabel(review?.decision), tone: review?.decision === "needs-correction" ? "warning" : "neutral" },
    ],
    metric: {
      value: String(Math.round(awarded)),
      denominator: `/${Math.round(total)}`,
      label: "Supervisor mark",
      caption: `${progress}%`,
      progress,
      tone: progress >= 70 ? accent.green : progress >= 50 ? accent.amber : accent.rose,
    },
  });

  drawFormalStatsBar(
    doc,
    [
      { value: comments.filter((comment) => !comment.resolved).length, label: "open comments", tone: accent.amber },
      { value: corrections.filter((request) => request.status !== "resolved").length, label: "corrections", tone: accent.rose },
      { value: submission?.version || 0, label: "submission version", tone: accent.blue },
      { value: student.originalityAttention, label: "originality attention", tone: accent.slate },
    ],
    78
  );

  let y = sectionTitle(doc, "Student Summary", 118, "School-facing supervision record.");
  drawInfoRow(doc, "Research topic", student.topic || "Not provided", page.margin, y, page.contentWidth);
  drawInfoRow(doc, "Current stage", student.currentStage, page.margin, y + 16, 82);
  drawInfoRow(doc, "Latest submission", submission?.fileName || "No submission", page.margin + 96, y + 16, 82);
  y += 38;
  y = sectionTitle(doc, "Supervisor Decision", y, "Strengths and required corrections from the latest saved review.");
  y = drawCard(doc, "Strengths", statusLabel(review?.decision), review?.strengths || "No strengths recorded.", y, accent.green);
  y = drawCard(doc, "Required corrections", statusLabel(review?.decision), review?.requiredCorrections || "No required corrections recorded.", y, accent.amber);

  y = drawCriterionTable(doc, review, y + 4);

  y = ensureSpace(doc, y + 4, 35);
  y = sectionTitle(doc, "Correction Requests", y, "Student response status and supervisor follow-up.");
  if (corrections.length) {
    corrections.forEach((request) => {
      y = drawCard(
        doc,
        request.title,
        `${statusLabel(request.status)} - ${new Date(request.updatedAt).toLocaleDateString()}`,
        request.studentResponse ? `Student response: ${request.studentResponse}` : request.instructions,
        y,
        request.status === "resolved" ? accent.green : accent.amber
      );
    });
  } else {
    y = drawWrapped(doc, "No correction requests recorded.", page.margin, y, page.contentWidth);
  }

  y = ensureSpace(doc, y + 4, 35);
  y = sectionTitle(doc, "Review Timeline", y, "Submissions, reviews, comments, and correction activity.");
  timeline.slice(0, 12).forEach((event) => {
    y = drawCard(
      doc,
      event.title,
      `${event.type} - ${new Date(event.date).toLocaleString()} - ${statusLabel(event.status)}`,
      event.detail,
      y,
      event.type === "submission" ? accent.blue : event.type === "review" ? accent.green : accent.slate
    );
  });

  drawFormalFooters(doc, reportId, "UHPAB Supervisor Review");
  const blobUrl = URL.createObjectURL(doc.output("blob"));
  triggerBrowserDownload(blobUrl, sanitizeFileName(`${student.name}-supervisor-review.pdf`), {
    message: "Supervisor report export started",
  });
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
};
