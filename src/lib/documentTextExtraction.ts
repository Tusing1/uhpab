import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { detectDocumentSection, partitionPageLines } from './documentSectionDetection';

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

const chunkPlainText = (text: string): ExtractedDocumentChunk[] => {
  const paragraphs = normalizeText(text).split(/\n{2,}/).filter(Boolean);
  const chunks: ExtractedDocumentChunk[] = [];
  let previous: Pick<ExtractedDocumentChunk, "sectionTitle" | "chapter"> | undefined;

  paragraphs.forEach((paragraph) => {
    const detected = detectDocumentSection(paragraph, previous);
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
    const lines: string[] = [];
    let line = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      line += `${line ? ' ' : ''}${item.str}`;
      if (item.hasEOL) { lines.push(line.trim()); line = ''; }
    }
    if (line.trim()) lines.push(line.trim());
    const pageText = lines.join('\n').trim();

    if (pageText) {
      const detected = partitionPageLines(lines, pageNumber, previous);
      previous = detected.lastSection;
      pages.push(`Page ${pageNumber}\n${pageText}`);
      chunks.push(...detected.chunks);
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
