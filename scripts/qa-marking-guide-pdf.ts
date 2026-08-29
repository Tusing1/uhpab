import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { reportMarkingGuide } from "@/data/markingGuide";
import { createMarkingGuidePdfDocument } from "@/lib/markingGuidePdf";
import type { AnalysisResult } from "@/utils/documentAnalysis";

const missingIds = new Set(["title-page", "abstract", "reference-count", "introduction-letter", "irc-approval"]);
const partialIds = new Set([
  "objective-based-literature",
  "apa-citation",
  "discussion-objectives",
  "problem-purpose-link",
  "conclusion",
  "apa-format",
]);

const sections = reportMarkingGuide.map((section) => {
  const criteria = section.criteria.map((criterion, index) => {
    const status = missingIds.has(criterion.id) ? "missing" : partialIds.has(criterion.id) ? "partial" : "met";
    const awarded = status === "met" ? criterion.marks : status === "partial" ? criterion.marks / 2 : 0;
    return {
      id: criterion.id,
      label: criterion.label,
      marks: criterion.marks,
      awarded,
      status,
      guidance: criterion.guidance,
      evidenceSnippet:
        status === "missing"
          ? undefined
          : `${index + 1}.${index + 1} ${criterion.label}. The document provides relevant study content and supporting detail for this requirement.`,
      pageNumber: status === "missing" ? null : index + 2,
    } as const;
  });
  return {
    id: section.id,
    title: section.title,
    marks: section.marks,
    awarded: criteria.reduce((sum, criterion) => sum + criterion.awarded, 0),
    criteria,
  };
});

const total = sections.reduce((sum, section) => sum + section.marks, 0);
const awarded = sections.reduce((sum, section) => sum + section.awarded, 0);
const result: AnalysisResult = {
  matchedGuidelines: awarded,
  totalGuidelines: total,
  issues: sections.flatMap((section) =>
    section.criteria.filter((criterion) => criterion.status !== "met").map((criterion) => `${section.title}: ${criterion.label}`)
  ),
  rubricScore: { awarded, total, sections },
};

const doc = createMarkingGuidePdfDocument(
  result,
  "report",
  "full",
  "ANITAH-original.docx",
  "ANITAH"
);
const bytes = Buffer.from(doc.output("arraybuffer"));
const temporaryDirectory = resolve("tmp", "pdfs");
const outputDirectory = resolve("output", "pdf");
mkdirSync(temporaryDirectory, { recursive: true });
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(resolve(temporaryDirectory, "uhpab-marking-report-design-sample.pdf"), bytes);
writeFileSync(resolve(outputDirectory, "uhpab-marking-report-design-sample.pdf"), bytes);

console.log(
  JSON.stringify({
    file: resolve(outputDirectory, "uhpab-marking-report-design-sample.pdf"),
    pages: doc.getNumberOfPages(),
    awarded,
    total,
    criteria: sections.reduce((sum, section) => sum + section.criteria.length, 0),
  })
);
