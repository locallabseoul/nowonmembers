-- 운영 중 문제를 재구성할 수 있도록 주요 이벤트(특히 실패)를 기록한다.
-- 가게 프로필 등록 실패를 로그 없이 추적하지 못했던 일이 계기다.
-- 쓰기는 서버(서비스 롤)에서만 하므로 insert 정책은 두지 않고, 조회는 관리자만 한다.
create table public.app_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  -- 탈퇴해도 이벤트 자체는 남기되 누구였는지는 지운다.
  user_id uuid references public.profiles(id) on delete set null,
  event text not null,
  context jsonb not null default '{}'::jsonb
);

create index app_events_occurred_at_idx on public.app_events (occurred_at desc);
create index app_events_event_idx on public.app_events (event, occurred_at desc);
create index app_events_user_idx on public.app_events (user_id, occurred_at desc);

alter table public.app_events enable row level security;

create policy "admins read app events" on public.app_events
for select using (public.is_admin());
