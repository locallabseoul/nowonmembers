import Link from "next/link";
import { Badge } from "@/app/components/ui";
import { getCampaignLifecycle, getCampaignSelectionPeriod, isCampaignSelectionOverdue } from "@/lib/campaign-lifecycle";
import { formatPoints } from "@/lib/points";
import { getAdminCampaigns, type DashboardApplication, type DashboardCampaign, type DashboardSubmission } from "@/lib/supabase/queries";
import { ExternalLink, ImageIcon, X } from "lucide-react";
import { adjustBusinessPoints, approveCampaign, approveSubmission, publishLocalStory, recommendApplication, rejectCampaign, remindCampaignSelection, requestCampaignRevision, requestSubmissionRevision, unrecommendApplication } from "../actions";
import { ConfirmButton } from "@/app/components/confirm-button";
import { FormBanner } from "@/app/components/form-field";

const applicationStatusTabs = [
  ["", "전체"],
  ["submitted", "신규"],
  ["recommended", "추천"],
  ["selected", "선정"],
  ["rejected", "미선정"]
] as const;

type ModalTab = "applications" | "submissions";

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
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function dashboardHref(campaignId?: string, appStatus?: string, modalTab: ModalTab = "applications") {
  const params = new URLSearchParams();
  if (campaignId) params.set("campaign", campaignId);
  if (appStatus) params.set("appStatus", appStatus);
  if (modalTab !== "applications") params.set("tab", modalTab);
  const query = params.toString();

  return query ? `/admin/campaigns?${query}` : "/admin/campaigns";
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

function campaignActionLabel(campaign: DashboardCampaign) {
  if (campaign.status === "submission_review") return "제출 검토";
  if (campaign.status === "completed") return "결과 확인";
  if (campaign.status === "recruiting" || campaign.status === "selecting") return "지원자 보기";

  return "상세 보기";
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

// 모집중일 때는 앞으로 지켜야 할 약속이고, 선정중일 때는 지금 감시해야 할 마감이다.
function campaignSelectionMeta(campaign: DashboardCampaign) {
  if (campaign.status !== "recruiting" && campaign.status !== "selecting") return null;

  const period = getCampaignSelectionPeriod(campaign);
  const overdue = isCampaignSelectionOverdue(campaign);
  if (!period.end) return { text: "선정 기간 미정", overdueLabel: "" };

  const range = `선정 기간 ${formatDateShort(period.start)} ~ ${formatDateShort(period.end)}`;

  return {
    text: campaign.status === "selecting" ? `${range} · ${period.label}` : range,
    overdueLabel: overdue ? period.label : ""
  };
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
    timeZone: "Asia/Seoul",
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
  const actionTab: ModalTab = campaign.status === "submission_review" || campaign.status === "completed" ? "submissions" : "applications";
  const submissionText = campaignSubmissionText(campaign);
  const selection = campaignSelectionMeta(campaign);

  return (
    <div className={`grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center ${selected ? "bg-primary/5" : ""}`}>
      <Link href={dashboardHref(campaign.id, statusFilter)} className="block">
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge tone={lifecycle.badgeTone}>{lifecycle.label}</Badge>
          {selection?.overdueLabel ? <Badge tone="red">{selection.overdueLabel}</Badge> : null}
          <Badge>{campaign.campaignType}</Badge>
          {selected ? <Badge tone="green">선택됨</Badge> : null}
          {campaign.pointReservation ? (
            <Badge tone={campaign.pointReservation.status === "reserved" ? "amber" : "green"}>
              {campaign.pointReservation.status === "reserved"
                ? `${formatPoints(campaign.pointReservation.reservedPoints)} 예약`
                : `${formatPoints(campaign.pointReservation.consumedPoints)} 확정`}
            </Badge>
          ) : campaign.billingMode === "points_v1" ? <Badge tone="red">예약 없음</Badge> : null}
        </div>
        <h3 className="font-black text-charcoal">{campaign.title}</h3>
        <p className="mt-2 text-sm text-gray-500">{campaign.businessName ?? "가게명 미등록"} · 모집 {campaign.recruitStart || "승인 시 시작"} - {campaign.recruitEnd || "미정"}</p>
        {selection ? (
          <p className={`mt-1 text-xs font-bold ${selection.overdueLabel ? "text-red-600" : "text-gray-500"}`}>{selection.text}</p>
        ) : null}
        <p className="mt-2 text-xs font-bold text-gray-500">
          전체 지원 {campaign.applicationCount}명 · 추천 {campaign.recommendedCount}명 · 선정 {campaign.selectedCount}/{campaign.recruitCount}명
        </p>
        {submissionText ? (
          <p className="mt-2 text-xs font-bold text-gray-500">
            <span className={campaign.pendingReviewCount || campaign.revisionRequestedCount ? "text-primary" : "text-gray-600"}>{submissionText.main}</span>
            {submissionText.detail ? <span className="ml-1 text-gray-400">· {submissionText.detail}</span> : null}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-gray-400">{lifecycle.description}</p>
      </Link>
      {canReview ? (
        <div className="flex flex-wrap gap-2">
          <form action={requestCampaignRevision}>
            <input type="hidden" name="campaign_id" value={campaign.id} />
            <input type="hidden" name="admin_memo" value="운영자 수정 요청" />
            <button className="rounded-lg border border-line px-4 py-2 text-sm font-black text-charcoal">수정 요청</button>
          </form>
          {/* 취소는 되돌릴 수 없다. 고쳐서 다시 받을 생각이면 수정 요청을 써야 한다. */}
          <ConfirmButton
            label="캠페인 취소"
            confirmLabel="캠페인을 취소하고 예약 포인트를 반환합니다. 되돌릴 수 없습니다"
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-black text-red-600"
          >
            <form action={rejectCampaign} className="inline">
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <input type="hidden" name="admin_memo" value="관리자 검수 반려" />
              <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white">취소 확정</button>
            </form>
          </ConfirmButton>
          <form action={approveCampaign}>
            <input type="hidden" name="campaign_id" value={campaign.id} />
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white">승인</button>
          </form>
        </div>
      ) : campaign.status === "draft" ? (
        <span className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-bold text-gray-400">가게가 작성 중</span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {selection?.overdueLabel ? (
            <div className="text-right">
              {/* 선정은 가게가 한다. 운영자가 할 수 있는 건 발표일이 지났다고 알리는 것뿐이다. */}
              <ConfirmButton
                label="선정 독촉"
                confirmLabel="가게에 선정을 마무리해달라는 알림을 보냅니다"
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-black text-red-600"
              >
                <form action={remindCampaignSelection} className="inline">
                  <input type="hidden" name="campaign_id" value={campaign.id} />
                  <input type="hidden" name="return_to" value={dashboardHref(campaign.id, statusFilter, actionTab)} />
                  <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white">독촉 보내기</button>
                </form>
              </ConfirmButton>
              {campaign.selectionRemindedAt ? (
                <p className="mt-1 text-xs font-bold text-gray-400">마지막 독촉 {formatDateTimeShort(campaign.selectionRemindedAt)}</p>
              ) : null}
            </div>
          ) : null}
          <Link href={dashboardHref(campaign.id, statusFilter, actionTab)} className="rounded-lg bg-white px-4 py-2 text-sm font-black text-primary ring-1 ring-primary/20">
            {campaignActionLabel(campaign)}
          </Link>
        </div>
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

function SubmissionCard({ item, canManage, returnTo }: { item: DashboardSubmission; canManage: boolean; returnTo: string }) {
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
        {canManage && submission?.reviewStatus === "submitted" ? (
          <div className="flex flex-wrap gap-2">
            <form action={approveSubmission}>
              <input type="hidden" name="submission_id" value={submission.id} />
              <input type="hidden" name="return_to" value={returnTo} />
              <button className="rounded-lg bg-primary px-3 py-2 text-xs font-black text-white">승인</button>
            </form>
            <form action={requestSubmissionRevision}>
              <input type="hidden" name="submission_id" value={submission.id} />
              <input type="hidden" name="admin_memo" value="제출 콘텐츠 수정 요청" />
              <input type="hidden" name="return_to" value={returnTo} />
              <button className="rounded-lg bg-white px-3 py-2 text-xs font-black text-charcoal ring-1 ring-line">수정 요청</button>
            </form>
          </div>
        ) : null}
        {canManage && submission?.reviewStatus === "approved" ? (
          <form action={publishLocalStory}>
            <input type="hidden" name="submission_id" value={submission.id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <button className="rounded-lg bg-white px-3 py-2 text-xs font-black text-primary ring-1 ring-primary/20">로컬 스토리 발행</button>
          </form>
        ) : null}
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
  const modalReturnTo = dashboardHref(campaign.id, statusFilter, activeTab);
  const selection = campaignSelectionMeta(campaign);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="admin-applicant-modal-title">
      <Link href="/admin/campaigns" className="absolute inset-0 bg-charcoal/50" aria-label="지원자 팝업 닫기" />
      <section className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone={getCampaignLifecycle(campaign).badgeTone}>{campaignStatusLabel(campaign.status)}</Badge>
              <Badge tone="gray">전체 {campaign.applicationCount}명</Badge>
              <Badge tone="amber">추천 {campaign.recommendedCount}명</Badge>
              <Badge tone="green">선정 {campaign.selectedCount}/{campaign.recruitCount}명</Badge>
              {selection?.overdueLabel ? <Badge tone="red">{selection.overdueLabel}</Badge> : null}
            </div>
            <h2 id="admin-applicant-modal-title" className="text-xl font-black text-charcoal">{campaign.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{campaign.businessName ?? "가게명 미등록"} · 지원자와 제출 콘텐츠</p>
            {selection ? (
              <p className={`mt-1 text-sm font-bold ${selection.overdueLabel ? "text-red-600" : "text-gray-500"}`}>{selection.text}</p>
            ) : null}
            {selection?.overdueLabel ? (
              <div className="mt-3">
                <ConfirmButton
                  label="선정 독촉"
                  confirmLabel="가게에 선정을 마무리해달라는 알림을 보냅니다"
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-black text-red-600"
                >
                  <form action={remindCampaignSelection} className="inline">
                    <input type="hidden" name="campaign_id" value={campaign.id} />
                    <input type="hidden" name="return_to" value={modalReturnTo} />
                    <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white">독촉 보내기</button>
                  </form>
                </ConfirmButton>
                {campaign.selectionRemindedAt ? (
                  <p className="mt-1 text-xs font-bold text-gray-400">마지막 독촉 {formatDateTimeShort(campaign.selectionRemindedAt)}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          <Link href="/admin/campaigns" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100" aria-label="닫기">
            <X size={20} />
          </Link>
        </div>
        <form action={adjustBusinessPoints} className="grid gap-3 border-b border-line bg-amber-50/60 p-5 sm:grid-cols-[140px_1fr_auto]">
          <input type="hidden" name="business_id" value={campaign.businessId} />
          <input type="hidden" name="return_to" value={modalReturnTo} />
          <input
            type="number"
            name="points"
            step="5000"
            placeholder="+/- 포인트"
            required
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            name="reason"
            placeholder="수동 지급·차감 사유"
            required
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button className="rounded-lg bg-charcoal px-4 py-2 text-sm font-black text-white">포인트 조정</button>
        </form>
        <div className="border-b border-line p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <Link
              href={dashboardHref(campaign.id, statusFilter, "applications")}
              className={`rounded-lg px-4 py-2 text-sm font-black ${activeTab === "applications" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
            >
              지원자
            </Link>
            <Link
              href={dashboardHref(campaign.id, statusFilter, "submissions")}
              className={`rounded-lg px-4 py-2 text-sm font-black ${activeTab === "submissions" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
            >
              제출 콘텐츠
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTab === "applications" ? applicationStatusTabs.map(([status, label]) => (
              <Link
                key={label}
                href={dashboardHref(campaign.id, status, "applications")}
                className={`rounded-lg px-3 py-2 text-xs font-black ${statusFilter === status ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {label}
              </Link>
            )) : (
              <p className="text-xs font-bold text-gray-500">선정된 협업 {submissions.length}건의 제출 현황입니다.</p>
            )}
          </div>
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
                {submissions.map((item) => <SubmissionCard key={item.collaborationId} item={item} canManage returnTo={modalReturnTo} />)}
              </div>
              {submissions.length === 0 ? <p className="text-sm text-gray-500">선정된 협업이 아직 없습니다.</p> : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default async function AdminCampaignsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; campaign?: string; appStatus?: string; tab?: string }> }) {
  const { error, message, campaign, appStatus, tab } = await searchParams;
  const statusFilter = normalizeApplicationStatusFilter(appStatus);
  const activeModalTab = normalizeModalTab(tab);
  const { campaigns, selectedCampaign, selectedCampaignApplications, selectedCampaignSubmissions } = await getAdminCampaigns(campaign);
  const filteredApplications = filterApplications(selectedCampaignApplications, statusFilter);
  // 발표일을 넘긴 캠페인은 크리에이터가 이미 기다리는 중이다. 등록순에 묻히지 않게 위로 올린다.
  const sortedCampaigns = campaigns
    .map((item) => ({ item, overdueDays: isCampaignSelectionOverdue(item) ? getCampaignSelectionPeriod(item).overdueDays : 0 }))
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .map(({ item }) => item);

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-charcoal">캠페인 심사</h1>
        <p className="mt-2 text-gray-500">등록된 캠페인을 검수하고, 지원자 추천과 제출 콘텐츠를 관리합니다.</p>
      </div>
      {error ? <div className="mb-6"><FormBanner>{error}</FormBanner></div> : null}
      {message ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-black text-charcoal">캠페인 관리</h2>
          <p className="mt-1 text-sm text-gray-500">캠페인의 `지원자 보기`를 누르면 해당 캠페인의 지원자 팝업이 열립니다.</p>
        </div>
        <div className="divide-y divide-line">
          {sortedCampaigns.map((item) => (
            <CampaignManagementRow key={item.id} campaign={item} selected={selectedCampaign?.id === item.id} statusFilter={statusFilter} />
          ))}
          {campaigns.length === 0 ? <p className="p-5 text-sm text-gray-500">관리할 캠페인이 없습니다.</p> : null}
        </div>
      </section>

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
