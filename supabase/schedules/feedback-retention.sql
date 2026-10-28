-- Run after the feedback migration. Requires the existing pg_cron installation.
do $$ begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'Enable pg_cron before scheduling feedback retention';
  end if;
end $$;
select cron.schedule('uhpab-feedback-retention', '23 * * * *', 'select public.purge_expired_tester_feedback();');
