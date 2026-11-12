-- Synthetic local-only fixtures. Not part of production migrations.
-- Passwords below belong only to the disposable localhost test accounts.
insert into auth.users (
 id, instance_id, aud, role, phone, encrypted_password, phone_confirmed_at,
 raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
 confirmation_token, recovery_token, email_change_token_new, email_change
) values
 ('d1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000001',extensions.crypt('LocalResident2026!',extensions.gen_salt('bf')),now(),'{"provider":"phone","providers":["phone"]}','{"role":"resident","nickname":"이웃","phone":"01000000001","age_14_plus_confirmed":"true","terms_version":"2026-08-18-v2","privacy_version":"2026-08-18-v2"}',now(),now(),'','','',''),
 ('d1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000002',extensions.crypt('LocalResident2026!',extensions.gen_salt('bf')),now(),'{"provider":"phone","providers":["phone"]}','{"role":"resident","nickname":"정지회원","phone":"01000000002"}',now(),now(),'','','',''),
 ('d1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000003',extensions.crypt('LocalBusiness2026!',extensions.gen_salt('bf')),now(),'{"provider":"phone","providers":["phone"]}','{"role":"business","nickname":"가게운영자","phone":"01000000003"}',now(),now(),'','','',''),
 ('d1000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000004',extensions.crypt('LocalBusiness2026!',extensions.gen_salt('bf')),now(),'{"provider":"phone","providers":["phone"]}','{"role":"business","nickname":"비공개운영자","phone":"01000000004"}',now(),now(),'','','','')
on conflict (id) do nothing;

update public.profiles set status='suspended' where id='d1000000-0000-4000-8000-000000000002';

insert into public.business_profiles (
 id,user_id,business_name,category,short_intro,description,district,address,
 latitude,longitude,is_public,verification_status
) values
 ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000003','초록쉼 커피','카페','산책길 옆 작은 커피 공간','실제 영업점이 아닌 개발용 가상 데이터입니다.','공릉동','서울 노원구 공릉동 (가상 주소)',37.626,127.073,true,'verified'),
 ('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000004','비공개 가게','기타','노출되면 안 되는 테스트 가게','비공개 필터 확인용','공릉동','가상 주소',null,null,false,'pending')
on conflict (id) do nothing;

-- Visible demo coupon for manual app testing. No real business or redemption code.
insert into public.coupons(id,business_id,title,description,benefit_type,benefit_value,terms,total_quantity,start_date,end_date,status)
values('d3000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','커피 1,000원 할인','실제 혜택이 없는 개발용 쿠폰입니다.','fixed_amount','1000','가상 매장 전용 · 1인 1회',100,(now() at time zone 'Asia/Seoul')::date-1,(now() at time zone 'Asia/Seoul')::date+30,'approved')
on conflict(id) do nothing;
insert into public.coupon_redemption_secrets(coupon_id,code_hash)
values('d3000000-0000-4000-8000-000000000001',extensions.crypt('654321',extensions.gen_salt('bf',10)))
on conflict(coupon_id) do nothing;
update public.coupons set redemption_code_configured=true where id='d3000000-0000-4000-8000-000000000001';

-- Walking-course prototype fixtures; fictional places, development only.
insert into public.walking_courses(id,title,summary,district,status,featured,travel_minutes)
values('d4000000-0000-4000-8000-000000000001','걷고, 읽고, 커피 한 잔.','멀리 가지 않아도 충분한 오후. 산책·책·커피를 연결한 가상 코스입니다. 실제 운영 코스가 아닙니다.','공릉동','published',true,15)
on conflict(id) do nothing;
insert into public.walking_course_stops(course_id,position,title,description,address,stay_minutes,latitude,longitude,business_id) values
('d4000000-0000-4000-8000-000000000001',1,'동네 산책길','가볍게 걷기 · 가상 장소','공릉동 예시 위치',35,37.628,127.075,null),
('d4000000-0000-4000-8000-000000000001',2,'작은문장 서점','마음에 드는 책 찾기 · 가상 장소','공릉동 예시 위치',30,37.627,127.074,null),
('d4000000-0000-4000-8000-000000000001',3,'초록쉼 커피','커피와 함께 쉬어가기 · 가상 가게','',40,null,null,'d2000000-0000-4000-8000-000000000001')
on conflict(course_id,position) do nothing;

-- Dedicated local administrator for reviewing the course editor.
insert into auth.users(id,instance_id,aud,role,phone,encrypted_password,phone_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
values('d1000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000005',extensions.crypt('LocalAdmin2026!',extensions.gen_salt('bf')),now(),'{"provider":"phone","providers":["phone"]}','{"role":"creator","nickname":"코스 관리자"}',now(),now(),'','','','') on conflict(id) do nothing;
update public.profiles set is_admin=true,status='active' where id='d1000000-0000-4000-8000-000000000005';

-- HTML board presentation fixtures; isolated app development DB only.
update public.profiles set nickname='이웃' where id='d1000000-0000-4000-8000-000000000001';
update auth.users set raw_user_meta_data=jsonb_set(raw_user_meta_data,'{nickname}','"이웃"') where id='d1000000-0000-4000-8000-000000000001';
insert into public.business_profiles(id,user_id,business_name,category,short_intro,description,district,address,latitude,longitude,is_public,verification_status,created_at) values('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000003','초록쉼 커피','카페','산책길 옆, 조용한 핸드드립 한 잔','천천히 쉬어가고 싶은 날, 산책길 옆 작은 커피 공간에서 쉬어가세요.','공릉동','공릉동 ○○로 12',37.626,127.073,true,'verified','2026-11-12 12:59:00+09') on conflict(id) do update set business_name=excluded.business_name,short_intro=excluded.short_intro,description=excluded.description,address=excluded.address,created_at=excluded.created_at;
insert into auth.users(id,instance_id,aud,role,phone,phone_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values('d1000000-0000-4000-8000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000006',now(),'{"provider":"phone","providers":["phone"]}','{"role":"business","nickname":"작은문장 서점"}',now(),now()) on conflict(id) do nothing;
insert into public.business_profiles(id,user_id,business_name,category,short_intro,description,district,address,latitude,longitude,is_public,verification_status,created_at) values('d2000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000006','작은문장 서점','서점','동네 작가의 책이 모여 있는 곳','노원에서 활동하는 작가들의 책과 독립출판물을 소개하는 작은 서점이에요.','공릉동','공릉동 ○○길 8',37.627,127.074,true,'verified','2026-11-12 12:58:00+09') on conflict(id) do update set business_name=excluded.business_name,short_intro=excluded.short_intro,description=excluded.description,address=excluded.address,created_at=excluded.created_at;
insert into auth.users(id,instance_id,aud,role,phone,phone_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values('d1000000-0000-4000-8000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000007',now(),'{"provider":"phone","providers":["phone"]}','{"role":"business","nickname":"하루빵집"}',now(),now()) on conflict(id) do nothing;
insert into public.business_profiles(id,user_id,business_name,category,short_intro,description,district,address,latitude,longitude,is_public,verification_status,created_at) values('d2000000-0000-4000-8000-000000000004','d1000000-0000-4000-8000-000000000007','하루빵집','베이커리','매일 아침 굽는 우유식빵','아침마다 첫 빵이 나와요. 우유식빵과 단팥빵이 대표 메뉴예요.','공릉동','공릉동 ○○로 31',37.625,127.075,true,'verified','2026-11-12 12:57:00+09') on conflict(id) do update set business_name=excluded.business_name,short_intro=excluded.short_intro,description=excluded.description,address=excluded.address,created_at=excluded.created_at;
insert into auth.users(id,instance_id,aud,role,phone,phone_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values('d1000000-0000-4000-8000-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000008',now(),'{"provider":"phone","providers":["phone"]}','{"role":"business","nickname":"공릉 손국수"}',now(),now()) on conflict(id) do nothing;
insert into public.business_profiles(id,user_id,business_name,category,short_intro,description,district,address,latitude,longitude,is_public,verification_status,created_at) values('d2000000-0000-4000-8000-000000000005','d1000000-0000-4000-8000-000000000008','공릉 손국수','식당','멸치 육수에 직접 민 칼국수','오랜 동네 단골이 많은 국숫집. 매일 직접 반죽한 면을 써요.','공릉동','공릉동 ○○로 5',37.629,127.072,true,'verified','2026-11-12 12:56:00+09') on conflict(id) do update set business_name=excluded.business_name,short_intro=excluded.short_intro,description=excluded.description,address=excluded.address,created_at=excluded.created_at;
insert into auth.users(id,instance_id,aud,role,phone,phone_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values('d1000000-0000-4000-8000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','821000000009',now(),'{"provider":"phone","providers":["phone"]}','{"role":"business","nickname":"숲길 꽃방"}',now(),now()) on conflict(id) do nothing;
insert into public.business_profiles(id,user_id,business_name,category,short_intro,description,district,address,latitude,longitude,is_public,verification_status,created_at) values('d2000000-0000-4000-8000-000000000006','d1000000-0000-4000-8000-000000000009','숲길 꽃방','꽃집','한 송이도 정성껏 포장해요','계절 꽃을 한 송이부터 포장해드려요.','공릉동','공릉동 ○○길 19',37.624,127.074,true,'verified','2026-11-12 12:55:00+09') on conflict(id) do update set business_name=excluded.business_name,short_intro=excluded.short_intro,description=excluded.description,address=excluded.address,created_at=excluded.created_at;
insert into public.coupons(id,business_id,title,description,benefit_type,benefit_value,terms,total_quantity,start_date,end_date,status,created_at) values('d3000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','음료 1,000원 할인','음료 1잔 주문 시 · 1인 1회 · 중복 할인 불가','fixed_amount','1000','음료 1잔 주문 시 · 1인 1회 · 중복 할인 불가',100,(now() at time zone 'Asia/Seoul')::date-1,(now() at time zone 'Asia/Seoul')::date+30,'approved','2026-11-12 12:58:00+09') on conflict(id) do update set title=excluded.title,description=excluded.description,terms=excluded.terms,created_at=excluded.created_at;
insert into public.coupon_redemption_secrets(coupon_id,code_hash) values('d3000000-0000-4000-8000-000000000001',extensions.crypt('654321',extensions.gen_salt('bf',10))) on conflict(coupon_id) do nothing;
update public.coupons set redemption_code_configured=true where id='d3000000-0000-4000-8000-000000000001';
insert into public.coupons(id,business_id,title,description,benefit_type,benefit_value,terms,total_quantity,start_date,end_date,status,created_at) values('d3000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000004','식빵류 10% 할인','식빵류 구매 시 · 1인 1회','percentage','10','식빵류 구매 시 · 1인 1회',100,(now() at time zone 'Asia/Seoul')::date-1,(now() at time zone 'Asia/Seoul')::date+30,'approved','2026-11-12 12:57:00+09') on conflict(id) do update set title=excluded.title,description=excluded.description,terms=excluded.terms,created_at=excluded.created_at;
insert into public.coupon_redemption_secrets(coupon_id,code_hash) values('d3000000-0000-4000-8000-000000000002',extensions.crypt('654321',extensions.gen_salt('bf',10))) on conflict(coupon_id) do nothing;
update public.coupons set redemption_code_configured=true where id='d3000000-0000-4000-8000-000000000002';
update public.walking_courses set title='걷고, 읽고, 커피 한 잔.',summary='멀리 가지 않아도 충분한 오후. 나만의 속도로 동네를 걸어보세요.' where id='d4000000-0000-4000-8000-000000000001';
update public.walking_course_stops set title=replace(title,' (테스트)',''),description=case position when 1 then '가볍게 걷기' when 2 then '마음에 드는 책 한 권 찾기' else '커피와 함께 쉬어가기' end where course_id='d4000000-0000-4000-8000-000000000001';
update public.walking_course_stops set business_id='d2000000-0000-4000-8000-000000000003',latitude=null,longitude=null where course_id='d4000000-0000-4000-8000-000000000001' and position=2;
insert into public.walking_courses(id,title,summary,district,status,featured,travel_minutes) values('d4000000-0000-4000-8000-000000000002','빵 한 봉지 들고 숲길 피크닉','갓 구운 빵을 사서 숲길 벤치에 앉아보세요.','공릉동','published',false,10) on conflict(id) do nothing;
insert into public.walking_course_stops(course_id,position,title,description,address,stay_minutes,latitude,longitude,business_id) values
('d4000000-0000-4000-8000-000000000002',1,'하루빵집','우유식빵 고르기','',20,null,null,'d2000000-0000-4000-8000-000000000004'),
('d4000000-0000-4000-8000-000000000002',2,'숲길 벤치','빵과 함께 쉬어가기','공릉동 숲길',60,37.624,127.076,null) on conflict(course_id,position) do nothing;

-- S06 board: unavailable examples, excluded from the home available-benefits list.
insert into public.coupons(id,business_id,title,description,benefit_type,benefit_value,terms,total_quantity,claimed_quantity,start_date,end_date,status,redemption_code_configured,created_at) values
('d3000000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000005','곱빼기 무료','칼국수 주문 시 · 1인 1회','other','곱빼기 무료','칼국수 주문 시 · 1인 1회',100,100,(now() at time zone 'Asia/Seoul')::date-1,(now() at time zone 'Asia/Seoul')::date+30,'approved',false,'2026-11-12 12:55:00+09'),
('d3000000-0000-4000-8000-000000000004','d2000000-0000-4000-8000-000000000006','미니 꽃다발 2,000원 할인','미니 꽃다발 구매 시 · 1인 1회','fixed_amount','2000','미니 꽃다발 구매 시 · 1인 1회',100,0,(now() at time zone 'Asia/Seoul')::date-30,(now() at time zone 'Asia/Seoul')::date-1,'approved',false,'2026-11-12 12:54:00+09')
on conflict(id) do nothing;
insert into public.coupon_redemption_secrets(coupon_id,code_hash) values
('d3000000-0000-4000-8000-000000000003',extensions.crypt('654321',extensions.gen_salt('bf',10))),
('d3000000-0000-4000-8000-000000000004',extensions.crypt('654321',extensions.gen_salt('bf',10)))
on conflict(coupon_id) do nothing;
update public.coupons set redemption_code_configured=true where id in ('d3000000-0000-4000-8000-000000000003','d3000000-0000-4000-8000-000000000004');
