-- 크리에이터가 매장에 연락해 방문 일정을 정해도 남길 곳이 없어 visit_date가 계속
-- 비어 있었다. 크리에이터는 협업을 읽기만 할 수 있으므로, UPDATE 정책을 넓히는 대신
-- 방문일 하나만 바꾸는 함수를 연다. 상태나 제출 기한은 건드릴 수 없다.

create or replace function public.set_collaboration_visit_date(
  target_collaboration_id uuid,
  target_visit_date date
)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  if not public.current_user_has_role('creator') then
    raise exception '크리에이터 계정만 방문 일정을 기록할 수 있습니다.';
  end if;

  select
    collaborations.id,
    collaborations.status,
    collaborations.submission_due,
    creator_profiles.user_id
  into target
  from public.collaborations
  join public.creator_profiles on creator_profiles.id = collaborations.creator_id
  where collaborations.id = target_collaboration_id
  for update of collaborations;

  if not found or target.user_id <> auth.uid() then
    raise exception '협업을 찾을 수 없습니다.';
  end if;

  if target.status in ('completed', 'cancelled', 'no_show') then
    raise exception '종료된 협업의 방문 일정은 변경할 수 없습니다.';
  end if;

  if target_visit_date is null then
    raise exception '방문 날짜를 선택해주세요.';
  end if;

  -- 방문한 뒤에 콘텐츠를 만들어 제출하므로 제출 기한보다 늦을 수 없다.
  if target.submission_due is not null and target_visit_date > target.submission_due then
    raise exception '방문 예정일은 콘텐츠 등록 마감일보다 늦을 수 없습니다.';
  end if;

  update public.collaborations
  set visit_date = target_visit_date
  where id = target_collaboration_id;

  return target_visit_date;
end;
$$;

revoke all on function public.set_collaboration_visit_date(uuid, date) from public;
grant execute on function public.set_collaboration_visit_date(uuid, date) to authenticated;

-- creator_profiles.completion_rate도 deadline_rate와 마찬가지로 아무도 채우지 않아
-- 항상 0이었다. 같은 함수에서 함께 계산한다. 선정된 협업 중 콘텐츠 승인까지 끝낸
-- 비율이다.
create or replace function public.recalculate_creator_deadline_rate(target_creator_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  submitted_count integer;
  on_time_count integer;
  total_collaborations integer;
  approved_count integer;
begin
  select
    count(*),
    count(*) filter (
      where latest.published_at is not null
        and collaborations.submission_due is not null
        and latest.published_at <= collaborations.submission_due
    )
  into submitted_count, on_time_count
  from public.collaborations
  join lateral (
    select content_submissions.published_at
    from public.content_submissions
    where content_submissions.collaboration_id = collaborations.id
    order by content_submissions.created_at desc
    limit 1
  ) latest on true
  where collaborations.creator_id = target_creator_id;

  select
    count(*) filter (where collaborations.status <> 'cancelled'),
    count(*) filter (where collaborations.status = 'completed')
  into total_collaborations, approved_count
  from public.collaborations
  where collaborations.creator_id = target_creator_id;

  update public.creator_profiles
  set
    deadline_rate = case when submitted_count > 0 then round(on_time_count::numeric * 100 / submitted_count) else 0 end,
    completion_rate = case when total_collaborations > 0 then round(approved_count::numeric * 100 / total_collaborations) else 0 end,
    updated_at = now()
  where id = target_creator_id;
end;
$$;

-- 협업 상태가 바뀌면 완료율도 다시 센다.
create or replace function public.refresh_completion_rate_on_collaboration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_creator_deadline_rate(new.creator_id);
  return new;
exception
  when others then
    raise warning 'refresh_completion_rate_on_collaboration failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists refresh_completion_rate_on_collaboration on public.collaborations;
create trigger refresh_completion_rate_on_collaboration
after insert or update of status on public.collaborations
for each row execute function public.refresh_completion_rate_on_collaboration();

do $$
declare
  creator record;
begin
  for creator in select id from public.creator_profiles loop
    perform public.recalculate_creator_deadline_rate(creator.id);
  end loop;
end;
$$;
