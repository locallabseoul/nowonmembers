import Link from "next/link";
import { CheckCircle2, KeyRound, Plus, Ticket, Users } from "lucide-react";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { getCouponStatusStyle } from "@/app/components/coupon-card";
import { FormBanner } from "@/app/components/form-field";
import { Badge, StatCard } from "@/app/components/ui";
import { getBusinessCoupons, getCouponBenefitLabel } from "@/lib/coupons";
import { requireRole } from "@/lib/auth/guards";
import { getBusinessDashboard } from "@/lib/supabase/queries";
import { setCouponRedemptionCode, submitCouponForReview } from "./actions";


export default async function BusinessCouponsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ error, message }, session, dashboard] = await Promise.all([searchParams, requireRole("business", "/business/coupons"), getBusinessDashboard()]);
  if (!dashboard.business) return null;
  const coupons = await getBusinessCoupons(session.user.id);
  const couponIds = coupons.map((coupon) => coupon.id);
  const { data: claimRows } = couponIds.length ? await session.supabase.from("coupon_claims").select("coupon_id,status").in("coupon_id", couponIds) : { data: [] };
  const redeemedCount = (claimRows ?? []).filter((claim) => claim.status === "redeemed").length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <OperatorSidebar business={dashboard.business} active="coupons" />
      <section className="min-w-0 flex-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-3xl font-black text-charcoal">쿠폰 관리</h1><p className="mt-2 text-gray-500">쿠폰 발행 현황과 매장에서 사용할 코드를 관리합니다.</p></div>
          <Link href="/business/coupons/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white"><Plus size={17} />새 쿠폰</Link>
        </div>
        {error ? <div className="mt-6"><FormBanner>{error}</FormBanner></div> : null}
        {message ? <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p> : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="전체 쿠폰" value={`${coupons.length}`} icon={<Ticket size={20} />} />
          <StatCard label="누적 발급" value={`${coupons.reduce((sum, coupon) => sum + coupon.claimedQuantity, 0)}`} icon={<Users size={20} />} />
          <StatCard label="사용 완료" value={`${redeemedCount}`} icon={<CheckCircle2 size={20} />} />
        </div>

        <section className="mt-8 overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5"><h2 className="font-black text-charcoal">발행 쿠폰</h2></div>
          {coupons.length ? <div className="divide-y divide-slate-100">{coupons.map((coupon) => (
            <article key={coupon.id} className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div><div className="flex flex-wrap gap-2"><Badge tone={getCouponStatusStyle(coupon.status).tone}>{getCouponStatusStyle(coupon.status).label}</Badge><Badge tone="blue">{getCouponBenefitLabel(coupon)}</Badge><Badge tone={coupon.redemptionCodeConfigured ? "green" : "red"}>{coupon.redemptionCodeConfigured ? "사용 코드 설정됨" : "사용 코드 필요"}</Badge></div><h3 className="mt-3 font-black text-charcoal">{coupon.title}</h3><p className="mt-2 text-sm text-gray-500">발급 {coupon.claimedQuantity}/{coupon.totalQuantity}장 · {coupon.startDate} ~ {coupon.endDate}</p>{coupon.adminMemo ? <p className="mt-2 text-xs font-bold text-red-600">관리자 메모: {coupon.adminMemo}</p> : null}</div>
              <div className="space-y-3 md:w-72">
                <div className="flex flex-wrap justify-end gap-2">
                  {(coupon.status === "draft" || coupon.status === "revision_requested") ? <Link href={`/business/coupons/${coupon.id}/edit`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-gray-600">수정</Link> : null}
                  {coupon.status === "draft" && coupon.redemptionCodeConfigured ? <form action={submitCouponForReview}><input type="hidden" name="coupon_id" value={coupon.id} /><button className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white">검수 요청</button></form> : null}
                  {coupon.status === "approved" ? <Link href={`/coupons/${coupon.id}`} className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-black text-primary">공개 보기</Link> : null}
                </div>
                {coupon.status !== "cancelled" ? (
                  <form action={setCouponRedemptionCode} className="rounded-xl bg-slate-50 p-3">
                    <input type="hidden" name="coupon_id" value={coupon.id} />
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-gray-500"><KeyRound size={14} />{coupon.redemptionCodeConfigured ? "사용 코드 재설정" : "사용 코드 설정"}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input name="redemption_code" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoComplete="new-password" placeholder="숫자 6자리" className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary" />
                      <input name="redemption_code_confirm" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoComplete="new-password" placeholder="코드 확인" className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                    <button className="mt-2 w-full rounded-lg bg-charcoal px-3 py-2 text-xs font-black text-white">{coupon.redemptionCodeConfigured ? "새 코드로 변경" : "코드 설정"}</button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}</div> : <p className="px-6 py-16 text-center text-sm text-gray-400">아직 만든 쿠폰이 없습니다.</p>}
        </section>
      </section>
    </main>
  );
}
