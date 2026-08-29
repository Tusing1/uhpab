import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; // use shadcn checkbox

interface TopicAssessmentProps {
  initialTopic: string;
  initialVariables?: Partial<TopicAssessmentResult["variables"]>;
  onSaveAssessment: (result: TopicAssessmentResult) => void;
  onCancel: () => void;
}

export interface TopicAssessmentResult {
  topic: string;
  isValid: boolean;
  score: number;
  feedback: string[];
  variables: {
    iv: string;
    dv: string;
    population: string;
    location: string;
  };
  recommendation: {
    text: string;
    type: 'good' | 'caution' | 'reconsider' | 'stop';
  };
}

const IV_SUGGESTIONS = [
  "Factors affecting",
  "Factors contributing",
  "Knowledge, Attitude and Practices",
  "Barriers to",
  "Risk factors for",
  "Assessment of",
  "Practices regarding",
  "Determinants of",
  "Prevalence of",
  "Utilization of"
];

const DV_SUGGESTIONS = [
  "Infection control",
  "Knowledge level",
  "Adherence to hand hygiene",
  "Prevalence of infections",
  "Patient outcomes",
  "Incidence rate",
  "Health-seeking behavior"
];

const POPULATION_SUGGESTIONS = [
  "Pregnant mothers",
  "Nurses",
  "Midwives",
  "Patients",
  "Students",
  "Adolescents"
];

const LOCATION_SUGGESTIONS = [
  "Bwindi Community Hospital", "Mulago Hospital", "Rural Health Centre", "District Hospital"
];

const pickInitialSelectValue = (value: string | undefined, options: string[]) =>
  value && options.includes(value) ? value : value ? "__custom" : "";

export const TopicAssessment: React.FC<TopicAssessmentProps> = ({
  initialTopic,
  initialVariables,
  onSaveAssessment,
  onCancel
}) => {
  const [topic, setTopic] = useState(initialTopic);
  const [independentVariable, setIndependentVariable] = useState(() =>
    pickInitialSelectValue(initialVariables?.iv, IV_SUGGESTIONS)
  );
  const [customIV, setCustomIV] = useState(() =>
    initialVariables?.iv && !IV_SUGGESTIONS.includes(initialVariables.iv) ? initialVariables.iv : ''
  );
  const [dependentVariable, setDependentVariable] = useState(() =>
    pickInitialSelectValue(initialVariables?.dv, DV_SUGGESTIONS)
  );
  const [customDV, setCustomDV] = useState(() =>
    initialVariables?.dv && !DV_SUGGESTIONS.includes(initialVariables.dv) ? initialVariables.dv : ''
  );
  const [targetPopulation, setTargetPopulation] = useState(() =>
    pickInitialSelectValue(initialVariables?.population, POPULATION_SUGGESTIONS)
  );
  const [customPopulation, setCustomPopulation] = useState(() =>
    initialVariables?.population && !POPULATION_SUGGESTIONS.includes(initialVariables.population) ? initialVariables.population : ''
  );
  const [studyArea, setStudyArea] = useState(() =>
    pickInitialSelectValue(initialVariables?.location, LOCATION_SUGGESTIONS)
  );
  const [customStudyArea, setCustomStudyArea] = useState(() =>
    initialVariables?.location && !LOCATION_SUGGESTIONS.includes(initialVariables.location) ? initialVariables.location : ''
  );

  // FINER checkboxes, now visible and editable (default all true)
  const [finerChecks, setFinerChecks] = useState({
    feasibility: true,
    interest: true,
    novelty: true,
    ethical: true,
    relevance: true
  });

  // Validation
  const isFormValid = () => {
    return (
      topic.trim() !== '' &&
      (independentVariable !== '' || customIV.trim() !== '') &&
      (dependentVariable !== '' || customDV.trim() !== '') &&
      (targetPopulation !== '' || customPopulation.trim() !== '') &&
      (studyArea !== '' || customStudyArea.trim() !== '')
    );
  };

  // Compose variables structure for result
  const variables = {
    iv: independentVariable === "__custom" ? customIV : independentVariable,
    dv: dependentVariable === "__custom" ? customDV : dependentVariable,
    population: targetPopulation === "__custom" ? customPopulation : targetPopulation,
    location: studyArea === "__custom" ? customStudyArea : studyArea
  };

  const assessTopic = () => {
    // Score for FINER is number of checked boxes
    const finerScore = Object.values(finerChecks).filter(Boolean).length;
    const feedback: string[] = [];

    if (!finerChecks.feasibility) feedback.push("Feasibility needs review.");
    if (!finerChecks.interest) feedback.push("Interest needs review.");
    if (!finerChecks.novelty) feedback.push("Novelty needs review.");
    if (!finerChecks.ethical) feedback.push("Ethical suitability needs review.");
    if (!finerChecks.relevance) feedback.push("Relevance needs review.");

    // Recommendation
    let recommendation: TopicAssessmentResult["recommendation"] = {
      text: "",
      type: "good"
    };
    if (finerScore === 5) {
      recommendation = {
        text: "Ready to proceed! Your topic meets all FINER criteria.",
        type: "good"
      };
    } else if (finerScore >= 3) {
      recommendation = {
        text: "Proceed with caution. Some FINER criteria need more attention.",
        type: "caution"
      };
    } else if (finerScore >= 1) {
      recommendation = {
        text: "Major improvement needed. Most FINER boxes are unchecked.",
        type: "reconsider"
      };
    } else {
      recommendation = {
        text: "STOP: Please review and refine your topic to meet FINER standards.",
        type: "stop"
      };
    }

    // Provide result
    const result: TopicAssessmentResult = {
      topic,
      isValid: finerScore === 5,
      score: finerScore,
      feedback,
      variables,
      recommendation
    };

    onSaveAssessment(result);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Research Topic Assessment</h2>
        <p className="text-muted-foreground">
          Evaluate your research topic using the FINER criteria to ensure it meets UHPAB standards.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="topic">Research Topic</Label>
          <Input 
            id="topic" 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)} 
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {topic.trim().split(/\s+/).filter(Boolean).length}/20 words
          </p>
        </div>
        <div>
          <Label>Independent Variable</Label>
          <Select
            value={independentVariable}
            onValueChange={(value) => {
              setIndependentVariable(value);
              if (value !== "__custom") {
                setCustomIV("");
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select independent variable" />
            </SelectTrigger>
            <SelectContent>
              {IV_SUGGESTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
              <SelectItem value="__custom">Other (type below)</SelectItem>
            </SelectContent>
          </Select>
          {independentVariable === "__custom" && (
            <Input
              placeholder="Type custom independent variable"
              className="mt-2"
              value={customIV}
              onChange={e => setCustomIV(e.target.value)}
            />
          )}
        </div>
        <div>
          <Label>Dependent Variable</Label>
          <Select
            value={dependentVariable}
            onValueChange={(value) => {
              setDependentVariable(value);
              if (value !== "__custom") {
                setCustomDV("");
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select dependent variable" />
            </SelectTrigger>
            <SelectContent>
              {DV_SUGGESTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
              <SelectItem value="__custom">Other (type below)</SelectItem>
            </SelectContent>
          </Select>
          {dependentVariable === "__custom" && (
            <Input
              placeholder="Type custom dependent variable"
              className="mt-2"
              value={customDV}
              onChange={e => setCustomDV(e.target.value)}
            />
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Target Population</Label>
            <Select
              value={targetPopulation}
              onValueChange={(value) => {
                setTargetPopulation(value);
                if (value !== "__custom") {
                  setCustomPopulation("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select population" />
              </SelectTrigger>
              <SelectContent>
                {POPULATION_SUGGESTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
                <SelectItem value="__custom">Other (type below)</SelectItem>
              </SelectContent>
            </Select>
            {targetPopulation === "__custom" && (
              <Input
                placeholder="Type custom population"
                className="mt-2"
                value={customPopulation}
                onChange={e => setCustomPopulation(e.target.value)}
              />
            )}
          </div>
          <div>
            <Label>Study Area/Location</Label>
            <Select
              value={studyArea}
              onValueChange={(value) => {
                setStudyArea(value);
                if (value !== "__custom") {
                  setCustomStudyArea("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_SUGGESTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
                <SelectItem value="__custom">Other (type below)</SelectItem>
              </SelectContent>
            </Select>
            {studyArea === "__custom" && (
              <Input
                placeholder="Type custom location"
                className="mt-2"
                value={customStudyArea}
                onChange={e => setCustomStudyArea(e.target.value)}
              />
            )}
          </div>
        </div>
        {/* FINER CHECKBOXES */}
        <div className="mt-8">
          <h4 className="font-medium mb-2">FINER Criteria (check all that apply):</h4>
          <div className="flex flex-wrap gap-4">
            {[
              { key: "feasibility", label: "Feasibility" },
              { key: "interest", label: "Interest" },
              { key: "novelty", label: "Novelty" },
              { key: "ethical", label: "Ethical" },
              { key: "relevance", label: "Relevance" }
            ].map(c => (
              <div className="flex items-center gap-2" key={c.key}>
                <Checkbox
                  checked={finerChecks[c.key as keyof typeof finerChecks]}
                  onCheckedChange={checked => setFinerChecks(fs => ({
                    ...fs,
                    [c.key]: !!checked
                  }))}
                  id={c.key}
                />
                <label htmlFor={c.key} className="text-sm">{c.label}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={assessTopic} disabled={!isFormValid()}>
          Assess Topic
        </Button>
      </div>
    </div>
  );
};
