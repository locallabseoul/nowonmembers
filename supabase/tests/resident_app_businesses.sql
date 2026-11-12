begin;
select plan(9);
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('e1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','app-public@example.com','',now(),'{"provider":"email"}','{"role":"business","nickname":"공개조회검증1"}',now(),now()),
 ('e1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','app-private@example.com','',now(),'{"provider":"email"}','{"role":"business","nickname":"공개조회검증2"}',now(),now()),
 ('e1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','app-suspended@example.com','',now(),'{"provider":"email"}','{"role":"business","nickname":"공개조회검증3"}',now(),now());
update public.profiles set status='suspended' where id='e1000000-0000-4000-8000-000000000003';
insert into public.business_profiles (id,user_id,business_name,category,is_public)
values
 ('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','공개조회검증 가게','테스트',true),
 ('e2000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000002','비공개조회검증 가게','테스트',false),
 ('e2000000-0000-4000-8000-000000000003','e1000000-0000-4000-8000-000000000003','정지조회검증 가게','테스트',true);

set local role anon;
set local "request.jwt.claims"='{"role":"anon"}';
select is((select business_name from public.get_resident_app_businesses('e2000000-0000-4000-8000-000000000001')), '공개조회검증 가게', 'anon can read explicitly public shop');
select is((select count(*) from public.get_resident_app_businesses('e2000000-0000-4000-8000-000000000002')),0::bigint,'private shop excluded by ID');
select is((select count(*) from public.get_resident_app_businesses('e2000000-0000-4000-8000-000000000003')),0::bigint,'suspended owner excluded');
select ok(not exists(select 1 from public.get_resident_app_businesses() where id='e2000000-0000-4000-8000-000000000002'),'private shop excluded from list');
select ok(not (select to_jsonb(b) ? 'user_id' from public.get_resident_app_businesses('e2000000-0000-4000-8000-000000000001') b),'owner identity omitted');
select ok(not (select to_jsonb(b) ? 'verification_status' from public.get_resident_app_businesses('e2000000-0000-4000-8000-000000000001') b),'operational status omitted');
select is((select count(*) from public.get_resident_app_businesses(null,1,0)),1::bigint,'page size applied');
select is((select count(*) from public.get_resident_app_businesses('e2000000-0000-4000-8000-000000000001',1,1)),0::bigint,'offset applied');
set local role authenticated;
set local "request.jwt.claims"='{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*) from public.get_resident_app_businesses('e2000000-0000-4000-8000-000000000002')),0::bigint,'even owner gets public-only projection');
select * from finish();
rollback;
