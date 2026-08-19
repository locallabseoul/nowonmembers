-- 관리자가 가게 프로필 작성을 대행할 때 대표 이미지를 대상 가게 폴더로 올린다.
-- 기존 정책은 "본인 폴더 + business 역할"만 허용해서, 크리에이터 계정에 관리자
-- 플래그가 붙은 운영자의 대행 업로드가 RLS에서 거부됐다.
drop policy if exists "business users upload business images" on storage.objects;
create policy "business users upload business images" on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-images'
  and (
    (
      (storage.foldername(name))[1] = auth.uid()::text
      and public.current_user_has_role('business'::public.user_role)
    )
    or public.is_admin()
  )
);

-- 저장 실패 시 방금 올린 임시 이미지를 지우는 정리 경로도 관리자에게 열어준다.
drop policy if exists "business users delete own business images" on storage.objects;
create policy "business users delete own business images" on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-images'
  and owner = auth.uid()
  and (public.current_user_has_role('business'::public.user_role) or public.is_admin())
);
