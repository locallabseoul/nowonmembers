begin;

select plan(9);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'b0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'remind-business@example.com', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"business","nickname":"독촉 테스트 가게"}'::jsonb, now(), now()
  ),
  (
    'b0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'remind-admin@example.com', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"creator","nickname":"독촉 테스트 운영자"}'::jsonb, now(), now()
  );

update public.profiles set is_admin = true where id = 'b0000000-0000-4000-8000-000000000002';

insert into public.business_profiles (id, user_id, business_name, category, verification_status, is_public)
values (
  'b0000000-0000-4000-8000-000000000010',
  'b0000000-0000-4000-8000-000000000001',
  '독촉 테스트 가게', '테스트', 'verified', true
);

-- 발표일을 사흘 넘긴 채 선정중에 멈춰 있는 캠페인. 운영자가 발견하는 상황 그대로다.
insert into public.campaigns (
  id, business_id, title, campaign_type, region, recruit_count,
  recruit_start, recruit_end, selection_date, status
) values
  (
    'b0000000-0000-4000-8000-000000000020',
    'b0000000-0000-4000-8000-000000000010',
    '선정이 밀린 캠페인', 'visit', '노원구', 3,
    ((now() at time zone 'Asia/Seoul')::date - 10),
    ((now() at time zone 'Asia/Seoul')::date - 5),
    ((now() at time zone 'Asia/Seoul')::date - 3),
    'selecting'
  ),
  -- 아직 발표일 전이라 독촉할 근거가 없다.
  (
    'b0000000-0000-4000-8000-000000000021',
    'b0000000-0000-4000-8000-000000000010',
    '아직 기간이 남은 캠페인', 'visit', '노원구', 3,
    ((now() at time zone 'Asia/Seoul')::date - 5),
    ((now() at time zone 'Asia/Seoul')::date - 1),
    ((now() at time zone 'Asia/Seoul')::date + 2),
    'selecting'
  ),
  -- 발표일이 비어 있는 기존 캠페인. 임의의 날짜로 지연 처리하면 안 된다.
  (
    'b0000000-0000-4000-8000-000000000022',
    'b0000000-0000-4000-8000-000000000010',
    '발표일이 없는 캠페인', 'visit', '노원구', 3,
    ((now() at time zone 'Asia/Seoul')::date - 10),
    ((now() at time zone 'Asia/Seoul')::date - 5),
    null,
    'selecting'
  ),
  -- 이미 선정을 끝낸 캠페인은 독촉 대상이 아니다.
  (
    'b0000000-0000-4000-8000-000000000023',
    'b0000000-0000-4000-8000-000000000010',
    '이미 진행중인 캠페인', 'visit', '노원구', 3,
    ((now() at time zone 'Asia/Seoul')::date - 10),
    ((now() at time zone 'Asia/Seoul')::date - 5),
    ((now() at time zone 'Asia/Seoul')::date - 3),
    'in_progress'
  );

select ok(
  (select app_enabled from public.notification_events where key = 'campaign_selection_overdue'),
  'selection overdue event ships enabled for app notifications'
);

-- 가게 계정으로는 자기 캠페인이어도 독촉을 만들 수 없다.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select throws_ok(
  $$select public.admin_remind_campaign_selection('b0000000-0000-4000-8000-000000000020')$$,
  '관리자만 선정 독촉을 보낼 수 있습니다.',
  'business owners cannot send selection reminders'
);

set local "request.jwt.claims" = '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}';

select throws_ok(
  $$select public.admin_remind_campaign_selection('b0000000-0000-4000-8000-000000000021')$$,
  '아직 선정 발표일이 지나지 않았습니다.',
  'campaigns still inside the selection period cannot be nudged'
);

select throws_ok(
  $$select public.admin_remind_campaign_selection('b0000000-0000-4000-8000-000000000022')$$,
  '선정 발표일이 없어 지연 여부를 판단할 수 없습니다.',
  'campaigns without an announced date are never treated as overdue'
);

select throws_ok(
  $$select public.admin_remind_campaign_selection('b0000000-0000-4000-8000-000000000023')$$,
  '선정중인 캠페인만 독촉할 수 있습니다.',
  'campaigns that already finished selecting cannot be nudged'
);

select is(
  public.admin_remind_campaign_selection('b0000000-0000-4000-8000-000000000020'),
  3,
  'admin nudge reports how many days the announcement slipped'
);

reset role;

select is(
  (
    select count(*)::integer from public.notifications
    where campaign_id = 'b0000000-0000-4000-8000-000000000020'
      and type = 'campaign_selection_overdue'
      and user_id = 'b0000000-0000-4000-8000-000000000001'
  ),
  1,
  'the reminder lands in the store owner notifications'
);

select ok(
  (
    select message like '%3일 지났습니다%' from public.notifications
    where campaign_id = 'b0000000-0000-4000-8000-000000000020'
      and type = 'campaign_selection_overdue'
  ),
  'the reminder body names how far past the announced date the store is'
);

-- 연타나 운영자 두 명이 연달아 누르는 경우. 가게에 같은 독촉이 겹쳐 가면 안 된다.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok(
  $$select public.admin_remind_campaign_selection('b0000000-0000-4000-8000-000000000020')$$,
  '12시간 안에 이미 독촉을 보냈습니다.',
  'a second nudge within twelve hours is refused'
);

reset role;

select * from finish();
rollback;
