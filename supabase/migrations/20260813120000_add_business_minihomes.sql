alter table public.business_profiles
add column if not exists slug text;
alter table public.business_profiles
drop constraint if exists business_profiles_slug_format_check;
alter table public.business_profiles
add constraint business_profiles_slug_format_check check (
  slug is null
  or (
    slug = lower(slug)
    and char_length(slug) between 3 and 40
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and slug not in (
      'account', 'admin', 'api', 'auth', 'brand', 'business', 'campaigns', 'creator',
      'guide', 'marketing', 'notices', 'notifications', 'optout', 'privacy', 'stories', 'terms'
    )
  )
);
create unique index if not exists business_profiles_slug_lower_unique
on public.business_profiles (lower(slug))
where slug is not null;
create or replace function public.is_business_slug_available(target_slug text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1
    from public.business_profiles
    where lower(slug) = lower(trim(target_slug))
      and user_id <> auth.uid()
  );
$$;
revoke all on function public.is_business_slug_available(text) from public;
grant execute on function public.is_business_slug_available(text) to authenticated;
