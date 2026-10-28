-- Support access is provisioned by a database administrator, never profile/user metadata.
create table public.feedback_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.feedback_reviewers enable row level security;
revoke all on public.feedback_reviewers from public, anon, authenticated;

create function public.is_feedback_reviewer() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.feedback_reviewers where user_id = auth.uid());
$$;
revoke all on function public.is_feedback_reviewer() from public, anon;
grant execute on function public.is_feedback_reviewer() to authenticated;

create table public.tester_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  category text not null check (category in ('problem','output','usability','suggestion')),
  description text not null check (length(description) between 20 and 4000),
  diagnostic jsonb,
  content_hash bytea not null,
  status text not null default 'new' check (status in ('new','reviewing','needs_info','resolved')),
  response text not null default '' check (length(response) <= 4000),
  has_screenshot boolean not null default false,
  consent_version integer not null default 1 check (consent_version = 1),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default now() + interval '90 days',
  unique (owner_id, request_id)
);
create index tester_feedback_owner_created on public.tester_feedback(owner_id, created_at desc);
create index tester_feedback_created on public.tester_feedback(created_at desc);
create index tester_feedback_expiry on public.tester_feedback(expires_at);
-- Rate slots outlive report deletion; deleting reports must not reset the abuse limit.
create table public.feedback_submission_slots (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, request_id)
);
create index feedback_slots_owner_created on public.feedback_submission_slots(owner_id, created_at);
alter table public.feedback_submission_slots enable row level security;
revoke all on public.feedback_submission_slots from public, anon, authenticated;
create table public.tester_feedback_attachments (
  feedback_id uuid primary key references public.tester_feedback(id) on delete cascade,
  png_base64 text not null check (length(png_base64) <= 1398104)
);
create table public.tester_feedback_events (
  id bigint generated always as identity primary key,
  feedback_id uuid not null references public.tester_feedback(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('new','reviewing','needs_info','resolved')),
  note text not null check (length(note) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.tester_feedback enable row level security;
alter table public.tester_feedback_attachments enable row level security;
alter table public.tester_feedback_events enable row level security;
revoke all on public.tester_feedback, public.tester_feedback_attachments, public.tester_feedback_events from public, anon, authenticated;
grant select on public.tester_feedback, public.tester_feedback_attachments, public.tester_feedback_events to authenticated;
create policy feedback_read on public.tester_feedback for select to authenticated
  using (expires_at > now() and (owner_id = auth.uid() or public.is_feedback_reviewer()));
create policy feedback_attachment_read on public.tester_feedback_attachments for select to authenticated
  using (exists (select 1 from public.tester_feedback f where f.id = feedback_id));
create policy feedback_events_read on public.tester_feedback_events for select to authenticated
  using (public.is_feedback_reviewer() and exists (select 1 from public.tester_feedback f where f.id = feedback_id));

create function public.submit_tester_feedback(p_report jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  account uuid := auth.uid(); request_uuid uuid; existing public.tester_feedback;
  body text; category_value text; diag jsonb; screenshot text; image bytea; fingerprint bytea; report_id uuid;
  w bigint; h bigint;
begin
  if account is null then raise exception 'FEEDBACK_FORBIDDEN' using errcode = '42501'; end if;
  if jsonb_typeof(p_report) is distinct from 'object' or octet_length(p_report::text) > 1420000 then
    raise exception 'FEEDBACK_INVALID';
  end if;
  if exists (select 1 from jsonb_object_keys(p_report) k where k not in ('requestId','category','description','diagnostic','screenshot','consent'))
    or p_report->'consent' is distinct from 'true'::jsonb
    or jsonb_typeof(p_report->'description') is distinct from 'string'
    or jsonb_typeof(p_report->'category') is distinct from 'string'
    or jsonb_typeof(p_report->'requestId') is distinct from 'string'
    or not (p_report ?& array['diagnostic','screenshot']) then raise exception 'FEEDBACK_INVALID'; end if;
  begin request_uuid := (p_report->>'requestId')::uuid;
  exception when invalid_text_representation then raise exception 'FEEDBACK_INVALID'; end;
  body := btrim(p_report->>'description'); category_value := p_report->>'category';
  if length(body) not between 20 and 4000 or category_value not in ('problem','output','usability','suggestion') then raise exception 'FEEDBACK_INVALID'; end if;
  -- Defence in depth for common credential formats; arbitrary prose still requires the sender's review.
  body := regexp_replace(body, '(AIza[A-Za-z0-9_-]{20,}|AQ\.[A-Za-z0-9._-]{20,}|sk-[A-Za-z0-9_-]{16,}|sb_(secret|publishable)_[A-Za-z0-9_-]+)', '[key removed]', 'g');
  body := regexp_replace(body, 'eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}', '[token removed]', 'g');
  body := regexp_replace(body, '(api[_ -]?key|password|access[_ -]?token|refresh[_ -]?token|authorization)[[:space:]]*[:=][[:space:]]*("[^"\n]*"|''[^''\n]*''|[^[:space:],;]+)', '\1: [secret removed]', 'gi');
  body := regexp_replace(body, 'Bearer[[:space:]]+[^[:space:],;]+', '[token removed]', 'gi');
  body := regexp_replace(body, 'https?://[^[:space:]<>"'']+', '[link removed]', 'gi');
  body := regexp_replace(body, '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}', '[email removed]', 'gi');
  body := regexp_replace(body, '[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}', '[identifier removed]', 'gi');
  body := regexp_replace(body, '[A-Z]:\\[^\n]+', '[local path removed]', 'gi');
  if length(body) not between 20 and 4000 then raise exception 'FEEDBACK_INVALID'; end if;
  diag := nullif(p_report->'diagnostic', 'null'::jsonb);
  if diag is not null then
    if jsonb_typeof(diag) <> 'object' then raise exception 'FEEDBACK_INVALID'; end if;
    if (select count(*) from jsonb_object_keys(diag)) <> 6
      or exists (select 1 from jsonb_object_keys(diag) k where k not in ('tool','release','stage','errorCode','browser','device'))
      or exists (select 1 from jsonb_each(diag) v where jsonb_typeof(v.value) <> 'string')
      or not (diag ?& array['tool','release','stage','errorCode','browser','device'])
      or (diag->>'tool') not in ('dashboard','defence-slides','document-analysis','plagiarism-checker','content-improvement','humanizer','research-topic-generator','chapter-work','projects','student-workspace','school-dashboard','supervisor-workspace','settings','getting-started','other')
      or (diag->>'release') !~ '^20[0-9]{2}\.[0-9]{2}\.[0-9]{2}-feedback\.[0-9]{1,3}$'
      or (diag->>'stage') not in ('general','upload','sources','focus','methods','checks','generate','save','export')
      or (diag->>'errorCode') not in ('none','authentication','rate-limit','provider-unavailable','invalid-response','storage-unavailable','extraction-failed','export-failed','unknown')
      or (diag->>'browser') not in ('Chrome','Edge','Firefox','Safari','Other')
      or (diag->>'device') not in ('mobile','tablet','desktop') then raise exception 'FEEDBACK_INVALID'; end if;
  end if;
  if jsonb_typeof(p_report->'screenshot') not in ('string','null') then raise exception 'FEEDBACK_INVALID'; end if;
  screenshot := p_report->>'screenshot';
  if screenshot is not null then
    if length(screenshot) > 1398104 or screenshot !~ '^[A-Za-z0-9+/]+={0,2}$' then raise exception 'FEEDBACK_INVALID'; end if;
    begin image := decode(screenshot, 'base64'); exception when others then raise exception 'FEEDBACK_INVALID'; end;
    if octet_length(image) not between 45 and 1048576
      or substring(image from 1 for 8) <> decode('89504e470d0a1a0a','hex')
      or substring(image from 9 for 8) <> decode('0000000d49484452','hex')
      or substring(image from octet_length(image)-11 for 12) <> decode('0000000049454e44ae426082','hex') then raise exception 'FEEDBACK_INVALID'; end if;
    w := get_byte(image,16)::bigint*16777216 + get_byte(image,17)*65536 + get_byte(image,18)*256 + get_byte(image,19);
    h := get_byte(image,20)::bigint*16777216 + get_byte(image,21)*65536 + get_byte(image,22)*256 + get_byte(image,23);
    if w not between 1 and 1600 or h not between 1 and 1600 then raise exception 'FEEDBACK_INVALID'; end if;
  end if;
  fingerprint := sha256(convert_to(jsonb_build_array(category_value, body, diag, coalesce(encode(sha256(image),'hex'),''))::text, 'UTF8'));
  -- Serialise per-account checks so concurrent tabs cannot bypass the submission limit.
  perform pg_advisory_xact_lock(hashtextextended(account::text, 280010));
  select * into existing from public.tester_feedback where owner_id = account and request_id = request_uuid;
  if found then
    if existing.content_hash <> fingerprint then raise exception 'FEEDBACK_CONFLICT'; end if;
    return jsonb_build_object('id', existing.id, 'createdAt', existing.created_at, 'duplicate', true);
  end if;
  select * into existing from public.tester_feedback where owner_id = account and content_hash = fingerprint
    and created_at > now() - interval '10 minutes' order by created_at desc limit 1;
  if found then return jsonb_build_object('id', existing.id, 'createdAt', existing.created_at, 'duplicate', true); end if;
  if exists (select 1 from public.feedback_submission_slots where owner_id = account and request_id = request_uuid) then raise exception 'FEEDBACK_CONFLICT'; end if;
  if (select count(*) from public.feedback_submission_slots where owner_id = account and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from public.feedback_submission_slots where owner_id = account and created_at > now() - interval '24 hours') >= 20
    then raise exception 'FEEDBACK_RATE_LIMIT'; end if;
  insert into public.feedback_submission_slots(owner_id, request_id) values (account, request_uuid);
  insert into public.tester_feedback(owner_id, request_id, category, description, diagnostic, content_hash, has_screenshot)
    values(account, request_uuid, category_value, body, diag, fingerprint, screenshot is not null) returning id into report_id;
  if screenshot is not null then insert into public.tester_feedback_attachments values(report_id, screenshot); end if;
  return jsonb_build_object('id', report_id, 'createdAt', now(), 'duplicate', false);
end;
$$;
revoke all on function public.submit_tester_feedback(jsonb) from public, anon;
grant execute on function public.submit_tester_feedback(jsonb) to authenticated;

create function public.triage_tester_feedback(p_id uuid, p_expected_updated_at timestamptz, p_status text, p_response text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_feedback_reviewer() then raise exception 'FEEDBACK_FORBIDDEN' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('new','reviewing','needs_info','resolved') or p_note is null or length(btrim(p_note)) not between 1 and 4000 or p_response is null or length(p_response) > 4000 then raise exception 'FEEDBACK_INVALID'; end if;
  update public.tester_feedback set status = p_status, response = p_response, updated_at = clock_timestamp()
    where id = p_id and updated_at = p_expected_updated_at and expires_at > now();
  if not found then raise exception 'FEEDBACK_CONFLICT'; end if;
  insert into public.tester_feedback_events(feedback_id, actor_id, status, note) values (p_id, auth.uid(), p_status, btrim(p_note));
end;
$$;
revoke all on function public.triage_tester_feedback(uuid,timestamptz,text,text,text) from public, anon;
grant execute on function public.triage_tester_feedback(uuid,timestamptz,text,text,text) to authenticated;

create function public.delete_my_tester_feedback(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.tester_feedback where id = p_id and owner_id = auth.uid();
  return found;
end;
$$;
revoke all on function public.delete_my_tester_feedback(uuid) from public, anon;
grant execute on function public.delete_my_tester_feedback(uuid) to authenticated;

create function public.purge_expired_tester_feedback() returns bigint
language plpgsql security definer set search_path = '' as $$
declare affected bigint;
begin
  delete from public.tester_feedback where expires_at <= now();
  get diagnostics affected = row_count;
  delete from public.feedback_submission_slots where created_at < now() - interval '24 hours';
  return affected;
end;
$$;
revoke all on function public.purge_expired_tester_feedback() from public, anon, authenticated;
grant execute on function public.purge_expired_tester_feedback() to service_role;
