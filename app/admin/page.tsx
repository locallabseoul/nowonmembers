import Link from "next/link";
import { Badge, StatCard } from "@/app/components/ui";
import { getCampaignLifecycle } from "@/lib/campaign-lifecycle";
import { getAdminDashboard, type DashboardApplication, type DashboardCampaign } from "@/lib/supabase/queries";
import { CheckCircle2, ClipboardCheck, Send, Users, X } from "lucide-react";
import { approveCampaign, approveSubmission, publishLocalStory, recommendApplication, requestCampaignRevision, requestSubmissionRevision, unrecommendApplication } from "./actions";

const applicationStatusTabs = [
  ["", "전체"],
  ["submitted", "신규"],
  ["recommended", "추천"],
  ["selected", "선정"],
  ["rejected", "미선정"]
] as const;

function applicationStatusLabel(status: string) {
  if (status === "recommended") return "추천 후보";
  if (status === "submitted") return "신규 지원";
  if (status === "selected") return "선정 완료";
  if (status === "rejected") return "미선정";
  return status;
}

function applicationStatusTone(status: string): "blue" | "green" | "gray" | "amber" {
  if (status === "recommended") return "amber";
  if (status === "selected") return "green";
  if (status === "rejected") return "gray";
  return "blue";
}

function campaignStatusLabel(status: string) {
  if (status === "draft") return "초안";
  if (status === "in_review") return "검수 대기";
  if (status === "revision_requested") return "수정 요청";
  if (status === "approved") return "승인 완료";
  if (status === "scheduled") return "공개 예정";
  if (status === "recruiting") return "모집중";
  if (status === "selecting") return "선정중";
  if (status === "in_progress") return "진행중";
  if (status === "submission_review") return "제출 검수";
  if (status === "completed") return "완료";
  if (status === "cancelled") return "취소";
  if (status === "failed") return "실패";
  return status;
}

function formatAppliedAt(value: string) {
  if (!value) return "지원일 미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function dashboardHref(path: string, campaignId?: string, appStatus?: string) {
  const params = new URLSearchParams();
  if (campaignId) params.set("campaign", campaignId);
  if (appStatus) params.set("appStatus", appStatus);
  const query = params.toString();

  return query ? `${path}?${query}` : path;
}

function normalizeApplicationStatusFilter(value?: string) {
  return applicationStatusTabs.some(([status]) => status === value) ? value ?? "" : "";
}

function filterApplications(applications: DashboardApplication[], statusFilter: string) {
  if (!statusFilter) return applications;
  return applications.filter((application) => application.status === statusFilter);
}

function CampaignManagementRow({
  campaign,
  selected,
  statusFilter
}: {
  campaign: DashboardCampaign;
  selected: boolean;
  statusFilter: string;
}) {
  const lifecycle = getCampaignLifecycle(campaign);
  const canReview = campaign.status === "in_review" || campaign.status === "revision_requested";

  return (
    <div className={`grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center ${selected ? "bg-primary/5" : ""}`}>
      <Link href={dashboardHref("/admin", campaign.id, statusFilter)} className="block">
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge tone={lifecycle.badgeTone}>{lifecycle.label}</Badge>
          <Badge>{campaign.campaignType}</Badge>
          {selected ? <Badge tone="green">선택됨</Badge> : null}
        </div>
        <h3 className="font-black text-charcoal">{campaign.title}</h3>
        <p className="mt-2 text-sm text-gray-500">{campaign.businessName ?? "가게명 미등록"} · 모집 {campaign.recruitStart || "승인 시 시작"} - {campaign.recruitEnd || "미정"}</p>
        <p className="mt-2 text-xs font-bold text-gray-500">
          전체 지원 {campaign.applicationCount}명 · 추천 {campaign.recommendedCount}명 · 선정 {campaign.selectedCount}/{campaign.recruitCount}명
        </p>
        <p className="mt-1 text-xs text-gray-400">{lifecycle.description}</p>
      </Link>
      {canReview ? (
        <div className="flex flex-wrap gap-2">
          <form action={requestCampaignRevision}>
            <input type="hidden" name="campaign_id" value={campaign.id} />
            <input type="hidden" name="admin_memo" value="운영자 수정 요청" />
            <button className="rounded-lg border border-line px-4 py-2 text-sm font-black text-charcoal">수정 요청</button>
          </form>
          <form action={approveCampaign}>
            <input type="hidden" name="campaign_id" value={campaign.id} />
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white">승인</button>
          </form>
        </div>
      ) : (
        <Link href={dashboardHref("/admin", campaign.id, statusFilter)} className="rounded-lg bg-white px-4 py-2 text-sm font-black text-primary ring-1 ring-primary/20">
          지원자 보기
        </Link>
      )}
    </div>
  );
}

function ApplicantCard({ application }: { application: DashboardApplication }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone={applicationStatusTone(application.status)}>{applicationStatusLabel(application.status)}</Badge>
        {application.status === "recommended" ? <Badge tone="amber">운영자 추천</Badge> : null}
      </div>
      <p className="text-sm font-black text-charcoal">{application.creatorNickname}</p>
      <p className="mt-1 text-xs font-bold text-gray-400">{application.creatorChannelSummary} · 포트폴리오 {application.portfolioCount}개</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <span>{application.proposedContentType || "콘텐츠 유형 미정"}</span>
        <span>{formatAppliedAt(application.appliedAt)}</span>
      </div>
      {application.availableDates ? <p className="mt-2 text-xs text-gray-500">가능 일정: {application.availableDates}</p> : null}
      <p className="mt-2 text-xs leading-5 text-gray-500">{application.message || "지원 메시지가 없습니다."}</p>
      {application.status === "submitted" ? (
        <form action={recommendApplication} className="mt-3">
          <input type="hidden" name="application_id" value={application.id} />
          <input type="hidden" name="admin_memo" value="운영자 추천" />
          <button className="rounded-lg bg-white px-3 py-2 text-xs font-black text-primary ring-1 ring-primary/20">추천 표시</button>
        </form>
      ) : null}
      {application.status === "recommended" ? (
        <form action={unrecommendApplication} className="mt-3">
          <input type="hidden" name="application_id" value={application.id} />
          <button className="rounded-lg bg-white px-3 py-2 text-xs font-black text-charcoal ring-1 ring-line">추천 해제</button>
        </form>
      ) : null}
    </div>
  );
}

function ApplicantModal({
  campaign,
  applications,
  statusFilter
}: {
  campaign: DashboardCampaign;
  applications: DashboardApplication[];
  statusFilter: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="admin-applicant-modal-title">
      <Link href="/admin" className="absolute inset-0 bg-charcoal/50" aria-label="지원자 팝업 닫기" />
      <section className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone={getCampaignLifecycle(campaign).badgeTone}>{campaignStatusLabel(campaign.status)}</Badge>
              <Badge tone="gray">전체 {campaign.applicationCount}명</Badge>
              <Badge tone="amber">추천 {campaign.recommendedCount}명</Badge>
              <Badge tone="green">선정 {campaign.selectedCount}/{campaign.recruitCount}명</Badge>
            </div>
            <h2 id="admin-applicant-modal-title" className="text-xl font-black text-charcoal">{campaign.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{campaign.businessName ?? "가게명 미등록"} · 캠페인 지원자</p>
          </div>
          <Link href="/admin" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100" aria-label="닫기">
            <X size={20} />
          </Link>
        </div>
        <div className="border-b border-line p-5">
          <div className="flex flex-wrap gap-2">
            {applicationStatusTabs.map(([status, label]) => (
              <Link
                key={label}
                href={dashboardHref("/admin", campaign.id, status)}
                className={`rounded-lg px-3 py-2 text-xs font-black ${statusFilter === status ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {applications.map((application) => <ApplicantCard key={application.id} application={application} />)}
          </div>
          {applications.length === 0 ? <p className="text-sm text-gray-500">해당 조건의 지원자가 없습니다.</p> : null}
        </div>
      </section>
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; campaign?: string; appStatus?: string }> }) {
  const { error, campaign, appStatus } = await searchParams;
  const statusFilter = normalizeApplicationStatusFilter(appStatus);
  const { stats, campaigns, selectedCampaign, selectedCampaignApplications, submissions, isAdmin } = await getAdminDashboard(campaign);
  const filteredApplications = filterApplications(selectedCampaignApplications, statusFilter);
  const completionRate = Math.round((stats.approvedSubmissions / Math.max(stats.totalSubmissions, 1)) * 100);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-black text-primary">운영자</p>
        <h1 className="mt-2 text-3xl font-black text-charcoal">운영 대시보드</h1>
        <p className="mt-2 text-gray-500">캠페인별 지원자 검토, 추천 표시, 제출 확인, 로컬 스토리 발행을 관리합니다.</p>
      </div>
      {error ? <p className="mb-6 rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}
      {!isAdmin ? (
        <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-charcoal">관리자 권한이 필요합니다</h2>
          <p className="mt-2 text-sm text-gray-500">Supabase `profiles` 테이블에서 현재 계정의 `role`을 `admin`으로 지정한 뒤 다시 접속해주세요.</p>
        </section>
      ) : null}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <StatCard label="등록 가게" value={`${stats.businesses}`} icon={<Users size={20} />} />
        <StatCard label="인증 크리에이터" value={`${stats.verifiedCreators}`} icon={<CheckCircle2 size={20} />} />
        <StatCard label="모집 중 캠페인" value={`${stats.recruitingCampaigns}`} icon={<ClipboardCheck size={20} />} />
        <StatCard label="제출 승인율" value={`${completionRate}%`} icon={<Send size={20} />} />
      </div>

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-black text-charcoal">캠페인 관리</h2>
          <p className="mt-1 text-sm text-gray-500">캠페인의 `지원자 보기`를 누르면 해당 캠페인의 지원자 팝업이 열립니다.</p>
        </div>
        <div className="divide-y divide-line">
          {campaigns.map((item) => (
            <CampaignManagementRow key={item.id} campaign={item} selected={selectedCampaign?.id === item.id} statusFilter={statusFilter} />
          ))}
          {campaigns.length === 0 ? <p className="p-5 text-sm text-gray-500">관리할 캠페인이 없습니다.</p> : null}
        </div>
      </section>

      {selectedCampaign ? <ApplicantModal campaign={selectedCampaign} applications={filteredApplications} statusFilter={statusFilter} /> : null}

      <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-black text-charcoal">콘텐츠 제출 확인</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {submissions.map((submission) => (
            <div key={submission.id} className="rounded-lg bg-gray-50 p-4 text-sm">
              <Badge tone="green">{submission.reviewStatus}</Badge>
              <p className="mt-2 text-xs font-bold text-gray-400">{submission.platform}</p>
              <p className="mt-3 break-all text-gray-600">{submission.contentUrl}</p>
              {submission.reviewStatus === "submitted" ? (
                <div className="mt-3 flex gap-2">
                  <form action={approveSubmission}>
                    <input type="hidden" name="submission_id" value={submission.id} />
                    <button className="rounded-lg bg-primary px-3 py-2 text-xs font-black text-white">승인</button>
                  </form>
                  <form action={requestSubmissionRevision}>
                    <input type="hidden" name="submission_id" value={submission.id} />
                    <input type="hidden" name="admin_memo" value="제출 콘텐츠 수정 요청" />
                    <button className="rounded-lg bg-white px-3 py-2 text-xs font-black text-charcoal ring-1 ring-line">수정 요청</button>
                  </form>
                </div>
              ) : null}
              {submission.reviewStatus === "approved" ? (
                <form action={publishLocalStory} className="mt-3">
                  <input type="hidden" name="submission_id" value={submission.id} />
                  <button className="rounded-lg bg-white px-3 py-2 text-xs font-black text-primary ring-1 ring-primary/20">로컬 스토리 발행</button>
                </form>
              ) : null}
            </div>
          ))}
          {submissions.length === 0 ? <p className="text-sm text-gray-500">제출된 콘텐츠가 없습니다.</p> : null}
        </div>
      </section>
    </main>
  );
}
