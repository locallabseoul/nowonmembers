begin;
select no_plan();
insert into auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select ('c8100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','filter-'||n||'@example.com','{"provider":"email"}'::jsonb,jsonb_build_object('role','business','nickname','필터검증'||n),now(),now() from generate_series(1,3) n;
insert into public.business_profiles(id,user_id,business_name,category,is_public,district,latitude,longitude,created_at)
values
('c8200000-0000-4000-8000-000000000001','c8100000-0000-4000-8000-000000000001','필터 공릉','테스트',true,'공릉동',37.626,127.073,'2099-01-01'),
('c8200000-0000-4000-8000-000000000002','c8100000-0000-4000-8000-000000000002','필터 월계','테스트',true,'월계동',null,null,'2099-01-02'),
('c8200000-0000-4000-8000-000000000003','c8100000-0000-4000-8000-000000000003','필터 비공개','테스트',false,'공릉동',37.626,127.073,'2099-01-03');
set local role anon;
select is((select business_name from public.search_resident_app_businesses(null,1,0,array['공릉동'])),'필터 공릉','district filter applied before pagination');
select is((select business_name from public.search_resident_app_businesses(null,1,0,array['월계동'])),'필터 월계','filter retrieves other district');
select is((select count(*) from public.search_resident_app_businesses('c8200000-0000-4000-8000-000000000001',20,0,array['월계동'])),0::bigint,'ID cannot bypass filter');
select is((select count(*) from public.search_resident_app_businesses(null,20,0,array[]::text[])),0::bigint,'empty interested districts means no results');
select is((select count(*) from public.search_resident_app_businesses(null,20,0,array['other'])),0::bigint,'unknown district yields no results');
select is((select business_name from public.search_resident_app_businesses(null,1,1,array['공릉동','월계동'])),'필터 공릉','multi district pagination order stable');
select is((select count(*) from public.search_resident_app_businesses('c8200000-0000-4000-8000-000000000003',20,0,null)),0::bigint,'private shops never appear');
select is((select latitude from public.search_resident_app_businesses('c8200000-0000-4000-8000-000000000001')),37.626::numeric,'coordinates returned for markers');
select is((select latitude from public.search_resident_app_businesses('c8200000-0000-4000-8000-000000000002')),null::numeric,'coordinate-free shop remains in list');
select ok(not(select to_jsonb(b)?'user_id' from public.search_resident_app_businesses('c8200000-0000-4000-8000-000000000001') b),'projection excludes owner identity');
reset role;
update public.profiles set status='suspended' where id='c8100000-0000-4000-8000-000000000001';
set local role anon;
select is((select count(*) from public.search_resident_app_businesses('c8200000-0000-4000-8000-000000000001',20,0,array['공릉동'])),0::bigint,'suspended owner excluded');
select * from finish();
rollback;
