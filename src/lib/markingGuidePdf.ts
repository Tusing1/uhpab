import { jsPDF } from "jspdf";
import type { AnalysisResult, DocumentType } from "@/utils/documentAnalysis";
import { sanitizeFileName, triggerBrowserDownload } from "@/lib/download";
import {
  createFormalReportId,
  drawFormalFooters,
  drawFormalHero,
  drawFormalReportPage,
  drawFormalStatsBar,
  formatFormalReportDate,
  page,
  reportFamily,
  setRgb,
  truncate,
  type PdfRgb,
} from "@/lib/pdfReportTheme";

type RubricSection = NonNullable<AnalysisResult["rubricScore"]>["sections"][number];
type RubricCriterion = RubricSection["criteria"][number];
type MarkingStatus = RubricCriterion["status"];

const contentBottom = 277;
const cardGap = 4;

const formatMark = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");

const percentage = (awarded: number, total: number) =>
  total > 0 ? Math.round((Math.min(awarded, total) / total) * 100) : 0;

const statusMeta = (status: MarkingStatus) => {
  if (status === "met") {
    return {
      label: "Awarded",
      tone: reportFamily.green,
      fill: reportFamily.greenSoft,
    };
  }
  if (status === "partial") {
    return {
      label: "Partial",
      tone: reportFamily.amber,
      fill: reportFamily.amberSoft,
    };
  }
  return {
    label: "Not awarded",
    tone: reportFamily.red,
    fill: reportFamily.redSoft,
  };
};

const scoreTone = (score: number): PdfRgb => {
  if (score >= 75) return reportFamily.green;
  if (score >= 50) return reportFamily.amber;
  return reportFamily.red;
};

const countStatuses = (sections: RubricSection[]) =>
  sections.reduce(
    (counts, section) => {
      section.criteria.forEach((criterion) => {
        counts[criterion.status] += 1;
      });
      return counts;
    },
    { met: 0, partial: 0, missing: 0 } as Record<MarkingStatus, number>
  );

const drawPill = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  fill: PdfRgb,
  text: PdfRgb,
  fontSize = 6.7
) => {
  setRgb(doc, fill, "fill");
  doc.roundedRect(x, y, width, 7, 3.5, 3.5, "F");
  setRgb(doc, text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  doc.text(label, x + width / 2, y + 4.8, { align: "center" });
};

const drawHero = (
  doc: jsPDF,
  fileName: string,
  documentType: DocumentType,
  component: string,
  studentName: string | undefined,
  score: number,
  revisionCount: number,
  reportId: string
) => {
  drawFormalHero(doc, {
    reportId,
    fileName,
    metaLines: [
      `Generated ${formatFormalReportDate()}  |  ${component === "full" ? "Full report check" : `${component} check`}`,
      ...(studentName ? [`Student: ${studentName}`] : []),
    ],
    chips: [
      { label: documentType === "report" ? "Research report" : "Research proposal" },
      { label: component === "full" ? "Full check" : "Section" },
      {
        label: `${revisionCount} item${revisionCount === 1 ? "" : "s"} need revision`,
        tone: revisionCount > 0 ? "danger" : "success",
      },
    ],
    metric: {
      value: formatMark(score),
      denominator: "/100",
      label: "Total score",
      caption: `${Math.round(score)}% submission ready`,
      progress: score,
      tone: [79, 200, 122],
    },
  });
};

const drawStatsBar = (
  doc: jsPDF,
  counts: Record<MarkingStatus, number>,
  recoverable: number
) => {
  drawFormalStatsBar(doc, [
    { value: counts.met, label: ["Criteria fully", "awarded"], tone: reportFamily.green },
    { value: counts.partial, label: ["Partial marks", "awarded"], tone: reportFamily.amber },
    { value: counts.missing, label: ["Criteria not", "awarded"], tone: reportFamily.red },
    { value: formatMark(recoverable), label: ["Marks still", "recoverable"], tone: reportFamily.blue },
  ]);
};

const revisionText = (criterion: RubricCriterion) => {
  const guidance = criterion.guidance
    .replace(/^[A-Za-z ]+ evidence:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (criterion.status === "missing") {
    return `No sufficient evidence was found. ${guidance}`;
  }
  return `${guidance}${criterion.evidenceSnippet ? ` Evidence found: ${criterion.evidenceSnippet}` : ""}`;
};

const drawPriorityHeader = (doc: jsPDF, y: number, count: number) => {
  setRgb(doc, reportFamily.priority, "fill");
  setRgb(doc, reportFamily.priorityMid, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, 14, 3, 3, "FD");
  setRgb(doc, [255, 144, 144], "fill");
  doc.circle(page.margin + 7, y + 7, 3, "F");
  setRgb(doc, reportFamily.card);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("!", page.margin + 7, y + 9, { align: "center" });
  setRgb(doc, [255, 176, 176]);
  doc.setFontSize(8.2);
  doc.text("Priority revision list - address these before submission", page.margin + 13, y + 8.5);
  drawPill(doc, page.width - page.margin - 25, y + 3.5, 20, `${count} items`, [91, 35, 42], [255, 144, 144], 6.1);
  return y + 14;
};

const drawPriorities = (
  doc: jsPDF,
  priorities: { section: RubricSection; criterion: RubricCriterion }[]
) => {
  let continued = false;
  let y = drawPriorityHeader(doc, 112, priorities.length);
  if (!priorities.length) {
    setRgb(doc, reportFamily.greenSoft, "fill");
    setRgb(doc, reportFamily.green, "draw");
    doc.roundedRect(page.margin, y, page.contentWidth, 18, 0, 0, "FD");
    setRgb(doc, reportFamily.green);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("All criteria in this check were fully awarded.", page.margin + 7, y + 11);
    return { y: y + 18, continued };
  }

  priorities.forEach(({ section, criterion }, index) => {
    const lost = Math.max(0, criterion.marks - Math.min(criterion.awarded, criterion.marks));
    const title = `${section.title} - ${criterion.label}:`;
    const titleLines = doc.splitTextToSize(title, 138);
    const bodyLines = doc.splitTextToSize(revisionText(criterion), 138);
    const rowHeight = Math.max(15, 6 + titleLines.length * 3.8 + bodyLines.length * 3.7);

    if (y + rowHeight > contentBottom) {
      doc.addPage();
      drawFormalReportPage(doc, "Priority revisions");
      continued = true;
      y = drawPriorityHeader(doc, 27, priorities.length);
    }

    setRgb(doc, index % 2 === 0 ? reportFamily.priority : [67, 14, 14], "fill");
    doc.rect(page.margin, y, page.contentWidth, rowHeight, "F");
    setRgb(doc, [103, 39, 39], "draw");
    doc.line(page.margin + 6, y + rowHeight, page.width - page.margin - 6, y + rowHeight);
    setRgb(doc, criterion.status === "missing" ? [255, 107, 107] : [255, 179, 71], "fill");
    doc.circle(page.margin + 6, y + 6.5, 1.5, "F");

    setRgb(doc, [255, 224, 224]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.1);
    doc.text(titleLines, page.margin + 11, y + 5.8);
    setRgb(doc, [255, 206, 206]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    doc.text(bodyLines, page.margin + 11, y + 6 + titleLines.length * 3.8);

    setRgb(doc, [255, 144, 144]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.text(`${formatMark(lost)} mark${lost === 1 ? "" : "s"}`, page.width - page.margin - 5, y + 7, { align: "right" });
    y += rowHeight;
  });
  return { y, continued };
};

const drawSectionCard = (doc: jsPDF, section: RubricSection, x: number, y: number, width: number) => {
  const compact = width < 70;
  const height = compact ? 44 : 39;
  const score = percentage(section.awarded, section.marks);
  const tone = scoreTone(score);
  const counts = section.criteria.reduce(
    (total, criterion) => {
      total[criterion.status] += 1;
      return total;
    },
    { met: 0, partial: 0, missing: 0 } as Record<MarkingStatus, number>
  );
  const fullMarks = section.criteria
    .filter((criterion) => criterion.status === "met")
    .reduce((sum, criterion) => sum + criterion.marks, 0);
  const partialMarks = section.criteria
    .filter((criterion) => criterion.status === "partial")
    .reduce((sum, criterion) => sum + criterion.awarded, 0);
  const barWidth = width - 12;

  setRgb(doc, reportFamily.card, "fill");
  setRgb(doc, reportFamily.border, "draw");
  doc.roundedRect(x, y, width, height, 3, 3, "FD");
  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.1);
  const overviewTitle = section.title.toLowerCase().includes("discussion")
    ? "Discussion & conclusions"
    : section.title;
  doc.text(doc.splitTextToSize(overviewTitle, width - 25), x + 6, y + 8);
  setRgb(doc, tone);
  doc.setFontSize(13.5);
  doc.text(`${score}%`, x + width - 6, y + 9, { align: "right" });
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.text(`${formatMark(section.awarded)} / ${formatMark(section.marks)} marks`, x + width - 6, y + 15, { align: "right" });

  setRgb(doc, [232, 237, 245], "fill");
  doc.roundedRect(x + 6, y + 21, barWidth, 3.2, 1.6, 1.6, "F");
  if (section.marks > 0) {
    const fullWidth = barWidth * (fullMarks / section.marks);
    const partialWidth = barWidth * (partialMarks / section.marks);
    if (fullWidth > 0) {
      setRgb(doc, reportFamily.green, "fill");
      doc.rect(x + 6, y + 21, fullWidth, 3.2, "F");
    }
    if (partialWidth > 0) {
      setRgb(doc, reportFamily.amberBright, "fill");
      doc.rect(x + 6 + fullWidth, y + 21, partialWidth, 3.2, "F");
    }
  }

  const pills = [
    counts.met ? { text: `${counts.met} awarded`, fill: reportFamily.greenSoft, tone: reportFamily.green } : null,
    counts.partial ? { text: `${counts.partial} partial`, fill: reportFamily.amberSoft, tone: reportFamily.amber } : null,
    counts.missing ? { text: `${counts.missing} not awarded`, fill: reportFamily.redSoft, tone: reportFamily.red } : null,
  ].filter(Boolean) as { text: string; fill: PdfRgb; tone: PdfRgb }[];
  let pillX = x + 6;
  let pillY = y + 28;
  pills.forEach((pill) => {
    const pillWidth = Math.max(18, doc.getTextWidth(pill.text) + 7);
    if (pillX + pillWidth > x + width - 6) {
      pillX = x + 6;
      pillY += 8;
    }
    drawPill(doc, pillX, pillY, pillWidth, pill.text, pill.fill, pill.tone, 5.7);
    pillX += pillWidth + 2;
  });
};

const drawOverview = (
  doc: jsPDF,
  sections: RubricSection[],
  continuation?: { y: number; continued: boolean }
) => {
  const columns = continuation?.continued ? 3 : 2;
  const rows = Math.ceil(sections.length / columns);
  const rowHeight = columns === 3 ? 50 : 45;
  const requiredHeight = 18 + rows * rowHeight + 27;
  const canContinue = Boolean(
    continuation?.continued && continuation.y + 8 + requiredHeight <= contentBottom
  );
  if (!canContinue) {
    doc.addPage();
    drawFormalReportPage(doc, "Marking guide overview");
  }
  const headingY = canContinue ? (continuation?.y ?? 27) + 10 : 32;
  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Section overview", page.margin, headingY);
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Awarded, partial, and not awarded outcomes are shown directly from the marking guide.", page.margin, headingY + 7);

  const gap = 6;
  const width = (page.contentWidth - gap * (columns - 1)) / columns;
  const cardsY = headingY + 16;
  sections.forEach((section, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    drawSectionCard(doc, section, page.margin + column * (width + gap), cardsY + row * rowHeight, width);
  });

  const legendY = cardsY + rows * rowHeight + 4;
  setRgb(doc, reportFamily.card, "fill");
  setRgb(doc, reportFamily.border, "draw");
  doc.roundedRect(page.margin, legendY, page.contentWidth, 25, 3, 3, "FD");
  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.3);
  doc.text("How to read this report", page.margin + 6, legendY + 8);
  const legend = [
    { label: "Awarded: requirement fully evidenced", tone: reportFamily.green },
    { label: "Partial: some evidence, marks still available", tone: reportFamily.amber },
    { label: "Not awarded: required evidence not found", tone: reportFamily.red },
  ];
  legend.forEach((item, index) => {
    const x = page.margin + 6 + index * 58;
    setRgb(doc, item.tone, "fill");
    doc.circle(x, legendY + 16, 1.4, "F");
    setRgb(doc, reportFamily.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.9);
    doc.text(doc.splitTextToSize(item.label, 50), x + 4, legendY + 17);
  });
};

const cleanGuidance = (criterion: RubricCriterion) =>
  criterion.guidance.replace(/^[A-Za-z ]+ evidence:\s*/i, "").replace(/\s+/g, " ").trim();

const criterionEvidence = (criterion: RubricCriterion) => {
  const location = criterion.pageNumber ? `, page ${criterion.pageNumber}` : "";
  if (criterion.status === "met") {
    return criterion.evidenceSnippet
      ? `Evidence found${location}: ${criterion.evidenceSnippet}`
      : `Evidence found${location}: ${cleanGuidance(criterion)}`;
  }
  if (criterion.status === "partial") {
    const evidence = criterion.evidenceSnippet ? ` Evidence found${location}: ${criterion.evidenceSnippet}` : "";
    return `Partial: ${cleanGuidance(criterion)}${evidence}`;
  }
  return `Required: ${cleanGuidance(criterion)} No matching evidence was found in the relevant section.`;
};

const measureCriterionRow = (doc: jsPDF, criterion: RubricCriterion) => {
  const titleLines = doc.splitTextToSize(criterion.label, 119);
  const evidenceLines = doc.splitTextToSize(criterionEvidence(criterion), 119);
  return {
    titleLines,
    evidenceLines,
    height: Math.max(25, 10 + titleLines.length * 4.2 + evidenceLines.length * 3.9),
  };
};

const drawCriterionSectionHeader = (doc: jsPDF, section: RubricSection, index: number, y: number, repeated = false) => {
  const score = percentage(section.awarded, section.marks);
  const tone = scoreTone(score);
  setRgb(doc, repeated ? [247, 249, 252] : reportFamily.card, "fill");
  setRgb(doc, reportFamily.border, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, 15, 3, 3, "FD");
  setRgb(doc, reportFamily.background, "fill");
  doc.roundedRect(page.margin + 5, y + 3, 9, 9, 2, 2, "F");
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(String(index + 1), page.margin + 9.5, y + 8.8, { align: "center" });
  setRgb(doc, reportFamily.text);
  doc.setFontSize(8.8);
  doc.text(truncate(section.title, 64), page.margin + 19, y + 9.2);
  setRgb(doc, reportFamily.muted);
  doc.setFontSize(7.8);
  doc.text(`${formatMark(section.awarded)} / ${formatMark(section.marks)}`, page.width - page.margin - 31, y + 9.2, { align: "right" });
  drawPill(doc, page.width - page.margin - 24, y + 4, 19, `${score}%`, statusMeta(score === 100 ? "met" : score > 0 ? "partial" : "missing").fill, tone, 6.2);
  return y + 19;
};

const drawCriterionRow = (
  doc: jsPDF,
  criterion: RubricCriterion,
  criterionNumber: number,
  y: number,
  measured: ReturnType<typeof measureCriterionRow>
) => {
  const meta = statusMeta(criterion.status);
  const awarded = Math.min(criterion.awarded, criterion.marks);
  const lost = Math.max(0, criterion.marks - awarded);
  setRgb(doc, reportFamily.card, "fill");
  setRgb(doc, reportFamily.border, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, measured.height, 2.5, 2.5, "FD");
  setRgb(doc, meta.tone, "fill");
  doc.roundedRect(page.margin, y, 2.3, measured.height, 1.2, 1.2, "F");

  setRgb(doc, reportFamily.faint);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.text(String(criterionNumber), page.margin + 7, y + 7);

  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.7);
  doc.text(measured.titleLines, page.margin + 14, y + 7);
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.7);
  doc.text(measured.evidenceLines, page.margin + 14, y + 8 + measured.titleLines.length * 4.2);

  const right = page.width - page.margin - 5;
  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`${formatMark(awarded)}/${formatMark(criterion.marks)}`, right, y + 7, { align: "right" });
  drawPill(doc, right - 29, y + 10, 29, meta.label, meta.fill, meta.tone, 5.9);
  if (lost > 0) {
    drawPill(doc, right - 29, y + 19, 29, `Recover ${formatMark(lost)} mark${lost === 1 ? "" : "s"}`, meta.fill, meta.tone, 5.2);
  }
  return y + measured.height + cardGap;
};

const drawCriteria = (doc: jsPDF, sections: RubricSection[]) => {
  doc.addPage();
  drawFormalReportPage(doc, "Criterion-by-criterion marking");
  setRgb(doc, reportFamily.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Criterion-by-criterion detail", page.margin, 32);
  setRgb(doc, reportFamily.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Every marking-guide criterion is expanded with its exact marks, evidence, and required correction.", page.margin, 39);
  let y = 48;
  let criterionNumber = 1;

  sections.forEach((section, sectionIndex) => {
    const firstMeasure = section.criteria[0] ? measureCriterionRow(doc, section.criteria[0]) : null;
    if (y + 19 + (firstMeasure?.height ?? 0) > contentBottom) {
      doc.addPage();
      drawFormalReportPage(doc, "Criterion-by-criterion marking");
      y = 27;
    }
    y = drawCriterionSectionHeader(doc, section, sectionIndex, y);

    section.criteria.forEach((criterion) => {
      const measured = measureCriterionRow(doc, criterion);
      if (y + measured.height > contentBottom) {
        doc.addPage();
        drawFormalReportPage(doc, "Criterion-by-criterion marking");
        y = drawCriterionSectionHeader(doc, section, sectionIndex, 27, true);
      }
      y = drawCriterionRow(doc, criterion, criterionNumber, y, measured);
      criterionNumber += 1;
    });
    y += 3;
  });
};

export const createMarkingGuidePdfDocument = (
  result: AnalysisResult,
  documentType: DocumentType,
  component: string,
  fileName: string,
  studentName?: string
) => {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const sections = result.rubricScore?.sections ?? [];
  const awarded = Math.min(result.rubricScore?.awarded ?? result.matchedGuidelines, result.rubricScore?.total ?? result.totalGuidelines);
  const total = result.rubricScore?.total ?? result.totalGuidelines;
  const score = total > 0 ? Math.round((awarded / total) * 1000) / 10 : 0;
  const counts = countStatuses(sections);
  const priorities = sections.flatMap((section) =>
    section.criteria
      .filter((criterion) => criterion.status !== "met")
      .map((criterion) => ({ section, criterion }))
  );
  const recoverable = sections.reduce(
    (sum, section) => sum + section.criteria.reduce((criterionSum, criterion) => criterionSum + Math.max(0, criterion.marks - criterion.awarded), 0),
    0
  );
  const reportId = createFormalReportId(fileName, "MRA");

  doc.setProperties({
    title: `UHPAB Marking Report - ${fileName || "Document"}`,
    subject: "Criterion-by-criterion research report marking guide",
    author: "UHPAB Research Assistant",
    creator: "UHPAB Research Assistant",
  });

  drawHero(doc, fileName, documentType, component, studentName, score, priorities.length, reportId);
  drawStatsBar(doc, counts, recoverable);
  const priorityFlow = drawPriorities(doc, priorities);

  if (sections.length) {
    drawOverview(doc, sections, priorityFlow);
    drawCriteria(doc, sections);
  } else {
    doc.addPage();
    drawFormalReportPage(doc, "Marking guide report");
    setRgb(doc, reportFamily.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("No detailed rubric data available", page.margin, 34);
    setRgb(doc, reportFamily.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Run a report marking-guide check to generate criterion-by-criterion evidence and marks.", page.margin, 44);
  }

  drawFormalFooters(doc, reportId, "UHPAB marking report");
  return doc;
};

export const downloadMarkingGuidePdf = (
  result: AnalysisResult,
  documentType: DocumentType,
  component: string,
  fileName: string,
  studentName?: string
) => {
  const doc = createMarkingGuidePdfDocument(result, documentType, component, fileName, studentName);
  const blobUrl = URL.createObjectURL(doc.output("blob"));
  const outputName = sanitizeFileName(`marking-report-${fileName || "document"}.pdf`);
  triggerBrowserDownload(blobUrl, outputName, {
    message: "Professional marking report export started",
  });
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
};
