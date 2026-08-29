import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildMarkedPlagiarismReport,
  createPlagiarismPdfDocument,
} from "@/lib/researchTextMarkers";

const sampleText = `CHAPTER ONE: INTRODUCTION

This chapter presents the background of the study, problem statement, purpose, objectives, research questions, justification, and significance of the study.

The study examined factors affecting adherence to medicine among nursing students. Several students reported missing medication because of demanding clinical schedules. According to Kato et al. (2024), structured reminders may improve adherence in student populations.

The researcher therefore recommends reminders and peer support because these measures may improve treatment outcomes. This wording should be reviewed carefully against the cited source and rewritten where it follows source phrasing too closely.`;

const report = buildMarkedPlagiarismReport(sampleText);
const doc = createPlagiarismPdfDocument(report, "nursing-adherence-review.docx", "QA Student");
const outputDirectory = resolve("tmp", "pdfs");
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, "originality-review-shared-design.pdf"),
  Buffer.from(doc.output("arraybuffer"))
);

console.log(
  JSON.stringify({
    file: resolve(outputDirectory, "originality-review-shared-design.pdf"),
    pages: doc.getNumberOfPages(),
    originality: report.originalityScore,
    flags: report.uncommonFlagCount,
  })
);
