import Link from "next/link";
import { Eye, FileCheck2, Plus, Users } from "lucide-react";
import { Badge, StatCard } from "@/app/components/ui";
import { getBusinessDashboard } from "@/lib/supabase/queries";
import { getCurrentSessionProfile } from "@/lib/auth/guards";
import { approveRecommendedApplication, saveBusinessProfile } from "./actions";

export default async function BusinessDashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { user } = await getCurrentSessionProfile();
  const { business, campaigns, recommendedApplications } = await getBusinessDashboard();

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black text-charcoal">가게 로그인이 필요합니다</h1>
          <p className="mt-2 text-gray-500">가게 프로필과 캠페인 생성은 로그인 후 사용할 수 있습니다.</p>
          <Link href="/auth?next=/business/dashboard" className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-black text-white hover:bg-primaryHover">
            로그인하기
          </Link>
        </section>
      </main>
    );
  }

  if (!business) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black text-charcoal">가게 프로필 등록</h1>
        <p className="mt-2 text-gray-500">캠페인 생성 전 운영자 검수를 위한 가게 정보를 먼저 등록해주세요.</p>
        {error ? <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}
        <form action={saveBusinessProfile} className="mt-8 grid gap-6 rounded-lg border border-line bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="business_name" label="가게명" placeholder="카페 오디너리" required />
            <Field name="category" label="업종" placeholder="카페·베이커리" required />
            <Field name="district" label="활동 지역" placeholder="공릉동" />
            <Field name="contact" label="연락처" placeholder="02-000-0000" />
            <Field name="business_hours" label="영업시간" placeholder="매일 10:00-21:00" />
            <Field name="website_url" label="웹사이트" placeholder="https://..." />
          </div>
          <Field name="address" label="주소" placeholder="서울 노원구 ..." />
          <Field name="short_intro" label="한 줄 소개" placeholder="공릉동 골목의 계절 디저트와 스페셜티 커피" />
          <label>
            <span className="mb-2 block text-sm font-black text-charcoal">가게 소개</span>
            <textarea name="description" className="min-h-28 w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="가게의 이야기와 협업하고 싶은 콘텐츠 방향을 적어주세요." />
          </label>
          <Field name="social_urls" label="SNS URL" placeholder="https://instagram.com/... , https://blog.naver.com/..." />
          <Field name="cover_image_url" label="대표 이미지 URL" placeholder="선택 입력" />
          <button className="rounded-lg bg-primary px-5 py-3 font-black text-white hover:bg-primaryHover">가게 프로필 저장</button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {error ? <p className="mb-6 rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black text-primary">가게 대시보드</p>
          <h1 className="mt-2 text-3xl font-black text-charcoal">{business.businessName}</h1>
          <p className="mt-2 text-gray-500">캠페인 진행 상황과 지원자, 완료 콘텐츠를 확인하세요.</p>
        </div>
        <Link href="/business/campaigns/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-black text-white hover:bg-primaryHover">
          <Plus size={18} /> 새 캠페인 만들기
        </Link>
      </div>
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <StatCard label="운영 캠페인" value={`${campaigns.length}`} icon={<FileCheck2 size={20} />} />
        <StatCard label="총 지원자" value={`${campaigns.reduce((sum, item) => sum + item.appliedCount, 0)}`} icon={<Users size={20} />} />
        <StatCard label="추천 지원자" value={`${recommendedApplications.length}`} icon={<Eye size={20} />} />
        <StatCard label="공개 상태" value={business.isPublic ? "공개" : "검수"} icon={<FileCheck2 size={20} />} />
      </div>
      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-black text-charcoal">캠페인 관리</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-black uppercase text-gray-500">
              <tr>
                <th className="px-5 py-4">캠페인</th>
                <th className="px-5 py-4">상태</th>
                <th className="px-5 py-4">지원자</th>
                <th className="px-5 py-4">마감</th>
                <th className="px-5 py-4">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-5 py-4 font-black text-charcoal">{campaign.title}</td>
                  <td className="px-5 py-4"><Badge tone={campaign.status === "recruiting" ? "red" : "amber"}>{campaign.status}</Badge></td>
                  <td className="px-5 py-4">{campaign.appliedCount}명</td>
                  <td className="px-5 py-4">{campaign.recruitEnd}</td>
                  <td className="px-5 py-4">
                    <Link href={`/campaigns/${campaign.id}`} className="font-black text-primary">상세 보기</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-8 rounded-lg border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-black text-charcoal">운영자 추천 지원자</h2>
        {recommendedApplications.length === 0 ? <p className="text-sm text-gray-500">아직 운영자 추천 지원자가 없습니다.</p> : null}
        {recommendedApplications.map((application) => (
          <div key={application.id} className="rounded-lg bg-gray-50 p-5">
            <Badge tone="amber">{application.status}</Badge>
            <p className="font-black text-charcoal">{application.proposedContentType}</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">{application.message}</p>
            <p className="mt-3 text-xs font-bold text-primary">{application.adminMemo}</p>
            <form action={approveRecommendedApplication} className="mt-4">
              <input type="hidden" name="application_id" value={application.id} />
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-primaryHover">
                최종 선정하고 협업 시작
              </button>
            </form>
          </div>
        ))}
      </section>
    </main>
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
