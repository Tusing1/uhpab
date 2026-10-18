-- Deployment prerequisites: private-storage migration, cleanup Edge Function
-- deployed with --no-verify-jwt (the handler verifies a dedicated secret), and
-- RESEARCH_CLEANUP_SECRET configured on that function.
-- Store these two server-only values using the Supabase Vault UI:
-- research_cleanup_url: https://<project>.supabase.co/functions/v1/expire-research-documents
-- research_cleanup_secret: the matching random RESEARCH_CLEANUP_SECRET
-- Never insert service-role or cleanup secrets into client code or Git.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'research_cleanup_url')
    or not exists (select 1 from vault.decrypted_secrets where name = 'research_cleanup_secret') then
    raise exception 'Configure both research cleanup Vault secrets before enabling the schedule';
  end if;
end $$;

select cron.schedule('expire-private-research-hourly', '12 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'research_cleanup_url' limit 1),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'research_cleanup_secret' limit 1)),
    body := '{}'::jsonb
  );
$$);
