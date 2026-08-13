import Link from "next/link";
import { notFound } from "next/navigation";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { requireRole } from "@/lib/auth/guards";
import { getBusinessCoupon } from "@/lib/coupons";
import { getBusinessDashboard } from "@/lib/supabase/queries";
import { saveCoupon } from "../../actions";
import { CouponForm } from "../../coupon-form";

export default async function EditCouponPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error }, session, dashboard] = await Promise.all([params, searchParams, requireRole("business", "/business/coupons"), getBusinessDashboard()]);
  const coupon = await getBusinessCoupon(session.user.id, id);
  if (!coupon) notFound();
  if (!dashboard.business) return null;
  const editable = coupon.status === "draft" || coupon.status === "revision_requested";
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <OperatorSidebar business={dashboard.business} active="coupons" />
      <section className="min-w-0 flex-1">
        <Link href="/business/coupons" className="text-sm font-bold text-gray-400">← 쿠폰 관리</Link>
        <h1 className="mt-3 text-3xl font-black text-charcoal">쿠폰 수정</h1>
        {!editable ? <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-700">현재 상태에서는 쿠폰을 수정할 수 없습니다.</p> : null}
        {coupon.adminMemo ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">관리자 메모: {coupon.adminMemo}</p> : null}
        <div className={`mt-8 rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8 ${editable ? "" : "pointer-events-none opacity-60"}`}><CouponForm action={saveCoupon} coupon={coupon} error={error} /></div>
      </section>
    </main>
  );
}
