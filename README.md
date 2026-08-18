# 노원멤버스 MVP

노원의 가게와 지역 크리에이터를 연결하는 로컬 콘텐츠 협업 MVP입니다.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth / Database / Storage 준비
- 토스페이먼츠 일반결제 기반 캠페인 포인트 충전

## 구현 범위

- 공개 홈, 캠페인 목록/상세, 로컬 스토리
- 크리에이터 프로필, 마이페이지, 콘텐츠 제출
- 가게 캠페인 생성, 가게 대시보드
- 관리자 검수/추천/제출 확인 대시보드
- Supabase MVP 스키마와 RLS 초안

## 실행

```bash
npm install
npm run dev
```

Supabase 연결 시 `.env.example`을 기준으로 `.env.local`을 만들고 마이그레이션을 적용합니다.

```bash
supabase db push
```

SMS 발송 없이 회원가입 흐름을 확인하려면 로컬 개발 환경이나 Vercel Preview의
서버 전용 환경변수에 테스트 번호를 등록합니다. 쉼표로 여러 번호를 허용할 수
있으며, 운영 배포에서는 이 설정이 있어도 인증 우회가 동작하지 않습니다.

```bash
AUTH_TEST_PHONE_BYPASS_ENABLED=true
AUTH_TEST_PHONE_NUMBERS=01000000001,01000000002
SUPABASE_SERVICE_ROLE_KEY=
```

등록한 번호를 가입 폼에 입력하면 OTP 화면을 건너뛰고 바로 로그인됩니다. 각
번호는 실제 계정 식별자로 사용되므로 한 번 가입한 번호는 다시 가입할 수 없습니다.

포인트 결제를 테스트하려면 토스페이먼츠 테스트 키와 서버 전용 Supabase 키를 추가합니다.

```bash
NEXT_PUBLIC_TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3003
```

토스페이먼츠 웹훅 URL은 `/api/payments/toss/webhook`으로 등록합니다. 결제 승인과 포인트 적립은 주문번호 기준으로 멱등 처리됩니다.
