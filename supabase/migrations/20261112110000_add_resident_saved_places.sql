-- Personal resident-app preferences, shared by account across devices.
create table public.resident_interested_districts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  district text not null check (district in ('공릉동','월계동','하계동','중계동','상계동')),
  created_at timestamptz not null default now(),
  primary key(user_id,district)
);
create table public.resident_favorite_businesses (
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,business_id)
);
create index resident_favorite_business_idx on public.resident_favorite_businesses(business_id);
alter table public.resident_interested_districts enable row level security;
alter table public.resident_favorite_businesses enable row level security;
create policy "active members read own interested districts"
on public.resident_interested_districts for select to authenticated
using (user_id = auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active'));
create policy "active members read own favorite businesses"
on public.resident_favorite_businesses for select to authenticated
using (user_id = auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active'));
-- Changes must use the validated, identity-bound RPCs below.
revoke all on public.resident_interested_districts, public.resident_favorite_businesses from public, anon, authenticated;
grant select on public.resident_interested_districts, public.resident_favorite_businesses to authenticated;

create function public.set_resident_interested_districts(target_districts text[])
returns void language plpgsql security definer set search_path = ''
as $$
declare member_id uuid := auth.uid();
begin
  -- Serializes writes for the same member, including whole-set replacement.
  perform 1 from public.profiles p where p.id=member_id and p.status='active' for update;
  if not found then raise exception '활성 회원으로 로그인해주세요.'; end if;
  if target_districts is null or cardinality(target_districts)>5
    or exists(select 1 from unnest(target_districts) d where d is null or d not in ('공릉동','월계동','하계동','중계동','상계동')) then
    raise exception '관심 동네는 노원의 5개 동네 중에서 선택해주세요.';
  end if;
  delete from public.resident_interested_districts where user_id=member_id;
  insert into public.resident_interested_districts(user_id,district)
  select member_id,d from (select distinct unnest(target_districts) as d) districts;
end;
$$;

create function public.set_resident_favorite_business(target_business_id uuid, saved boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare member_id uuid := auth.uid();
begin
  perform 1 from public.profiles p where p.id=member_id and p.status='active' for update;
  if not found then raise exception '활성 회원으로 로그인해주세요.'; end if;
  if target_business_id is null or saved is null then raise exception '가게와 저장 여부를 확인해주세요.'; end if;
  if saved then
    if not exists(select 1 from public.business_profiles b join public.profiles owner on owner.id=b.user_id
      where b.id=target_business_id and b.is_public and owner.status='active') then
      raise exception '현재 공개된 가게만 단골로 저장할 수 있어요.';
    end if;
    insert into public.resident_favorite_businesses(user_id,business_id) values(member_id,target_business_id)
    on conflict(user_id,business_id) do nothing;
  else
    -- Hidden shops can still be removed; no hidden shop fields are read.
    delete from public.resident_favorite_businesses where user_id=member_id and business_id=target_business_id;
  end if;
end;
$$;

create function public.get_resident_saved_places()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare member_id uuid := auth.uid(); result jsonb;
begin
  if not exists(select 1 from public.profiles p where p.id=member_id and p.status='active') then
    raise exception '활성 회원으로 로그인해주세요.';
  end if;
  select jsonb_build_object(
    'districts',coalesce((select jsonb_agg(d.district order by d.district)
      from public.resident_interested_districts d where d.user_id=member_id),'[]'::jsonb),
    'favorites',coalesce((select jsonb_agg(jsonb_build_object(
      'business_id',f.business_id, 'is_available',b.is_public and owner.status='active',
      'business_name',case when b.is_public and owner.status='active' then b.business_name end,
      'category',case when b.is_public and owner.status='active' then b.category end,
      'district',case when b.is_public and owner.status='active' then b.district end
    ) order by f.created_at desc,f.business_id)
      from public.resident_favorite_businesses f
      join public.business_profiles b on b.id=f.business_id
      join public.profiles owner on owner.id=b.user_id
      where f.user_id=member_id),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.set_resident_interested_districts(text[]) from public,anon;
revoke all on function public.set_resident_favorite_business(uuid,boolean) from public,anon;
revoke all on function public.get_resident_saved_places() from public,anon;
grant execute on function public.set_resident_interested_districts(text[]) to authenticated;
grant execute on function public.set_resident_favorite_business(uuid,boolean) to authenticated;
grant execute on function public.get_resident_saved_places() to authenticated;
