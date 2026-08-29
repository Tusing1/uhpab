create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  location text,
  category text,
  subscription_tier text not null default 'basic' check (subscription_tier in ('basic', 'standard', 'enterprise')),
  student_limit integer not null default 50 check (student_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'free' check (role in ('free', 'premium', 'school-admin', 'school-student')),
  htin text,
  class_name text,
  research_topic text,
  school_id uuid references public.schools(id) on delete set null,
  school_name text,
  school_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'teacher', 'student')),
  cohort text,
  created_at timestamptz not null default now(),
  unique (school_id, user_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  plan text not null,
  status text not null default 'inactive' check (status in ('active', 'trialing', 'past_due', 'inactive', 'cancelled')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((user_id is not null) or (school_id is not null))
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  title text not null,
  type text not null check (type in ('proposal', 'report')),
  progress jsonb not null default '{}'::jsonb,
  chapters jsonb not null default '{}'::jsonb,
  preliminary_pages jsonb,
  imported_from jsonb,
  plagiarism_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  file_name text not null,
  file_type text,
  file_size bigint,
  page_count integer,
  storage_path text not null,
  sha256 text,
  engine_version text,
  created_at timestamptz not null default now()
);

create table if not exists public.review_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  document_asset_id uuid references public.document_assets(id) on delete set null,
  tool text not null check (tool in ('document-analysis', 'plagiarism-checker', 'content-improvement', 'humanizer')),
  engine_version text not null,
  file_name text,
  page_count integer,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cohort text,
  due_date date,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  review_result_id uuid references public.review_results(id) on delete set null,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'reviewed', 'returned')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    role,
    htin,
    class_name,
    research_topic,
    school_name,
    school_location
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'free'),
    new.raw_user_meta_data->>'htin',
    coalesce(new.raw_user_meta_data->>'className', new.raw_user_meta_data->>'class_name'),
    coalesce(new.raw_user_meta_data->>'researchTopic', new.raw_user_meta_data->>'research_topic'),
    coalesce(new.raw_user_meta_data->>'schoolName', new.raw_user_meta_data->>'school_name'),
    coalesce(new.raw_user_meta_data->>'schoolLocation', new.raw_user_meta_data->>'school_location')
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    htin = excluded.htin,
    class_name = excluded.class_name,
    research_topic = excluded.research_topic,
    school_name = excluded.school_name,
    school_location = excluded.school_location,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists touch_schools_updated_at on public.schools;
create trigger touch_schools_updated_at before update on public.schools
for each row execute function public.touch_updated_at();

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_projects_updated_at on public.projects;
create trigger touch_projects_updated_at before update on public.projects
for each row execute function public.touch_updated_at();

drop trigger if exists touch_assignments_updated_at on public.assignments;
create trigger touch_assignments_updated_at before update on public.assignments
for each row execute function public.touch_updated_at();

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.school_memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.document_assets enable row level security;
alter table public.review_results enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists schools_select_members on public.schools;
create policy schools_select_members on public.schools
for select using (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id = schools.id and sm.user_id = auth.uid()
  )
);

drop policy if exists school_memberships_select_own_school on public.school_memberships;
create policy school_memberships_select_own_school on public.school_memberships
for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.school_memberships sm
    where sm.school_id = school_memberships.school_id
      and sm.user_id = auth.uid()
      and sm.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists projects_crud_own on public.projects;
create policy projects_crud_own on public.projects
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists projects_select_school_staff on public.projects;
create policy projects_select_school_staff on public.projects
for select using (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id = projects.school_id
      and sm.user_id = auth.uid()
      and sm.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists document_assets_crud_own on public.document_assets;
create policy document_assets_crud_own on public.document_assets
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists review_results_crud_own on public.review_results;
create policy review_results_crud_own on public.review_results
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists review_results_select_school_staff on public.review_results;
create policy review_results_select_school_staff on public.review_results
for select using (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id = review_results.school_id
      and sm.user_id = auth.uid()
      and sm.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists assignments_staff_manage on public.assignments;
create policy assignments_staff_manage on public.assignments
for all using (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id = assignments.school_id
      and sm.user_id = auth.uid()
      and sm.role in ('owner', 'admin', 'teacher')
  )
) with check (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id = assignments.school_id
      and sm.user_id = auth.uid()
      and sm.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists submissions_select_participants on public.submissions;
create policy submissions_select_participants on public.submissions
for select using (
  student_id = auth.uid()
  or exists (
    select 1 from public.assignments a
    join public.school_memberships sm on sm.school_id = a.school_id
    where a.id = submissions.assignment_id
      and sm.user_id = auth.uid()
      and sm.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists submissions_insert_own on public.submissions;
create policy submissions_insert_own on public.submissions
for insert with check (student_id = auth.uid());

drop policy if exists subscriptions_select_own_or_school_staff on public.subscriptions;
create policy subscriptions_select_own_or_school_staff on public.subscriptions
for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.school_memberships sm
    where sm.school_id = subscriptions.school_id
      and sm.user_id = auth.uid()
      and sm.role in ('owner', 'admin')
  )
);
