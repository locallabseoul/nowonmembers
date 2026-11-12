begin;
select plan(19);
insert into auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('f1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','coupon-owner-local@example.com','{"provider":"email"}','{"role":"business","nickname":"쿠폰 주인"}',now(),now()),
 ('f1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','coupon-member-local@example.com','{"provider":"email"}','{"role":"resident","nickname":"쿠폰 회원"}',now(),now()),
 ('f1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','coupon-other-local@example.com','{"provider":"email"}','{"role":"resident","nickname":"다른 회원"}',now(),now());
insert into public.business_profiles(id,user_id,business_name,category,is_public)
values('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','비공개 가게 쿠폰','테스트',false);
insert into public.coupons(id,business_id,title,benefit_type,benefit_value,terms,total_quantity,start_date,end_date,status,admin_memo)
values('f3000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','권한 테스트','fixed_amount','1000','조건',2,(now() at time zone 'Asia/Seoul')::date-1,(now() at time zone 'Asia/Seoul')::date+1,'approved','PRIVATE ADMIN MEMO');
insert into public.legal_acceptances(user_id,document_type,document_version,source) values('f1000000-0000-4000-8000-000000000002','terms','2026-08-18-v2','signup');
set local role anon;
select is((select count(*) from public.coupons where id='f3000000-0000-4000-8000-000000000001'),0::bigint,'anon cannot read raw coupon/admin memo');
select is((select title from public.get_public_coupons('f3000000-0000-4000-8000-000000000001')),'권한 테스트','approved coupon remains public independently of shop visibility');
select ok(not (select to_jsonb(c) ? 'admin_memo' from public.get_public_coupons('f3000000-0000-4000-8000-000000000001') c),'public projection excludes memo');
select ok(not has_function_privilege('anon','public.get_my_coupon_claims()','execute'),'anon cannot call own history');
set local role authenticated;
set local "request.jwt.claims"='{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select admin_memo from public.coupons where id='f3000000-0000-4000-8000-000000000001'),'PRIVATE ADMIN MEMO','owner management retains memo access');
select public.set_coupon_redemption_code('f3000000-0000-4000-8000-000000000001','654321');
set local "request.jwt.claims"='{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*) from public.coupons where id='f3000000-0000-4000-8000-000000000001'),0::bigint,'resident cannot read raw memo');
select public.claim_coupon('f3000000-0000-4000-8000-000000000001');
select throws_ok($$select public.claim_coupon('f3000000-0000-4000-8000-000000000001')$$,'이미 받은 쿠폰입니다.','duplicate issue rejected');
select is((select count(*) from public.get_my_coupon_claims()),1::bigint,'own claim available despite private business');
select ok(not (select coupon ? 'admin_memo' from public.get_my_coupon_claims()),'own history excludes memo');
select ok(not (select coupon ? 'code_hash' from public.get_my_coupon_claims()),'own history excludes code hash');
select ok(not has_table_privilege('authenticated','public.coupon_redemption_secrets','select'),'secret table inaccessible');
set local "request.jwt.claims"='{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select count(*) from public.get_my_coupon_claims()),0::bigint,'other member sees no history');
reset role;
update public.coupons set status='cancelled' where id='f3000000-0000-4000-8000-000000000001';
set local role authenticated;
set local "request.jwt.claims"='{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*) from public.get_public_coupons('f3000000-0000-4000-8000-000000000001')),0::bigint,'withdrawn coupon absent publicly');
select is((select coupon->>'status' from public.get_my_coupon_claims()),'cancelled','withdrawn coupon remains in own history');
select throws_ok($$select public.redeem_my_coupon_claim((select id from public.get_my_coupon_claims() limit 1),'654321')$$,'사용할 수 없는 쿠폰입니다.','withdrawn coupon cannot be used');
select lives_ok($$select public.cancel_coupon_claim((select id from public.get_my_coupon_claims() limit 1))$$,'unused withdrawn coupon can be returned');
select is((select status::text from public.get_my_coupon_claims()),'cancelled','returned claim remains in history');
reset role;
update public.profiles set status='suspended' where id='f1000000-0000-4000-8000-000000000003';
set local role authenticated;
set local "request.jwt.claims"='{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select throws_ok($$select public.claim_coupon('f3000000-0000-4000-8000-000000000001')$$,'활성 회원만 쿠폰을 받을 수 있습니다.','suspended member cannot claim');
reset role;
set local "request.jwt.claims"='{}';
update public.profiles set is_admin=true,status='active' where id='f1000000-0000-4000-8000-000000000003';
set local role authenticated;
set local "request.jwt.claims"='{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select is((select admin_memo from public.coupons where id='f3000000-0000-4000-8000-000000000001'),'PRIVATE ADMIN MEMO','admin management remains available');
select * from finish();
rollback;
