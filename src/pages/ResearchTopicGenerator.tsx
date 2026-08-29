import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import {
  WorkspaceMetric,
  WorkspaceSectionHeader,
  WorkspaceStatusNote,
} from "@/components/workspace/WorkspaceWorkflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowRight, CheckCircle2, FileText, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

type TopicSuggestion = {
  topic: string;
  iv: string;
  dv: string;
  reason: string;
  population: string;
  studyArea: string;
  subject: string;
  patternId: string;
};

type TopicPattern = {
  id: string;
  label: string;
  prefix: string;
  iv: string;
  dv: (subject: string, outcome: string) => string;
  fits: string;
};

const topicPatterns: TopicPattern[] = [
  {
    id: "factors",
    label: "Factors affecting something",
    prefix: "Factors Associated with",
    iv: "Factors associated with the outcome",
    dv: (subject) => subject,
    fits: "Best when you want to find reasons, causes, predictors, or influences."
  },
  {
    id: "barriers",
    label: "Barriers or challenges",
    prefix: "Barriers to",
    iv: "Barriers or challenges",
    dv: (subject) => subject,
    fits: "Best when the problem is poor access, delay, low use, or difficulty."
  },
  {
    id: "knowledge",
    label: "Knowledge and attitudes",
    prefix: "Knowledge and Attitudes Towards",
    iv: "Knowledge and attitudes",
    dv: (subject) => subject,
    fits: "Best when you want to measure what people know or believe."
  },
  {
    id: "practices",
    label: "Knowledge, attitudes, and practices",
    prefix: "Knowledge, Attitudes and Practices Towards",
    iv: "Knowledge, attitudes, and practices",
    dv: (subject) => subject,
    fits: "Best when you need a KAP-style topic."
  },
  {
    id: "prevalence",
    label: "Prevalence or magnitude",
    prefix: "Prevalence of",
    iv: "Participant characteristics",
    dv: (subject) => subject,
    fits: "Best when you want to find how common a condition or problem is."
  },
  {
    id: "utilization",
    label: "Use, uptake, or adherence",
    prefix: "Utilization of",
    iv: "Utilization-related factors",
    dv: (subject) => subject,
    fits: "Best for service use, drug adherence, screening uptake, and care seeking."
  }
];

const fillerWords = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "at", "for", "with",
  "among", "towards", "about", "regarding", "study", "research", "problem", "issue"
]);

const outcomeWords = [
  "adherence",
  "utilization",
  "uptake",
  "knowledge",
  "attitude",
  "practices",
  "prevalence",
  "management",
  "prevention",
  "screening",
  "care seeking",
  "compliance",
  "delay",
  "burnout",
  "stress",
  "malnutrition",
  "hypertension",
  "diabetes"
];

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (["and", "or", "of", "in", "to", "with", "for", "at", "among"].includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/^(\w)/, (letter) => letter.toUpperCase());

const cleanPhrase = (value: string) =>
  value
    .replace(/[?.!,;:()[\]{}"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stripLeadPhrases = (value: string) =>
  cleanPhrase(value)
    .replace(/^(i want to study|i want to research|i am interested in|i need a topic on|topic on|research on)\s+/i, "")
    .replace(/^(factors affecting|factors associated with|barriers to|prevalence of|knowledge and attitudes towards|knowledge attitudes and practices towards)\s+/i, "")
    .replace(/\s+(among|at|in)\s+.+$/i, "")
    .replace(/\s+(among|at|in)$/i, "")
    .trim();

const inferSubject = (problem: string, focus: string) => {
  const providedFocus = stripLeadPhrases(focus);
  if (providedFocus.length >= 4) return titleCase(providedFocus);

  const cleanedProblem = stripLeadPhrases(problem);
  const lower = cleanedProblem.toLowerCase();
  const anchor = outcomeWords.find((word) => lower.includes(word));

  if (anchor) {
    const anchorIndex = lower.indexOf(anchor);
    const phrase = cleanedProblem.slice(anchorIndex).split(" ").slice(0, 8).join(" ");
    return titleCase(stripLeadPhrases(phrase));
  }

  const words = cleanedProblem
    .split(" ")
    .filter((word) => !fillerWords.has(word.toLowerCase()))
    .slice(0, 8);

  return titleCase(words.join(" ") || cleanedProblem.split(" ").slice(0, 8).join(" "));
};

const inferOutcome = (subject: string, patternId: string) => {
  const lower = subject.toLowerCase();
  const found = outcomeWords.find((word) => lower.includes(word));
  if (found) return titleCase(found);
  if (patternId === "prevalence") return "Prevalence";
  if (patternId === "knowledge" || patternId === "practices") return "Knowledge and Practice";
  if (patternId === "barriers") return "Access or Utilization";
  return "Main Study Outcome";
};

const buildTopic = (pattern: TopicPattern, subject: string, population: string, place: string) => {
  const subjectForTopic = pattern.id === "utilization" && /^(uptake|utilization|use|adherence|compliance|screening)\b/i.test(subject)
    ? `Level of ${subject}`
    : `${pattern.prefix} ${subject}`;

  const topic = `${subjectForTopic} Among ${titleCase(population)} at ${titleCase(place)}`
    .replace(/\bAmong Among\b/gi, "Among")
    .replace(/\bat at\b/gi, "at")
    .replace(/\bof of\b/gi, "of")
    .replace(/\bof Among\b/gi, "Among")
    .replace(/\s+/g, " ")
    .trim();

  return topic;
};

const formatRespondents = (population: string, ageRange: string) => {
  const cleanedPopulation = cleanPhrase(population);
  const cleanedAge = cleanPhrase(ageRange)
    .replace(/^aged?\s+/i, "")
    .replace(/^between\s+/i, "")
    .trim();

  if (!cleanedAge) return cleanedPopulation;
  if (new RegExp(`\\b(age|aged|years|${cleanedAge.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i").test(cleanedPopulation)) {
    return cleanedPopulation;
  }

  return `${cleanedPopulation} aged ${cleanedAge}`;
};

const pickSupportPatterns = (selectedPattern: TopicPattern, subject: string) => {
  const lower = subject.toLowerCase();
  const preferredIds = new Set<string>([selectedPattern.id]);

  if (/low|poor|delay|limited|barrier|challenge|difficulty/.test(lower)) {
    preferredIds.add("barriers");
    preferredIds.add("factors");
  }
  if (/knowledge|attitude|practice|awareness/.test(lower)) {
    preferredIds.add("knowledge");
    preferredIds.add("practices");
  }
  if (/uptake|utilization|use|adherence|compliance|screening/.test(lower)) {
    preferredIds.add("utilization");
    preferredIds.add("factors");
  }
  if (/prevalence|magnitude|burden/.test(lower)) {
    preferredIds.add("prevalence");
  }

  const prioritized = topicPatterns.filter((pattern) => preferredIds.has(pattern.id));
  const fallback = topicPatterns.filter((pattern) => !preferredIds.has(pattern.id));
  return [...prioritized, ...fallback].slice(0, 3);
};

const assessTopic = (
  problem: string,
  population: string,
  place: string,
  ageRange: string,
  access: string,
  sensitivity: string
) => {
  const notes: string[] = [];
  let score = 0;

  if (problem.trim().split(/\s+/).length >= 4) score += 2;
  else notes.push("Add a little more detail to the problem so the topic is not too broad.");

  if (population.trim().split(/\s+/).length >= 2) score += 2;
  else notes.push("Make the target population specific, for example 'pregnant mothers' instead of only 'people'.");

  if (ageRange.trim()) score += 1;
  else notes.push("If your respondents have a clear age range, add it. A real target like 'aged 16-27' is stronger than a broad group.");

  if (place.trim().split(/\s+/).length >= 2) score += 2;
  else notes.push("Use a real study area such as a hospital, ward, school, or district.");

  if (access === "yes") score += 2;
  if (access === "unsure") notes.push("Confirm that you can reach the respondents before committing to this topic.");
  if (access === "no") notes.push("This may be hard to complete because respondent access is not clear.");

  if (sensitivity === "routine") score += 1;
  if (sensitivity === "sensitive") notes.push("This topic may need extra ethical care, consent wording, and supervisor guidance.");
  if (sensitivity === "unsure") notes.push("Ask your supervisor if the topic has ethical risk before collecting data.");

  const recommendation =
    score >= 8
      ? "Strong starting topic"
      : score >= 6
        ? "Good, but refine before approval"
        : "Needs refinement before approval";

  return { score, notes, recommendation };
};

export default function ResearchTopicGenerator() {
  const [researchProblem, setResearchProblem] = useState("");
  const [targetPopulation, setTargetPopulation] = useState("");
  const [respondentAge, setRespondentAge] = useState("");
  const [studyArea, setStudyArea] = useState("");
  const [focusPhrase, setFocusPhrase] = useState("");
  const [topicType, setTopicType] = useState("factors");
  const [access, setAccess] = useState("yes");
  const [sensitivity, setSensitivity] = useState("routine");
  const [result, setResult] = useState<TopicSuggestion[]>([]);
  const [showResult, setShowResult] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const requestedProjectType = useMemo(() => {
    const stateType = (location.state as { projectType?: string } | null)?.projectType;
    const queryType = new URLSearchParams(location.search).get("type");
    const candidate = stateType || queryType;
    return candidate === "report" || candidate === "proposal" ? candidate : undefined;
  }, [location.search, location.state]);

  const selectedPattern = useMemo(
    () => topicPatterns.find((pattern) => pattern.id === topicType) || topicPatterns[0],
    [topicType]
  );

  const onGenerate = () => {
    const missing = [];
    if (!researchProblem.trim()) missing.push("problem");
    if (!targetPopulation.trim()) missing.push("population");
    if (!studyArea.trim()) missing.push("study area");
    if (!access) missing.push("access to respondents");

    if (missing.length > 0) {
      toast.error(`Please add: ${missing.join(", ")}`);
      return;
    }

    const subject = inferSubject(researchProblem, focusPhrase);
    if (subject.split(" ").length < 2) {
      toast.error("Please make the problem or focus a little more specific.");
      return;
    }

    const effectivePopulation = formatRespondents(targetPopulation, respondentAge);
    const suggestions = pickSupportPatterns(selectedPattern, subject).map((pattern) => {
      const outcome = inferOutcome(subject, pattern.id);
      return {
        topic: buildTopic(pattern, subject, effectivePopulation, studyArea),
        iv: pattern.iv,
        dv: pattern.dv(subject, outcome),
        reason: pattern.fits,
        population: effectivePopulation,
        studyArea: cleanPhrase(studyArea),
        subject,
        patternId: pattern.id,
      };
    });

    setResult(suggestions);
    setShowResult(true);
  };

  const resetForm = () => {
    setShowResult(false);
    setResult([]);
  };

  const startNewProject = (suggestion: TopicSuggestion, index: number) => {
    navigate("/projects/new", {
      state: {
        prefillTitle: suggestion.topic,
        defaultType: requestedProjectType,
        topicHandoff: {
          ...suggestion,
          optionNumber: index + 1,
          access,
          sensitivity,
          readinessScore: assessment?.score ?? null,
          readinessNotes: assessment?.notes ?? [],
        },
      },
    });
  };

  const assessment = showResult
    ? assessTopic(researchProblem, targetPopulation, studyArea, respondentAge, access, sensitivity)
    : null;

  return (
    <DashboardLayout>
      <WorkspacePage width="wide" className="space-y-6">
        <WorkspacePageHeader
          eyebrow="Topic builder"
          title="Find a clean research topic"
          description="Answer a few plain questions. The helper will keep the title specific, readable, and suitable for a UHPAB proposal or report."
          tone="info"
          icon={<Sparkles className="h-4 w-4" />}
          actions={
            <Button type="button" variant="outline" className="gap-2" onClick={() => navigate("/projects")}>
              <FileText className="h-4 w-4" />
              View projects
            </Button>
          }
          aside={
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <WorkspaceMetric
                label="Readiness"
                value={assessment ? `${assessment.score}/10` : "Not checked"}
                detail={assessment?.recommendation || "Generate topic ideas to check focus and feasibility."}
                tone={assessment && assessment.score >= 8 ? "success" : assessment ? "warning" : "info"}
              />
              <WorkspaceMetric
                label="Topic outputs"
                value={showResult ? result.length : "--"}
                detail={showResult ? "Each option includes IV, DV, respondent group, and study area." : "Generated options will appear after the reality check."}
                tone="neutral"
              />
            </div>
          }
        />

        <div className={showResult ? "grid gap-6 lg:grid-cols-[1.05fr_0.95fr]" : "grid gap-6"}>
          <section className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
            <WorkspaceSectionHeader
              title="Topic details"
              description="Use short, real details. The generator will build the title structure."
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onGenerate();
              }}
              className="space-y-5"
              autoComplete="off"
            >
              <div className="space-y-2">
                <Label htmlFor="problem">1. What problem do you want to study?</Label>
                <Textarea
                  id="problem"
                  required
                  value={researchProblem}
                  onChange={(event) => setResearchProblem(event.target.value)}
                  placeholder="Example: Low uptake of cervical cancer screening among women"
                  className="min-h-24"
                />
                <p className="text-xs text-muted-foreground">
                  Use simple words. Mention the health issue or behavior, not a full paragraph.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="population">2. Who are the respondents?</Label>
                  <Input
                    id="population"
                    required
                    value={targetPopulation}
                    onChange={(event) => setTargetPopulation(event.target.value)}
                    placeholder="Pregnant mothers"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ageRange">Optional: exact age range</Label>
                  <Input
                    id="ageRange"
                    value={respondentAge}
                    onChange={(event) => setRespondentAge(event.target.value)}
                    placeholder="16-27 years"
                  />
                  <p className="text-xs text-muted-foreground">
                    Add this if you know it. We will fall back to the respondent group if you do not.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">3. Where will the study be done?</Label>
                <Input
                  id="area"
                  required
                  value={studyArea}
                  onChange={(event) => setStudyArea(event.target.value)}
                  placeholder="Kampala Hospital"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>4. What style of topic fits best?</Label>
                  <Select value={topicType} onValueChange={setTopicType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose topic style" />
                    </SelectTrigger>
                    <SelectContent>
                      {topicPatterns.map((pattern) => (
                        <SelectItem key={pattern.id} value={pattern.id}>
                          {pattern.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{selectedPattern.fits}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="focus">Optional: exact focus</Label>
                  <Input
                    id="focus"
                    value={focusPhrase}
                    onChange={(event) => setFocusPhrase(event.target.value)}
                    placeholder="Cervical cancer screening uptake"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank if unsure. Use this only when you know the exact issue.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-white/70 p-4 dark:bg-card/70">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <p className="font-medium">Quick reality check</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Can you access these respondents?</Label>
                    <Select value={access} onValueChange={setAccess}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="unsure">Not sure yet</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Is this ethically sensitive?</Label>
                    <Select value={sensitivity} onValueChange={setSensitivity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="routine">No, routine student research</SelectItem>
                        <SelectItem value="sensitive">Yes, sensitive topic</SelectItem>
                        <SelectItem value="unsure">Not sure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate topic ideas
                </Button>
                {showResult && (
                  <Button type="button" variant="outline" className="gap-2" onClick={resetForm}>
                    <RefreshCw className="h-4 w-4" />
                    Edit answers
                  </Button>
                )}
              </div>
            </form>
          </section>

          {showResult && (
            <div className="space-y-4">
              <>
                <WorkspaceStatusNote
                  icon={<AlertCircle className="h-4 w-4" />}
                  title={assessment?.recommendation || "Topic checked"}
                  description={
                    <div className="grid gap-2">
                      <p>Topic readiness score: {assessment?.score}/10</p>
                      {assessment?.notes.map((note) => (
                        <p key={note}>{note}</p>
                      ))}
                    </div>
                  }
                  tone={assessment && assessment.score >= 8 ? "success" : "warning"}
                />

                <div className="space-y-3">
                  {result.map((suggestion, index) => (
                    <div key={suggestion.topic} className="rounded-lg border bg-white/90 p-4 shadow-sm dark:bg-card/90">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <Badge variant="secondary">Option {index + 1}</Badge>
                      </div>
                      <h3 className="text-lg font-semibold leading-snug">{suggestion.topic}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{suggestion.reason}</p>
                      <div className="mt-3 grid gap-2 rounded-md bg-muted/50 p-3 text-sm">
                        <p><span className="font-medium">Independent variable:</span> {suggestion.iv}</p>
                        <p><span className="font-medium">Dependent variable:</span> {suggestion.dv}</p>
                      </div>
                      <Button
                        className="mt-3 gap-2"
                        variant={index === 0 ? "default" : "outline"}
                        aria-label={`Use option ${index + 1}: ${suggestion.topic}`}
                        onClick={() => startNewProject(suggestion, index)}
                      >
                        Use option {index + 1}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            </div>
          )}
        </div>
      </WorkspacePage>
    </DashboardLayout>
  );
}
