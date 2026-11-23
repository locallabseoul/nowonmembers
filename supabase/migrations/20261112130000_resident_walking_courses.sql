-- Editorial walking courses. Only validated RPCs mutate these tables.
create table public.walking_courses (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(btrim(title)) between 1 and 120),
 summary text not null check(length(btrim(summary)) between 1 and 1000),
 district text not null check(district in ('공릉동','월계동','하계동','중계동','상계동')),
 cover_url text check(cover_url is null or (length(cover_url)<=2000 and cover_url ~ '^https://')),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 featured boolean not null default false,
 sort_order integer not null default 0 check(sort_order between 0 and 9999),
 travel_minutes integer not null default 0 check(travel_minutes between 0 and 1440),
 updated_at timestamptz not null default clock_timestamp()
);
create table public.walking_course_stops (
 course_id uuid not null references public.walking_courses(id) on delete cascade,
 position integer not null check(position between 1 and 20),
 title text not null check(length(btrim(title)) between 1 and 120),
 description text not null default '' check(length(description)<=1000),
 address text not null default '' check(length(address)<=300),
 stay_minutes integer not null check(stay_minutes between 0 and 1440),
 latitude double precision check(latitude between -90 and 90),
 longitude double precision check(longitude between -180 and 180),
 business_id uuid references public.business_profiles(id) on delete restrict,
 primary key(course_id,position),
 check((latitude is null)=(longitude is null))
);
create table public.resident_saved_courses (
 user_id uuid not null references public.profiles(id) on delete cascade,
 course_id uuid not null references public.walking_courses(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,course_id)
);
create index resident_saved_courses_course_idx on public.resident_saved_courses(course_id);
alter table public.walking_courses enable row level security;
alter table public.walking_course_stops enable row level security;
alter table public.resident_saved_courses enable row level security;
create policy "admins read courses" on public.walking_courses for select to authenticated using(public.is_admin());
create policy "admins read stops" on public.walking_course_stops for select to authenticated using(public.is_admin());
create policy "members read own saved courses" on public.resident_saved_courses for select to authenticated using(user_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and status='active'));
revoke all on public.walking_courses,public.walking_course_stops,public.resident_saved_courses from public,anon,authenticated;
grant select on public.walking_courses,public.walking_course_stops,public.resident_saved_courses to authenticated;

create function public.get_resident_courses(target_course_id uuid default null, target_districts text[] default null, featured_only boolean default false, page_size integer default 20, page_offset integer default 0)
returns jsonb language sql stable security definer set search_path=''
as $$
 select coalesce(jsonb_agg(row_data order by featured desc, sort_order, id),'[]'::jsonb) from (
 select c.id,c.featured,c.sort_order,jsonb_build_object(
 'id',c.id,'title',c.title,'summary',c.summary,'district',c.district,'cover_url',c.cover_url,
 'featured',c.featured,'updated_at',c.updated_at,'travel_minutes',c.travel_minutes,
 'stops',coalesce((select jsonb_agg(jsonb_build_object(
 'position',s.position,'available',s.business_id is null or (b.is_public and p.status='active'),
 'business_id',case when b.is_public and p.status='active' then b.id end,
 'title',case when s.business_id is null then s.title when b.is_public and p.status='active' then b.business_name else '현재 공개되지 않은 가게' end,
 'description',case when s.business_id is null or (b.is_public and p.status='active') then s.description end,
 'address',case when s.business_id is null then s.address when b.is_public and p.status='active' then concat_ws(' ',b.address,b.address_detail) end,
 'stay_minutes',s.stay_minutes,
 'latitude',case when s.business_id is null then s.latitude when b.is_public and p.status='active' then b.latitude end,
 'longitude',case when s.business_id is null then s.longitude when b.is_public and p.status='active' then b.longitude end
 ) order by s.position) from public.walking_course_stops s
 left join public.business_profiles b on b.id=s.business_id left join public.profiles p on p.id=b.user_id where s.course_id=c.id),'[]'::jsonb)
 ) row_data from public.walking_courses c
 where c.status='published' and (target_course_id is null or c.id=target_course_id)
 and (target_districts is null or c.district=any(target_districts))
 and (not coalesce(featured_only,false) or c.featured)
 order by c.featured desc,c.sort_order,c.id limit greatest(1,least(coalesce(page_size,20),100)) offset greatest(0,coalesce(page_offset,0))
 ) results;
$$;

create function public.get_resident_saved_courses()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception '활성 회원으로 로그인해주세요.'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'available',c.status='published',
 'title',case when c.status='published' then c.title end,'district',case when c.status='published' then c.district end) order by s.created_at desc,c.id),'[]'::jsonb)
 from public.resident_saved_courses s join public.walking_courses c on c.id=s.course_id where s.user_id=auth.uid());
end;
$$;
create function public.set_resident_saved_course(target_course_id uuid,saved boolean)
returns void language plpgsql security definer set search_path=''
as $$
begin
 perform 1 from public.profiles where id=auth.uid() and status='active' for update;
 if not found then raise exception '활성 회원으로 로그인해주세요.'; end if;
 if saved is null or target_course_id is null then raise exception '코스를 확인해주세요.'; end if;
 if saved then
   perform 1 from public.walking_courses where id=target_course_id and status='published' for share;
   if not found then raise exception '현재 공개된 코스만 저장할 수 있어요.'; end if;
   insert into public.resident_saved_courses(user_id,course_id) values(auth.uid(),target_course_id) on conflict do nothing;
 else delete from public.resident_saved_courses where user_id=auth.uid() and course_id=target_course_id;
 end if;
end;
$$;

create function public.admin_save_walking_course(payload jsonb)
returns uuid language plpgsql security definer set search_path=''
as $$
declare cid uuid; existing timestamptz; item jsonb; seq integer:=0; n integer;
begin
 if not public.is_admin() then raise exception '관리자만 코스를 변경할 수 있어요.'; end if;
 if jsonb_typeof(payload->'stops') is distinct from 'array' then raise exception '장소 목록을 확인해주세요.'; end if;
 n:=jsonb_array_length(payload->'stops');
 if n>20 or (payload->>'status'='published' and n<2) then raise exception '공개 코스에는 2~20개의 장소가 필요합니다.'; end if;
 cid:=nullif(payload->>'id','')::uuid;
 if cid is not null then
  select updated_at into existing from public.walking_courses where id=cid for update;
  if not found then raise exception '코스를 찾을 수 없습니다.'; end if;
  if nullif(payload->>'updated_at','')::timestamptz is distinct from existing then raise exception '다른 변경이 있습니다. 새로고침 후 다시 수정해주세요.'; end if;
 else cid:=gen_random_uuid(); end if;
 insert into public.walking_courses(id,title,summary,district,cover_url,status,featured,sort_order,travel_minutes)
 values(cid,btrim(payload->>'title'),btrim(payload->>'summary'),payload->>'district',nullif(payload->>'cover_url',''),payload->>'status',coalesce((payload->>'featured')::boolean,false),coalesce((payload->>'sort_order')::integer,0),coalesce((payload->>'travel_minutes')::integer,0))
 on conflict(id) do update set title=excluded.title,summary=excluded.summary,district=excluded.district,cover_url=excluded.cover_url,status=excluded.status,featured=excluded.featured,sort_order=excluded.sort_order,travel_minutes=excluded.travel_minutes,updated_at=clock_timestamp();
 delete from public.walking_course_stops where course_id=cid;
 for item in select value from jsonb_array_elements(payload->'stops') loop
  seq:=seq+1;
  if payload->>'status'='published' and nullif(item->>'business_id','') is not null and not exists(
   select 1 from public.business_profiles b join public.profiles p on p.id=b.user_id where b.id=(item->>'business_id')::uuid and b.is_public and p.status='active'
  ) then raise exception '비공개 가게가 연결되어 있어 공개할 수 없습니다.'; end if;
  insert into public.walking_course_stops(course_id,position,title,description,address,stay_minutes,latitude,longitude,business_id)
  values(cid,seq,btrim(item->>'title'),coalesce(item->>'description',''),coalesce(item->>'address',''),coalesce((item->>'stay_minutes')::integer,0),nullif(item->>'latitude','')::double precision,nullif(item->>'longitude','')::double precision,nullif(item->>'business_id','')::uuid);
 end loop;
 return cid;
end;
$$;
revoke all on function public.get_resident_courses(uuid,text[],boolean,integer,integer) from public;
grant execute on function public.get_resident_courses(uuid,text[],boolean,integer,integer) to anon,authenticated;
revoke all on function public.get_resident_saved_courses(),public.set_resident_saved_course(uuid,boolean),public.admin_save_walking_course(jsonb) from public,anon;
grant execute on function public.get_resident_saved_courses(),public.set_resident_saved_course(uuid,boolean),public.admin_save_walking_course(jsonb) to authenticated;
