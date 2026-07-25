begin;

select plan(16);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '90000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'point-test-business@example.com',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"business","nickname":"포인트 테스트 가게"}'::jsonb,
  now(),
  now()
);

insert into public.business_profiles (
  id,
  user_id,
  business_name,
  category,
  verification_status,
  is_public
) values (
  '90000000-0000-4000-8000-000000000002',
  '90000000-0000-4000-8000-000000000001',
  '포인트 테스트 가게',
  '테스트',
  'verified',
  true
);

select is(
  (select available_points from public.point_wallets where business_id = '90000000-0000-4000-8000-000000000002'),
  50000,
  'business creation grants 50,000 promotional points'
);

select is(
  public.grant_launch_point_bonus('90000000-0000-4000-8000-000000000002'),
  false,
  'launch bonus is idempotent'
);

insert into public.campaigns (
  id,
  business_id,
  title,
  campaign_type,
  region,
  recruit_count,
  recruit_end,
  status,
  billing_mode
) values (
  '90000000-0000-4000-8000-000000000010',
  '90000000-0000-4000-8000-000000000002',
  '5명 모집 포인트 테스트',
  'visit',
  '노원구',
  5,
  ((now() at time zone 'Asia/Seoul')::date - 1),
  'draft',
  'points_v1'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}';

select ok(
  (select submitted from public.submit_campaign_for_review(
    '90000000-0000-4000-8000-000000000010',
    'test:reserve:first'
  )),
  'campaign submission reserves points'
);

select is(
  (select reserved_points from public.point_wallets where business_id = '90000000-0000-4000-8000-000000000002'),
  25000,
  'five-person campaign reserves 25,000 points'
);

reset role;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
select
  ('91000000-0000-4000-8000-00000000000' || value)::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'point-test-creator-' || value || '@example.com',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('role', 'creator', 'nickname', '테스트 크리에이터 ' || value),
  now(),
  now()
from generate_series(1, 3) as value;

insert into public.creator_profiles (id, user_id, verification_status)
select
  ('92000000-0000-4000-8000-00000000000' || value)::uuid,
  ('91000000-0000-4000-8000-00000000000' || value)::uuid,
  'verified'
from generate_series(1, 3) as value;

insert into public.campaign_applications (campaign_id, creator_id, status)
select
  '90000000-0000-4000-8000-000000000010',
  ('92000000-0000-4000-8000-00000000000' || value)::uuid,
  'submitted'
from generate_series(1, 3) as value;

update public.campaigns
set status = 'recruiting'
where id = '90000000-0000-4000-8000-000000000010';

do $test$ begin perform public.sync_expired_campaigns(); end $test$;

select is(
  (select consumed_points from public.campaign_point_reservations where campaign_id = '90000000-0000-4000-8000-000000000010'),
  15000,
  'three valid applicants consume 15,000 points'
);

select is(
  (select returned_points from public.campaign_point_reservations where campaign_id = '90000000-0000-4000-8000-000000000010'),
  10000,
  'two unfilled slots return 10,000 points'
);

select is(
  (select available_points from public.point_wallets where business_id = '90000000-0000-4000-8000-000000000002'),
  35000,
  'wallet contains the unreserved balance plus returned points'
);

select is(
  (select status::text from public.campaigns where id = '90000000-0000-4000-8000-000000000010'),
  'selecting',
  'underfilled campaign proceeds to selection'
);

do $test$ begin perform public.sync_expired_campaigns(); end $test$;

select is(
  (select lifetime_spent_points from public.point_wallets where business_id = '90000000-0000-4000-8000-000000000002'),
  15000::bigint,
  'repeated expiration sync does not double-charge'
);

insert into public.campaigns (
  id, business_id, title, campaign_type, region, recruit_count, recruit_end, status, billing_mode
) values (
  '90000000-0000-4000-8000-000000000011',
  '90000000-0000-4000-8000-000000000002',
  '신청자 없음 테스트',
  'visit',
  '노원구',
  5,
  ((now() at time zone 'Asia/Seoul')::date - 1),
  'draft',
  'points_v1'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $test$ begin
  perform public.submit_campaign_for_review(
    '90000000-0000-4000-8000-000000000011',
    'test:reserve:empty'
  );
end $test$;
reset role;

update public.campaigns set status = 'recruiting' where id = '90000000-0000-4000-8000-000000000011';
do $test$ begin perform public.sync_expired_campaigns(); end $test$;

select is(
  (select status::text from public.campaigns where id = '90000000-0000-4000-8000-000000000011'),
  'failed',
  'campaign with no valid applicants is failed'
);

select is(
  (select available_points from public.point_wallets where business_id = '90000000-0000-4000-8000-000000000002'),
  35000,
  'campaign with no applicants returns the full reservation'
);

insert into public.campaigns (
  id, business_id, title, campaign_type, region, recruit_count, recruit_end, status, billing_mode
) values (
  '90000000-0000-4000-8000-000000000012',
  '90000000-0000-4000-8000-000000000002',
  '정원 충족 테스트',
  'visit',
  '노원구',
  3,
  ((now() at time zone 'Asia/Seoul')::date - 1),
  'draft',
  'points_v1'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $test$ begin
  perform public.submit_campaign_for_review(
    '90000000-0000-4000-8000-000000000012',
    'test:reserve:full'
  );
end $test$;
reset role;

insert into public.campaign_applications (campaign_id, creator_id, status)
select
  '90000000-0000-4000-8000-000000000012',
  ('92000000-0000-4000-8000-00000000000' || value)::uuid,
  'submitted'
from generate_series(1, 3) as value;

update public.campaigns set status = 'recruiting' where id = '90000000-0000-4000-8000-000000000012';
do $test$ begin perform public.sync_expired_campaigns(); end $test$;

select is(
  (select consumed_points from public.campaign_point_reservations where campaign_id = '90000000-0000-4000-8000-000000000012'),
  15000,
  'a fully recruited three-person campaign consumes 15,000 points'
);

select is(
  (select returned_points from public.campaign_point_reservations where campaign_id = '90000000-0000-4000-8000-000000000012'),
  0,
  'a fully recruited campaign does not return points even before selection'
);

insert into public.campaigns (
  id, business_id, title, campaign_type, region, recruit_count, recruit_end, status, billing_mode
) values (
  '90000000-0000-4000-8000-000000000013',
  '90000000-0000-4000-8000-000000000002',
  '공개 전 취소 테스트',
  'visit',
  '노원구',
  2,
  ((now() at time zone 'Asia/Seoul')::date + 7),
  'draft',
  'points_v1'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $test$ begin
  perform public.submit_campaign_for_review(
    '90000000-0000-4000-8000-000000000013',
    'test:reserve:cancel'
  );
  perform public.cancel_campaign_before_publish(
    '90000000-0000-4000-8000-000000000013',
    'test:cancel:before-publish'
  );
end $test$;
reset role;

select is(
  (select available_points from public.point_wallets where business_id = '90000000-0000-4000-8000-000000000002'),
  20000,
  'pre-publication cancellation returns the full reservation'
);

update public.point_lots
set expires_at = now() - interval '1 second'
where business_id = '90000000-0000-4000-8000-000000000002'
  and kind = 'promotional';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is(
  (select available_points from public.get_my_point_wallet()),
  0,
  'expired promotional points are removed from the available balance'
);

select throws_ok(
  $$
    update public.point_wallets
    set available_points = 999999
    where business_id = '90000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  null,
  'business cannot mutate the wallet directly'
);

select * from finish();
rollback;
