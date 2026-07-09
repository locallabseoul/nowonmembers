import { StatusTimeline, TrustNotice } from "@/app/components/ui";
import { createCampaign } from "./actions";

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black text-charcoal">캠페인 만들기</h1>
      <p className="mt-2 text-gray-500">운영자 검수를 거쳐 공개됩니다. 과장된 홍보보다 명확한 협업 조건을 작성해주세요.</p>
      {error ? <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}
      <div className="mt-8"><StatusTimeline /></div>
      <form action={createCampaign} className="mt-8 grid gap-6 rounded-lg border border-line bg-white p-6 shadow-sm">
        <FormSection title="1. 캠페인 목적">
          <Field name="title" label="캠페인 제목" placeholder="공릉동 시그니처 디저트 콘텐츠 협업" required />
          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span className="mb-2 block text-sm font-black text-charcoal">캠페인 유형</span>
              <select name="campaign_type" className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring">
                <option value="visit">방문 체험</option>
                <option value="shortform">숏폼 제작</option>
                <option value="interview">인터뷰</option>
              </select>
            </label>
            <Field name="region" label="지역" placeholder="공릉동" required />
            <Field name="category" label="카테고리" placeholder="카페·베이커리" />
          </div>
        </FormSection>
        <FormSection title="2. 제공 혜택">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field name="benefit_type" label="혜택 유형" placeholder="체험 제공" />
            <Field name="benefit_value" label="제공 내역" placeholder="디저트 2종 + 음료 2잔" required />
            <Field name="fee" label="활동비 또는 제작비" placeholder="선택 입력" />
          </div>
        </FormSection>
        <FormSection title="3. 원하는 콘텐츠">
          <textarea name="description" className="min-h-28 w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="캠페인의 목적, 가게의 특장점, 콘텐츠 방향을 적어주세요." />
          <textarea name="content_requirements" className="min-h-28 w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="필수 조건을 줄바꿈 또는 쉼표로 입력하세요. 예: 제공 사실 표시, 대표 메뉴 2개 이상 소개" />
        </FormSection>
        <FormSection title="4. 일정과 모집 인원">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field name="recruit_count" label="모집 인원" placeholder="5" required />
            <Field name="recruit_start" label="모집 시작" placeholder="2026-07-03" />
            <Field name="recruit_end" label="모집 마감" placeholder="2026-07-18" />
            <Field name="selection_date" label="선정 발표" placeholder="2026-07-20" />
            <Field name="visit_start" label="체험 시작" placeholder="2026-07-22" />
            <Field name="visit_end" label="체험 종료" placeholder="2026-08-02" />
            <Field name="submission_due" label="제출 마감" placeholder="2026-08-09" />
          </div>
        </FormSection>
        <FormSection title="5. 콘텐츠 사용 범위">
          <textarea name="usage_rights" className="min-h-24 w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="가게 SNS 리그램, 노원멤버스 아카이브 소개 등 사용 범위를 명확히 적어주세요." />
          <Field name="cover_image_url" label="대표 이미지 URL" placeholder="선택 입력" />
          <label className="flex items-center gap-3 rounded-lg bg-gray-50 p-4 text-sm font-bold text-gray-600">
            <input type="checkbox" name="beginner_friendly" />
            초보 크리에이터 참여 가능
          </label>
        </FormSection>
        <TrustNotice />
        <button className="rounded-lg bg-primary px-5 py-3 font-black text-white hover:bg-primaryHover">운영자 검수 요청</button>
      </form>
    </main>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-black text-charcoal">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Field({ name, label, placeholder, required = false }: { name: string; label: string; placeholder: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-charcoal">{label}</span>
      <input name={name} required={required} className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder={placeholder} />
    </label>
  );
}
