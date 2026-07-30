-- creator_profiles.deadline_rate는 컬럼만 있고 값을 채우는 곳이 없어 항상 0%로 보였다.
-- 크리에이터 프로필에 "기한 준수율 0%"가 박혀 있고, 가게가 선정할 때 참고할 수도 없었다.
--
-- 기준은 화면 안내와 맞춘다. 제출 화면은 게시일이 제출 마감일보다 늦으면 "지연 제출로
-- 확인될 수 있습니다"라고 경고하므로, 여기서도 게시일과 마감일을 비교한다.
--
-- 협업 하나당 가장 최근 제출 한 건만 센다. 수정 요청을 받아 다시 제출한 경우 마지막
-- 결과가 그 협업의 기록이다.

create or replace function public.recalculate_creator_deadline_rate(target_creator_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_count integer;
  on_time_count integer;
begin
  select
    count(*),
    count(*) filter (
      where latest.published_at is not null
        and collaborations.submission_due is not null
        and latest.published_at <= collaborations.submission_due
    )
  into total_count, on_time_count
  from public.collaborations
  join lateral (
    select content_submissions.published_at
    from public.content_submissions
    where content_submissions.collaboration_id = collaborations.id
    order by content_submissions.created_at desc
    limit 1
  ) latest on true
  where collaborations.creator_id = target_creator_id;

  update public.creator_profiles
  set
    deadline_rate = case when total_count > 0 then round(on_time_count::numeric * 100 / total_count) else 0 end,
    updated_at = now()
  where id = target_creator_id;
end;
$$;

create or replace function public.refresh_deadline_rate_on_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_creator_id uuid;
begin
  select collaborations.creator_id
  into target_creator_id
  from public.collaborations
  where collaborations.id = new.collaboration_id;

  perform public.recalculate_creator_deadline_rate(target_creator_id);

  return new;
exception
  -- 지표 계산이 실패해도 제출 자체를 되돌리지 않는다.
  when others then
    raise warning 'refresh_deadline_rate_on_submission failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists refresh_deadline_rate_on_submission on public.content_submissions;
create trigger refresh_deadline_rate_on_submission
after insert or update of published_at on public.content_submissions
for each row execute function public.refresh_deadline_rate_on_submission();

-- 이미 쌓인 제출 기록으로 한 번 채운다.
do $$
declare
  creator record;
begin
  for creator in select id from public.creator_profiles loop
    perform public.recalculate_creator_deadline_rate(creator.id);
  end loop;
end;
$$;

revoke all on function public.recalculate_creator_deadline_rate(uuid) from public;
