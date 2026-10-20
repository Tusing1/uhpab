-- Run as postgres. Uses existing accounts only as claim identities.
-- All synthetic drafts/projects and changes are rolled back.
begin;
create temporary table chapter_qa as
select id as user_id, gen_random_uuid() as draft_id, gen_random_uuid() as project_id,
       row_number() over(order by created_at,id) as ordinal
from auth.users order by created_at,id limit 2;
grant select on chapter_qa to authenticated, anon;
do $$ begin
  if (select count(*) from chapter_qa) <> 2 then raise exception 'Two account identities required'; end if;
end $$;
insert into public.chapter_workspaces(id,user_id,payload)
select draft_id,user_id,jsonb_build_object('id',draft_id,'userId',user_id,'topic','__CHAPTER_QA__','documentType','proposal','chapterKey','chapter1',
 'selectedSectionIds',jsonb_build_array('introduction','background','scope'),'activeSectionId','introduction','sections',jsonb_build_object('introduction',jsonb_build_object('content','<p>Incoming (WHO, 2021).</p>'),'background',jsonb_build_object('content','<p>Appended.</p>'),'scope',jsonb_build_object('content','<p>Skipped.</p>')),
 'sources',jsonb_build_array(jsonb_build_object('id','qa-source','citationText','(WHO, 2021)','apaReference','WHO. (2021). Synthetic QA source.')))
from chapter_qa;
insert into public.projects(id,user_id,title,type,chapters)
select project_id,user_id,'__CHAPTER_QA__','proposal','{"chapter1":{"introduction":"ORIGINAL","background":"BEFORE","scope":"KEEP"},"chapter2":{"introduction":"UNRELATED"}}'::jsonb from chapter_qa;
select set_config('request.jwt.claims',json_build_object('sub',(select user_id from chapter_qa where ordinal=1),'role','authenticated')::text,true) is not null as claims_set;
set local role authenticated;
do $$ declare own chapter_qa; other chapter_qa; result jsonb; snapshot timestamptz; affected integer; begin
  select * into own from chapter_qa where ordinal=1;
  select * into other from chapter_qa where ordinal=2;
  if (select count(*) from public.chapter_workspaces where id in (own.draft_id,other.draft_id)) <> 1 then raise exception 'Owner read isolation failed'; end if;
  begin
    insert into public.chapter_workspaces(id,user_id,payload) values(gen_random_uuid(),own.user_id,'{}');
    raise exception 'Direct insert was allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.chapter_workspaces set payload='{}' where id=own.draft_id;
    raise exception 'Direct update was allowed';
  exception when insufficient_privilege then null; end;
  delete from public.chapter_workspaces where id=other.draft_id;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Foreign delete was allowed'; end if;
  result := public.save_chapter_workspace(own.draft_id,1,(select payload from public.chapter_workspaces where id=own.draft_id));
  if (result->>'version')::integer<>2 then raise exception 'Save version did not advance'; end if;
  begin
    perform public.save_chapter_workspace(own.draft_id,1,result->'payload');
    raise exception 'Stale save was allowed';
  exception when raise_exception then if sqlerrm not like 'This draft changed%' then raise; end if; end;
  begin
    perform public.save_chapter_workspace(other.draft_id,1,result->'payload');
    raise exception 'Foreign save was allowed';
  exception when raise_exception then if sqlerrm <> 'Invalid chapter draft.' then raise; end if; end;
  select updated_at into snapshot from public.projects where id=own.project_id;
  begin
    perform public.transfer_chapter_workspace(own.draft_id,1,own.project_id,snapshot,'{"introduction":"replace"}');
    raise exception 'Stale draft transfer allowed';
  exception when raise_exception then if sqlerrm not like 'Chapter changed%' then raise; end if; end;
  begin
    perform public.transfer_chapter_workspace(own.draft_id,2,own.project_id,snapshot-interval '1 day','{"introduction":"replace"}');
    raise exception 'Stale project transfer allowed';
  exception when raise_exception then if sqlerrm not like 'Project changed%' then raise; end if; end;
  begin
    perform public.transfer_chapter_workspace(own.draft_id,2,other.project_id,snapshot,'{"introduction":"replace"}');
    raise exception 'Foreign transfer allowed';
  exception when raise_exception then if sqlerrm <> 'Project not found.' then raise; end if; end;
  perform public.transfer_chapter_workspace(own.draft_id,2,own.project_id,snapshot,'{"introduction":"replace","background":"append","scope":"skip"}');
  if not exists(select 1 from public.projects where id=own.project_id and chapters #>> '{chapter1,introduction}'='<p>Incoming (WHO, 2021).</p>'
    and chapters #>> '{chapter1,background}' like 'BEFORE%Appended%' and chapters #>> '{chapter1,scope}'='KEEP'
    and chapters #>> '{chapter2,introduction}'='UNRELATED' and chapters #>> '{references,content}' like '%Synthetic QA source%'
    and exists(select 1 from jsonb_array_elements(chapters->'_chapterWorkspaceHistory') item where item->>'section'='introduction' and item->>'content'='ORIGINAL')) then raise exception 'Transfer choices/references/history failed'; end if;
  if not exists(select 1 from public.chapter_workspaces where id=own.draft_id) then raise exception 'Transfer removed draft'; end if;
  delete from public.chapter_workspaces where id=own.draft_id;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Owner cannot delete'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true) is not null as anonymous_claims_set;
set local role anon;
do $$ begin
  begin
    perform 1 from public.chapter_workspaces;
    raise exception 'Anonymous read allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_chapter_workspace(gen_random_uuid(),0,'{}');
    raise exception 'Anonymous RPC allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: owner isolation; no direct writes; anonymous/foreign access denied; version conflicts; safe Skip/Append/Replace; citations/history retained. All synthetic changes rolled back.' as verification;
