import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Eye, EyeOff, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/app/components/confirm-button";
import { FormBanner } from "@/app/components/form-field";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { requireRole } from "@/lib/auth/guards";
import { formatProductPrice, getBusinessProducts } from "@/lib/products";
import { getBusinessDashboard } from "@/lib/supabase/queries";
import { deleteProduct, toggleProductVisibility } from "./actions";

export const metadata: Metadata = { title: "제품 관리" };

export default async function BusinessProductsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [{ error, message }, session, dashboard] = await Promise.all([
    searchParams,
    requireRole("business", "/business/products"),
    getBusinessDashboard()
  ]);
  if (!dashboard.business) return null;
  const products = await getBusinessProducts(session.user.id);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <OperatorSidebar business={dashboard.business} active="products" />
      <section className="min-w-0 flex-1">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-charcoal">제품 관리</h1>
            <p className="mt-2 text-gray-500">미니홈에 노출할 제품과 외부 구매 링크를 관리하세요.</p>
          </div>
          <Link href="/business/products/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white">
            <Plus size={17} /> 새 제품
          </Link>
        </div>

        {error ? <div className="mt-6"><FormBanner>{error}</FormBanner></div> : null}
        {message ? <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p> : null}

        <section className="mt-8 overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <h2 className="font-black text-charcoal">등록 제품</h2>
            <span className="text-sm font-bold text-gray-400">{products.length}개</span>
          </div>
          {products.length ? (
            <div className="divide-y divide-slate-100">
              {products.map((product) => (
                <article key={product.id} className="grid gap-4 p-5 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center sm:p-6">
                  <img src={product.imageUrl} alt="" className="h-[72px] w-[72px] rounded-2xl object-cover" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${product.isVisible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {product.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                        {product.isVisible ? "미니홈 공개" : "숨김"}
                      </span>
                      <span className="text-sm font-black text-primary">{formatProductPrice(product.price)}</span>
                    </div>
                    <h3 className="mt-2 truncate font-black text-charcoal">{product.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{product.shortDescription}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:max-w-[220px] sm:justify-end">
                    <a href={product.linkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-gray-600">
                      <ExternalLink size={14} /> 링크
                    </a>
                    <Link href={`/business/products/${product.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-gray-600">
                      <Pencil size={14} /> 수정
                    </Link>
                    <form action={toggleProductVisibility}>
                      <input type="hidden" name="product_id" value={product.id} />
                      <input type="hidden" name="is_visible" value={product.isVisible ? "false" : "true"} />
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-gray-600">
                        {product.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                        {product.isVisible ? "숨기기" : "공개"}
                      </button>
                    </form>
                    <ConfirmButton label="삭제" confirmLabel={`${product.name} 제품을 삭제합니다. 되돌릴 수 없습니다.`} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black text-red-500">
                      <form action={deleteProduct}>
                        <input type="hidden" name="product_id" value={product.id} />
                        <button className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white"><Trash2 size={13} /> 삭제 확정</button>
                      </form>
                    </ConfirmButton>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <Package size={32} className="mx-auto text-slate-300" />
              <p className="mt-4 text-sm font-bold text-gray-500">아직 등록한 제품이 없습니다.</p>
              <p className="mt-1 text-xs text-gray-400">첫 제품을 등록하면 공개 설정에 따라 미니홈에 표시됩니다.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
