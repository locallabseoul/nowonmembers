create unique index if not exists profiles_email_normalized_unique
on public.profiles (lower(btrim(email)))
where email is not null
  and btrim(email) <> '';

create unique index if not exists profiles_nickname_normalized_unique
on public.profiles (lower(btrim(nickname)))
where nickname is not null
  and btrim(nickname) <> '';

create or replace function public.is_signup_email_available(target_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    coalesce(length(btrim(target_email)), 0) > 0
    and not exists (
      select 1
      from public.profiles
      where lower(btrim(email)) = lower(btrim(target_email))
    );
$$;

create or replace function public.is_signup_nickname_available(target_nickname text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    coalesce(length(btrim(target_nickname)), 0) >= 2
    and not exists (
      select 1
      from public.profiles
      where lower(btrim(nickname)) = lower(btrim(target_nickname))
    );
$$;

grant execute on function public.is_signup_email_available(text) to anon, authenticated;
grant execute on function public.is_signup_nickname_available(text) to anon, authenticated;
