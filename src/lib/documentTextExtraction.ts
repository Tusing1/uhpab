import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ExtractedDocumentText = {
  text: string;
  pageCount: number | null;
  wordCount: number;
  characterCount: number;
  sourceType: "pdf" | "docx" | "text";
  chunks: ExtractedDocumentChunk[];
};

export type ExtractedDocumentChunk = {
  pageNumber: number | null;
  sectionTitle: string;
  chapter: string;
  text: string;
};

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const normalizeText = (text: string) =>
  text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const fileExtension = (file: File) => file.name.split(".").pop()?.toLowerCase() || "";

const preliminaryPatterns = [
  {
    key: "preliminary",
    chapter: "Preliminary pages",
    pattern: /(title page|table of contents|list of tables|list of figures|abstract|definition of terms|abbreviations|acronyms)/i,
  },
];

const chapterPatterns = [
  {
    key: "introduction",
    chapter: "Chapter One",
    pattern: /chapter\s*(one|1)\b/i,
  },
  {
    key: "literature",
    chapter: "Chapter Two",
    pattern: /chapter\s*(two|2)\b/i,
  },
  {
    key: "methodology",
    chapter: "Chapter Three",
    pattern: /chapter\s*(three|3)\b/i,
  },
  {
    key: "results",
    chapter: "Results / Findings",
    pattern: /chapter\s*(four|4)\b/i,
  },
  {
    key: "discussion",
    chapter: "Discussion / Conclusion / Recommendations",
    pattern: /chapter\s*(five|5)\b/i,
  },
];

const sectionKeywordPatterns = [
  {
    key: "introduction",
    chapter: "Chapter One",
    pattern: /(background of the study|problem statement|statement of the problem|purpose of the study|research objectives|research questions|justification|significance of the study)/i,
  },
  {
    key: "literature",
    chapter: "Chapter Two",
    pattern: /(literature review|review of literature|theoretical framework|conceptual framework)/i,
  },
  {
    key: "methodology",
    chapter: "Chapter Three",
    pattern: /(methodology|methods|study design|research design|study setting|study population|sample size|sampling|ethical considerations)/i,
  },
  {
    key: "results",
    chapter: "Results / Findings",
    pattern: /(results|findings|data presentation|analysis and interpretation)/i,
  },
  {
    key: "discussion",
    chapter: "Discussion / Conclusion / Recommendations",
    pattern: /(discussion|conclusion|recommendations|nursing practice|health practice|implications)/i,
  },
  {
    key: "references",
    chapter: "References",
    pattern: /\b(references|bibliography)\b/i,
  },
  {
    key: "appendices",
    chapter: "Appendices",
    pattern: /\b(appendix|appendices|questionnaire|consent form|approval letter|introduction letter)\b/i,
  },
];

const detectSection = (text: string, previous?: Pick<ExtractedDocumentChunk, "sectionTitle" | "chapter">) => {
  const headingWindow = text.slice(0, 1400);
  const dottedLeaderCount = headingWindow.match(/\.{5,}/g)?.length ?? 0;
  if (/table of contents/i.test(headingWindow) || dottedLeaderCount >= 3) {
    return { sectionTitle: "preliminary", chapter: "Preliminary pages" };
  }

  const match = [...preliminaryPatterns, ...chapterPatterns, ...sectionKeywordPatterns].find((section) =>
    section.pattern.test(headingWindow)
  );

  if (match) {
    return { sectionTitle: match.key, chapter: match.chapter };
  }

  return previous ?? { sectionTitle: "unknown", chapter: "Unknown section" };
};

const chunkPlainText = (text: string): ExtractedDocumentChunk[] => {
  const paragraphs = normalizeText(text).split(/\n{2,}/).filter(Boolean);
  const chunks: ExtractedDocumentChunk[] = [];
  let previous: Pick<ExtractedDocumentChunk, "sectionTitle" | "chapter"> | undefined;

  paragraphs.forEach((paragraph) => {
    const detected = detectSection(paragraph, previous);
    previous = detected;
    chunks.push({
      pageNumber: null,
      sectionTitle: detected.sectionTitle,
      chapter: detected.chapter,
      text: paragraph,
    });
  });

  return chunks.length
    ? chunks
    : [
        {
          pageNumber: null,
          sectionTitle: "unknown",
          chapter: "Unknown section",
          text: normalizeText(text),
        },
      ];
};

const buildResult = (
  text: string,
  sourceType: ExtractedDocumentText["sourceType"],
  pageCount: number | null,
  chunks?: ExtractedDocumentChunk[]
): ExtractedDocumentText => {
  const normalized = normalizeText(text);
  const normalizedChunks =
    chunks?.map((chunk) => ({ ...chunk, text: normalizeText(chunk.text) })).filter((chunk) => chunk.text) ??
    chunkPlainText(normalized);

  return {
    text: normalized,
    pageCount,
    wordCount: countWords(normalized),
    characterCount: normalized.length,
    sourceType,
    chunks: normalizedChunks,
  };
};

const extractTextFromPdf = async (file: File): Promise<ExtractedDocumentText> => {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  const chunks: ExtractedDocumentChunk[] = [];
  let previous: Pick<ExtractedDocumentChunk, "sectionTitle" | "chapter"> | undefined;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) {
      const detected = detectSection(pageText, previous);
      previous = detected;
      pages.push(`Page ${pageNumber}\n${pageText}`);
      chunks.push({
        pageNumber,
        sectionTitle: detected.sectionTitle,
        chapter: detected.chapter,
        text: pageText,
      });
    }
  }

  return buildResult(pages.join("\n\n"), "pdf", pdf.numPages, chunks);
};

const extractTextFromDocx = async (file: File): Promise<ExtractedDocumentText> => {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });

  return buildResult(result.value, "docx", null);
};

const extractTextFromPlainText = async (file: File): Promise<ExtractedDocumentText> => {
  const text = await file.text();
  return buildResult(text, "text", null);
};

export const extractDocumentText = async (file: File): Promise<ExtractedDocumentText> => {
  const extension = fileExtension(file);

  if (file.type === "application/pdf" || extension === "pdf") {
    return extractTextFromPdf(file);
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    return extractTextFromDocx(file);
  }

  if (file.type.startsWith("text/") || extension === "txt") {
    return extractTextFromPlainText(file);
  }

  throw new Error("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
};
