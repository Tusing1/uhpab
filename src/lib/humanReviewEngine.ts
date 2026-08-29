import type { ReviewToolHandoff } from "@/lib/toolHandoff";

export type HumanReviewCategory =
  | "Content specificity"
  | "Plain language"
  | "Academic voice"
  | "Style cleanup"
  | "Citation integrity"
  | "Technical cleanup";

export type HumanReviewSeverity = "high" | "medium" | "low";
export type HumanReviewMode = "standard" | "deep";
export type HumanReviewMethod = "local" | "ai-assisted" | "ai-fallback";

export type HumanReviewMatch = {
  text: string;
  index: number;
  snippet: string;
};

export type HumanReviewSignal = {
  id: string;
  label: string;
  category: HumanReviewCategory;
  severity: HumanReviewSeverity;
  description: string;
  suggestion: string;
  matches: HumanReviewMatch[];
};

export type HumanReviewChange = {
  category: HumanReviewCategory;
  before: string;
  after: string;
  reason: string;
};

export type HumanReviewResult = {
  originalText: string;
  revisedText: string;
  signals: HumanReviewSignal[];
  remainingSignals?: HumanReviewSignal[];
  changes: HumanReviewChange[];
  warnings: string[];
  readinessScore: number;
  reviewMode?: HumanReviewMode;
  reviewMethod?: HumanReviewMethod;
  deepReviewSummary?: string[];
  sourceContext?: ReviewToolHandoff | null;
};

type HumanReviewOptions = {
  mode?: HumanReviewMode;
  method?: HumanReviewMethod;
  preRevisedText?: string;
  deepReviewSummary?: string[];
};

type PatternDefinition = Omit<HumanReviewSignal, "matches"> & {
  patterns: RegExp[];
};

type ReplacementRule = {
  category: HumanReviewCategory;
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  reason: string;
};

const normalizeText = (text: string) =>
  text
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const phrasePattern = (phrases: string[]) =>
  new RegExp(
    `\\b(${phrases
      .map((phrase) => escapeRegExp(phrase).replace(/\\ /g, "\\s+").replace(/'/g, "['’]?"))
      .join("|")})\\b`,
    "i"
  );

const toGlobal = (pattern: RegExp) => {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
};

const snippetAround = (text: string, index: number, length: number) => {
  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + length + 110);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
};

const uniqueMatches = (text: string, patterns: RegExp[]) => {
  const seen = new Set<string>();
  const matches: HumanReviewMatch[] = [];

  patterns.forEach((pattern) => {
    const globalPattern = toGlobal(pattern);
    let match: RegExpExecArray | null;
    while ((match = globalPattern.exec(text))) {
      const value = match[0].trim();
      if (!value) continue;
      const key = `${value.toLowerCase()}-${match.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        text: value,
        index: match.index,
        snippet: snippetAround(text, match.index, value.length),
      });
    }
  });

  return matches.sort((a, b) => a.index - b.index);
};

const generatedPhraseSignals = [
  "provide a valuable insight",
  "left an indelible mark",
  "a stark reminder",
  "a nuanced understanding",
  "significant role in shaping",
  "the complex interplay",
  "broad implication",
  "an unwavering commitment",
  "underscore the importance",
  "play a pivotal role",
  "a pivotal moment",
  "navigate the complex",
  "mark a turning point",
  "continue to inspire",
  "gain a deeper understanding",
  "the transformative power",
  "play a crucial role",
  "the relentless pursuit",
  "emphasize the need",
  "a multi-faceted approach",
  "highlight the potential",
  "a significant milestone",
  "leave a lasting",
  "offer a valuable",
  "a profound implication",
  "pave the way for the future",
  "a significant step forward",
  "far-reaching implications",
  "a comprehensive framework",
  "importance to consider",
  "a unique blend",
  "couldn't help but wonder",
  "underscore the need",
  "framework for understanding",
  "highlight the need",
  "a comprehensive understanding",
  "the journey begins",
  "understanding the fundamental",
  "a delicate balance",
  "the path ahead",
  "gain an insight",
  "laid the groundwork",
  "aim to explore",
  "present a unique challenge",
  "provide a comprehensive",
  "particularly with regard to",
  "address the root cause",
  "an ongoing dialogue",
  "ability to navigate",
  "present a significant",
  "study shed light on",
  "a diverse perspective",
  "a comprehensive overview",
  "potentially lead to",
  "a broad understanding",
  "contribute to the understanding",
  "particularly noteworthy",
  "the evidence base for decision making",
  "identify an area of improvement",
  "undergone a significant",
  "need a robust",
  "initiative aims to",
  "offering a unique",
  "a new avenue",
  "despite the challenge",
  "ready to embrace",
  "make accessible",
  "stand in stark contrast",
  "it is important to understand that",
  "it's worth noting",
  "plays a crucial role",
  "a testament to",
  "in today's digital age",
  "in today's fast-paced world",
  "at its core",
  "shed light on",
  "here's the thing",
  "here's the kicker",
  "why does this matter",
];

const patternDefinitions: PatternDefinition[] = [
  {
    id: "significance-inflation",
    label: "Inflated importance claim",
    category: "Content specificity",
    severity: "high",
    description: "Vague superlatives can make writing sound over-polished without adding evidence.",
    suggestion: "Replace the claim with a specific fact, figure, date, or study finding.",
    patterns: [
      /\b(pivotal|watershed|landmark|defining|historic|monumental)\s+(moment|shift|change|development|step)\b/i,
      /\b(transformative|groundbreaking|revolutionary|game-changing)\s+(potential|impact|role|approach|power)\b/i,
    ],
  },
  {
    id: "vague-attribution",
    label: "Vague source attribution",
    category: "Citation integrity",
    severity: "high",
    description: "Unnamed authorities weaken academic credibility.",
    suggestion: "Name the source, year, and exact claim, or remove the attribution.",
    patterns: [
      /\b(experts?|researchers?|scientists?|analysts?|observers?|critics?|many|some)\s+(believe|say|suggest|argue|note|claim|indicate|report|agree)\b/i,
      /\b(studies?|research)\s+(show|suggest|indicate|have shown|has shown|have found)\b/i,
      /\bit\s+(is|has been)\s+(widely|generally|commonly|broadly)\s+(believed|accepted|recognized|acknowledged)\b/i,
    ],
  },
  {
    id: "ai-vocabulary",
    label: "Over-polished vocabulary",
    category: "Plain language",
    severity: "medium",
    description: "Some words are often used as polish but make student work sound less direct.",
    suggestion: "Use simpler academic wording and keep the claim specific.",
    patterns: [
      /\b(testament|landscape|showcasing|showcase|delve|navigate|tailored|seamlessly?|intuitive(?:ly)?|robust|synerg(?:y|ize|istic)|paradigm|holistic(?:ally)?|comprehensive|leverage|foster(?:ing)?|empower(?:s|ed|ing)?|nuanced|multifaceted|intricate|transformative|pivotal|groundbreaking|garner|meticulous(?:ly)?|tapestry|align with|facilitate|enhance|unlock|cultivate|embrace|optimize|harness|dynamic|invaluable|unparalleled|framework|catalyst|cornerstone|realm|streamline|paramount|innovative|demystify|unleash|bespoke|thought leadership)\b/i,
    ],
  },
  {
    id: "generated-phrases",
    label: "Generic generated phrase",
    category: "Academic voice",
    severity: "high",
    description: "Template-like phrases can sound generic and unsupported.",
    suggestion: "Rewrite in the student's direct voice and connect it to the actual study topic.",
    patterns: [
      phrasePattern(generatedPhraseSignals),
      /not\s+only\b[\w\s,]{0,90}\bbut\s+also\b/i,
      /\bit'?s\s+not\s+just\s+about\s+[\w\s,]+[;,]\s+it'?s\s+about\b/i,
    ],
  },
  {
    id: "surface-analysis",
    label: "Surface-level analysis wording",
    category: "Content specificity",
    severity: "medium",
    description: "Participles like highlighting and showcasing can hide a missing explanation.",
    suggestion: "State what the finding means and give the evidence behind it.",
    patterns: [
      /\b(symbolizing|reflecting|showcasing|highlighting|demonstrating|illustrating|underscoring|emphasizing)\s+(the\s+)?(importance|role|value|potential|impact|significance|power)\b/i,
    ],
  },
  {
    id: "promotional-tone",
    label: "Promotional tone",
    category: "Academic voice",
    severity: "medium",
    description: "Marketing adjectives do not fit formal research writing.",
    suggestion: "Use neutral, evidence-based wording.",
    patterns: [
      /\b(nestled|breathtaking|stunning|magnificent|majestic|vibrant|picturesque|world-class|state-of-the-art|cutting-edge)\b/i,
      /\bboasts\s+(a|an|the|its)\b/i,
    ],
  },
  {
    id: "chatbot-artifact",
    label: "Assistant artifact",
    category: "Technical cleanup",
    severity: "high",
    description: "Conversational assistant leftovers should never appear in formal submissions.",
    suggestion: "Remove the artifact and keep only the research content.",
    patterns: [
      /\b(I hope this helps|Let me know if|Certainly!?|Absolutely!?|Of course!?|As an AI language model|As an AI assistant)\b/i,
    ],
  },
  {
    id: "model-disclaimer",
    label: "Model or cutoff disclaimer",
    category: "Technical cleanup",
    severity: "high",
    description: "Knowledge-cutoff or model-access wording is not part of student research.",
    suggestion: "Remove it or replace it with a real cited source.",
    patterns: [/\b(details are limited|available information|training data|knowledge cutoff|real-time information)\b/i],
  },
  {
    id: "dash-overuse",
    label: "Dash-heavy sentence",
    category: "Style cleanup",
    severity: "medium",
    description: "Repeated dash pauses can make a paragraph feel machine-polished.",
    suggestion: "Use commas, parentheses, or separate sentences.",
    patterns: [/[^\n]*[—–][^\n]*/u, /\s-\s/],
  },
  {
    id: "filler-phrases",
    label: "Wordy filler phrase",
    category: "Plain language",
    severity: "medium",
    description: "Wordy phrases slow the sentence without improving meaning.",
    suggestion: "Use concise wording.",
    patterns: [/\b(In order to|Due to the fact that|In the event that|At this point in time)\b/i],
  },
  {
    id: "formulaic-challenge",
    label: "Formulaic challenge sentence",
    category: "Content specificity",
    severity: "medium",
    description: "Despite-challenges wording often sounds generic unless the challenge is named.",
    suggestion: "State the actual challenge and its effect on the study population or setting.",
    patterns: [
      /despite\s+(challenges?|obstacles?|hurdles?|difficulties?)[\w\s,-]+continues?\s+to\s+(thrive|grow|excel|succeed|flourish|evolve|lead)/i,
    ],
  },
  {
    id: "technical-footprint",
    label: "Technical generation footprint",
    category: "Technical cleanup",
    severity: "high",
    description: "Tooling strings and raw citation artifacts must be removed.",
    suggestion: "Remove the artifact and verify the real reference.",
    patterns: [/\b(turn0search0|\[oaicite:\d+\]|oai_citation|contentReference|attributableIndex)\b/i],
  },
  {
    id: "markdown-leakage",
    label: "Raw markdown left in text",
    category: "Technical cleanup",
    severity: "medium",
    description: "Raw markdown marks look unfinished in a formal report.",
    suggestion: "Remove markdown marks or format the text properly.",
    patterns: [/\*\*([^*]+)\*\*/],
  },
  {
    id: "loose-citation-mark",
    label: "Loose bracket citation",
    category: "Citation integrity",
    severity: "medium",
    description: "Orphaned bracket numbers are often copied from generated text.",
    suggestion: "Replace with a real APA citation or remove the orphaned marker.",
    patterns: [/\[\d+\]/],
  },
];

const replacementRules: ReplacementRule[] = [
  { category: "Technical cleanup", pattern: /\bI\s+hope\s+this\s+(helps?|is helpful|answers? your question)[.!]?\s*/gi, replacement: "", reason: "Removed conversational assistant wording." },
  { category: "Technical cleanup", pattern: /\bLet\s+me\s+know\s+if\s+(you\s+have\s+any\s+)?(more\s+)?questions?[.!]?\s*/gi, replacement: "", reason: "Removed chat-style follow-up wording." },
  { category: "Technical cleanup", pattern: /\bAs\s+an\s+AI\s+(language\s+model|assistant|model)[,.]?\s*/gi, replacement: "", reason: "Removed a model disclosure artifact from formal prose." },
  { category: "Technical cleanup", pattern: /\bAs\s+of\s+my\s+(knowledge\s+)?cutoff[^.]*\.\s*/gi, replacement: "", reason: "Removed knowledge-cutoff wording; claims need real sources." },
  { category: "Technical cleanup", pattern: /\bturn0search0|\[oaicite:\d+\]|oai_citation|contentReference|attributableIndex\b/gi, replacement: "", reason: "Removed raw tool or citation artifact." },
  { category: "Citation integrity", pattern: /\[\d+\]/g, replacement: "", reason: "Removed orphaned numeric citation marks." },
  { category: "Plain language", pattern: /\bIn\s+order\s+to\b/gi, replacement: "To", reason: "Made the sentence more direct." },
  { category: "Plain language", pattern: /\bDue\s+to\s+the\s+fact\s+that\b/gi, replacement: "Because", reason: "Replaced wordy filler with concise wording." },
  { category: "Plain language", pattern: /\bIn\s+the\s+event\s+that\b/gi, replacement: "If", reason: "Used a shorter conditional phrase." },
  { category: "Plain language", pattern: /\bAt\s+this\s+point\s+in\s+time\b/gi, replacement: "Currently", reason: "Used a concise time expression." },
  { category: "Plain language", pattern: /\bcould\s+potentially\s+possibly\b/gi, replacement: "may", reason: "Reduced stacked uncertainty words." },
  { category: "Plain language", pattern: /\bcould\s+potentially\b/gi, replacement: "may", reason: "Reduced unnecessary hedging." },
  { category: "Academic voice", pattern: /\bserves\s+as\s+a\b/gi, replacement: "is a", reason: "Used direct academic phrasing." },
  { category: "Academic voice", pattern: /\bserves\s+as\s+an\b/gi, replacement: "is an", reason: "Used direct academic phrasing." },
  { category: "Academic voice", pattern: /\bserves\s+as\s+the\b/gi, replacement: "is the", reason: "Used direct academic phrasing." },
  { category: "Academic voice", pattern: /\bfunctions\s+as\s+(a|an|the)\b/gi, replacement: "is $1", reason: "Used direct academic phrasing." },
  { category: "Academic voice", pattern: /\b(let'?s\s+dive\s+in|here\s+is\s+what\s+you\s+need\s+to\s+know|now\s+let'?s\s+look\s+at)\b[:-]?\s*/gi, replacement: "", reason: "Removed chat-style signposting." },
  { category: "Plain language", pattern: /\btestament\s+to\b/gi, replacement: "evidence of", reason: "Replaced inflated wording with concrete wording." },
  { category: "Plain language", pattern: /\blandscape\b/gi, replacement: "field", reason: "Used simpler academic wording." },
  { category: "Plain language", pattern: /\bshowcasing\b/gi, replacement: "showing", reason: "Used simpler wording." },
  { category: "Plain language", pattern: /\bdelve\s+into\b/gi, replacement: "examine", reason: "Used a direct research verb." },
  { category: "Plain language", pattern: /\bdelve\b/gi, replacement: "examine", reason: "Used a direct research verb." },
  { category: "Plain language", pattern: /\bnavigate\b/gi, replacement: "address", reason: "Used a clearer academic verb." },
  { category: "Plain language", pattern: /\btailored\b/gi, replacement: "adapted", reason: "Used plain wording." },
  { category: "Plain language", pattern: /\bseamlessly\b/gi, replacement: "smoothly", reason: "Used simpler wording." },
  { category: "Plain language", pattern: /\brobust\b/gi, replacement: "strong", reason: "Used simpler wording." },
  { category: "Plain language", pattern: /\bparadigm\b/gi, replacement: "model", reason: "Used clearer wording." },
  { category: "Plain language", pattern: /\bholistic(?:ally)?\b/gi, replacement: "overall", reason: "Used a simpler academic term." },
  { category: "Plain language", pattern: /\bcomprehensive\b/gi, replacement: "complete", reason: "Used direct wording." },
  { category: "Plain language", pattern: /\butiliz(e|es|ed|ing)\b/gi, replacement: (match) => (match.toLowerCase().endsWith("ing") ? "using" : match.toLowerCase().endsWith("es") ? "uses" : match.toLowerCase().endsWith("ed") ? "used" : "use"), reason: "Replaced utilize with use." },
  { category: "Plain language", pattern: /\bleverag(e|es|ed|ing)\b/gi, replacement: (match) => (match.toLowerCase().endsWith("ing") ? "using" : match.toLowerCase().endsWith("es") ? "uses" : match.toLowerCase().endsWith("ed") ? "used" : "use"), reason: "Replaced leverage with use where safe." },
  { category: "Plain language", pattern: /\bmultifaceted\b/gi, replacement: "complex", reason: "Used simpler wording." },
  { category: "Plain language", pattern: /\bintricate\b/gi, replacement: "complex", reason: "Used simpler wording." },
  { category: "Academic voice", pattern: /\bit\s+is\s+important\s+to\s+(note|understand)\s+that\s+/gi, replacement: "", reason: "Removed formulaic framing and started with the claim." },
  { category: "Academic voice", pattern: /\bit'?s\s+worth\s+noting\s+that\s+/gi, replacement: "", reason: "Removed formulaic framing and kept the claim." },
  { category: "Style cleanup", pattern: /[—–]/gu, replacement: ", ", reason: "Replaced dash pauses with formal punctuation." },
  { category: "Style cleanup", pattern: /\s*--\s*/gu, replacement: ", ", reason: "Replaced dash pauses with formal punctuation." },
  { category: "Style cleanup", pattern: /\s-\s/gu, replacement: ", ", reason: "Replaced dash pauses with formal punctuation." },
  { category: "Technical cleanup", pattern: /\*\*([^*]+)\*\*/g, replacement: "$1", reason: "Removed raw markdown marks." },
];

const deepReplacementRules: ReplacementRule[] = [
  { category: "Academic voice", pattern: /\bThis\s+research\b/gi, replacement: "This study", reason: "Used the standard academic term for the student's work." },
  { category: "Academic voice", pattern: /\bThis\s+paper\b/gi, replacement: "This study", reason: "Used a research-report term instead of paper-style wording." },
  { category: "Academic voice", pattern: /\bthe\s+researcher\s+aims\s+to\b/gi, replacement: "the study aims to", reason: "Reduced personal framing while preserving the aim." },
  { category: "Academic voice", pattern: /\bthis\s+study\s+aims\s+to\s+explore\b/gi, replacement: "this study examines", reason: "Used a more direct research verb." },
  { category: "Academic voice", pattern: /\bthe\s+study\s+seeks\s+to\s+explore\b/gi, replacement: "the study examines", reason: "Used a more direct research verb." },
  { category: "Plain language", pattern: /\ba\s+lot\s+of\b/gi, replacement: "many", reason: "Replaced informal wording with academic wording." },
  { category: "Plain language", pattern: /\bthings\b/gi, replacement: "factors", reason: "Replaced vague wording with a research term." },
  { category: "Plain language", pattern: /\bget\s+to\s+know\b/gi, replacement: "understand", reason: "Used formal academic wording." },
  { category: "Plain language", pattern: /\blook\s+at\b/gi, replacement: "examine", reason: "Used a direct research verb." },
  { category: "Content specificity", pattern: /\bvarious\s+factors\b/gi, replacement: "identified factors", reason: "Reduced vague wording without inventing new factors." },
  { category: "Content specificity", pattern: /\bdifferent\s+factors\b/gi, replacement: "identified factors", reason: "Reduced vague wording without inventing new factors." },
  { category: "Style cleanup", pattern: /\bIn\s+addition\s+to\s+the\s+above\b/gi, replacement: "In addition", reason: "Removed formulaic linking language." },
  { category: "Style cleanup", pattern: /\bIt\s+can\s+therefore\s+be\s+said\s+that\b/gi, replacement: "Therefore", reason: "Removed wordy framing and kept the conclusion." },
  { category: "Style cleanup", pattern: /\bThis\s+therefore\s+means\s+that\b/gi, replacement: "This means that", reason: "Reduced repetitive transition wording." },
];

const transitionRules: Array<[RegExp, string, string]> = [
  [/\bFurthermore,\s*/gi, "In addition, ", "Replaced a stiff transition with quieter academic wording."],
  [/\bMoreover,\s*/gi, "Also, ", "Replaced a stiff transition with direct wording."],
  [/\bAdditionally,\s*/gi, "In addition, ", "Replaced repetitive transition wording."],
  [/\bConsequently,\s*/gi, "As a result, ", "Used clearer cause-and-effect wording."],
  [/\bThus,\s*/gi, "Therefore, ", "Used a standard academic transition."],
  [/\bIn conclusion,\s*/gi, "Overall, ", "Used a less formulaic closing transition."],
];

const addChange = (
  changes: HumanReviewChange[],
  category: HumanReviewCategory,
  before: string,
  after: string,
  reason: string
) => {
  const cleanBefore = before.replace(/\s+/g, " ").trim();
  const cleanAfter = after.replace(/\s+/g, " ").trim();
  if (!cleanBefore || cleanBefore === cleanAfter) return;
  const duplicate = changes.some(
    (change) => change.category === category && change.before === cleanBefore && change.after === cleanAfter
  );
  if (!duplicate) changes.push({ category, before: cleanBefore, after: cleanAfter, reason });
};

const applyReplacementRules = (text: string, changes: HumanReviewChange[]) => {
  let revised = text;

  replacementRules.forEach((rule) => {
    const matches = Array.from(revised.matchAll(toGlobal(rule.pattern)));
    if (matches.length === 0) return;

    const before = matches[0][0];
    const after =
      typeof rule.replacement === "function"
        ? rule.replacement(before)
        : before.replace(rule.pattern, rule.replacement);
    revised = revised.replace(rule.pattern, rule.replacement as string);
    addChange(changes, rule.category, before, after, rule.reason);
  });

  transitionRules.forEach(([pattern, replacement, reason]) => {
    const match = revised.match(pattern)?.[0];
    if (!match) return;
    revised = revised.replace(pattern, replacement);
    addChange(changes, "Academic voice", match, replacement, reason);
  });

  return revised;
};

const applyDeepReplacementRules = (text: string, changes: HumanReviewChange[]) => {
  let revised = text;

  deepReplacementRules.forEach((rule) => {
    const matches = Array.from(revised.matchAll(toGlobal(rule.pattern)));
    if (matches.length === 0) return;

    const before = matches[0][0];
    const after =
      typeof rule.replacement === "function"
        ? rule.replacement(before)
        : before.replace(rule.pattern, rule.replacement);
    revised = revised.replace(rule.pattern, rule.replacement as string);
    addChange(changes, rule.category, before, after, rule.reason);
  });

  return revised;
};

const sentenceSplitPattern = /(?<=[.!?])\s+/;

const improveDeepParagraphFlow = (text: string, changes: HumanReviewChange[]) => {
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);

  const revisedParagraphs = paragraphs.map((paragraph) => {
    let revised = paragraph;

    if (revised.includes("; ")) {
      const next = revised.replace(/;\s+(?=[A-Z])/g, ". ");
      if (next !== revised) {
        addChange(
          changes,
          "Style cleanup",
          revised.match(/[^.;]+;\s+[A-Z][^.;]+/)?.[0] || ";",
          "Separated long semicolon-linked statements.",
          "Improved sentence flow for easier reading."
        );
        revised = next;
      }
    }

    const sentences = revised.split(sentenceSplitPattern).filter(Boolean);
    if (sentences.length >= 3) {
      const repeatedStarts = sentences
        .map((sentence) => sentence.match(/^\s*(This study|The study|This research|The researcher)\b/i)?.[0].toLowerCase())
        .filter(Boolean);
      if (repeatedStarts.length >= 3) {
        revised = sentences
          .map((sentence, index) => {
            if (index === 0) return sentence;
            return sentence.replace(/^\s*(This study|The study|This research)\s+/i, "");
          })
          .join(" ");
        addChange(
          changes,
          "Style cleanup",
          "Repeated sentence openings",
          "Varied sentence openings",
          "Reduced repetitive paragraph rhythm."
        );
      }
    }

    return revised;
  });

  return revisedParagraphs.join("\n\n");
};

const cleanSpacing = (text: string) =>
  normalizeText(text)
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([.!?])(?=[A-Z])/g, "$1 ")
    .replace(/,\s*,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/\n /g, "\n")
    .replace(/^\s*[,;:]\s*/gm, "")
    .replace(/(^|[.!?]\s+|\n+)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const hasApaCitation = (text: string) =>
  /\([A-Z][A-Za-z' -]+(?:\s+et\s+al\.)?,?\s*(?:19|20)\d{2}[a-z]?\)/.test(text) ||
  /\b[A-Z][A-Za-z' -]+\s+\((?:19|20)\d{2}[a-z]?\)/.test(text);

const hasEvidenceClaim = (text: string) =>
  /\b\d+(\.\d+)?%|\bmajority\b|\bminority\b|\bsignificant\b|\bfindings?\s+(showed|revealed|indicated)|\bresults?\s+(showed|revealed|indicated)|\baccording\s+to\b/i.test(text);

const getWarningPenalty = (warnings: string[]) =>
  warnings.reduce((sum, warning) => {
    if (/finding|statistic|source-based claim|reference list|citation/i.test(warning)) return sum + 14;
    if (/high-attention|AI-assisted deep review was unavailable/i.test(warning)) return sum + 10;
    if (/dense paragraph|short/i.test(warning)) return sum + 5;
    return sum + 4;
  }, 0);

const calculateReadinessScore = (
  signals: HumanReviewSignal[],
  changes: HumanReviewChange[],
  wordCount: number,
  warnings: string[] = [],
) => {
  if (wordCount === 0) return 0;
  const penalty = signals.reduce((sum, signal) => {
    const weight = signal.severity === "high" ? 9 : signal.severity === "medium" ? 5 : 2;
    return sum + weight * Math.min(signal.matches.length, 6);
  }, 0);
  const repairCredit = Math.min(changes.length * 2, 18);
  return Math.max(0, Math.min(100, 100 - penalty - getWarningPenalty(warnings) + repairCredit));
};

const scanSignals = (text: string) =>
  patternDefinitions
    .map((definition) => ({
      ...definition,
      matches: uniqueMatches(text, definition.patterns).slice(0, 12),
    }))
    .filter((signal) => signal.matches.length > 0);

export const createHumanReviewDownload = (result: HumanReviewResult) => {
  const signalLines = result.signals.length
    ? result.signals.map((signal) => `- ${signal.category}: ${signal.label} (${signal.matches.length}). ${signal.suggestion}`).join("\n")
    : "- No major generated-writing style signals found.";
  const changeLines = result.changes.length
    ? result.changes.map((change) => `- ${change.category}: "${change.before}" -> "${change.after}". ${change.reason}`).join("\n")
    : "- No automatic wording changes were needed.";
  const warningLines = result.warnings.length ? result.warnings.map((warning) => `- ${warning}`).join("\n") : "- None.";

  return `UHPAB Research Assistant - Human Review

Source: ${result.sourceContext?.fileName ?? "Pasted text"}
Section: ${result.sourceContext?.section ?? "Not specified"}
Review mode: ${result.reviewMode === "deep" ? "Deep review" : "Standard review"}
Review readiness: ${result.readinessScore}/100
Method: ${result.reviewMethod ?? "local"}

SIGNALS
${signalLines}

CHANGES
${changeLines}

WARNINGS
${warningLines}

REVISED TEXT
${result.revisedText}
`;
};

export const humanizeResearchText = (
  originalText: string,
  sourceContext?: ReviewToolHandoff | null,
  options: HumanReviewOptions = {}
): HumanReviewResult => {
  const normalizedOriginal = normalizeText(originalText);
  const mode = options.mode ?? "standard";
  const method = options.method ?? "local";
  const changes: HumanReviewChange[] = [];
  const warnings: string[] = [
    "This review improves clarity and removes generic generated-writing patterns. It does not certify authorship or guarantee any detector result.",
  ];
  const deepReviewSummary = [...(options.deepReviewSummary ?? [])];

  let revisedText = options.preRevisedText ? normalizeText(options.preRevisedText) : normalizedOriginal;

  if (options.preRevisedText && revisedText !== normalizedOriginal) {
    addChange(
      changes,
      "Academic voice",
      normalizedOriginal.slice(0, 180),
      revisedText.slice(0, 180),
      method === "ai-assisted"
        ? "Applied deep paragraph review while preserving meaning, citations, figures, and research context."
        : "Applied deeper paragraph review before local cleanup."
    );
  }

  revisedText = applyReplacementRules(revisedText, changes);
  if (mode === "deep") {
    revisedText = applyDeepReplacementRules(revisedText, changes);
    revisedText = improveDeepParagraphFlow(revisedText, changes);
    deepReviewSummary.push("Reviewed paragraph flow, repetition, vague phrasing, and academic directness.");
  }
  revisedText = cleanSpacing(revisedText);

  if (revisedText && !/[.!?]$/.test(revisedText)) {
    addChange(
      changes,
      "Style cleanup",
      "Final sentence without punctuation",
      "Final sentence closed with punctuation",
      "Closed the paragraph cleanly."
    );
    revisedText = `${revisedText}.`;
  }

  const signals = scanSignals(normalizedOriginal);
  const remainingSignals = scanSignals(revisedText);

  const revisedWordCount = countWords(revisedText);
  if (hasEvidenceClaim(revisedText) && !hasApaCitation(revisedText)) {
    warnings.push("The text appears to contain a finding, statistic, or source-based claim. Verify it against the reference list before submission.");
  }
  if (revisedWordCount > 170 && revisedText.split(/\n{2,}/).filter(Boolean).length === 1) {
    warnings.push("This is a dense paragraph. Consider splitting it into claim, evidence, and implication sentences.");
  }
  if (revisedWordCount > 0 && revisedWordCount < 35) {
    warnings.push("This is short. Add study-specific context if it is meant to stand alone.");
  }
  if (mode === "deep" && method === "ai-fallback") {
    warnings.push("AI-assisted deep review was unavailable, so the local deep review rules were used instead.");
  }
  if (remainingSignals.some((signal) => signal.severity === "high")) {
    warnings.push("Some high-attention wording signals remain after cleanup. Review those sentences manually before submission.");
  }

  return {
    originalText: normalizedOriginal,
    revisedText,
    signals,
    remainingSignals,
    changes,
    warnings,
    readinessScore: calculateReadinessScore(remainingSignals, changes, revisedWordCount, warnings),
    reviewMode: mode,
    reviewMethod: method,
    deepReviewSummary,
    sourceContext,
  };
};
