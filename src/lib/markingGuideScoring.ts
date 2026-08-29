import type { MarkingCriterion, MarkingGuideSection } from "@/data/markingGuide";
import type { ExtractedDocumentChunk, ExtractedDocumentText } from "@/lib/documentTextExtraction";
import type { RubricScore } from "@/utils/documentAnalysis/types";

type CriterionStatus = "met" | "partial" | "missing";

type CriterionScore = {
  awarded: number;
  status: CriterionStatus;
  evidenceSnippet?: string;
  pageNumber?: number | null;
};

type EvidenceMatch = {
  chunk: ExtractedDocumentChunk;
  keyword: string;
};

type CriterionRule = (chunks: ExtractedDocumentChunk[], criterion: MarkingCriterion) => CriterionScore;

const sectionAliases: Record<string, string[]> = {
  preliminary: ["preliminary", "unknown"],
  introduction: ["introduction"],
  literature: ["literature"],
  methodology: ["methodology"],
  results: ["results"],
  discussion: ["discussion"],
  references: ["references"],
  appendices: ["appendices"],
};

const normalizeForEvidence = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const roundMark = (value: number) => Math.round(value * 10) / 10;

const partialMark = (criterion: MarkingCriterion) => {
  if (criterion.marks <= 1) return 0;
  return roundMark(criterion.marks / 2);
};

const hasPhrase = (text: string, phrase: string) =>
  normalizeForEvidence(text).includes(normalizeForEvidence(phrase));

const hasAnyPhrase = (text: string, phrases: string[]) => phrases.some((phrase) => hasPhrase(text, phrase));

const hasAllPhrases = (text: string, phrases: string[]) => phrases.every((phrase) => hasPhrase(text, phrase));

const countPhraseMatches = (text: string, phrases: string[]) =>
  phrases.reduce((count, phrase) => count + (hasPhrase(text, phrase) ? 1 : 0), 0);

const chunksText = (chunks: ExtractedDocumentChunk[]) => chunks.map((chunk) => chunk.text).join("\n\n");

const extractSnippet = (text: string, keyword: string) => {
  const cleanKeyword = keyword.trim();
  const lowerText = text.toLowerCase();
  const lowerKeyword = cleanKeyword.toLowerCase();
  const index = cleanKeyword ? lowerText.indexOf(lowerKeyword) : -1;
  const start = Math.max(0, index >= 0 ? index - 90 : 0);
  const end = Math.min(text.length, (index >= 0 ? index + cleanKeyword.length : 120) + 140);
  const snippet = text
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim();

  return `${start > 0 ? "..." : ""}${snippet}${end < text.length ? "..." : ""}`;
};

const firstEvidence = (chunks: ExtractedDocumentChunk[], keywords: string[]): EvidenceMatch | undefined => {
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeForEvidence(keyword);
    const chunk = chunks.find((item) => normalizeForEvidence(item.text).includes(normalizedKeyword));
    if (chunk) return { chunk, keyword };
  }

  return undefined;
};

const firstRegexEvidence = (chunks: ExtractedDocumentChunk[], pattern: RegExp): EvidenceMatch | undefined => {
  for (const chunk of chunks) {
    const match = chunk.text.match(pattern);
    if (match?.[0]) return { chunk, keyword: match[0].slice(0, 120) };
  }

  return undefined;
};

const scoreFromEvidence = (
  criterion: MarkingCriterion,
  status: CriterionStatus,
  evidence?: EvidenceMatch | string,
  pageNumber?: number | null
): CriterionScore => {
  const awarded =
    status === "met" ? criterion.marks : status === "partial" ? partialMark(criterion) : 0;
  const safeStatus: CriterionStatus = status === "partial" && awarded === 0 ? "missing" : status;

  if (!evidence) {
    return { awarded: safeStatus === "missing" ? 0 : awarded, status: safeStatus, pageNumber: pageNumber ?? null };
  }

  if (typeof evidence === "string") {
    return {
      awarded: safeStatus === "missing" ? 0 : awarded,
      status: safeStatus,
      evidenceSnippet: evidence,
      pageNumber: pageNumber ?? null,
    };
  }

  return {
    awarded: safeStatus === "missing" ? 0 : awarded,
    status: safeStatus,
    evidenceSnippet: extractSnippet(evidence.chunk.text, evidence.keyword),
    pageNumber: evidence.chunk.pageNumber ?? null,
  };
};

const scoreBySignals = (
  chunks: ExtractedDocumentChunk[],
  criterion: MarkingCriterion,
  fullSignals: string[],
  partialSignals: string[] = []
) => {
  if (!chunks.length) return scoreFromEvidence(criterion, "missing");

  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, [...fullSignals, ...partialSignals, ...criterion.keywords]);
  const supportMatched = partialSignals.some((signal) => hasPhrase(text, signal));

  if (fullSignals.length > 0 && fullSignals.every((signal) => hasPhrase(text, signal))) {
    return scoreFromEvidence(criterion, "met", evidence);
  }

  if (fullSignals.length === 0 && supportMatched) {
    return scoreFromEvidence(criterion, "met", evidence);
  }

  if (supportMatched) {
    return scoreFromEvidence(criterion, "partial", evidence);
  }

  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreHeadingAndSupport = (
  chunks: ExtractedDocumentChunk[],
  criterion: MarkingCriterion,
  headings: string[],
  supportSignals: string[],
  requiredSupportCount = 1
) => {
  if (!chunks.length) return scoreFromEvidence(criterion, "missing");

  const text = chunksText(chunks);
  const hasHeading = hasAnyPhrase(text, headings);
  const supportCount = countPhraseMatches(text, supportSignals);
  const evidence = firstEvidence(chunks, [...headings, ...supportSignals, ...criterion.keywords]);

  if (hasHeading && supportCount >= requiredSupportCount) {
    return scoreFromEvidence(criterion, "met", evidence);
  }

  if (hasHeading || supportCount >= requiredSupportCount) {
    return scoreFromEvidence(criterion, "partial", evidence);
  }

  return scoreFromEvidence(criterion, "missing", evidence);
};

const countObjectiveItems = (text: string) => {
  const normalized = text.replace(/\s+/g, " ");
  const numberedItems = normalized.match(/\b\d+[\).]\s*(?:to|determine|assess|identify|establish|examine|find out)\b/gi)?.length ?? 0;
  const objectiveVerbs = normalized.match(/\b(to determine|to assess|to identify|to establish|to examine|to find out|to evaluate)\b/gi)?.length ?? 0;
  return Math.max(numberedItems, objectiveVerbs);
};

const hasQuestionEvidence = (text: string) => {
  const questionMarks = (text.match(/\?/g) ?? []).length;
  const questionStarters =
    text.match(/\b(what|which|how|why|to what extent)\b[^.?!]{0,180}\?/gi)?.length ?? 0;
  return questionMarks >= 2 || questionStarters >= 2;
};

const hasCitationEvidence = (text: string) =>
  /\([A-Z][A-Za-z' -]+(?:\s+et\s+al\.)?,?\s*(?:19|20)\d{2}[a-z]?\)/.test(text) ||
  /\b[A-Z][A-Za-z' -]+\s+\((?:19|20)\d{2}[a-z]?\)/.test(text) ||
  /\bet\s+al\.?,?\s*(?:19|20)\d{2}/i.test(text);

const countReferenceEntries = (text: string) => {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20);
  const lineEntries = lines.filter((line) => /\b(?:19|20)\d{2}[a-z]?\b/.test(line)).length;
  if (lineEntries >= 5) return lineEntries;

  const yearMatches = text.match(/\b(?:19|20)\d{2}[a-z]?\b/g) ?? [];
  const apaLikeSegments =
    text.match(/[A-Z][A-Za-z' -]+,\s*[A-Z](?:\.[,\s]*)?.{0,180}?\b(?:19|20)\d{2}[a-z]?\b/g)?.length ?? 0;
  return Math.max(yearMatches.length, apaLikeSegments);
};

const firstPageNumber = (chunks: ExtractedDocumentChunk[]) =>
  chunks.find((chunk) => chunk.pageNumber !== null && chunk.pageNumber !== undefined)?.pageNumber ?? null;

const scoreTitlePage: CriterionRule = (chunks, criterion) => {
  if (!chunks.length) return scoreFromEvidence(criterion, "missing");

  const firstChunks = chunks.slice(0, 3);
  const text = chunksText(firstChunks);
  const evidence = firstEvidence(firstChunks, ["research report", "research proposal", "candidate", "student", "supervisor", "school"]);
  const hasTitleSignal = /factors|prevalence|knowledge|attitude|practice|assessment|uptake|utili[sz]ation|effect|influence|determinants/i.test(text);
  const supportCount = [
    /\b(candidate|student|name|registration|index|number)\b/i.test(text),
    /\b(supervisor|supervised by|department|school|college|institute|university|training)\b/i.test(text),
    /\b(submitted|partial fulfilment|award|diploma|certificate|degree)\b/i.test(text),
    /\b(?:19|20)\d{2}\b/.test(text) || /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(text),
  ].filter(Boolean).length;

  if (hasTitleSignal && supportCount >= 3) return scoreFromEvidence(criterion, "met", evidence);
  if (hasTitleSignal && supportCount >= 2) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreAbstract: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["abstract", "background", "methodology", "results", "conclusion", "recommendations"]);
  if (!hasPhrase(text, "abstract")) return scoreFromEvidence(criterion, "missing", evidence);

  const contentParts = countPhraseMatches(text, ["background", "methodology", "methods", "results", "findings", "conclusion", "recommendations"]);
  if (contentParts >= 4) return scoreFromEvidence(criterion, "met", evidence);
  if (contentParts >= 2) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreObjectives: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["objectives", "specific objectives", "general objective", "to determine", "to assess"]);
  const hasHeading = hasAnyPhrase(text, ["objectives", "specific objectives", "research objectives"]);
  const objectiveCount = countObjectiveItems(text);

  if (hasHeading && objectiveCount >= 3) return scoreFromEvidence(criterion, "met", evidence);
  if (hasHeading && objectiveCount >= 1) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreResearchQuestions: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const questionEvidence = firstRegexEvidence(chunks, /\b(?:what|which|how|why|to what extent)\b[^.?!]{0,180}\?/i);
  const evidence =
    questionEvidence ??
    firstEvidence(chunks, ["what are", "what is", "which factors", "how does", "how do", "research questions"]);
  const hasHeading = hasAnyPhrase(text, ["research questions", "study questions"]);

  if (hasHeading && hasQuestionEvidence(text)) return scoreFromEvidence(criterion, "met", evidence);
  if (hasHeading) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreProblemStatement: CriterionRule = (chunks, criterion) => {
  const gapSignals = ["gap", "however", "despite", "limited", "problem", "poor", "need", "unknown", "there is"];
  return scoreHeadingAndSupport(
    chunks,
    criterion,
    ["problem statement", "statement of the problem"],
    gapSignals,
    2
  );
};

const scoreBackground: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["background of the study", "background", "globally", "uganda", "district"]);
  const hasBackground = hasAnyPhrase(text, ["background of the study", "background"]);
  const contextCount = countPhraseMatches(text, ["globally", "worldwide", "africa", "uganda", "district", "health facility", "according to"]);
  const hasEvidence = hasCitationEvidence(text) || contextCount >= 2;

  if (hasBackground && hasEvidence) return scoreFromEvidence(criterion, "met", evidence);
  if (hasBackground || contextCount >= 2) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scorePurpose: CriterionRule = (chunks, criterion) =>
  scoreHeadingAndSupport(chunks, criterion, ["purpose of the study", "purpose"], ["to determine", "to assess", "to establish", "aim"]);

const scoreJustification: CriterionRule = (chunks, criterion) =>
  scoreHeadingAndSupport(chunks, criterion, ["justification", "rationale"], ["need", "important", "necessary", "benefit", "because", "gap"]);

const scoreSignificance: CriterionRule = (chunks, criterion) =>
  scoreHeadingAndSupport(
    chunks,
    criterion,
    ["significance of the study", "significance"],
    ["beneficiaries", "policy", "practice", "students", "health workers", "community", "researchers"],
    1
  );

const scoreObjectiveBasedLiterature: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["literature review", "specific objective", "objective", "review of literature"]);
  const hasLiterature = hasAnyPhrase(text, ["literature review", "review of literature"]);
  const objectiveCount = countObjectiveItems(text);
  const hasCitations = hasCitationEvidence(text);

  if (hasLiterature && (objectiveCount >= 2 || (hasAnyPhrase(text, ["objective one", "objective two", "specific objective"]) && hasCitations))) {
    return scoreFromEvidence(criterion, "met", evidence);
  }

  if (hasLiterature || objectiveCount >= 1 || hasCitations) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreLiteratureOrganization: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["literature review", "conceptual framework", "theoretical framework", "objective"]);
  const subsectionCount =
    (text.match(/\b2\.\d+\b/g) ?? []).length +
    countPhraseMatches(text, ["conceptual framework", "theoretical framework", "review of literature", "specific objective"]);

  if (subsectionCount >= 3) return scoreFromEvidence(criterion, "met", evidence);
  if (subsectionCount >= 1) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreApaCitation: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["et al", "according to", "cited", "references"]);
  const citationCount =
    (text.match(/\([A-Z][A-Za-z' -]+(?:\s+et\s+al\.)?,?\s*(?:19|20)\d{2}[a-z]?\)/g) ?? []).length +
    (text.match(/\bet\s+al\.?,?\s*(?:19|20)\d{2}/gi) ?? []).length;

  if (citationCount >= 5) return scoreFromEvidence(criterion, "met", evidence);
  if (citationCount >= 1 || hasCitationEvidence(text)) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreStudyDesign: CriterionRule = (chunks, criterion) =>
  scoreHeadingAndSupport(
    chunks,
    criterion,
    ["study design", "research design"],
    ["cross sectional", "cross-sectional", "descriptive", "qualitative", "quantitative", "mixed", "retrospective", "prospective", "experimental"],
    1
  );

const scoreStudySetting: CriterionRule = (chunks, criterion) =>
  scoreHeadingAndSupport(
    chunks,
    criterion,
    ["study setting", "setting"],
    ["hospital", "health centre", "health center", "clinic", "district", "municipality", "sub county", "ward", "facility", "uganda"],
    1
  );

const scoreStudyPopulation: CriterionRule = (chunks, criterion) =>
  scoreHeadingAndSupport(
    chunks,
    criterion,
    ["study population", "target population"],
    ["respondents", "participants", "patients", "mothers", "women", "students", "nurses", "health workers", "caregivers", "aged"],
    1
  );

const scoreSampleSize: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["sample size", "kish", "determination", "formula", "respondents"]);
  const hasHeading = hasAnyPhrase(text, ["sample size", "sample size determination"]);
  const hasDetermination = hasAnyPhrase(text, ["formula", "kish", "determination", "calculated", "respondents", "participants"]) || /\bn\s*=\s*\d+/i.test(text);

  if (hasHeading && hasDetermination) return scoreFromEvidence(criterion, "met", evidence);
  if (hasHeading) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreSampling: CriterionRule = (chunks, criterion) =>
  scoreHeadingAndSupport(
    chunks,
    criterion,
    ["sampling", "sampling procedure", "sampling method"],
    ["simple random", "systematic", "purposive", "consecutive", "stratified", "lottery", "procedure", "selected", "technique"],
    1
  );

const scoreVariables: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["variables", "dependent", "independent"]);
  const hasVariables = hasPhrase(text, "variables");
  const hasDependentIndependent = hasAnyPhrase(text, ["dependent", "independent"]);

  if (hasVariables && hasDependentIndependent) return scoreFromEvidence(criterion, "met", evidence);
  if (hasVariables || hasDependentIndependent) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreTools: CriterionRule = (chunks, criterion) =>
  scoreBySignals(chunks, criterion, [], ["questionnaire", "interview guide", "checklist", "data collection tool", "research instruments"]);

const scoreQualityAssurance: CriterionRule = (chunks, criterion) =>
  scoreHeadingAndSupport(
    chunks,
    criterion,
    ["quality assurance", "validity", "reliability"],
    ["validity", "reliability", "pretest", "pilot", "trustworthiness", "training", "supervisor"],
    2
  );

const scoreDataAnalysis: CriterionRule = (chunks, criterion) =>
  scoreHeadingAndSupport(
    chunks,
    criterion,
    ["data analysis", "data management", "data management and analysis"],
    ["coding", "spss", "excel", "statistical", "frequency", "percentage", "thematic", "cleaning", "storage"],
    1
  );

const scoreEthics: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["ethical", "consent", "confidentiality", "approval", "permission"]);
  const hasHeading = hasAnyPhrase(text, ["ethical considerations", "ethical", "ethics"]);
  const ethicsSignals = countPhraseMatches(text, ["consent", "confidentiality", "approval", "permission", "voluntary", "anonymity", "privacy"]);

  if (hasHeading && ethicsSignals >= 3) return scoreFromEvidence(criterion, "met", evidence);
  if (hasHeading && ethicsSignals >= 1) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreTablesFigures: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["table", "figure", "results", "findings"]);
  const tableCount = (text.match(/\btable\s+\d+/gi) ?? []).length;
  const figureCount = (text.match(/\bfigure\s+\d+/gi) ?? []).length;
  const hasFindings = hasAnyPhrase(text, ["results", "findings", "data presentation"]);

  if (hasFindings && tableCount + figureCount >= 2) return scoreFromEvidence(criterion, "met", evidence);
  if (hasFindings || tableCount + figureCount >= 1) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreResultsInterpretation: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["interpretation", "results", "findings", "majority", "minority"]);
  const interpretationSignals = countPhraseMatches(text, ["interpretation", "majority", "minority", "this implies", "this means", "findings show", "results show", "revealed"]);

  if (interpretationSignals >= 3) return scoreFromEvidence(criterion, "met", evidence);
  if (interpretationSignals >= 1) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreDiscussionObjectives: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["discussion", "objective", "findings"]);
  const hasDiscussion = hasAnyPhrase(text, ["discussion", "discussion of findings"]);
  const objectiveSignals = countPhraseMatches(text, ["objective", "findings", "according to objective", "specific objective"]);

  if (hasDiscussion && objectiveSignals >= 2) return scoreFromEvidence(criterion, "met", evidence);
  if (hasDiscussion || objectiveSignals >= 1) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreComparisonLiterature: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["similar", "consistent", "contrary", "in line", "literature", "study"]);
  const comparisonSignals = countPhraseMatches(text, [
    "similar",
    "consistent",
    "contrary",
    "contradict",
    "in line",
    "agrees",
    "disagrees",
    "compared",
    "literature",
    "study found",
  ]);

  if (comparisonSignals >= 2 && hasCitationEvidence(text)) return scoreFromEvidence(criterion, "met", evidence);
  if (comparisonSignals >= 1) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreProblemPurposeLink: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["problem", "purpose", "findings", "objective"]);
  const linkSignals = countPhraseMatches(text, ["problem", "purpose", "findings", "objective", "research question"]);

  if (linkSignals >= 3) return scoreFromEvidence(criterion, "met", evidence);
  if (linkSignals >= 1) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreConclusion: CriterionRule = (chunks, criterion) =>
  scoreHeadingAndSupport(chunks, criterion, ["conclusion", "conclusions"], ["objectives", "findings", "study revealed", "concluded"], 1);

const scoreRecommendations: CriterionRule = (chunks, criterion) =>
  scoreHeadingAndSupport(
    chunks,
    criterion,
    ["recommendations", "recommendation"],
    ["should", "ministry", "health workers", "community", "hospital", "school", "government", "researchers"],
    1
  );

const scoreNursingPractice: CriterionRule = (chunks, criterion) =>
  scoreBySignals(chunks, criterion, [], ["nursing practice", "health practice", "implications for practice", "clinical practice"]);

const scoreReferenceCount: CriterionRule = (chunks, criterion) => {
  if (!chunks.length) return scoreFromEvidence(criterion, "missing");
  const text = chunksText(chunks);
  const count = countReferenceEntries(text);
  const pageNumber = firstPageNumber(chunks);

  if (count >= 20) {
    return scoreFromEvidence(criterion, "met", `Detected ${count} reference-like entries in the References section.`, pageNumber);
  }

  if (count >= 10) {
    return scoreFromEvidence(criterion, "partial", `Detected ${count} reference-like entries; the guide expects at least 20.`, pageNumber);
  }

  return scoreFromEvidence(
    criterion,
    "missing",
    count > 0 ? `Detected ${count} reference-like entries; the guide expects at least 20.` : undefined,
    pageNumber
  );
};

const scoreApaFormat: CriterionRule = (chunks, criterion) => {
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, ["apa", "references", "appendix", "table"]);
  const apaSignals = countPhraseMatches(text, ["apa", "references", "appendix", "table", "figure"]) + (hasCitationEvidence(text) ? 1 : 0);

  if (apaSignals >= 3) return scoreFromEvidence(criterion, "met", evidence);
  if (apaSignals >= 1) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const exactAttachmentRule = (phrases: string[]): CriterionRule => (chunks, criterion) => {
  if (!chunks.length) return scoreFromEvidence(criterion, "missing");
  const text = chunksText(chunks);
  const evidence = firstEvidence(chunks, phrases);

  if (hasAnyPhrase(text, phrases)) return scoreFromEvidence(criterion, "met", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

const scoreIrcApproval: CriterionRule = (chunks, criterion) => {
  if (!chunks.length) return scoreFromEvidence(criterion, "missing");

  const evidence = firstRegexEvidence(
    chunks,
    /(?:\b(?:irc|institutional research committee|research ethics committee|institutional review board)\b.{0,140}\b(?:approval|approved|clearance|cleared)\b)|(?:\b(?:approval|approved|clearance|cleared)\b.{0,140}\b(?:irc|institutional research committee|research ethics committee|institutional review board)\b)/i
  );

  return evidence
    ? scoreFromEvidence(criterion, "met", evidence)
    : scoreFromEvidence(criterion, "missing");
};

const criterionRules: Record<string, CriterionRule> = {
  "title-page": scoreTitlePage,
  "table-of-contents": exactAttachmentRule(["table of contents"]),
  "list-of-tables": exactAttachmentRule(["list of tables"]),
  "list-of-figures": exactAttachmentRule(["list of figures"]),
  "key-terms": exactAttachmentRule(["definition of terms", "operational terms", "key terms"]),
  abbreviations: exactAttachmentRule(["abbreviations", "acronyms", "list of abbreviations"]),
  abstract: scoreAbstract,
  background: scoreBackground,
  "problem-statement": scoreProblemStatement,
  purpose: scorePurpose,
  objectives: scoreObjectives,
  "research-questions": scoreResearchQuestions,
  justification: scoreJustification,
  significance: scoreSignificance,
  "objective-based-literature": scoreObjectiveBasedLiterature,
  "literature-organization": scoreLiteratureOrganization,
  "apa-citation": scoreApaCitation,
  "study-design": scoreStudyDesign,
  "study-setting": scoreStudySetting,
  "study-population": scoreStudyPopulation,
  inclusion: exactAttachmentRule(["inclusion criteria"]),
  exclusion: exactAttachmentRule(["exclusion criteria"]),
  "sample-size": scoreSampleSize,
  sampling: scoreSampling,
  variables: scoreVariables,
  tools: scoreTools,
  "quality-assurance": scoreQualityAssurance,
  "data-analysis": scoreDataAnalysis,
  ethics: scoreEthics,
  dissemination: exactAttachmentRule(["dissemination", "dissemination of findings", "study findings will be disseminated"]),
  limitations: exactAttachmentRule(["limitations", "study limitations", "limitations of the study"]),
  "tables-figures": scoreTablesFigures,
  "results-interpretation": scoreResultsInterpretation,
  "discussion-objectives": scoreDiscussionObjectives,
  "comparison-literature": scoreComparisonLiterature,
  "problem-purpose-link": scoreProblemPurposeLink,
  conclusion: scoreConclusion,
  recommendations: scoreRecommendations,
  "nursing-practice": scoreNursingPractice,
  "reference-count": scoreReferenceCount,
  "apa-format": scoreApaFormat,
  instruments: exactAttachmentRule(["questionnaire", "interview guide", "research instrument", "data collection tool"]),
  "consent-form": exactAttachmentRule(["consent form", "informed consent form", "participant consent form"]),
  "introduction-letter": exactAttachmentRule(["introduction letter", "permission letter"]),
  "irc-approval": scoreIrcApproval,
};

const scoreGenericCriterion: CriterionRule = (chunks, criterion) => {
  if (!chunks.length || criterion.keywords.length === 0) {
    return scoreFromEvidence(criterion, "missing");
  }

  const text = chunksText(chunks);
  const matches = countPhraseMatches(text, criterion.keywords);
  const evidence = firstEvidence(chunks, criterion.keywords);
  const requiredForFull = Math.max(1, Math.ceil(criterion.keywords.length * 0.75));

  if (matches >= requiredForFull) return scoreFromEvidence(criterion, "met", evidence);
  if (matches > 0) return scoreFromEvidence(criterion, "partial", evidence);
  return scoreFromEvidence(criterion, "missing", evidence);
};

export const getRelevantChunksForMarkingSection = (
  extracted: ExtractedDocumentText | null,
  sectionId: string
): ExtractedDocumentChunk[] => {
  if (!extracted?.chunks?.length) return [];

  const aliases = sectionAliases[sectionId] ?? [sectionId];
  const sectionChunks = extracted.chunks.filter((chunk) => aliases.includes(chunk.sectionTitle));
  if (sectionChunks.length > 0) return sectionChunks;

  if (sectionId === "preliminary") {
    return extracted.chunks.slice(0, Math.min(3, extracted.chunks.length));
  }

  if (sectionId === "references" || sectionId === "appendices") {
    return extracted.chunks.slice(Math.max(0, extracted.chunks.length - 3));
  }

  return [];
};

export const scoreMarkingGuideSections = (
  extracted: ExtractedDocumentText | null,
  guideSections: MarkingGuideSection[]
): RubricScore => {
  const sections = guideSections.map((section) => {
    const relevantChunks = getRelevantChunksForMarkingSection(extracted, section.id);
    const criteria = section.criteria.map((criterion) => {
      const rule = criterionRules[criterion.id] ?? scoreGenericCriterion;
      const scored = rule(relevantChunks, criterion);

      return {
        id: criterion.id,
        label: criterion.label,
        marks: criterion.marks,
        awarded: scored.awarded,
        status: scored.status,
        guidance: criterion.guidance,
        evidenceSnippet: scored.evidenceSnippet,
        pageNumber: scored.pageNumber,
      };
    });

    return {
      id: section.id,
      title: section.title,
      marks: section.marks,
      awarded: roundMark(criteria.reduce((sum, criterion) => sum + criterion.awarded, 0)),
      criteria,
    };
  });

  return {
    awarded: roundMark(sections.reduce((sum, section) => sum + section.awarded, 0)),
    total: guideSections.reduce((sum, section) => sum + section.marks, 0),
    sections,
  };
};
