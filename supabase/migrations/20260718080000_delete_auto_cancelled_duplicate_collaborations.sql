delete from public.collaborations
where status = 'cancelled'
  and cancellation_reason = '중복 협업 자동 정리'
  and not exists (
    select 1
    from public.content_submissions
    where content_submissions.collaboration_id = collaborations.id
  );
