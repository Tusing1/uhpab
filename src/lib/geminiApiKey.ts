export const LEGACY_GEMINI_API_KEY_LENGTH = 39;

const legacyGeminiApiKeyPattern = /^AIza[A-Za-z0-9_-]{35}$/;
const authorizationGeminiApiKeyPattern = /^AQ\.[A-Za-z0-9._-]{20,509}$/;

export const normalizeGeminiApiKey = (value: string) => value.trim();

export const getGeminiApiKeyIssue = (value: string) => {
  const apiKey = normalizeGeminiApiKey(value);

  if (!apiKey) return "Paste your Google AI Studio key.";
  if (apiKey.startsWith("AIza") && apiKey.length !== LEGACY_GEMINI_API_KEY_LENGTH) {
    return `This legacy key must contain exactly ${LEGACY_GEMINI_API_KEY_LENGTH} characters. It currently has ${apiKey.length}.`;
  }
  if (!legacyGeminiApiKeyPattern.test(apiKey) && !authorizationGeminiApiKeyPattern.test(apiKey)) {
    return "This does not look like a Google AI Studio key. Current keys start with AQ.; older keys start with AIza.";
  }

  return "";
};

export const verifyGeminiApiKey = async (value: string) => {
  const apiKey = normalizeGeminiApiKey(value);
  const formatIssue = getGeminiApiKeyIssue(apiKey);
  if (formatIssue) throw new Error(formatIssue);

  const response = await fetch("/api/validate-gemini-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const result = (await response.json().catch(() => ({}))) as { valid?: boolean; error?: string };

  if (!response.ok || !result.valid) {
    throw new Error(result.error || "Google did not accept this key. Check it in Google AI Studio and try again.");
  }

  return apiKey;
};
