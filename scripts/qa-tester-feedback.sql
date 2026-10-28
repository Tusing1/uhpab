-- Execute inside a transaction AFTER the migration; rollback all synthetic reports and grants.
select set_config('qa.feedback_owner', (select id::text from auth.users order by created_at limit 1), true);
select set_config('qa.feedback_foreign', (select id::text from auth.users order by created_at offset 1 limit 1), true);
select set_config('qa.feedback_support', (select id::text from auth.users order by created_at offset 2 limit 1), true);
do $$ begin
  if nullif(current_setting('qa.feedback_support'), '') is null then raise exception 'QA requires three existing accounts'; end if;
  if exists(select 1 from public.tester_feedback) or exists(select 1 from public.feedback_reviewers) then raise exception 'Run these first-install tests in a rolled-back fresh migration or isolated staging database'; end if;
end $$;
select set_config('request.jwt.claim.sub', current_setting('qa.feedback_owner'), true);
set local role authenticated;
do $$ declare
  report jsonb := jsonb_build_object('requestId', gen_random_uuid(), 'category', 'problem', 'description', 'Synthetic rollback-only feedback: download button was not available.', 'diagnostic', jsonb_build_object('tool','defence-slides','release','2026.10.28-feedback.1','stage','export','errorCode','export-failed','browser','Chrome','device','desktop'), 'screenshot', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'consent', true);
  receipt jsonb; repeated jsonb; i integer;
begin
  if public.is_feedback_reviewer() then raise exception 'Unexpected reviewer' using errcode='XX000'; end if;
  receipt := public.submit_tester_feedback(report);
  perform set_config('qa.feedback_id', receipt->>'id', true);
  if (select count(*) from public.tester_feedback) <> 1 or (select count(*) from public.tester_feedback_attachments) <> 1 then raise exception 'Owner read failed' using errcode='XX000'; end if;
  repeated := public.submit_tester_feedback(report);
  if repeated->>'id' <> receipt->>'id' or repeated->>'duplicate' <> 'true' then raise exception 'Idempotency failed' using errcode='XX000'; end if;
  repeated := public.submit_tester_feedback(jsonb_set(report,'{requestId}',to_jsonb(gen_random_uuid())));
  if repeated->>'id' <> receipt->>'id' then raise exception 'Content duplicate failed' using errcode='XX000'; end if;
  begin
    perform public.submit_tester_feedback(report || '{"description":"Changed content must not reuse the same request id"}'::jsonb);
    raise exception 'Request reuse allowed' using errcode='XX000';
  exception when raise_exception then if sqlerrm <> 'FEEDBACK_CONFLICT' then raise; end if; end;
  begin
    perform public.submit_tester_feedback(report || '{"consent":false}'::jsonb);
    raise exception 'Missing consent allowed' using errcode='XX000';
  exception when raise_exception then if sqlerrm <> 'FEEDBACK_INVALID' then raise; end if; end;
  begin
    perform public.submit_tester_feedback(report || '{"owner_id":"ffffffff-ffff-4fff-8fff-ffffffffffff"}'::jsonb);
    raise exception 'Identity injection allowed' using errcode='XX000';
  exception when raise_exception then if sqlerrm <> 'FEEDBACK_INVALID' then raise; end if; end;
  begin
    perform public.submit_tester_feedback(jsonb_set(report,'{diagnostic}', '{"tool":"defence-slides","release":"2026.10.28-feedback.1","stage":"export","errorCode":"export-failed","browser":"Chrome","device":"desktop","prompt":"private"}'));
    raise exception 'Private diagnostic field allowed' using errcode='XX000';
  exception when raise_exception then if sqlerrm <> 'FEEDBACK_INVALID' then raise; end if; end;
  begin
    perform public.submit_tester_feedback(jsonb_set(report,'{diagnostic,tool}', '"https://private.example/doc"'));
    raise exception 'Unknown diagnostic value allowed' using errcode='XX000';
  exception when raise_exception then if sqlerrm <> 'FEEDBACK_INVALID' then raise; end if; end;
  begin
    perform public.submit_tester_feedback(report || jsonb_build_object('screenshot',encode(convert_to('<svg onload="alert(1)"/>','UTF8'),'base64')));
    raise exception 'SVG upload allowed' using errcode='XX000';
  exception when raise_exception then if sqlerrm <> 'FEEDBACK_INVALID' then raise; end if; end;
  begin
    perform public.submit_tester_feedback(report || jsonb_build_object('screenshot',repeat('A',1398105)));
    raise exception 'Oversized upload allowed' using errcode='XX000';
  exception when raise_exception then if sqlerrm <> 'FEEDBACK_INVALID' then raise; end if; end;
  begin
    insert into public.tester_feedback(owner_id, request_id, category, description, content_hash) values(auth.uid(),gen_random_uuid(),'problem','Direct insert must not work',decode('00','hex'));
    raise exception 'Direct insert allowed' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  begin
    update public.tester_feedback set status = 'resolved';
    raise exception 'Direct update allowed' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.feedback_reviewers(user_id) values(auth.uid());
    raise exception 'Support self-grant allowed' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  begin
    perform public.triage_tester_feedback((receipt->>'id')::uuid, now(), 'resolved', 'Forged support reply', 'Should fail');
    raise exception 'Unauthorised triage allowed' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  for i in 2..5 loop
    repeated := public.submit_tester_feedback(report || jsonb_build_object('requestId',gen_random_uuid(),'description','Synthetic distinct rollback-only report number ' || i,'screenshot',null));
  end loop;
  begin
    perform public.submit_tester_feedback(report || jsonb_build_object('requestId',gen_random_uuid(),'description','Synthetic rate-limited sixth rollback report.','screenshot',null));
    raise exception 'Rate limit not enforced' using errcode='XX000';
  exception when raise_exception then if sqlerrm <> 'FEEDBACK_RATE_LIMIT' then raise; end if; end;
  if public.delete_my_tester_feedback((repeated->>'id')::uuid) is distinct from true then raise exception 'Owner deletion failed' using errcode='XX000'; end if;
  begin
    perform public.submit_tester_feedback(report || jsonb_build_object('requestId',gen_random_uuid(),'description','Synthetic sixth report after deleting a report.','screenshot',null));
    raise exception 'Deletion reset rate limit' using errcode='XX000';
  exception when raise_exception then if sqlerrm <> 'FEEDBACK_RATE_LIMIT' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', current_setting('qa.feedback_foreign'), true);
do $$ begin
  if (select count(*) from public.tester_feedback) <> 0 or (select count(*) from public.tester_feedback_attachments) <> 0 then raise exception 'Foreign read allowed'; end if;
  if public.delete_my_tester_feedback(current_setting('qa.feedback_id')::uuid) then raise exception 'Foreign delete allowed'; end if;
end $$;
reset role;
insert into public.feedback_reviewers(user_id) values(current_setting('qa.feedback_support')::uuid);
select set_config('request.jwt.claim.sub', current_setting('qa.feedback_support'), true);
set local role authenticated;
do $$ declare row public.tester_feedback; begin
  if not public.is_feedback_reviewer() then raise exception 'Reviewer access failed'; end if;
  select * into row from public.tester_feedback where id = current_setting('qa.feedback_id')::uuid;
  perform public.triage_tester_feedback(row.id, row.updated_at, 'reviewing', 'Synthetic public support reply.', 'Synthetic private support note.');
  if (select count(*) from public.tester_feedback_events where feedback_id = row.id) <> 1 then raise exception 'Support audit missing'; end if;
  begin
    perform public.triage_tester_feedback(row.id, row.updated_at, 'resolved', 'Stale update', 'Stale note');
    raise exception 'Concurrent overwrite allowed' using errcode='XX000';
  exception when raise_exception then if sqlerrm <> 'FEEDBACK_CONFLICT' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub', current_setting('qa.feedback_owner'), true);
do $$ begin
  if (select response from public.tester_feedback where id = current_setting('qa.feedback_id')::uuid) <> 'Synthetic public support reply.' then raise exception 'Owner reply missing'; end if;
  if (select count(*) from public.tester_feedback_events) <> 0 then raise exception 'Internal support notes leaked'; end if;
end $$;
reset role;
-- Exercise daily limit and server-side redaction with an account without existing slots.
insert into public.feedback_submission_slots(owner_id, request_id, created_at)
select current_setting('qa.feedback_foreign')::uuid, gen_random_uuid(), now() - interval '2 hours' from generate_series(1,20);
select set_config('request.jwt.claim.sub', current_setting('qa.feedback_foreign'), true);
set local role authenticated;
do $$ begin
  begin
    perform public.submit_tester_feedback(jsonb_build_object('requestId',gen_random_uuid(),'category','problem','description','Synthetic report exceeding daily limit.','diagnostic',null,'screenshot',null,'consent',true));
    raise exception 'Daily rate limit not enforced' using errcode='XX000';
  exception when raise_exception then if sqlerrm <> 'FEEDBACK_RATE_LIMIT' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('qa.feedback_support'), true);
set local role authenticated;
do $$ declare receipt jsonb; body text; begin
  receipt := public.submit_tester_feedback(jsonb_build_object('requestId',gen_random_uuid(),'category','problem','description','Synthetic redaction test: api_key="private secret" Bearer token-placeholder tester@example.invalid https://example.invalid/private?token=private AIza' || repeat('T',35),'diagnostic',null,'screenshot',null,'consent',true));
  select description into body from public.tester_feedback where id = (receipt->>'id')::uuid;
  if body ~ '(private secret|token-placeholder|tester@|https://|AIza)' then raise exception 'Server redaction failed'; end if;
end $$;
reset role;
update public.tester_feedback set expires_at = now() - interval '1 second' where id = current_setting('qa.feedback_id')::uuid;
select set_config('request.jwt.claim.sub', current_setting('qa.feedback_owner'), true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.tester_feedback where id = current_setting('qa.feedback_id')::uuid) or (select count(*) from public.tester_feedback_attachments) <> 0 then raise exception 'Expired report still visible'; end if;
  begin
    perform public.purge_expired_tester_feedback(); raise exception 'Owner can run service cleanup' using errcode='XX000';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin perform 1 from public.tester_feedback; raise exception 'Anonymous read allowed' using errcode='XX000'; exception when insufficient_privilege then null; end;
  begin perform public.submit_tester_feedback('{}'); raise exception 'Anonymous submit allowed' using errcode='XX000'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if public.purge_expired_tester_feedback() <> 1 then raise exception 'Expiry purge failed'; end if;
  if exists(select 1 from public.tester_feedback_attachments where feedback_id = current_setting('qa.feedback_id')::uuid) or exists(select 1 from public.tester_feedback_events where feedback_id = current_setting('qa.feedback_id')::uuid) then raise exception 'Attachment/audit cleanup failed'; end if;
end $$;
select 'PASS: consent, diagnostic allowlist, redaction, private PNG, limits, idempotency, account isolation, support-only triage, optimistic updates, note privacy, expiry, cascading deletion and anonymous denial. All synthetic changes must roll back.' as feedback_qa;
