import Link from "next/link";
import { StatCard } from "@/app/components/ui";
import { getAdminOverview } from "@/lib/supabase/queries";
import { ArrowRight, CheckCircle2, ClipboardCheck, FileCheck, Send, UserCheck, Users } from "lucide-react";
import { FormBanner } from "@/app/components/form-field";

function TodoCard({ href, label, count, icon }: { href: string; label: string; count: number; icon: React.ReactNode }) {
  return (
    <Link href={href} className={`flex items-center justify-between rounded-lg border p-5 transition-colors ${count > 0 ? "border-primary/30 bg-primary/5 hover:bg-primary/10" : "border-line bg-white hover:bg-gray-50"}`}>
      <div className="flex items-center gap-3">
        <div className={count > 0 ? "text-primary" : "text-gray-300"}>{icon}</div>
        <div>
          <p className="font-black text-charcoal">{label}</p>
          <p className={`mt-0.5 text-sm font-bold ${count > 0 ? "text-primary" : "text-gray-400"}`}>{count > 0 ? `${count}건 대기중` : "대기 없음"}</p>
        </div>
      </div>
      <ArrowRight size={18} className="text-gray-300" />
    </Link>
  );
}

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  const stats = await getAdminOverview();
  const completionRate = Math.round((stats.approvedSubmissions / Math.max(stats.totalSubmissions, 1)) * 100);

  return (
    <main>
      <div className="mb-8">
        <p className="text-sm font-black text-primary">운영자</p>
        <h1 className="mt-2 text-3xl font-black text-charcoal">운영 개요</h1>
        <p className="mt-2 text-gray-500">처리할 일과 서비스 현황을 한눈에 확인합니다.</p>
      </div>
      {error ? <div className="mb-6"><FormBanner>{error}</FormBanner></div> : null}
      {message ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}

      <section className="mb-8">
        <h2 className="mb-4 font-black text-charcoal">처리할 일</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <TodoCard href="/admin/campaigns" label="캠페인 심사" count={stats.pendingReviewCampaigns} icon={<ClipboardCheck size={22} />} />
          <TodoCard href="/admin/submissions" label="콘텐츠 검수" count={stats.pendingSubmissions} icon={<FileCheck size={22} />} />
          <TodoCard href="/admin/members?verification=pending" label="인증 심사" count={stats.pendingVerifications} icon={<UserCheck size={22} />} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-black text-charcoal">서비스 현황</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="등록 가게" value={`${stats.businesses}`} icon={<Users size={20} />} />
          <StatCard
            label="크리에이터"
            value={stats.unverifiedCreators ? `${stats.verifiedCreators}+${stats.unverifiedCreators}` : `${stats.verifiedCreators}`}
            hint={stats.unverifiedCreators ? `인증 ${stats.verifiedCreators} · 미인증 ${stats.unverifiedCreators}` : "모두 인증 완료"}
            icon={<CheckCircle2 size={20} />}
          />
          <StatCard label="모집 중 캠페인" value={`${stats.recruitingCampaigns}`} icon={<ClipboardCheck size={20} />} />
          <StatCard label="제출 승인율" value={`${completionRate}%`} icon={<Send size={20} />} />
        </div>
      </section>
    </main>
  );
}
