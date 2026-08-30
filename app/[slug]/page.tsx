import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock3, ExternalLink, Globe2, MapPin, Megaphone, Package, Phone, Ticket } from "lucide-react";
import { getCampaignDeadlineLabel } from "@/lib/campaign-lifecycle";
import { getActivePublicCouponsByBusinessId, getCouponBenefitLabel, type Coupon } from "@/lib/coupons";
import { getPublicBusinessProfileBySlug, getRecruitingCampaignsByBusinessId } from "@/lib/supabase/queries";
import { formatProductPrice, getPublicProductsByBusinessId, type BusinessProduct } from "@/lib/products";
import { getPublicMinihomeLinks } from "@/lib/minihome-links";
import type { Campaign } from "@/lib/types";
import { normalizeBusinessSlug } from "@/lib/business-slug";
import { PUBLIC_SITE_URL } from "@/lib/site";
import { ShareButton } from "./share-button";

type MinihomePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: MinihomePageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await getPublicBusinessProfileBySlug(normalizeBusinessSlug(slug));
  if (!business) return { title: "미니홈을 찾을 수 없습니다", robots: { index: false, follow: false } };

  const title = business.businessName;
  const description = business.shortIntro || `${business.businessName}의 미니홈`;
  const images = business.coverImage ? [business.coverImage] : [];
  return {
    title,
    description,
    alternates: { canonical: `/${business.slug}` },
    openGraph: { title, description, url: `/${business.slug}`, images },
    twitter: { card: "summary_large_image", title, description, images }
  };
}

function externalLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "외부 링크";
  }
}

function CouponLink({ coupon }: { coupon: Coupon }) {
  return (
    <Link href={`/coupons/${coupon.id}`} className="group flex min-h-[68px] items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition hover:border-primary/50 hover:shadow-md">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
        {coupon.coverImage ? <img src={coupon.coverImage} alt="" className="h-full w-full object-cover" /> : <Ticket size={20} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-charcoal">{coupon.title}</span>
        <span className="mt-1 block truncate text-xs font-bold text-primary">
          {getCouponBenefitLabel(coupon)} · 잔여 {coupon.remainingQuantity.toLocaleString("ko-KR")}장
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-stone-300 transition group-hover:text-primary" />
    </Link>
  );
}

function CampaignLink({ campaign }: { campaign: Campaign }) {
  return (
    <Link href={`/campaigns/${campaign.id}`} className="group flex min-h-[68px] items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition hover:border-primary/50 hover:shadow-md">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-emerald-600">
        {campaign.coverImage ? <img src={campaign.coverImage} alt="" className="h-full w-full object-cover" /> : <Megaphone size={20} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-charcoal">{campaign.title}</span>
        <span className="mt-1 block truncate text-xs font-bold text-stone-500">
          크리에이터 모집 중 · {getCampaignDeadlineLabel(campaign)}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-stone-300 transition group-hover:text-primary" />
    </Link>
  );
}

function ProductLink({ product }: { product: BusinessProduct }) {
  return (
    <a href={product.linkUrl} target="_blank" rel="noreferrer" className="group flex min-h-[68px] items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition hover:border-primary/50 hover:shadow-md">
      <img src={product.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-charcoal">{product.name}</span>
        <span className="mt-1 block truncate text-xs text-stone-500">
          <strong className="font-black text-primary">{formatProductPrice(product.price)}</strong>
          <span className="mx-1.5 text-stone-300">·</span>
          {product.shortDescription}
        </span>
      </span>
      <ExternalLink size={15} className="shrink-0 text-stone-300 transition group-hover:text-primary" />
    </a>
  );
}

export default async function MinihomePage({ params }: MinihomePageProps) {
  const { slug } = await params;
  const business = await getPublicBusinessProfileBySlug(normalizeBusinessSlug(slug));
  if (!business) notFound();

  const [allCoupons, allCampaigns, products, customLinks] = await Promise.all([
    getActivePublicCouponsByBusinessId(business.businessId),
    getRecruitingCampaignsByBusinessId(business.businessId),
    getPublicProductsByBusinessId(business.businessId),
    getPublicMinihomeLinks(business.businessId)
  ]);
  const coupons = allCoupons.slice(0, 3);
  const campaigns = allCampaigns.slice(0, 3);
  const fullAddress = [business.address, business.addressDetail].filter(Boolean).join(" ");
  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(fullAddress)}`;
  const pageUrl = `${PUBLIC_SITE_URL}/${business.slug}`;
  const customLinkUrls = new Set(customLinks.map((link) => link.url));
  const externalLinks = [
    ...customLinks.map((link) => ({ id: link.id, label: link.title, url: link.url, detail: externalLabel(link.url) })),
    ...[business.websiteUrl, ...business.socialUrls]
      .filter((url) => url && !customLinkUrls.has(url))
      .map((url, index) => ({ id: `profile-${index}-${url}`, label: externalLabel(url), url, detail: "" }))
  ];
  const initial = business.businessName.trim().slice(0, 1) || "N";

  return (
    <main className="minihome-shell min-h-dvh bg-[#f3f4f1] text-charcoal">
      <article className="mx-auto min-h-dvh w-full max-w-lg px-5 pb-8 pt-7 sm:pt-10">
        <header className="relative text-center">
          <div className="absolute right-0 top-0">
            <ShareButton title={business.businessName} url={pageUrl} />
          </div>
          <div className="mx-auto flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-[28px] border-4 border-white bg-primary/10 text-2xl font-black text-primary shadow-md">
            {business.coverImage ? <img src={business.coverImage} alt={`${business.businessName} 프로필`} className="h-full w-full object-cover" /> : initial}
          </div>
          <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black text-stone-500 shadow-sm">{business.category}</span>
          <h1 className="mt-2 text-2xl font-black tracking-tight">{business.businessName}</h1>
          {business.shortIntro ? <p className="mx-auto mt-2 max-w-sm text-sm font-bold leading-6 text-stone-600">{business.shortIntro}</p> : null}
          {business.description ? <p className="mx-auto mt-2 line-clamp-3 max-w-sm whitespace-pre-line text-xs leading-5 text-stone-400">{business.description}</p> : null}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {business.contact ? (
              <a href={`tel:${business.contact}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-xs font-black text-stone-600 shadow-sm transition hover:border-primary hover:text-primary">
                <Phone size={15} /> 전화
              </a>
            ) : null}
            {fullAddress ? (
              <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-xs font-black text-stone-600 shadow-sm transition hover:border-primary hover:text-primary">
                <MapPin size={15} /> 길찾기
              </a>
            ) : null}
          </div>
        </header>

        <div className="mt-8 space-y-7">
          {coupons.length ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-black"><Ticket size={17} className="text-primary" /> 받을 수 있는 쿠폰</h2>
                <span className="text-xs font-bold text-stone-400">{allCoupons.length}개</span>
              </div>
              <div className="space-y-2">{coupons.map((coupon) => <CouponLink key={coupon.id} coupon={coupon} />)}</div>
              {allCoupons.length > coupons.length ? (
                <Link href={`/coupons?q=${encodeURIComponent(business.businessName)}`} className="mt-3 flex items-center justify-center gap-1 text-xs font-black text-stone-400 hover:text-primary">쿠폰 전체 보기 <ChevronRight size={14} /></Link>
              ) : null}
            </section>
          ) : null}

          {campaigns.length ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-black"><Megaphone size={17} className="text-emerald-600" /> 모집 중인 캠페인</h2>
                <span className="text-xs font-bold text-stone-400">{allCampaigns.length}개</span>
              </div>
              <div className="space-y-2">{campaigns.map((campaign) => <CampaignLink key={campaign.id} campaign={campaign} />)}</div>
              {allCampaigns.length > campaigns.length ? (
                <Link href={`/campaigns?status=recruiting&q=${encodeURIComponent(business.businessName)}`} className="mt-3 flex items-center justify-center gap-1 text-xs font-black text-stone-400 hover:text-primary">캠페인 전체 보기 <ChevronRight size={14} /></Link>
              ) : null}
            </section>
          ) : null}

          {products.length ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-black"><Package size={17} className="text-violet-600" /> 제품</h2>
                <span className="text-xs font-bold text-stone-400">{products.length}개</span>
              </div>
              <div className="space-y-2">{products.map((product) => <ProductLink key={product.id} product={product} />)}</div>
            </section>
          ) : null}

          {externalLinks.length ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black"><Globe2 size={17} className="text-stone-500" /> 링크</h2>
              <div className="space-y-2">
                {externalLinks.map((link) => (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="group flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-black shadow-sm transition hover:border-primary/50 hover:shadow-md">
                    <Globe2 size={18} className="shrink-0 text-stone-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{link.label}</span>
                      {link.detail ? <span className="mt-0.5 block truncate text-[10px] font-bold text-stone-400">{link.detail}</span> : null}
                    </span>
                    <ExternalLink size={15} className="shrink-0 text-stone-300 transition group-hover:text-primary" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-stone-200 bg-white p-4 text-xs shadow-sm">
            {fullAddress ? <div className="flex items-start gap-3"><MapPin size={16} className="mt-0.5 shrink-0 text-primary" /><span className="leading-5 text-stone-600">{fullAddress}</span></div> : null}
            {business.businessHours ? <div className={`${fullAddress ? "mt-3 border-t border-stone-100 pt-3" : ""} flex items-start gap-3`}><Clock3 size={16} className="mt-0.5 shrink-0 text-primary" /><span className="leading-5 text-stone-600">{business.businessHours}</span></div> : null}
          </section>
        </div>

        <footer className="pt-8 text-center">
          <Link href="/" className="text-[11px] font-bold text-stone-400 transition hover:text-primary">노원멤버스에서 제공</Link>
        </footer>
      </article>
    </main>
  );
}
