import type { Metadata } from "next";
import Link from "next/link";
import { Search, Ticket } from "lucide-react";
import { CouponCard } from "@/app/components/coupon-card";
import { FormBanner } from "@/app/components/form-field";
import { getPublicCoupons } from "@/lib/coupons";

export const metadata: Metadata = { title: "쿠폰북", description: "노원 가게와 브랜드의 혜택을 쿠폰으로 만나보세요." };

export default async function CouponsPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string }> }) {
  const { q = "", error } = await searchParams;
  const coupons = await getPublicCoupons(q);

  return (
    <main className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-charcoal sm:text-4xl">오늘 쓸 수 있는 동네 혜택</h1>
            <p className="mt-3 text-gray-500">마음에 드는 쿠폰을 먼저 받고, 가게에서 사용 코드를 보여주세요.</p>
          </div>
          <Link href="/my/coupons" className="inline-flex items-center justify-center gap-2 rounded-full bg-charcoal px-5 py-3 text-sm font-black text-white">
            <Ticket size={17} /> 내 쿠폰함
          </Link>
        </div>

        <form className="mt-8 flex max-w-xl gap-2">
          <label className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input name="q" defaultValue={q} placeholder="쿠폰명이나 혜택 검색" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-primary" />
          </label>
          <button className="rounded-xl bg-primary px-5 text-sm font-black text-white">검색</button>
        </form>
        {error ? <div className="mt-6"><FormBanner>{error}</FormBanner></div> : null}

        {coupons.length ? (
          <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => <CouponCard key={coupon.id} coupon={coupon} />)}
          </section>
        ) : (
          <section className="mt-8 rounded-[20px] border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
            <Ticket className="mx-auto text-slate-300" size={42} />
            <h2 className="mt-4 font-black text-charcoal">지금 발급 중인 쿠폰이 없습니다</h2>
            <p className="mt-2 text-sm text-gray-500">새로운 동네 혜택을 준비하고 있어요.</p>
          </section>
        )}
      </div>
    </main>
  );
}
