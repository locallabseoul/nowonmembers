import Link from "next/link";
import { ChevronLeft, ChevronRight, Gift, MapPin, Search, Video } from "lucide-react";
import { getCampaignDeadlineLabel, getCampaignLifecycle } from "@/lib/campaign-lifecycle";
import { getPublicCampaigns } from "@/lib/supabase/queries";
import type { Campaign } from "@/lib/types";
import { FormBanner } from "@/app/components/form-field";

type CampaignFilter = {
  status?: string;
  type?: string;
  sort?: string;
  q?: string;
};

function campaignStatusGroup(campaign: Campaign) {
  if (campaign.status === "recruiting") return "recruiting";
  if (campaign.status === "selecting") return "selecting";
  if (campaign.status === "in_progress" || campaign.status === "submission_review") return "in_progress";
  return "closed";
}

function campaignTypeGroup(campaign: Campaign) {
  if (campaign.campaignType === "shortform") return "shortform";
  if (campaign.campaignType === "interview") return "interview";
  return "visit";
}

function filterCampaigns(campaigns: Campaign[], filter: CampaignFilter) {
  const query = filter.q?.trim().toLowerCase();

  return campaigns
    .filter((campaign) => {
      if (filter.status && campaignStatusGroup(campaign) !== filter.status) return false;
      if (filter.type && campaignTypeGroup(campaign) !== filter.type) return false;
      if (!query) return true;

      return [campaign.title, campaign.region, campaign.category, campaign.businessName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => {
      if (filter.sort === "newest") return b.id.localeCompare(a.id);
      if (filter.sort === "popular") return b.appliedCount - a.appliedCount;
      return (a.recruitEnd || "9999-12-31").localeCompare(b.recruitEnd || "9999-12-31");
    });
}

function channelLabel(campaign: Campaign) {
  if (campaign.campaignType === "shortform") return { icon: <Video size={13} />, label: "릴스/쇼츠" };
  if (campaign.campaignType === "interview") return { icon: <span className="font-black text-[#03C75A]">B</span>, label: "+ 인터뷰" };
  return { icon: <span className="font-black text-[#03C75A]">B</span>, label: "블로그" };
}

function CampaignListCard({ campaign }: { campaign: Campaign }) {
  const channel = channelLabel(campaign);
  const lifecycle = getCampaignLifecycle(campaign);
  const deadline = getCampaignDeadlineLabel(campaign);

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
          <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-black text-white shadow-sm">
            {lifecycle.label}
          </span>
        </div>

        <div className="absolute right-4 top-4 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-black text-white backdrop-blur-sm">
          {deadline}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-2 flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin size={15} />
          {campaign.region}{campaign.businessName ? ` (${campaign.businessName})` : ""}
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
          <div className="shrink-0 text-sm font-bold text-gray-500">
            신청 {campaign.appliedCount}명 · 선정 {campaign.recruitCount}명
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function CampaignListPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string; type?: string; sort?: string; q?: string }> }) {
  const { error, status, type, sort, q } = await searchParams;
  const campaigns = filterCampaigns(await getPublicCampaigns(), { status, type, sort, q });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-6">
        <div>
          <h1 className="mb-2 text-3xl font-black text-charcoal">캠페인 목록</h1>
          <p className="text-gray-500">노원 지역의 다양한 체험 캠페인을 찾아보세요.</p>
        </div>
        {error ? <FormBanner>{error}</FormBanner> : null}

        <form className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row">
          <label className="relative flex-grow md:max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              defaultValue={q ?? ""}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-11 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="캠페인 이름, 지역, 매장명 검색"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <select name="type" defaultValue={type ?? ""} className="min-w-[120px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-primary">
              <option value="">콘텐츠 유형</option>
              <option value="visit">블로그</option>
              <option value="interview">인스타그램</option>
              <option value="shortform">릴스/쇼츠</option>
            </select>
            <select name="status" defaultValue={status ?? ""} className="min-w-[120px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-primary">
              <option value="">진행 상태</option>
              <option value="recruiting">모집중</option>
              <option value="selecting">선정중</option>
              <option value="in_progress">진행중</option>
              <option value="closed">마감됨</option>
            </select>
            <select name="sort" defaultValue={sort ?? "deadline"} className="min-w-[120px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-primary">
              <option value="deadline">마감임박순</option>
              <option value="popular">인기순</option>
              <option value="newest">최신등록순</option>
            </select>
            <button className="rounded-lg bg-charcoal px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800">필터 적용</button>
          </div>
        </form>
      </div>

      {campaigns.length ? (
        <>
          <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => <CampaignListCard key={campaign.id} campaign={campaign} />)}
          </div>

          <div className="flex items-center justify-center gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary" aria-label="이전 페이지">
              <ChevronLeft size={16} />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-black text-white shadow-sm">1</button>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary" aria-label="다음 페이지">
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <section className="rounded-[20px] border border-gray-100 bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-xl font-black text-charcoal">조건에 맞는 캠페인이 없습니다</h2>
          <p className="mt-2 text-sm text-gray-500">필터를 조정하거나 새로 승인된 캠페인을 기다려주세요.</p>
        </section>
      )}
    </main>
  );
}
