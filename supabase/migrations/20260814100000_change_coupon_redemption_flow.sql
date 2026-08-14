alter table public.coupons
add column redemption_code_configured boolean not null default false;

create table public.coupon_redemption_secrets (
  coupon_id uuid primary key references public.coupons(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coupon_redemption_secrets enable row level security;

create or replace function public.protect_coupon_code_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.redemption_code_configured then
    raise exception '사용 코드는 전용 설정 기능으로 등록해주세요.';
  end if;
  if tg_op = 'UPDATE'
    and new.redemption_code_configured is distinct from old.redemption_code_configured
    and new.redemption_code_configured is distinct from exists (
      select 1 from public.coupon_redemption_secrets secret where secret.coupon_id = new.id
    ) then
    raise exception '사용 코드 설정 상태를 직접 변경할 수 없습니다.';
  end if;
  return new;
end;
$$;

create trigger protect_coupon_code_state
before insert or update of redemption_code_configured on public.coupons
for each row execute function public.protect_coupon_code_state();

alter table public.coupon_claims
add column failed_redemption_attempts integer not null default 0 check (failed_redemption_attempts between 0 and 5),
add column redemption_locked_until timestamptz;

create or replace function public.require_coupon_code_before_review()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('in_review', 'approved')
    and new.status is distinct from old.status
    and not new.redemption_code_configured then
    raise exception '검수 요청 전에 사용 코드를 설정해주세요.';
  end if;
  return new;
end;
$$;

create trigger require_coupon_code_before_review
before update of status on public.coupons
for each row execute function public.require_coupon_code_before_review();

drop function if exists public.lookup_coupon_claim(text);
drop function if exists public.redeem_coupon_claim(uuid);
drop function if exists public.claim_coupon(uuid);

alter table public.coupon_claims drop column redemption_code;

create or replace function public.set_coupon_redemption_code(
  target_coupon_id uuid,
  target_code text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_code text := trim(target_code);
begin
  if not public.current_user_has_role('business'::public.user_role) then
    raise exception '활성 가게 계정만 사용 코드를 설정할 수 있습니다.';
  end if;

  if normalized_code is null or normalized_code !~ '^[0-9]{6}$' then
    raise exception '사용 코드는 숫자 6자리로 입력해주세요.';
  end if;

  if not exists (
    select 1
    from public.coupons coupon
    join public.business_profiles business on business.id = coupon.business_id
    where coupon.id = target_coupon_id
      and business.user_id = auth.uid()
      and coupon.status <> 'cancelled'
  ) then
    raise exception '사용 코드를 설정할 수 없는 쿠폰입니다.';
  end if;

  insert into public.coupon_redemption_secrets (coupon_id, code_hash)
  values (target_coupon_id, extensions.crypt(normalized_code, extensions.gen_salt('bf', 10)))
  on conflict (coupon_id) do update
  set code_hash = excluded.code_hash, updated_at = now();

  update public.coupons
  set redemption_code_configured = true, updated_at = now()
  where id = target_coupon_id;

  update public.coupon_claims
  set failed_redemption_attempts = 0,
      redemption_locked_until = null,
      updated_at = now()
  where coupon_id = target_coupon_id and status = 'issued';
end;
$$;

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

  select * into target_coupon from public.coupons where id = target_coupon_id for update;
  if not found or target_coupon.status <> 'approved' then raise exception '발급할 수 없는 쿠폰입니다.'; end if;
  if not target_coupon.redemption_code_configured or not exists (
    select 1 from public.coupon_redemption_secrets secret where secret.coupon_id = target_coupon.id
  ) then raise exception '가게에서 쿠폰 사용을 준비 중입니다.'; end if;
  if (now() at time zone 'Asia/Seoul')::date < target_coupon.claim_start
    or (now() at time zone 'Asia/Seoul')::date > target_coupon.claim_end then
    raise exception '쿠폰 발급 기간이 아닙니다.';
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

create or replace function public.redeem_my_coupon_claim(
  target_claim_id uuid,
  target_code text
)
returns table (
  redeemed boolean,
  error_code text,
  locked_until timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_claim public.coupon_claims%rowtype;
  target_coupon public.coupons%rowtype;
  secret_hash text;
  next_attempts integer;
  next_locked_until timestamptz;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and status = 'active') then
    raise exception '활성 회원만 쿠폰을 사용할 수 있습니다.';
  end if;

  select * into target_claim
  from public.coupon_claims
  where id = target_claim_id and user_id = auth.uid()
  for update;

  if not found or target_claim.status <> 'issued' then
    raise exception '사용할 수 없는 쿠폰입니다.';
  end if;

  select * into target_coupon from public.coupons where id = target_claim.coupon_id;
  if target_coupon.status <> 'approved' then raise exception '사용할 수 없는 쿠폰입니다.'; end if;
  if not target_coupon.redemption_code_configured then
    return query select false, 'not_configured'::text, null::timestamptz;
    return;
  end if;
  if (now() at time zone 'Asia/Seoul')::date < target_coupon.use_start then
    raise exception '아직 쿠폰 사용 기간이 아닙니다.';
  end if;
  if (now() at time zone 'Asia/Seoul')::date > target_coupon.use_end then
    raise exception '쿠폰 사용 기간이 지났습니다.';
  end if;
  if target_claim.redemption_locked_until is not null and target_claim.redemption_locked_until > now() then
    return query select false, 'locked'::text, target_claim.redemption_locked_until;
    return;
  end if;

  select code_hash into secret_hash
  from public.coupon_redemption_secrets
  where coupon_id = target_coupon.id;

  if secret_hash is null then
    return query select false, 'not_configured'::text, null::timestamptz;
    return;
  end if;

  if target_code is null
    or trim(target_code) !~ '^[0-9]{6}$'
    or extensions.crypt(trim(target_code), secret_hash) <> secret_hash then
    next_attempts := case
      when target_claim.redemption_locked_until is not null and target_claim.redemption_locked_until <= now() then 1
      else least(target_claim.failed_redemption_attempts + 1, 5)
    end;
    next_locked_until := case when next_attempts >= 5 then now() + interval '10 minutes' else null end;

    update public.coupon_claims
    set failed_redemption_attempts = next_attempts,
        redemption_locked_until = next_locked_until,
        updated_at = now()
    where id = target_claim.id;

    return query select false, case when next_locked_until is null then 'invalid_code' else 'locked' end, next_locked_until;
    return;
  end if;

  update public.coupon_claims
  set status = 'redeemed',
      redeemed_at = now(),
      redeemed_by = auth.uid(),
      failed_redemption_attempts = 0,
      redemption_locked_until = null,
      updated_at = now()
  where id = target_claim.id;

  return query select true, null::text, null::timestamptz;
end;
$$;

revoke all on table public.coupon_redemption_secrets from public, anon, authenticated;
revoke all on function public.set_coupon_redemption_code(uuid, text) from public;
revoke all on function public.claim_coupon(uuid) from public;
revoke all on function public.redeem_my_coupon_claim(uuid, text) from public;
grant execute on function public.set_coupon_redemption_code(uuid, text) to authenticated;
grant execute on function public.claim_coupon(uuid) to authenticated;
grant execute on function public.redeem_my_coupon_claim(uuid, text) to authenticated;
