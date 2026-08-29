import type { ReviewToolHandoff } from "@/lib/toolHandoff";

export type ImprovementCategory = "Grammar" | "Academic tone" | "Structure" | "Citation support" | "Clarity";

export type ImprovementSeverity = "high" | "medium" | "low";

export type ImprovementChange = {
  category: ImprovementCategory;
  before: string;
  after: string;
  reason: string;
};

export type ImprovementIssue = {
  category: ImprovementCategory;
  label: string;
  detail: string;
  action: string;
  severity: ImprovementSeverity;
};

export type SentenceComparison = {
  index: number;
  before: string;
  after: string;
  changed: boolean;
};

export type ImprovementResult = {
  originalText: string;
  improvedText: string;
  changes: ImprovementChange[];
  issues: ImprovementIssue[];
  warnings: string[];
  comparisons: SentenceComparison[];
  sourceContext?: ReviewToolHandoff | null;
};

type ReplacementRule = {
  category: ImprovementCategory;
  pattern: RegExp;
  replacement: string;
  reason: string;
  issueLabel: string;
};

const replacementRules: ReplacementRule[] = [
  {
    category: "Academic tone",
    pattern: /\bthis research is about\b/gi,
    replacement: "this study examines",
    reason: "Uses formal research wording.",
    issueLabel: "Conversational description of the study",
  },
  {
    category: "Academic tone",
    pattern: /\ba lot of\b/gi,
    replacement: "many",
    reason: "Removes conversational wording.",
    issueLabel: "Informal quantity wording",
  },
  {
    category: "Academic tone",
    pattern: /\bthings\b/gi,
    replacement: "factors",
    reason: "Makes the wording more precise for research writing.",
    issueLabel: "Vague noun choice",
  },
  {
    category: "Academic tone",
    pattern: /\bstuff\b/gi,
    replacement: "materials",
    reason: "Replaces informal wording with a specific academic term.",
    issueLabel: "Informal wording",
  },
  {
    category: "Academic tone",
    pattern: /\bfind out\b/gi,
    replacement: "determine",
    reason: "Uses a stronger academic verb.",
    issueLabel: "Weak research verb",
  },
  {
    category: "Academic tone",
    pattern: /\bbig\b/gi,
    replacement: "substantial",
    reason: "Uses formal wording without changing the claim.",
    issueLabel: "Informal adjective",
  },
  {
    category: "Academic tone",
    pattern: /\bsmall\b/gi,
    replacement: "limited",
    reason: "Uses more precise academic wording.",
    issueLabel: "Informal adjective",
  },
  {
    category: "Clarity",
    pattern: /\bdue to the fact that\b/gi,
    replacement: "because",
    reason: "Shortens a wordy phrase.",
    issueLabel: "Wordy phrase",
  },
  {
    category: "Clarity",
    pattern: /\bin order to\b/gi,
    replacement: "to",
    reason: "Improves concision.",
    issueLabel: "Wordy phrase",
  },
  {
    category: "Clarity",
    pattern: /\bat this point in time\b/gi,
    replacement: "currently",
    reason: "Uses concise wording.",
    issueLabel: "Wordy time expression",
  },
  {
    category: "Clarity",
    pattern: /\bthe reason why\b/gi,
    replacement: "the reason",
    reason: "Removes unnecessary repetition.",
    issueLabel: "Repetitive wording",
  },
  {
    category: "Grammar",
    pattern: /\bdata was\b/gi,
    replacement: "data were",
    reason: "Corrects subject-verb agreement.",
    issueLabel: "Subject-verb agreement",
  },
  {
    category: "Grammar",
    pattern: /\bresearcher\s+recommend\b/gi,
    replacement: "researcher recommends",
    reason: "Corrects verb agreement.",
    issueLabel: "Verb agreement",
  },
  {
    category: "Grammar",
    pattern: /\bfindings shows\b/gi,
    replacement: "findings show",
    reason: "Corrects plural subject agreement.",
    issueLabel: "Subject-verb agreement",
  },
  {
    category: "Grammar",
    pattern: /\bthis findings\b/gi,
    replacement: "these findings",
    reason: "Corrects determiner agreement.",
    issueLabel: "Determiner agreement",
  },
  {
    category: "Structure",
    pattern: /\bthe study sought to\b/gi,
    replacement: "the study aimed to",
    reason: "Keeps purpose statements direct.",
    issueLabel: "Purpose statement wording",
  },
  {
    category: "Structure",
    pattern: /\bthe purpose of this study was to\b/gi,
    replacement: "this study aimed to",
    reason: "Makes the sentence more direct while preserving meaning.",
    issueLabel: "Long purpose phrase",
  },
];

const normalizeParagraphs = (text: string) =>
  text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const sentenceCase = (text: string) =>
  text.replace(/(^|[.!?]\s+|\n+)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);

const splitSentences = (text: string) =>
  normalizeParagraphs(text)
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const hasApaCitation = (text: string) =>
  /\([A-Z][A-Za-z' -]+(?:\s+et\s+al\.)?,?\s*(?:19|20)\d{2}[a-z]?\)/.test(text) ||
  /\b[A-Z][A-Za-z' -]+\s+\((?:19|20)\d{2}[a-z]?\)/.test(text);

const hasDataClaim = (text: string) =>
  /\b\d+(\.\d+)?%|\bmajority\b|\bminority\b|\bsignificant\b|\baccording to\b|\brevealed\b|\bfindings showed\b|\bresults showed\b/i.test(text);

const categoryAction: Record<ImprovementCategory, string> = {
  Grammar: "Review the corrected grammar and keep the sentence meaning unchanged.",
  "Academic tone": "Use formal, precise wording that still reflects the student's own finding.",
  Structure: "Keep the paragraph organized around one claim, evidence, and implication.",
  "Citation support": "Add a real citation only if the source appears in the student's reference list.",
  Clarity: "Keep concise wording and remove repeated or vague phrases.",
};

const addIssue = (
  issues: ImprovementIssue[],
  category: ImprovementCategory,
  label: string,
  detail: string,
  severity: ImprovementSeverity = "medium"
) => {
  const duplicate = issues.some((issue) => issue.category === category && issue.label === label);
  if (duplicate) return;

  issues.push({
    category,
    label,
    detail,
    action: categoryAction[category],
    severity,
  });
};

const applyReplacementRules = (text: string, changes: ImprovementChange[], issues: ImprovementIssue[]) => {
  let output = text;

  replacementRules.forEach((rule) => {
    const matches = Array.from(output.matchAll(rule.pattern));
    if (matches.length === 0) return;

    const firstMatch = matches[0][0];
    output = output.replace(rule.pattern, rule.replacement);
    changes.push({
      category: rule.category,
      before: firstMatch,
      after: rule.replacement,
      reason: rule.reason,
    });
    addIssue(
      issues,
      rule.category,
      rule.issueLabel,
      `${matches.length} instance${matches.length === 1 ? "" : "s"} corrected.`,
      rule.category === "Grammar" ? "high" : "medium"
    );
  });

  return output;
};

const buildComparisons = (originalText: string, improvedText: string): SentenceComparison[] => {
  const originalSentences = splitSentences(originalText);
  const improvedSentences = splitSentences(improvedText);
  const count = Math.max(originalSentences.length, improvedSentences.length);

  return Array.from({ length: count }, (_, index) => {
    const before = originalSentences[index] ?? "";
    const after = improvedSentences[index] ?? "";
    return {
      index: index + 1,
      before,
      after,
      changed: before !== after,
    };
  }).filter((item) => item.before || item.after);
};

export const createImprovementDownload = (result: ImprovementResult) => {
  const issueLines = result.issues.length
    ? result.issues.map((issue) => `- ${issue.category}: ${issue.label}. ${issue.action}`).join("\n")
    : "- No major issues detected after safe cleanup.";
  const warningLines = result.warnings.length
    ? result.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- None.";

  return `UHPAB Research Assistant - Content Improvement Review

Source: ${result.sourceContext?.fileName ?? "Pasted text"}
Section: ${result.sourceContext?.section ?? "Not specified"}
Issue: ${result.sourceContext?.issueLabel ?? "General content improvement"}

ISSUES
${issueLines}

WARNINGS
${warningLines}

IMPROVED TEXT
${result.improvedText}
`;
};

export const improveResearchContent = (
  originalText: string,
  sourceContext?: ReviewToolHandoff | null
): ImprovementResult => {
  const normalizedOriginal = normalizeParagraphs(originalText);
  let improvedText = sentenceCase(normalizedOriginal);
  const changes: ImprovementChange[] = [];
  const issues: ImprovementIssue[] = [];
  const warnings: string[] = [];

  improvedText = applyReplacementRules(improvedText, changes, issues);
  improvedText = improvedText
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([.!?])(?=[A-Z])/g, "$1 ")
    .replace(/\b([A-Z]{2,})s\b/g, "$1s");
  improvedText = sentenceCase(normalizeParagraphs(improvedText));

  if (improvedText.length > 0 && !/[.!?]$/.test(improvedText)) {
    improvedText = `${improvedText}.`;
    changes.push({
      category: "Grammar",
      before: "Final sentence without closing punctuation",
      after: "Final sentence closed with punctuation",
      reason: "Completes the paragraph cleanly.",
    });
    addIssue(issues, "Grammar", "Missing final punctuation", "The final sentence was closed cleanly.", "low");
  }

  const sentences = splitSentences(improvedText);
  const longSentences = sentences.filter((sentence) => sentence.split(/\s+/).filter(Boolean).length > 45);
  if (longSentences.length > 0) {
    addIssue(
      issues,
      "Clarity",
      "Long sentence",
      `${longSentences.length} sentence${longSentences.length === 1 ? "" : "s"} may still need splitting.`,
      "medium"
    );
  }

  const paragraphCount = normalizeParagraphs(improvedText).split(/\n{2,}/).filter(Boolean).length;
  const wordCount = improvedText.split(/\s+/).filter(Boolean).length;
  if (wordCount > 180 && paragraphCount === 1) {
    addIssue(
      issues,
      "Structure",
      "Dense paragraph",
      "The section is long enough to benefit from a clear topic sentence, evidence sentence, and implication sentence.",
      "medium"
    );
  }

  if (hasDataClaim(improvedText) && !hasApaCitation(improvedText)) {
    addIssue(
      issues,
      "Citation support",
      "Evidence may need citation",
      "A claim, statistic, or source cue appears without a clear APA-style in-text citation.",
      "high"
    );
    warnings.push("Check factual claims, statistics, and source-based statements against the reference list. No citation was invented.");
  }

  if (wordCount < 35) {
    addIssue(
      issues,
      "Structure",
      "Short academic paragraph",
      "This may need context, evidence, or a linking sentence if it is meant to stand alone.",
      "low"
    );
    warnings.push("This is short. Add context, evidence, or a linking sentence if this is meant to stand as a full academic paragraph.");
  }

  if (changes.length === 0) {
    changes.push({
      category: "Clarity",
      before: "Original wording retained",
      after: "Only spacing, capitalization, and paragraph flow were cleaned",
      reason: "No safe meaning-preserving rewrite was needed.",
    });
  }

  return {
    originalText: normalizedOriginal,
    improvedText,
    changes,
    issues,
    warnings,
    comparisons: buildComparisons(normalizedOriginal, improvedText),
    sourceContext,
  };
};
