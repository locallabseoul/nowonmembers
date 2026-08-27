import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { requireRole } from "@/lib/auth/guards";
import { getBusinessProduct } from "@/lib/products";
import { getBusinessDashboard } from "@/lib/supabase/queries";
import { saveProduct } from "../../actions";
import { ProductForm } from "../../product-form";

export const metadata: Metadata = { title: "제품 수정" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session, dashboard] = await Promise.all([
    params,
    requireRole("business", "/business/products"),
    getBusinessDashboard()
  ]);
  const product = await getBusinessProduct(session.user.id, id);
  if (!product) notFound();
  if (!dashboard.business) return null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <OperatorSidebar business={dashboard.business} active="products" />
      <section className="min-w-0 flex-1">
        <Link href="/business/products" className="text-sm font-bold text-gray-400">← 제품 관리</Link>
        <h1 className="mt-3 text-3xl font-black text-charcoal">제품 수정</h1>
        <p className="mt-2 text-gray-500">제품 정보와 미니홈 공개 여부를 변경하세요.</p>
        <div className="mt-8 rounded-[20px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <ProductForm action={saveProduct} product={product} />
        </div>
      </section>
    </main>
  );
}
