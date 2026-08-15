import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, ExternalLink, PenLine, Send } from "lucide-react";
import { Badge } from "@/app/components/ui";
import { StoreContactCard } from "@/app/components/store-contact-card";
import { CancelApplicationButton } from "@/app/creator/cancel-application-button";
import { daysUntilDate } from "@/lib/campaign-lifecycle";
import { requireRole } from "@/lib/auth/guards";
import { getCreatorDashboard, type CreatorDashboardData } from "@/lib/supabase/queries";

type CreatorDashboardTab = "active" | "completed";
type CreatorDashboardCreator = NonNullable<CreatorDashboardData["creator"]>;
type CreatorApplication = CreatorDashboardData["applications"][number];
type CreatorCollaboration = CreatorDashboardData["collaborations"][number];

function normalizeTab(value?: string): CreatorDashboardTab {
  return value === "completed" ? "completed" : "active";
}

function formatDateShort(value: string) {
  if (!value || value === "미정") return "미정";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;

  return `${year}.${month}.${day}`;
}

function submissionDeadlineLabel(value: string) {
  const remainingDays = daysUntilDate(value);
  if (remainingDays === null) return "제출일 미정";
  if (remainingDays < 0) return "마감 지남";
  if (remainingDays === 0) return "오늘 마감";
  return `제출 D-${remainingDays}`;
}

function campaignTypeLabel(value: string) {
  if (value === "shortform") return "릴스/쇼츠";
  if (value === "interview") return "인스타";
  return "블로그";
}

function applicationStatusLabel(status: string) {
  if (status === "recommended") return "추천 후보";
  if (status === "submitted") return "결과 대기중";
  if (status === "selected") return "선정 완료";
  if (status === "rejected") return "미선정";
  if (status === "cancelled") return "취소";
  return status;
}

function applicationStatusTone(status: string): "blue" | "green" | "gray" | "amber" {
  if (status === "recommended") return "amber";
  if (status === "selected") return "green";
  if (status === "rejected" || status === "cancelled") return "gray";
  return "blue";
}

function collaborationStatusLabel(item: CreatorCollaboration) {
  if (!item.hasSubmission) return "제출 대기";
  if (item.submissionReviewStatus === "submitted") return "검수 대기";
  if (item.submissionReviewStatus === "needs_revision") return "수정 요청";
  if (item.submissionReviewStatus === "approved" || item.status === "completed") return "승인 완료";
  if (item.submissionReviewStatus === "rejected") return "반려";
  if (item.status === "visit_scheduled") return "방문 예정";
  if (item.status === "visited") return "방문 완료";
  return "진행중";
}

function collaborationStatusTone(item: CreatorCollaboration): "red" | "green" | "blue" | "gray" | "amber" {
  if (!item.hasSubmission) return "red";
  if (item.submissionReviewStatus === "needs_revision" || item.submissionReviewStatus === "rejected") return "red";
  if (item.submissionReviewStatus === "approved" || item.status === "completed") return "green";
  if (item.submissionReviewStatus === "submitted") return "amber";
  return "blue";
}

function isFinishedCollaboration(item: CreatorCollaboration) {
  return item.status === "completed" || item.submissionReviewStatus === "approved";
}

function requiresSubmissionAction(item: CreatorCollaboration) {
  if (item.status === "cancelled" || item.status === "no_show" || isFinishedCollaboration(item)) return false;
  return !item.hasSubmission || item.submissionReviewStatus === "needs_revision";
}

function ProfileSummary({ creator }: { creator: CreatorDashboardCreator }) {
  const initial = creator.nickname.slice(0, 1);
  const profileBadge = creator.contentTypes[0] ?? "크리에이터";
  const chips = creator.interests.length ? creator.interests : creator.activityAreas;

  return (
    <section className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
          {creator.avatarUrl ? (
            <img src={creator.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-xl font-black text-primary">{initial}</div>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-charcoal">{creator.nickname}</h2>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">{profileBadge}</span>
          </div>
          <p className="truncate text-sm text-gray-500">{creator.email || "이메일 미등록"}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {chips.length ? chips.slice(0, 6).map((chip) => (
          <span key={chip} className="inline-block rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-charcoal">
            #{chip.replace(/^#/, "")}
          </span>
        )) : (
          <span className="inline-block rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">관심 분야 미등록</span>
        )}
      </div>

      <Link href="/creator/profile" className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50">
        <PenLine size={14} />
        프로필 수정
      </Link>
    </section>
  );
}

function ActivityStats({
  applicationsCount,
  actionRequiredCount,
  submittedCount,
  deadlineRate
}: {
  applicationsCount: number;
  actionRequiredCount: number;
  submittedCount: number;
  deadlineRate: number;
}) {
  return (
    <section className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <h3 className="mb-4 text-base font-bold text-charcoal">활동 요약</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <div className="mb-1 text-2xl font-bold text-charcoal">{applicationsCount}</div>
          <div className="text-xs font-medium text-gray-500">신청한 캠페인</div>
        </div>
        <div className="rounded-xl border border-primary/15 bg-primary/10 p-4 text-center">
          <div className="mb-1 text-2xl font-bold text-primary">{actionRequiredCount}</div>
          <div className="text-xs font-medium text-primary">진행 중 제출 대기</div>
        </div>
        <div className="col-span-2 flex items-center justify-between rounded-xl bg-gray-50 p-4">
          <div className="text-sm font-medium text-gray-500">완료 및 제출한 콘텐츠</div>
          <div className="text-lg font-bold text-charcoal">{submittedCount}건</div>
        </div>
        <div className="col-span-2 flex items-center justify-between rounded-xl bg-gray-50 p-4">
          <div className="text-sm font-medium text-gray-500">
            기한 준수율
            <span className="ml-1.5 text-xs font-normal text-gray-400">마감일 내 게시 비율</span>
          </div>
          {/* 제출 기록이 없으면 0%가 아니라 기록이 없다고 알린다. */}
          <div className="text-lg font-bold text-charcoal">
            {submittedCount > 0 ? `${deadlineRate}%` : <span className="text-sm font-medium text-gray-400">기록 없음</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionRequiredCard({ item }: { item: CreatorCollaboration }) {
  const isRevision = item.submissionReviewStatus === "needs_revision";

  return (
    <article className="overflow-hidden rounded-[20px] border border-primary/20 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex flex-col items-start gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:w-32">
          <img src={item.campaignCoverImage} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-grow">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{isRevision ? "수정 요청" : submissionDeadlineLabel(item.submissionDue)}</span>
            {item.campaignRegion ? <span className="text-xs font-medium text-gray-500">{item.campaignRegion}</span> : null}
          </div>
          <h4 className="mb-1 line-clamp-2 text-base font-bold text-charcoal">{item.campaignTitle}</h4>
          <p className="text-sm text-gray-500">{item.benefitSummary ? `제공: ${item.benefitSummary}` : `제출 마감 ${formatDateShort(item.submissionDue)}`}</p>
        </div>
        <div className="w-full shrink-0 sm:w-auto">
          <Link href={`/creator/submissions/${item.id}`} className="block w-full rounded-xl bg-primary px-5 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-primary/25 transition-colors hover:bg-primaryHover sm:w-auto">
            {isRevision ? "다시 제출하기" : "콘텐츠 제출하기"}
          </Link>
        </div>
      </div>
      <div className="border-t border-gray-100 p-5 pt-4 sm:p-6 sm:pt-4">
        <StoreContactCard
          store={item.store}
          compact
          collaborationId={item.id}
          visitDate={item.visitDate}
          submissionDue={item.submissionDue}
        />
      </div>
    </article>
  );
}

function CollaborationCard({ item }: { item: CreatorCollaboration }) {
  return (
    <article className="overflow-hidden rounded-[20px] border border-gray-100 bg-white transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex flex-col items-start gap-5 p-5 sm:flex-row sm:items-center">
        <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:w-28">
          <img src={item.campaignCoverImage} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-grow">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={collaborationStatusTone(item)}>{collaborationStatusLabel(item)}</Badge>
            <span className="rounded bg-charcoal/90 px-2 py-1 text-[10px] font-bold text-white">{campaignTypeLabel(item.campaignType)}</span>
          </div>
          <h4 className="mb-1 line-clamp-1 text-sm font-bold text-charcoal">{item.campaignTitle}</h4>
          <p className="text-xs text-gray-500">방문일 {formatDateShort(item.visitDate)} · 제출 마감 {formatDateShort(item.submissionDue)}</p>
        </div>
        <div className="w-full shrink-0 sm:w-auto">
          {item.submissionContentUrl ? (
            <a href={item.submissionContentUrl} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto">
              콘텐츠 보기
              <ExternalLink size={14} />
            </a>
          ) : (
            <Link href={`/campaigns/${item.campaignId}`} className="block w-full rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto">
              캠페인 보기
            </Link>
          )}
        </div>
      </div>
      <div className="border-t border-gray-100 p-5 pt-4">
        <StoreContactCard store={item.store} compact />
      </div>
    </article>
  );
}

function ApplicationCard({ application }: { application: CreatorApplication }) {
  return (
    <article className="flex flex-col items-start gap-5 rounded-[20px] border border-gray-100 bg-white p-5 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:flex-row sm:items-center">
      <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:w-28">
        <img src={application.campaignCoverImage} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-grow">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Badge tone={applicationStatusTone(application.status)}>{applicationStatusLabel(application.status)}</Badge>
          <span className="rounded bg-charcoal/90 px-2 py-1 text-[10px] font-bold text-white">{campaignTypeLabel(application.campaignType || application.proposedContentType)}</span>
        </div>
        <h4 className="mb-1 line-clamp-1 text-sm font-bold text-charcoal">{application.campaignTitle}</h4>
        <p className="text-xs text-gray-500">
          {application.status === "rejected"
            ? "이번에는 선정되지 않았습니다. 비슷한 캠페인에 다시 지원해보세요."
            : application.selectionDate ? `${formatDateShort(application.selectionDate)} 선정 결과 발표 예정` : application.campaignRegion || "선정 결과를 기다리고 있습니다."}
        </p>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-1 sm:w-auto">
        <Link href={`/campaigns/${application.campaignId}`} className="block w-full rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto">
          캠페인 보기
        </Link>
        {application.canCancel ? <CancelApplicationButton applicationId={application.id} /> : null}
      </div>
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-gray-200 bg-white p-8 text-center">
      <p className="font-bold text-charcoal">{title}</p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

export default async function CreatorDashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireRole("creator", "/creator/dashboard", true);
  const { tab } = await searchParams;
  const activeTab = normalizeTab(tab);
  const { creator, applications, collaborations, submissions } = await getCreatorDashboard();

  if (!creator) {
    redirect(`/creator/profile?next=${encodeURIComponent("/creator/dashboard")}`);
  }

  const activeApplications = applications.filter((item) => item.status === "submitted" || item.status === "recommended");
  // 미선정 지원도 흔적이 남아야 한다. 조용히 사라지면 크리에이터는 결과를 알 수 없다.
  const rejectedApplications = applications.filter((item) => item.status === "rejected");
  const activeCollaborations = collaborations.filter((item) => item.status !== "cancelled" && item.status !== "no_show" && !isFinishedCollaboration(item));
  const actionRequiredCollaborations = activeCollaborations.filter(requiresSubmissionAction);
  const reviewingCollaborations = activeCollaborations.filter((item) => !requiresSubmissionAction(item));
  const completedCollaborations = collaborations.filter(isFinishedCollaboration);
  const activeCount = activeApplications.length + activeCollaborations.length;
  const completedCount = completedCollaborations.length + rejectedApplications.length;

  return (
    <main className="bg-[#F8F9FA]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">마이페이지</h1>
          <p className="mt-2 text-gray-500">{creator.nickname}님의 프로필과 캠페인 활동 내역을 관리하세요.</p>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <aside className="order-first space-y-6 lg:order-last lg:col-span-4">
            <ProfileSummary creator={creator} />
            <ActivityStats
              applicationsCount={applications.filter((item) => item.status !== "cancelled").length}
              actionRequiredCount={actionRequiredCollaborations.length}
              submittedCount={submissions.length}
              deadlineRate={creator.deadlineRate}
            />
          </aside>

          <section className="lg:col-span-8">
            <div className="mb-6 border-b border-gray-200">
              <nav className="flex gap-6" aria-label="크리에이터 활동">
                <Link href="/creator/dashboard" className={`border-b-2 px-1 py-4 text-sm ${activeTab === "active" ? "border-primary font-bold text-charcoal" : "border-transparent font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}>
                  진행 중인 활동
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${activeTab === "active" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"}`}>{activeCount}</span>
                </Link>
                <Link href="/creator/dashboard?tab=completed" className={`border-b-2 px-1 py-4 text-sm ${activeTab === "completed" ? "border-primary font-bold text-charcoal" : "border-transparent font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}>
                  완료된 캠페인
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${activeTab === "completed" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"}`}>{completedCount}</span>
                </Link>
              </nav>
            </div>

            {activeTab === "active" ? (
              <div className="space-y-10">
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-charcoal">
                      <AlertCircle size={18} className="text-primary" />
                      콘텐츠 제출이 필요해요
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {actionRequiredCollaborations.map((item) => <ActionRequiredCard key={item.id} item={item} />)}
                    {actionRequiredCollaborations.length === 0 ? (
                      <EmptyState title="지금 제출할 콘텐츠가 없습니다" description="선정된 캠페인이 생기면 제출 일정이 여기에 표시됩니다." />
                    ) : null}
                  </div>
                </section>

                {reviewingCollaborations.length ? (
                  <section>
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-charcoal">
                      <Clock size={18} className="text-primary" />
                      검수 중인 콘텐츠
                    </h2>
                    <div className="space-y-4">
                      {reviewingCollaborations.map((item) => <CollaborationCard key={item.id} item={item} />)}
                    </div>
                  </section>
                ) : null}

                <section>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-charcoal">
                    <Send size={18} className="text-primary" />
                    선정 대기 중인 캠페인
                  </h2>
                  <div className="space-y-4">
                    {activeApplications.map((application) => <ApplicationCard key={application.id} application={application} />)}
                    {activeApplications.length === 0 ? (
                      <EmptyState title="선정 대기 중인 캠페인이 없습니다" description="관심 있는 캠페인에 지원하면 결과 대기 내역이 표시됩니다." />
                    ) : null}
                  </div>
                </section>
              </div>
            ) : (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-charcoal">
                  <CheckCircle2 size={18} className="text-primary" />
                  완료된 캠페인
                </h2>
                <div className="space-y-4">
                  {completedCollaborations.map((item) => <CollaborationCard key={item.id} item={item} />)}
                  {completedCollaborations.length === 0 ? (
                    <EmptyState title="완료된 캠페인이 없습니다" description="콘텐츠가 승인되면 완료 내역이 여기에 표시됩니다." />
                  ) : null}
                </div>
                {rejectedApplications.length ? (
                  <div className="mt-10">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-charcoal">
                      <Send size={18} className="text-gray-400" />
                      미선정된 지원
                    </h2>
                    <div className="space-y-4">
                      {rejectedApplications.map((application) => <ApplicationCard key={application.id} application={application} />)}
                    </div>
                  </div>
                ) : null}
              </section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
