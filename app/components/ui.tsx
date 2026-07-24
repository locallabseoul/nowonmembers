import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, MapPin, ShieldCheck, Users } from "lucide-react";
import type { Campaign } from "@/lib/types";
import { getBusiness } from "@/lib/data";

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-charcoal">{title}</h2>
        {description ? <p className="mt-2 text-sm text-gray-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "red" | "green" | "blue" | "gray" | "amber" }) {
  const tones = {
    red: "bg-primary/10 text-primary",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    gray: "bg-gray-100 text-gray-700",
    amber: "bg-amber-50 text-amber-700"
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const business = getBusiness(campaign.businessId);
  const businessName = campaign.businessName ?? business?.businessName ?? "노원멤버스 파트너";
  const isClosed = campaign.status === "completed" || campaign.status === "selecting";

  return (
    <Link href={`/campaigns/${campaign.id}`} className="group overflow-hidden rounded-lg border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img src={campaign.coverImage} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge tone={isClosed ? "gray" : "red"}>{isClosed ? "선정 중" : "모집 중"}</Badge>
          {campaign.operatorRecommended ? <Badge tone="amber">운영자 추천</Badge> : null}
        </div>
      </div>
      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="blue">{campaign.category}</Badge>
          {campaign.beginnerFriendly ? <Badge tone="green">초보 가능</Badge> : null}
        </div>
        <h3 className="line-clamp-2 min-h-14 text-lg font-black leading-7 text-charcoal">{campaign.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{campaign.description}</p>
        <div className="mt-5 grid gap-2 text-sm text-gray-600">
          <span className="flex items-center gap-2"><MapPin size={16} className="text-primary" />{campaign.region} · {businessName}</span>
          <span className="flex items-center gap-2"><Users size={16} className="text-primary" />신청 {campaign.appliedCount}명 · 선정 {campaign.recruitCount}명</span>
          <span className="flex items-center gap-2"><CalendarDays size={16} className="text-primary" />마감 {campaign.recruitEnd}</span>
        </div>
      </div>
    </Link>
  );
}

export function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-500">{label}</p>
        <div className="text-primary">{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-black text-charcoal">{value}</p>
    </div>
  );
}

export function StatusTimeline() {
  const steps = ["운영자 검수", "모집 중", "선정", "방문·제작", "제출 확인", "완료"];
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {steps.map((step, index) => (
        <div key={step} className="rounded-lg border border-line bg-white p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            {index < 2 ? <CheckCircle2 size={18} /> : <Clock size={18} />}
          </div>
          <p className="text-sm font-black text-charcoal">{step}</p>
        </div>
      ))}
    </div>
  );
}

export function TrustNotice() {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/10 p-5 text-sm leading-6 text-charcoal">
      <div className="mb-2 flex items-center gap-2 font-black"><ShieldCheck size={18} />협업 원칙</div>
      <p>노원멤버스는 긍정 평가를 보장하지 않습니다. 실제 체험과 사실 정보에 기반한 콘텐츠 협업을 만들고, 제공 내역과 사용 범위를 투명하게 기록합니다.</p>
    </div>
  );
}
