import fs from "node:fs";
import path from "node:path";
import { reportMarkingGuide } from "../src/data/markingGuide";
import { scoreMarkingGuideSections } from "../src/lib/markingGuideScoring";
import {
  buildMarkedPlagiarismReport,
  createMarkedAnalysisPdfDocument,
  createPlagiarismPdfDocument,
} from "../src/lib/researchTextMarkers";
import type { ExtractedDocumentChunk, ExtractedDocumentText } from "../src/lib/documentTextExtraction";
import type { AnalysisResult } from "../src/utils/documentAnalysis";

type ExtractedPage = {
  pageNumber: number;
  text: string;
};

type ExtractedPdf = {
  fileName: string;
  pageCount: number;
  pages: ExtractedPage[];
};

type SectionIdentity = Pick<ExtractedDocumentChunk, "sectionTitle" | "chapter">;

const preliminaryPatterns: Array<SectionIdentity & { pattern: RegExp }> = [
  { sectionTitle: "preliminary", chapter: "Preliminary pages", pattern: /(title page|table of contents|list of tables|list of figures|abstract|definition of terms|abbreviations|acronyms)/i },
];

const chapterPatterns: Array<SectionIdentity & { pattern: RegExp }> = [
  { sectionTitle: "introduction", chapter: "Chapter One", pattern: /chapter\s*(one|1)\b/i },
  { sectionTitle: "literature", chapter: "Chapter Two", pattern: /chapter\s*(two|2)\b/i },
  { sectionTitle: "methodology", chapter: "Chapter Three", pattern: /chapter\s*(three|3)\b/i },
  { sectionTitle: "results", chapter: "Results / Findings", pattern: /chapter\s*(four|4)\b/i },
  { sectionTitle: "discussion", chapter: "Discussion / Conclusion / Recommendations", pattern: /chapter\s*(five|5)\b/i },
];

const sectionKeywordPatterns: Array<SectionIdentity & { pattern: RegExp }> = [
  { sectionTitle: "introduction", chapter: "Chapter One", pattern: /(background of the study|problem statement|statement of the problem|purpose of the study|research objectives|research questions|justification|significance of the study)/i },
  { sectionTitle: "literature", chapter: "Chapter Two", pattern: /(literature review|review of literature|theoretical framework|conceptual framework)/i },
  { sectionTitle: "methodology", chapter: "Chapter Three", pattern: /(methodology|methods|study design|research design|study setting|study population|sample size|sampling|ethical considerations)/i },
  { sectionTitle: "results", chapter: "Results / Findings", pattern: /(results|findings|data presentation|analysis and interpretation)/i },
  { sectionTitle: "discussion", chapter: "Discussion / Conclusion / Recommendations", pattern: /(discussion|conclusion|recommendations|nursing practice|health practice|implications)/i },
  { sectionTitle: "references", chapter: "References", pattern: /\b(references|bibliography)\b/i },
  { sectionTitle: "appendices", chapter: "Appendices", pattern: /\b(appendix|appendices|questionnaire|consent form|approval letter|introduction letter)\b/i },
];

const classifyPages = (pages: ExtractedPage[]): ExtractedDocumentChunk[] => {
  let previous: SectionIdentity = { sectionTitle: "unknown", chapter: "Unknown section" };

  return pages
    .filter((page) => page.text.trim())
    .map((page) => {
      const headingWindow = page.text.slice(0, 1400);
      const dottedLeaderCount = headingWindow.match(/\.{5,}/g)?.length ?? 0;
      const detected =
        /table of contents/i.test(headingWindow) || dottedLeaderCount >= 3
          ? { sectionTitle: "preliminary", chapter: "Preliminary pages" }
          : [...preliminaryPatterns, ...chapterPatterns, ...sectionKeywordPatterns].find((section) =>
              section.pattern.test(headingWindow)
            ) ?? previous;
      previous = { sectionTitle: detected.sectionTitle, chapter: detected.chapter };

      return {
        pageNumber: page.pageNumber,
        sectionTitle: previous.sectionTitle,
        chapter: previous.chapter,
        text: page.text.replace(/\s+/g, " ").trim(),
      };
    });
};

const buildExtractedDocument = (pdf: ExtractedPdf): ExtractedDocumentText => {
  const chunks = classifyPages(pdf.pages);
  const text = pdf.pages
    .filter((page) => page.text.trim())
    .map((page) => `Page ${page.pageNumber}\n${page.text.trim()}`)
    .join("\n\n");

  return {
    text,
    pageCount: pdf.pageCount,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    characterCount: text.length,
    sourceType: "pdf",
    chunks,
  };
};

const assertAudit = (condition: unknown, message: string, failures: string[]) => {
  if (!condition) failures.push(message);
};

const savePdf = (outputPath: string, data: ArrayBuffer) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(data));
};

const runDocumentAudit = (inputPath: string, outputDirectory: string) => {
  const extractedPdf = JSON.parse(fs.readFileSync(inputPath, "utf8")) as ExtractedPdf;
  const extracted = buildExtractedDocument(extractedPdf);
  const rubricScore = scoreMarkingGuideSections(extracted, reportMarkingGuide);
  const result: AnalysisResult = {
    matchedGuidelines: rubricScore.awarded,
    totalGuidelines: rubricScore.total,
    issues: rubricScore.sections.flatMap((section) =>
      section.criteria
        .filter((criterion) => criterion.status !== "met")
        .map((criterion) => `${section.title}: ${criterion.label}`)
    ),
    detailedIssues: rubricScore.sections.flatMap((section) =>
      section.criteria
        .filter((criterion) => criterion.status !== "met")
        .map((criterion) => ({
          section: section.title,
          issue: criterion.label,
          severity: criterion.status === "missing" ? "high" as const : "medium" as const,
          guideline: `Research report marking guide - ${criterion.awarded}/${criterion.marks} marks`,
          suggestion: criterion.guidance,
        }))
    ),
    suggestions: rubricScore.sections
      .flatMap((section) => section.criteria)
      .filter((criterion) => criterion.status !== "met")
      .slice(0, 4)
      .map((criterion) => criterion.guidance),
    rubricScore,
  };

  const originalityReport = buildMarkedPlagiarismReport(extracted.text);
  const baseName = path.basename(extractedPdf.fileName, path.extname(extractedPdf.fileName));
  const markingPath = path.join(outputDirectory, `${baseName}-marking-guide.pdf`);
  const originalityPath = path.join(outputDirectory, `${baseName}-originality-review.pdf`);
  savePdf(
    markingPath,
    createMarkedAnalysisPdfDocument(result, "report", "full", extractedPdf.fileName, "Release audit").output("arraybuffer")
  );
  savePdf(
    originalityPath,
    createPlagiarismPdfDocument(originalityReport, extractedPdf.fileName, "Release audit").output("arraybuffer")
  );

  const failures: string[] = [];
  const criteria = rubricScore.sections.flatMap((section) => section.criteria);
  const criteriaMarks = rubricScore.sections.reduce(
    (sum, section) => sum + section.criteria.reduce((sectionSum, criterion) => sectionSum + criterion.marks, 0),
    0
  );
  const awardedMarks = rubricScore.sections.reduce(
    (sum, section) => sum + section.criteria.reduce((sectionSum, criterion) => sectionSum + criterion.awarded, 0),
    0
  );

  assertAudit(rubricScore.total === 100, `${extractedPdf.fileName}: rubric total is ${rubricScore.total}, expected 100`, failures);
  assertAudit(criteriaMarks === rubricScore.total, `${extractedPdf.fileName}: criterion marks do not total ${rubricScore.total}`, failures);
  assertAudit(awardedMarks === rubricScore.awarded, `${extractedPdf.fileName}: awarded marks do not tally`, failures);
  assertAudit(criteria.every((criterion) => ["met", "partial", "missing"].includes(criterion.status)), `${extractedPdf.fileName}: invalid rubric status`, failures);
  assertAudit(criteria.every((criterion) => criterion.awarded >= 0 && criterion.awarded <= criterion.marks), `${extractedPdf.fileName}: criterion marks are outside bounds`, failures);
  assertAudit(criteria.every((criterion) => criterion.pageNumber === null || (criterion.pageNumber >= 1 && criterion.pageNumber <= extractedPdf.pageCount)), `${extractedPdf.fileName}: evidence page is outside the document`, failures);
  const ircCriterion = criteria.find((criterion) => criterion.id === "irc-approval");
  if (ircCriterion?.status === "met") {
    assertAudit(
      /(?:irc|institutional research committee|research ethics committee|institutional review board).*(?:approval|approved|clearance|cleared)|(?:approval|approved|clearance|cleared).*(?:irc|institutional research committee|research ethics committee|institutional review board)/i.test(
        ircCriterion.evidenceSnippet ?? ""
      ),
      `${extractedPdf.fileName}: IRC approval was awarded without committee approval evidence`,
      failures
    );
  }

  return {
    fileName: extractedPdf.fileName,
    pageCount: extractedPdf.pageCount,
    extractedWords: extracted.wordCount,
    detectedSections: Array.from(new Set(extracted.chunks.map((chunk) => chunk.sectionTitle))),
    rubric: {
      awarded: rubricScore.awarded,
      total: rubricScore.total,
      statusCounts: {
        awarded: criteria.filter((criterion) => criterion.status === "met").length,
        partial: criteria.filter((criterion) => criterion.status === "partial").length,
        notAwarded: criteria.filter((criterion) => criterion.status === "missing").length,
      },
    },
    originality: {
      originalityScore: originalityReport.originalityScore,
      reviewAttention: originalityReport.similarityScore,
      commonLanguagePercent: originalityReport.commonLanguagePercent,
      passagesNeedingReview: originalityReport.uncommonFlagCount,
      longestPassageCharacters: Math.max(...originalityReport.passages.map((passage) => passage.text.length), 0),
    },
    outputs: { markingPath, originalityPath },
    failures,
  };
};

const [outputDirectory, ...inputFiles] = process.argv.slice(2);
if (!outputDirectory || inputFiles.length === 0) {
  throw new Error("Usage: final-release-audit <output-directory> <extracted-json> [...]");
}

const commonPhrase = "This chapter presents the background of the study, problem statement, purpose of the study, objectives, research questions, justification and significance of the study.";
const commonPhraseReport = buildMarkedPlagiarismReport(commonPhrase);
const results = inputFiles.map((inputFile) => runDocumentAudit(inputFile, outputDirectory));
const failures = results.flatMap((result) => result.failures);
assertAudit(commonPhraseReport.uncommonFlagCount === 0, "Common chapter-opening language was incorrectly flagged for review", failures);
results.forEach((result) =>
  assertAudit(
    result.originality.longestPassageCharacters <= 620,
    `${result.fileName}: originality passage exceeded the 620-character export limit`,
    failures
  )
);

const summary = {
  generatedAt: new Date().toISOString(),
  commonPhraseExcluded: commonPhraseReport.uncommonFlagCount === 0,
  results,
  failures,
};
fs.writeFileSync(path.join(outputDirectory, "engine-audit-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (failures.length > 0) process.exitCode = 1;
