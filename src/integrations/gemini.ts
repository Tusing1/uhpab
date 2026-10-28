import { getKeyRevision, getResearchKeys } from "@/lib/aiKeys";
import { runtimeConfig } from "@/lib/runtimeConfig";
import { ResearchServiceError } from '@/lib/researchServiceError';

export interface GeminiResponse {
  text?: string;
  output_text?: string;
  outputText?: string;
  steps?: Array<{
    type?: string;
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
    code?: string | number;
  } | string;
  code?: string;
}

const extractGeminiText = (data: GeminiResponse) => {
  if (data.text) return data.text;
  if (data.output_text) return data.output_text;
  if (data.outputText) return data.outputText;

  const stepText = data.steps
    ?.map((step) => {
      if (step.type && step.type !== 'model_output') return '';
      if (step.output_text) return step.output_text;
      if (step.outputText) return step.outputText;
      return step.content?.filter(part => !part.type || part.type === 'text').map((part) => part.text).filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  if (stepText) return stepText;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

export type ResearchTool = 'url_context' | 'google_search';
export type GroundedResponse = { text: string; citations: Array<{ url: string; title: string }>; searchSuggestions?: string };
export function groundingSuggestions(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  if ('searchSuggestions' in data && typeof data.searchSuggestions === 'string') return data.searchSuggestions;
  if (Array.isArray(data)) return data.map(groundingSuggestions).filter(Boolean).join('');
  if ('search_suggestions' in data && typeof data.search_suggestions === 'string') return data.search_suggestions;
  return Object.values(data).map(groundingSuggestions).filter(Boolean).join('');
}

export function groundingCitations(data: unknown): GroundedResponse['citations'] {
  const found = new Map<string, { url: string; title: string }>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const record = value as Record<string, unknown>;
    if (record.type === 'url_citation' && typeof record.url === 'string' && /^https:\/\//i.test(record.url)) {
      found.set(record.url, { url: record.url, title: typeof record.title === 'string' ? record.title : record.url });
    }
    Object.values(record).forEach(visit);
  };
  visit(data);
  // The proxy returns only provider annotations, never citations parsed from model prose.
  if (data && typeof data === 'object' && 'citations' in data && Array.isArray(data.citations)) {
    for (const item of data.citations) if (typeof item?.url === 'string' && /^https:\/\//i.test(item.url)) found.set(item.url, { url: item.url, title: item.title || item.url });
  }
  return [...found.values()];
}

export const generateResearchResponse = async (prompt: string, tools: ResearchTool[] = [], options: { signal?: AbortSignal } = {}): Promise<GroundedResponse> => {
    const keys = getResearchKeys();
    const revision = getKeyRevision();
    if (!keys.length) throw new ResearchServiceError('Add your Gemini key in Settings before generating.', 401, 'missing_key');
    const request = async (apiKey: string): Promise<GroundedResponse> => {
    if (getKeyRevision() !== revision) throw new ResearchServiceError('Your research key selection changed. Please retry.',401,'key_session_changed');
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        model: runtimeConfig.googleAiModel,
        prompt,
        tools,
      }),
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000),
    });

    const data: GeminiResponse = await response.json().catch(() => {
      throw new ResearchServiceError('The research endpoint returned an unreadable response. Restart the local server or contact support.', response.status, 'unreadable_response');
    });

    if (!response.ok) {
      const message = typeof data.error === "string" ? data.error : data.error?.message;
      const code = typeof data.error === 'object' ? String(data.error?.code || '') : data.code || '';
      const retryAfter = Number(response.headers?.get('retry-after'));
      throw new ResearchServiceError(apiKey ? (message || 'Failed to generate content').split(apiKey).join('[redacted]') : message || 'Failed to generate content', response.status, code, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined);
    }

    const generatedText = extractGeminiText(data);
    if (!generatedText) {
      throw new Error('No content generated');
    }

    return { text: generatedText, citations: groundingCitations(data), searchSuggestions: groundingSuggestions(data) };
    };
    try { return await request(keys[0].value); }
    catch (error) {
      const failure = error as ResearchServiceError;
      // A backup repairs key-specific authentication, never quota, billing or provider limits.
      const rejectedKey = failure.status === 401 || failure.status === 400 && /API_KEY_INVALID|API_KEY_EXPIRED|api key (?:not valid|expired|invalid)/i.test(`${failure.code} ${failure.message}`);
      if (keys[1] && rejectedKey && getKeyRevision() === revision) return request(keys[1].value);
      throw error;
    }
}; 

export const generateContent = async (prompt: string, options: { signal?: AbortSignal } = {}): Promise<string> => (await generateResearchResponse(prompt, [], options)).text;
