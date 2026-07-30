-- 20260730120000이 잘못 적용됐다. notifications 테이블은 MVP 초기(20260703010000)부터
-- 있었는데 이를 확인하지 않고 다른 구조로 새로 만들려 했고, create table if not exists가
-- 조용히 건너뛰면서 트리거와 정책만 기존 테이블에 붙었다.
--
-- 그 결과 트리거가 존재하지 않는 컬럼(body, link, campaign_id)에 INSERT를 시도해
-- campaigns, campaign_applications, collaborations, content_submissions에 대한 모든
-- 쓰기가 실패했다. 먼저 원래대로 되돌린다.

drop trigger if exists notify_business_on_application on public.campaign_applications;
drop trigger if exists notify_business_on_campaign_status on public.campaigns;
drop trigger if exists notify_creator_on_selection on public.collaborations;
drop trigger if exists notify_on_submission_change on public.content_submissions;

drop function if exists public.notify_business_on_application();
drop function if exists public.notify_business_on_campaign_status();
drop function if exists public.notify_creator_on_selection();
drop function if exists public.notify_on_submission_change();
drop function if exists public.create_notification(uuid, text, text, text, text, uuid);
drop function if exists public.mark_notifications_read(uuid[]);

drop index if exists public.notifications_user_created_idx;
drop index if exists public.notifications_user_unread_idx;

drop policy if exists "users update own notifications" on public.notifications;

-- 20260703040000이 만든 원래 정책을 되살린다. 관리자도 읽을 수 있어야 한다.
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
for select using (user_id = auth.uid() or public.is_admin());
