import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Coins, Eye, FileCheck, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { formatPoints } from "@/lib/points";
import { getBusinessDashboard, getBusinessReport, type BusinessReportCampaign } from "@/lib/supabase/queries";
import { OperatorSidebar } from "../components/operator-sidebar";

export const metadata = {
  title: "통계 및 리포트"
};

function statusLabel(status: string) {
  if (status === "draft") return "초안";
  if (status === "in_review") return "검수 대기";
  if (status === "revision_requested") return "수정 요청";
  if (status === "approved" || status === "scheduled") return "공개 예정";
  if (status === "recruiting") return "모집중";
  if (status === "selecting") return "선정중";
  if (status === "in_progress") return "진행중";
  if (status === "submission_review") return "제출 검수";
  if (status === "completed") return "완료";
  if (status === "cancelled") return "취소";
  if (status === "failed") return "무산";
  return status;
}

// 아직 공개된 적 없는 캠페인은 조회·지원이 0인 게 정상이라 비율을 셈하지 않는다.
function isPublished(status: string) {
  return ["recruiting", "selecting", "in_progress", "submission_review", "completed", "failed"].includes(status);
}

function formatRate(numerator: number, denominator: number) {
  if (!denominator) return "-";

  return `${Math.round((numerator / denominator) * 1000) / 10}%`;
}

function formatDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year) return value;

  return `${year}.${month}.${day}`;
}

function SummaryCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-500">{label}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-black text-charcoal">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: BusinessReportCampaign }) {
  const published = isPublished(campaign.status);

  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-5 py-4">
        <Link href={`/campaigns/${campaign.id}`} className="font-bold text-charcoal underline decoration-gray-200 underline-offset-4 hover:text-primary hover:decoration-primary">
          {campaign.title}
        </Link>
        <p className="mt-0.5 text-xs text-gray-400">{statusLabel(campaign.status)} · 마감 {formatDate(campaign.recruitEnd)}</p>
      </td>
      <td className="px-3 py-4 text-right tabular-nums text-charcoal">
        {published ? campaign.viewCount.toLocaleString("ko-KR") : "-"}
      </td>
      <td className="px-3 py-4 text-right tabular-nums text-charcoal">
        {published ? `${campaign.applicationCount}/${campaign.recruitCount}` : "-"}
      </td>
      <td className="px-3 py-4 text-right tabular-nums font-bold text-charcoal">
        {published ? formatRate(campaign.applicationCount, campaign.viewCount) : "-"}
      </td>
      <td className="px-3 py-4 text-right tabular-nums text-charcoal">
        {campaign.selectedCount ? `${campaign.approvedSubmissionCount}/${campaign.selectedCount}` : "-"}
      </td>
      <td className="px-5 py-4 text-right text-xs">
        {campaign.consumedPoints || campaign.returnedPoints ? (
          <>
            <p className="font-bold text-charcoal">{formatPoints(campaign.consumedPoints)}</p>
            {campaign.returnedPoints ? <p className="mt-0.5 text-gray-400">{formatPoints(campaign.returnedPoints)} 반환</p> : null}
          </>
        ) : campaign.reservedPoints ? (
          <p className="text-amber-600">{formatPoints(campaign.reservedPoints)} 예약중</p>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
    </tr>
  );
}

export default async function BusinessReportsPage() {
  await requireRole("business", "/business/reports");
  const [{ business }, report] = await Promise.all([getBusinessDashboard(), getBusinessReport()]);

  if (!business) {
    redirect("/business/dashboard?profile=edit");
  }

  const { totals, campaigns } = report;
  const publishedCampaigns = campaigns.filter((campaign) => isPublished(campaign.status));
  const costPerContent = totals.approvedSubmissionCount
    ? Math.round(totals.consumedPoints / totals.approvedSubmissionCount)
    : 0;

  return (
    <div className="bg-[#F8F9FA]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 md:py-10 lg:flex-row lg:px-8">
        <OperatorSidebar business={business} active="reports" />

        <main className="min-w-0 flex-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">통계 및 리포트</h1>
            <p className="mt-2 text-sm text-gray-500">
              캠페인이 얼마나 노출되고 지원으로 이어졌는지 확인하세요. 조회수는 같은 사람이 하루에 여러 번 봐도 한 번만 셉니다.
            </p>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="전체 조회"
              value={totals.viewCount.toLocaleString("ko-KR")}
              hint={publishedCampaigns.length ? `공개 캠페인 ${publishedCampaigns.length}건` : "공개된 캠페인이 아직 없어요"}
              icon={<Eye size={20} />}
            />
            <SummaryCard
              label="전체 지원"
              value={`${totals.applicationCount}명`}
              hint={`조회 대비 ${formatRate(totals.applicationCount, totals.viewCount)}`}
              icon={<Users size={20} />}
            />
            <SummaryCard
              label="완료 콘텐츠"
              value={`${totals.approvedSubmissionCount}건`}
              hint={totals.selectedCount ? `선정 ${totals.selectedCount}명 중` : "선정된 크리에이터가 아직 없어요"}
              icon={<FileCheck size={20} />}
            />
            <SummaryCard
              label="콘텐츠 1건당"
              value={costPerContent ? formatPoints(costPerContent) : "-"}
              hint={totals.consumedPoints ? `사용 ${formatPoints(totals.consumedPoints)}` : "아직 정산된 캠페인이 없어요"}
              icon={<Coins size={20} />}
            />
          </div>

          <section className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="border-b border-gray-100 p-5">
              <h2 className="font-black text-charcoal">캠페인별 성과</h2>
              <p className="mt-1 text-sm text-gray-500">
                조회는 많은데 지원이 적다면 혜택이나 미션을, 조회 자체가 적다면 제목과 대표 이미지를 살펴보세요.
              </p>
            </div>

            {campaigns.length === 0 ? (
              <div className="p-10 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BarChart3 size={22} />
                </span>
                <p className="mt-4 font-bold text-charcoal">아직 만든 캠페인이 없어요</p>
                <p className="mt-2 text-sm text-gray-500">첫 캠페인을 올리면 조회수와 지원 현황이 여기에 쌓입니다.</p>
                <Link href="/business/campaigns/new" className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-primaryHover">
                  캠페인 만들기
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-400">
                      <th className="px-5 py-3 font-bold">캠페인</th>
                      <th className="px-3 py-3 text-right font-bold">조회</th>
                      <th className="px-3 py-3 text-right font-bold">지원/모집</th>
                      <th className="px-3 py-3 text-right font-bold">지원율</th>
                      <th className="px-3 py-3 text-right font-bold">완료/선정</th>
                      <th className="px-5 py-3 text-right font-bold">사용 포인트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => <CampaignRow key={campaign.id} campaign={campaign} />)}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="mt-4 text-xs leading-5 text-gray-400">
            지원율은 캠페인을 본 사람 중 신청까지 한 비율입니다. 공개 전 캠페인은 집계하지 않습니다.
          </p>
        </main>
      </div>
    </div>
  );
}
