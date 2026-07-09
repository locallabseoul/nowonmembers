import Link from "next/link";
import { ChevronLeft, ChevronRight, Gift, MapPin, Search, Video } from "lucide-react";
import { getBusiness } from "@/lib/data";
import { getPublicCampaigns } from "@/lib/supabase/queries";
import type { Campaign } from "@/lib/types";

function statusLabel(campaign: Campaign) {
  if (campaign.status === "selecting") return "선정중";
  if (campaign.status === "in_progress" || campaign.status === "submission_review") return "진행중";
  if (campaign.status === "completed") return "완료";
  if (campaign.status === "cancelled" || campaign.status === "failed") return "마감됨";
  return campaign.appliedCount >= campaign.recruitCount ? "마감임박" : "모집중";
}

function deadlineLabel(campaign: Campaign) {
  if (campaign.status === "selecting" || campaign.status === "completed") return "마감됨";
  if (campaign.appliedCount >= campaign.recruitCount) return "오늘마감";
  return "D-3";
}

function channelLabel(campaign: Campaign) {
  if (campaign.campaignType === "shortform") return { icon: <Video size={13} />, label: "릴스/쇼츠" };
  if (campaign.campaignType === "interview") return { icon: <span className="font-black text-[#03C75A]">B</span>, label: "+ 인터뷰" };
  return { icon: <span className="font-black text-[#03C75A]">B</span>, label: "블로그" };
}

function CampaignListCard({ campaign }: { campaign: Campaign }) {
  const business = getBusiness(campaign.businessId);
  const channel = channelLabel(campaign);
  const status = statusLabel(campaign);
  const deadline = deadlineLabel(campaign);
  const isClosed = status === "선정중" || status === "완료" || status === "마감됨";
  const isActive = status === "진행중";

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="group overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        <img src={campaign.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2.5 py-1 text-xs font-black text-charcoal shadow-sm backdrop-blur-sm">
            {channel.icon}
            {channel.label}
          </span>
          <span className={`rounded-md px-2.5 py-1 text-xs font-black text-white shadow-sm ${isActive ? "bg-blue-500" : isClosed ? "bg-gray-600" : "bg-primary"}`}>
            {status}
          </span>
        </div>

        {isActive ? null : (
          <div className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-black ${isClosed ? "bg-gray-200 text-gray-600" : "bg-charcoal/80 text-white backdrop-blur-sm"}`}>
            {deadline}
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="mb-2 flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin size={15} />
          {campaign.region}{business?.businessName ? ` (${business.businessName})` : ""}
        </div>
        <h3 className="mb-1 line-clamp-1 text-lg font-black text-charcoal transition-colors group-hover:text-primary">
          {campaign.title}
        </h3>
        <p className="mb-4 line-clamp-2 text-sm leading-6 text-gray-500">{campaign.description}</p>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Gift size={15} />
            </div>
            <span className="truncate font-black text-charcoal">{campaign.benefitValue}</span>
          </div>
          <div className={`shrink-0 text-sm font-bold ${campaign.appliedCount >= campaign.recruitCount ? "text-primary" : "text-gray-500"}`}>
            {isClosed ? `${campaign.appliedCount}명 모집 완료` : `${campaign.appliedCount}명 / ${campaign.recruitCount}명 신청`}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function CampaignListPage() {
  const campaigns = await getPublicCampaigns();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-6">
        <div>
          <h1 className="mb-2 text-3xl font-black text-charcoal">캠페인 목록</h1>
          <p className="text-gray-500">노원 지역의 다양한 체험 캠페인을 찾아보세요.</p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row">
          <label className="relative flex-grow md:max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-11 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="캠페인 이름, 지역, 매장명 검색"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <select className="min-w-[120px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-primary">
              <option>콘텐츠 유형</option>
              <option>블로그</option>
              <option>인스타그램</option>
              <option>릴스/쇼츠</option>
            </select>
            <select className="min-w-[120px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-primary">
              <option>진행 상태</option>
              <option>모집중</option>
              <option>선정중</option>
              <option>진행중</option>
              <option>마감됨</option>
            </select>
            <select className="min-w-[120px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-primary">
              <option>최신등록순</option>
              <option>마감임박순</option>
              <option>인기순</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => <CampaignListCard key={campaign.id} campaign={campaign} />)}
      </div>

      <div className="flex items-center justify-center gap-2">
        <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary" aria-label="이전 페이지">
          <ChevronLeft size={16} />
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-black text-white shadow-sm">1</button>
        <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary">2</button>
        <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary">3</button>
        <span className="mx-1 text-gray-400">...</span>
        <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary">8</button>
        <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary" aria-label="다음 페이지">
          <ChevronRight size={16} />
        </button>
      </div>
    </main>
  );
}
