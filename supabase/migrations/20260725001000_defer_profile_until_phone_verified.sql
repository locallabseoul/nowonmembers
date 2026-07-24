create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_role public.user_role;
begin
  if new.phone is not null and new.phone_confirmed_at is null then
    return new;
  end if;

  signup_role := case
    when new.raw_user_meta_data ->> 'role' = 'business' then 'business'::public.user_role
    else 'creator'::public.user_role
  end;

  insert into public.profiles (
    id,
    email,
    role,
    nickname,
    name,
    phone,
    business_registration_number,
    referral_code,
    verification_status,
    status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'email', new.email),
    signup_role,
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'name',
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', new.phone, ''), '[^0-9]', '', 'g'), ''),
    new.raw_user_meta_data ->> 'business_registration_number',
    new.raw_user_meta_data ->> 'referral_code',
    'pending',
    'active'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    nickname = excluded.nickname,
    name = excluded.name,
    phone = nullif(excluded.phone, ''),
    business_registration_number = excluded.business_registration_number,
    referral_code = excluded.referral_code,
    updated_at = now();

  return new;
end;
$$;
