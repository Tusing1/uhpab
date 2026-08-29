import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const execFileAsync = promisify(execFile);

const workspaceRoot = path.resolve("D:/unmeb-research-aid");
const outputRoot = path.join(workspaceRoot, "tmp", "pdfs", "real-document-qa", new Date().toISOString().replace(/[:.]/g, "-"));
const bundleDir = path.join(outputRoot, "_bundles");

const defaultDocuments = [
  "D:/Dev Files/11/KUSIIMA-NICHOLAS-1.pdf",
  "D:/Dev Files/11/AINOMUGISHA-TRACY-REPORT-2025.pdf",
  "D:/Dev Files/11/13-RWOTHOMIO-DAMALCIOUS-REPORT-FINALE-17-11-2025.docx",
];

const preliminaryPatterns = [
  { key: "preliminary", pattern: /(title page|table of contents|list of tables|list of figures|abstract|definition of terms|abbreviations|acronyms)/i },
];

const chapterPatterns = [
  { key: "introduction", pattern: /chapter\s*(one|1)\b/i },
  { key: "literature", pattern: /chapter\s*(two|2)\b/i },
  { key: "methodology", pattern: /chapter\s*(three|3)\b/i },
  { key: "results", pattern: /chapter\s*(four|4)\b/i },
  { key: "discussion", pattern: /chapter\s*(five|5)\b/i },
];

const sectionKeywordPatterns = [
  { key: "introduction", pattern: /(background of the study|problem statement|statement of the problem|purpose of the study|research objectives|research questions|justification|significance of the study)/i },
  { key: "literature", pattern: /(literature review|review of literature|theoretical framework|conceptual framework)/i },
  { key: "methodology", pattern: /(methodology|methods|study design|research design|study setting|study population|sample size|sampling|ethical considerations)/i },
  { key: "results", pattern: /(results|findings|data presentation|analysis and interpretation)/i },
  { key: "discussion", pattern: /(discussion|conclusion|recommendations|nursing practice|health practice|implications)/i },
  { key: "references", pattern: /\b(references|bibliography)\b/i },
  { key: "appendices", pattern: /\b(appendix|appendices|questionnaire|consent form|approval letter|introduction letter)\b/i },
];

const normalizeText = (text) =>
  text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

const sanitizeName = (value) =>
  value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || "document";

const detectSection = (text, previous = { sectionTitle: "unknown" }) => {
  const windowText = text.slice(0, 1400);
  const dottedLeaderCount = windowText.match(/\.{5,}/g)?.length ?? 0;
  if (/table of contents/i.test(windowText) || dottedLeaderCount >= 3) {
    return { sectionTitle: "preliminary" };
  }

  const match = [...preliminaryPatterns, ...chapterPatterns, ...sectionKeywordPatterns].find((section) => section.pattern.test(windowText));
  return match ? { sectionTitle: match.key } : previous;
};

const findPoppler = (tool) => {
  const candidate = path.join(
    os.homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "native",
    "poppler",
    "Library",
    "bin",
    `${tool}.exe`
  );
  return existsSync(candidate) ? candidate : `${tool}.exe`;
};

const extractPdf = async (filePath) => {
  const data = new Uint8Array(await readFile(filePath));
  const pdf = await pdfjs.getDocument({ data, disableWorker: true, useSystemFonts: true }).promise;
  const pages = [];
  const chunks = [];
  let previous;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!pageText) continue;
    const detected = detectSection(pageText, previous);
    previous = detected;
    pages.push(`Page ${pageNumber}\n${pageText}`);
    chunks.push({ pageNumber, sectionTitle: detected.sectionTitle, text: pageText });
  }

  const text = normalizeText(pages.join("\n\n"));
  return {
    text,
    pageCount: pdf.numPages,
    textPageCount: chunks.length,
    wordCount: countWords(text),
    chunks,
    sourceType: "pdf",
  };
};

const extractDocx = async (filePath) => {
  const buffer = await readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  const paragraphs = normalizeText(result.value).split(/\n{2,}/).filter(Boolean);
  const chunks = [];
  let previous;

  for (const paragraph of paragraphs) {
    const detected = detectSection(paragraph, previous);
    previous = detected;
    chunks.push({ pageNumber: null, sectionTitle: detected.sectionTitle, text: paragraph });
  }

  const text = normalizeText(result.value);
  return {
    text,
    pageCount: null,
    textPageCount: chunks.length,
    wordCount: countWords(text),
    chunks,
    sourceType: "docx",
  };
};

const extractDocument = async (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".pdf") return extractPdf(filePath);
  if (extension === ".docx") return extractDocx(filePath);
  throw new Error(`Unsupported QA file type: ${extension}`);
};

const bundleAppModules = async () => {
  await mkdir(bundleDir, { recursive: true });
  const markersBundle = path.join(bundleDir, "researchTextMarkers.bundle.mjs");
  const guideBundle = path.join(bundleDir, "markingGuide.bundle.mjs");
  const scoringBundle = path.join(bundleDir, "markingGuideScoring.bundle.mjs");

  await build({
    entryPoints: [path.join(workspaceRoot, "src", "lib", "researchTextMarkers.ts")],
    outfile: markersBundle,
    bundle: true,
    format: "esm",
    platform: "node",
    external: ["@/utils/documentAnalysis"],
    alias: { "@": path.join(workspaceRoot, "src") },
    logLevel: "silent",
  });

  await build({
    entryPoints: [path.join(workspaceRoot, "src", "data", "markingGuide.ts")],
    outfile: guideBundle,
    bundle: true,
    format: "esm",
    platform: "node",
    alias: { "@": path.join(workspaceRoot, "src") },
    logLevel: "silent",
  });

  await build({
    entryPoints: [path.join(workspaceRoot, "src", "lib", "markingGuideScoring.ts")],
    outfile: scoringBundle,
    bundle: true,
    format: "esm",
    platform: "node",
    alias: { "@": path.join(workspaceRoot, "src") },
    logLevel: "silent",
  });

  const markers = await import(`${pathToFileURL(markersBundle).href}?t=${Date.now()}`);
  const guide = await import(`${pathToFileURL(guideBundle).href}?t=${Date.now()}`);
  const scoring = await import(`${pathToFileURL(scoringBundle).href}?t=${Date.now()}`);
  return { markers, reportMarkingGuide: guide.reportMarkingGuide, scoring };
};

const renderPdf = async (pdfPath, outputPrefix) => {
  const pdftoppm = findPoppler("pdftoppm");
  await execFileAsync(pdftoppm, ["-png", "-r", "90", pdfPath, outputPrefix], { cwd: workspaceRoot });
  const dir = path.dirname(outputPrefix);
  const base = path.basename(outputPrefix);
  return (await readdir(dir)).filter((name) => name.startsWith(`${base}-`) && name.endsWith(".png")).length;
};

const run = async () => {
  const requestedDocuments = process.argv.slice(2);
  const inputDocuments = requestedDocuments.length ? requestedDocuments : defaultDocuments;
  const existingDocuments = [];

  for (const filePath of inputDocuments) {
    if (existsSync(filePath)) existingDocuments.push(path.resolve(filePath));
  }

  if (existingDocuments.length === 0) {
    throw new Error("No QA documents found. Pass PDF/DOCX paths to scripts/real-document-qa.mjs.");
  }

  await mkdir(outputRoot, { recursive: true });
  const { markers, reportMarkingGuide, scoring } = await bundleAppModules();
  const rows = [];
  const sections = [];

  for (const filePath of existingDocuments) {
    const fileName = path.basename(filePath);
    const safeName = sanitizeName(path.basename(fileName, path.extname(fileName)));
    const documentDir = path.join(outputRoot, safeName);
    await mkdir(documentDir, { recursive: true });

    const fileStats = await stat(filePath);
    const extracted = await extractDocument(filePath);
    const originalityReport = markers.buildMarkedPlagiarismReport(extracted.text);
    const rubricScore = scoring.scoreMarkingGuideSections(extracted, reportMarkingGuide);
    const markingResult = {
      matchedGuidelines: rubricScore.awarded,
      totalGuidelines: rubricScore.total,
      issues: rubricScore.sections.flatMap((section) =>
        section.criteria
          .filter((criterion) => criterion.status !== "met")
          .map((criterion) => `${section.title}: ${criterion.label}`)
      ),
      rubricScore,
    };

    const originalityPdfPath = path.join(documentDir, "originality-review.pdf");
    const markingPdfPath = path.join(documentDir, "marking-guide-review.pdf");
    await writeFile(
      originalityPdfPath,
      Buffer.from(markers.createPlagiarismPdfDocument(originalityReport, fileName, "QA Student").output("arraybuffer"))
    );
    await writeFile(
      markingPdfPath,
      Buffer.from(markers.createMarkedAnalysisPdfDocument(markingResult, "report", "full", fileName, "QA Student").output("arraybuffer"))
    );

    const originalityRenderedPages = await renderPdf(originalityPdfPath, path.join(documentDir, "originality-page"));
    const markingRenderedPages = await renderPdf(markingPdfPath, path.join(documentDir, "marking-page"));
    const sectionCounts = extracted.chunks.reduce((acc, chunk) => {
      acc[chunk.sectionTitle] = (acc[chunk.sectionTitle] ?? 0) + 1;
      return acc;
    }, {});
    const warnings = [];

    if (extracted.wordCount < 300) warnings.push("Low extracted text; OCR/scanned PDF likely.");
    if (extracted.sourceType === "pdf" && extracted.textPageCount < Math.max(1, Math.round((extracted.pageCount ?? 0) * 0.6))) {
      warnings.push("Many PDF pages produced no text.");
    }
    if ((sectionCounts.introduction ?? 0) === 0 && (sectionCounts.methodology ?? 0) === 0) {
      warnings.push("Core research sections were not detected.");
    }
    if (/turnitin|similarity|plagiarism/i.test(extracted.text.slice(0, 1500))) {
      warnings.push("Looks like a Turnitin/similarity report, not a plain student report.");
    }

    rows.push({
      fileName,
      sizeKb: Math.round(fileStats.size / 1024),
      sourceType: extracted.sourceType,
      pages: extracted.pageCount ?? "N/A",
      textPages: extracted.textPageCount,
      words: extracted.wordCount,
      marks: `${markingResult.matchedGuidelines}/${markingResult.totalGuidelines}`,
      attention: `${originalityReport.similarityScore}%`,
      flags: originalityReport.uncommonFlagCount,
      originalityRenderedPages,
      markingRenderedPages,
      warnings,
    });

    sections.push(`### ${fileName}

- Source: \`${filePath}\`
- Extracted words: ${extracted.wordCount.toLocaleString()}
- Detected chunks by section: ${Object.entries(sectionCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ")}
- Marking tally: ${markingResult.matchedGuidelines}/${markingResult.totalGuidelines}
- Originality attention: ${originalityReport.similarityScore}% with ${originalityReport.uncommonFlagCount} review flag(s)
- Exported PDFs: \`${path.relative(workspaceRoot, originalityPdfPath)}\`, \`${path.relative(workspaceRoot, markingPdfPath)}\`
- Rendered pages: originality ${originalityRenderedPages}, marking ${markingRenderedPages}
- Warnings: ${warnings.length ? warnings.join(" ") : "None"}
`);
  }

  const table = rows
    .map(
      (row) =>
        `| ${row.fileName} | ${row.sourceType.toUpperCase()} | ${row.pages} | ${row.words.toLocaleString()} | ${row.marks} | ${row.attention} | ${row.flags} | ${row.originalityRenderedPages}/${row.markingRenderedPages} | ${row.warnings.length ? row.warnings.join(" ") : "OK"} |`
    )
    .join("\n");

  const report = `# Real Document QA

Generated: ${new Date().toISOString()}

Output folder: \`${path.relative(workspaceRoot, outputRoot)}\`

| Document | Type | Pages | Words | Marking tally | Review attention | Flags | Rendered pages O/M | Status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${table}

${sections.join("\n")}
`;

  const reportPath = path.join(outputRoot, "real-document-qa.md");
  await writeFile(reportPath, report);
  console.log(reportPath);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
