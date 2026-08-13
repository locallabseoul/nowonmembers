import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, Copy, Ticket, XCircle } from "lucide-react";
import { ConfirmButton } from "@/app/components/confirm-button";
import { FormBanner } from "@/app/components/form-field";
import { Badge } from "@/app/components/ui";
import { getKoreaTodayString } from "@/lib/campaign-lifecycle";
import { getCouponBenefitLabel, getMyCouponClaims, type CouponClaim } from "@/lib/coupons";
import { requireUser } from "@/lib/auth/guards";
import { cancelCouponClaim } from "./actions";

function claimViewStatus(claim: CouponClaim) {
  if (claim.status === "redeemed") return "redeemed";
  if (claim.status === "cancelled") return "cancelled";
  if (getKoreaTodayString() > claim.coupon.useEnd) return "expired";
  return "available";
}

const statusInfo = {
  available: { label: "사용 가능", tone: "green" as const, icon: Clock3 },
  redeemed: { label: "사용 완료", tone: "blue" as const, icon: CheckCircle2 },
  cancelled: { label: "발급 취소", tone: "gray" as const, icon: XCircle },
  expired: { label: "기간 만료", tone: "gray" as const, icon: CalendarDays }
};

export default async function MyCouponsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ error, message }, { user }] = await Promise.all([searchParams, requireUser("/my/coupons")]);
  const claims = await getMyCouponClaims(user.id);

  return (
    <main className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-charcoal">내 쿠폰함</h1>
            <p className="mt-2 text-gray-500">매장에서 사용 가능한 쿠폰 코드를 확인하세요.</p>
          </div>
          <Link href="/coupons" className="rounded-xl border border-primary px-5 py-3 text-center text-sm font-black text-primary">쿠폰 더 보기</Link>
        </div>
        {error ? <div className="mt-6"><FormBanner>{error}</FormBanner></div> : null}
        {message ? <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p> : null}

        {claims.length ? (
          <section className="mt-8 space-y-5">
            {claims.map((claim) => {
              const viewStatus = claimViewStatus(claim);
              const info = statusInfo[viewStatus];
              const StatusIcon = info.icon;
              const canCancel = claim.status === "issued" && getKoreaTodayString() < claim.coupon.useStart;
              return (
                <article key={claim.id} className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm">
                  <div className="grid sm:grid-cols-[180px_1fr]">
                    <div className="flex min-h-36 items-center justify-center bg-gradient-to-br from-primary/10 to-amber-100 text-primary">
                      <Ticket size={48} strokeWidth={1.5} />
                    </div>
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Badge tone={info.tone}><span className="flex items-center gap-1"><StatusIcon size={13} />{info.label}</span></Badge>
                          <h2 className="mt-3 text-lg font-black text-charcoal">{claim.coupon.title}</h2>
                          <p className="mt-1 text-sm font-bold text-primary">{getCouponBenefitLabel(claim.coupon)} · {claim.coupon.businessName}</p>
                        </div>
                        <Link href={`/coupons/${claim.coupon.id}`} className="text-sm font-bold text-gray-400 hover:text-primary">상세 보기</Link>
                      </div>
                      <p className="mt-4 text-xs text-gray-500">사용 기간 {claim.coupon.useStart} ~ {claim.coupon.useEnd}</p>
                      {viewStatus === "available" ? (
                        <div className="mt-5 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center">
                          <p className="text-xs font-black text-gray-500">매장 직원에게 이 코드를 보여주세요</p>
                          <p className="mt-2 flex items-center justify-center gap-2 font-mono text-2xl font-black tracking-[0.2em] text-charcoal"><Copy size={18} />{claim.redemptionCode}</p>
                        </div>
                      ) : null}
                      {canCancel ? (
                        <div className="mt-4 text-right">
                          <ConfirmButton label="발급 취소" confirmLabel="사용 시작 전 쿠폰만 취소할 수 있으며 수량은 다시 반환됩니다." className="text-sm font-bold text-gray-400 hover:text-red-600">
                            <form action={cancelCouponClaim}>
                              <input type="hidden" name="claim_id" value={claim.id} />
                              <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white">취소 확정</button>
                            </form>
                          </ConfirmButton>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-8 rounded-[20px] border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
            <Ticket className="mx-auto text-slate-300" size={44} />
            <h2 className="mt-4 font-black text-charcoal">받은 쿠폰이 없습니다</h2>
            <Link href="/coupons" className="mt-5 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-black text-white">쿠폰북 둘러보기</Link>
          </section>
        )}
      </div>
    </main>
  );
}
