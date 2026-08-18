-- 전화 가입은 auth.users insert 시점에는 아직 phone_confirmed_at이 없어
-- handle_new_user()가 프로필 생성을 미룬다. 인증 완료 update도 같은 함수를
-- 실행해야 앱 코드와 무관하게 profiles가 반드시 만들어진다.
drop trigger if exists on_auth_user_phone_confirmed on auth.users;

create trigger on_auth_user_phone_confirmed
after update of phone_confirmed_at on auth.users
for each row
when (old.phone_confirmed_at is null and new.phone_confirmed_at is not null)
execute function public.handle_new_user();

-- 트리거 추가 전에 전화 인증을 마쳤지만 profiles가 만들어지지 않은 계정을 복구한다.
insert into public.profiles (
  id, email, role, nickname, name, phone,
  business_registration_number, referral_code,
  verification_status, status, is_admin,
  marketing_opt_in, marketing_opt_in_at,
  age_14_plus_confirmed_at
)
select
  users.id,
  coalesce(nullif(users.raw_user_meta_data ->> 'email', ''), users.email),
  (users.raw_user_meta_data ->> 'role')::public.user_role,
  nullif(btrim(users.raw_user_meta_data ->> 'nickname'), ''),
  nullif(btrim(users.raw_user_meta_data ->> 'name'), ''),
  nullif(regexp_replace(coalesce(users.raw_user_meta_data ->> 'phone', users.phone, ''), '[^0-9]', '', 'g'), ''),
  nullif(users.raw_user_meta_data ->> 'business_registration_number', ''),
  nullif(users.raw_user_meta_data ->> 'referral_code', ''),
  case
    when users.raw_user_meta_data ->> 'role' = 'resident' then 'verified'::public.verification_status
    else 'pending'::public.verification_status
  end,
  'active',
  false,
  coalesce(users.raw_user_meta_data ->> 'marketing_opt_in', 'false') = 'true',
  case
    when coalesce(users.raw_user_meta_data ->> 'marketing_opt_in', 'false') = 'true' then now()
    else null
  end,
  case
    when coalesce(users.raw_user_meta_data ->> 'age_14_plus_confirmed', 'false') = 'true' then now()
    else null
  end
from auth.users as users
where users.phone_confirmed_at is not null
  and users.raw_user_meta_data ->> 'role' in ('resident', 'creator', 'business')
  and not exists (
    select 1 from public.profiles where profiles.id = users.id
  )
on conflict (id) do nothing;

insert into public.legal_acceptances (user_id, document_type, document_version, source)
select users.id, documents.document_type, documents.version, 'signup'
from auth.users as users
join public.profiles on profiles.id = users.id
join public.legal_documents as documents
  on documents.is_current
  and (
    (documents.document_type = 'terms' and documents.version = users.raw_user_meta_data ->> 'terms_version')
    or
    (documents.document_type = 'privacy' and documents.version = users.raw_user_meta_data ->> 'privacy_version')
  )
where users.phone_confirmed_at is not null
  and users.raw_user_meta_data ->> 'role' in ('resident', 'creator', 'business')
on conflict (user_id, document_type, document_version) do nothing;
