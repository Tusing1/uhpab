
import React, { useState, useEffect } from 'react';
import { Project } from '@/types';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, InfoIcon, Lock, Key, FileText, BookText, Download, FilePen, ChevronRight, Wand2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { generateResearchComponent, setGeminiApiKey } from '@/utils/geminiApi';
import { sanitizeFileName, triggerBrowserDownload } from '@/lib/download';
import { toast } from 'sonner';
import { useFeatureAccess } from '@/contexts/FeatureAccessContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { proposalStructure, reportStructure } from '@/data/uhpabGuidelines';
import { useAuth } from '@/contexts/AuthContext';
import { humanizeResearchText } from '@/lib/humanReviewEngine';

interface AIContentGeneratorProps {
  project: Project;
  onUpdate: (project: Project) => Promise<Project>;
  initialContent?: string;
  selectedComponent?: string;
}

// Enhanced research components based on UHPAB guidelines
const generateResearchComponents = (projectType: 'proposal' | 'report') => {
  if (projectType === 'proposal') {
    return [
      // Preliminary Pages
      { id: 'titlePage', label: 'Title Page', section: 'preliminaryPages', field: 'titlePage', description: 'Contains title, your name, and other important information' },
      { id: 'declaration', label: 'Declaration', section: 'preliminaryPages', field: 'declaration', description: 'Statement declaring originality of work' },
      { id: 'approvalSheet', label: 'Proposal Approval Form', section: 'preliminaryPages', field: 'approvalSheet', description: 'Sheet for supervisor approval' },
      { id: 'commitment', label: 'Commitment Form', section: 'preliminaryPages', field: 'commitmentForm', description: 'Supervisor commitment statement' },
      { id: 'acronyms', label: 'List of Acronyms', section: 'preliminaryPages', field: 'acronyms', description: 'Alphabetical list of all acronyms used' },
      { id: 'operationalDefs', label: 'Operational Definitions', section: 'preliminaryPages', field: 'operationalDefinitions', description: 'Definitions of key terms' },
      { id: 'tableOfContents', label: 'Table of Contents', section: 'preliminaryPages', field: 'tableOfContents', description: 'List of all sections with page numbers' },
      
      // Chapter 1
      { id: 'background', label: 'Background', section: 'chapter1', field: 'background', description: 'Overview of the research area (max 2 pages)' },
      { id: 'problemStatement', label: 'Problem Statement', section: 'chapter1', field: 'problemStatement', description: 'Clear description of the problem (max half page)' },
      { id: 'researchObjectives', label: 'Research Objectives', section: 'chapter1', field: 'researchObjectives', description: 'General and specific objectives' },
      { id: 'purpose', label: 'Purpose / General Objective', section: 'chapter1', field: 'purpose', description: 'Overall aim of the research' },
      { id: 'objectives', label: 'Specific Objectives', section: 'chapter1', field: 'objectives', description: 'SMART objectives (2-3)' },
      { id: 'researchQuestions', label: 'Research Questions', section: 'chapter1', field: 'researchQuestions', description: 'Questions derived from objectives' },
      { id: 'justification', label: 'Justification', section: 'chapter1', field: 'justification', description: 'Rationale for conducting the study' },
      { id: 'significance', label: 'Significance', section: 'chapter1', field: 'significance', description: 'Contribution to stakeholders' },
      { id: 'scope', label: 'Scope of the Study', section: 'chapter1', field: 'scope', description: 'Content, geographical area and time span' },
      
      // Chapter 2
      { id: 'literatureReview', label: 'Literature Review', section: 'chapter2', field: 'literatureReview', description: 'Review of existing literature (3-5 pages)' },
      
      // Chapter 3 - Grouped methodology components
      { id: 'methodologyPart1', label: 'Methodology (Introduction, Design & Setting)', section: 'chapter3', field: 'methodologyPart1', description: 'Research design, methods and setting (3.0-3.5)' },
      { id: 'methodologyPart2', label: 'Methodology (Population, Sampling & Variables)', section: 'chapter3', field: 'methodologyPart2', description: 'Population, sampling methods and study variables (3.6-3.10)' },
      { id: 'methodologyPart3', label: 'Methodology (Data Collection & Analysis)', section: 'chapter3', field: 'methodologyPart3', description: 'Data collection, analysis and ethical considerations (3.11-end)' },
      
      // References and Appendices
      { id: 'references', label: 'References', section: 'references', field: 'references', description: 'List of all sources (APA 7th Edition)' },
      { id: 'workPlan', label: 'Work Plan', section: 'appendices', field: 'workPlan', description: 'Timeline for research process' },
      { id: 'budget', label: 'Budget', section: 'appendices', field: 'budget', description: 'Estimated costs for the research' },
      { id: 'consentForm', label: 'Consent Form', section: 'appendices', field: 'consentForm', description: 'Draft of informed consent document' },
      { id: 'dataTools', label: 'Data Collection Tools', section: 'appendices', field: 'dataCollectionTools', description: 'Draft questionnaires, interview guides, etc.' },
    ];
  } else {
    return [
      // Preliminary Pages for Report
      { id: 'titlePage', label: 'Title Page', section: 'preliminaryPages', field: 'titlePage', description: 'Contains title, your name, and other important information' },
      { id: 'declaration', label: 'Declaration', section: 'preliminaryPages', field: 'declaration', description: 'Statement declaring originality of work' },
      { id: 'approval', label: 'Approval', section: 'preliminaryPages', field: 'approval', description: 'Research approval format with signatures' },
      { id: 'commitment', label: 'Supervisor Commitment', section: 'preliminaryPages', field: 'commitment', description: 'Statement signed by supervisor' },
      { id: 'authorization', label: 'Authorization & Copyright', section: 'preliminaryPages', field: 'authorization', description: 'Statement about report availability' },
      { id: 'dedication', label: 'Dedication', section: 'preliminaryPages', field: 'dedication', description: 'Optional page to dedicate work' },
      { id: 'acknowledgement', label: 'Acknowledgement', section: 'preliminaryPages', field: 'acknowledgement', description: 'Thank individuals and institutions' },
      { id: 'tableOfContents', label: 'Table of Contents', section: 'preliminaryPages', field: 'tableOfContents', description: 'List of all sections with page numbers' },
      { id: 'listOfTables', label: 'List of Tables', section: 'preliminaryPages', field: 'listOfTables', description: 'List all tables with titles and page numbers' },
      { id: 'listOfFigures', label: 'List of Figures', section: 'preliminaryPages', field: 'listOfFigures', description: 'List all figures with titles and page numbers' },
      { id: 'acronyms', label: 'List of Acronyms', section: 'preliminaryPages', field: 'listOfAcronyms', description: 'Alphabetical list of all acronyms' },
      { id: 'definitionOfTerms', label: 'Definition of Terms', section: 'preliminaryPages', field: 'definitionOfTerms', description: 'Define key terms as used in context' },
      { id: 'abstract', label: 'Abstract', section: 'preliminaryPages', field: 'abstract', description: 'Summary of research (max 300 words)' },
      
      // Chapter 1-3 (Same as proposal)
      { id: 'background', label: 'Background', section: 'chapter1', field: 'background', description: 'Overview of the research area' },
      { id: 'problemStatement', label: 'Problem Statement', section: 'chapter1', field: 'problemStatement', description: 'Clear description of the problem' },
      { id: 'researchObjectives', label: 'Research Objectives', section: 'chapter1', field: 'researchObjectives', description: 'General and specific objectives' },
      { id: 'purpose', label: 'Purpose / General Objective', section: 'chapter1', field: 'purpose', description: 'Overall aim of the research' },
      { id: 'objectives', label: 'Specific Objectives', section: 'chapter1', field: 'objectives', description: 'SMART objectives' },
      { id: 'researchQuestions', label: 'Research Questions', section: 'chapter1', field: 'researchQuestions', description: 'Questions derived from objectives' },
      { id: 'justification', label: 'Justification', section: 'chapter1', field: 'justification', description: 'Rationale for conducting the study' },
      { id: 'significance', label: 'Significance', section: 'chapter1', field: 'significance', description: 'Contribution to stakeholders' },
      { id: 'scope', label: 'Scope of the Study', section: 'chapter1', field: 'scope', description: 'Content, geographical area and time span' },
      { id: 'literatureReview', label: 'Literature Review', section: 'chapter2', field: 'literatureReview', description: 'Review of existing literature' },
      
      // Methodology - Grouped components for report
      { id: 'methodologyPart1', label: 'Methodology (Introduction, Design & Setting)', section: 'chapter3', field: 'methodologyPart1', description: 'Research design, methods and setting (3.0-3.5)' },
      { id: 'methodologyPart2', label: 'Methodology (Population, Sampling & Variables)', section: 'chapter3', field: 'methodologyPart2', description: 'Population, sampling methods and study variables (3.6-3.10)' },
      { id: 'methodologyPart3', label: 'Methodology (Data Collection & Analysis)', section: 'chapter3', field: 'methodologyPart3', description: 'Data collection, analysis and ethical considerations (3.11-end)' },
      
      // Chapter 4 (Results)
      { id: 'findings', label: 'Findings Introduction', section: 'chapter4', field: 'introduction', description: 'Description of sample size and presentation methods' },
      { id: 'demographics', label: 'Demographics', section: 'chapter4', field: 'demographics', description: 'Participant demographics' },
      { id: 'objective1Findings', label: 'Objective 1 Findings', section: 'chapter4', field: 'objective1Findings', description: 'Results related to first objective' },
      { id: 'objective2Findings', label: 'Objective 2 Findings', section: 'chapter4', field: 'objective2Findings', description: 'Results related to second objective' },
      { id: 'objective3Findings', label: 'Objective 3 Findings', section: 'chapter4', field: 'objective3Findings', description: 'Results related to third objective' },
      
      // Chapter 5 (Conclusion)
      { id: 'discussion', label: 'Discussion', section: 'chapter5', field: 'discussion', description: 'Interpretation of findings (2-3 pages)' },
      { id: 'limitations', label: 'Limitations', section: 'chapter5', field: 'limitations', description: 'Constraints encountered' },
      { id: 'conclusions', label: 'Conclusions', section: 'chapter5', field: 'conclusions', description: 'Summary of key findings' },
      { id: 'recommendations', label: 'Recommendations', section: 'chapter5', field: 'recommendations', description: 'Suggested actions (max 4)' },
      { id: 'implications', label: 'Implications', section: 'chapter5', field: 'implications', description: 'Relevance to nursing practice' },
      
      // References and Appendices
      { id: 'references', label: 'References', section: 'references', field: 'references', description: 'List of all sources (APA 7th Edition)' },
      { id: 'appendices', label: 'Appendices', section: 'appendices', field: 'appendices', description: 'Supplementary materials' },
    ];
  }
};

// Function to get all project content as context for reference generation
const getProjectContentAsString = (project: Project): string => {
  let content = '';
  
  // Iterate through all chapters and their fields
  Object.entries(project.chapters).forEach(([chapterKey, chapterData]) => {
    if (chapterKey !== 'references' && chapterKey !== 'appendices') {
      Object.entries(chapterData as Record<string, string>).forEach(([fieldKey, text]) => {
        if (typeof text === 'string' && text.trim().length > 0) {
          content += `${text}\n\n`;
        }
      });
    }
  });
  
  return content;
};

export const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({ project, onUpdate, initialContent = '', selectedComponent: initialSelectedComponent = '' }) => {
  const [selectedComponent, setSelectedComponent] = useState<string>(initialSelectedComponent || '');
  const [contextPrompt, setContextPrompt] = useState('');
  const [generationMode, setGenerationMode] = useState<'generate' | 'improve'>(initialContent ? 'improve' : 'generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const { canAccess } = useFeatureAccess();
  const [researchComponents, setResearchComponents] = useState(generateResearchComponents(project.type));
  const [autoGenerateDisabled, setAutoGenerateDisabled] = useState(true);
  const { user, school } = useAuth();
  
  const canUseAI = canAccess('ai-content-generation');
  
  // Load API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setGeminiApiKey(savedApiKey);
      setIsApiKeySet(true);
    }
  }, []);

  // Set initial content from props if available
  useEffect(() => {
    if (initialContent) {
      setTemporaryContent(initialContent);
      setGenerationMode('improve');
    }
  }, [initialContent]);

  // Update components when project type changes
  useEffect(() => {
    setResearchComponents(generateResearchComponents(project.type));
  }, [project.type]);

  // Set selected component when initialSelectedComponent changes
  useEffect(() => {
    if (initialSelectedComponent) {
      setSelectedComponent(initialSelectedComponent);
    }
  }, [initialSelectedComponent]);

  const [temporaryContent, setTemporaryContent] = useState(initialContent || '');

  const handleSetApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setGeminiApiKey(apiKey.trim());
      setIsApiKeySet(true);
      toast.success("API key saved");
    } else {
      toast.error("Please enter a valid API key");
    }
  };
  
  const handleGenerate = async () => {
    if (!canUseAI) {
      toast.error("This feature requires a premium account");
      return;
    }
    
    if (!isApiKeySet) {
      toast.error("Please set your Gemini API key first");
      return;
    }
    
    if (!selectedComponent) {
      toast.error("Please select a component to generate");
      return;
    }
    
    setIsGenerating(true);
    setGeneratedContent('');
    
    try {
      const selectedObj = researchComponents.find(comp => comp.id === selectedComponent);
      
      if (!selectedObj) {
        throw new Error("Selected component not found");
      }
      
      let existingContent = '';
      if (project.chapters[selectedObj.section]) {
        existingContent = (project.chapters[selectedObj.section] as any)[selectedObj.field] || '';
      }

      // If we're improving content that was passed in, use that instead
      if (generationMode === 'improve' && temporaryContent) {
        existingContent = temporaryContent;
      }

      let promptPrefix = '';
      const profileContext = [
        user?.name ? `Student/candidate name: ${user.name}` : null,
        (user?.htin || user?.studentId) ? `HTIN: ${user.htin || user.studentId}` : null,
        user?.className ? `Class/course: ${user.className}` : null,
        (user?.schoolName || school?.name) ? `School/training institution: ${user?.schoolName || school?.name}` : null,
        (user?.schoolLocation || school?.location) ? `School location: ${user?.schoolLocation || school?.location}` : null,
        user?.researchTopic ? `Registered research topic: ${user.researchTopic}` : null,
        `Project type: ${project.type}`,
        `Research title: ${project.title}`
      ]
        .filter(Boolean)
        .join('\n');
      
      // Special handling for references to collect citations from the whole project
      if (selectedComponent === 'references') {
        const allProjectContent = getProjectContentAsString(project);
        promptPrefix = `Extract all citations from the following research content and create a proper References section in APA 7th Edition format. Include only references that are actually cited in the content:\n\n${allProjectContent}\n\n`;
      }
      // Special handling for methodology sections to generate in chunks
      else if (selectedComponent.startsWith('methodology')) {
        if (selectedComponent === 'methodologyPart1') {
          promptPrefix = `Create sections 3.0 (Introduction) through 3.5 (Study Setting) for the Methodology chapter according to UHPAB guidelines for a ${project.type} titled: "${project.title}". Include appropriate subsections and maintain proper formatting.\n\n`;
        } else if (selectedComponent === 'methodologyPart2') {
          promptPrefix = `Create sections 3.6 (Study Population) through 3.10 (Study Variables) for the Methodology chapter according to UHPAB guidelines for a ${project.type} titled: "${project.title}". Include appropriate subsections and maintain proper formatting.\n\n`;
        } else if (selectedComponent === 'methodologyPart3') {
          promptPrefix = `Create sections 3.11 (Research Instruments) through the end of the Methodology chapter according to UHPAB guidelines for a ${project.type} titled: "${project.title}". Include appropriate subsections and maintain proper formatting.\n\n`;
        }
      }
      
      const basePrompt = generationMode === 'improve' && existingContent 
        ? `Improve the following ${selectedObj.label} section for a ${project.type} following UHPAB guidelines:\n\n${existingContent}`
        : `Create a comprehensive ${selectedObj.label} section for a research ${project.type} titled: "${project.title}" following UHPAB guidelines.`;
      
      const fullPrompt = promptPrefix + basePrompt + (contextPrompt 
        ? `\n\nAdditional context provided by the user: ${contextPrompt}` 
        : '') + (profileContext ? `\n\nUse these saved student details when the section requires identity, school, class, HTIN, signatures, title page details, declaration, approval, commitment, consent, or submission wording:\n${profileContext}` : '');
      
      const response = await generateResearchComponent(selectedObj.label, fullPrompt, project.type);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Remove any "I'm ready to help" or similar prefixes from Gemini responses
      let cleanedResponse = response.text;
      const prefixesToRemove = [
        "I'm ready to help you", 
        "Here's a", 
        "Here is a",
        "I'll create a",
        "I'll help you",
        "Sure, I'll",
        "Sure, here's",
        "Sure, I can",
        "Okay, I'm ready",
        "Okay, here's",
        "Alright, here's",
        "I'd be happy to"
      ];
      
      for (const prefix of prefixesToRemove) {
        if (cleanedResponse.includes(prefix)) {
          const index = cleanedResponse.indexOf(prefix);
          const endIndex = cleanedResponse.indexOf("\n\n", index);
          if (endIndex > index) {
            cleanedResponse = cleanedResponse.substring(0, index) + cleanedResponse.substring(endIndex + 2);
          }
        }
      }
      
      const humanReview = humanizeResearchText(cleanedResponse);
      setGeneratedContent(humanReview.revisedText);
      if (humanReview.signals.length > 0 || humanReview.changes.length > 0) {
        toast.success("Generated draft cleaned by Human Review", {
          description: `${humanReview.changes.length} safe cleanup ${humanReview.changes.length === 1 ? "change" : "changes"} applied.`,
        });
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error(error instanceof Error ? error.message : "Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSaveContent = async () => {
    if (!generatedContent.trim()) {
      toast.error("No content to save");
      return;
    }
    
    try {
      const selectedObj = researchComponents.find(comp => comp.id === selectedComponent);
      
      if (!selectedObj) {
        throw new Error("Selected component not found");
      }
      
      const updatedProject = { ...project };
      
      // Initialize the section if it doesn't exist
      if (!updatedProject.chapters[selectedObj.section]) {
        updatedProject.chapters[selectedObj.section] = {};
      }
      
      // Handle methodology parts to map to the correct sections in the project
      if (selectedComponent === 'methodologyPart1') {
        // Parse the content and distribute to proper fields for introduction through study setting
        (updatedProject.chapters.chapter3 as any).introduction = generatedContent;
      } 
      else if (selectedComponent === 'methodologyPart2') {
        // Parse the content and distribute to proper fields for population through study variables  
        (updatedProject.chapters.chapter3 as any).studyPopulation = generatedContent;
      }
      else if (selectedComponent === 'methodologyPart3') {
        // Parse the content and distribute to proper fields for research instruments through end
        (updatedProject.chapters.chapter3 as any).dataCollection = generatedContent;
      }
      else {
        // Update the specific field for non-methodology components
        (updatedProject.chapters[selectedObj.section] as any)[selectedObj.field] = generatedContent;
      }
      
      // Update the progress for this section
      updatedProject.progress[selectedObj.section as keyof typeof updatedProject.progress] += 10;
      
      // Make sure progress doesn't exceed 100%
      const sectionKey = selectedObj.section as keyof typeof updatedProject.progress;
      if (updatedProject.progress[sectionKey] > 100) {
        updatedProject.progress[sectionKey] = 100;
      }
      
      await onUpdate(updatedProject);
      toast.success(`${selectedObj.label} content saved successfully`);
      setGeneratedContent('');
      setContextPrompt('');
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error("Failed to save content");
    }
  };

  // Group components by section for the dropdown
  const getGroupedComponents = () => {
    const sections: Record<string, Array<typeof researchComponents[0]>> = {};
    
    researchComponents.forEach(comp => {
      if (!sections[comp.section]) {
        sections[comp.section] = [];
      }
      sections[comp.section].push(comp);
    });
    
    return sections;
  };

  const groupedComponents = getGroupedComponents();
  
  return (
    <div className="space-y-4">
      {!canUseAI ? (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Premium Feature</AlertTitle>
          <AlertDescription>
            AI content generation is available exclusively for premium users. 
            Upgrade your account to unlock this feature.
          </AlertDescription>
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => window.location.href = '/premium'}>
              View Premium Features
            </Button>
          </div>
        </Alert>
      ) : null}
      
      <GlassmorphismCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Research Assistant
              </h2>
              <p className="text-sm text-muted-foreground">
                Generate content for your {project.type} following UHPAB guidelines
              </p>
            </div>
          </div>
          
          {!isApiKeySet ? (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Set Gemini API Key</CardTitle>
                <CardDescription>
                  You need a Gemini API key to use AI content generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">Gemini API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your Gemini API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <Button onClick={handleSetApiKey} className="gap-2">
                      <Key className="h-4 w-4" />
                      Save Key
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can get a Gemini API key from the Google AI Studio. 
                    Your API key is stored locally and never sent to our servers.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
          
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Generate Content</CardTitle>
                <CardDescription>
                  Select the component you want to generate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="component">Research Component</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between" disabled={!isApiKeySet || isGenerating}>
                        {selectedComponent ? researchComponents.find(c => c.id === selectedComponent)?.label : "Select a component"}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 max-h-[400px] overflow-y-auto">
                      {Object.entries(groupedComponents).map(([section, comps]) => (
                        <React.Fragment key={section}>
                          <DropdownMenuLabel>
                            {section === 'preliminaryPages' ? 'Preliminary Pages' : 
                             section === 'chapter1' ? 'Chapter 1: Introduction' :
                             section === 'chapter2' ? 'Chapter 2: Literature Review' :
                             section === 'chapter3' ? 'Chapter 3: Methodology' :
                             section === 'chapter4' ? 'Chapter 4: Findings' :
                             section === 'chapter5' ? 'Chapter 5: Discussion & Conclusion' :
                             section === 'references' ? 'References' :
                             section === 'appendices' ? 'Appendices' : section}
                          </DropdownMenuLabel>
                          {comps.map((comp) => (
                            <DropdownMenuItem 
                              key={comp.id} 
                              onClick={() => {
                                setSelectedComponent(comp.id);
                                if (initialContent && comp.id !== initialSelectedComponent) {
                                  setTemporaryContent(''); // Clear previous content if switching away from initial component
                                }
                              }}
                            >
                              {comp.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                        </React.Fragment>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <p className="text-xs text-muted-foreground">
                    {researchComponents.find(c => c.id === selectedComponent)?.description}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mode">Generation Mode</Label>
                  <RadioGroup 
                    disabled={!isApiKeySet || isGenerating}
                    value={generationMode} 
                    onValueChange={(value) => setGenerationMode(value as 'generate' | 'improve')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="generate" id="generate" />
                      <Label htmlFor="generate">Generate New</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="improve" id="improve" />
                      <Label htmlFor="improve">Improve Existing</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {generationMode === 'improve' && (
                  <div className="space-y-2">
                    <Label htmlFor="existing-content">Content to Improve</Label>
                    <Textarea
                      id="existing-content"
                      placeholder="Paste your existing content here to improve it..."
                      value={temporaryContent}
                      onChange={(e) => setTemporaryContent(e.target.value)}
                      className="h-24"
                      disabled={!isApiKeySet || isGenerating}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="context">Additional Context (Optional)</Label>
                  <Textarea
                    id="context"
                    disabled={!isApiKeySet || isGenerating}
                    placeholder="Add any specific requirements or information..."
                    value={contextPrompt}
                    onChange={(e) => setContextPrompt(e.target.value)}
                    className="h-24"
                  />
                </div>
                
                <Button 
                  onClick={handleGenerate} 
                  disabled={!isApiKeySet || isGenerating || !selectedComponent || (generationMode === 'improve' && !temporaryContent)}
                  className="w-full gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Generate Content'}
                </Button>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookText className="h-5 w-5" />
                  Generated Content
                </CardTitle>
                <CardDescription>
                  {selectedComponent ? `${researchComponents.find(c => c.id === selectedComponent)?.label} for ${project.title}` : 'Select a component to generate content'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isGenerating ? (
                  <div className="bg-muted rounded-md p-4 h-64 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Sparkles className="h-5 w-5 mx-auto animate-pulse text-primary" />
                      <p>Generating content...</p>
                      <p className="text-xs text-muted-foreground">This may take a few moments</p>
                    </div>
                  </div>
                ) : generatedContent ? (
                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-md p-4 min-h-64 max-h-96 overflow-y-auto">
                      <div className="prose prose-sm dark:prose-invert">
                        {generatedContent.split('\n').map((line, index) => (
                          <p key={index}>{line || ' '}</p>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        onClick={handleSaveContent} 
                        disabled={!generatedContent.trim()}
                        variant="default"
                        className="min-w-44 flex-1 gap-2"
                      >
                        <FilePen className="h-4 w-4" />
                        Save to Project
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!generatedContent.trim()}
                        onClick={() => {
                          const humanReview = humanizeResearchText(generatedContent);
                          setGeneratedContent(humanReview.revisedText);
                          toast.success("Human review applied", {
                            description: `${humanReview.signals.length} signal${humanReview.signals.length === 1 ? "" : "s"} checked.`,
                          });
                        }}
                        className="gap-2"
                      >
                        <Wand2 className="h-4 w-4" />
                        Human review
                      </Button>
                      
                      <Button
                        variant="outline"
                        disabled={!generatedContent.trim()}
                        onClick={() => {
                          const blob = new Blob([generatedContent], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          triggerBrowserDownload(
                            url,
                            sanitizeFileName(`${selectedComponent || 'content'}.txt`)
                          );
                          window.setTimeout(() => URL.revokeObjectURL(url), 4000);
                        }}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-md p-4 h-64 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <InfoIcon className="h-5 w-5 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {temporaryContent 
                          ? "Click 'Generate Content' to improve your text with AI"
                          : "Select a component and click 'Generate Content' to get started"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </GlassmorphismCard>
      
      <div className="bg-muted/40 rounded-lg p-5 border">
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          UHPAB AI Research Assistant Tips
        </h3>
        <Separator className="mb-3" />
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
            <span>Select components in order according to UHPAB guidelines</span>
          </li>
          <li className="flex gap-2">
            <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
            <span>Review and edit AI-generated content before final submission</span>
          </li>
          <li className="flex gap-2">
            <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
            <span>Use the 'Improve Existing' mode to enhance your current draft</span>
          </li>
          <li className="flex gap-2">
            <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
            <span>Save frequently to avoid losing your generated content</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
