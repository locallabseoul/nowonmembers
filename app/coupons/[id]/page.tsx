import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Phone, ShieldCheck, Store, Users } from "lucide-react";
import { CouponImage, getCouponStatusStyle } from "@/app/components/coupon-card";
import { FormBanner } from "@/app/components/form-field";
import { Badge } from "@/app/components/ui";
import { getCouponBenefitLabel, getCouponDisplayStatus, getPublicCoupon } from "@/lib/coupons";
import { getCurrentSessionProfile } from "@/lib/auth/guards";
import { claimCoupon } from "../actions";

// 받을 수 없는 상태일 때 버튼에 그대로 노출할 안내 문구.
const blockedLabels: Record<string, string> = {
  scheduled: "공개 예정",
  setup_pending: "가게에서 사용 준비 중",
  claim_closed: "발급 마감",
  expired: "사용 종료"
};

export default async function CouponDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const coupon = await getPublicCoupon(id);
  if (!coupon) notFound();
  const { user } = await getCurrentSessionProfile();
  const status = getCouponDisplayStatus(coupon);
  const statusBadge = getCouponStatusStyle(status);
  const canClaim = status === "claiming";

  return (
    <main className="bg-[#F8F9FA] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <section className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm">
          <div className="aspect-[16/9] overflow-hidden"><CouponImage coupon={coupon} /></div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
              <Badge tone="blue">{getCouponBenefitLabel(coupon)}</Badge>
              {coupon.businessCategory ? <Badge tone="gray">{coupon.businessCategory}</Badge> : null}
            </div>
            <h1 className="mt-3 text-3xl font-black text-charcoal">{coupon.title}</h1>
            <p className="mt-4 whitespace-pre-wrap leading-7 text-gray-600">{coupon.description}</p>
            <div className="mt-8 border-t border-slate-100 pt-7">
              <h2 className="font-black text-charcoal">이용 조건</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">{coupon.terms}</p>
            </div>
            <div className="mt-8 rounded-2xl bg-slate-50 p-5">
              <h2 className="flex items-center gap-2 font-black text-charcoal"><Store size={18} className="text-primary" />{coupon.businessName}</h2>
              {coupon.businessAddress ? <p className="mt-3 flex gap-2 text-sm text-gray-600"><MapPin size={16} className="mt-0.5 shrink-0" />{coupon.businessAddress}</p> : null}
              {coupon.businessContact ? <p className="mt-2 flex gap-2 text-sm text-gray-600"><Phone size={16} />{coupon.businessContact}</p> : null}
            </div>
          </div>
        </section>

        <aside className="h-fit rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-xl font-black text-charcoal">쿠폰 정보</h2>
          <div className="mt-5 space-y-4 text-sm text-gray-600">
            <p className="flex gap-3"><CalendarDays size={17} className="shrink-0 text-primary" />사용 기간 {coupon.startDate} ~ {coupon.endDate}</p>
            <p className="flex gap-3"><Users size={17} className="shrink-0 text-primary" />총 {coupon.totalQuantity.toLocaleString()}장 · 잔여 {coupon.remainingQuantity.toLocaleString()}장</p>
          </div>
          {error ? <div className="mt-5"><FormBanner>{error}</FormBanner></div> : null}
          {canClaim ? (
            user ? (
              <form action={claimCoupon} className="mt-6">
                <input type="hidden" name="coupon_id" value={coupon.id} />
                <button className="w-full rounded-xl bg-primary py-4 text-sm font-black text-white shadow-sm">쿠폰 1매 받기</button>
              </form>
            ) : (
              <Link href={`/auth?next=${encodeURIComponent(`/coupons/${coupon.id}`)}`} className="mt-6 block rounded-xl bg-primary py-4 text-center text-sm font-black text-white">로그인하고 쿠폰 받기</Link>
            )
          ) : <button disabled className="mt-6 w-full rounded-xl bg-gray-100 py-4 text-sm font-black text-gray-400">{blockedLabels[status] ?? "발급 불가"}</button>}
          <p className="mt-4 flex gap-2 text-xs leading-5 text-gray-400"><ShieldCheck size={15} className="shrink-0" />회원 1명당 1매만 받을 수 있으며 다른 회원에게 양도할 수 없습니다.</p>
        </aside>
      </div>
    </main>
  );
}
