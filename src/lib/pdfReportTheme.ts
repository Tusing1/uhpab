import type { jsPDF } from "jspdf";

export type PdfRgb = [number, number, number];

export const page = {
  width: 210,
  height: 297,
  margin: 14,
  contentWidth: 182,
  contentBottom: 256,
};

export const brand = {
  ink: [17, 28, 43] as PdfRgb,
  muted: [79, 99, 117] as PdfRgb,
  line: [212, 220, 233] as PdfRgb,
  teal: [11, 30, 53] as PdfRgb,
  tealDark: [26, 51, 80] as PdfRgb,
  softTeal: [232, 240, 252] as PdfRgb,
  white: [255, 255, 255] as PdfRgb,
  paper: [238, 241, 247] as PdfRgb,
  skySoft: [232, 240, 252] as PdfRgb,
  amberSoft: [255, 240, 224] as PdfRgb,
  roseSoft: [253, 234, 234] as PdfRgb,
  greenSoft: [230, 245, 238] as PdfRgb,
};

export const accent = {
  teal: [21, 88, 168] as PdfRgb,
  green: [10, 122, 71] as PdfRgb,
  amber: [184, 85, 0] as PdfRgb,
  rose: [179, 27, 27] as PdfRgb,
  blue: [21, 88, 168] as PdfRgb,
  slate: [79, 99, 117] as PdfRgb,
};

// Shared visual language for formal UHPAB exports. These values mirror the
// approved marking-report reference and are intentionally separate from the
// older accent aliases so every export can migrate without changing its data.
export const reportFamily = {
  navy: [11, 30, 53] as PdfRgb,
  navyMid: [26, 51, 80] as PdfRgb,
  navySoft: [43, 74, 107] as PdfRgb,
  background: [238, 241, 247] as PdfRgb,
  card: [255, 255, 255] as PdfRgb,
  border: [212, 220, 233] as PdfRgb,
  text: [17, 28, 43] as PdfRgb,
  muted: [79, 99, 117] as PdfRgb,
  faint: [138, 155, 176] as PdfRgb,
  green: [10, 122, 71] as PdfRgb,
  greenSoft: [230, 245, 238] as PdfRgb,
  amber: [184, 85, 0] as PdfRgb,
  amberBright: [232, 152, 10] as PdfRgb,
  amberSoft: [255, 240, 224] as PdfRgb,
  red: [179, 27, 27] as PdfRgb,
  redSoft: [253, 234, 234] as PdfRgb,
  blue: [21, 88, 168] as PdfRgb,
  blueSoft: [232, 240, 252] as PdfRgb,
  priority: [58, 10, 10] as PdfRgb,
  priorityMid: [90, 20, 20] as PdfRgb,
};

export type FormalHeroChipTone = "neutral" | "success" | "warning" | "danger" | "blue";

export type FormalHeroOptions = {
  reportId: string;
  fileName: string;
  metaLines: string[];
  chips: { label: string; tone?: FormalHeroChipTone }[];
  metric?: {
    value: string;
    denominator?: string;
    label: string;
    caption?: string;
    progress?: number;
    tone?: PdfRgb;
  };
};

export type FormalStat = {
  value: string | number;
  label: string | string[];
  tone: PdfRgb;
};

export const createFormalReportId = (seed: string, prefix = "RPT") => {
  let hash = 2166136261;
  for (const char of seed || "document") {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}${Math.abs(hash).toString(36).toUpperCase().slice(0, 6).padStart(6, "0")}`;
};

export const formatFormalReportDate = () =>
  new Date().toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const heroChipPalette: Record<FormalHeroChipTone, { fill: PdfRgb; text: PdfRgb }> = {
  neutral: { fill: reportFamily.navyMid, text: [200, 216, 232] },
  success: { fill: [24, 70, 55], text: [148, 225, 177] },
  warning: { fill: [83, 58, 25], text: [255, 195, 112] },
  danger: { fill: [78, 34, 43], text: [255, 154, 154] },
  blue: { fill: [25, 57, 96], text: [157, 196, 238] },
};

const drawFormalHeroChip = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  tone: FormalHeroChipTone
) => {
  const palette = heroChipPalette[tone];
  setRgb(doc, palette.fill, "fill");
  doc.roundedRect(x, y, width, 7, 3.5, 3.5, "F");
  setRgb(doc, palette.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text(label, x + width / 2, y + 4.8, { align: "center" });
};

export const drawFormalScoreRing = (
  doc: jsPDF,
  x: number,
  y: number,
  value: string,
  progress: number,
  tone: PdfRgb = [79, 200, 122],
  denominator = "/100"
) => {
  const radius = 16;
  doc.setLineCap("round");
  doc.setLineWidth(2.3);
  for (let step = 0; step < 100; step += 1) {
    const start = ((step * 3.6 - 90) * Math.PI) / 180;
    const end = (((step + 0.62) * 3.6 - 90) * Math.PI) / 180;
    setRgb(doc, step < Math.max(0, Math.min(100, progress)) ? tone : reportFamily.navySoft, "draw");
    doc.line(
      x + Math.cos(start) * radius,
      y + Math.sin(start) * radius,
      x + Math.cos(end) * radius,
      y + Math.sin(end) * radius
    );
  }
  doc.setLineCap("butt");
  setRgb(doc, reportFamily.card);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(value.length > 4 ? 15 : 17);
  doc.text(value, x, y + 1, { align: "center" });
  setRgb(doc, [127, 163, 200]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(denominator, x, y + 7, { align: "center" });
};

export const drawFormalHero = (doc: jsPDF, options: FormalHeroOptions) => {
  setRgb(doc, reportFamily.background, "fill");
  doc.rect(0, 0, page.width, page.height, "F");
  setRgb(doc, reportFamily.navy, "fill");
  doc.rect(0, 0, page.width, 68, "F");

  setRgb(doc, [127, 163, 200]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(`UHPAB REPORT  |  ${options.reportId}`, page.margin, 15);
  setRgb(doc, reportFamily.card);
  doc.setFontSize(16);
  doc.text(truncate(options.fileName || "Document", 64), page.margin, 28);

  setRgb(doc, [148, 175, 202]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  options.metaLines.slice(0, 2).forEach((line, index) => {
    doc.text(truncate(line, 88), page.margin, 37 + index * 6);
  });

  let chipX = page.margin;
  const chipY = options.metaLines.length > 1 ? 50 : 44;
  options.chips.slice(0, 4).forEach((chip) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    const width = Math.max(21, Math.min(46, doc.getTextWidth(chip.label) + 10));
    drawFormalHeroChip(doc, chipX, chipY, width, chip.label, chip.tone || "neutral");
    chipX += width + 4;
  });

  if (options.metric) {
    const metric = options.metric;
    drawFormalScoreRing(
      doc,
      174,
      29,
      metric.value,
      metric.progress ?? 100,
      metric.tone,
      metric.denominator || ""
    );
    setRgb(doc, [127, 163, 200]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(metric.label.toUpperCase(), 174, 51, { align: "center" });
    if (metric.caption) {
      setRgb(doc, metric.tone || [110, 185, 127]);
      doc.setFontSize(7.4);
      doc.text(metric.caption, 174, 58, { align: "center" });
    }
  }
};

export const drawFormalStatsBar = (doc: jsPDF, stats: FormalStat[], y = 76) => {
  const visibleStats = stats.slice(0, 4);
  const column = page.contentWidth / visibleStats.length;
  setRgb(doc, reportFamily.card, "fill");
  setRgb(doc, reportFamily.border, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, 29, 3, 3, "FD");
  visibleStats.forEach((stat, index) => {
    const center = page.margin + column * index + column / 2;
    if (index > 0) {
      setRgb(doc, reportFamily.border, "draw");
      doc.line(page.margin + column * index, y + 5, page.margin + column * index, y + 24);
    }
    setRgb(doc, stat.tone);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(String(stat.value), center, y + 13, { align: "center" });
    setRgb(doc, reportFamily.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    doc.text(Array.isArray(stat.label) ? stat.label : [stat.label], center, y + 19, { align: "center" });
  });
};

export const drawFormalFooters = (
  doc: jsPDF,
  reportId: string,
  footerLabel: string,
  startPage = 1
) => {
  const totalPages = doc.getNumberOfPages();
  for (let current = startPage; current <= totalPages; current += 1) {
    doc.setPage(current);
    setRgb(doc, reportFamily.border, "draw");
    doc.line(page.margin, 283, page.width - page.margin, 283);
    setRgb(doc, reportFamily.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.text(`${footerLabel}  |  ${reportId}`, page.margin, 289);
    doc.text(`Page ${current} of ${totalPages}`, page.width - page.margin, 289, { align: "right" });
  }
};

export const drawFormalHeaderBand = (doc: jsPDF, title: string) => {
  setRgb(doc, reportFamily.navy, "fill");
  doc.rect(0, 0, page.width, 18, "F");

  setRgb(doc, reportFamily.card);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("UHPAB Research Assistant", page.margin, 11.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(title, page.width - page.margin, 11.5, { align: "right" });
};

export const drawFormalReportPage = (doc: jsPDF, title: string) => {
  setRgb(doc, reportFamily.background, "fill");
  doc.rect(0, 0, page.width, page.height, "F");
  drawFormalHeaderBand(doc, title);
};

export const setRgb = (
  doc: jsPDF,
  rgb: PdfRgb,
  target: "text" | "fill" | "draw" = "text"
) => {
  if (target === "fill") doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  if (target === "draw") doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  if (target === "text") doc.setTextColor(rgb[0], rgb[1], rgb[2]);
};

export const truncate = (value: string, limit = 72) =>
  value.length > limit ? `${value.slice(0, limit - 3)}...` : value;

export const cleanPdfText = (text: string | undefined | null) =>
  (text || "Not provided")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const drawReportShell = (doc: jsPDF, title = "Review Report") => {
  drawFormalReportPage(doc, title);
};

export const drawCoverHeader = (doc: jsPDF, reportId?: string) => {
  setRgb(doc, reportFamily.background, "fill");
  doc.rect(0, 0, page.width, page.height, "F");
  setRgb(doc, reportFamily.navy, "fill");
  doc.rect(0, 0, page.width, 42, "F");
  setRgb(doc, reportFamily.navyMid, "fill");
  doc.rect(0, 42, page.width, 4, "F");

  setRgb(doc, brand.white, "draw");
  doc.setLineWidth(0.6);
  doc.roundedRect(page.margin, 18, 27, 12, 2, 2, "S");
  setRgb(doc, brand.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("UHPAB", page.margin + 4, 26);

  setRgb(doc, brand.softTeal);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Report ID  ${reportId || Date.now().toString(36).toUpperCase()}`,
    page.width - page.margin,
    26,
    { align: "right" }
  );
};

export const drawFooter = (
  doc: jsPDF,
  startPage = 1,
  footerText = "Generated for academic review."
) => {
  drawFormalFooters(doc, "ACADEMIC", footerText, startPage);
};

export const ensureReportSpace = (doc: jsPDF, y: number, neededHeight: number, title = "Review Report") => {
  if (y + neededHeight <= page.contentBottom) return y;
  doc.addPage();
  drawReportShell(doc, title);
  return 32;
};

export const sectionTitle = (doc: jsPDF, title: string, y: number, subtitle?: string) => {
  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, page.margin, y);
  if (subtitle) {
    setRgb(doc, brand.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(subtitle, page.contentWidth), page.margin, y + 6);
    return y + 12;
  }
  return y + 7;
};

export const coverMetric = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  fill: PdfRgb,
  metricAccent: PdfRgb
) => {
  setRgb(doc, fill, "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(x, y, width, 34, 4, 4, "FD");
  setRgb(doc, metricAccent, "fill");
  doc.roundedRect(x, y, 3.2, 34, 2, 2, "F");
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(label.toUpperCase(), x + 8, y + 10);
  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(value, x + 8, y + 25);
};

export const metricCard = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  fill: PdfRgb,
  metricAccent: PdfRgb
) => {
  setRgb(doc, fill, "fill");
  setRgb(doc, [203, 213, 225], "draw");
  doc.roundedRect(x, y, width, 31, 3, 3, "FD");
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(label, x + 5, y + 9);
  setRgb(doc, metricAccent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(value, x + 5, y + 24);
};

export const percentPill = (doc: jsPDF, x: number, y: number, value: string, pillAccent: PdfRgb) => {
  setRgb(doc, pillAccent, "fill");
  doc.roundedRect(x, y, 21, 8.5, 4, 4, "F");
  setRgb(doc, brand.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(value, x + 10.5, y + 5.8, { align: "center" });
};

export const labelPill = (doc: jsPDF, x: number, y: number, value: string, pillAccent: PdfRgb, width = 38) => {
  setRgb(doc, pillAccent, "fill");
  doc.roundedRect(x, y, width, 8.5, 4, 4, "F");
  setRgb(doc, brand.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.text(value, x + width / 2, y + 5.8, { align: "center" });
};

export const keyValue = (doc: jsPDF, label: string, value: string, x: number, y: number) => {
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(label, x, y);
  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(truncate(value, 48), x, y + 6);
};
