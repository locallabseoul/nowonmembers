import Link from "next/link";
import { CheckCircle2, Plus, Search, Ticket, Users } from "lucide-react";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { ConfirmButton } from "@/app/components/confirm-button";
import { FormBanner } from "@/app/components/form-field";
import { Badge, StatCard } from "@/app/components/ui";
import { getBusinessCoupons, getCouponBenefitLabel } from "@/lib/coupons";
import { requireRole } from "@/lib/auth/guards";
import { getBusinessDashboard } from "@/lib/supabase/queries";
import { redeemCoupon, submitCouponForReview } from "./actions";

const statusLabel = { draft: "초안", in_review: "검수 대기", revision_requested: "수정 요청", approved: "승인", cancelled: "취소" };
const statusTone = { draft: "gray", in_review: "amber", revision_requested: "red", approved: "green", cancelled: "gray" } as const;

type LookupResult = { claim_id: string; coupon_title: string; member_name: string; claim_status: string; use_start: string; use_end: string };

export default async function BusinessCouponsPage({ searchParams }: { searchParams: Promise<{ code?: string; error?: string; message?: string }> }) {
  const [{ code = "", error, message }, session, dashboard] = await Promise.all([searchParams, requireRole("business", "/business/coupons"), getBusinessDashboard()]);
  if (!dashboard.business) return null;
  const coupons = await getBusinessCoupons(session.user.id);
  const couponIds = coupons.map((coupon) => coupon.id);
  const { data: claimRows } = couponIds.length ? await session.supabase.from("coupon_claims").select("coupon_id,status").in("coupon_id", couponIds) : { data: [] };
  const redeemedCount = (claimRows ?? []).filter((claim) => claim.status === "redeemed").length;
  let lookup: LookupResult | null = null;
  if (code.trim()) {
    const { data } = await session.supabase.rpc("lookup_coupon_claim", { target_code: code });
    lookup = (Array.isArray(data) ? data[0] : data) as LookupResult | null;
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <OperatorSidebar business={dashboard.business} active="coupons" />
      <section className="min-w-0 flex-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-3xl font-black text-charcoal">쿠폰 관리</h1><p className="mt-2 text-gray-500">쿠폰 발행 현황과 현장 사용을 관리합니다.</p></div>
          <Link href="/business/coupons/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white"><Plus size={17} />새 쿠폰</Link>
        </div>
        {error ? <div className="mt-6"><FormBanner>{error}</FormBanner></div> : null}
        {message ? <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p> : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="전체 쿠폰" value={`${coupons.length}`} icon={<Ticket size={20} />} />
          <StatCard label="누적 발급" value={`${coupons.reduce((sum, coupon) => sum + coupon.claimedQuantity, 0)}`} icon={<Users size={20} />} />
          <StatCard label="사용 완료" value={`${redeemedCount}`} icon={<CheckCircle2 size={20} />} />
        </div>

        <section className="mt-8 rounded-[20px] border border-primary/20 bg-primary/5 p-5 sm:p-6">
          <h2 className="font-black text-charcoal">현장 쿠폰 사용 처리</h2>
          <p className="mt-1 text-sm text-gray-500">회원 화면의 12자리 코드를 입력해 쿠폰과 회원을 확인하세요.</p>
          <form className="mt-4 flex max-w-xl gap-2">
            <label className="relative flex-1"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input name="code" defaultValue={code} maxLength={20} placeholder="예: A1B2C3D4E5F6" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 font-mono uppercase outline-none focus:border-primary" /></label>
            <button className="rounded-xl bg-charcoal px-5 text-sm font-black text-white">조회</button>
          </form>
          {code && !lookup ? <p className="mt-4 text-sm font-bold text-red-600">이 가게에서 사용할 수 있는 쿠폰 코드를 찾지 못했습니다.</p> : null}
          {lookup ? (
            <div className="mt-5 flex flex-col gap-4 rounded-xl bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><Badge tone={lookup.claim_status === "issued" ? "green" : "gray"}>{lookup.claim_status === "issued" ? "사용 가능" : lookup.claim_status === "redeemed" ? "사용 완료" : "취소"}</Badge><h3 className="mt-2 font-black text-charcoal">{lookup.coupon_title}</h3><p className="mt-1 text-sm text-gray-500">회원: {lookup.member_name} · 사용 {lookup.use_start} ~ {lookup.use_end}</p></div>
              {lookup.claim_status === "issued" ? (
                <ConfirmButton label="사용 완료 처리" confirmLabel="쿠폰과 회원 정보를 확인했습니다. 처리 후에는 되돌릴 수 없습니다." className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white">
                  <form action={redeemCoupon}><input type="hidden" name="claim_id" value={lookup.claim_id} /><button className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white">사용 확정</button></form>
                </ConfirmButton>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="mt-8 overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5"><h2 className="font-black text-charcoal">발행 쿠폰</h2></div>
          {coupons.length ? <div className="divide-y divide-slate-100">{coupons.map((coupon) => (
            <article key={coupon.id} className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div><div className="flex flex-wrap gap-2"><Badge tone={statusTone[coupon.status]}>{statusLabel[coupon.status]}</Badge><Badge>{getCouponBenefitLabel(coupon)}</Badge></div><h3 className="mt-3 font-black text-charcoal">{coupon.title}</h3><p className="mt-2 text-sm text-gray-500">발급 {coupon.claimedQuantity}/{coupon.totalQuantity}장 · 사용 {coupon.useStart} ~ {coupon.useEnd}</p>{coupon.adminMemo ? <p className="mt-2 text-xs font-bold text-red-600">관리자 메모: {coupon.adminMemo}</p> : null}</div>
              <div className="flex flex-wrap gap-2">
                {(coupon.status === "draft" || coupon.status === "revision_requested") ? <Link href={`/business/coupons/${coupon.id}/edit`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-gray-600">수정</Link> : null}
                {coupon.status === "draft" ? <form action={submitCouponForReview}><input type="hidden" name="coupon_id" value={coupon.id} /><button className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white">검수 요청</button></form> : null}
                {coupon.status === "approved" ? <Link href={`/coupons/${coupon.id}`} className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-black text-primary">공개 보기</Link> : null}
              </div>
            </article>
          ))}</div> : <p className="px-6 py-16 text-center text-sm text-gray-400">아직 만든 쿠폰이 없습니다.</p>}
        </section>
      </section>
    </main>
  );
}
