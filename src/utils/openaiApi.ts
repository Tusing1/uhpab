
import { getBrowserOpenAiApiKey } from "@/lib/aiKeys";

export interface OpenAIResponse {
  text: string;
  error?: string;
}

// Custom message formatter for research components
const formatSystemMessageForResearch = (component: string): string => {
  return `You are an AI assistant specializing in academic research for nursing and midwifery students.
Focus on creating content for the ${component} section according to UHPAB guidelines.
Provide high-quality, well-structured academic content that is directly applicable to nursing and midwifery research.
Do not include introductory phrases like "I'm ready to help", "Here's a", etc. Just provide the content directly.
When creating references, follow APA 7th Edition format.`;
};

export const callOpenAIApi = async (
  prompt: string,
  context?: string
): Promise<OpenAIResponse> => {
  try {
    const apiKey = getBrowserOpenAiApiKey();
    if (!apiKey) {
      return {
        text: "",
        error: "OpenAI generation is not configured. Use a backend proxy or explicitly enable browser keys for local testing.",
      };
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an AI assistant specializing in academic research for nursing and midwifery students. Provide high-quality, well-structured academic content that follows UHPAB guidelines. Do not include introductory phrases like 'I'm ready to help', 'Here's a', etc. Just provide the content directly."
            },
            {
              role: "user",
              content: context 
                ? `Context: ${context}\n\nPrompt: ${prompt}`
                : prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2048
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        text: '',
        error: errorData.error?.message || 'Failed to get response from OpenAI API'
      };
    }

    const data = await response.json();
    let generatedText = data.choices?.[0]?.message?.content || '';
    
    // Remove common AI response prefixes
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
      if (generatedText.includes(prefix)) {
        const index = generatedText.indexOf(prefix);
        const endIndex = generatedText.indexOf("\n\n", index);
        if (endIndex > index) {
          generatedText = generatedText.substring(0, index) + generatedText.substring(endIndex + 2);
        }
      }
    }
    
    return { text: generatedText };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Function to generate content for a specific research component
export const generateResearchComponent = async (
  component: string,
  documentContent: string
): Promise<OpenAIResponse> => {
  const prompt = `
    You are an AI assistant specializing in academic research for nursing and midwifery students.
    You're helping a student create a high-quality component for their research according to UHPAB guidelines.
    
    Component to generate: ${component}
    
    Based on the uploaded document content, please create a well-structured, academic-quality
    ${component} section that follows all UHPAB guidelines.
    
    If any information is missing from the document that is needed for this component,
    provide appropriate academic content that would logically fit within the student's research.
    
    Format the response in a clean, properly structured manner suitable for direct inclusion
    in an academic document. DO NOT include any introductory phrases like "Here's a" or "I'm ready to help".
    Just provide the content directly.
  `;
  
  return callOpenAIApi(prompt, documentContent);
};
