# 노원멤버스 MVP

노원의 가게와 지역 크리에이터를 연결하는 로컬 콘텐츠 협업 MVP입니다.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth / Database / Storage 준비

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
