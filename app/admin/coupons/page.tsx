import Link from "next/link";
import { CalendarDays, Store, Ticket, Users } from "lucide-react";
import { ConfirmButton } from "@/app/components/confirm-button";
import { getCouponStatusStyle } from "@/app/components/coupon-card";
import { FormBanner } from "@/app/components/form-field";
import { Badge } from "@/app/components/ui";
import { getAdminCoupons, getCouponBenefitLabel } from "@/lib/coupons";
import { approveCoupon, cancelCoupon, requestCouponRevision } from "./actions";


export default async function AdminCouponsPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string; message?: string }> }) {
  const { status = "in_review", error, message } = await searchParams;
  const coupons = await getAdminCoupons();
  const filtered = status ? coupons.filter((coupon) => coupon.status === status) : coupons;
  return (
    <main>
      <div><p className="text-sm font-black text-primary">운영자</p><h1 className="mt-2 text-3xl font-black text-charcoal">쿠폰 심사</h1><p className="mt-2 text-gray-500">가게가 등록한 혜택과 이용 조건을 확인하고 공개를 승인합니다.</p></div>
      {error ? <div className="mt-6"><FormBanner>{error}</FormBanner></div> : null}
      {message ? <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p> : null}
      <nav className="mt-7 flex flex-wrap gap-2">
        {[["in_review", "검수 대기"], ["revision_requested", "수정 요청"], ["approved", "승인"], ["", "전체"]].map(([value, label]) => <Link key={value} href={value ? `/admin/coupons?status=${value}` : "/admin/coupons?status="} className={`rounded-full px-4 py-2 text-sm font-black ${status === value ? "bg-charcoal text-white" : "bg-white text-gray-500 ring-1 ring-slate-200"}`}>{label}</Link>)}
      </nav>

      <section className="mt-6 space-y-5">
        {filtered.map((coupon) => {
          const canReview = coupon.status === "in_review" || coupon.status === "revision_requested";
          return (
            <article key={coupon.id} className="rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2"><Badge tone={getCouponStatusStyle(coupon.status).tone}>{getCouponStatusStyle(coupon.status).label}</Badge><Badge tone="blue">{getCouponBenefitLabel(coupon)}</Badge><Badge tone={coupon.redemptionCodeConfigured ? "green" : "amber"}>{coupon.redemptionCodeConfigured ? "사용 코드 설정됨" : "사용 코드 미설정"}</Badge></div>
                  <h2 className="mt-3 text-xl font-black text-charcoal">{coupon.title}</h2>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500"><span className="flex items-center gap-1.5"><Store size={15} />{coupon.businessName}</span><span className="flex items-center gap-1.5"><Users size={15} />총 {coupon.totalQuantity.toLocaleString()}장</span><span className="flex items-center gap-1.5"><CalendarDays size={15} />{coupon.startDate} ~ {coupon.endDate}</span></div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-600">{coupon.description}</p>
                  <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-black text-gray-500">이용 조건</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{coupon.terms}</p><p className="mt-3 text-xs font-bold text-gray-400">사용 기간 {coupon.startDate} ~ {coupon.endDate}</p></div>
                  {coupon.adminMemo ? <p className="mt-3 text-sm font-bold text-red-600">이전 메모: {coupon.adminMemo}</p> : null}
                </div>
                {canReview ? (
                  <div className="w-full shrink-0 space-y-3 lg:w-72">
                    <form action={requestCouponRevision} className="space-y-2"><input type="hidden" name="coupon_id" value={coupon.id} /><textarea name="admin_memo" required rows={3} placeholder="수정 요청 사유" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary" /><button className="w-full rounded-xl border border-primary px-4 py-2.5 text-sm font-black text-primary">수정 요청</button></form>
                    <form action={approveCoupon}><input type="hidden" name="coupon_id" value={coupon.id} /><button className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-white">공개 승인</button></form>
                    <ConfirmButton label="쿠폰 취소" confirmLabel="이 심사 건을 취소합니다. 되돌릴 수 없습니다." className="w-full text-sm font-bold text-gray-400"><form action={cancelCoupon}><input type="hidden" name="coupon_id" value={coupon.id} /><input type="hidden" name="admin_memo" value="관리자 심사 취소" /><button className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white">취소 확정</button></form></ConfirmButton>
                  </div>
                ) : coupon.status === "approved" ? <Link href={`/coupons/${coupon.id}`} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 px-4 py-2 text-sm font-black text-primary"><Ticket size={16} />공개 화면</Link> : null}
              </div>
            </article>
          );
        })}
        {!filtered.length ? <div className="rounded-[20px] border border-dashed border-slate-200 bg-white py-20 text-center text-sm text-gray-400">해당 상태의 쿠폰이 없습니다.</div> : null}
      </section>
    </main>
  );
}
