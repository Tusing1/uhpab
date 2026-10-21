-- Run in the Supabase SQL editor as postgres. Every synthetic write rolls back.
begin;
select set_config('qa.keyring_owner', (
  select id::text from auth.users u
  where not exists (select 1 from public.research_keyrings k where k.user_id = u.id)
  limit 1
), true);
do $$ begin
  if nullif(current_setting('qa.keyring_owner', true), '') is null then
    raise exception 'No unused owner available for rollback-only keyring QA';
  end if;
end $$;
insert into public.research_keyrings(user_id, keys)
values (current_setting('qa.keyring_owner')::uuid, '[{"id":"qa","label":"SYNTHETIC ROLLBACK ONLY","value":"not-a-real-key"}]');
select set_config('request.jwt.claim.sub', current_setting('qa.keyring_owner'), true);
set local role authenticated;
do $$ declare affected integer; begin
  if (select count(*) from public.research_keyrings) <> 1 then raise exception 'Owner isolation failed'; end if;
  update public.research_keyrings set updated_at = now() where user_id = auth.uid();
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner update denied'; end if;
  delete from public.research_keyrings where user_id = auth.uid();
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner delete denied'; end if;
  insert into public.research_keyrings(user_id, keys)
  values(auth.uid(), '[{"id":"qa","label":"SYNTHETIC ROLLBACK ONLY","value":"not-a-real-key"}]');
  begin
    update public.research_keyrings set user_id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid;
    raise exception 'Ownership reassignment unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', 'ffffffff-ffff-4fff-8fff-ffffffffffff', true);
do $$ declare affected integer; begin
  if (select count(*) from public.research_keyrings) <> 0 then raise exception 'Foreign read allowed'; end if;
  update public.research_keyrings set keys = '[]'::jsonb;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Foreign update allowed'; end if;
  delete from public.research_keyrings;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Foreign delete allowed'; end if;
  begin
    insert into public.research_keyrings(user_id, keys)
    values(current_setting('qa.keyring_owner')::uuid, '[]');
    raise exception 'Foreign insert allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
set local role anon;
do $$ begin
  begin
    perform 1 from public.research_keyrings;
    raise exception 'Anonymous read allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
select 'PASS: owner CRUD; foreign CRUD denied; ownership change denied; anonymous denied; all synthetic writes rolled back.' as privacy_qa;
