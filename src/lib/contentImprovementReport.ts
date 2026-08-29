import { jsPDF } from "jspdf";
import type {
  ImprovementCategory,
  ImprovementChange,
  ImprovementResult,
} from "@/lib/contentImprovementEngine";
import { sanitizeFileName, triggerBrowserDownload } from "@/lib/download";
import {
  accent,
  brand,
  createFormalReportId,
  drawFormalFooters,
  drawFormalHeaderBand,
  drawFormalHero,
  drawFormalStatsBar,
  formatFormalReportDate,
  page,
  reportFamily,
  setRgb,
  type PdfRgb,
} from "@/lib/pdfReportTheme";

type AnnotationKind = "fix" | "add" | "remove" | "flag";

type DiffOperation = {
  kind: "equal" | "add" | "remove";
  text: string;
};

type ManuscriptRun = {
  text: string;
  kind?: Exclude<AnnotationKind, "flag">;
  noteNumber?: number;
};

type CorrectionNote = {
  number: number;
  kind: AnnotationKind;
  category: ImprovementCategory | "Verification";
  before: string;
  after: string;
  reason: string;
};

type AnnotatedParagraph = {
  kind: "chapter" | "heading" | "body";
  runs: ManuscriptRun[];
};

type AnnotatedDocumentModel = {
  paragraphs: AnnotatedParagraph[];
  notes: CorrectionNote[];
};

const manuscript = {
  left: 24,
  right: 186,
  width: 162,
  top: 29,
  bottom: 268,
  bodyFontSize: 10.5,
  bodyLineHeight: 5.7,
};

const annotationPalette: Record<AnnotationKind, { fill: PdfRgb; ink: PdfRgb; line: PdfRgb }> = {
  fix: {
    fill: [255, 239, 207],
    ink: [125, 69, 0],
    line: [230, 143, 36],
  },
  add: {
    fill: [226, 247, 232],
    ink: [24, 103, 51],
    line: [72, 157, 92],
  },
  remove: {
    fill: [253, 228, 228],
    ink: [170, 45, 45],
    line: [211, 86, 86],
  },
  flag: {
    fill: [244, 232, 250],
    ink: [104, 47, 128],
    line: [157, 90, 181],
  },
};

const categoryLabels: Record<ImprovementCategory | "Verification", string> = {
  Grammar: "Grammar",
  "Academic tone": "Academic tone",
  Structure: "Structure",
  "Citation support": "Citation check",
  Clarity: "Clarity",
  Verification: "Verify",
};

const formatDate = () =>
  new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

const safePdfText = (value: string | undefined | null) =>
  (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const safePdfRunText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ");

const compactMatchText = (value: string) =>
  safePdfText(value)
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const trimSnippet = (value: string, limit = 320) => {
  const clean = safePdfText(value);
  return clean.length > limit ? `${clean.slice(0, limit - 3).trim()}...` : clean;
};

const splitParagraphs = (value: string) =>
  safePdfText(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const splitSentences = (value: string) =>
  safePdfText(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const classifyParagraph = (value: string): AnnotatedParagraph["kind"] => {
  const text = safePdfText(value);
  if (/^chapter\s+(?:[ivxlcdm]+|\w+)/i.test(text) && text.length < 140) return "chapter";
  if (/^(?:\d+(?:\.\d+)*\s+|abstract$|references$|appendix\b)/i.test(text) && text.length < 140) {
    return "heading";
  }
  return "body";
};

const tokenize = (value: string) => safePdfText(value).match(/\S+\s*/g) || [];
const normalizedToken = (value: string) => value.trim();

const mergeDiffOperations = (operations: DiffOperation[]) => {
  const merged: DiffOperation[] = [];
  operations.forEach((operation) => {
    const previous = merged[merged.length - 1];
    if (previous?.kind === operation.kind) {
      previous.text += operation.text;
    } else {
      merged.push({ ...operation });
    }
  });
  return merged;
};

const diffWords = (before: string, after: string): DiffOperation[] => {
  const beforeTokens = tokenize(before);
  const afterTokens = tokenize(after);
  const rows = beforeTokens.length + 1;
  const columns = afterTokens.length + 1;
  const matrix = Array.from({ length: rows }, () => new Uint16Array(columns));

  for (let beforeIndex = beforeTokens.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = afterTokens.length - 1; afterIndex >= 0; afterIndex -= 1) {
      matrix[beforeIndex][afterIndex] =
        normalizedToken(beforeTokens[beforeIndex]) === normalizedToken(afterTokens[afterIndex])
          ? matrix[beforeIndex + 1][afterIndex + 1] + 1
          : Math.max(matrix[beforeIndex + 1][afterIndex], matrix[beforeIndex][afterIndex + 1]);
    }
  }

  const operations: DiffOperation[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < beforeTokens.length || afterIndex < afterTokens.length) {
    if (
      beforeIndex < beforeTokens.length &&
      afterIndex < afterTokens.length &&
      normalizedToken(beforeTokens[beforeIndex]) === normalizedToken(afterTokens[afterIndex])
    ) {
      operations.push({ kind: "equal", text: afterTokens[afterIndex] });
      beforeIndex += 1;
      afterIndex += 1;
      continue;
    }

    if (
      afterIndex < afterTokens.length &&
      (beforeIndex >= beforeTokens.length ||
        matrix[beforeIndex][afterIndex + 1] > matrix[beforeIndex + 1][afterIndex])
    ) {
      operations.push({ kind: "add", text: afterTokens[afterIndex] });
      afterIndex += 1;
      continue;
    }

    if (beforeIndex < beforeTokens.length) {
      operations.push({ kind: "remove", text: beforeTokens[beforeIndex] });
      beforeIndex += 1;
    }
  }

  return mergeDiffOperations(operations);
};

const findMatchingChange = (
  changes: ImprovementChange[],
  before: string,
  after: string
): ImprovementChange | undefined => {
  const beforeMatch = compactMatchText(before);
  const afterMatch = compactMatchText(after);
  let bestMatch: ImprovementChange | undefined;
  let bestScore = 0;

  changes.forEach((change) => {
    const changeBefore = compactMatchText(change.before);
    const changeAfter = compactMatchText(change.after);
    let score = 0;

    if (beforeMatch && changeBefore) {
      if (beforeMatch === changeBefore) score += 1000;
      else if (Math.min(beforeMatch.length, changeBefore.length) >= 4) {
        if (beforeMatch.includes(changeBefore)) score += changeBefore.length;
        if (changeBefore.includes(beforeMatch)) score += beforeMatch.length * 0.6;
      }
    }

    if (afterMatch && changeAfter) {
      if (afterMatch === changeAfter) score += 1000;
      else if (Math.min(afterMatch.length, changeAfter.length) >= 4) {
        if (afterMatch.includes(changeAfter)) score += changeAfter.length;
        if (changeAfter.includes(afterMatch)) score += afterMatch.length * 0.6;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = change;
    }
  });

  return bestScore >= 4 ? bestMatch : undefined;
};

const inferCorrection = (
  changes: ImprovementChange[],
  before: string,
  after: string
): Pick<CorrectionNote, "category" | "reason"> => {
  const matchingChange = findMatchingChange(changes, before, after);
  if (matchingChange) {
    return { category: matchingChange.category, reason: matchingChange.reason };
  }

  const agreementPair = `${compactMatchText(before)}>${compactMatchText(after)}`;
  if (
    /^(?:was>were|were>was|shows>show|show>shows|this>these|these>this|recommend>recommends|recommends>recommend)$/.test(
      agreementPair
    )
  ) {
    return {
      category: "Grammar",
      reason: "Corrects grammatical agreement without changing the meaning.",
    };
  }

  const punctuationOnly = compactMatchText(before) === compactMatchText(after);
  if (punctuationOnly) {
    return {
      category: "Grammar",
      reason: "Corrects punctuation, spacing, or capitalization without changing the meaning.",
    };
  }

  return {
    category: "Clarity",
    reason: "Improves clarity and academic wording while preserving the student's meaning.",
  };
};

const appendSentenceDiff = (
  before: string,
  after: string,
  changes: ImprovementChange[],
  notes: CorrectionNote[]
): ManuscriptRun[] => {
  if (before === after) return [{ text: `${after} ` }];

  const operations = diffWords(before, after);
  const runs: ManuscriptRun[] = [];
  let index = 0;

  while (index < operations.length) {
    const operation = operations[index];
    if (operation.kind === "equal") {
      runs.push({ text: operation.text });
      index += 1;
      continue;
    }

    let removed = "";
    let added = "";
    while (index < operations.length) {
      const current = operations[index];
      if (current.kind === "remove") removed += current.text;
      if (current.kind === "add") added += current.text;

      if (current.kind === "equal") {
        const next = operations[index + 1];
        const bridgeWordCount = tokenize(current.text).length;
        if (!next || next.kind === "equal" || bridgeWordCount > 2) break;
        removed += current.text;
        added += current.text;
      }

      index += 1;

      const bridge = operations[index];
      const nextAfterBridge = operations[index + 1];
      if (
        bridge?.kind === "equal" &&
        (!nextAfterBridge || nextAfterBridge.kind === "equal" || tokenize(bridge.text).length > 2)
      ) {
        break;
      }
    }

    const correction = inferCorrection(changes, removed, added);
    const kind: AnnotationKind = removed && added ? "fix" : added ? "add" : "remove";
    const note: CorrectionNote = {
      number: notes.length + 1,
      kind,
      category: correction.category,
      before: safePdfText(removed) || "Not present in the original text",
      after: safePdfText(added) || "Removed from the corrected text",
      reason: correction.reason,
    };
    notes.push(note);

    if (removed) {
      runs.push({
        text: `${removed.trim()} `,
        kind: "remove",
        noteNumber: added ? undefined : note.number,
      });
    }
    if (added) {
      runs.push({
        text: `${added.trim()} `,
        kind: kind === "add" ? "add" : "fix",
        noteNumber: note.number,
      });
    }
  }

  const lastRun = runs[runs.length - 1];
  if (lastRun && !/\s$/.test(lastRun.text)) lastRun.text += " ";
  return runs;
};

export const createAnnotatedDocumentModel = (result: ImprovementResult): AnnotatedDocumentModel => {
  const originalParagraphs = splitParagraphs(result.originalText);
  const improvedParagraphs = splitParagraphs(result.improvedText);
  const paragraphCount = Math.max(originalParagraphs.length, improvedParagraphs.length);
  const notes: CorrectionNote[] = [];
  const paragraphs: AnnotatedParagraph[] = [];

  for (let paragraphIndex = 0; paragraphIndex < paragraphCount; paragraphIndex += 1) {
    const beforeParagraph = originalParagraphs[paragraphIndex] || "";
    const afterParagraph = improvedParagraphs[paragraphIndex] || "";
    const beforeSentences = splitSentences(beforeParagraph);
    const afterSentences = splitSentences(afterParagraph);
    const sentenceCount = Math.max(beforeSentences.length, afterSentences.length);
    const runs: ManuscriptRun[] = [];

    for (let sentenceIndex = 0; sentenceIndex < sentenceCount; sentenceIndex += 1) {
      runs.push(
        ...appendSentenceDiff(
          beforeSentences[sentenceIndex] || "",
          afterSentences[sentenceIndex] || "",
          result.changes,
          notes
        )
      );
    }

    paragraphs.push({
      kind: classifyParagraph(afterParagraph || beforeParagraph),
      runs,
    });
  }

  return { paragraphs, notes };
};

const drawTopRule = (doc: jsPDF, rightLabel: string) => {
  drawFormalHeaderBand(doc, rightLabel);
};

const drawPageFurniture = (
  doc: jsPDF,
  footerLabel: string,
  headerLabel: string,
  reportId: string,
  headerStartPage = 1
) => {
  const totalPages = doc.getNumberOfPages();
  for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
    doc.setPage(currentPage);
    if (currentPage >= headerStartPage) drawTopRule(doc, headerLabel);
  }
  drawFormalFooters(doc, reportId, footerLabel);
};

const addManuscriptPage = (doc: jsPDF, _rightLabel: string) => {
  doc.addPage();
  return manuscript.top;
};

const drawLegendItem = (
  doc: jsPDF,
  x: number,
  y: number,
  kind: AnnotationKind,
  label: string
) => {
  const palette = annotationPalette[kind];
  setRgb(doc, palette.fill, "fill");
  setRgb(doc, palette.line, "draw");
  doc.roundedRect(x, y - 3.5, 8, 5.2, 1, 1, "FD");
  setRgb(doc, palette.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(label, x + 11, y);
};

const drawAnnotatedCover = (
  doc: jsPDF,
  result: ImprovementResult,
  model: AnnotatedDocumentModel,
  fileName: string,
  reviewerName?: string
) => {
  const sourceName = safePdfText(fileName || result.sourceContext?.fileName || "Pasted research text");
  const reportId = createFormalReportId(sourceName, "COR");
  drawFormalHero(doc, {
    reportId,
    fileName: sourceName,
    metaLines: [
      `Generated ${formatFormalReportDate()}  |  Annotated academic correction`,
      `Reviewer: ${reviewerName || "Not specified"}`,
    ],
    chips: [
      { label: "Annotated correction", tone: "blue" },
      { label: `${model.notes.length} marked changes`, tone: "warning" },
      { label: `${result.warnings.length} items to verify`, tone: result.warnings.length ? "danger" : "success" },
    ],
    metric: {
      value: String(model.notes.length),
      label: "Marked changes",
      caption: `${result.issues.length} issues reviewed`,
      progress: Math.min(100, Math.max(12, model.notes.length * 8)),
      tone: reportFamily.blue,
    },
  });
  drawFormalStatsBar(doc, [
    { value: model.notes.length, label: ["Corrections", "marked"], tone: reportFamily.blue },
    { value: result.issues.length, label: ["Issues", "reviewed"], tone: reportFamily.amber },
    { value: result.warnings.length, label: ["Items to", "verify"], tone: reportFamily.red },
    { value: model.paragraphs.length, label: ["Paragraphs", "reconstructed"], tone: reportFamily.green },
  ]);

  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CORRECTION KEY", page.margin, 121);
  drawLegendItem(doc, page.margin, 134, "fix", "Reworded or corrected");
  drawLegendItem(doc, 108, 134, "add", "Added");
  drawLegendItem(doc, page.margin, 148, "remove", "Removed");
  drawLegendItem(doc, 108, 148, "flag", "Verify before submission");

  setRgb(doc, brand.white, "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(page.margin, 166, page.contentWidth, 50, 3, 3, "FD");
  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("REVIEW SCOPE", page.margin + 7, 177);
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Section: ${trimSnippet(result.sourceContext?.section || "Not specified", 92)}`, page.margin + 7, 188);
  doc.text("Corrections preserve the student's meaning. Citations, figures, and factual claims must still be verified.", page.margin + 7, 198);
  doc.text("The annotated document begins on the next page. A clean corrected PDF is available separately.", page.margin + 7, 207);
};

const renderNoteMarker = (
  doc: jsPDF,
  number: number,
  kind: Exclude<AnnotationKind, "flag">,
  x: number,
  y: number
) => {
  const palette = annotationPalette[kind];
  const label = `${number}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  const width = Math.max(3.8, doc.getTextWidth(label) + 2.1);
  setRgb(doc, palette.line, "fill");
  doc.roundedRect(x, y - 4.5, width, 3.4, 1.3, 1.3, "F");
  setRgb(doc, brand.white);
  doc.text(label, x + width / 2, y - 2, { align: "center" });
  return width;
};

const renderInlineParagraph = (
  doc: jsPDF,
  paragraph: AnnotatedParagraph,
  startY: number,
  pageLabel: string
) => {
  const fontSize = paragraph.kind === "chapter" ? 13 : paragraph.kind === "heading" ? 11.5 : manuscript.bodyFontSize;
  const lineHeight = paragraph.kind === "body" ? manuscript.bodyLineHeight : 6.5;
  const fontStyle = paragraph.kind === "body" ? "normal" : "bold";
  let x = manuscript.left;
  let y = startY;
  let pendingSpace = false;

  const newLine = () => {
    x = manuscript.left;
    y += lineHeight;
    pendingSpace = false;
    if (y > manuscript.bottom) {
      y = addManuscriptPage(doc, pageLabel);
    }
  };

  if (paragraph.kind !== "body" && y + lineHeight > manuscript.bottom) {
    y = addManuscriptPage(doc, pageLabel);
  }

  paragraph.runs.forEach((run) => {
    const parts = safePdfRunText(run.text).match(/\S+|\s+/g) || [];
    let lastWordKind: Exclude<AnnotationKind, "flag"> | undefined;

    parts.forEach((part) => {
      if (/^\s+$/.test(part)) {
        pendingSpace = true;
        return;
      }

      doc.setFont("times", fontStyle);
      doc.setFontSize(fontSize);
      const spaceWidth = pendingSpace && x > manuscript.left ? doc.getTextWidth(" ") : 0;
      const wordWidth = doc.getTextWidth(part);
      if (x + spaceWidth + wordWidth > manuscript.right) newLine();

      const wordX = x + (pendingSpace && x > manuscript.left ? doc.getTextWidth(" ") : 0);
      if (run.kind) {
        const palette = annotationPalette[run.kind];
        setRgb(doc, palette.fill, "fill");
        doc.roundedRect(wordX - 0.45, y - fontSize * 0.36, wordWidth + 0.9, fontSize * 0.47, 0.7, 0.7, "F");
        setRgb(doc, palette.ink);
      } else {
        setRgb(doc, brand.ink);
      }

      doc.text(part, wordX, y);
      if (run.kind) {
        const palette = annotationPalette[run.kind];
        setRgb(doc, palette.line, "draw");
        doc.setLineWidth(run.kind === "remove" ? 0.45 : 0.35);
        const lineY = run.kind === "remove" ? y - 1.25 : y + 0.75;
        doc.line(wordX, lineY, wordX + wordWidth, lineY);
        lastWordKind = run.kind;
      }

      x = wordX + wordWidth;
      pendingSpace = false;
    });

    if (run.noteNumber && lastWordKind) {
      const markerWidth = Math.max(4, `${run.noteNumber}`.length * 1.8 + 2);
      if (x + markerWidth > manuscript.right) newLine();
      x += renderNoteMarker(doc, run.noteNumber, lastWordKind, x + 0.8, y) + 1.4;
    }
  });

  return y + (paragraph.kind === "chapter" ? 11 : paragraph.kind === "heading" ? 8 : 7.5);
};

const drawAnnotatedManuscript = (
  doc: jsPDF,
  model: AnnotatedDocumentModel,
  result: ImprovementResult
) => {
  let y = addManuscriptPage(doc, "Annotated correction copy");
  const section = safePdfText(result.sourceContext?.section || "Corrected research text");
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(section.toUpperCase(), manuscript.left, y);
  y += 11;

  model.paragraphs.forEach((paragraph) => {
    y = renderInlineParagraph(doc, paragraph, y, "Annotated correction copy");
  });
};

const noteHeight = (doc: jsPDF, note: CorrectionNote) => {
  doc.setFont("times", "normal");
  doc.setFontSize(9.2);
  const textWidth = 122;
  const beforeLines = doc.splitTextToSize(trimSnippet(note.before), textWidth);
  const afterLines = doc.splitTextToSize(trimSnippet(note.after), textWidth);
  const reasonLines = doc.splitTextToSize(trimSnippet(note.reason), textWidth);
  return 25 + (beforeLines.length + afterLines.length + reasonLines.length) * 4.25;
};

const drawCorrectionNote = (doc: jsPDF, note: CorrectionNote, startY: number) => {
  const palette = annotationPalette[note.kind];
  const textX = manuscript.left + 18;
  const textWidth = 122;
  const beforeLines = doc.splitTextToSize(trimSnippet(note.before), textWidth);
  const afterLines = doc.splitTextToSize(trimSnippet(note.after), textWidth);
  const reasonLines = doc.splitTextToSize(trimSnippet(note.reason), textWidth);
  let y = startY;

  setRgb(doc, palette.line, "fill");
  doc.circle(manuscript.left + 5, y + 3, 4.2, "F");
  setRgb(doc, brand.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`${note.number}`, manuscript.left + 5, y + 4.1, { align: "center" });

  setRgb(doc, palette.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`${note.kind.toUpperCase()}  /  ${categoryLabels[note.category].toUpperCase()}`, textX, y + 1);
  y += 8;

  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text("ORIGINAL", textX, y);
  setRgb(doc, note.kind === "remove" ? palette.ink : brand.ink);
  doc.setFont("times", "normal");
  doc.setFontSize(9.2);
  doc.text(beforeLines, textX + 20, y);
  y += Math.max(4.25, beforeLines.length * 4.25) + 2;

  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text("CORRECTION", textX, y);
  setRgb(doc, palette.ink);
  doc.setFont("times", "normal");
  doc.setFontSize(9.2);
  doc.text(afterLines, textX + 20, y);
  y += Math.max(4.25, afterLines.length * 4.25) + 2;

  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text("WHY", textX, y);
  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  doc.text(reasonLines, textX + 20, y);
  y += Math.max(4.2, reasonLines.length * 4.2) + 5;

  setRgb(doc, brand.line, "draw");
  doc.setLineWidth(0.25);
  doc.line(textX, y, manuscript.right, y);
  return y + 7;
};

const drawReviewItem = (
  doc: jsPDF,
  y: number,
  label: string,
  body: string,
  kind: AnnotationKind,
  pageLabel: string
) => {
  const palette = annotationPalette[kind];
  const lines = doc.splitTextToSize(safePdfText(body), manuscript.width - 18);
  const height = 13 + lines.length * 4.2;
  if (y + height > manuscript.bottom) y = addManuscriptPage(doc, pageLabel);

  setRgb(doc, palette.fill, "fill");
  setRgb(doc, palette.line, "draw");
  doc.roundedRect(manuscript.left, y, manuscript.width, height, 2, 2, "FD");
  setRgb(doc, palette.line, "fill");
  doc.rect(manuscript.left, y, 2.4, height, "F");
  setRgb(doc, palette.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text(safePdfText(label), manuscript.left + 7, y + 7);
  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  doc.text(lines, manuscript.left + 7, y + 13);
  return y + height + 5;
};

const drawCorrectionRegister = (
  doc: jsPDF,
  model: AnnotatedDocumentModel,
  result: ImprovementResult
) => {
  let y = addManuscriptPage(doc, "Correction notes");
  setRgb(doc, brand.ink);
  doc.setFont("times", "bold");
  doc.setFontSize(19);
  doc.text("Correction Notes", manuscript.left, y + 4);
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Each number matches the marker in the annotated document.", manuscript.left, y + 12);
  y += 25;

  model.notes.forEach((note) => {
    const height = noteHeight(doc, note);
    if (y + height > manuscript.bottom) y = addManuscriptPage(doc, "Correction notes");
    y = drawCorrectionNote(doc, note, y);
  });

  if (result.issues.length > 0) {
    if (y + 28 > manuscript.bottom) y = addManuscriptPage(doc, "Review checklist");
    setRgb(doc, brand.ink);
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("Review Checklist", manuscript.left, y + 4);
    y += 13;

    result.issues.forEach((issue) => {
      const kind: AnnotationKind = issue.category === "Citation support" ? "flag" : issue.severity === "high" ? "remove" : "fix";
      y = drawReviewItem(
        doc,
        y,
        `${issue.category}: ${issue.label}`,
        `${issue.detail} Action: ${issue.action}`,
        kind,
        "Review checklist"
      );
    });
  }

  if (result.warnings.length > 0) {
    if (y + 28 > manuscript.bottom) y = addManuscriptPage(doc, "Items to verify");
    setRgb(doc, brand.ink);
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("Items to Verify", manuscript.left, y + 4);
    y += 13;
    result.warnings.forEach((warning, index) => {
      y = drawReviewItem(doc, y, `Verify ${index + 1}`, warning, "flag", "Items to verify");
    });
  }
};

const renderPlainParagraph = (
  doc: jsPDF,
  value: string,
  kind: AnnotatedParagraph["kind"],
  startY: number,
  pageLabel: string
) => {
  const text = safePdfText(value);
  const fontSize = kind === "chapter" ? 13 : kind === "heading" ? 11.5 : manuscript.bodyFontSize;
  const lineHeight = kind === "body" ? manuscript.bodyLineHeight : 6.5;
  const style = kind === "body" ? "normal" : "bold";
  doc.setFont("times", style);
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, manuscript.width) as string[];
  let y = startY;

  lines.forEach((line) => {
    if (y > manuscript.bottom) y = addManuscriptPage(doc, pageLabel);
    setRgb(doc, brand.ink);
    doc.text(line, kind === "chapter" ? page.width / 2 : manuscript.left, y, {
      align: kind === "chapter" ? "center" : "left",
    });
    y += lineHeight;
  });

  return y + (kind === "chapter" ? 5 : kind === "heading" ? 3.5 : 5);
};

const drawCleanManuscript = (doc: jsPDF, result: ImprovementResult, fileName: string) => {
  let y = manuscript.top;
  const section = safePdfText(result.sourceContext?.section || "Corrected research text");
  setRgb(doc, brand.ink);
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text(section, manuscript.left, y);
  y += 7;
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`${trimSnippet(fileName, 80)}  |  Corrected ${formatDate()}`, manuscript.left, y);
  y += 13;

  splitParagraphs(result.improvedText).forEach((paragraph) => {
    y = renderPlainParagraph(doc, paragraph, classifyParagraph(paragraph), y, "Clean corrected copy");
  });
};

const drawCleanCover = (doc: jsPDF, result: ImprovementResult, fileName: string) => {
  const sourceName = safePdfText(fileName || result.sourceContext?.fileName || "Corrected research text");
  const reportId = createFormalReportId(sourceName, "CLN");
  const wordCount = safePdfText(result.improvedText).split(/\s+/).filter(Boolean).length;
  const paragraphCount = splitParagraphs(result.improvedText).length;
  drawFormalHero(doc, {
    reportId,
    fileName: sourceName,
    metaLines: [
      `Generated ${formatFormalReportDate()}  |  Clean corrected copy`,
      `Section: ${result.sourceContext?.section || "Not specified"}`,
    ],
    chips: [
      { label: "Clean corrected copy", tone: "success" },
      { label: "Ready for student review", tone: "blue" },
      { label: "Verify citations and data", tone: result.warnings.length ? "warning" : "neutral" },
    ],
    metric: {
      value: String(result.changes.length),
      label: "Applied changes",
      caption: `${result.issues.length} issues reviewed`,
      progress: Math.min(100, Math.max(12, result.changes.length * 9)),
      tone: reportFamily.green,
    },
  });
  drawFormalStatsBar(doc, [
    { value: result.changes.length, label: ["Changes", "applied"], tone: reportFamily.green },
    { value: result.issues.length, label: ["Issues", "reviewed"], tone: reportFamily.amber },
    { value: paragraphCount, label: ["Paragraphs", "prepared"], tone: reportFamily.blue },
    { value: wordCount, label: ["Words in", "clean copy"], tone: reportFamily.navySoft },
  ]);

  setRgb(doc, brand.white, "fill");
  setRgb(doc, brand.line, "draw");
  doc.roundedRect(page.margin, 119, page.contentWidth, 55, 3, 3, "FD");
  setRgb(doc, brand.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("About this clean copy", page.margin + 7, 132);
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const description = doc.splitTextToSize(
    "This version contains the improved academic wording without inline markup. It is ready for the student to review, refine, and place back into the research document.",
    page.contentWidth - 14
  );
  doc.text(description, page.margin + 7, 143);
  setRgb(doc, reportFamily.amberSoft, "fill");
  setRgb(doc, reportFamily.amber, "draw");
  doc.roundedRect(page.margin, 186, page.contentWidth, 29, 3, 3, "FD");
  setRgb(doc, reportFamily.amber);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("Student verification required", page.margin + 7, 197);
  setRgb(doc, brand.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.text(
    doc.splitTextToSize("Confirm all facts, statistics, citations, names, and references before submission. The correction process does not invent or verify sources.", page.contentWidth - 14),
    page.margin + 7,
    207
  );
};

export const createContentImprovementPdfDocument = (
  result: ImprovementResult,
  fileName: string,
  reviewerName?: string
) => {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  const normalizedResult = { ...result, improvedText: safePdfText(result.improvedText) };
  const model = createAnnotatedDocumentModel(normalizedResult);
  const reportId = createFormalReportId(fileName || result.sourceContext?.fileName || "content", "COR");

  drawAnnotatedCover(doc, normalizedResult, model, fileName, reviewerName);
  drawAnnotatedManuscript(doc, model, normalizedResult);
  drawCorrectionRegister(doc, model, normalizedResult);
  drawPageFurniture(
    doc,
    "Annotated academic correction review",
    "Annotated correction review",
    reportId,
    2
  );
  return doc;
};

export const createCleanContentImprovementPdfDocument = (
  result: ImprovementResult,
  fileName: string
) => {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  const reportId = createFormalReportId(fileName || result.sourceContext?.fileName || "content", "CLN");
  drawCleanCover(doc, result, fileName);
  doc.addPage();
  drawCleanManuscript(doc, result, fileName);
  drawPageFurniture(
    doc,
    "Clean corrected copy - verify content and references before submission",
    "Clean corrected copy",
    reportId,
    2
  );
  return doc;
};

const downloadPdf = (doc: jsPDF, fileName: string) => {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, sanitizeFileName(fileName));
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const downloadContentImprovementPdf = (
  result: ImprovementResult,
  fileName: string,
  reviewerName?: string
) => {
  const baseName = sanitizeFileName(fileName.replace(/\.[^.]+$/, "") || "content-improvement");
  downloadPdf(
    createContentImprovementPdfDocument(result, fileName, reviewerName),
    `${baseName}-annotated-correction.pdf`
  );
};

export const downloadCleanContentImprovementPdf = (
  result: ImprovementResult,
  fileName: string
) => {
  const baseName = sanitizeFileName(fileName.replace(/\.[^.]+$/, "") || "content-improvement");
  downloadPdf(createCleanContentImprovementPdfDocument(result, fileName), `${baseName}-corrected-clean.pdf`);
};
