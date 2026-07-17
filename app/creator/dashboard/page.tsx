import Link from "next/link";
import { Clock, FileCheck2, Send, Trophy } from "lucide-react";
import { Badge, StatCard } from "@/app/components/ui";
import { requireRole } from "@/lib/auth/guards";
import { getCreatorDashboard } from "@/lib/supabase/queries";

export default async function CreatorDashboardPage() {
  await requireRole("creator", "/creator/dashboard");
  const { creator, applications, collaborations, submissions } = await getCreatorDashboard();

  if (!creator) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black text-charcoal">크리에이터 프로필이 필요합니다</h1>
        <p className="mt-2 text-gray-500">캠페인 신청과 제출 관리를 위해 프로필을 먼저 완성해주세요.</p>
        <Link href="/creator/profile" className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-black text-white hover:bg-primaryHover">프로필 등록하기</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-charcoal">마이페이지</h1>
          <p className="mt-2 text-gray-500">{creator.nickname}님의 캠페인 활동과 제출 일정을 관리하세요.</p>
        </div>
        <Link href="/creator/profile" className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-black text-charcoal hover:border-primary">프로필 수정</Link>
      </div>
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <StatCard label="신청한 캠페인" value={`${applications.length}`} icon={<Send size={20} />} />
        <StatCard label="진행 중" value={`${collaborations.filter((item) => item.status !== "completed").length}`} icon={<Clock size={20} />} />
        <StatCard label="완료 콘텐츠" value={`${submissions.length}`} icon={<FileCheck2 size={20} />} />
        <StatCard label="기한 준수율" value={`${creator.deadlineRate}%`} icon={<Trophy size={20} />} />
      </div>
      <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-charcoal">콘텐츠 제출이 필요해요</h2>
          <Badge tone="red">{collaborations.length}건</Badge>
        </div>
        <div className="grid gap-5">
          {collaborations.map((collaboration) => (
            <div key={collaboration.id} className="grid gap-5 rounded-lg bg-gray-50 p-4 md:grid-cols-[180px_1fr_auto] md:items-center">
              <img src={collaboration.campaignCoverImage} alt="" className="h-32 w-full rounded-lg object-cover" />
              <div>
                <div className="mb-2"><Badge tone={collaboration.status === "completed" ? "green" : "amber"}>{collaboration.status}</Badge></div>
                <h3 className="text-lg font-black text-charcoal">{collaboration.campaignTitle}</h3>
                <p className="mt-2 text-sm text-gray-500">방문일 {collaboration.visitDate} · 제출 마감 {collaboration.submissionDue}</p>
              </div>
              {collaboration.hasSubmission ? (
                <span className="rounded-lg bg-white px-5 py-3 text-center text-sm font-black text-gray-500">제출 완료</span>
              ) : (
                <Link href={`/creator/submissions/${collaboration.id}`} className="rounded-lg bg-primary px-5 py-3 text-center font-black text-white hover:bg-primaryHover">
                  콘텐츠 제출하기
                </Link>
              )}
            </div>
          ))}
          {collaborations.length === 0 ? <p className="text-sm text-gray-500">선정된 캠페인이 아직 없습니다.</p> : null}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-line bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-black text-charcoal">내 지원 현황</h2>
        <div className="grid gap-3">
          {applications.map((application) => (
            <div key={application.id} className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-charcoal">{application.campaignTitle}</p>
                <p className="mt-1 text-sm text-gray-500">{application.proposedContentType}</p>
              </div>
              <Badge tone={application.status === "selected" ? "green" : application.status === "recommended" ? "amber" : "gray"}>{application.status}</Badge>
            </div>
          ))}
          {applications.length === 0 ? <p className="text-sm text-gray-500">지원한 캠페인이 없습니다.</p> : null}
        </div>
      </section>
    </main>
  );
}
