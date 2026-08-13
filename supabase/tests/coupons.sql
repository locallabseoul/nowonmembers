begin;

select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'coupon-business@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"business","nickname":"쿠폰 가게"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'coupon-member@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"resident","nickname":"쿠폰 회원"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'coupon-member-2@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"creator","nickname":"쿠폰 회원2"}', now(), now());

insert into public.business_profiles (id, user_id, business_name, category, verification_status, is_public)
values ('a0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', '쿠폰 테스트 가게', '테스트', 'verified', true);

insert into public.coupons (
  id, business_id, title, description, benefit_type, benefit_value, terms, total_quantity,
  claim_start, claim_end, use_start, use_end, status
) values (
  'a0000000-0000-4000-8000-000000000020',
  'a0000000-0000-4000-8000-000000000010',
  '원자 발급 테스트', '설명', 'fixed_amount', '5000', '조건', 1,
  ((now() at time zone 'Asia/Seoul')::date - 1),
  ((now() at time zone 'Asia/Seoul')::date + 1),
  ((now() at time zone 'Asia/Seoul')::date + 1),
  ((now() at time zone 'Asia/Seoul')::date + 2),
  'approved'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';

select lives_ok(
  $$select public.claim_coupon('a0000000-0000-4000-8000-000000000020')$$,
  'active member can claim an approved coupon'
);
select is((select claimed_quantity from public.coupons where id = 'a0000000-0000-4000-8000-000000000020'), 1, 'claim reserves one unit');
select is((select status::text from public.coupon_claims where user_id = 'a0000000-0000-4000-8000-000000000002'), 'issued', 'new claim is issued');
select throws_ok(
  $$select public.claim_coupon('a0000000-0000-4000-8000-000000000020')$$,
  '이미 받은 쿠폰입니다.',
  'same member cannot claim twice'
);
select lives_ok(
  $$select public.cancel_coupon_claim((select id from public.coupon_claims where user_id = 'a0000000-0000-4000-8000-000000000002'))$$,
  'member can cancel before use starts'
);
select is((select claimed_quantity from public.coupons where id = 'a0000000-0000-4000-8000-000000000020'), 0, 'cancellation returns inventory');

set local "request.jwt.claims" = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select lives_ok($$select public.claim_coupon('a0000000-0000-4000-8000-000000000020')$$, 'another member can claim returned inventory');
select is((select claimed_quantity from public.coupons where id = 'a0000000-0000-4000-8000-000000000020'), 1, 'inventory is reserved again');

reset role;
update public.coupons set use_start = (now() at time zone 'Asia/Seoul')::date where id = 'a0000000-0000-4000-8000-000000000020';
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';

select lives_ok(
  $$select public.redeem_coupon_claim((select id from public.coupon_claims where user_id = 'a0000000-0000-4000-8000-000000000003'))$$,
  'issuing business can redeem during use period'
);
select is((select status::text from public.coupon_claims where user_id = 'a0000000-0000-4000-8000-000000000003'), 'redeemed', 'claim is marked redeemed');
select throws_ok(
  $$select public.redeem_coupon_claim((select id from public.coupon_claims where user_id = 'a0000000-0000-4000-8000-000000000003'))$$,
  '사용할 수 없는 쿠폰입니다.',
  'redeemed coupon cannot be reused'
);
select is(
  (select member_name from public.lookup_coupon_claim((select redemption_code from public.coupon_claims where user_id = 'a0000000-0000-4000-8000-000000000003'))),
  '쿠폰 회원2',
  'business lookup returns the member safely'
);

select * from finish();
rollback;
