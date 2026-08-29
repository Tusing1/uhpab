import { createClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, runtimeConfig } from "@/lib/runtimeConfig";
import type { Database } from "./types";

export const supabase = isSupabaseConfigured
  ? createClient<Database>(runtimeConfig.supabaseUrl, runtimeConfig.supabaseAnonKey)
  : null;
