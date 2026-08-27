import type { Metadata } from "next";
import Link from "next/link";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { requireRole } from "@/lib/auth/guards";
import { getBusinessDashboard } from "@/lib/supabase/queries";
import { saveProduct } from "../actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "새 제품 등록" };

export default async function NewProductPage() {
  await requireRole("business", "/business/products/new");
  const dashboard = await getBusinessDashboard();
  if (!dashboard.business) return null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <OperatorSidebar business={dashboard.business} active="products" />
      <section className="min-w-0 flex-1">
        <Link href="/business/products" className="text-sm font-bold text-gray-400">← 제품 관리</Link>
        <h1 className="mt-3 text-3xl font-black text-charcoal">새 제품 등록</h1>
        <p className="mt-2 text-gray-500">제품 정보와 구매 페이지 링크를 입력하세요.</p>
        <div className="mt-8 rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <ProductForm action={saveProduct} />
        </div>
      </section>
    </main>
  );
}
