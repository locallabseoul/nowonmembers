import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, ImageIcon, Pencil, Plus, Search, X } from "lucide-react";
import { Badge } from "@/app/components/ui";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { getCampaignDeadlineLabel, getCampaignLifecycle } from "@/lib/campaign-lifecycle";
import { formatPoints } from "@/lib/points";
import { getBusinessDashboard, type DashboardApplication, type DashboardCampaign, type DashboardSubmission } from "@/lib/supabase/queries";
import { requireRole } from "@/lib/auth/guards";
import { approveRecommendedApplication, cancelCampaignBeforePublish, finalizeCampaignSelection, saveBusinessProfile, submitDraftCampaignForReview, withdrawCampaignFromReview } from "./actions";
import { BusinessProfileWizard } from "./business-profile-wizard";
import { FormBanner } from "@/app/components/form-field";

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
type ModalTab = "applications" | "submissions";

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

function dashboardHref(path: string, campaignId?: string, appStatus?: string, modalTab: ModalTab = "applications") {
  const params = new URLSearchParams();
  if (campaignId) params.set("campaign", campaignId);
  if (appStatus) params.set("appStatus", appStatus);
  if (modalTab !== "applications") params.set("tab", modalTab);
  const query = params.toString();

  return query ? `${path}?${query}` : path;
}

function normalizeApplicationStatusFilter(value?: string) {
  return applicationStatusTabs.some(([status]) => status === value) ? value ?? "" : "";
}

function normalizeModalTab(value?: string): ModalTab {
  return value === "submissions" ? "submissions" : "applications";
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
  if (application.recruitCount > 0 && application.selectedCount >= application.recruitCount) return "선정 정원이 마감되었습니다.";
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

function formatDateTimeShort(value: string) {
  if (!value) return "미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function collaborationStatusLabel(status: string) {
  if (status === "selected") return "선정";
  if (status === "visit_scheduled") return "방문 예정";
  if (status === "visited") return "방문 완료";
  if (status === "submitted") return "제출 완료";
  if (status === "revision_requested") return "수정 요청";
  if (status === "approved") return "승인";
  if (status === "completed") return "완료";
  if (status === "no_show") return "미방문";
  if (status === "cancelled") return "취소";
  return status || "진행중";
}

function submissionStatusLabel(submission: DashboardSubmission) {
  const reviewStatus = submission.submission?.reviewStatus;
  if (!reviewStatus) return "제출 대기";
  if (reviewStatus === "submitted") return "관리자 검수 대기";
  if (reviewStatus === "needs_revision") return "수정 요청됨";
  if (reviewStatus === "approved") return "승인 완료";
  if (reviewStatus === "rejected") return "반려";
  return reviewStatus;
}

function submissionStatusTone(submission: DashboardSubmission): "blue" | "green" | "gray" | "amber" | "red" {
  const reviewStatus = submission.submission?.reviewStatus;
  if (!reviewStatus) return "gray";
  if (reviewStatus === "approved") return "green";
  if (reviewStatus === "needs_revision" || reviewStatus === "rejected") return "red";
  if (reviewStatus === "submitted") return "amber";
  return "blue";
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
      sub: `선정 ${campaign.recruitCount}명`,
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
    main: `선정 ${campaign.recruitCount}명`,
    sub: campaign.applicationCount ? `지원 ${campaign.applicationCount}명` : "지원자 없음",
    highlight: false
  };
}

function campaignSubmissionText(campaign: DashboardCampaign) {
  if (campaign.selectedCount <= 0) return null;

  const detail = [
    campaign.pendingReviewCount ? `검수 ${campaign.pendingReviewCount}` : "",
    campaign.revisionRequestedCount ? `수정요청 ${campaign.revisionRequestedCount}` : "",
    campaign.approvedSubmissionCount ? `승인 ${campaign.approvedSubmissionCount}` : "",
    campaign.pendingSubmissionCount ? `미제출 ${campaign.pendingSubmissionCount}` : ""
  ].filter(Boolean).join(" · ");

  return {
    main: `제출 ${campaign.submissionCount}/${campaign.selectedCount}명`,
    detail
  };
}

function campaignActionLabel(campaign: DashboardCampaign) {
  if (campaign.status === "draft") return "검수 제출";
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
  const submissionText = campaignSubmissionText(campaign);
  const actionIsPrimary = campaign.status === "selecting";
  const actionTab: ModalTab = campaign.status === "submission_review" || campaign.status === "completed" ? "submissions" : "applications";
  const actionHref = dashboardHref("/business/dashboard", campaign.id, statusFilter, actionTab);
  const isEditable = campaign.status === "draft" || campaign.status === "revision_requested";
  // 검수 대기 중에는 요청을 회수해야 고칠 수 있다. 회수 후 바로 수정 화면으로 보낸다.
  const canWithdraw = campaign.status === "in_review";

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
          {campaign.status === "revision_requested" ? <Badge tone="red">수정 필요</Badge> : null}
          {campaign.pointReservation ? (
            <Badge tone={campaign.pointReservation.status === "reserved" ? "amber" : "green"}>
              {campaign.pointReservation.status === "reserved"
                ? `${formatPoints(campaign.pointReservation.reservedPoints)} 예약`
                : `${formatPoints(campaign.pointReservation.consumedPoints)} 확정`}
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="px-6 py-5">
        <div className={`text-sm font-medium ${applicantText.highlight ? "text-primary" : "text-charcoal"}`}>{applicantText.main}</div>
        {applicantText.sub ? <div className="mt-1 text-xs text-gray-500">{applicantText.sub}</div> : null}
        {submissionText ? (
          <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600">
            <span className={campaign.pendingReviewCount || campaign.revisionRequestedCount ? "text-primary" : "text-gray-700"}>{submissionText.main}</span>
            {submissionText.detail ? <span className="ml-1 text-gray-400">· {submissionText.detail}</span> : null}
          </div>
        ) : null}
      </td>
      <td className="px-6 py-5 text-sm text-gray-600">{campaignPeriodText(campaign)}</td>
      <td className="px-6 py-5 text-right">
        {canWithdraw ? (
          <div className="flex items-center justify-end gap-2">
            <form action={withdrawCampaignFromReview}>
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-gray-50 hover:text-primary">
                <Pencil size={13} />
                수정
              </button>
            </form>
            <Link
              href={actionHref}
              className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
            >
              {campaignActionLabel(campaign)}
            </Link>
          </div>
        ) : isEditable ? (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/business/campaigns/${campaign.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-charcoal shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
            >
              <Pencil size={13} />
              수정
            </Link>
            {campaign.status === "draft" ? (
              <form action={submitDraftCampaignForReview}>
                <input type="hidden" name="campaign_id" value={campaign.id} />
                <button className="inline-flex rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primaryHover">
                  {campaignActionLabel(campaign)}
                </button>
              </form>
            ) : null}
          </div>
        ) : (
          <Link
            href={actionHref}
            className={`inline-flex rounded-lg px-3 py-1.5 text-sm shadow-sm transition-colors ${
              actionIsPrimary
                ? "bg-primary font-bold text-white hover:bg-primaryHover"
                : "border border-gray-200 bg-white font-medium text-charcoal hover:bg-gray-50 hover:text-primary"
            }`}
          >
            {campaignActionLabel(campaign)}
          </Link>
        )}
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

function SubmissionCard({ item }: { item: DashboardSubmission }) {
  const submission = item.submission;

  return (
    <article className="overflow-hidden rounded-lg bg-gray-50">
      {submission?.previewImageUrl ? (
        <a href={submission.previewImageUrl} target="_blank" rel="noreferrer" className="block h-44 overflow-hidden bg-gray-100">
          <img src={submission.previewImageUrl} alt="" className="h-full w-full object-cover transition-transform hover:scale-[1.02]" />
        </a>
      ) : (
        <div className="flex h-44 items-center justify-center bg-gray-100 text-gray-400">
          <ImageIcon size={28} />
        </div>
      )}
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone={submissionStatusTone(item)}>{submissionStatusLabel(item)}</Badge>
          <Badge tone="gray">{collaborationStatusLabel(item.collaborationStatus)}</Badge>
        </div>
        <div>
          <p className="text-sm font-black text-charcoal">{item.creatorNickname}</p>
          <p className="mt-1 text-xs font-bold text-gray-400">{item.creatorChannelSummary}</p>
        </div>
        <div className="grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
          <span>선정일 {formatDateTimeShort(item.selectedAt)}</span>
          <span>제출 마감 {formatDateShort(item.submissionDue)}</span>
          <span>게시 채널 {submission?.platform || "미제출"}</span>
          <span>게시일 {formatDateShort(submission?.publishedAt ?? "")}</span>
          <span>제공 표시 {submission?.disclosureConfirmed ? "확인" : "미확인"}</span>
          <span>업데이트 {formatDateTimeShort(submission?.updatedAt ?? "")}</span>
        </div>
        {submission?.contentUrl ? (
          <a href={submission.contentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 break-all text-sm font-black text-primary">
            콘텐츠 열기
            <ExternalLink size={14} />
          </a>
        ) : (
          <p className="text-sm text-gray-500">아직 제출된 콘텐츠 URL이 없습니다.</p>
        )}
        {submission?.adminMemo ? <p className="rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-700">관리자 메모: {submission.adminMemo}</p> : null}
      </div>
    </article>
  );
}

function ApplicantModal({
  campaign,
  applications,
  submissions,
  statusFilter,
  activeTab
}: {
  campaign: DashboardCampaign;
  applications: DashboardApplication[];
  submissions: DashboardSubmission[];
  statusFilter: string;
  activeTab: ModalTab;
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
            <p className="mt-1 text-sm text-gray-500">캠페인 지원자와 제출 콘텐츠</p>
            {campaign.pointReservation ? (
              <p className="mt-2 text-xs font-bold text-primary">
                예약 {formatPoints(campaign.pointReservation.reservedPoints)}
                {campaign.pointReservation.status === "settled"
                  ? ` · 확정 ${formatPoints(campaign.pointReservation.consumedPoints)} · 반환 ${formatPoints(campaign.pointReservation.returnedPoints)}`
                  : ""}
              </p>
            ) : null}
          </div>
          <Link href="/business/dashboard" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100" aria-label="닫기">
            <X size={20} />
          </Link>
        </div>
        <div className="border-b border-line p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <Link
              href={dashboardHref("/business/dashboard", campaign.id, statusFilter, "applications")}
              className={`rounded-lg px-4 py-2 text-sm font-black ${activeTab === "applications" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
            >
              지원자
            </Link>
            <Link
              href={dashboardHref("/business/dashboard", campaign.id, statusFilter, "submissions")}
              className={`rounded-lg px-4 py-2 text-sm font-black ${activeTab === "submissions" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
            >
              제출 콘텐츠
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTab === "applications" ? applicationStatusTabs.map(([status, label]) => (
              <Link
                key={label}
                href={dashboardHref("/business/dashboard", campaign.id, status, "applications")}
                className={`rounded-lg px-3 py-2 text-xs font-black ${statusFilter === status ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {label}
              </Link>
            )) : (
              <p className="text-xs font-bold text-gray-500">선정된 협업 {submissions.length}건의 제출 현황입니다.</p>
            )}
          </div>
          {campaign.status === "selecting" && campaign.selectedCount > 0 ? (
            <form action={finalizeCampaignSelection} className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <p className="mb-3 text-xs leading-5 text-gray-600">현재 선정 인원으로 마감하면 남은 지원자는 미선정 처리되고 캠페인이 진행 상태로 전환됩니다.</p>
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-primaryHover">현재 {campaign.selectedCount}명으로 선정 완료</button>
            </form>
          ) : null}
          {campaign.status === "revision_requested" ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-800">운영자 수정 요청</p>
              {campaign.adminMemo ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-amber-800">{campaign.adminMemo}</p>
              ) : null}
              <Link
                href={`/business/campaigns/${campaign.id}/edit`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-amber-700"
              >
                <Pencil size={13} />
                수정하고 다시 요청하기
              </Link>
            </div>
          ) : null}
          {campaign.status === "in_review" ? (
            <form action={withdrawCampaignFromReview} className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <p className="mb-3 text-xs leading-5 text-gray-600">
                검수 대기 중입니다. 내용을 고치려면 요청을 회수해주세요. 예약한 포인트는 그대로 유지되고, 수정 후 다시 요청하면 재예약 없이 올라갑니다.
              </p>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-black text-charcoal transition-colors hover:border-primary hover:text-primary">
                <Pencil size={13} />
                검수 요청 회수하고 수정하기
              </button>
            </form>
          ) : null}
          {["draft", "in_review", "revision_requested", "approved", "scheduled"].includes(campaign.status) ? (
            <form action={cancelCampaignBeforePublish} className="mt-4">
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <button className="rounded-lg border border-red-200 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50">공개 전 취소 및 포인트 반환</button>
            </form>
          ) : null}
        </div>
        <div className="overflow-y-auto p-5">
          {activeTab === "applications" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {applications.map((application) => <ApplicantCard key={application.id} application={application} />)}
              </div>
              {applications.length === 0 ? <p className="text-sm text-gray-500">해당 조건의 지원자가 없습니다.</p> : null}
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {submissions.map((item) => <SubmissionCard key={item.collaborationId} item={item} />)}
              </div>
              {submissions.length === 0 ? <p className="text-sm text-gray-500">선정된 협업이 아직 없습니다.</p> : null}
            </>
          )}
        </div>
      </section>
    </div>
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

export default async function BusinessDashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; campaign?: string; appStatus?: string; status?: string; sort?: string; q?: string; page?: string; next?: string; profile?: string; tab?: string }> }) {
  const { error, message, campaign, appStatus, status, sort, q, page, next, profile, tab } = await searchParams;
  const statusFilter = normalizeApplicationStatusFilter(appStatus);
  const activeModalTab = normalizeModalTab(tab);
  const campaignFilter = normalizeCampaignListFilter(status);
  const sortOrder = normalizeCampaignSort(sort);
  const searchQuery = q?.trim() ?? "";
  const { supabase } = await requireRole("business", "/business/dashboard");
  const [{ business, businessProfileDefaults, campaigns, selectedCampaign, selectedCampaignApplications, selectedCampaignSubmissions }, { data: walletRows }] = await Promise.all([
    getBusinessDashboard(campaign),
    supabase.rpc("get_my_point_wallet")
  ]);
  const wallet = Array.isArray(walletRows) ? walletRows[0] : walletRows;
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
      <main className="bg-[#F8F9FA]">
        <BusinessProfileWizard action={saveBusinessProfile} error={error} message={message} next={next} initialBusiness={businessProfileDefaults ?? undefined} />
      </main>
    );
  }

  if (profile === "edit") {
    return (
      <main className="bg-[#F8F9FA]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 md:py-10 lg:flex-row lg:px-8">
          <OperatorSidebar business={business} active="campaigns" />
          <div className="min-w-0 flex-grow">
            <BusinessProfileWizard action={saveBusinessProfile} error={error} message={message} next={next} mode="edit" initialBusiness={business} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#F8F9FA]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 md:py-10 lg:flex-row lg:px-8">
        <OperatorSidebar business={business} active="campaigns" />

        <div className="min-w-0 flex-grow space-y-8">
          {error ? <FormBanner>{error}</FormBanner> : null}
          {message ? <p className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">{message}</p> : null}

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">캠페인 관리</h1>
              <p className="mt-2 text-sm text-gray-500">운영 중인 캠페인의 진행 상황을 한눈에 확인하세요.</p>
            </div>
            <Link href="/business/campaigns/new" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-primaryHover sm:w-auto">
              <Plus size={17} /> 새 캠페인 만들기
            </Link>
          </div>

          <Link href="/business/points" className="flex flex-col justify-between gap-3 rounded-[20px] border border-primary/15 bg-primary/5 p-5 transition-colors hover:bg-primary/10 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-black text-charcoal">캠페인 포인트</p>
              <p className="mt-1 text-xs text-gray-500">첫 캠페인 2건 무료 · 최대 10명 모집 가능한 50,000P 출시 혜택</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl font-black text-primary">{formatPoints(Number(wallet?.available_points ?? 0))}</p>
              <p className="text-xs text-gray-500">예약 {formatPoints(Number(wallet?.reserved_points ?? 0))}</p>
            </div>
          </Link>

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
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">선정 인원</th>
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

      {selectedCampaign ? (
        <ApplicantModal
          campaign={selectedCampaign}
          applications={filteredApplications}
          submissions={selectedCampaignSubmissions}
          statusFilter={statusFilter}
          activeTab={activeModalTab}
        />
      ) : null}
    </main>
  );
}
