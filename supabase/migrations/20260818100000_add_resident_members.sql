-- 주민 회원, 버전별 법적 동의, 주민의 1회 역할 전환을 활성화한다.
-- user_role enum에는 resident가 최초 스키마부터 존재하므로 enum 변경은 필요 없다.

alter table public.profiles
add column if not exists age_14_plus_confirmed_at timestamptz;

create table public.legal_documents (
  document_type text not null check (document_type in ('terms', 'privacy')),
  version text not null,
  effective_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (document_type, version)
);

create unique index legal_documents_one_current_per_type
on public.legal_documents (document_type)
where is_current;

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null,
  document_version text not null,
  source text not null check (source in ('signup', 'coupon_claim')),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, document_type, document_version),
  foreign key (document_type, document_version)
    references public.legal_documents(document_type, version)
);

create index legal_acceptances_user_idx
on public.legal_acceptances (user_id, document_type, accepted_at desc);

alter table public.legal_documents enable row level security;
alter table public.legal_acceptances enable row level security;

create policy "public reads legal documents" on public.legal_documents
for select using (true);

create policy "members read own legal acceptances" on public.legal_acceptances
for select to authenticated using (user_id = auth.uid() or public.is_admin());

insert into public.legal_documents (document_type, version, effective_date, is_current)
values
  ('terms', '2026-08-18-v2', '2026-08-18', true),
  ('privacy', '2026-08-18-v2', '2026-08-18', true)
on conflict (document_type, version) do update
set effective_date = excluded.effective_date,
    is_current = excluded.is_current;

create or replace function public.accept_legal_document(
  target_document_type text,
  target_version text,
  acceptance_source text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if acceptance_source not in ('signup', 'coupon_claim') then
    raise exception '동의 경로가 올바르지 않습니다.';
  end if;

  if not exists (
    select 1 from public.legal_documents
    where document_type = target_document_type
      and version = target_version
      and is_current
  ) then
    raise exception '현재 적용 중인 약관이 아닙니다.';
  end if;

  insert into public.legal_acceptances (
    user_id, document_type, document_version, source
  )
  values (
    auth.uid(), target_document_type, target_version, acceptance_source
  )
  on conflict (user_id, document_type, document_version) do nothing;
end;
$$;

create or replace function public.has_accepted_current_legal_document(
  target_document_type text
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.legal_documents document
    join public.legal_acceptances acceptance
      on acceptance.document_type = document.document_type
      and acceptance.document_version = document.version
    where document.document_type = target_document_type
      and document.is_current
      and acceptance.user_id = auth.uid()
  );
$$;

revoke all on function public.accept_legal_document(text, text, text) from public;
revoke all on function public.has_accepted_current_legal_document(text) from public;
grant execute on function public.accept_legal_document(text, text, text) to authenticated;
grant execute on function public.has_accepted_current_legal_document(text) to authenticated;

-- 전화번호 인증 완료 시 주민 역할과 법적 동의를 함께 확정한다.
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

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles
for insert with check (
  id = auth.uid()
  and role in ('business', 'creator', 'resident')
  and verification_status = case
    when role = 'resident' then 'verified'::public.verification_status
    else 'pending'::public.verification_status
  end
  and status = 'active'
  and is_admin = false
);

-- 역할 전환 RPC만 본인의 role/verification_status를 한 트랜잭션에서 바꿀 수 있다.
-- 일반 update와 다른 RPC에서는 기존 권한 필드 보호가 그대로 적용된다.
create or replace function public.prevent_profile_privilege_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resident_upgrade boolean := coalesce(current_setting('app.resident_role_upgrade', true), '') = 'true';
begin
  if auth.uid() = old.id and not public.is_admin() then
    if new.role is distinct from old.role and not (
      resident_upgrade
      and old.role = 'resident'
      and new.role in ('creator', 'business')
    ) then
      raise exception 'profiles.role cannot be changed by the account owner';
    end if;

    if new.status is distinct from old.status then
      raise exception 'profiles.status cannot be changed by the account owner';
    end if;

    if new.verification_status is distinct from old.verification_status and not resident_upgrade then
      raise exception 'profiles.verification_status cannot be changed by the account owner';
    end if;

    if new.is_admin is distinct from old.is_admin then
      raise exception 'profiles.is_admin cannot be changed by the account owner';
    end if;
  end if;

  return new;
end;
$$;

-- 주민은 최소 프로필을 완성한 뒤에만 한 번 역할을 전환할 수 있다.
create or replace function public.upgrade_resident_role(
  target_role text,
  target_business_name text default null,
  target_business_category text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
begin
  select * into current_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if not found or current_profile.status <> 'active' then
    raise exception '활성 회원만 역할을 전환할 수 있습니다.';
  end if;
  if current_profile.role <> 'resident' then
    raise exception '주민 회원만 직접 역할을 전환할 수 있습니다.';
  end if;
  if target_role not in ('creator', 'business') then
    raise exception '전환할 회원 유형이 올바르지 않습니다.';
  end if;

  if target_role = 'creator' then
    insert into public.creator_profiles (user_id)
    values (auth.uid())
    on conflict (user_id) do nothing;
  else
    if char_length(btrim(coalesce(target_business_name, ''))) < 2 then
      raise exception '상호를 2자 이상 입력해주세요.';
    end if;
    if btrim(coalesce(target_business_category, '')) = '' then
      raise exception '업종을 입력해주세요.';
    end if;

    insert into public.business_profiles (user_id, business_name, category)
    values (auth.uid(), btrim(target_business_name), btrim(target_business_category))
    on conflict (user_id) do update
    set business_name = excluded.business_name,
        category = excluded.category,
        updated_at = now();
  end if;

  perform set_config('app.resident_role_upgrade', 'true', true);

  update public.profiles
  set role = target_role::public.user_role,
      nickname = case when target_role = 'business' then btrim(target_business_name) else nickname end,
      verification_status = 'pending',
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.upgrade_resident_role(text, text, text) from public;
grant execute on function public.upgrade_resident_role(text, text, text) to authenticated;

-- 주민을 포함한 관리자 역할 변경. 역할 의존 이력이 있으면 변경을 막는다.
create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles%rowtype;
  creator_profile_id uuid;
  business_profile_id uuid;
begin
  if not public.is_admin() then
    raise exception '관리자만 회원 역할을 변경할 수 있습니다.';
  end if;
  if target_user_id = auth.uid() then
    raise exception '자기 자신의 역할은 변경할 수 없습니다.';
  end if;
  if new_role not in ('business', 'creator', 'resident') then
    raise exception '가게, 크리에이터 또는 주민으로만 변경할 수 있습니다.';
  end if;

  select * into target_profile from public.profiles
  where id = target_user_id for update;
  if not found then raise exception '회원을 찾을 수 없습니다.'; end if;
  if target_profile.role::text = new_role then return; end if;
  if target_profile.is_admin and new_role = 'resident' then
    raise exception '관리자 계정은 주민 역할로 변경할 수 없습니다.';
  end if;

  select id into creator_profile_id from public.creator_profiles where user_id = target_user_id;
  if target_profile.role = 'creator' and creator_profile_id is not null and exists (
    select 1 from public.campaign_applications where creator_id = creator_profile_id
    union all
    select 1 from public.collaborations where creator_id = creator_profile_id
  ) then
    raise exception '캠페인 지원 또는 협업 이력이 있는 회원은 역할을 바꿀 수 없습니다.';
  end if;

  select id into business_profile_id from public.business_profiles where user_id = target_user_id;
  if target_profile.role = 'business' and business_profile_id is not null and (
    exists (select 1 from public.campaigns where business_id = business_profile_id)
    or exists (select 1 from public.coupons where business_id = business_profile_id)
    or exists (select 1 from public.point_payment_orders where business_id = business_profile_id)
    or exists (select 1 from public.point_ledger where business_id = business_profile_id)
  ) then
    raise exception '캠페인, 쿠폰 또는 포인트 이력이 있는 가게는 역할을 바꿀 수 없습니다.';
  end if;

  update public.profiles
  set role = new_role::public.user_role,
      verification_status = case when new_role = 'resident' then 'verified'::public.verification_status else 'pending'::public.verification_status end,
      updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- 최신 통합 이용약관에 동의한 활성 회원만 새 쿠폰을 발급받는다.
create or replace function public.claim_coupon(target_coupon_id uuid)
returns table (claim_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_coupon public.coupons%rowtype;
  created_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and status = 'active') then
    raise exception '활성 회원만 쿠폰을 받을 수 있습니다.';
  end if;
  if not public.has_accepted_current_legal_document('terms') then
    raise exception '최신 이용약관 동의가 필요합니다.' using errcode = 'P0001';
  end if;

  select * into target_coupon from public.coupons where id = target_coupon_id for update;
  if not found or target_coupon.status <> 'approved' then raise exception '발급할 수 없는 쿠폰입니다.'; end if;
  if not target_coupon.redemption_code_configured or not exists (
    select 1 from public.coupon_redemption_secrets secret where secret.coupon_id = target_coupon.id
  ) then raise exception '가게에서 쿠폰 사용을 준비 중입니다.'; end if;
  if (now() at time zone 'Asia/Seoul')::date < target_coupon.start_date
    or (now() at time zone 'Asia/Seoul')::date > target_coupon.end_date then
    raise exception '쿠폰 사용 기간이 아닙니다.';
  end if;
  if target_coupon.claimed_quantity >= target_coupon.total_quantity then raise exception '쿠폰이 모두 소진되었습니다.'; end if;
  if exists (
    select 1 from public.coupon_claims
    where coupon_id = target_coupon_id and user_id = auth.uid() and status in ('issued', 'redeemed')
  ) then raise exception '이미 받은 쿠폰입니다.'; end if;

  insert into public.coupon_claims (coupon_id, user_id)
  values (target_coupon_id, auth.uid())
  returning id into created_id;

  update public.coupons set claimed_quantity = claimed_quantity + 1, updated_at = now()
  where id = target_coupon_id;

  return query select created_id;
end;
$$;

revoke all on function public.claim_coupon(uuid) from public;
grant execute on function public.claim_coupon(uuid) to authenticated;
