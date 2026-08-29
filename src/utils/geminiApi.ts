
import { proposalStructure, reportStructure } from '@/data/uhpabGuidelines';
import { setBrowserGeminiApiKey } from '@/lib/aiKeys';
import { generateContent } from '@/integrations/gemini';

export interface GeminiResponse {
  text: string;
  error?: string;
}

// For compatibility with existing components
export const setGeminiApiKey = (apiKey: string) => {
  setBrowserGeminiApiKey(apiKey, { persist: true });
};

/**
 * Find detailed guidelines for a specific component from UHPAB guidelines
 */
function findGuidelineForComponent(
  component: string,
  projectType: 'proposal' | 'report' = 'proposal'
): { sectionTitle?: string; requirements?: string[]; formatting?: string; pageCount?: string } {
  const structure = projectType === 'report' ? reportStructure : proposalStructure;
  
  for (const sectionKey in structure) {
    const section = structure[sectionKey];
    if (!section.sections) continue;
    
    for (const compKey in section.sections) {
      const comp = section.sections[compKey];
      
      // Flexible match: allow either id or title or content id
      if (
        compKey.toLowerCase() === component.toLowerCase() ||
        (comp.title && comp.title.toLowerCase().includes(component.toLowerCase())) ||
        (component.replace(/\d+\.\d+|\d+\./g, "").trim().length > 2 &&
          comp.title?.toLowerCase().includes(
            component.replace(/\d+\.\d+|\d+\./g, "").trim().toLowerCase()
          ))
      ) {
        return {
          sectionTitle: comp.title,
          requirements: comp.requirements,
          formatting: comp.formatting,
          pageCount: section.pageCount
        };
      }
    }
  }
  return {};
}

export const callGeminiApi = async (
  prompt: string,
  context?: string
): Promise<GeminiResponse> => {
  try {
    const generatedText = await generateContent(
      context ? `Context: ${context}\n\nPrompt: ${prompt}` : prompt
    );

    return { text: generatedText };
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Function to generate content for a specific research component
export const generateResearchComponent = async (
  component: string,
  documentContent: string,
  projectType: 'proposal' | 'report' = 'proposal'
): Promise<GeminiResponse> => {
  // Get detailed guideline requirements for the component
  const guidelines = findGuidelineForComponent(component, projectType);
  
  // Prepare a detailed guideline section
  const guidelinesPart = guidelines.requirements && guidelines.requirements.length
    ? `UHPAB Requirements for "${guidelines.sectionTitle || component}":\n${guidelines.requirements.map(
        (r, i) => `  ${i + 1}. ${r}`
      ).join('\n')}\n`
    : '';
  
  // Include formatting guidelines if available
  const formattingGuide = guidelines.formatting 
    ? `\nFormatting guidance: ${guidelines.formatting}` 
    : '';
  
  // Include page count if available
  const pageCountGuide = guidelines.pageCount 
    ? `\nRecommended length: ${guidelines.pageCount}` 
    : '';

  const prompt = `
    You are an AI assistant specializing in academic research for nursing and midwifery students.
    You're helping a student create a high-quality component for their research according to UHPAB guidelines.
    
    Component to generate: ${guidelines.sectionTitle || component}
    
    ${guidelinesPart}
    ${formattingGuide}
    ${pageCountGuide}
    
    Based on the uploaded document content about "KNOWLEDGE AND ATTITUDE OF PREGNANT MOTHERS TOWARDS MALARIA PREVENTION IN ALIBA PARISH", please create a well-structured, academic-quality
    ${guidelines.sectionTitle || component} section that follows all UHPAB guidelines above.

    Use appropriate academic language and incorporate relevant literature where needed.
    Ensure your content is substantive, properly structured, and follows all formatting requirements.
    
    If any information is missing from the document that is needed for this component,
    provide appropriate academic content that would logically fit within the student's research.

    Format the response in a clean, properly structured manner suitable for direct inclusion
    in an academic document. Include appropriate headings and subheadings as needed.
  `;
  
  return callGeminiApi(prompt, documentContent);
};

// Function to check plagiarism in a document
export const checkPlagiarism = async (
  documentContent: string,
  component?: string,
  projectType: 'proposal' | 'report' = 'proposal'
): Promise<GeminiResponse> => {
  let guidelinesPart = '';
  if (component) {
    const guidelines = findGuidelineForComponent(component, projectType);
    if (guidelines.requirements && guidelines.requirements.length) {
      guidelinesPart = `\nWhen checking for plagiarism, make sure to consider the following UHPAB requirements for "${guidelines.sectionTitle || component}":\n${guidelines.requirements.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}\n\n`;
    }
  }

  const prompt = `
    You are an AI assistant specializing in academic integrity and plagiarism detection.
    ${guidelinesPart}
    Analyze the following document content and identify any potential plagiarism issues:
    1. Sentences or paragraphs that appear to be directly copied from common sources
    2. Text that shows patterns typical of AI-generated content
    3. Sections that might need citation or reference

    Format your response as a detailed report with:
    - Overall originality score (percentage)
    - Sections with potential issues (quoted with line numbers if possible)
    - Suggestions for improvement for each flagged section

    This is for educational purposes to help students improve their academic writing.
  `;
  
  return callGeminiApi(prompt, documentContent);
};
