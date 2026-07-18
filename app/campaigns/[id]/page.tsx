import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Gift, Heart, ListChecks, MapPin, MessageCircle, Store } from "lucide-react";
import { RoleAwareActionLink } from "@/app/components/role-aware-action-link";
import { getCurrentSessionProfile } from "@/lib/auth/guards";
import { getCampaignDeadlineLabel, getCampaignLifecycle } from "@/lib/campaign-lifecycle";
import { getDisplayBusiness, getPublicCampaign } from "@/lib/supabase/queries";
import type { Campaign } from "@/lib/types";

function formatShortDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateRange(start: string, end: string) {
  return `${formatShortDate(start)} ~ ${formatShortDate(end)}`;
}

function channelLabel(campaign: Campaign) {
  if (campaign.campaignType === "shortform") return "릴스/쇼츠";
  if (campaign.campaignType === "interview") return "인터뷰";
  return "블로그";
}

function keywordTags(campaign: Campaign, businessName: string) {
  return [
    `#${campaign.region.replace(/\s/g, "")}`,
    `#${campaign.category.replace(/[·\s]/g, "")}`,
    `#${businessName.replace(/\s/g, "")}`,
    "#NOWONMEMBERS"
  ];
}

export default async function CampaignDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const campaign = await getPublicCampaign(id);
  if (!campaign) notFound();
  const { profile } = await getCurrentSessionProfile();
  const currentRole = profile?.role;
  const lifecycle = getCampaignLifecycle(campaign);
  const applyHref = `/campaigns/${campaign.id}/apply`;
  const applyAlertMessage = "캠페인 신청은 크리에이터 계정으로만 이용할 수 있습니다.";
  const business = getDisplayBusiness(campaign.businessId);
  const businessName = campaign.businessName ?? business.businessName;
  const businessDetails = {
    category: "노원 지역 파트너",
    businessHours: "방문 전 확인",
    address: `서울 노원구 ${campaign.region}`,
    coverImage: campaign.coverImage,
    ...business
  };
  const progress = Math.min(100, Math.round((campaign.appliedCount / Math.max(campaign.recruitCount, 1)) * 100));
  const requirements = campaign.contentRequirements.length
    ? campaign.contentRequirements
    : ["제공 사실 표시", "대표 메뉴 또는 공간 사진 3장 이상", "방문 일정 준수"];

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 pb-32 sm:px-6 lg:px-8 lg:pb-12">
        <nav className="mb-6 flex text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="inline-flex items-center gap-1 md:gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">홈</Link>
            </li>
            <li className="flex items-center gap-1">
              <ChevronRight size={13} />
              <Link href="/campaigns" className="transition-colors hover:text-primary">캠페인</Link>
            </li>
            <li className="flex items-center gap-1">
              <ChevronRight size={13} />
              <span className="font-bold text-charcoal">캠페인 상세</span>
            </li>
          </ol>
        </nav>
        {error ? <p className="mb-6 rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}

        <div className="flex flex-col gap-8 lg:flex-row">
          <section className="flex flex-col gap-8 lg:w-2/3">
            <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="relative h-[300px] w-full sm:h-[400px]">
                <img src={campaign.coverImage} alt="" className="h-full w-full object-cover" />
                <div className="absolute right-4 top-4 rounded-full bg-charcoal/80 px-3 py-1.5 text-sm font-black text-white backdrop-blur-sm">
                  {getCampaignDeadlineLabel(campaign)}
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1 text-sm font-black text-charcoal shadow-sm">
                    <span className="text-[#03C75A]">B</span>
                    {channelLabel(campaign)}
                  </span>
                  <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-black text-primary shadow-sm">
                    {lifecycle.label}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1 text-sm font-bold text-gray-600 shadow-sm">
                    <MapPin size={14} />
                    노원구 {campaign.region}
                  </span>
                  {campaign.beginnerFriendly ? (
                    <span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-bold text-gray-600 shadow-sm">초보 가능</span>
                  ) : null}
                </div>

                <h1 className="mb-4 text-2xl font-black text-charcoal sm:text-3xl">{campaign.title}</h1>
                <p className="text-lg leading-relaxed text-gray-600">{campaign.description}</p>
              </div>
            </div>

            <div className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-black text-charcoal">
                <Gift size={21} className="text-primary" />
                제공 내역
              </h2>
              <div className="mb-8 rounded-xl border border-primary/10 bg-primary/5 p-6">
                <p className="mb-2 text-lg font-black text-primary">{campaign.benefitValue}</p>
                <ul className="list-inside list-disc space-y-2 text-gray-600">
                  <li>{campaign.benefitType || "체험 제공"}</li>
                  {campaign.fee ? <li>제작비 {campaign.fee}</li> : null}
                  <li className="mt-2 text-sm text-gray-500">초과 비용이 발생하는 경우 현장 결제가 필요할 수 있습니다.</li>
                </ul>
              </div>

              <h2 className="mb-6 mt-10 flex items-center gap-2 text-xl font-black text-charcoal">
                <ListChecks size={21} />
                캠페인 미션
              </h2>
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-6">
                  <h3 className="mb-3 font-black text-charcoal">1. 필수 키워드</h3>
                  <div className="flex flex-wrap gap-2">
                    {keywordTags(campaign, businessName).map((tag) => (
                      <span key={tag} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700">{tag}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">본문 안에 캠페인과 지역 키워드를 자연스럽게 포함해주세요.</p>
                </div>

                <div className="border-b border-gray-100 pb-6">
                  <h3 className="mb-3 font-black text-charcoal">2. 사진 및 콘텐츠 가이드</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {requirements.map((requirement) => (
                      <li key={requirement} className="flex items-start gap-2">
                        <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-3 font-black text-charcoal">3. 유의사항</h3>
                  <ul className="list-inside list-disc space-y-2 text-sm text-gray-500">
                    <li>제공 사실 표시는 필수입니다.</li>
                    <li>사전 예약 후 방문해주시고, 일정 변경은 운영자와 미리 조율해주세요.</li>
                    <li>{campaign.usageRights || "콘텐츠 사용 범위는 캠페인 운영자와 사전 합의한 범위를 따릅니다."}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-black text-charcoal">
                <Store size={21} />
                매장 정보
              </h2>
              <div className="flex flex-col gap-6 md:flex-row">
                <div className="space-y-4 md:w-1/2">
                  <div>
                    <span className="mb-1 block text-sm font-bold text-gray-500">매장명</span>
                    <span className="font-black text-charcoal">{businessName}</span>
                  </div>
                  <div>
                    <span className="mb-1 block text-sm font-bold text-gray-500">업종</span>
                    <span className="text-charcoal">{businessDetails.category}</span>
                  </div>
                  <div>
                    <span className="mb-1 block text-sm font-bold text-gray-500">영업시간</span>
                    <span className="text-charcoal">{businessDetails.businessHours}</span>
                  </div>
                  <div>
                    <span className="mb-1 block text-sm font-bold text-gray-500">주소</span>
                    <span className="text-charcoal">{businessDetails.address}</span>
                  </div>
                </div>

                <div className="flex h-48 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-200 md:w-1/2">
                  <img
                    src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_731c82a294_2c159d5458e05fbd.png"
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:w-1/3">
            <div className="space-y-6 lg:sticky lg:top-24">
              <div className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-black text-gray-500">모집 현황</span>
                    <span className="text-sm font-black text-primary">{campaign.appliedCount}명 / {campaign.recruitCount}명 신청</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100">
                    <div className="h-2.5 rounded-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <h3 className="mb-4 border-b border-gray-100 pb-2 font-black text-charcoal">캠페인 일정</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      모집 기간
                    </span>
                    <span className="text-sm font-bold text-charcoal">{formatDateRange(campaign.recruitStart, campaign.recruitEnd)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="h-2 w-2 rounded-full bg-gray-300" />
                      발표일
                    </span>
                    <span className="text-sm font-bold text-charcoal">{formatShortDate(campaign.selectionDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="h-2 w-2 rounded-full bg-gray-300" />
                      리뷰 등록 기간
                    </span>
                    <span className="text-sm font-bold text-charcoal">{formatDateRange(campaign.visitStart, campaign.submissionDue)}</span>
                  </div>
                </div>

                <div className="mt-8 hidden lg:block">
                  {lifecycle.canApply ? (
                    <RoleAwareActionLink
                      href={applyHref}
                      unauthenticatedHref={`/auth?next=${applyHref}`}
                      currentRole={currentRole}
                      requiredRole="creator"
                      roleMismatchMessage={applyAlertMessage}
                      className="inline-flex w-full justify-center rounded-xl bg-primary py-4 text-lg font-black text-white shadow-[0_4px_14px_0_rgba(34,197,94,0.35)] transition-all hover:-translate-y-0.5 hover:bg-primaryHover hover:shadow-[0_6px_20px_rgba(34,197,94,0.22)]"
                    >
                      {lifecycle.actionLabel}
                    </RoleAwareActionLink>
                  ) : (
                    <button disabled className="w-full cursor-not-allowed rounded-xl bg-gray-200 py-4 text-lg font-black text-gray-500">
                      신청 불가
                    </button>
                  )}
                  <p className="mt-3 text-center text-xs text-gray-400">{lifecycle.canApply ? "신청 전 제공 내역과 미션을 꼭 확인해주세요." : lifecycle.actionLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                  <img src={businessDetails.coverImage} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-gray-500">캠페인 운영자</p>
                  <p className="text-sm font-black text-charcoal">{businessName}</p>
                </div>
                <button className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:border-primary hover:text-primary">
                  <MessageCircle size={14} />
                  문의하기
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 shadow-[0_-4px_20px_rgb(0,0,0,0.05)] lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <button className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors hover:border-primary hover:text-primary" aria-label="관심 캠페인">
            <Heart size={22} />
          </button>
          {lifecycle.canApply ? (
            <RoleAwareActionLink
              href={applyHref}
              unauthenticatedHref={`/auth?next=${applyHref}`}
              currentRole={currentRole}
              requiredRole="creator"
              roleMismatchMessage={applyAlertMessage}
              className="flex h-14 flex-grow items-center justify-center rounded-xl bg-primary text-lg font-black text-white shadow-sm transition-colors hover:bg-primaryHover"
            >
              {lifecycle.actionLabel}
            </RoleAwareActionLink>
          ) : (
            <button disabled className="flex h-14 flex-grow cursor-not-allowed items-center justify-center rounded-xl bg-gray-200 text-lg font-black text-gray-500">
              신청 불가
            </button>
          )}
        </div>
      </div>
    </>
  );
}
