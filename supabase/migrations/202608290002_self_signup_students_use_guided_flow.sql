update public.profiles profile
set role = 'free',
    updated_at = now()
where profile.role = 'school-student'
  and not exists (
    select 1
    from public.school_memberships membership
    where membership.user_id = profile.id
  );
