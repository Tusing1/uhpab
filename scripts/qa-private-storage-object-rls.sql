-- Fill the two QA tokens with the canonical path of a synthetic uploaded file.
-- Metadata changes are rolled back. The real test object is not modified.
begin;
create temporary table object_qa_config as select
  '__QA_OWNER__'::uuid as owner_id,
  '__QA_DOCUMENT__'::uuid as document_id,
  (select id from auth.users where id<>'__QA_OWNER__'::uuid order by created_at,id limit 1) as other_id,
  '__QA_OWNER__/__QA_DOCUMENT__/source.txt'::text as path;
grant select on object_qa_config to authenticated, anon;
do $$ begin
  if (select other_id from object_qa_config) is null then raise exception 'A second account is required'; end if;
  if not exists(select 1 from storage.objects where bucket_id='research-private' and name=(select path from object_qa_config)) then raise exception 'Upload the synthetic file first'; end if;
end $$;
insert into public.private_research_documents
  (id,user_id,storage_path,file_name,file_type,file_size,sha256,document_type,component,result,engine_version)
select document_id,owner_id,path,'__private_access_qa__','text/plain',1,'synthetic-qa','proposal','all','{}',7
from object_qa_config;
select set_config('request.jwt.claims',json_build_object('sub',(select owner_id from object_qa_config),'role','authenticated')::text,true) is not null as owner_claims_set;
set local role authenticated;
do $$ begin
  if not exists(select 1 from storage.objects where bucket_id='research-private' and name=(select path from object_qa_config)) then raise exception 'Owner cannot read own storage object'; end if;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',(select other_id from object_qa_config),'role','authenticated')::text,true) is not null as other_claims_set;
set local role authenticated;
do $$ begin
  if exists(select 1 from storage.objects where bucket_id='research-private' and name=(select path from object_qa_config)) then raise exception 'Another account can read this storage object'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true) is not null as anon_claims_set;
set local role anon;
do $$ begin
  if exists(select 1 from storage.objects where bucket_id='research-private' and name=(select path from object_qa_config)) then raise exception 'Anonymous storage access allowed'; end if;
end $$;
reset role;
rollback;
select 'PASS: real storage object visible to owner; another account and anonymous access blocked. Test metadata rolled back.' as verification;
