create or replace function public.is_school_staff(target_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.school_memberships membership
    where membership.school_id = target_school_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin', 'teacher')
  );
$$;

drop policy if exists school_memberships_select_own_school on public.school_memberships;
create policy school_memberships_select_own_school on public.school_memberships
for select using (
  user_id = auth.uid()
  or public.is_school_staff(school_id)
);

drop policy if exists schools_select_members on public.schools;
create policy schools_select_members on public.schools
for select using (
  public.is_school_staff(id)
  or exists (
    select 1
    from public.school_memberships membership
    where membership.school_id = schools.id
      and membership.user_id = auth.uid()
  )
);

drop policy if exists projects_select_school_staff on public.projects;
create policy projects_select_school_staff on public.projects
for select using (public.is_school_staff(school_id));

drop policy if exists review_results_select_school_staff on public.review_results;
create policy review_results_select_school_staff on public.review_results
for select using (public.is_school_staff(school_id));

drop policy if exists assignments_staff_manage on public.assignments;
create policy assignments_staff_manage on public.assignments
for all using (public.is_school_staff(school_id))
with check (public.is_school_staff(school_id));

drop policy if exists subscriptions_select_own_or_school_staff on public.subscriptions;
create policy subscriptions_select_own_or_school_staff on public.subscriptions
for select using (
  user_id = auth.uid()
  or public.is_school_staff(school_id)
);
