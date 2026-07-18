import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight, CreditCard, ListChecks, Plus, Search, Users, X } from "lucide-react";
import { Badge } from "@/app/components/ui";
import { getCampaignDeadlineLabel, getCampaignLifecycle } from "@/lib/campaign-lifecycle";
import { getBusinessDashboard, type BusinessDashboardData, type DashboardApplication, type DashboardCampaign } from "@/lib/supabase/queries";
import { requireRole } from "@/lib/auth/guards";
import { approveRecommendedApplication, saveBusinessProfile } from "./actions";

const applicationStatusTabs = [
  ["", "전체"],
  ["submitted", "신규"],
  ["recommended", "추천"],
  ["selected", "선정"],
  ["rejected", "미선정"]
] as const;

const campaignListTabs = [
  ["", "전체 캠페인"],
  ["active", "모집중/선정"],
  ["review", "리뷰 진행중"],
  ["completed", "완료"]
] as const;

type CampaignListFilter = (typeof campaignListTabs)[number][0];
type CampaignSort = "latest" | "deadline";

const CAMPAIGNS_PER_PAGE = 8;

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

function normalizeCampaignListFilter(value?: string): CampaignListFilter {
  return campaignListTabs.some(([status]) => status === value) ? (value ?? "") as CampaignListFilter : "";
}

function normalizeCampaignSort(value?: string): CampaignSort {
  return value === "deadline" ? "deadline" : "latest";
}

function campaignListHref(status: CampaignListFilter, searchQuery: string, sortOrder: CampaignSort, page = 1) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (searchQuery) params.set("q", searchQuery);
  if (sortOrder !== "latest") params.set("sort", sortOrder);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();

  return query ? `/business/dashboard?${query}` : "/business/dashboard";
}

function getFilteredCampaigns(campaigns: DashboardCampaign[], filter: CampaignListFilter, searchQuery: string, sortOrder: CampaignSort) {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");
  const filtered = campaigns.filter((campaign) => {
    if (filter === "active" && campaign.status !== "recruiting" && campaign.status !== "selecting") return false;
    if (filter === "review" && campaign.status !== "submission_review" && campaign.status !== "in_progress") return false;
    if (filter === "completed" && campaign.status !== "completed" && campaign.status !== "cancelled" && campaign.status !== "failed") return false;
    if (!normalizedQuery) return true;

    return [campaign.title, campaign.category, campaign.region].some((value) => value.toLocaleLowerCase("ko-KR").includes(normalizedQuery));
  });

  if (sortOrder !== "deadline") return filtered;

  return [...filtered].sort((a, b) => getDateOrderValue(a.recruitEnd) - getDateOrderValue(b.recruitEnd));
}

function getDateOrderValue(value: string) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(`${value.slice(0, 10)}T00:00:00+09:00`).getTime();

  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function normalizePage(value?: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;

  return parsed;
}

function getSelectionBlockReason(application: DashboardApplication) {
  if (application.hasCollaboration || application.status === "selected") return "이미 선정된 지원자입니다.";
  if (application.status !== "submitted" && application.status !== "recommended") return `${applicationStatusLabel(application.status)} 상태에서는 선정할 수 없습니다.`;
  if (application.recruitCount > 0 && application.selectedCount >= application.recruitCount) return "모집 정원이 마감되었습니다.";
  if (application.campaignStatus === "recruiting") return "모집 종료 후 선정 가능";
  if (application.campaignStatus !== "selecting") return `${campaignStatusLabel(application.campaignStatus)} 상태에서는 선정할 수 없습니다.`;
  return null;
}

function formatDateShort(value: string) {
  if (!value) return "미정";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;

  return `${year}.${month}.${day}`;
}

function campaignTypeLabel(campaign: DashboardCampaign) {
  if (campaign.campaignType === "shortform") return "릴스/쇼츠";
  if (campaign.campaignType === "interview") return "인스타";
  return "블로그";
}

function campaignTypeClassName(campaign: DashboardCampaign) {
  if (campaign.campaignType === "shortform") return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
  if (campaign.campaignType === "interview") return "bg-[#E1306C] text-white";
  return "bg-charcoal/90 text-white";
}

function campaignStatusClassName(campaign: DashboardCampaign) {
  if (campaign.status === "recruiting" || campaign.status === "selecting") return "bg-[#E0E7FF] text-[#4338CA]";
  if (campaign.status === "in_progress") return "bg-[#DBEAFE] text-[#1D4ED8]";
  if (campaign.status === "in_review" || campaign.status === "revision_requested" || campaign.status === "submission_review") return "bg-[#FEF3C7] text-[#B45309]";
  if (campaign.status === "completed") return "bg-[#D1FAE5] text-[#047857]";
  return "bg-gray-100 text-gray-600";
}

function campaignStatusText(campaign: DashboardCampaign) {
  const lifecycle = getCampaignLifecycle(campaign);
  if (campaign.status === "recruiting") return `${lifecycle.label} (${getCampaignDeadlineLabel(campaign)})`;
  if (campaign.status === "submission_review") return `${lifecycle.label} (${campaign.selectedCount}/${campaign.recruitCount})`;

  return lifecycle.label;
}

function campaignPeriodText(campaign: DashboardCampaign) {
  if (campaign.status === "recruiting") return `~ ${formatDateShort(campaign.recruitEnd)} 모집`;
  if (campaign.status === "selecting") return `선정일 ${formatDateShort(campaign.selectionDate || campaign.recruitEnd)}`;
  if (campaign.status === "in_progress") return `~ ${formatDateShort(campaign.submissionDue || campaign.visitEnd)} 진행`;
  if (campaign.status === "submission_review") return `~ ${formatDateShort(campaign.submissionDue)} 제출`;
  if (campaign.status === "completed") return `종료일: ${formatDateShort(campaign.submissionDue || campaign.recruitEnd)}`;

  return `마감 ${formatDateShort(campaign.recruitEnd)}`;
}

function campaignApplicantText(campaign: DashboardCampaign) {
  if (campaign.status === "recruiting") {
    return {
      main: `현재 ${campaign.applicationCount}명 지원`,
      sub: `모집 ${campaign.recruitCount}명`,
      highlight: true
    };
  }

  if (campaign.status === "selecting") {
    return {
      main: `${campaign.selectedCount}명 선정 진행`,
      sub: `지원 ${campaign.applicationCount}명 · 추천 ${campaign.recommendedCount}명`,
      highlight: campaign.applicationCount > 0
    };
  }

  if (campaign.status === "in_progress" || campaign.status === "submission_review" || campaign.status === "completed") {
    return {
      main: `${campaign.selectedCount}명 선정 완료`,
      sub: campaign.applicationCount ? `지원 ${campaign.applicationCount}명` : "",
      highlight: false
    };
  }

  return {
    main: `모집 ${campaign.recruitCount}명`,
    sub: campaign.applicationCount ? `지원 ${campaign.applicationCount}명` : "지원자 없음",
    highlight: false
  };
}

function campaignActionLabel(campaign: DashboardCampaign) {
  if (campaign.status === "selecting") return "선정하기";
  if (campaign.status === "submission_review") return "리뷰 검토";
  if (campaign.status === "completed") return "결과 리포트";
  if (campaign.status === "in_progress") return "상세 보기";
  return "지원자 보기";
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
  const applicantText = campaignApplicantText(campaign);
  const actionIsPrimary = campaign.status === "selecting";

  return (
    <tr className={`group transition-colors hover:bg-gray-50 ${selected ? "bg-primary/5" : ""} ${campaign.status === "completed" ? "opacity-75" : ""}`}>
      <td className="px-6 py-5">
        <Link href={dashboardHref("/business/dashboard", campaign.id, statusFilter)} className="flex items-center gap-4">
          <div className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 ${campaign.status === "completed" ? "grayscale" : ""}`}>
            <img src={campaign.coverImage} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${campaignTypeClassName(campaign)}`}>{campaignTypeLabel(campaign)}</span>
              <span className="text-xs text-gray-500">{campaign.category}</span>
            </div>
            <p className={`line-clamp-1 text-sm font-bold transition-colors group-hover:text-primary ${campaign.status === "completed" ? "text-gray-600" : "text-charcoal"}`}>
              {campaign.title}
            </p>
          </div>
        </Link>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${campaignStatusClassName(campaign)}`}>
            {campaignStatusText(campaign)}
          </span>
          {selected ? <Badge tone="green">선택됨</Badge> : null}
        </div>
      </td>
      <td className="px-6 py-5">
        <div className={`text-sm font-medium ${applicantText.highlight ? "text-primary" : "text-charcoal"}`}>{applicantText.main}</div>
        {applicantText.sub ? <div className="mt-1 text-xs text-gray-500">{applicantText.sub}</div> : null}
      </td>
      <td className="px-6 py-5 text-sm text-gray-600">{campaignPeriodText(campaign)}</td>
      <td className="px-6 py-5 text-right">
        <Link
          href={dashboardHref("/business/dashboard", campaign.id, statusFilter)}
          className={`inline-flex rounded-lg px-3 py-1.5 text-sm shadow-sm transition-colors ${
            actionIsPrimary
              ? "bg-primary font-bold text-white hover:bg-primaryHover"
              : "border border-gray-200 bg-white font-medium text-charcoal hover:bg-gray-50 hover:text-primary"
          }`}
        >
          {campaignActionLabel(campaign)}
        </Link>
      </td>
    </tr>
  );
}

function ApplicantCard({ application }: { application: DashboardApplication }) {
  const blockReason = getSelectionBlockReason(application);

  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone={applicationStatusTone(application.status)}>{applicationStatusLabel(application.status)}</Badge>
        {application.status === "recommended" ? <Badge tone="amber">운영자 추천</Badge> : null}
      </div>
      <p className="text-sm font-black text-charcoal">{application.creatorNickname}</p>
      <p className="mt-1 text-xs font-bold text-gray-400">{application.creatorChannelSummary} · 포트폴리오 {application.portfolioCount}개</p>
      <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
        <span>{application.proposedContentType || "콘텐츠 유형 미정"}</span>
        <span>{formatAppliedAt(application.appliedAt)}</span>
        <span>{application.availableDates ? `가능 일정 ${application.availableDates}` : "가능 일정 미입력"}</span>
        <span>선정 {application.selectedCount}/{application.recruitCount}명</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-gray-600">{application.message || "지원 메시지가 없습니다."}</p>
      {application.adminMemo ? <p className="mt-3 text-xs font-bold text-primary">{application.adminMemo}</p> : null}
      {blockReason ? (
        <button disabled className="mt-4 rounded-lg bg-gray-200 px-4 py-2 text-sm font-black text-gray-500">
          {blockReason}
        </button>
      ) : (
        <form action={approveRecommendedApplication} className="mt-4">
          <input type="hidden" name="application_id" value={application.id} />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-primaryHover">
            최종 선정하고 협업 시작
          </button>
        </form>
      )}
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
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="business-applicant-modal-title">
      <Link href="/business/dashboard" className="absolute inset-0 bg-charcoal/50" aria-label="지원자 팝업 닫기" />
      <section className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone={getCampaignLifecycle(campaign).badgeTone}>{campaignStatusLabel(campaign.status)}</Badge>
              <Badge tone="gray">전체 {campaign.applicationCount}명</Badge>
              <Badge tone="amber">추천 {campaign.recommendedCount}명</Badge>
              <Badge tone="green">선정 {campaign.selectedCount}/{campaign.recruitCount}명</Badge>
            </div>
            <h2 id="business-applicant-modal-title" className="text-xl font-black text-charcoal">{campaign.title}</h2>
            <p className="mt-1 text-sm text-gray-500">캠페인 지원자</p>
          </div>
          <Link href="/business/dashboard" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100" aria-label="닫기">
            <X size={20} />
          </Link>
        </div>
        <div className="border-b border-line p-5">
          <div className="flex flex-wrap gap-2">
            {applicationStatusTabs.map(([status, label]) => (
              <Link
                key={label}
                href={dashboardHref("/business/dashboard", campaign.id, status)}
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

function OperatorSidebar({ business }: { business: NonNullable<BusinessDashboardData["business"]> }) {
  const initial = business.businessName.slice(0, 1);

  return (
    <aside className="w-full shrink-0 space-y-6 lg:w-64">
      <section className="flex flex-col items-center rounded-[20px] border border-gray-100 bg-white p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="mb-4 h-20 w-20 overflow-hidden rounded-full border-2 border-gray-100 bg-gray-200 shadow-sm">
          {business.coverImage ? (
            <img src={business.coverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-2xl font-black text-primary">{initial}</div>
          )}
        </div>
        <h2 className="text-lg font-bold text-charcoal">{business.businessName}</h2>
        <p className="mb-4 mt-1 text-sm text-gray-500">사업자 회원</p>
        <Link href="/business/dashboard" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
          프로필 수정
        </Link>
      </section>

      <nav className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]" aria-label="가게 대시보드 메뉴">
        <ul className="flex flex-col">
          <li>
            <Link href="/business/dashboard" className="flex items-center gap-3 border-l-4 border-primary bg-primary/5 px-6 py-4 font-bold text-primary transition-colors">
              <ListChecks size={20} />
              캠페인 관리
            </Link>
          </li>
          <li>
            <span className="flex items-center gap-3 border-l-4 border-transparent px-6 py-4 font-medium text-gray-600">
              <Users size={20} />
              크리에이터 관리
            </span>
          </li>
          <li>
            <span className="flex items-center gap-3 border-l-4 border-transparent px-6 py-4 font-medium text-gray-600">
              <BarChart3 size={20} />
              통계 및 리포트
            </span>
          </li>
          <li>
            <span className="flex items-center gap-3 border-l-4 border-transparent px-6 py-4 font-medium text-gray-600">
              <CreditCard size={20} />
              결제 내역
            </span>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

function StatusSummaryCard({ label, count, dotClassName }: { label: string; count: number; dotClassName: string }) {
  return (
    <div className="flex min-h-[124px] flex-col justify-between rounded-[20px] border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
        <span className={`h-2 w-2 rounded-full ${dotClassName}`} />
        {label}
      </div>
      <div className="text-3xl font-bold text-charcoal">
        {count}
        <span className="ml-1 text-lg font-normal text-gray-400">건</span>
      </div>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  filter,
  searchQuery,
  sortOrder
}: {
  currentPage: number;
  totalPages: number;
  filter: CampaignListFilter;
  searchQuery: string;
  sortOrder: CampaignSort;
}) {
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const previousPage = Math.max(currentPage - 1, 1);
  const nextPage = Math.min(currentPage + 1, totalPages);
  const linkClassName = "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors";

  return (
    <nav className="flex items-center justify-center gap-1 border-t border-gray-100 bg-white p-4" aria-label="캠페인 목록 페이지">
      <Link
        href={campaignListHref(filter, searchQuery, sortOrder, previousPage)}
        aria-disabled={currentPage === 1}
        className={`${linkClassName} ${currentPage === 1 ? "pointer-events-none text-gray-300" : "text-gray-400 hover:bg-gray-50 hover:text-charcoal"}`}
      >
        <ChevronLeft size={14} />
      </Link>
      {pageNumbers.map((pageNumber) => (
        <Link
          key={pageNumber}
          href={campaignListHref(filter, searchQuery, sortOrder, pageNumber)}
          aria-current={pageNumber === currentPage ? "page" : undefined}
          className={`${linkClassName} ${pageNumber === currentPage ? "bg-primary font-bold text-white" : "text-gray-600 hover:bg-gray-50"}`}
        >
          {pageNumber}
        </Link>
      ))}
      <Link
        href={campaignListHref(filter, searchQuery, sortOrder, nextPage)}
        aria-disabled={currentPage === totalPages}
        className={`${linkClassName} ${currentPage === totalPages ? "pointer-events-none text-gray-300" : "text-gray-400 hover:bg-gray-50 hover:text-charcoal"}`}
      >
        <ChevronRight size={14} />
      </Link>
    </nav>
  );
}

export default async function BusinessDashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; campaign?: string; appStatus?: string; status?: string; sort?: string; q?: string; page?: string }> }) {
  const { error, campaign, appStatus, status, sort, q, page } = await searchParams;
  const statusFilter = normalizeApplicationStatusFilter(appStatus);
  const campaignFilter = normalizeCampaignListFilter(status);
  const sortOrder = normalizeCampaignSort(sort);
  const searchQuery = q?.trim() ?? "";
  await requireRole("business", "/business/dashboard");
  const { business, campaigns, selectedCampaign, selectedCampaignApplications } = await getBusinessDashboard(campaign);
  const filteredApplications = filterApplications(selectedCampaignApplications, statusFilter);
  const visibleCampaigns = getFilteredCampaigns(campaigns, campaignFilter, searchQuery, sortOrder);
  const totalPages = Math.max(Math.ceil(visibleCampaigns.length / CAMPAIGNS_PER_PAGE), 1);
  const currentPage = Math.min(normalizePage(page), totalPages);
  const paginatedCampaigns = visibleCampaigns.slice((currentPage - 1) * CAMPAIGNS_PER_PAGE, currentPage * CAMPAIGNS_PER_PAGE);
  const summary = {
    recruiting: campaigns.filter((item) => item.status === "recruiting").length,
    progressing: campaigns.filter((item) => item.status === "in_progress").length,
    review: campaigns.filter((item) => item.status === "submission_review").length,
    completed: campaigns.filter((item) => item.status === "completed").length
  };

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
    <main className="bg-[#F8F9FA]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 md:py-10 lg:flex-row lg:px-8">
        <OperatorSidebar business={business} />

        <div className="min-w-0 flex-grow space-y-8">
          {error ? <p className="rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">캠페인 관리</h1>
              <p className="mt-2 text-sm text-gray-500">운영 중인 캠페인의 진행 상황을 한눈에 확인하세요.</p>
            </div>
            <Link href="/business/campaigns/new" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-primaryHover sm:w-auto">
              <Plus size={17} /> 새 캠페인 만들기
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatusSummaryCard label="모집중" count={summary.recruiting} dotClassName="bg-[#4338CA]" />
            <StatusSummaryCard label="진행중" count={summary.progressing} dotClassName="bg-[#1D4ED8]" />
            <StatusSummaryCard label="리뷰 확인" count={summary.review} dotClassName="bg-[#B45309]" />
            <StatusSummaryCard label="완료됨" count={summary.completed} dotClassName="bg-[#047857]" />
          </div>

          <section className="flex flex-col overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex overflow-x-auto border-b border-gray-100 px-4 pt-2 sm:px-6">
              {campaignListTabs.map(([tabStatus, label]) => (
                <Link
                  key={label}
                  href={campaignListHref(tabStatus, searchQuery, sortOrder)}
                  className={`whitespace-nowrap border-b-2 px-4 py-4 text-sm ${
                    campaignFilter === tabStatus
                      ? "border-primary font-bold text-primary"
                      : "border-transparent font-medium text-gray-500 hover:text-charcoal"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            <form action="/business/dashboard" className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4 sm:flex-row sm:p-6">
              <div className="relative w-full sm:w-64">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm placeholder-gray-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="캠페인명 검색"
                />
              </div>
              <div className="flex w-full gap-2 overflow-x-auto sm:w-auto">
                <select name="status" defaultValue={campaignFilter} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">상태 전체</option>
                  <option value="active">모집중/선정</option>
                  <option value="review">리뷰 진행중</option>
                  <option value="completed">완료</option>
                </select>
                <select name="sort" defaultValue={sortOrder} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="latest">최신순</option>
                  <option value="deadline">마감일순</option>
                </select>
                <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-charcoal shadow-sm transition-colors hover:bg-gray-50 hover:text-primary">
                  적용
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="w-1/3 px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">캠페인 정보</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">진행 상태</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">모집 인원</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">기간</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedCampaigns.map((item) => (
                    <CampaignManagementRow key={item.id} campaign={item} selected={selectedCampaign?.id === item.id} statusFilter={statusFilter} />
                  ))}
                  {paginatedCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                        조건에 맞는 캠페인이 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} filter={campaignFilter} searchQuery={searchQuery} sortOrder={sortOrder} />
          </section>
        </div>
      </div>

      {selectedCampaign ? <ApplicantModal campaign={selectedCampaign} applications={filteredApplications} statusFilter={statusFilter} /> : null}
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
