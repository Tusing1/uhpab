import { createClient } from 'npm:@supabase/supabase-js@2';
import { createResearchCleanupHandler } from './handler.ts';

Deno.serve(createResearchCleanupHandler(Deno.env.get('RESEARCH_CLEANUP_SECRET'), () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
));
