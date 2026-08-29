const geminiStorageKey = "gemini_api_key";
let sessionGeminiApiKey = "";

const getLocalStorageValue = (key: string) => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key)?.trim() || "";
};

export const setBrowserGeminiApiKey = (apiKey: string) => {
  sessionGeminiApiKey = apiKey.trim();
  if (typeof window !== "undefined") {
    if (sessionGeminiApiKey) {
      window.localStorage.setItem(geminiStorageKey, sessionGeminiApiKey);
    } else {
      window.localStorage.removeItem(geminiStorageKey);
    }
  }
};

export const getBrowserGeminiApiKey = () =>
  sessionGeminiApiKey || getLocalStorageValue(geminiStorageKey);

export const getBrowserOpenAiApiKey = () =>
  runtimeConfig.allowBrowserOpenAi ? runtimeConfig.openAiApiKey : "";
