alter table public.profiles
add column if not exists business_registration_number text;

alter table public.profiles
add column if not exists referral_code text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_role public.user_role;
begin
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
    new.email,
    signup_role,
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'business_registration_number',
    new.raw_user_meta_data ->> 'referral_code',
    'pending',
    'active'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = excluded.role,
    nickname = excluded.nickname,
    name = excluded.name,
    phone = excluded.phone,
    business_registration_number = excluded.business_registration_number,
    referral_code = excluded.referral_code,
    updated_at = now();

  return new;
end;
$$;
