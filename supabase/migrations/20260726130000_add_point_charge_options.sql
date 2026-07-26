alter table public.point_payment_orders
drop constraint if exists point_payment_orders_point_amount_check,
drop constraint if exists point_payment_orders_supply_amount_check,
drop constraint if exists point_payment_orders_vat_amount_check,
drop constraint if exists point_payment_orders_total_amount_check;

alter table public.point_payment_orders
add column bonus_points integer not null default 0;

alter table public.point_payment_orders
add constraint point_payment_orders_charge_option_check check (
  point_amount in (25000, 50000, 100000)
  and supply_amount = point_amount
  and vat_amount = point_amount / 10
  and total_amount = supply_amount + vat_amount
  and bonus_points = case when point_amount = 100000 then 10000 else 0 end
);

alter table public.point_lots
drop constraint if exists point_lots_kind_check;

alter table public.point_lots
add constraint point_lots_kind_check
check (kind in ('paid', 'promotional', 'bonus', 'admin'));

alter table public.point_ledger
drop constraint if exists point_ledger_event_type_check;

alter table public.point_ledger
add constraint point_ledger_event_type_check check (
  event_type in (
    'promotional_credit',
    'paid_credit',
    'bonus_credit',
    'bonus_revoke',
    'admin_credit',
    'admin_debit',
    'campaign_reserve',
    'campaign_settle',
    'campaign_release',
    'point_expire',
    'refund_hold',
    'refund_complete',
    'refund_restore'
  )
);

alter table public.point_refund_requests
add column bonus_lot_id uuid references public.point_lots(id) on delete restrict,
add column revoked_bonus_points integer not null default 0 check (revoked_bonus_points >= 0);

drop function if exists public.get_my_point_wallet();

create function public.get_my_point_wallet()
returns table (
  business_id uuid,
  available_points integer,
  reserved_points integer,
  promotional_points integer,
  paid_points integer,
  bonus_points integer,
  next_expiration_at timestamptz,
  next_bonus_expiration_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_business_id uuid;
begin
  select id
  into target_business_id
  from public.business_profiles
  where user_id = auth.uid();

  if target_business_id is null then
    raise exception '가게 프로필을 찾을 수 없습니다.';
  end if;

  perform public.expire_business_points(target_business_id);

  return query
  select
    point_wallets.business_id,
    point_wallets.available_points,
    point_wallets.reserved_points,
    coalesce(sum(point_lots.available_points) filter (where point_lots.kind = 'promotional'), 0)::integer,
    coalesce(sum(point_lots.available_points) filter (where point_lots.kind = 'paid'), 0)::integer,
    coalesce(sum(point_lots.available_points) filter (where point_lots.kind = 'bonus'), 0)::integer,
    min(point_lots.expires_at) filter (
      where point_lots.available_points > 0
        and point_lots.kind = 'promotional'
    ),
    min(point_lots.expires_at) filter (
      where point_lots.available_points > 0
        and point_lots.kind = 'bonus'
    )
  from public.point_wallets
  left join public.point_lots on point_lots.business_id = point_wallets.business_id
  where point_wallets.business_id = target_business_id
  group by point_wallets.business_id, point_wallets.available_points, point_wallets.reserved_points;
end;
$$;

drop function if exists public.create_point_payment_order(text, text);

create function public.create_point_payment_order(
  target_order_id text,
  target_terms_version text,
  target_point_amount integer
)
returns public.point_payment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  target_business_id uuid;
  target_bonus_points integer;
  created_order public.point_payment_orders;
begin
  if target_order_id !~ '^[A-Za-z0-9_-]{6,64}$' then
    raise exception '올바르지 않은 주문번호입니다.';
  end if;

  if target_point_amount not in (25000, 50000, 100000) then
    raise exception '선택할 수 없는 충전 금액입니다.';
  end if;

  select id
  into target_business_id
  from public.business_profiles
  where user_id = auth.uid();

  if target_business_id is null then
    raise exception '가게 계정만 포인트를 충전할 수 있습니다.';
  end if;

  target_bonus_points := case when target_point_amount = 100000 then 10000 else 0 end;
  perform public.ensure_point_wallet(target_business_id);

  insert into public.point_payment_orders (
    business_id,
    order_id,
    point_amount,
    bonus_points,
    supply_amount,
    vat_amount,
    total_amount,
    accepted_terms_version
  ) values (
    target_business_id,
    target_order_id,
    target_point_amount,
    target_bonus_points,
    target_point_amount,
    target_point_amount / 10,
    target_point_amount + (target_point_amount / 10),
    target_terms_version
  )
  returning * into created_order;

  return created_order;
end;
$$;

create or replace function public.credit_point_payment(
  target_order_id text,
  target_payment_key text,
  target_payment_method text,
  target_provider_response jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.point_payment_orders;
  paid_lot_id uuid;
  bonus_lot_id uuid;
begin
  select *
  into target_order
  from public.point_payment_orders
  where order_id = target_order_id
  for update;

  if not found then
    raise exception '포인트 주문을 찾을 수 없습니다.';
  end if;

  if target_order.status in ('paid', 'partially_refunded', 'refunded') then
    if target_order.payment_key <> target_payment_key then
      raise exception '이미 다른 결제로 처리된 주문입니다.';
    end if;
    return false;
  end if;

  if target_order.status not in ('pending', 'failed') then
    raise exception '승인할 수 없는 주문 상태입니다.';
  end if;

  perform public.ensure_point_wallet(target_order.business_id);

  insert into public.point_lots (
    business_id,
    kind,
    payment_order_id,
    original_points,
    available_points,
    expires_at
  ) values (
    target_order.business_id,
    'paid',
    target_order.id,
    target_order.point_amount,
    target_order.point_amount,
    now() + interval '5 years'
  )
  returning id into paid_lot_id;

  insert into public.point_ledger (
    business_id,
    lot_id,
    payment_order_id,
    event_type,
    available_delta,
    idempotency_key,
    memo
  ) values (
    target_order.business_id,
    paid_lot_id,
    target_order.id,
    'paid_credit',
    target_order.point_amount,
    'payment_credit:' || target_order.order_id,
    '포인트 충전'
  );

  if target_order.bonus_points > 0 then
    insert into public.point_lots (
      business_id,
      kind,
      payment_order_id,
      original_points,
      available_points,
      expires_at
    ) values (
      target_order.business_id,
      'bonus',
      target_order.id,
      target_order.bonus_points,
      target_order.bonus_points,
      now() + interval '1 year'
    )
    returning id into bonus_lot_id;

    insert into public.point_ledger (
      business_id,
      lot_id,
      payment_order_id,
      event_type,
      available_delta,
      idempotency_key,
      memo
    ) values (
      target_order.business_id,
      bonus_lot_id,
      target_order.id,
      'bonus_credit',
      target_order.bonus_points,
      'payment_bonus:' || target_order.order_id,
      '고액 충전 추가 포인트'
    );
  end if;

  update public.point_wallets
  set
    available_points = available_points + target_order.point_amount + target_order.bonus_points,
    lifetime_credited_points = lifetime_credited_points + target_order.point_amount + target_order.bonus_points,
    updated_at = now()
  where business_id = target_order.business_id;

  update public.point_payment_orders
  set
    status = 'paid',
    payment_key = target_payment_key,
    payment_method = target_payment_method,
    provider_response = target_provider_response,
    paid_at = coalesce(paid_at, now()),
    failure_code = null,
    failure_message = null,
    updated_at = now()
  where id = target_order.id;

  return true;
end;
$$;

create or replace function public.submit_campaign_for_review(
  target_campaign_id uuid,
  target_idempotency_key text
)
returns table (
  submitted boolean,
  required_points integer,
  available_points integer,
  shortfall_points integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign record;
  target_wallet public.point_wallets;
  target_lot record;
  points_to_reserve integer;
  points_taken integer;
  remaining_points integer;
begin
  if not public.current_user_has_role('business') then
    raise exception '가게 계정만 캠페인을 제출할 수 있습니다.';
  end if;

  select
    campaigns.id,
    campaigns.business_id,
    campaigns.status,
    campaigns.billing_mode,
    campaigns.recruit_count,
    business_profiles.user_id
  into target_campaign
  from public.campaigns
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaigns.id = target_campaign_id
  for update of campaigns;

  if not found or target_campaign.user_id <> auth.uid() then
    raise exception '캠페인을 찾을 수 없습니다.';
  end if;

  if target_campaign.status = 'in_review'
    and exists (
      select 1
      from public.campaign_point_reservations
      where campaign_id = target_campaign_id
        and status = 'reserved'
    ) then
    return query
    select true, target_campaign.recruit_count * 5000, point_wallets.available_points, 0
    from public.point_wallets
    where point_wallets.business_id = target_campaign.business_id;
    return;
  end if;

  if target_campaign.status <> 'draft' then
    raise exception '초안 상태의 캠페인만 검수 요청할 수 있습니다.';
  end if;

  if target_campaign.recruit_count < 1 or target_campaign.recruit_count > 100 then
    raise exception '선정 인원은 1명 이상 100명 이하로 설정해주세요.';
  end if;

  if target_campaign.billing_mode = 'legacy_free' then
    update public.campaigns
    set status = 'in_review', updated_at = now()
    where id = target_campaign_id;

    return query select true, 0, 0, 0;
    return;
  end if;

  perform public.ensure_point_wallet(target_campaign.business_id);
  perform public.expire_business_points(target_campaign.business_id);

  select point_wallets.*
  into target_wallet
  from public.point_wallets
  where point_wallets.business_id = target_campaign.business_id
  for update;

  points_to_reserve := target_campaign.recruit_count * 5000;

  if target_wallet.available_points < points_to_reserve then
    return query select
      false,
      points_to_reserve,
      target_wallet.available_points,
      points_to_reserve - target_wallet.available_points;
    return;
  end if;

  insert into public.campaign_point_reservations (
    campaign_id,
    business_id,
    requested_headcount,
    reserved_points
  ) values (
    target_campaign_id,
    target_campaign.business_id,
    target_campaign.recruit_count,
    points_to_reserve
  );

  remaining_points := points_to_reserve;

  for target_lot in
    select point_lots.id, point_lots.available_points
    from public.point_lots
    left join public.point_payment_orders
      on point_payment_orders.id = point_lots.payment_order_id
    where point_lots.business_id = target_campaign.business_id
      and point_lots.available_points > 0
      and point_lots.expires_at > now()
    order by
      case point_lots.kind
        when 'promotional' then 0
        when 'admin' then 1
        when 'paid' then 2
        when 'bonus' then 2
        else 3
      end,
      case
        when point_lots.kind in ('paid', 'bonus') then point_payment_orders.created_at
        else point_lots.created_at
      end,
      case point_lots.kind when 'paid' then 0 when 'bonus' then 1 else 0 end,
      point_lots.expires_at,
      point_lots.created_at
    for update of point_lots
  loop
    exit when remaining_points = 0;
    points_taken := least(target_lot.available_points, remaining_points);

    update public.point_lots
    set
      available_points = point_lots.available_points - points_taken,
      reserved_points = point_lots.reserved_points + points_taken,
      updated_at = now()
    where point_lots.id = target_lot.id;

    insert into public.campaign_point_allocations (
      reservation_campaign_id,
      lot_id,
      reserved_points
    ) values (
      target_campaign_id,
      target_lot.id,
      points_taken
    );

    remaining_points := remaining_points - points_taken;
  end loop;

  if remaining_points <> 0 then
    raise exception '포인트 예약 중 잔액이 변경되었습니다. 다시 시도해주세요.';
  end if;

  update public.point_wallets
  set
    available_points = point_wallets.available_points - points_to_reserve,
    reserved_points = point_wallets.reserved_points + points_to_reserve,
    updated_at = now()
  where point_wallets.business_id = target_campaign.business_id;

  insert into public.point_ledger (
    business_id,
    campaign_id,
    event_type,
    available_delta,
    reserved_delta,
    idempotency_key,
    memo,
    metadata
  ) values (
    target_campaign.business_id,
    target_campaign_id,
    'campaign_reserve',
    -points_to_reserve,
    points_to_reserve,
    target_idempotency_key,
    '캠페인 모집 정원 포인트 예약',
    jsonb_build_object('headcount', target_campaign.recruit_count, 'unitPoints', 5000)
  );

  update public.campaigns
  set status = 'in_review', updated_at = now()
  where id = target_campaign_id;

  return query
  select true, points_to_reserve, target_wallet.available_points - points_to_reserve, 0;
end;
$$;

create or replace function public.release_campaign_point_reservation(
  target_campaign_id uuid,
  target_reason text,
  target_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reservation public.campaign_point_reservations;
  target_allocation record;
  reusable_points integer := 0;
  returned_now integer;
begin
  select *
  into target_reservation
  from public.campaign_point_reservations
  where campaign_id = target_campaign_id
  for update;

  if not found or target_reservation.status <> 'reserved' then
    return 0;
  end if;

  for target_allocation in
    select
      campaign_point_allocations.lot_id,
      campaign_point_allocations.reserved_points,
      point_lots.kind,
      point_lots.expires_at
    from public.campaign_point_allocations
    join public.point_lots on point_lots.id = campaign_point_allocations.lot_id
    where reservation_campaign_id = target_campaign_id
    for update of point_lots, campaign_point_allocations
  loop
    returned_now := case
      when target_allocation.kind in ('promotional', 'bonus')
        and target_allocation.expires_at <= now() then 0
      else target_allocation.reserved_points
    end;

    update public.point_lots
    set
      reserved_points = reserved_points - target_allocation.reserved_points,
      available_points = available_points + returned_now,
      consumed_points = consumed_points + (target_allocation.reserved_points - returned_now),
      updated_at = now()
    where id = target_allocation.lot_id;

    update public.campaign_point_allocations
    set returned_points = target_allocation.reserved_points
    where reservation_campaign_id = target_campaign_id
      and lot_id = target_allocation.lot_id;

    reusable_points := reusable_points + returned_now;
  end loop;

  update public.point_wallets
  set
    available_points = available_points + reusable_points,
    reserved_points = reserved_points - target_reservation.reserved_points,
    updated_at = now()
  where business_id = target_reservation.business_id;

  update public.campaign_point_reservations
  set
    status = 'released',
    billable_headcount = 0,
    returned_points = reserved_points,
    settlement_reason = target_reason,
    settled_at = now(),
    updated_at = now()
  where campaign_id = target_campaign_id;

  insert into public.point_ledger (
    business_id,
    campaign_id,
    event_type,
    available_delta,
    reserved_delta,
    idempotency_key,
    memo,
    metadata
  ) values (
    target_reservation.business_id,
    target_campaign_id,
    'campaign_release',
    reusable_points,
    -target_reservation.reserved_points,
    target_idempotency_key,
    target_reason,
    jsonb_build_object(
      'returnedPoints', target_reservation.reserved_points,
      'reusablePoints', reusable_points
    )
  )
  on conflict (idempotency_key) do nothing;

  return reusable_points;
end;
$$;

create or replace function public.settle_campaign_points(
  target_campaign_id uuid,
  target_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reservation public.campaign_point_reservations;
  target_allocation record;
  valid_application_count integer;
  billable_count integer;
  points_to_consume integer;
  remaining_consume integer;
  consumed_now integer;
  returned_now integer;
  reusable_now integer;
  reusable_total integer := 0;
begin
  select *
  into target_reservation
  from public.campaign_point_reservations
  where campaign_id = target_campaign_id
  for update;

  if not found then
    return 0;
  end if;

  if target_reservation.status <> 'reserved' then
    return coalesce(target_reservation.billable_headcount, 0);
  end if;

  select count(distinct creator_id)
  into valid_application_count
  from public.campaign_applications
  where campaign_id = target_campaign_id
    and status in ('submitted', 'recommended', 'selected');

  billable_count := least(target_reservation.requested_headcount, valid_application_count);
  points_to_consume := billable_count * target_reservation.unit_points;
  remaining_consume := points_to_consume;

  for target_allocation in
    select
      campaign_point_allocations.lot_id,
      campaign_point_allocations.reserved_points,
      point_lots.kind,
      point_lots.expires_at
    from public.campaign_point_allocations
    join public.point_lots on point_lots.id = campaign_point_allocations.lot_id
    left join public.point_payment_orders
      on point_payment_orders.id = point_lots.payment_order_id
    where reservation_campaign_id = target_campaign_id
    order by
      case point_lots.kind
        when 'promotional' then 0
        when 'admin' then 1
        when 'paid' then 2
        when 'bonus' then 2
        else 3
      end,
      case
        when point_lots.kind in ('paid', 'bonus') then point_payment_orders.created_at
        else point_lots.created_at
      end,
      case point_lots.kind when 'paid' then 0 when 'bonus' then 1 else 0 end,
      point_lots.expires_at,
      point_lots.created_at
    for update of point_lots, campaign_point_allocations
  loop
    consumed_now := least(target_allocation.reserved_points, remaining_consume);
    returned_now := target_allocation.reserved_points - consumed_now;
    reusable_now := case
      when target_allocation.kind in ('promotional', 'bonus')
        and target_allocation.expires_at <= now() then 0
      else returned_now
    end;

    update public.point_lots
    set
      reserved_points = reserved_points - target_allocation.reserved_points,
      consumed_points = consumed_points + consumed_now + (returned_now - reusable_now),
      available_points = available_points + reusable_now,
      updated_at = now()
    where id = target_allocation.lot_id;

    update public.campaign_point_allocations
    set
      consumed_points = consumed_now,
      returned_points = returned_now
    where reservation_campaign_id = target_campaign_id
      and lot_id = target_allocation.lot_id;

    remaining_consume := remaining_consume - consumed_now;
    reusable_total := reusable_total + reusable_now;
  end loop;

  update public.point_wallets
  set
    available_points = available_points + reusable_total,
    reserved_points = reserved_points - target_reservation.reserved_points,
    lifetime_spent_points = lifetime_spent_points + points_to_consume,
    updated_at = now()
  where business_id = target_reservation.business_id;

  update public.campaign_point_reservations
  set
    status = 'settled',
    billable_headcount = billable_count,
    consumed_points = points_to_consume,
    returned_points = reserved_points - points_to_consume,
    settlement_reason = case when billable_count = 0 then '유효 신청자 없음' else '모집 마감 정산' end,
    settled_at = now(),
    updated_at = now()
  where campaign_id = target_campaign_id;

  insert into public.point_ledger (
    business_id,
    campaign_id,
    event_type,
    available_delta,
    reserved_delta,
    idempotency_key,
    memo,
    metadata
  ) values (
    target_reservation.business_id,
    target_campaign_id,
    'campaign_settle',
    reusable_total,
    -target_reservation.reserved_points,
    target_idempotency_key,
    '모집 마감 포인트 정산',
    jsonb_build_object(
      'validApplications', valid_application_count,
      'billableHeadcount', billable_count,
      'consumedPoints', points_to_consume,
      'returnedPoints', target_reservation.reserved_points - points_to_consume,
      'reusablePoints', reusable_total
    )
  )
  on conflict (idempotency_key) do nothing;

  return billable_count;
end;
$$;

create or replace function public.create_point_refund_request(
  target_order_id text,
  target_refund_id uuid,
  target_idempotency_key text
)
returns public.point_refund_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.point_payment_orders;
  target_lot public.point_lots;
  target_bonus_lot public.point_lots;
  created_refund public.point_refund_requests;
  bonus_points_to_revoke integer := 0;
begin
  select *
  into target_order
  from public.point_payment_orders
  where order_id = target_order_id
  for update;

  if not found or not public.owns_business(target_order.business_id) then
    raise exception '환불할 주문을 찾을 수 없습니다.';
  end if;

  if target_order.status not in ('paid', 'partially_refunded') then
    raise exception '환불할 수 없는 주문 상태입니다.';
  end if;

  perform public.expire_business_points(target_order.business_id);

  select *
  into target_lot
  from public.point_lots
  where payment_order_id = target_order.id
    and kind = 'paid'
  for update;

  if not found or target_lot.available_points <= 0 then
    raise exception '현금으로 환불 가능한 포인트가 없습니다.';
  end if;

  select *
  into target_bonus_lot
  from public.point_lots
  where payment_order_id = target_order.id
    and kind = 'bonus'
  for update;

  if found then
    if target_bonus_lot.reserved_points > 0 then
      raise exception '충전 보너스가 캠페인에 예약되어 있어 지금은 환불할 수 없습니다.';
    end if;
    bonus_points_to_revoke := target_bonus_lot.available_points;
  end if;

  insert into public.point_refund_requests (
    id,
    business_id,
    payment_order_id,
    point_lot_id,
    bonus_lot_id,
    refund_points,
    refund_amount,
    revoked_bonus_points,
    idempotency_key
  ) values (
    target_refund_id,
    target_order.business_id,
    target_order.id,
    target_lot.id,
    target_bonus_lot.id,
    target_lot.available_points,
    (target_lot.available_points * 11) / 10,
    bonus_points_to_revoke,
    target_idempotency_key
  )
  returning * into created_refund;

  update public.point_lots
  set
    available_points = 0,
    refunded_points = refunded_points + target_lot.available_points,
    updated_at = now()
  where id = target_lot.id;

  if bonus_points_to_revoke > 0 then
    update public.point_lots
    set
      available_points = 0,
      consumed_points = consumed_points + bonus_points_to_revoke,
      updated_at = now()
    where id = target_bonus_lot.id;

    insert into public.point_ledger (
      business_id,
      lot_id,
      payment_order_id,
      event_type,
      available_delta,
      idempotency_key,
      memo
    ) values (
      target_order.business_id,
      target_bonus_lot.id,
      target_order.id,
      'bonus_revoke',
      -bonus_points_to_revoke,
      'refund_bonus_revoke:' || target_refund_id::text,
      '유상 포인트 환불에 따른 미사용 충전 보너스 회수'
    );
  end if;

  update public.point_wallets
  set
    available_points = available_points - target_lot.available_points - bonus_points_to_revoke,
    updated_at = now()
  where business_id = target_order.business_id;

  insert into public.point_ledger (
    business_id,
    lot_id,
    payment_order_id,
    event_type,
    available_delta,
    idempotency_key,
    memo
  ) values (
    target_order.business_id,
    target_lot.id,
    target_order.id,
    'refund_hold',
    -target_lot.available_points,
    'refund_hold:' || target_refund_id::text,
    '유상 포인트 환불 대기'
  );

  return created_refund;
end;
$$;

create or replace function public.fail_point_refund(
  target_refund_id uuid,
  target_failure_message text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_refund public.point_refund_requests;
begin
  select *
  into target_refund
  from public.point_refund_requests
  where id = target_refund_id
  for update;

  if not found or target_refund.status <> 'pending' then
    return false;
  end if;

  update public.point_lots
  set
    available_points = available_points + target_refund.refund_points,
    refunded_points = refunded_points - target_refund.refund_points,
    updated_at = now()
  where id = target_refund.point_lot_id;

  if target_refund.bonus_lot_id is not null and target_refund.revoked_bonus_points > 0 then
    update public.point_lots
    set
      available_points = available_points + target_refund.revoked_bonus_points,
      consumed_points = consumed_points - target_refund.revoked_bonus_points,
      updated_at = now()
    where id = target_refund.bonus_lot_id;
  end if;

  update public.point_wallets
  set
    available_points = available_points + target_refund.refund_points + target_refund.revoked_bonus_points,
    updated_at = now()
  where business_id = target_refund.business_id;

  update public.point_refund_requests
  set
    status = 'failed',
    failure_message = target_failure_message,
    completed_at = now()
  where id = target_refund_id;

  insert into public.point_ledger (
    business_id,
    lot_id,
    payment_order_id,
    event_type,
    available_delta,
    idempotency_key,
    memo,
    metadata
  ) values (
    target_refund.business_id,
    target_refund.point_lot_id,
    target_refund.payment_order_id,
    'refund_restore',
    target_refund.refund_points + target_refund.revoked_bonus_points,
    'refund_restore:' || target_refund_id::text,
    target_failure_message,
    jsonb_build_object('restoredBonusPoints', target_refund.revoked_bonus_points)
  )
  on conflict (idempotency_key) do nothing;

  return true;
end;
$$;

revoke all on function public.get_my_point_wallet() from public;
revoke all on function public.create_point_payment_order(text, text, integer) from public;
revoke all on function public.credit_point_payment(text, text, text, jsonb) from public;
revoke all on function public.submit_campaign_for_review(uuid, text) from public;
revoke all on function public.release_campaign_point_reservation(uuid, text, text) from public;
revoke all on function public.settle_campaign_points(uuid, text) from public;
revoke all on function public.create_point_refund_request(text, uuid, text) from public;
revoke all on function public.fail_point_refund(uuid, text) from public;

grant execute on function public.get_my_point_wallet() to authenticated;
grant execute on function public.create_point_payment_order(text, text, integer) to authenticated;
grant execute on function public.submit_campaign_for_review(uuid, text) to authenticated;
grant execute on function public.create_point_refund_request(text, uuid, text) to authenticated;
grant execute on function public.credit_point_payment(text, text, text, jsonb) to service_role;
grant execute on function public.fail_point_refund(uuid, text) to service_role;
