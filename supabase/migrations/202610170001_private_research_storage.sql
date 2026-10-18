create table public.private_research_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  file_type text not null,
  file_size bigint not null check (file_size between 1 and 26214400),
  file_last_modified bigint not null default 0,
  sha256 text not null,
  page_count integer,
  document_type text not null check (document_type in ('proposal', 'report')),
  component text not null,
  result jsonb not null,
  engine_version integer not null,
  analysis_runs integer not null default 1,
  cache_notes jsonb not null default '[]'::jsonb,
  keep_document boolean not null default false,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deletion_started_at timestamptz,
  constraint research_path_owner check (storage_path like user_id::text || '/' || id::text || '/source.%')
);

create index private_research_documents_owner on public.private_research_documents(user_id, updated_at desc);
create index private_research_documents_expiry on public.private_research_documents(expires_at) where keep_document = false;
alter table public.private_research_documents enable row level security;

create function public.enforce_research_retention() returns trigger
language plpgsql set search_path = public as $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.id <> OLD.id or NEW.user_id <> OLD.user_id or NEW.storage_path <> OLD.storage_path then
      raise exception 'Document ownership and storage path are immutable';
    end if;
    NEW.created_at := OLD.created_at;
    if OLD.deletion_started_at is not null and auth.role() <> 'service_role' then raise exception 'Document deletion is already in progress'; end if;
    if auth.role() <> 'service_role' then NEW.deletion_started_at := OLD.deletion_started_at; end if;
    if NEW.keep_document then NEW.expires_at := null;
    elsif OLD.keep_document then NEW.expires_at := now() + interval '7 days';
    else NEW.expires_at := OLD.expires_at;
    end if;
  else
    NEW.created_at := now();
    NEW.deletion_started_at := null;
    NEW.expires_at := case when NEW.keep_document then null else now() + interval '7 days' end;
  end if;
  NEW.updated_at := now();
  return NEW;
end;
$$;

create trigger private_research_retention before insert or update on public.private_research_documents
for each row execute function public.enforce_research_retention();

create policy research_documents_read on public.private_research_documents for select to authenticated
using (user_id = auth.uid() and deletion_started_at is null and (keep_document or expires_at > now()));
create policy research_documents_insert on public.private_research_documents for insert to authenticated
with check (user_id = auth.uid());
create policy research_documents_update on public.private_research_documents for update to authenticated
using (user_id = auth.uid() and deletion_started_at is null and (keep_document or expires_at > now()))
with check (user_id = auth.uid());
create policy research_documents_delete on public.private_research_documents for delete to authenticated
using (user_id = auth.uid() and deletion_started_at is null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('research-private', 'research-private', false, 26214400,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy research_objects_read on storage.objects for select to authenticated
using (bucket_id = 'research-private' and exists (
  select 1 from public.private_research_documents d where d.storage_path = name and d.user_id = auth.uid()
  and d.deletion_started_at is null and (d.keep_document or d.expires_at > now())
));
create policy research_objects_insert on storage.objects for insert to authenticated
with check (bucket_id = 'research-private' and exists (
  select 1 from public.private_research_documents d where d.storage_path = name and d.user_id = auth.uid()
  and d.deletion_started_at is null and (d.keep_document or d.expires_at > now())
));
create policy research_objects_delete on storage.objects for delete to authenticated
using (bucket_id = 'research-private' and exists (
  select 1 from public.private_research_documents d where d.storage_path = name and d.user_id = auth.uid()
));

-- Restrictive guard also protects this bucket if another pre-existing,
-- permissive Storage policy grants broad access across buckets.
create policy research_private_bucket_guard on storage.objects as restrictive for all to public
using (bucket_id <> 'research-private' or exists (
  select 1 from public.private_research_documents d where d.storage_path = name and d.user_id = auth.uid()
  and d.deletion_started_at is null and (d.keep_document or d.expires_at > now())
))
with check (bucket_id <> 'research-private' or exists (
  select 1 from public.private_research_documents d where d.storage_path = name and d.user_id = auth.uid()
  and d.deletion_started_at is null and (d.keep_document or d.expires_at > now())
));

-- A metadata/account deletion must not leave an inaccessible object behind.
create table public.private_research_deletion_queue (
  id uuid primary key,
  storage_path text not null,
  queued_at timestamptz not null default now()
);
alter table public.private_research_deletion_queue enable row level security;
revoke all on public.private_research_deletion_queue from anon, authenticated;

create function public.queue_research_object_deletion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.private_research_deletion_queue(id, storage_path) values (OLD.id, OLD.storage_path)
  on conflict (id) do nothing;
  return OLD;
end;
$$;
create trigger research_object_delete_queue after delete on public.private_research_documents
for each row execute function public.queue_research_object_deletion();

-- Claim due rows atomically before physical deletion. Claimed files cannot be
-- read or retained. Failed deletes remain claimed and can be retried safely.
create function public.claim_expired_research_documents(batch_size integer default 100)
returns table (id uuid, storage_path text)
language sql security definer set search_path = public as $$
  with claimed as (
  update public.private_research_documents d set deletion_started_at = coalesce(d.deletion_started_at, now())
  where d.id in (
    select x.id from public.private_research_documents x
    where not x.keep_document and x.expires_at <= now()
    order by x.expires_at limit least(greatest(batch_size, 1), 100)
    for update skip locked
  ) returning d.id, d.storage_path
  ), queued as (
    select q.id, q.storage_path from public.private_research_deletion_queue q
    order by q.queued_at limit least(greatest(batch_size, 1), 100)
  ) select * from claimed union select * from queued;
$$;
revoke all on function public.claim_expired_research_documents(integer) from public, anon, authenticated;
grant execute on function public.claim_expired_research_documents(integer) to service_role;

create function public.complete_research_document_deletion(document_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.private_research_documents where id = document_id and deletion_started_at is not null;
  delete from public.private_research_deletion_queue where id = document_id;
end;
$$;
revoke all on function public.complete_research_document_deletion(uuid) from public, anon, authenticated;
grant execute on function public.complete_research_document_deletion(uuid) to service_role;

-- Scheduling is installed separately, after the cleanup Edge Function and its
-- server-only invocation secret are available. Never put that secret here.
