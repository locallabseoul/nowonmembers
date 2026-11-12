-- Synthetic local-only fixtures. Not part of production migrations.
-- Passwords below belong only to the disposable localhost test accounts.
insert into auth.users (
 id, instance_id, aud, role, phone, encrypted_password, phone_confirmed_at,
 raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
 confirmation_token, recovery_token, email_change_token_new, email_change
) values
 ('d1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000001',extensions.crypt('LocalResident2026!',extensions.gen_salt('bf')),now(),'{"provider":"phone","providers":["phone"]}','{"role":"resident","nickname":"테스트 주민","phone":"01000000001","age_14_plus_confirmed":"true","terms_version":"2026-08-18-v2","privacy_version":"2026-08-18-v2"}',now(),now(),'','','',''),
 ('d1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000002',extensions.crypt('LocalResident2026!',extensions.gen_salt('bf')),now(),'{"provider":"phone","providers":["phone"]}','{"role":"resident","nickname":"테스트 정지회원","phone":"01000000002"}',now(),now(),'','','',''),
 ('d1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000003',extensions.crypt('LocalBusiness2026!',extensions.gen_salt('bf')),now(),'{"provider":"phone","providers":["phone"]}','{"role":"business","nickname":"테스트 가게운영자","phone":"01000000003"}',now(),now(),'','','',''),
 ('d1000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000004',extensions.crypt('LocalBusiness2026!',extensions.gen_salt('bf')),now(),'{"provider":"phone","providers":["phone"]}','{"role":"business","nickname":"테스트 비공개운영자","phone":"01000000004"}',now(),now(),'','','','')
on conflict (id) do nothing;

update public.profiles set status='suspended' where id='d1000000-0000-4000-8000-000000000002';

insert into public.business_profiles (
 id,user_id,business_name,category,short_intro,description,district,address,
 latitude,longitude,is_public,verification_status
) values
 ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000003','초록쉼 커피 (테스트)','카페','산책길 옆 작은 커피 공간','실제 영업점이 아닌 개발용 가상 데이터입니다.','공릉동','서울 노원구 공릉동 (가상 주소)',37.626,127.073,true,'verified'),
 ('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000004','비공개 가게 (테스트)','기타','노출되면 안 되는 테스트 가게','비공개 필터 확인용','공릉동','가상 주소',null,null,false,'pending')
on conflict (id) do nothing;

-- Visible demo coupon for manual app testing. No real business or redemption code.
insert into public.coupons(id,business_id,title,description,benefit_type,benefit_value,terms,total_quantity,start_date,end_date,status)
values('d3000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','커피 1,000원 할인 (테스트)','실제 혜택이 없는 개발용 쿠폰입니다.','fixed_amount','1000','가상 매장 전용 · 1인 1회',100,(now() at time zone 'Asia/Seoul')::date-1,(now() at time zone 'Asia/Seoul')::date+30,'approved')
on conflict(id) do nothing;
insert into public.coupon_redemption_secrets(coupon_id,code_hash)
values('d3000000-0000-4000-8000-000000000001',extensions.crypt('654321',extensions.gen_salt('bf',10)))
on conflict(coupon_id) do nothing;
update public.coupons set redemption_code_configured=true where id='d3000000-0000-4000-8000-000000000001';

-- Walking-course prototype fixtures; fictional places, development only.
insert into public.walking_courses(id,title,summary,district,status,featured,travel_minutes)
values('d4000000-0000-4000-8000-000000000001','걷고, 읽고, 커피 한 잔. (테스트)','멀리 가지 않아도 충분한 오후. 산책·책·커피를 연결한 가상 코스입니다. 실제 운영 코스가 아닙니다.','공릉동','published',true,15)
on conflict(id) do nothing;
insert into public.walking_course_stops(course_id,position,title,description,address,stay_minutes,latitude,longitude,business_id) values
('d4000000-0000-4000-8000-000000000001',1,'동네 산책길 (테스트)','가볍게 걷기 · 가상 장소','공릉동 예시 위치',35,37.628,127.075,null),
('d4000000-0000-4000-8000-000000000001',2,'작은문장 서점 (테스트)','마음에 드는 책 찾기 · 가상 장소','공릉동 예시 위치',30,37.627,127.074,null),
('d4000000-0000-4000-8000-000000000001',3,'초록쉼 커피 (테스트)','커피와 함께 쉬어가기 · 가상 가게','',40,null,null,'d2000000-0000-4000-8000-000000000001')
on conflict(course_id,position) do nothing;

-- Dedicated local administrator for reviewing the course editor.
insert into auth.users(id,instance_id,aud,role,phone,encrypted_password,phone_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
values('d1000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000005',extensions.crypt('LocalAdmin2026!',extensions.gen_salt('bf')),now(),'{"provider":"phone","providers":["phone"]}','{"role":"creator","nickname":"테스트 코스 관리자"}',now(),now(),'','','','') on conflict(id) do nothing;
update public.profiles set is_admin=true,status='active' where id='d1000000-0000-4000-8000-000000000005';
