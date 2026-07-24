create or replace function public.is_profile_phone_available(target_phone text, current_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    length(regexp_replace(target_phone, '[^0-9]', '', 'g')) between 10 and 11
    and not exists (
      select 1
      from public.profiles
      where id <> current_user_id
        and regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(target_phone, '[^0-9]', '', 'g')
    );
$$;

create or replace function public.is_profile_nickname_available(target_nickname text, current_user_id uuid)
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
      where id <> current_user_id
        and lower(btrim(nickname)) = lower(btrim(target_nickname))
    );
$$;

grant execute on function public.is_profile_phone_available(text, uuid) to authenticated;
grant execute on function public.is_profile_nickname_available(text, uuid) to authenticated;
