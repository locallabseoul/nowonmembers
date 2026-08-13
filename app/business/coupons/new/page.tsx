import Link from "next/link";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { requireRole } from "@/lib/auth/guards";
import { getBusinessDashboard } from "@/lib/supabase/queries";
import { saveCoupon } from "../actions";
import { CouponForm } from "../coupon-form";

export default async function NewCouponPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRole("business", "/business/coupons/new");
  const [{ error }, dashboard] = await Promise.all([searchParams, getBusinessDashboard()]);
  if (!dashboard.business) return null;
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <OperatorSidebar business={dashboard.business} active="coupons" />
      <section className="min-w-0 flex-1">
        <Link href="/business/coupons" className="text-sm font-bold text-gray-400">← 쿠폰 관리</Link>
        <h1 className="mt-3 text-3xl font-black text-charcoal">새 쿠폰 만들기</h1>
        <p className="mt-2 text-gray-500">혜택과 기간을 입력한 뒤 관리자 검수를 요청하세요.</p>
        <div className="mt-8 rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8"><CouponForm action={saveCoupon} error={error} /></div>
      </section>
    </main>
  );
}
