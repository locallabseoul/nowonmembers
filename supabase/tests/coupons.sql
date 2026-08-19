begin;

select plan(25);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'coupon-business@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"business","nickname":"쿠폰 가게"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'coupon-member@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"resident","nickname":"쿠폰 회원"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'coupon-member-2@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"creator","nickname":"쿠폰 회원2"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other-business@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{"role":"business","nickname":"다른 가게"}', now(), now());

insert into public.business_profiles (id, user_id, business_name, category, verification_status, is_public)
values
  ('a0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', '쿠폰 테스트 가게', '테스트', 'verified', false),
  ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000004', '다른 테스트 가게', '테스트', 'verified', false);

insert into public.legal_acceptances (user_id, document_type, document_version, source)
values (
  'a0000000-0000-4000-8000-000000000003',
  'terms',
  '2026-08-18-v2',
  'signup'
);

-- 배포 전에 승인·발급됐던 쿠폰을 재현한다. 승인 상태와 발급 건은 그대로 보존된다.
insert into public.coupons (
  id, business_id, title, description, benefit_type, benefit_value, terms, total_quantity,
  claimed_quantity, start_date, end_date, status
) values (
  'a0000000-0000-4000-8000-000000000020',
  'a0000000-0000-4000-8000-000000000010',
  '코드 전환 테스트', '설명', 'fixed_amount', '5000', '조건', 3, 1,
  ((now() at time zone 'Asia/Seoul')::date - 1),
  ((now() at time zone 'Asia/Seoul')::date + 2),
  'approved'
);

insert into public.coupons (
  id, business_id, title, description, benefit_type, benefit_value, terms, total_quantity,
  start_date, end_date, status
) values (
  'a0000000-0000-4000-8000-000000000021',
  'a0000000-0000-4000-8000-000000000010',
  '신규 검수 차단 테스트', '설명', 'other', '혜택', '조건', 1,
  (now() at time zone 'Asia/Seoul')::date,
  ((now() at time zone 'Asia/Seoul')::date + 2),
  'draft'
);

insert into public.coupon_claims (id, coupon_id, user_id, status)
values ('a0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000002', 'issued');

select is((select status::text from public.coupons where id = 'a0000000-0000-4000-8000-000000000020'), 'approved', 'legacy coupon stays approved');
select ok(not (select redemption_code_configured from public.coupons where id = 'a0000000-0000-4000-8000-000000000020'), 'legacy coupon starts without a code');

set local role anon;
set local "request.jwt.claims" = '{"role":"anon"}';
select is(
  (select business_name from public.get_public_coupons() where id = 'a0000000-0000-4000-8000-000000000020'),
  '쿠폰 테스트 가게',
  'anonymous visitors receive the safe business fields for an approved coupon'
);
select is(
  (select count(*) from public.business_profiles where id = 'a0000000-0000-4000-8000-000000000010'),
  0::bigint,
  'the approved coupon does not expose the private business profile row'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select throws_ok(
  $$select public.claim_coupon('a0000000-0000-4000-8000-000000000020')$$,
  '가게에서 쿠폰 사용을 준비 중입니다.',
  'new claims are blocked until code setup'
);

set local "request.jwt.claims" = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok(
  $$update public.coupons set status = 'in_review' where id = 'a0000000-0000-4000-8000-000000000021'$$,
  '검수 요청 전에 사용 코드를 설정해주세요.',
  'new coupon cannot enter review without a code'
);
select throws_ok(
  $$select public.set_coupon_redemption_code('a0000000-0000-4000-8000-000000000020', '1234')$$,
  '사용 코드는 숫자 6자리로 입력해주세요.',
  'code must contain exactly six digits'
);
select lives_ok($$select public.set_coupon_redemption_code('a0000000-0000-4000-8000-000000000020', '123456')$$, 'owner sets a six digit code');
select ok((select redemption_code_configured from public.coupons where id = 'a0000000-0000-4000-8000-000000000020'), 'coupon records only setup state');

reset role;
select isnt((select code_hash from public.coupon_redemption_secrets where coupon_id = 'a0000000-0000-4000-8000-000000000020'), '123456', 'code is not stored as plaintext');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok(
  $$select public.set_coupon_redemption_code('a0000000-0000-4000-8000-000000000020', '654321')$$,
  '사용 코드를 설정할 수 없는 쿠폰입니다.',
  'another business cannot reset the code'
);

set local "request.jwt.claims" = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select error_code from public.redeem_my_coupon_claim('a0000000-0000-4000-8000-000000000030', '000001')), 'invalid_code', 'first wrong code fails');
select is((select error_code from public.redeem_my_coupon_claim('a0000000-0000-4000-8000-000000000030', '000002')), 'invalid_code', 'second wrong code fails');
select is((select error_code from public.redeem_my_coupon_claim('a0000000-0000-4000-8000-000000000030', '000003')), 'invalid_code', 'third wrong code fails');
select is((select error_code from public.redeem_my_coupon_claim('a0000000-0000-4000-8000-000000000030', '000004')), 'invalid_code', 'fourth wrong code fails');
select is((select error_code from public.redeem_my_coupon_claim('a0000000-0000-4000-8000-000000000030', '000005')), 'locked', 'fifth wrong code locks the claim');
select is((select failed_redemption_attempts from public.coupon_claims where id = 'a0000000-0000-4000-8000-000000000030'), 5, 'five failures are persisted');
select is((select error_code from public.redeem_my_coupon_claim('a0000000-0000-4000-8000-000000000030', '123456')), 'locked', 'correct code cannot bypass active lock');

set local "request.jwt.claims" = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select lives_ok($$select public.set_coupon_redemption_code('a0000000-0000-4000-8000-000000000020', '654321')$$, 'owner can reset an approved coupon code');
select is((select failed_redemption_attempts from public.coupon_claims where id = 'a0000000-0000-4000-8000-000000000030'), 0, 'code reset clears issued claim locks');

set local "request.jwt.claims" = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select error_code from public.redeem_my_coupon_claim('a0000000-0000-4000-8000-000000000030', '123456')), 'invalid_code', 'old code is invalid immediately');
select ok((select redeemed from public.redeem_my_coupon_claim('a0000000-0000-4000-8000-000000000030', '654321')), 'new code redeems the member own claim');
select is((select status::text from public.coupon_claims where id = 'a0000000-0000-4000-8000-000000000030'), 'redeemed', 'claim is marked redeemed');
select throws_ok(
  $$select public.redeem_my_coupon_claim('a0000000-0000-4000-8000-000000000030', '654321')$$,
  '사용할 수 없는 쿠폰입니다.',
  'redeemed claim cannot be reused'
);

set local "request.jwt.claims" = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select lives_ok($$select public.claim_coupon('a0000000-0000-4000-8000-000000000020')$$, 'member can claim after code setup');

select * from finish();
rollback;
