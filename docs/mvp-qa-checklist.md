# 노원멤버스 MVP QA 체크리스트

## 계정 준비
- Supabase Auth에서 가게, 크리에이터, 관리자 테스트 계정을 각각 만든다.
- 로컬 테스트에서는 `.env.local`의 `NEXT_PUBLIC_SITE_URL`을 `http://localhost:3003`으로 맞춘다.
- Supabase Dashboard의 Auth URL Configuration에서 Redirect URLs에 `http://localhost:3003/auth/callback`을 허용한다.
- 최초 관리자 계정은 Supabase SQL Editor에서 아래 쿼리로 지정한다.

```sql
update public.profiles
set role = 'admin', status = 'active'
where email = '관리자이메일@example.com';
```

## 핵심 운영 흐름
- 가게 계정으로 로그인한 뒤 `/business/dashboard`에서 가게 프로필을 저장한다.
- `/business/campaigns/new`에서 캠페인을 만들고 상태가 `in_review`로 저장되는지 확인한다.
- 관리자 계정으로 `/admin`에 접속해 캠페인을 승인하고 공개 목록에 노출되는지 확인한다.
- 크리에이터 계정으로 `/creator/profile`을 저장한 뒤 공개 캠페인에 지원한다.
- 관리자가 지원자를 `recommended`로 표시한다.
- 가게가 `/business/dashboard`에서 추천 지원자를 최종 선정해 협업을 생성한다.
- 크리에이터가 `/creator/dashboard`에서 콘텐츠 URL을 제출한다.
- 관리자가 제출물을 승인한 뒤 로컬 스토리로 발행한다.
- `/stories`에서 발행된 로컬 스토리가 공개되는지 확인한다.

## 화면 확인
- 홈, 캠페인 목록, 캠페인 상세, 지원 폼, 가게 대시보드, 크리에이터 대시보드, 관리자 화면을 모바일과 데스크톱 폭에서 확인한다.
- 버튼 클릭 후 오류가 있으면 URL의 `error` 파라미터와 Supabase Table Editor의 행 상태를 함께 확인한다.
