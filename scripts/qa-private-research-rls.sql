-- Run as postgres in the intended project. No files are uploaded and all
-- synthetic metadata changes are rolled back. Existing user IDs stay in SQL.
begin;
create temporary table research_qa_ids as
select id as user_id, gen_random_uuid() as document_id,
       row_number() over(order by created_at, id) as ordinal
from auth.users order by created_at, id limit 2;
do $$ begin
  if (select count(*) from research_qa_ids) <> 2 then
    raise exception 'Two existing accounts are required for isolation testing';
  end if;
end $$;
grant select on research_qa_ids to authenticated, anon;
insert into public.private_research_documents
  (id,user_id,storage_path,file_name,file_type,file_size,sha256,document_type,component,result,engine_version)
select document_id,user_id,user_id::text||'/'||document_id::text||'/source.txt',
  '__uhpab_private_qa__','text/plain',1,'synthetic-qa','proposal','all','{}'::jsonb,7
from research_qa_ids;
select set_config('request.jwt.claims',json_build_object('sub',(select user_id from research_qa_ids where ordinal=1),'role','authenticated')::text,true) is not null as claims_set;
set local role authenticated;
do $$ declare affected integer; candidate uuid := gen_random_uuid(); begin
  if (select count(*) from public.private_research_documents where id in (select document_id from research_qa_ids)) <> 1 then
    raise exception 'Owner isolation failed';
  end if;
  update public.private_research_documents set keep_document=true
  where id=(select document_id from research_qa_ids where ordinal=2);
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-owner update was allowed'; end if;
  begin
    insert into public.private_research_documents
      (id,user_id,storage_path,file_name,file_type,file_size,sha256,document_type,component,result,engine_version)
    select candidate,user_id,user_id::text||'/'||candidate::text||'/source.txt','__uhpab_private_qa__','text/plain',1,'qa','proposal','all','{}',7
    from research_qa_ids where ordinal=2;
    raise exception 'Cross-owner insert was allowed';
  exception when insufficient_privilege then null;
  end;
  update public.private_research_documents set keep_document=true
  where id=(select document_id from research_qa_ids where ordinal=1);
  if exists(select 1 from public.private_research_documents where id=(select document_id from research_qa_ids where ordinal=1) and expires_at is not null) then
    raise exception 'Keep did not clear expiry';
  end if;
  update public.private_research_documents set keep_document=false
  where id=(select document_id from research_qa_ids where ordinal=1);
  if not exists(select 1 from public.private_research_documents where id=(select document_id from research_qa_ids where ordinal=1) and expires_at between now()+interval '7 days'-interval '1 minute' and now()+interval '7 days'+interval '1 minute') then
    raise exception 'Seven-day server deadline failed';
  end if;
  update public.private_research_documents set expires_at=now()+interval '100 years'
  where id=(select document_id from research_qa_ids where ordinal=1);
  if exists(select 1 from public.private_research_documents where id=(select document_id from research_qa_ids where ordinal=1) and expires_at>now()+interval '8 days') then
    raise exception 'User extended server expiry';
  end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true) is not null as anonymous_claims_set;
set local role anon;
do $$ begin
  if exists(select 1 from public.private_research_documents where id in (select document_id from research_qa_ids)) then
    raise exception 'Anonymous metadata access was allowed';
  end if;
end $$;
reset role;
rollback;
select 'PASS: owner isolation, anonymous isolation, Keep and seven-day expiry; all synthetic changes rolled back' as verification;
