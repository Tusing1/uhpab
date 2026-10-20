-- Persistent writing drafts are not marking uploads and have no automatic expiry.
create table if not exists public.chapter_workspaces (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 2097152),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chapter_workspaces_owner_updated on public.chapter_workspaces(user_id, updated_at desc);
alter table public.chapter_workspaces enable row level security;
revoke all on public.chapter_workspaces from anon, authenticated;
grant select, delete on public.chapter_workspaces to authenticated;
create policy chapter_workspace_read_owner on public.chapter_workspaces for select to authenticated using (user_id = auth.uid());
create policy chapter_workspace_delete_owner on public.chapter_workspaces for delete to authenticated using (user_id = auth.uid());

create or replace function public.save_chapter_workspace(p_id uuid, p_expected_version integer, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.chapter_workspaces;
begin
  if auth.uid() is null then raise exception 'Sign in to save a chapter.'; end if;
  if p_payload->>'userId' is distinct from auth.uid()::text or p_payload->>'id' is distinct from p_id::text
    or coalesce(p_payload->>'chapterKey','') not in ('chapter1','chapter2','chapter3')
    or coalesce(p_payload->>'documentType','') not in ('proposal','report')
    or p_expected_version is null or p_expected_version < 0
    or coalesce(length(trim(p_payload->>'topic')),0) = 0
    or jsonb_typeof(p_payload->'selectedSectionIds') is distinct from 'array'
    or jsonb_typeof(p_payload->'sections') is distinct from 'object'
    or jsonb_typeof(p_payload->'sources') is distinct from 'array'
  then raise exception 'Invalid chapter draft.'; end if;
  if p_expected_version = 0 then
    insert into public.chapter_workspaces(id,user_id,payload) values(p_id,auth.uid(),p_payload) returning * into saved;
  else
    update public.chapter_workspaces set payload=p_payload,version=version+1,updated_at=clock_timestamp()
      where id=p_id and user_id=auth.uid() and version=p_expected_version returning * into saved;
    if not found then raise exception 'This draft changed in another tab. Download your current text before reloading.'; end if;
  end if;
  return jsonb_build_object('payload',saved.payload,'version',saved.version,'updated_at',saved.updated_at);
end $$;
revoke all on function public.save_chapter_workspace(uuid,integer,jsonb) from public, anon;
grant execute on function public.save_chapter_workspace(uuid,integer,jsonb) to authenticated;

create or replace function public.transfer_chapter_workspace(p_workspace_id uuid,p_workspace_version integer,p_project_id uuid,p_project_updated_at timestamptz,p_modes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.chapter_workspaces; p public.projects; chapter text; key text; mode text; incoming text; previous text;
  content jsonb; history jsonb; refs text; source jsonb; used_source jsonb := '[]'::jsonb; combined text := ''; changed integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into w from public.chapter_workspaces where id=p_workspace_id and user_id=auth.uid() for update;
  if not found or p_workspace_version is null or w.version <> p_workspace_version then raise exception 'Chapter changed. Save and reopen the transfer preview.'; end if;
  select * into p from public.projects where id=p_project_id and user_id=auth.uid() for update;
  if not found then raise exception 'Project not found.'; end if;
  if p.updated_at is distinct from p_project_updated_at then raise exception 'Project changed. Reload the preview before transferring.'; end if;
  if p.type is distinct from w.payload->>'documentType' then raise exception 'Proposal and report types must match.'; end if;
  if lower(trim(p.title)) <> lower(trim(w.payload->>'topic')) then raise exception 'Project and chapter topics must match before transferring.'; end if;
  chapter := w.payload->>'chapterKey';
  if coalesce(chapter,'') not in ('chapter1','chapter2','chapter3') or jsonb_typeof(p_modes) is distinct from 'object' then raise exception 'Invalid chapter transfer.'; end if;
  content := coalesce(p.chapters,'{}'::jsonb);
  history := coalesce(content->'_chapterWorkspaceHistory','[]'::jsonb);
  if jsonb_typeof(content->chapter) is distinct from 'object' then content := jsonb_set(content,array[chapter],'{}'::jsonb); end if;
  for key,mode in select * from jsonb_each_text(p_modes) loop
    if not (w.payload->'selectedSectionIds' ? key) or mode not in ('skip','append','replace') then raise exception 'Invalid section choice.'; end if;
    if mode='skip' then continue; end if;
    incoming := coalesce(w.payload #>> array['sections',key,'content'],'');
    if trim(incoming)='' then continue; end if;
    previous := coalesce(content #>> array[chapter,key],'');
    history := history || jsonb_build_array(jsonb_build_object('workspaceId',w.id,'chapter',chapter,'section',key,'content',previous,'transferredAt',clock_timestamp(),'mode',mode));
    content := jsonb_set(content,array[chapter,key],to_jsonb(case when mode='append' and previous<>'' then previous || '<p><br></p>' || incoming else incoming end));
    combined := combined || ' ' || incoming;
    changed := changed+1;
  end loop;
  if changed=0 then raise exception 'Choose at least one nonempty section.'; end if;
  refs := coalesce(content #>> '{references,content}','');
  for source in select * from jsonb_array_elements(w.payload->'sources') loop
    if coalesce(source->>'citationText','')<>'' and position(regexp_replace(lower(source->>'citationText'),'[^a-z0-9]','','g') in regexp_replace(lower(combined),'[^a-z0-9]','','g'))>0 then
      used_source := used_source || jsonb_build_array(source);
      if coalesce(source->>'apaReference','')<>'' and position(source->>'apaReference' in refs)=0 then refs := refs || E'\n\n' || (source->>'apaReference'); end if;
    end if;
  end loop;
  if jsonb_typeof(content->'references') is distinct from 'object' then content := jsonb_set(content,'{references}','{}'::jsonb); end if;
  content := jsonb_set(content,'{references,content}',to_jsonb(refs));
  content := jsonb_set(content,'{_sourcesLibrary}',coalesce(content->'_sourcesLibrary','[]'::jsonb) || used_source);
  content := jsonb_set(content,'{_chapterWorkspaceHistory}',history);
  update public.projects set chapters=content,updated_at=clock_timestamp() where id=p.id and user_id=auth.uid();
end $$;
revoke all on function public.transfer_chapter_workspace(uuid,integer,uuid,timestamptz,jsonb) from public, anon;
grant execute on function public.transfer_chapter_workspace(uuid,integer,uuid,timestamptz,jsonb) to authenticated;
