-- 과거 트리거는 알 수 없는 가입 역할을 크리에이터로 보정했다.
-- 새 역할 추가 이후에는 잘못된 메타데이터를 조용히 다른 역할로 만들지 않고 거절한다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_role public.user_role;
  signup_marketing boolean;
  age_confirmed boolean;
  terms_version text;
  privacy_version text;
begin
  if new.phone is not null and new.phone_confirmed_at is null then
    return new;
  end if;

  if new.raw_user_meta_data ->> 'role' = 'business' then
    signup_role := 'business'::public.user_role;
  elsif new.raw_user_meta_data ->> 'role' = 'creator' then
    signup_role := 'creator'::public.user_role;
  elsif new.raw_user_meta_data ->> 'role' = 'resident' then
    signup_role := 'resident'::public.user_role;
  else
    raise exception '회원 유형이 올바르지 않습니다.';
  end if;

  signup_marketing := coalesce(new.raw_user_meta_data ->> 'marketing_opt_in', 'false') = 'true';
  age_confirmed := coalesce(new.raw_user_meta_data ->> 'age_14_plus_confirmed', 'false') = 'true';
  terms_version := nullif(new.raw_user_meta_data ->> 'terms_version', '');
  privacy_version := nullif(new.raw_user_meta_data ->> 'privacy_version', '');

  insert into public.profiles (
    id, email, role, nickname, name, phone,
    business_registration_number, referral_code,
    verification_status, status,
    marketing_opt_in, marketing_opt_in_at,
    age_14_plus_confirmed_at
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
    case when signup_role = 'resident' then 'verified'::public.verification_status else 'pending'::public.verification_status end,
    'active',
    signup_marketing,
    case when signup_marketing then now() else null end,
    case when age_confirmed then now() else null end
  )
  on conflict (id) do update
  set email = excluded.email,
      nickname = excluded.nickname,
      name = excluded.name,
      phone = nullif(excluded.phone, ''),
      business_registration_number = excluded.business_registration_number,
      referral_code = excluded.referral_code,
      marketing_opt_in = excluded.marketing_opt_in,
      marketing_opt_in_at = excluded.marketing_opt_in_at,
      age_14_plus_confirmed_at = coalesce(profiles.age_14_plus_confirmed_at, excluded.age_14_plus_confirmed_at),
      updated_at = now();

  if terms_version is not null and exists (
    select 1 from public.legal_documents
    where document_type = 'terms' and version = terms_version and is_current
  ) then
    insert into public.legal_acceptances (user_id, document_type, document_version, source)
    values (new.id, 'terms', terms_version, 'signup')
    on conflict (user_id, document_type, document_version) do nothing;
  end if;

  if privacy_version is not null and exists (
    select 1 from public.legal_documents
    where document_type = 'privacy' and version = privacy_version and is_current
  ) then
    insert into public.legal_acceptances (user_id, document_type, document_version, source)
    values (new.id, 'privacy', privacy_version, 'signup')
    on conflict (user_id, document_type, document_version) do nothing;
  end if;

  return new;
end;
$$;
