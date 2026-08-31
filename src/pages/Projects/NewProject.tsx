
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { WorkspacePage, WorkspacePageHeader } from '@/components/workspace/WorkspacePage';
import {
  WorkspaceMetric,
  WorkspaceSectionHeader,
  WorkspaceStatusNote,
} from '@/components/workspace/WorkspaceWorkflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjects } from '@/contexts/ProjectContext';
import { 
  RadioGroup,
  RadioGroupItem
} from '@/components/ui/radio-group';
import { topicGuidelines } from '@/data/uhpabGuidelines';
import {
  FileText,
  BookOpen,
  FileCheck,
  ArrowLeft,
  Lightbulb,
  PenLine,
  Sparkles,
  AlertCircle,
  Loader
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from "sonner";
import { TopicAssessment, TopicAssessmentResult } from '@/components/projects/TopicAssessment';
import { TopicAssessmentResults } from '@/components/projects/TopicAssessmentResult';
import { cn } from '@/lib/utils';
import { getPreferredProjectType } from '@/lib/userPreferences';

type TopicHandoff = {
  topic?: string;
  iv?: string;
  dv?: string;
  population?: string;
  studyArea?: string;
  subject?: string;
  patternId?: string;
  optionNumber?: number;
  access?: string;
  sensitivity?: string;
  readinessScore?: number | null;
  readinessNotes?: string[];
};

const isProjectType = (value: unknown): value is 'proposal' | 'report' =>
  value === 'proposal' || value === 'report';

const getRequestedProjectType = (location: ReturnType<typeof useLocation>): 'proposal' | 'report' | null => {
  const state = location.state as { defaultType?: unknown; projectType?: unknown } | null;
  const fromState = state?.defaultType || state?.projectType;
  const fromQuery = new URLSearchParams(location.search).get('type');

  if (isProjectType(fromState)) return fromState;
  if (isProjectType(fromQuery)) return fromQuery;
  return null;
};

const NewProject = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedProjectType = getRequestedProjectType(location);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'proposal' | 'report'>(() => requestedProjectType || getPreferredProjectType());
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [longTitleAccepted, setLongTitleAccepted] = useState(false);
  const [topicAssessmentResults, setTopicAssessmentResults] = useState<TopicAssessmentResult | null>(null);
  const [topicHandoff, setTopicHandoff] = useState<TopicHandoff | null>(null);
  const { createProject } = useProjects();

  useEffect(() => {
    const nextRequestedType = getRequestedProjectType(location);
    if (nextRequestedType) {
      setType(nextRequestedType);
    }

    if (location.state?.prefillTitle) {
      setTitle(location.state.prefillTitle);
      setTopicHandoff(location.state.topicHandoff || null);
      setStep(2);
    }
  }, [location]);

  const documentLabel = type === 'report' ? 'final report' : 'proposal';
  const documentTitle = type === 'report' ? 'Create final report' : 'Create research proposal';
  const documentDescription = type === 'report'
    ? 'Start the complete UHPAB report structure with preliminary pages, Chapters 1-5, references, and appendices.'
    : 'Start the UHPAB proposal structure with preliminary pages, Chapters 1-3, references, and appendices.';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter a project title");
      return;
    }

    if (!confirmLongTitleIfNeeded()) {
      return;
    }
    
    setIsCreating(true);
    setError('');
    
    try {
      const newProject = await createProject(title, type);
      
      if (newProject && newProject.id) {
        toast.success(`Project "${newProject.title}" created successfully!`);
        navigate(`/projects/${newProject.id}`);
      } else {
        throw new Error("Invalid project data returned");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create project. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsCreating(false);
    }
  };

  const handleGoToTopicGenerator = () => {
    navigate(`/research-topic-generator?type=${type}`, {
      state: { projectType: type },
    });
  };

  const handleTypeChange = (value: string) => {
    setType(value as 'proposal' | 'report');
  };

  const getTitleWordCount = () => title.trim().split(/\s+/).filter(Boolean).length;

  const confirmLongTitleIfNeeded = () => {
    const wordCount = getTitleWordCount();
    if (wordCount <= 20 || longTitleAccepted) return true;

    const firstConfirm = window.confirm(
      `Your title has ${wordCount} words. UHPAB guidance recommends a maximum of 20 words. Do you still want to proceed with this title?`
    );

    if (!firstConfirm) return false;

    const secondConfirm = window.confirm(
      "Final warning: a long title may be rejected or marked down. Are you sure you want to continue with it anyway?"
    );

    if (!secondConfirm) return false;

    setLongTitleAccepted(true);
    toast.warning("Long title accepted. You can still edit it before submission.");
    return true;
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setLongTitleAccepted(false);
  };

  const handleContinueFromTitle = () => {
    if (!title.trim()) return;
    if (!confirmLongTitleIfNeeded()) return;
    setStep(2);
  };

  const handleAssessTopic = () => {
    setStep(3);
  };

  const handleAssessmentComplete = (result: TopicAssessmentResult) => {
    setTopicAssessmentResults(result);
    setTitle(result.topic); // Update title with possibly revised topic
    setStep(4);
  };

  const handleCancelAssessment = () => {
    setStep(2);
  };

  const handleEditTopic = () => {
    setStep(3);
  };

  const handleProceedFromAssessment = () => {
    setStep(2);
  };

  const stepLabels = ["Project type", "Confirm details", "Assess topic", "Review assessment"];
  const currentStepLabel = stepLabels[step - 1] || "Project setup";
  const titleWordCount = getTitleWordCount();

  return (
    <DashboardLayout>
      <WorkspacePage className="space-y-6">
        <WorkspacePageHeader
          eyebrow="Project setup"
          title={documentTitle}
          description={documentDescription}
          tone="info"
          icon={<FileText className="h-4 w-4" />}
          actions={
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/projects')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to projects
            </Button>
          }
          aside={
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <WorkspaceMetric
                label="Current step"
                value={`${step}/4`}
                detail={currentStepLabel}
                tone="info"
              />
              <WorkspaceMetric
                label="Title length"
                value={`${titleWordCount}/20`}
                detail={titleWordCount > 20 ? "Above the recommended title length." : "Within the recommended range."}
                tone={titleWordCount > 20 ? "warning" : "success"}
              />
            </div>
          }
        />

        <section className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
          <WorkspaceSectionHeader
            title={currentStepLabel}
            description={`Complete the current step, then create the ${documentLabel} or assess the topic before writing.`}
            icon={step === 1 ? <FileText className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
          />
            {step === 1 && (
              <div className="space-y-6">
                <RadioGroup 
                  value={type} 
                  onValueChange={handleTypeChange}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <div>
                    <RadioGroupItem
                      value="proposal"
                      id="proposal"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="proposal"
                      className="flex cursor-pointer flex-col items-center justify-between gap-3 rounded-lg border-2 border-muted bg-background p-4 transition-colors hover:border-primary/50 hover:bg-info-muted peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="text-center">
                        <div className="font-medium">Research Proposal</div>
                        <div className="text-sm text-muted-foreground">
                          Initial research plan to be approved
                        </div>
                      </div>
                    </Label>
                  </div>
                  
                  <div>
                    <RadioGroupItem
                      value="report"
                      id="report"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="report"
                      className="flex cursor-pointer flex-col items-center justify-between gap-3 rounded-lg border-2 border-muted bg-background p-4 transition-colors hover:border-primary/50 hover:bg-info-muted peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                      <BookOpen className="h-8 w-8 text-primary" />
                      <div className="text-center">
                        <div className="font-medium">Final Report</div>
                        <div className="text-sm text-muted-foreground">
                          Complete research study with findings
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                <div className="rounded-lg border border-primary/25 bg-gradient-to-r from-primary/10 via-info-muted to-emerald-50 p-4 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-card text-primary shadow-sm">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold">Do you need a research topic first?</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Start with the topic generator if you are not yet sure about variables, respondents, age group, or study area.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleGoToTopicGenerator}
                      className="w-full shrink-0 gap-2 sm:w-auto"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate topic first
                    </Button>
                  </div>
                </div>
                
                <div className="border-t border-muted pt-4">
                  <div className="rounded-lg border border-primary/20 bg-info-muted/70 p-4 shadow-sm">
                    <div className="mb-3 flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-card text-primary shadow-sm">
                        <PenLine className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold leading-6">Research title</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Type or paste the exact title you want to use for this project.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="title" className="text-sm font-semibold text-foreground">
                          Project title
                        </Label>
                        <span className={cn(
                          "shrink-0 rounded-md border bg-card px-2 py-1 text-xs font-medium",
                          titleWordCount > 20 ? 'border-destructive/30 text-destructive' : 'text-muted-foreground'
                        )}>
                          {titleWordCount}/20 words
                        </span>
                      </div>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Example: Factors associated with uptake of cervical cancer screening among women at Kampala Hospital"
                        className="min-h-12 border-primary/30 bg-card text-base shadow-inner placeholder:text-muted-foreground/70 focus-visible:ring-primary/30"
                      />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className={`text-xs ${titleWordCount > 20 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          {titleWordCount > 20 && longTitleAccepted
                            ? 'Long title accepted after warning.'
                            : 'A clear UHPAB title should mention the issue, respondents, and study area.'}
                        </p>
                        <Button
                          type="button"
                          onClick={handleGoToTopicGenerator}
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-2 bg-card"
                        >
                          <Sparkles className="h-4 w-4" />
                          Open topic generator
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleContinueFromTitle} 
                  className="w-full mt-4"
                  disabled={!title.trim()}
                >
                  Continue
                </Button>
              </div>
            )}
            
            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Document type:</span>
                      <span className="text-sm font-medium capitalize">{documentLabel}</span>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="confirm-title" className="text-sm font-semibold">Project title</Label>
                        <span className={cn(
                          "shrink-0 rounded-md border bg-card px-2 py-1 text-xs font-medium",
                          titleWordCount > 20 ? 'border-destructive/30 text-destructive' : 'text-muted-foreground'
                        )}>
                          {titleWordCount}/20 words
                        </span>
                      </div>
                      <Input
                        id="confirm-title"
                        value={title}
                        onChange={(event) => handleTitleChange(event.target.value)}
                        className="min-h-12 bg-card text-base"
                        placeholder="Enter the exact research title"
                      />
                      <p className="text-xs text-muted-foreground">
                        You can still correct spelling or wording before creating the {documentLabel}.
                      </p>
                    </div>
                  </div>

                  {topicHandoff && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">
                          Topic builder details carried forward
                          {topicHandoff.optionNumber ? ` from option ${topicHandoff.optionNumber}` : ""}
                        </p>
                        {typeof topicHandoff.readinessScore === "number" && (
                          <span className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold">
                            {topicHandoff.readinessScore}/10 readiness
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <p><span className="font-medium">Independent variable:</span> {topicHandoff.iv || "Not detected"}</p>
                        <p><span className="font-medium">Dependent variable:</span> {topicHandoff.dv || "Not detected"}</p>
                        <p><span className="font-medium">Respondents:</span> {topicHandoff.population || "Not detected"}</p>
                        <p><span className="font-medium">Study area:</span> {topicHandoff.studyArea || "Not detected"}</p>
                      </div>
                    </div>
                  )}
                  
                  <WorkspaceStatusNote
                    icon={<Lightbulb className="h-4 w-4" />}
                    title="Research title guidelines"
                    description={
                      <ul className="list-disc space-y-1 pl-4 text-sm">
                        <li>Keep title concise, maximum 20 words.</li>
                        <li>Clearly indicate variables and their relationships.</li>
                        <li>Specify research location and time frame where required.</li>
                        <li>Avoid abbreviations and unclear jargon.</li>
                        <li>Follow UHPAB format requirements.</li>
                      </ul>
                    }
                    tone="warning"
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="flex-1"
                    disabled={isCreating}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAssessTopic}
                    className="flex-1 gap-2"
                    disabled={isCreating}
                  >
                    <Lightbulb size={16} />
                    Assess Topic
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!title.trim() || isCreating}
                    className="flex-1 gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create {type === 'report' ? 'Report' : 'Proposal'}
                        <FileCheck size={16} />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
            
            {step === 3 && (
              <TopicAssessment
                initialTopic={title}
                initialVariables={{
                  iv: topicHandoff?.iv,
                  dv: topicHandoff?.dv,
                  population: topicHandoff?.population,
                  location: topicHandoff?.studyArea,
                }}
                onSaveAssessment={handleAssessmentComplete}
                onCancel={handleCancelAssessment}
              />
            )}
            
            {step === 4 && topicAssessmentResults && (
              <TopicAssessmentResults
                result={topicAssessmentResults}
                onProceed={handleProceedFromAssessment}
                onEditTopic={handleEditTopic}
              />
            )}
        </section>
        
        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <WorkspaceSectionHeader
            title="UHPAB research topic areas"
            description="Consider these approved thematic areas when choosing a student research focus."
            icon={<Lightbulb className="h-5 w-5" />}
          />
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            {topicGuidelines.thematicAreas.slice(0, 6).map((area) => (
              <div key={area.title} className="rounded-lg border bg-muted/25 p-3">
                <h4 className="font-medium text-primary">{area.title}</h4>
                <ul className="mt-1 pl-4 list-disc text-muted-foreground">
                  {area.examples.slice(0, 2).map((example, i) => (
                    <li key={i}>{example}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </WorkspacePage>
    </DashboardLayout>
  );
};

export default NewProject;
