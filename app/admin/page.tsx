import { Badge, StatCard } from "@/app/components/ui";
import { getAdminDashboard } from "@/lib/supabase/queries";
import { CheckCircle2, ClipboardCheck, FileWarning, Send, Users } from "lucide-react";
import { approveCampaign, approveSubmission, publishLocalStory, recommendApplication, requestCampaignRevision, requestSubmissionRevision, selectApplication } from "./actions";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { stats, campaigns, applications, submissions, isAdmin } = await getAdminDashboard();
  const completionRate = Math.round((stats.approvedSubmissions / Math.max(stats.totalSubmissions, 1)) * 100);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-black text-primary">운영자</p>
        <h1 className="mt-2 text-3xl font-black text-charcoal">운영 대시보드</h1>
        <p className="mt-2 text-gray-500">검수, 추천, 선정, 제출 확인, 로컬 스토리 발행을 관리합니다.</p>
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
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <div className="border-b border-line p-5">
            <h2 className="text-xl font-black text-charcoal">캠페인 검수 큐</h2>
          </div>
          <div className="divide-y divide-line">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="mb-2 flex gap-2"><Badge tone={campaign.status === "recruiting" ? "red" : "amber"}>{campaign.status}</Badge><Badge>{campaign.campaignType}</Badge></div>
                  <h3 className="font-black text-charcoal">{campaign.title}</h3>
                  <p className="mt-2 text-sm text-gray-500">모집 {campaign.recruitStart} - {campaign.recruitEnd} · 지원 {campaign.appliedCount}명</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={requestCampaignRevision} className="flex gap-2">
                    <input type="hidden" name="campaign_id" value={campaign.id} />
                    <input type="hidden" name="admin_memo" value="운영자 수정 요청" />
                    <button className="rounded-lg border border-line px-4 py-2 text-sm font-black text-charcoal">수정 요청</button>
                  </form>
                  <form action={approveCampaign}>
                    <input type="hidden" name="campaign_id" value={campaign.id} />
                    <button className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white">승인</button>
                  </form>
                </div>
              </div>
            ))}
            {campaigns.length === 0 ? <p className="p-5 text-sm text-gray-500">검수할 캠페인이 없습니다.</p> : null}
          </div>
        </section>
        <aside className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-primary"><FileWarning size={20} /><h2 className="font-black text-charcoal">지원자 추천</h2></div>
            <div className="space-y-4">
              {applications.map((application) => (
                <div key={application.id} className="rounded-lg bg-gray-50 p-4">
                  <Badge tone={application.status === "recommended" ? "amber" : "gray"}>{application.status}</Badge>
                  <p className="mt-3 text-sm font-black text-charcoal">{application.proposedContentType}</p>
                  <p className="mt-1 text-xs font-bold text-gray-400">{application.campaignTitle}</p>
                  <p className="mt-2 text-xs leading-5 text-gray-500">{application.message}</p>
                  {application.status !== "recommended" ? (
                    <form action={recommendApplication} className="mt-3">
                      <input type="hidden" name="application_id" value={application.id} />
                      <input type="hidden" name="admin_memo" value="운영자 추천" />
                      <button className="rounded-lg bg-white px-3 py-2 text-xs font-black text-primary ring-1 ring-primary/20">추천 표시</button>
                    </form>
                  ) : null}
                  {application.status !== "selected" ? (
                    <form action={selectApplication} className="mt-3">
                      <input type="hidden" name="application_id" value={application.id} />
                      <button className="rounded-lg bg-primary px-3 py-2 text-xs font-black text-white">선정하고 협업 생성</button>
                    </form>
                  ) : null}
                </div>
              ))}
              {applications.length === 0 ? <p className="text-sm text-gray-500">검토할 지원자가 없습니다.</p> : null}
            </div>
          </section>
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-black text-charcoal">콘텐츠 제출 확인</h2>
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
          </section>
        </aside>
      </div>
    </main>
  );
}
