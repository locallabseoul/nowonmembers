alter table public.point_payment_orders
drop constraint if exists point_payment_orders_charge_option_check;

alter table public.point_payment_orders
add constraint point_payment_orders_charge_option_check check (
  point_amount in (25000, 50000, 100000)
  and supply_amount = point_amount
  and vat_amount = point_amount / 10
  and total_amount = supply_amount + vat_amount
  and (
    (point_amount = 25000 and bonus_points = 0)
    or (point_amount = 50000 and bonus_points in (0, 5000))
    or (point_amount = 100000 and bonus_points = 10000)
  )
);

create or replace function public.create_point_payment_order(
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

  target_bonus_points := case
    when target_point_amount = 50000 then 5000
    when target_point_amount = 100000 then 10000
    else 0
  end;

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

revoke all on function public.create_point_payment_order(text, text, integer) from public;
grant execute on function public.create_point_payment_order(text, text, integer) to authenticated;
