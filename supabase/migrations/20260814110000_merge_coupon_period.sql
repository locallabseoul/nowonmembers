-- 발급 기간과 사용 기간을 하나의 운영 기간으로 합친다.
-- 가게가 날짜 네 개를 맞춰 넣어야 했던 부담을 없애고, 회원에게도 기간이 하나만 보인다.
alter table public.coupons
add column start_date date,
add column end_date date;

update public.coupons
set start_date = least(claim_start, use_start),
    end_date = greatest(claim_end, use_end);

alter table public.coupons
alter column start_date set not null,
alter column end_date set not null;

-- claim_end 를 참조하던 coupons_public_list_idx 는 컬럼과 함께 사라진다.
alter table public.coupons
drop column claim_start,
drop column claim_end,
drop column use_start,
drop column use_end;

alter table public.coupons
add constraint coupons_period_check check (start_date <= end_date);

create index coupons_public_list_idx on public.coupons (status, end_date desc, created_at desc);

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

-- 기간이 하나로 합쳐지면서 "사용 시작 전"이라는 취소 가능 구간이 사라졌다.
-- 아직 쓰지 않은 쿠폰은 언제든 반납할 수 있게 한다.
create or replace function public.cancel_coupon_claim(target_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_claim public.coupon_claims%rowtype;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and status = 'active') then
    raise exception '활성 회원만 쿠폰을 취소할 수 있습니다.';
  end if;
  select * into target_claim from public.coupon_claims
  where id = target_claim_id and user_id = auth.uid() for update;
  if not found or target_claim.status <> 'issued' then raise exception '취소할 수 없는 쿠폰입니다.'; end if;

  update public.coupon_claims
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = target_claim.id;
  update public.coupons
  set claimed_quantity = greatest(claimed_quantity - 1, 0), updated_at = now()
  where id = target_claim.coupon_id;
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
  if (now() at time zone 'Asia/Seoul')::date < target_coupon.start_date then
    raise exception '아직 쿠폰 사용 기간이 아닙니다.';
  end if;
  if (now() at time zone 'Asia/Seoul')::date > target_coupon.end_date then
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

revoke all on function public.claim_coupon(uuid) from public;
revoke all on function public.cancel_coupon_claim(uuid) from public;
revoke all on function public.redeem_my_coupon_claim(uuid, text) from public;
grant execute on function public.claim_coupon(uuid) to authenticated;
grant execute on function public.cancel_coupon_claim(uuid) to authenticated;
grant execute on function public.redeem_my_coupon_claim(uuid, text) to authenticated;
