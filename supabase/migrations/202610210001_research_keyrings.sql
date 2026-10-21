begin;
create table if not exists public.research_keyrings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  keys jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint research_keyring_size check (jsonb_typeof(keys) = 'array' and jsonb_array_length(keys) <= 5)
);
alter table public.research_keyrings enable row level security;
revoke all on public.research_keyrings from anon;
grant select, insert, update, delete on public.research_keyrings to authenticated;
create policy research_keys_owner_select on public.research_keyrings for select to authenticated using ((select auth.uid()) = user_id);
create policy research_keys_owner_insert on public.research_keyrings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy research_keys_owner_update on public.research_keyrings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy research_keys_owner_delete on public.research_keyrings for delete to authenticated using ((select auth.uid()) = user_id);
comment on table public.research_keyrings is 'Owner-only research credentials. Never include in workspace exports, analytics, logs or school staff queries.';
commit;
