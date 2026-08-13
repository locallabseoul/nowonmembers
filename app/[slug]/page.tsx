import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, ExternalLink, Globe2, MapPin, Phone } from "lucide-react";
import { getPublicBusinessProfileBySlug } from "@/lib/supabase/queries";
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

export default async function MinihomePage({ params }: MinihomePageProps) {
  const { slug } = await params;
  const business = await getPublicBusinessProfileBySlug(normalizeBusinessSlug(slug));
  if (!business) notFound();

  const fullAddress = [business.address, business.addressDetail].filter(Boolean).join(" ");
  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(fullAddress)}`;
  const pageUrl = `${PUBLIC_SITE_URL}/${business.slug}`;
  const externalLinks = [business.websiteUrl, ...business.socialUrls].filter(Boolean);

  return (
    <main className="minihome-shell min-h-dvh bg-[#f4f1eb] text-[#26231f]">
      <article className="mx-auto min-h-dvh w-full max-w-2xl bg-[#fffdf8] shadow-2xl shadow-stone-300/50">
        <section className="relative aspect-[4/3] min-h-[320px] overflow-hidden bg-stone-200 sm:aspect-[16/10]">
          <img src={business.coverImage} alt={`${business.businessName} 대표 이미지`} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
          <div className="absolute right-5 top-5">
            <ShareButton title={business.businessName} url={pageUrl} />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-9">
            <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black backdrop-blur">{business.category}</span>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{business.businessName}</h1>
            {business.shortIntro ? <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/90 sm:text-base">{business.shortIntro}</p> : null}
          </div>
        </section>

        <div className="space-y-10 px-6 py-9 sm:px-10 sm:py-12">
          {business.description ? (
            <section>
              <h2 className="text-lg font-black">가게 이야기</h2>
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-stone-600">{business.description}</p>
            </section>
          ) : null}

          <section className="space-y-5 border-y border-stone-200 py-8">
            {fullAddress ? (
              <a href={mapUrl} target="_blank" rel="noreferrer" className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><MapPin size={19} /></span>
                <span className="min-w-0 pt-0.5"><span className="block text-xs font-black text-stone-400">주소</span><span className="mt-1 block text-sm font-bold leading-6">{fullAddress}</span></span>
                <ExternalLink size={15} className="ml-auto mt-3 shrink-0 text-stone-400" />
              </a>
            ) : null}
            {business.businessHours ? (
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Clock3 size={19} /></span>
                <span className="pt-0.5"><span className="block text-xs font-black text-stone-400">영업시간</span><span className="mt-1 block text-sm font-bold leading-6">{business.businessHours}</span></span>
              </div>
            ) : null}
            {business.contact ? (
              <a href={`tel:${business.contact}`} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Phone size={19} /></span>
                <span className="pt-0.5"><span className="block text-xs font-black text-stone-400">전화</span><span className="mt-1 block text-sm font-bold leading-6">{business.contact}</span></span>
              </a>
            ) : null}
          </section>

          {externalLinks.length ? (
            <section>
              <h2 className="text-lg font-black">온라인 채널</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {externalLinks.map((url, index) => (
                  <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm font-black shadow-sm transition hover:border-primary hover:text-primary">
                    <Globe2 size={18} /><span className="min-w-0 flex-1 truncate">{externalLabel(url)}</span><ExternalLink size={14} />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <footer className="border-t border-stone-200 px-6 py-8 text-center">
          <Link href="/" className="text-xs font-bold text-stone-400 transition hover:text-primary">노원멤버스에서 제공</Link>
        </footer>
      </article>
    </main>
  );
}
