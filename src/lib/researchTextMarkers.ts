import { jsPDF } from "jspdf";
import type { AnalysisResult, DocumentType } from "@/utils/documentAnalysis";
import { sanitizeFileName, triggerBrowserDownload } from "@/lib/download";
import {
  createMarkingGuidePdfDocument,
  downloadMarkingGuidePdf,
} from "@/lib/markingGuidePdf";
import {
  accent as reportAccent,
  brand,
  coverMetric,
  createFormalReportId,
  drawCoverHeader,
  drawFooter,
  drawFormalFooters,
  drawFormalHero,
  drawFormalStatsBar,
  drawReportShell,
  ensureReportSpace,
  keyValue,
  labelPill,
  metricCard,
  page,
  percentPill,
  sectionTitle,
  setRgb,
  truncate,
  formatFormalReportDate,
} from "@/lib/pdfReportTheme";

export type MarkerTone = "neutral" | "common" | "moderate" | "high" | "citation" | "missing";

export type MarkedPassage = {
  id: string;
  text: string;
  tone: MarkerTone;
  label: string;
  location: string;
  reason: string;
  suggestion: string;
};

export type PlagiarismReport = {
  originalityScore: number;
  similarityScore: number;
  commonLanguagePercent: number;
  uncommonFlagCount: number;
  filteredFromReport: string[];
  matchGroups: {
    label: string;
    count: number;
    percent: number;
    description: string;
    tone: MarkerTone;
  }[];
  topSources: {
    type: "Internet" | "Publication" | "Student papers";
    name: string;
    percent: number;
  }[];
  passages: MarkedPassage[];
  summary: string;
};

export const passageReviewLabel = (tone: MarkerTone) => {
  if (tone === "high" || tone === "missing") return "High attention";
  if (tone === "moderate") return "Review wording";
  if (tone === "citation") return "Citation check";
  if (tone === "common") return "Excluded wording";
  return "No concern";
};

export const passageReviewDescription = (tone: MarkerTone) => {
  if (tone === "high" || tone === "missing") return "Rewrite and verify source use before submission.";
  if (tone === "moderate") return "Add citation support or rewrite for clearer ownership.";
  if (tone === "citation") return "Confirm the reference list contains the cited source.";
  if (tone === "common") return "Expected research structure, excluded from review attention.";
  return "No action needed unless the idea requires a citation.";
};

const commonResearchTerms = new Set([
  "abstract",
  "background",
  "conclusion",
  "confidentiality",
  "consent",
  "data",
  "design",
  "discussion",
  "ethical",
  "findings",
  "introduction",
  "literature",
  "methodology",
  "objective",
  "objectives",
  "population",
  "purpose",
  "questionnaire",
  "recommendations",
  "references",
  "research",
  "respondents",
  "results",
  "sample",
  "sampling",
  "significance",
  "study",
  "variables",
]);

const commonResearchPhrases = [
  "this chapter presents",
  "this chapter presents the background of the study",
  "this study sought to",
  "it is against this background",
  "the findings of the study revealed",
  "the researcher recommends that",
  "based on the findings",
  "the study concluded that",
  "background of the study",
  "the purpose of the study",
  "the significance of the study",
  "specific objectives",
  "research questions",
  "problem statement",
  "justification and significance of the study",
  "study population",
  "sample size",
  "data collection",
  "data analysis",
  "ethical considerations",
  "informed consent",
  "confidentiality was maintained",
  "literature review",
  "study findings",
  "recommendations were made",
];

const suspiciousAcademicPatterns = [
  "there is limited information",
  "little is known about",
  "no study has been conducted",
  "poor performance of students",
  "future healthcare professionals",
];

const colors: Record<MarkerTone, [number, number, number]> = {
  neutral: [241, 245, 249],
  common: [226, 232, 240],
  moderate: [254, 243, 199],
  high: [254, 226, 226],
  citation: [219, 234, 254],
  missing: [255, 228, 230],
};

const textColor: Record<MarkerTone, [number, number, number]> = {
  neutral: [51, 65, 85],
  common: [71, 85, 105],
  moderate: [146, 64, 14],
  high: [153, 27, 27],
  citation: [30, 64, 175],
  missing: [159, 18, 57],
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (text: string) => normalize(text).split(" ").filter(Boolean);

const countCommonResearchWords = (text: string) => words(text).filter((word) => commonResearchTerms.has(word)).length;

const splitLongPassage = (text: string, maxCharacters = 620) => {
  if (text.length <= maxCharacters) return [text];

  const chunks: string[] = [];
  let current = "";
  text.split(/\s+/).forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharacters && current) {
      chunks.push(current);
      current = word;
      return;
    }
    current = candidate;
  });
  if (current) chunks.push(current);
  return chunks;
};

const sentenceChunks = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .flatMap((chunk) => splitLongPassage(chunk))
    .filter((chunk) => chunk.length > 30)
    .slice(0, 26);

const isSimilarityReportMetadata = (text: string) =>
  /(integrity overview|integrity submission|submission id\s*trn:|filtered from the report|match groups|top sources|student papers\s+.+\s+on\s+\d{4}-\d{2}-\d{2})/i.test(
    text
  );

const pageForIndex = (index: number) => `Page ${Math.floor(index / 4) + 1}, Paragraph ${(index % 4) + 1}`;

export const buildMarkedPlagiarismReport = (text: string): PlagiarismReport => {
  const cleanText = text.trim();
  const chunks = sentenceChunks(cleanText);
  const totalWords = Math.max(words(cleanText).length, 1);
  const commonLanguagePercent = Math.round((countCommonResearchWords(cleanText) / totalWords) * 100);

  const passages: MarkedPassage[] = chunks.slice(0, 14).map((chunk, index) => {
    const chunkWords = words(chunk);
    const commonRatio = chunkWords.length
      ? chunkWords.filter((word) => commonResearchTerms.has(word)).length / chunkWords.length
      : 0;
    const hasCitation = /\([A-Z][A-Za-z-]+,\s?\d{4}\)|\bet al\.\b|\d{4}/.test(chunk);
    const repeated = suspiciousAcademicPatterns.find((phrase) => normalize(chunk).includes(phrase));
    const isCommonResearchPhrase = commonResearchPhrases.some((phrase) => normalize(chunk).includes(phrase));
    const longFormalSentence = chunk.length > 260 && !hasCitation && commonRatio < 0.1 && !isCommonResearchPhrase;

    if (isSimilarityReportMetadata(chunk)) {
      return {
        id: `passage-${index}`,
        text: chunk,
        tone: "common",
        label: "Similarity-report metadata",
        location: pageForIndex(index),
        reason: "Source-list and integrity-report metadata is excluded from student wording attention.",
        suggestion: "No rewrite is needed for report-generated metadata.",
      };
    }

    if ((repeated || longFormalSentence) && !isCommonResearchPhrase) {
      return {
        id: `passage-${index}`,
        text: chunk,
        tone: repeated ? "high" : "moderate",
        label: repeated ? "High attention phrase" : "Uncommon uncited wording",
        location: pageForIndex(index),
        reason: repeated
          ? "This phrase often appears in reused report templates and should be checked against the source."
          : "This sentence is long and formal but has no visible citation.",
        suggestion: "Rewrite in the student's own words and add a citation if the idea came from a source.",
      };
    }

    if (hasCitation) {
      return {
        id: `passage-${index}`,
        text: chunk,
        tone: "citation",
        label: "Citation evidence",
        location: pageForIndex(index),
        reason: "Citation-like evidence is present, so this passage needs reference-list alignment rather than plagiarism alarm.",
        suggestion: "Confirm the cited source appears in the reference list and follows APA style.",
      };
    }

    if (commonRatio > 0.16 || isCommonResearchPhrase) {
      return {
        id: `passage-${index}`,
        text: chunk,
        tone: "common",
        label: "Common research language",
        location: pageForIndex(index),
        reason: "These are expected research terms or section phrases, so they are kept neutral.",
        suggestion: "No rewrite needed unless the surrounding paragraph is copied from a source.",
      };
    }

    return {
      id: `passage-${index}`,
      text: chunk,
      tone: "neutral",
      label: "Original-looking wording",
      location: pageForIndex(index),
      reason: "No strong wording-reuse cue was detected in this passage.",
      suggestion: "Keep the wording clear and support factual claims with citations.",
    };
  });

  const highCount = passages.filter((passage) => passage.tone === "high").length;
  const moderateCount = passages.filter((passage) => passage.tone === "moderate").length;
  const citationCount = passages.filter((passage) => passage.tone === "citation").length;
  const commonCount = passages.filter((passage) => passage.tone === "common").length;
  const similarityScore = Math.min(88, highCount * 9 + moderateCount * 5);
  const originalityScore = Math.max(12, 100 - similarityScore);
  const submittedWorkPercent = Math.min(12, Math.max(0, highCount * 3 + moderateCount * 2));
  const internetPercent = Math.min(18, Math.max(0, highCount * 4 + moderateCount * 2));
  const publicationPercent = Math.min(8, Math.max(0, citationCount * 2));

  return {
    originalityScore,
    similarityScore,
    commonLanguagePercent,
    uncommonFlagCount: highCount + moderateCount,
    filteredFromReport: ["Bibliography", "Cited text", "Small matches below 10 words", "Default research structure"],
    matchGroups: [
      {
        label: highCount + moderateCount === 1 ? "passage needing source review" : "passages needing source review",
        count: highCount + moderateCount,
        percent: similarityScore,
        description: "Only uncommon uncited wording is counted here. Standard chapter structure is excluded.",
        tone: highCount > 0 ? "high" : moderateCount > 0 ? "moderate" : "common",
      },
      {
        label: highCount === 1 ? "high-attention passage" : "high-attention passages",
        count: highCount,
        percent: highCount > 0 ? Math.min(6, highCount * 2) : 0,
        description: "Template-like or strongly reusable wording that needs source verification.",
        tone: highCount > 0 ? "high" : "common",
      },
      {
        label: moderateCount === 1 ? "citation-support check" : "citation-support checks",
        count: moderateCount,
        percent: moderateCount > 0 ? Math.min(5, moderateCount * 2) : 0,
        description: "Ideas or formal statements that need source support.",
        tone: moderateCount > 0 ? "moderate" : "common",
      },
      {
        label: commonCount === 1 ? "common research passage" : "common research passages",
        count: commonCount,
        percent: 0,
        description: "Expected research wording is shown as neutral and excluded from review attention.",
        tone: "common",
      },
    ],
    topSources: [
      { type: "Internet", name: "Possible web sources", percent: internetPercent },
      { type: "Publication", name: "Citation-bearing publication text", percent: publicationPercent },
      { type: "Student papers", name: "Submitted research reports", percent: submittedWorkPercent },
    ].filter((source) => source.percent > 0),
    passages,
    summary:
      highCount + moderateCount > 0
        ? "The scan filtered ordinary research wording before scoring. Focus on red and amber passages, then confirm citations and references."
        : "The scan found mostly neutral research language and citation-like evidence. Continue checking references and originality before submission.",
  };
};

export const sampleAnalysisEvidence = (result: AnalysisResult): MarkedPassage[] => {
  const issues = result.issues.slice(0, 6);
  const rubricCriteria =
    result.rubricScore?.sections.flatMap((section) =>
      section.criteria
        .filter((criterion) => criterion.status !== "met")
        .map((criterion) => ({
          section: section.title,
          label: criterion.label,
          status: criterion.status,
          guidance: criterion.guidance,
        }))
    ) ?? [];

  return (rubricCriteria.length ? rubricCriteria : issues.map((issue) => ({ section: "Document", label: issue, status: "partial", guidance: issue }))).map(
    (item, index) => ({
      id: `evidence-${index}`,
      text: item.guidance,
      tone: item.status === "missing" ? "missing" : "moderate",
      label: `${item.section}: ${item.label}`,
      location: pageForIndex(index),
      reason: item.status === "missing" ? "Finding: marking-guide evidence was not identified for this criterion." : "Finding: partial marking-guide evidence was identified for this criterion.",
      suggestion: `Examiner note: ${item.guidance}`,
    })
  );
};

const addHeader = (doc: jsPDF, title: string, subtitle: string) => {
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(title, 14, 12);
  doc.setFontSize(10);
  doc.text(subtitle, 14, 20);
  doc.setTextColor(15, 23, 42);
};

const ensurePage = (doc: jsPDF, y: number) => {
  if (y <= 260) return y;
  doc.addPage();
  addHeader(doc, "UHPAB Research Assistant", "Marked review report");
  return 40;
};

const addMarkedPassage = (doc: jsPDF, passage: MarkedPassage, y: number) => {
  const fill = colors[passage.tone];
  const text = textColor[passage.tone];
  const lines = doc.splitTextToSize(passage.text, 166);
  const height = Math.max(28, lines.length * 5 + 23);

  y = ensurePage(doc, y + height);
  doc.setFillColor(fill[0], fill[1], fill[2]);
  doc.roundedRect(14, y, 182, height, 3, 3, "F");
  doc.setTextColor(text[0], text[1], text[2]);
  doc.setFontSize(10);
  doc.text(`${passage.label} - ${passage.location} - ${passageReviewLabel(passage.tone)}`, 20, y + 8);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(lines, 20, y + 16);
  doc.setTextColor(71, 85, 105);
  doc.text(doc.splitTextToSize(passage.suggestion, 166), 20, y + height - 7);
  doc.setTextColor(15, 23, 42);

  return y + height + 6;
};

const savePdf = (doc: jsPDF, fileName: string) => {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, sanitizeFileName(fileName));
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
};

const toneAccent = (tone: MarkerTone): [number, number, number] => {
  if (tone === "high" || tone === "missing") return [225, 29, 72];
  if (tone === "moderate") return [217, 119, 6];
  if (tone === "citation") return [37, 99, 235];
  if (tone === "common") return [71, 85, 105];
  return [20, 184, 166];
};

const addProfessionalPassage = (doc: jsPDF, passage: MarkedPassage, index: number, y: number) => {
  const availableWidth = 132;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const fullTextLines = doc.splitTextToSize(passage.text, availableWidth) as string[];
  const passageWasShortened = fullTextLines.length > 24;
  const shortenedNote = doc.splitTextToSize(
    "[Passage shortened in this PDF. Open the saved report to review the complete text.]",
    availableWidth
  ) as string[];
  const textLines = passageWasShortened
    ? [...fullTextLines.slice(0, Math.max(1, 24 - shortenedNote.length)), ...shortenedNote]
    : fullTextLines;
  const reasonLines = doc.splitTextToSize(
    passageWasShortened
      ? `${passage.reason} The complete passage remains available in the saved on-screen report.`
      : passage.reason,
    availableWidth
  );
  const actionLines =
    passage.tone === "common" || passage.tone === "neutral" ? [] : doc.splitTextToSize(passage.suggestion, availableWidth);
  const reviewLines = doc.splitTextToSize(passageReviewDescription(passage.tone), availableWidth);
  const height = Math.max(48, 37 + textLines.length * 5 + reasonLines.length * 4.5 + reviewLines.length * 4.3 + actionLines.length * 4.5);

  if (y + height > page.contentBottom) {
    doc.addPage();
    drawReportShell(doc, "Marked Passages");
    y = 32;
  }

  const fill = colors[passage.tone];
  const accent = toneAccent(passage.tone);
  setRgb(doc, fill, "fill");
  setRgb(doc, [203, 213, 225], "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, height, 3, 3, "FD");
  setRgb(doc, accent, "fill");
  doc.roundedRect(page.margin, y, 4, height, 2, 2, "F");

  setRgb(doc, accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(String(index + 1), page.margin + 8, y + 9);
  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(passage.label, 104), page.margin + 16, y + 9);

  labelPill(doc, page.width - 59, y + 5, passageReviewLabel(passage.tone), accent, 45);

  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(passage.location, page.margin + 16, y + 17);

  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(textLines, page.margin + 16, y + 26);
  let cursor = y + 26 + textLines.length * 5 + 4;

  setRgb(doc, brand.muted);
  doc.setFontSize(8);
  doc.text(reasonLines, page.margin + 16, cursor);
  cursor += reasonLines.length * 4.5 + 3;

  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(reviewLines, page.margin + 16, cursor);
  cursor += reviewLines.length * 4.3 + 3;

  if (actionLines.length > 0) {
    setRgb(doc, accent);
    doc.setFont("helvetica", "bold");
    doc.text(actionLines, page.margin + 16, cursor);
  }

  return y + height + 6;
};

const drawCoverPage = (doc: jsPDF, report: PlagiarismReport, fileName: string, studentName?: string) => {
  const reportId = createFormalReportId(fileName, "ORI");
  drawFormalHero(doc, {
    reportId,
    fileName: fileName || "Document text",
    metaLines: [
      `Generated ${formatFormalReportDate()}  |  Filtered originality review`,
      ...(studentName ? [`Student: ${studentName}`] : []),
    ],
    chips: [
      { label: "Originality review", tone: "blue" },
      { label: "Common wording excluded" },
      {
        label: `${report.uncommonFlagCount} passage${report.uncommonFlagCount === 1 ? "" : "s"} need review`,
        tone: report.uncommonFlagCount > 0 ? "danger" : "success",
      },
    ],
    metric: {
      value: String(report.originalityScore),
      denominator: "/100",
      label: "Original wording",
      caption: `${report.similarityScore}% review attention`,
      progress: report.originalityScore,
      tone: report.originalityScore >= 75 ? reportAccent.green : reportAccent.amber,
    },
  });

  drawFormalStatsBar(doc, [
    { value: `${report.originalityScore}%`, label: ["Original-looking", "wording"], tone: reportAccent.green },
    { value: `${report.similarityScore}%`, label: ["Review", "attention"], tone: reportAccent.rose },
    { value: `${report.commonLanguagePercent}%`, label: ["Common structure", "excluded"], tone: reportAccent.slate },
    { value: report.uncommonFlagCount, label: ["Passages needing", "review"], tone: reportAccent.blue },
  ]);

  let y = sectionTitle(doc, "Review interpretation", 119, "The result is calculated after expected research language is excluded.");
  const summaryLines = doc.splitTextToSize(report.summary, page.contentWidth);
  const interpretationHeight = 13 + summaryLines.length * 4.4;
  setRgb(doc, brand.white, "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, interpretationHeight, 3, 3, "FD");
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(summaryLines, page.margin + 6, y + 8);

  y += interpretationHeight + 10;
  y = sectionTitle(doc, "Excluded before scoring", y, "These expected features do not increase review attention.");
  report.filteredFromReport.forEach((item, index) => {
    const x = page.margin + (index % 2) * 91;
    const rowY = y + Math.floor(index / 2) * 13;
    setRgb(doc, brand.white, "fill");
    setRgb(doc, brand.line, "draw");
    doc.roundedRect(x, rowY, 84, 9, 2, 2, "FD");
    setRgb(doc, brand.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(truncate(item, 46), x + 4, rowY + 6);
  });

  y += Math.max(18, Math.ceil(report.filteredFromReport.length / 2) * 13 + 7);
  const noteLines = doc.splitTextToSize(
    "This local scan highlights wording patterns for academic review. Final decisions require student/source verification.",
    page.contentWidth - 10
  );
  setRgb(doc, [255, 255, 255], "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, 13 + noteLines.length * 4.2, 3, 3, "FD");
  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Reviewer note", page.margin + 5, y + 7);
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(noteLines, page.margin + 5, y + 13);
};

const drawOverviewPage = (doc: jsPDF, report: PlagiarismReport) => {
  doc.addPage();
  drawReportShell(doc, "Review Overview");
  let y = 34;
  y = sectionTitle(doc, "Review Groups", y, "Counts are calculated after common research structure has been filtered.");

  report.matchGroups.forEach((group) => {
    y = ensureReportSpace(doc, y, 28, "Review Overview");
    const accent = toneAccent(group.tone);
    const descriptionLines = doc.splitTextToSize(group.description, 120);
    const cardHeight = Math.max(22, 14 + descriptionLines.length * 4.2);
    setRgb(doc, [255, 255, 255], "fill");
    setRgb(doc, brand.line, "draw");
    doc.roundedRect(page.margin, y, page.contentWidth, cardHeight, 3, 3, "FD");
    setRgb(doc, accent, "fill");
    doc.circle(page.margin + 7, y + 10, 3.5, "F");
    setRgb(doc, brand.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${group.count} ${group.label}`, page.margin + 15, y + 8);
    setRgb(doc, brand.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(descriptionLines, page.margin + 15, y + 15);
    percentPill(doc, page.width - page.margin - 24, y + 5.5, `${group.percent}%`, accent);
    y += cardHeight + 5;
  });

  y += 7;
  y = ensureReportSpace(doc, y, 42, "Review Overview");
  y = sectionTitle(doc, "Possible Source Types", y, "These categories are estimates from the local wording review, not verified source matches.");
  if (report.topSources.length === 0) {
    setRgb(doc, brand.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("No meaningful source group after filtering common wording.", page.margin, y);
    y += 12;
  } else {
    for (let index = 0; index < report.topSources.length; index += 2) {
      y = ensureReportSpace(doc, y, 24, "Review Overview");
      const rowSources = report.topSources.slice(index, index + 2);
      rowSources.forEach((source, rowIndex) => {
        const x = page.margin + rowIndex * 91;
        const rowY = y;
        setRgb(doc, [255, 255, 255], "fill");
        setRgb(doc, brand.line, "draw");
        doc.roundedRect(x, rowY, 84, 20, 3, 3, "FD");
        setRgb(doc, brand.ink);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(source.type, x + 5, rowY + 8);
        setRgb(doc, brand.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(truncate(source.name, 34), x + 5, rowY + 15);
        labelPill(doc, x + 56, rowY + 6, "Review", toneAccent("moderate"), 24);
      });
      y += 26;
    }
    y += 6;
  }

  y += 8;
  y = ensureReportSpace(doc, y, 92, "Review Overview");
  y = sectionTitle(doc, "Legend", y);
  const legendItems: { label: string; tone: MarkerTone; detail: string }[] = [
    { label: "High attention", tone: "high", detail: "Template-like or reusable wording to verify" },
    { label: "Review wording", tone: "moderate", detail: "Uncited formal wording or weak source support" },
    { label: "Citation check", tone: "citation", detail: "Citation-like text to verify against references" },
    { label: "Excluded wording", tone: "common", detail: "Common research structure excluded from review attention" },
  ];
  legendItems.forEach((item) => {
    y = ensureReportSpace(doc, y, 18, "Review Overview");
    const accent = toneAccent(item.tone);
    setRgb(doc, colors[item.tone], "fill");
    setRgb(doc, brand.line, "draw");
    doc.roundedRect(page.margin, y, page.contentWidth, 14, 3, 3, "FD");
    setRgb(doc, accent, "fill");
    doc.circle(page.margin + 7, y + 7, 2.8, "F");
    setRgb(doc, brand.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(item.label, page.margin + 14, y + 6);
    setRgb(doc, brand.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(item.detail, page.margin + 64, y + 6);
    y += 18;
  });

  y = sectionTitle(doc, "How To Use This Review", y + 4, "Work through the colors in this order before submission.");
  const actionSteps = [
    { title: "Resolve red passages", detail: "Rewrite in your own words and verify the source or quotation." },
    { title: "Check amber and blue passages", detail: "Add source support and confirm every citation in the reference list." },
    { title: "Leave grey wording neutral", detail: "Common research structure does not need rewriting by itself." },
  ];
  actionSteps.forEach((step, index) => {
    y = ensureReportSpace(doc, y, 24, "Review Overview");
    setRgb(doc, brand.white, "fill");
    setRgb(doc, brand.line, "draw");
    doc.roundedRect(page.margin, y, page.contentWidth, 20, 3, 3, "FD");
    setRgb(doc, reportAccent.teal, "fill");
    doc.circle(page.margin + 7, y + 10, 3.5, "F");
    setRgb(doc, brand.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(String(index + 1), page.margin + 7, y + 12, { align: "center" });
    setRgb(doc, brand.ink);
    doc.setFontSize(9);
    doc.text(step.title, page.margin + 15, y + 8);
    setRgb(doc, brand.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(step.detail, page.margin + 15, y + 15);
    y += 24;
  });

  setRgb(doc, brand.skySoft, "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(page.margin, y + 2, page.contentWidth, 22, 3, 3, "FD");
  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Important limitation", page.margin + 6, y + 10);
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    doc.splitTextToSize("This local review does not verify matches against internet, publication, or student-paper databases.", page.contentWidth - 12),
    page.margin + 6,
    y + 17
  );
};

const drawMarkingCoverPage = (
  doc: jsPDF,
  result: AnalysisResult,
  documentType: DocumentType,
  component: string,
  fileName: string,
  studentName?: string
) => {
  const awardedMarks = result.rubricScore
    ? Math.min(result.rubricScore.awarded, result.rubricScore.total)
    : result.matchedGuidelines;
  const totalMarks = result.rubricScore?.total ?? result.totalGuidelines;
  const score = Math.round((awardedMarks / totalMarks) * 100);
  const coverCounts = result.rubricScore ? countRubricStatuses(result.rubricScore.sections) : null;
  const revisionCount = coverCounts ? coverCounts.partial + coverCounts.missing : result.issues.length;
  drawCoverHeader(doc);

  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Marking Guide", page.margin, 62);
  doc.text("Review Report", page.margin, 74);
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(truncate(fileName || "Document", 82), page.margin, 86);

  setRgb(doc, [255, 255, 255], "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(page.margin, 100, page.contentWidth, 38, 4, 4, "FD");
  keyValue(doc, "Student", studentName || "Not specified", 24, 114);
  keyValue(doc, "Generated", new Date().toLocaleString(), 24, 130);
  keyValue(doc, "Document type", documentType, 105, 114);
  keyValue(doc, "Checked section", component, 105, 130);

  coverMetric(doc, page.margin, 151, 56, "Marks awarded", `${awardedMarks}/${totalMarks}`, [239, 246, 255], [37, 99, 235]);
  coverMetric(doc, 77, 151, 56, "Readiness", `${score}%`, [236, 253, 245], [5, 150, 105]);
  coverMetric(doc, 140, 151, 56, "Need revision", `${revisionCount}`, [255, 251, 235], [217, 119, 6]);

  const awardedSections = result.rubricScore?.sections.filter((section) => section.awarded >= section.marks).length ?? 0;
  const sectionCount = result.rubricScore?.sections.length ?? 0;
  let y = sectionTitle(doc, "Review Snapshot", 199, "Criterion marks are tallied against the report marking guide.");

  const snapshotLines = [
    result.rubricScore
      ? `${awardedSections} of ${sectionCount} section${sectionCount === 1 ? "" : "s"} have full marks in the selected check.`
      : "Detailed rubric data was not available for this check.",
    "Use the criterion-by-criterion pages to revise partial or not awarded areas before submission.",
  ];

  setRgb(doc, [255, 255, 255], "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, 35, 3, 3, "FD");
  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Examiner-style summary", page.margin + 5, y + 8);
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize(snapshotLines.join(" "), page.contentWidth - 10), page.margin + 5, y + 16);

};

type MarkingStatus = "met" | "partial" | "missing";

const criterionStatusLabel = (status: MarkingStatus) => {
  if (status === "met") return "Awarded";
  if (status === "partial") return "Partial";
  return "Not awarded";
};

const criterionStatusTone = (status: MarkingStatus): [number, number, number] => {
  if (status === "met") return [5, 150, 105];
  if (status === "partial") return [217, 119, 6];
  return [225, 29, 72];
};

const criterionStatusFill = (status: MarkingStatus): [number, number, number] => {
  if (status === "met") return [220, 252, 231];
  if (status === "partial") return [254, 243, 199];
  return [255, 228, 230];
};

const criterionStatusDescription = (status: MarkingStatus) => {
  if (status === "met") return "The required evidence was found in the relevant section.";
  if (status === "partial") return "Some evidence was found, but the criterion is not fully satisfied.";
  return "The required evidence was not found in the relevant section.";
};

const examinerText = (text: string, status: MarkingStatus) => {
  const cleaned = text
    .replace(/^Examiner note:\s*/i, "")
    .replace(/^Finding:\s*/i, "")
    .replace(/^Compare your findings with studies reviewed earlier\.$/i, "Findings are compared with studies reviewed earlier.")
    .replace(/^Explain what the findings mean for nursing or health practice\.$/i, "Implications for nursing or health practice are stated.");

  if (status === "met") return `Evidence identified: ${cleaned}`;
  if (status === "partial") return `Partial evidence identified: ${cleaned}`;
  return `Evidence not identified: ${cleaned}`;
};

const countSectionStatuses = (section: NonNullable<AnalysisResult["rubricScore"]>["sections"][number]) =>
  section.criteria.reduce(
    (counts, criterion) => {
      counts[criterion.status] += 1;
      return counts;
    },
    { met: 0, partial: 0, missing: 0 } as Record<MarkingStatus, number>
  );

const countRubricStatuses = (sections: NonNullable<AnalysisResult["rubricScore"]>["sections"]) =>
  sections.reduce(
    (counts, section) => {
      const sectionCounts = countSectionStatuses(section);
      counts.met += sectionCounts.met;
      counts.partial += sectionCounts.partial;
      counts.missing += sectionCounts.missing;
      return counts;
    },
    { met: 0, partial: 0, missing: 0 } as Record<MarkingStatus, number>
  );

const drawProgressBar = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  percent: number,
  barAccent: [number, number, number]
) => {
  setRgb(doc, [226, 232, 240], "fill");
  doc.roundedRect(x, y, width, 3.2, 1.6, 1.6, "F");
  setRgb(doc, barAccent, "fill");
  doc.roundedRect(x, y, Math.max(3.2, (width * percent) / 100), 3.2, 1.6, 1.6, "F");
};

const drawStatusMiniLegend = (doc: jsPDF, y: number) => {
  y = ensureReportSpace(doc, y, 35, "Rubric Summary");
  setRgb(doc, brand.white, "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, 30, 3, 3, "FD");

  const items: { status: MarkingStatus; x: number }[] = [
    { status: "met", x: page.margin + 6 },
    { status: "partial", x: page.margin + 66 },
    { status: "missing", x: page.margin + 126 },
  ];

  items.forEach((item) => {
    const tone = criterionStatusTone(item.status);
    setRgb(doc, tone, "fill");
    doc.circle(item.x, y + 10, 2.8, "F");
    setRgb(doc, brand.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(criterionStatusLabel(item.status), item.x + 6, y + 9);
    setRgb(doc, brand.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    doc.text(doc.splitTextToSize(criterionStatusDescription(item.status), 48), item.x + 6, y + 15);
  });

  return y + 36;
};

const drawRubricSectionSummaryCard = (
  doc: jsPDF,
  section: NonNullable<AnalysisResult["rubricScore"]>["sections"][number],
  y: number
) => {
  const awarded = Math.min(section.awarded, section.marks);
  const percent = Math.round((awarded / section.marks) * 100);
  const counts = countSectionStatuses(section);
  const statusTone = percent >= 75 ? reportAccent.green : percent >= 50 ? reportAccent.amber : reportAccent.rose;
  const statusLine = `${counts.met} awarded - ${counts.partial} partial - ${counts.missing} not awarded`;
  const height = 30;
  y = ensureReportSpace(doc, y, height + 4, "Rubric Summary");

  setRgb(doc, brand.white, "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, height, 3, 3, "FD");
  setRgb(doc, statusTone, "fill");
  doc.roundedRect(page.margin, y, 3.2, height, 2, 2, "F");

  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(doc.splitTextToSize(section.title, 116), page.margin + 8, y + 8);
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(statusLine, page.margin + 8, y + 19);
  drawProgressBar(doc, page.margin + 8, y + 24, 116, percent, statusTone);

  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${awarded}/${section.marks}`, page.width - page.margin - 32, y + 12, { align: "center" });
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("marks", page.width - page.margin - 32, y + 18, { align: "center" });
  percentPill(doc, page.width - page.margin - 24, y + 21, `${percent}%`, statusTone);

  return y + height + 6;
};

const drawPriorityCriterionRow = (
  doc: jsPDF,
  sectionTitleText: string,
  criterion: {
    label: string;
    marks: number;
    awarded: number;
    status: MarkingStatus;
    guidance: string;
    evidenceSnippet?: string;
    pageNumber?: number | null;
  },
  y: number
) => {
  const accent = criterionStatusTone(criterion.status);
  const awarded = Math.min(criterion.awarded, criterion.marks);
  const lostMarks = Math.max(0, criterion.marks - awarded);
  const title = `${sectionTitleText}: ${criterion.label}`;
  const titleLines = doc.splitTextToSize(title, 122);
  const actionLines = doc.splitTextToSize(examinerText(criterion.guidance, criterion.status), 122);
  const height = Math.max(24, 14 + titleLines.length * 4.5 + actionLines.length * 4.2);
  y = ensureReportSpace(doc, y, height + 4, "Rubric Summary");

  setRgb(doc, criterionStatusFill(criterion.status), "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, height, 3, 3, "FD");
  setRgb(doc, accent, "fill");
  doc.roundedRect(page.margin, y, 3.2, height, 2, 2, "F");

  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.text(titleLines, page.margin + 8, y + 8);
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text(actionLines, page.margin + 8, y + 8 + titleLines.length * 4.5 + 4);

  setRgb(doc, accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(criterionStatusLabel(criterion.status), page.width - page.margin - 24, y + 8, { align: "center" });
  doc.text(`${lostMarks} mark${lostMarks === 1 ? "" : "s"} to recover`, page.width - page.margin - 24, y + 17, {
    align: "center",
  });

  return y + height + 5;
};

const addMarkingCriterionCard = (
  doc: jsPDF,
  sectionTitleText: string,
  criterion: {
    label: string;
    marks: number;
    awarded: number;
    status: MarkingStatus;
    guidance: string;
    evidenceSnippet?: string;
    pageNumber?: number | null;
  },
  index: number,
  y: number
) => {
  const accent = criterionStatusTone(criterion.status);
  const fill = criterionStatusFill(criterion.status);
  const awarded = Math.min(criterion.awarded, criterion.marks);
  const titleLines = doc.splitTextToSize(`${index + 1}. ${criterion.label}`, 106);
  const findingLines = doc.splitTextToSize(examinerText(criterion.guidance, criterion.status), 158);
  const evidenceText =
    criterion.evidenceSnippet && criterion.status !== "missing"
      ? `Evidence${criterion.pageNumber ? `, page ${criterion.pageNumber}` : ""}: ${criterion.evidenceSnippet}`
      : criterion.status === "missing"
        ? "Evidence: no matching text was found in the relevant section."
        : undefined;
  const evidenceLines = evidenceText ? doc.splitTextToSize(evidenceText, 158) : [];
  const height = Math.max(44, 31 + titleLines.length * 5 + findingLines.length * 4.6 + evidenceLines.length * 4.4);

  if (y + height > page.contentBottom) {
    doc.addPage();
    drawReportShell(doc, "Marking Guide Detail");
    y = 32;
  }

  setRgb(doc, fill, "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(page.margin, y, page.contentWidth, height, 3, 3, "FD");
  setRgb(doc, accent, "fill");
  doc.roundedRect(page.margin, y, 4, height, 2, 2, "F");

  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(titleLines, page.margin + 10, y + 8);

  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(sectionTitleText, page.margin + 10, y + 14 + titleLines.length * 5);

  const pillX = page.width - page.margin - 48;
  setRgb(doc, accent, "fill");
  doc.roundedRect(pillX, y + 5, 34, 9, 4.5, 4.5, "F");
  setRgb(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(criterionStatusLabel(criterion.status), pillX + 17, y + 11, { align: "center" });

  setRgb(doc, accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`${awarded}/${criterion.marks} marks`, page.width - page.margin - 14, y + 24, { align: "right" });

  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(findingLines, page.margin + 10, y + 22 + titleLines.length * 5);

  if (evidenceLines.length) {
    setRgb(doc, criterion.status === "missing" ? accent : brand.ink);
    doc.setFont("helvetica", criterion.status === "missing" ? "bold" : "normal");
    doc.setFontSize(8);
    doc.text(evidenceLines, page.margin + 10, y + 26 + titleLines.length * 5 + findingLines.length * 4.6);
  }

  return y + height + 6;
};

const createLegacyMarkedAnalysisPdfDocument = (
  result: AnalysisResult,
  documentType: DocumentType,
  component: string,
  fileName: string,
  studentName?: string
) => {
  const doc = new jsPDF();
  const rubricSections = result.rubricScore?.sections ?? [];
  doc.setProperties({
    title: "UHPAB Marking Guide Analysis Report",
    subject: "Rubric-based marking guide review",
    author: "UHPAB Research Assistant",
    creator: "UHPAB Research Assistant",
  });

  drawMarkingCoverPage(doc, result, documentType, component, fileName, studentName);

  doc.addPage();
  drawReportShell(doc, "Rubric Summary");
  let y = sectionTitle(doc, "Rubric Summary", 34, "Marks are tallied against the report marking guide.");
  if (rubricSections.length) {
    const counts = countRubricStatuses(rubricSections);
    y = drawStatusMiniLegend(doc, y);

    coverMetric(doc, page.margin, y, 56, "Awarded", `${counts.met}`, [236, 253, 245], reportAccent.green);
    coverMetric(doc, 77, y, 56, "Partial", `${counts.partial}`, [255, 251, 235], reportAccent.amber);
    coverMetric(doc, 140, y, 56, "Not awarded", `${counts.missing}`, [255, 241, 242], reportAccent.rose);
    y += 42;

    y = sectionTitle(doc, "Section Marks", y, "Each section card shows awarded marks and criterion status counts.");
    rubricSections.forEach((section) => {
      y = drawRubricSectionSummaryCard(doc, section, y);
    });

    const priorityCriteria = rubricSections.flatMap((section) =>
      section.criteria
        .filter((criterion) => criterion.status !== "met")
        .map((criterion) => ({ sectionTitle: section.title, criterion }))
    );

    if (priorityCriteria.length > 0) {
      y = sectionTitle(doc, "Priority Revision List", y + 3, "Revise these partial or not awarded criteria first.");
      priorityCriteria.forEach((item) => {
        y = drawPriorityCriterionRow(doc, item.sectionTitle, item.criterion, y);
      });
    } else {
      y = drawStatusMiniLegend(doc, y + 2);
      setRgb(doc, brand.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("All rubric criteria in this check were awarded.", page.margin, y);
    }
  } else {
    setRgb(doc, brand.muted);
    doc.setFontSize(9);
    doc.text("No detailed rubric section data was available for this check.", page.margin, y);
  }

  doc.addPage();
  drawReportShell(doc, "Marking Guide Detail");
  y = sectionTitle(doc, "Criterion-by-Criterion Marking", 34, "Each criterion is tallied using marks awarded, partial marks, or no marks.");

  if (rubricSections.length) {
    let criterionIndex = 0;
    rubricSections.forEach((section) => {
      y = ensureReportSpace(doc, y, 22, "Marking Guide Detail");
      setRgb(doc, brand.ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`${section.title} - ${section.awarded}/${section.marks} marks`, page.margin, y);
      y += 8;

      section.criteria.forEach((criterion) => {
        y = addMarkingCriterionCard(doc, section.title, criterion, criterionIndex, y);
        criterionIndex += 1;
      });

      y += 4;
    });
  } else {
    const evidence = sampleAnalysisEvidence(result);
    evidence.forEach((passage, index) => {
      y = addProfessionalPassage(doc, passage, index, y);
    });
  }

  drawFooter(doc, 2, "Generated for academic review. Criterion marks are tallied against the marking guide.");

  return doc;
};

export const createMarkedAnalysisPdfDocument = createMarkingGuidePdfDocument;
export const downloadMarkedAnalysisPdf = downloadMarkingGuidePdf;

export const createPlagiarismPdfDocument = (report: PlagiarismReport, fileName: string, studentName?: string) => {
  const doc = new jsPDF();
  doc.setProperties({
    title: "UHPAB Originality Review Report",
    subject: "Marked originality and source-support review",
    author: "UHPAB Research Assistant",
    creator: "UHPAB Research Assistant",
  });

  drawCoverPage(doc, report, fileName, studentName);
  drawOverviewPage(doc, report);

  doc.addPage();
  drawReportShell(doc, "Marked Passages");
  let y = sectionTitle(
    doc,
    "Marked Submission Review",
    34,
    "Only uncommon wording and source-support cues are emphasized. Default research structure remains neutral."
  );

  report.passages.forEach((passage) => {
    y = addProfessionalPassage(doc, passage, report.passages.indexOf(passage), y);
  });

  drawFormalFooters(doc, createFormalReportId(fileName, "ORI"), "UHPAB originality review");

  return doc;
};

export const downloadPlagiarismPdf = (report: PlagiarismReport, fileName: string, studentName?: string) => {
  const doc = createPlagiarismPdfDocument(report, fileName, studentName);
  savePdf(doc, `originality-review-${fileName || "document"}.pdf`);
};
