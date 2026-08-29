const readEnv = (key: string) => {
  const value = import.meta.env[key];
  return typeof value === "string" ? value.trim() : "";
};

export const runtimeConfig = {
  supabaseUrl: readEnv("VITE_SUPABASE_URL"),
  supabaseAnonKey: readEnv("VITE_SUPABASE_ANON_KEY"),
  googleAiApiKey: readEnv("VITE_GOOGLE_AI_API_KEY"),
  googleAiModel: readEnv("VITE_GOOGLE_AI_MODEL") || "gemini-3.6-flash",
  openAiApiKey: readEnv("VITE_OPENAI_API_KEY"),
  allowBrowserOpenAi: readEnv("VITE_ALLOW_BROWSER_OPENAI") === "true",
};

export const isSupabaseConfigured =
  runtimeConfig.supabaseUrl.length > 0 && runtimeConfig.supabaseAnonKey.length > 0;

export const isDemoAuthEnabled =
  readEnv("VITE_ENABLE_DEMO_AUTH") === "true" || (!isSupabaseConfigured && import.meta.env.DEV);

export const getMissingProductionConfig = () => {
  const missing: string[] = [];
  if (!runtimeConfig.supabaseUrl) missing.push("VITE_SUPABASE_URL");
  if (!runtimeConfig.supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY");
  return missing;
};
