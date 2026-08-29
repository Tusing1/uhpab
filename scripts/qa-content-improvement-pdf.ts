import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { improveResearchContent } from "@/lib/contentImprovementEngine";
import {
  createCleanContentImprovementPdfDocument,
  createContentImprovementPdfDocument,
} from "@/lib/contentImprovementReport";

const originalText = `CHAPTER TWO: LITERATURE REVIEW

2.0 Introduction

this research is about a lot of things affecting medicine use among nursing students. The purpose of this study was to find out the big factors affecting adherence in order to improve care

2.1 Individual Factors Affecting Medicine Adherence

According to the survey, data was collected from 120 students and the findings shows that a lot of students missed medicine due to the fact that they forgot. The researcher recommend reminders because this findings may affect treatment outcomes.

The students reported things such as long waiting time, small supplies and poor communication. In order to understand the reason why the problem continues, the study sought to find out family and school factors.

2.2 Summary

At this point in time the evidence shows a big problem. The researcher will find out more information and explain the findings to the school.`;

const result = improveResearchContent(originalText, {
  sourceTool: "content-improvement",
  fileName: "medicine-adherence-chapter-two.docx",
  documentType: "proposal",
  section: "Chapter Two: Literature Review",
  issueLabel: "Academic language, grammar, structure and citation support",
  pageNumber: 8,
});

const outputDirectory = resolve("tmp", "pdfs");
mkdirSync(outputDirectory, { recursive: true });

const annotated = createContentImprovementPdfDocument(
  result,
  "medicine-adherence-chapter-two.docx",
  "Academic Review Team"
);
const clean = createCleanContentImprovementPdfDocument(
  result,
  "medicine-adherence-chapter-two.docx"
);

writeFileSync(
  resolve(outputDirectory, "content-improvement-annotated.pdf"),
  Buffer.from(annotated.output("arraybuffer"))
);
writeFileSync(
  resolve(outputDirectory, "content-improvement-clean.pdf"),
  Buffer.from(clean.output("arraybuffer"))
);

console.log(
  JSON.stringify({
    annotated: resolve(outputDirectory, "content-improvement-annotated.pdf"),
    clean: resolve(outputDirectory, "content-improvement-clean.pdf"),
    changes: result.changes.length,
    issues: result.issues.length,
    warnings: result.warnings.length,
  })
);
