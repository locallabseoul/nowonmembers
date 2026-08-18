begin;

select plan(15);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'c0000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'resident@example.com', '', now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"resident","nickname":"동네주민","name":"주민","age_14_plus_confirmed":"true","terms_version":"2026-08-18-v2","privacy_version":"2026-08-18-v2"}',
    now(), now()
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'legacy@example.com', '', now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"creator","nickname":"기존회원"}',
    now(), now()
  ),
  (
    'c0000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'resident-no-marketing@example.com', '', now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"resident","nickname":"미동의주민"}',
    now(), now()
  ),
  (
    'c0000000-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'resident-admin@example.com', '', now(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"creator","nickname":"주민테스트관리자"}',
    now(), now()
  );

update public.profiles
set marketing_opt_in = true, marketing_opt_in_at = now()
where id = 'c0000000-0000-4000-8000-000000000001';

update public.profiles
set is_admin = true
where id = 'c0000000-0000-4000-8000-000000000004';

select throws_ok(
  $$
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      'c0000000-0000-4000-8000-000000000099',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'invalid-role@example.com', '', now(),
      '{"provider":"email","providers":["email"]}', '{"role":"unknown"}', now(), now()
    )
  $$,
  '회원 유형이 올바르지 않습니다.',
  'unknown signup roles are rejected instead of becoming creators'
);

select is(
  (select role::text from public.profiles where id = 'c0000000-0000-4000-8000-000000000001'),
  'resident',
  'resident role is preserved on signup'
);
select is(
  (select verification_status::text from public.profiles where id = 'c0000000-0000-4000-8000-000000000001'),
  'verified',
  'resident is automatically verified'
);
select ok(
  (select age_14_plus_confirmed_at is not null from public.profiles where id = 'c0000000-0000-4000-8000-000000000001'),
  'age confirmation time is recorded'
);
select is(
  (select count(*)::integer from public.legal_acceptances where user_id = 'c0000000-0000-4000-8000-000000000001'),
  2,
  'signup records terms and privacy versions'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"c0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select lives_ok(
  $$select public.admin_send_message(
    'promotional', array['app'], '주민 쿠폰 테스트', '새 쿠폰이 열렸습니다.', '/coupons',
    'resident', 'all', false, false
  )$$,
  'admin can target residents'
);
select is(
  (
    select count(*)::integer
    from public.admin_message_recipients recipient
    join public.admin_messages message on message.id = recipient.message_id
    where message.title = '주민 쿠폰 테스트'
  ),
  1,
  'resident promotions include only marketing opt-in members'
);

set local "request.jwt.claims" = '{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select ok(public.has_accepted_current_legal_document('terms'), 'resident has accepted current terms');
select lives_ok(
  $$select public.upgrade_resident_role('creator', null, null)$$,
  'resident can upgrade to creator'
);
select is(
  (select role::text from public.profiles where id = 'c0000000-0000-4000-8000-000000000001'),
  'creator',
  'upgrade changes role'
);
select ok(
  exists (select 1 from public.creator_profiles where user_id = 'c0000000-0000-4000-8000-000000000001'),
  'upgrade creates creator profile'
);
select throws_ok(
  $$select public.upgrade_resident_role('business', '테스트 가게', '카페')$$,
  '주민 회원만 직접 역할을 전환할 수 있습니다.',
  'self upgrade is one way'
);

set local "request.jwt.claims" = '{"sub":"c0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select ok(not public.has_accepted_current_legal_document('terms'), 'legacy member starts without current terms');
select lives_ok(
  $$select public.accept_legal_document('terms', '2026-08-18-v2', 'coupon_claim')$$,
  'legacy member can accept current terms'
);
select ok(public.has_accepted_current_legal_document('terms'), 'accepted current terms become effective');

select * from finish();
rollback;
