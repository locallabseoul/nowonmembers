"use client";

import Link from "next/link";
import { Check, CheckCircle2, Circle, Copy, ExternalLink, Eye, EyeOff, Share2 } from "lucide-react";
import { useState } from "react";
import { PUBLIC_SITE_URL } from "@/lib/site";

type MinihomeManagerProps = {
  business: {
    slug: string | null;
    businessName: string;
    category: string;
    shortIntro: string;
    address: string;
    contact: string;
    businessHours: string;
    coverImage: string;
    verificationStatus: string;
    isPublic: boolean;
  };
  visibilityAction: (formData: FormData) => void | Promise<void>;
};

export function MinihomeManager({ business, visibilityAction }: MinihomeManagerProps) {
  const [copied, setCopied] = useState(false);
  const url = business.slug ? `${PUBLIC_SITE_URL}/${business.slug}` : "";
  const readiness = [
    { label: "사업자 인증 완료", ready: business.verificationStatus === "verified" },
    { label: "미니홈 주소 설정", ready: Boolean(business.slug) },
    { label: "가게명·업종·한 줄 소개", ready: Boolean(business.businessName && business.category && business.shortIntro) },
    { label: "주소·연락처·영업시간", ready: Boolean(business.address && business.contact && business.businessHours) },
    { label: "대표 이미지", ready: Boolean(business.coverImage) }
  ];
  const canPublish = readiness.every((item) => item.ready);

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareLink() {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: business.businessName, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col gap-5 border-b border-gray-100 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-charcoal">공개 상태</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${business.isPublic ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {business.isPublic ? "공개 중" : "비공개"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {business.isPublic ? "누구나 미니홈 링크로 가게 정보를 볼 수 있습니다." : "준비가 끝나면 미니홈을 외부에 공개할 수 있습니다."}
            </p>
          </div>
          <form action={visibilityAction}>
            <input type="hidden" name="publish" value={business.isPublic ? "false" : "true"} />
            <button
              disabled={!business.isPublic && !canPublish}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white transition sm:w-auto ${business.isPublic ? "bg-slate-600 hover:bg-slate-700" : "bg-primary hover:bg-primaryHover disabled:cursor-not-allowed disabled:bg-slate-300"}`}
            >
              {business.isPublic ? <EyeOff size={17} /> : <Eye size={17} />}
              {business.isPublic ? "비공개로 전환" : "미니홈 공개"}
            </button>
          </form>
        </div>

        <div className="p-6">
          <p className="text-xs font-black text-gray-400">내 미니홈 주소</p>
          {url ? (
            <>
              <p className="mt-2 break-all text-lg font-black text-charcoal">{url}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-black text-gray-600 hover:border-primary hover:text-primary">
                  {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "복사됨" : "링크 복사"}
                </button>
                <button type="button" onClick={shareLink} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-black text-gray-600 hover:border-primary hover:text-primary">
                  <Share2 size={16} /> 공유
                </button>
                {business.isPublic ? (
                  <Link href={`/${business.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800">
                    <ExternalLink size={16} /> 미니홈 보기
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              미니홈 주소가 아직 없습니다. <Link href="/business/dashboard?profile=edit" className="font-black underline underline-offset-2">프로필 수정에서 주소 설정하기</Link>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-charcoal">공개 준비</h2>
              <p className="mt-1 text-sm text-gray-500">프로필 정보를 기준으로 자동 확인합니다.</p>
            </div>
            <span className="text-sm font-black text-primary">{readiness.filter((item) => item.ready).length}/{readiness.length}</span>
          </div>
          <ul className="mt-5 divide-y divide-gray-100">
            {readiness.map((item) => (
              <li key={item.label} className="flex items-center gap-3 py-3 text-sm font-bold">
                {item.ready ? <CheckCircle2 size={19} className="text-emerald-500" /> : <Circle size={19} className="text-gray-300" />}
                <span className={item.ready ? "text-charcoal" : "text-gray-400"}>{item.label}</span>
              </li>
            ))}
          </ul>
          {!canPublish ? (
            <Link href="/business/dashboard?profile=edit" className="mt-5 inline-flex items-center justify-center rounded-xl border border-primary px-4 py-2.5 text-sm font-black text-primary hover:bg-primary/5">
              프로필 보완하기
            </Link>
          ) : null}
        </section>

        <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="mb-3 text-sm font-black text-charcoal">미니홈 미리보기</p>
          <div className="rounded-2xl border border-gray-100 bg-[#f3f4f1] px-5 py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] border-2 border-white bg-primary/10 font-black text-primary shadow-sm">
              {business.coverImage ? <img src={business.coverImage} alt="" className="h-full w-full object-cover" /> : business.businessName.slice(0, 1) || "N"}
            </div>
            <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-gray-400">{business.category || "업종"}</span>
            <p className="mt-2 font-black text-charcoal">{business.businessName || "가게명"}</p>
            <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-5 text-gray-500">{business.shortIntro || "한 줄 소개가 표시됩니다."}</p>
            <div className="mt-5 space-y-2">
              <div className="h-12 rounded-xl border border-gray-100 bg-white px-3 py-2 text-left"><span className="text-[9px] font-black text-violet-600">PRODUCT</span><div className="mt-1 h-1.5 w-4/5 rounded-full bg-gray-100" /></div>
              <div className="h-12 rounded-xl border border-gray-100 bg-white px-3 py-2 text-left"><span className="text-[9px] font-black text-primary">COUPON</span><div className="mt-1 h-1.5 w-3/4 rounded-full bg-gray-100" /></div>
              <div className="h-12 rounded-xl border border-gray-100 bg-white px-3 py-2 text-left"><span className="text-[9px] font-black text-emerald-600">CAMPAIGN</span><div className="mt-1 h-1.5 w-2/3 rounded-full bg-gray-100" /></div>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-400">공개 제품, 승인된 쿠폰, 모집 중인 캠페인은 자동으로 표시됩니다.</p>
        </section>
      </div>
    </div>
  );
}
