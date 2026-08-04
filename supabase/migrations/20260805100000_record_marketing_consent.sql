-- 가입 폼의 "(선택) 마케팅 정보 수신 동의" 체크박스가 어디에도 저장되지 않았다.
-- 동의를 받고도 기록이 없으면 누구에게 발송해도 되는지 알 수 없고, 동의 기록
-- 보관 의무도 지킬 수 없다. 동의 여부와 시각을 프로필에 남긴다.

alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default false;
alter table public.profiles
  add column if not exists marketing_opt_in_at timestamptz;

-- 전화번호 인증이 끝나면 트리거가 메타데이터로 프로필을 만든다. 가입 시 체크한
-- 동의 여부도 메타데이터로 전달받아 함께 기록한다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_role public.user_role;
  signup_marketing boolean;
begin
  if new.phone is not null and new.phone_confirmed_at is null then
    return new;
  end if;

  signup_role := case
    when new.raw_user_meta_data ->> 'role' = 'business' then 'business'::public.user_role
    else 'creator'::public.user_role
  end;

  signup_marketing := coalesce(new.raw_user_meta_data ->> 'marketing_opt_in', 'false') = 'true';

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
    status,
    marketing_opt_in,
    marketing_opt_in_at
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
    'active',
    signup_marketing,
    case when signup_marketing then now() else null end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    nickname = excluded.nickname,
    name = excluded.name,
    phone = nullif(excluded.phone, ''),
    business_registration_number = excluded.business_registration_number,
    referral_code = excluded.referral_code,
    marketing_opt_in = excluded.marketing_opt_in,
    marketing_opt_in_at = excluded.marketing_opt_in_at,
    updated_at = now();

  return new;
end;
$$;
