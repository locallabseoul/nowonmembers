begin;

select plan(6);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'c0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'reject-business@example.com', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"business","nickname":"미선정 테스트 가게"}'::jsonb, now(), now()
  ),
  (
    'c0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'reject-creator@example.com', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"creator","nickname":"미선정 테스트 크리에이터"}'::jsonb, now(), now()
  );

insert into public.business_profiles (id, user_id, business_name, category, verification_status, is_public)
values (
  'c0000000-0000-4000-8000-000000000010',
  'c0000000-0000-4000-8000-000000000001',
  '미선정 테스트 가게', '테스트', 'verified', true
);

insert into public.creator_profiles (id, user_id)
values ('c0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000002');

insert into public.campaigns (
  id, business_id, title, campaign_type, region, recruit_count,
  recruit_end, selection_date, status
) values (
  'c0000000-0000-4000-8000-000000000020',
  'c0000000-0000-4000-8000-000000000010',
  '미선정 알림 테스트 캠페인', 'visit', '노원구', 1,
  ((now() at time zone 'Asia/Seoul')::date - 3),
  ((now() at time zone 'Asia/Seoul')::date - 1),
  'selecting'
);

insert into public.campaign_applications (id, campaign_id, creator_id, status)
values (
  'c0000000-0000-4000-8000-000000000030',
  'c0000000-0000-4000-8000-000000000020',
  'c0000000-0000-4000-8000-000000000011',
  'recommended'
);

select ok(
  (select app_enabled from public.notification_events where key = 'application_rejected'),
  'rejection event ships with app notifications on'
);

-- 미선정 통보는 문자로 보내지 않는다는 운영 판단. 기본값이 이를 지켜야 한다.
select ok(
  not (select sms_enabled from public.notification_events where key = 'application_rejected'),
  'rejection event ships with sms off'
);

-- finalize_campaign_selection이 하는 것과 같은 전환.
update public.campaign_applications
set status = 'rejected'
where id = 'c0000000-0000-4000-8000-000000000030';

select is(
  (
    select count(*)::integer from public.notifications
    where user_id = 'c0000000-0000-4000-8000-000000000002'
      and campaign_id = 'c0000000-0000-4000-8000-000000000020'
      and type = 'application_rejected'
  ),
  1,
  'rejected creator receives an app notification'
);

select ok(
  (
    select message like '%미선정 알림 테스트 캠페인%' from public.notifications
    where user_id = 'c0000000-0000-4000-8000-000000000002'
      and type = 'application_rejected'
  ),
  'the notice names the campaign'
);

select is(
  (
    select count(*)::integer from public.sms_outbox
    where event_key = 'application_rejected'
  ),
  0,
  'no sms is queued for rejection notices'
);

-- 같은 행을 다시 rejected로 저장해도(관리자 메모 수정 등) 알림이 중복되면 안 된다.
update public.campaign_applications
set status = 'rejected', admin_memo = '메모 수정'
where id = 'c0000000-0000-4000-8000-000000000030';

select is(
  (
    select count(*)::integer from public.notifications
    where user_id = 'c0000000-0000-4000-8000-000000000002'
      and type = 'application_rejected'
  ),
  1,
  're-saving an already rejected application does not duplicate the notice'
);

select * from finish();
rollback;
