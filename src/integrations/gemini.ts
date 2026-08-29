import { getBrowserGeminiApiKey } from "@/lib/aiKeys";
import { runtimeConfig } from "@/lib/runtimeConfig";

const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

export interface GeminiResponse {
  output_text?: string;
  outputText?: string;
  steps?: Array<{
    output_text?: string;
    outputText?: string;
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  error?: {
    message: string;
  };
}

const extractGeminiText = (data: GeminiResponse) => {
  if (data.output_text) return data.output_text;
  if (data.outputText) return data.outputText;

  const stepText = data.steps
    ?.map((step) => {
      if (step.output_text) return step.output_text;
      if (step.outputText) return step.outputText;
      return step.content?.map((part) => part.text).filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  if (stepText) return stepText;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

export const generateContent = async (prompt: string): Promise<string> => {
  try {
    const apiKey = getBrowserGeminiApiKey();
    if (!apiKey) {
      throw new Error("Gemini generation is not configured. Add a Google AI key before generating content.");
    }

    const response = await fetch(GEMINI_INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: runtimeConfig.googleAiModel,
        input: prompt,
        generation_config: {
          max_output_tokens: 4096,
          thinking_level: "medium",
        },
      }),
    });

    const data: GeminiResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate content');
    }

    const generatedText = extractGeminiText(data);
    if (!generatedText) {
      throw new Error('No content generated');
    }

    return generatedText;
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}; 
