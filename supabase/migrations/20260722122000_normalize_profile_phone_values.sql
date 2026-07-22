update public.profiles
set phone = regexp_replace(phone, '[^0-9]', '', 'g')
where phone is not null
  and phone <> regexp_replace(phone, '[^0-9]', '', 'g');

create or replace function public.is_signup_phone_available(target_phone text)
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
      where regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(target_phone, '[^0-9]', '', 'g')
    );
$$;

grant execute on function public.is_signup_phone_available(text) to anon, authenticated;
