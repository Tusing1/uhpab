import { jsPDF } from "jspdf";
import { sanitizeFileName, triggerBrowserDownload } from "@/lib/download";
import type {
  HumanReviewCategory,
  HumanReviewChange,
  HumanReviewResult,
  HumanReviewSeverity,
  HumanReviewSignal,
} from "@/lib/humanReviewEngine";
import {
  cleanPdfText,
  createFormalReportId,
  drawFormalFooters,
  drawFormalHero,
  drawFormalReportPage,
  drawFormalStatsBar,
  drawReportShell,
  ensureReportSpace,
  formatFormalReportDate,
  page,
  reportFamily,
  sectionTitle,
  setRgb,
  truncate,
  type PdfRgb,
} from "@/lib/pdfReportTheme";

const contentBottom = 268;

const safeText = (value: string | undefined | null) =>
  cleanPdfText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");

const trimSnippet = (value: string | undefined | null, limit = 260) => {
  const clean = safeText(value);
  return clean.length > limit ? `${clean.slice(0, limit - 3).trim()}...` : clean;
};

const splitParagraphs = (value: string) =>
  safeText(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const wordCount = (value: string) => safeText(value).split(/\s+/).filter(Boolean).length;

const severityMeta = (severity: HumanReviewSeverity): { label: string; tone: PdfRgb; fill: PdfRgb } => {
  if (severity === "high") {
    return { label: "High attention", tone: reportFamily.red, fill: reportFamily.redSoft };
  }
  if (severity === "medium") {
    return { label: "Needs review", tone: reportFamily.amber, fill: reportFamily.amberSoft };
  }
  return { label: "Low concern", tone: reportFamily.blue, fill: reportFamily.blueSoft };
};

const categoryTone = (category: HumanReviewCategory): PdfRgb => {
  if (category === "Citation integrity" || category === "Technical cleanup") return reportFamily.red;
  if (category === "Content specificity") return reportFamily.amber;
  if (category === "Plain language") return reportFamily.green;
  if (category === "Academic voice") return reportFamily.blue;
  return reportFamily.navySoft;
};

const scoreTone = (score: number): PdfRgb => {
  if (score >= 80) return reportFamily.green;
  if (score >= 55) return reportFamily.amber;
  return reportFamily.red;
};

const drawPill = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  fill: PdfRgb,
  text: PdfRgb,
  fontSize = 6.4
) => {
  setRgb(doc, fill, "fill");
  doc.roundedRect(x, y, width, 7, 3.5, 3.5, "F");
  setRgb(doc, text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  doc.text(label, x + width / 2, y + 4.8, { align: "center" });
};

const drawInfoCard = (
  doc: jsPDF,
  y: number,
  title: string,
  body: string,
  tone: PdfRgb = reportFamily.blue,
  fill: PdfRgb = reportFamily.blueSoft
) => {
  const bodyLines = doc.splitTextToSize(safeText(body), page.contentWidth - 16) as string[];
  const height = Math.max(23, 15 + bodyLines.length * 4.3);
  setRgb(doc, fill, "fill");
  setRgb(doc, reportFamily.border, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, height, 3, 3, "FD");
  setRgb(doc, tone, "fill");
  doc.roundedRect(page.margin, y, 3, height, 1.5, 1.5, "F");
  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, page.margin + 8, y + 8);
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(bodyLines, page.margin + 8, y + 15);
  return y + height + 6;
};

const drawCoverPage = (
  doc: jsPDF,
  result: HumanReviewResult,
  fileName: string,
  reviewerName?: string
) => {
  const sourceName = fileName || result.sourceContext?.fileName || "Human-reviewed research text";
  const reportId = createFormalReportId(sourceName, "HUM");
  const highSignals = result.signals.filter((signal) => signal.severity === "high").length;
  const remainingSignals = result.remainingSignals?.length ?? 0;
  const score = result.readinessScore;
  const reviewModeLabel = result.reviewMode === "deep" ? "Deep review" : "Standard review";
  const methodLabel = (result.reviewMethod ?? "local").replace("-", " ");

  drawFormalHero(doc, {
    reportId,
    fileName: sourceName,
    metaLines: [
      `Generated ${formatFormalReportDate()}  |  Human writing review`,
      `Reviewer: ${reviewerName || "Not specified"}`,
    ],
    chips: [
      { label: reviewModeLabel, tone: result.reviewMode === "deep" ? "warning" : "blue" },
      { label: methodLabel, tone: result.reviewMethod === "ai-assisted" ? "success" : "blue" },
      {
        label: `${result.signals.length} signal${result.signals.length === 1 ? "" : "s"} found`,
        tone: highSignals ? "danger" : result.signals.length ? "warning" : "success",
      },
      { label: `${result.changes.length} cleanup change${result.changes.length === 1 ? "" : "s"}`, tone: "success" },
    ],
    metric: {
      value: String(score),
      denominator: "/100",
      label: "Readiness",
      caption: highSignals ? `${highSignals} high attention` : "Ready for review",
      progress: score,
      tone: scoreTone(score),
    },
  });

  drawFormalStatsBar(doc, [
    { value: `${score}/100`, label: ["Human review", "readiness"], tone: scoreTone(score) },
    { value: result.signals.length, label: ["Style signals", "found"], tone: highSignals ? reportFamily.red : reportFamily.blue },
    { value: remainingSignals, label: ["Signals", "remaining"], tone: remainingSignals ? reportFamily.amber : reportFamily.green },
    { value: result.changes.length, label: ["Safe cleanup", "changes"], tone: reportFamily.green },
  ]);

  let y = sectionTitle(
    doc,
    "Review scope",
    119,
    "This report removes generic generated-writing patterns and keeps facts, figures, citations, and meaning under student control."
  );
  y = drawInfoCard(
    doc,
    y,
    "Student verification required",
    "Review the revised text before submission. Confirm all claims, references, names, dates, and statistics against the original research sources.",
    reportFamily.amber,
    reportFamily.amberSoft
  );

  const contextLines = [
    `Source: ${sourceName}`,
    `Section: ${result.sourceContext?.section || "Not specified"}`,
    `Words reviewed: ${wordCount(result.originalText).toLocaleString()}`,
    `Words after cleanup: ${wordCount(result.revisedText).toLocaleString()}`,
    `Review mode: ${reviewModeLabel}`,
    `Method: ${methodLabel}`,
  ];

  setRgb(doc, reportFamily.card, "fill");
  setRgb(doc, reportFamily.border, "draw");
  const contextCardHeight = 47;
  doc.roundedRect(page.margin, y, page.contentWidth, contextCardHeight, 3, 3, "FD");
  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Document context", page.margin + 7, y + 8);
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  contextLines.forEach((line, index) => {
    doc.text(truncate(line, 82), page.margin + 7, y + 15 + index * 4.7);
  });
};

const drawSignalCard = (doc: jsPDF, signal: HumanReviewSignal, y: number) => {
  const meta = severityMeta(signal.severity);
  const accentTone = categoryTone(signal.category);
  const titleLines = doc.splitTextToSize(signal.label, 102) as string[];
  const detailLines = doc.splitTextToSize(signal.description, 151) as string[];
  const suggestionLines = doc.splitTextToSize(signal.suggestion, 151) as string[];
  const matchLines = signal.matches.slice(0, 2).flatMap((match, index) =>
    doc.splitTextToSize(`${index + 1}. ${trimSnippet(match.snippet, 150)}`, 151) as string[]
  );
  const height = Math.max(
    40,
    26 + titleLines.length * 4.2 + detailLines.length * 4.1 + suggestionLines.length * 4.1 + matchLines.length * 3.8
  );

  y = ensureReportSpace(doc, y, height + 4, "Human Review Signals");

  setRgb(doc, reportFamily.card, "fill");
  setRgb(doc, reportFamily.border, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, height, 3, 3, "FD");
  setRgb(doc, accentTone, "fill");
  doc.roundedRect(page.margin, y, 3.2, height, 1.6, 1.6, "F");

  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.2);
  doc.text(titleLines, page.margin + 9, y + 8);
  drawPill(doc, page.width - page.margin - 40, y + 5, 35, meta.label, meta.fill, meta.tone, 5.6);

  setRgb(doc, accentTone);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(signal.category.toUpperCase(), page.margin + 9, y + 15 + titleLines.length * 4.2);

  let cursor = y + 22 + titleLines.length * 4.2;
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.7);
  doc.text(detailLines, page.margin + 9, cursor);
  cursor += detailLines.length * 4.1 + 3;

  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.7);
  doc.text(suggestionLines, page.margin + 9, cursor);
  cursor += suggestionLines.length * 4.1 + 3;

  if (matchLines.length) {
    setRgb(doc, reportFamily.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.1);
    doc.text(matchLines, page.margin + 9, cursor);
  }

  setRgb(doc, meta.tone);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text(`${signal.matches.length} match${signal.matches.length === 1 ? "" : "es"}`, page.width - page.margin - 5, y + height - 6, {
    align: "right",
  });

  return y + height + 5;
};

const drawSignalsPage = (doc: jsPDF, result: HumanReviewResult) => {
  doc.addPage();
  drawReportShell(doc, "Human Review Signals");
  let y = sectionTitle(
    doc,
    "Pattern review",
    34,
    "Signals are grouped by academic voice, plain language, specificity, citation integrity, style, and technical cleanup."
  );

  if (result.reviewMode === "deep" && result.deepReviewSummary?.length) {
    y = drawInfoCard(
      doc,
      y,
      "Deep review summary",
      result.deepReviewSummary.join(" "),
      reportFamily.blue,
      reportFamily.blueSoft
    );
  }

  if (!result.signals.length) {
    y = drawInfoCard(
      doc,
      y,
      "No major generated-writing signals found",
      "The text still needs normal academic checking, but this scan did not find major robotic phrasing, artifacts, or citation-integrity signals.",
      reportFamily.green,
      reportFamily.greenSoft
    );
    return y;
  }

  result.signals.forEach((signal) => {
    y = drawSignalCard(doc, signal, y);
  });
  return y;
};

const drawChangeCard = (doc: jsPDF, change: HumanReviewChange, index: number, y: number) => {
  const tone = categoryTone(change.category);
  const beforeLines = doc.splitTextToSize(trimSnippet(change.before, 220), 145) as string[];
  const afterLines = doc.splitTextToSize(trimSnippet(change.after, 220), 145) as string[];
  const reasonLines = doc.splitTextToSize(trimSnippet(change.reason, 220), 145) as string[];
  const height = Math.max(34, 20 + (beforeLines.length + afterLines.length + reasonLines.length) * 4.1);

  y = ensureReportSpace(doc, y, height + 4, "Cleanup Changes");

  setRgb(doc, reportFamily.card, "fill");
  setRgb(doc, reportFamily.border, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, height, 3, 3, "FD");
  setRgb(doc, tone, "fill");
  doc.circle(page.margin + 8, y + 8, 3.3, "F");
  setRgb(doc, reportFamily.card);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text(String(index + 1), page.margin + 8, y + 10.3, { align: "center" });
  setRgb(doc, tone);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text(change.category.toUpperCase(), page.margin + 16, y + 8);

  let cursor = y + 16;
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Before", page.margin + 16, cursor);
  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.text(beforeLines, page.margin + 38, cursor);
  cursor += Math.max(4.1, beforeLines.length * 4.1) + 2;

  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("After", page.margin + 16, cursor);
  setRgb(doc, tone);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.text(afterLines, page.margin + 38, cursor);
  cursor += Math.max(4.1, afterLines.length * 4.1) + 2;

  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Why", page.margin + 16, cursor);
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.text(reasonLines, page.margin + 38, cursor);

  return y + height + 5;
};

const drawChangesPage = (doc: jsPDF, result: HumanReviewResult) => {
  doc.addPage();
  drawReportShell(doc, "Cleanup Changes");
  let y = sectionTitle(
    doc,
    "Safe cleanup changes",
    34,
    "These changes remove stiff wording, artifacts, filler, or style issues while preserving the student's meaning."
  );

  if (!result.changes.length) {
    y = drawInfoCard(
      doc,
      y,
      "No automatic cleanup changes needed",
      "The review did not apply automatic wording cleanup. Continue with normal student editing and source verification.",
      reportFamily.green,
      reportFamily.greenSoft
    );
  } else {
    result.changes.forEach((change, index) => {
      y = drawChangeCard(doc, change, index, y);
    });
  }

  if (result.warnings.length) {
    y = ensureReportSpace(doc, y + 3, 24, "Cleanup Changes");
    y = sectionTitle(doc, "Verification notes", y + 2);
    result.warnings.forEach((warning, index) => {
      y = drawInfoCard(
        doc,
        y,
        `Verify ${index + 1}`,
        warning,
        reportFamily.amber,
        reportFamily.amberSoft
      );
    });
  }
};

const drawRevisedTextPage = (doc: jsPDF, result: HumanReviewResult, fileName: string) => {
  doc.addPage();
  drawFormalReportPage(doc, "Revised Text");
  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Revised research text", page.margin, 32);
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.text(truncate(`${fileName || result.sourceContext?.fileName || "Human-reviewed text"} - verify before submission`, 94), page.margin, 39);

  let y = 51;
  const paragraphs = splitParagraphs(result.revisedText);
  if (!paragraphs.length) {
    drawInfoCard(doc, y, "No revised text available", "Run the human review again or paste text into the workspace.", reportFamily.red, reportFamily.redSoft);
    return;
  }

  paragraphs.forEach((paragraph) => {
    doc.setFont("times", "normal");
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(paragraph, page.contentWidth) as string[];
    lines.forEach((line) => {
      if (y > contentBottom) {
        doc.addPage();
        drawFormalReportPage(doc, "Revised Text");
        y = 32;
      }
      setRgb(doc, reportFamily.text);
      doc.text(line, page.margin, y);
      y += 5.5;
    });
    y += 4;
  });
};

export const createHumanReviewPdfDocument = (
  result: HumanReviewResult,
  fileName: string,
  reviewerName?: string
) => {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  const sourceName = fileName || result.sourceContext?.fileName || "human-review";
  const reportId = createFormalReportId(sourceName, "HUM");
  const normalizedResult: HumanReviewResult = {
    ...result,
    originalText: safeText(result.originalText),
    revisedText: safeText(result.revisedText),
  };

  doc.setProperties({
    title: `UHPAB Human Review - ${sourceName}`,
    subject: "Human writing review and generated-pattern cleanup",
    author: "UHPAB Research Assistant",
    creator: "UHPAB Research Assistant",
  });

  drawCoverPage(doc, normalizedResult, sourceName, reviewerName);
  drawSignalsPage(doc, normalizedResult);
  drawChangesPage(doc, normalizedResult);
  drawRevisedTextPage(doc, normalizedResult, sourceName);
  drawFormalFooters(doc, reportId, "UHPAB human writing review");

  return doc;
};

export const downloadHumanReviewPdf = (
  result: HumanReviewResult,
  fileName: string,
  reviewerName?: string
) => {
  const baseName = sanitizeFileName((fileName || result.sourceContext?.fileName || "human-review").replace(/\.[^.]+$/, ""));
  const doc = createHumanReviewPdfDocument(result, fileName, reviewerName);
  const blobUrl = URL.createObjectURL(doc.output("blob"));
  triggerBrowserDownload(blobUrl, `${baseName}-human-review.pdf`, {
    message: "Professional human review export started",
  });
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
};
