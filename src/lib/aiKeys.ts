import { runtimeConfig } from "@/lib/runtimeConfig";

const geminiStorageKey = "gemini_api_key";
let sessionGeminiApiKey = "";
let sessionInitialized = false;
let keyRevision = 0;
let keyOwner: string | null = null;
export const getKeyOwner = () => keyOwner;
export const setKeyOwner = (owner: string | null) => {
  if (owner === keyOwner) return;
  keyOwner = owner;
  setResearchKeys([]);
};
export const getKeyRevision = () => keyRevision;
export type ResearchKey = { id: string; label: string; value: string };
let researchKeys: ResearchKey[] = [];
export const getResearchKeys = () => researchKeys.length ? researchKeys.map(key => ({ ...key })) : !sessionInitialized && getLocalStorageValue(geminiStorageKey) ? [{id:'legacy',label:'Primary key',value:getLocalStorageValue(geminiStorageKey)}] : [];
export const setResearchKeys = (keys: ResearchKey[]) => {
  keyRevision++;
  researchKeys = keys.map(key => ({ ...key }));
  sessionInitialized = true;
  sessionGeminiApiKey = researchKeys[0]?.value || '';
};

const getLocalStorageValue = (key: string) => {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(key)?.trim() || ""; }
  catch { return ''; }
};

export const setBrowserGeminiApiKey = (apiKey: string, options: { persist?: boolean } = {}) => {
  keyRevision++;
  sessionGeminiApiKey = apiKey.trim();
  sessionInitialized = true;
  researchKeys = sessionGeminiApiKey ? [{ id: 'legacy', label: 'Primary key', value: sessionGeminiApiKey }] : [];
  if (typeof window !== "undefined" && options.persist) {
    if (sessionGeminiApiKey) {
      window.localStorage.setItem(geminiStorageKey, sessionGeminiApiKey);
    } else {
      window.localStorage.removeItem(geminiStorageKey);
    }
  }
};

export const getBrowserGeminiApiKey = () =>
  sessionGeminiApiKey || (!sessionInitialized ? getLocalStorageValue(geminiStorageKey) : '');

export const getBrowserOpenAiApiKey = () =>
  runtimeConfig.allowBrowserOpenAi ? runtimeConfig.openAiApiKey : "";
