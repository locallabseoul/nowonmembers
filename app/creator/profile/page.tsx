import { requireRole } from "@/lib/auth/guards";
import { saveCreatorProfile } from "./actions";

export default async function CreatorProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  await requireRole("creator", "/creator/profile");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black text-charcoal">크리에이터 프로필 등록</h1>
      <p className="mt-2 text-gray-500">팔로워 수보다 지역 이해도와 콘텐츠 역량이 드러나도록 작성해주세요.</p>
      {error ? <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}
      <form action={saveCreatorProfile} className="mt-8 grid gap-6 rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="nickname" label="닉네임" placeholder="김노원" />
          <Field name="activity_areas" label="활동 지역" placeholder="공릉동, 상계동, 중계동" />
          <Field name="interests" label="관심 분야" placeholder="카페, 동네 산책, 인터뷰" />
          <Field name="available_days" label="가능 요일" placeholder="금, 토, 일" />
        </div>
        <label>
          <span className="mb-2 block text-sm font-black text-charcoal">소개</span>
          <textarea name="bio" className="min-h-28 w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="노원에서 어떤 콘텐츠를 만들고 싶은지 적어주세요." />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="content_types" label="콘텐츠 유형" placeholder="블로그, 인스타그램, 숏폼" />
          <Field name="channel_url" label="대표 채널 URL" placeholder="https://instagram.com/..." />
          <Field name="portfolio_url" label="포트폴리오 URL" placeholder="https://blog.naver.com/..." />
        </div>
        <label className="flex items-start gap-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <input type="checkbox" className="mt-1" />
          맞춤 캠페인 추천과 선정/제출 안내 알림 수신에 동의합니다.
        </label>
        <button className="rounded-lg bg-primary px-5 py-3 font-black text-white hover:bg-primaryHover">가입 완료하기</button>
      </form>
    </main>
  );
}

function Field({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-charcoal">{label}</span>
      <input name={name} required={name === "nickname"} className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder={placeholder} />
    </label>
  );
}
