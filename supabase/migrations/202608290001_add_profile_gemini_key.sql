alter table public.profiles
add column if not exists gemini_api_key text;

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
    school_location,
    gemini_api_key
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
    coalesce(new.raw_user_meta_data->>'schoolLocation', new.raw_user_meta_data->>'school_location'),
    nullif(coalesce(new.raw_user_meta_data->>'geminiApiKey', new.raw_user_meta_data->>'gemini_api_key'), '')
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
    gemini_api_key = coalesce(excluded.gemini_api_key, public.profiles.gemini_api_key),
    updated_at = now();

  return new;
end;
$$;
