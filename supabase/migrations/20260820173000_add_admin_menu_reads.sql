create table public.admin_menu_reads (
  admin_id uuid not null references public.profiles(id) on delete cascade,
  menu_key text not null check (menu_key in ('campaigns', 'coupons', 'submissions', 'notifications')),
  last_seen_at timestamptz not null default now(),
  primary key (admin_id, menu_key)
);

alter table public.admin_menu_reads enable row level security;

create policy "admins manage own menu reads" on public.admin_menu_reads
for all using (admin_id = auth.uid() and public.is_admin())
with check (admin_id = auth.uid() and public.is_admin());

create or replace function public.mark_admin_menu_read(target_menu_key text, target_seen_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 메뉴 읽음 상태를 변경할 수 있습니다.';
  end if;
  if target_menu_key not in ('campaigns', 'coupons', 'submissions', 'notifications') then
    raise exception '알 수 없는 관리자 메뉴입니다.';
  end if;

  insert into public.admin_menu_reads (admin_id, menu_key, last_seen_at)
  values (auth.uid(), target_menu_key, least(target_seen_at, now()))
  on conflict (admin_id, menu_key) do update
  set last_seen_at = greatest(admin_menu_reads.last_seen_at, excluded.last_seen_at);
end;
$$;

revoke all on function public.mark_admin_menu_read(text, timestamptz) from public;
grant execute on function public.mark_admin_menu_read(text, timestamptz) to authenticated;

-- 배포 전에 쌓인 데이터가 한꺼번에 새 항목으로 표시되지 않도록 현재를 최초 기준점으로 삼는다.
insert into public.admin_menu_reads (admin_id, menu_key, last_seen_at)
select profiles.id, menu_keys.menu_key, now()
from public.profiles
cross join (values ('campaigns'), ('coupons'), ('submissions'), ('notifications')) as menu_keys(menu_key)
where profiles.is_admin;

create or replace function public.sync_admin_menu_reads()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin then
    insert into public.admin_menu_reads (admin_id, menu_key, last_seen_at)
    select new.id, menu_key, now()
    from (values ('campaigns'), ('coupons'), ('submissions'), ('notifications')) as menu_keys(menu_key)
    on conflict (admin_id, menu_key) do nothing;
  end if;
  return new;
end;
$$;

create trigger sync_admin_menu_reads_after_profile_change
after insert or update of is_admin on public.profiles
for each row execute function public.sync_admin_menu_reads();
