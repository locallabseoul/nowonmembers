import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormBanner } from "@/app/components/form-field";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { requireRole } from "@/lib/auth/guards";
import { getBusinessMinihomeLinks } from "@/lib/minihome-links";
import { getBusinessDashboard } from "@/lib/supabase/queries";
import { updateBusinessMinihomeVisibility } from "../dashboard/actions";
import { MinihomeManager } from "./minihome-manager";
import { MinihomeLinkManager } from "./minihome-link-manager";

export const metadata: Metadata = { title: "미니홈 관리" };

export default async function BusinessMinihomePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [params, session, { business }] = await Promise.all([
    searchParams,
    requireRole("business", "/business/minihome"),
    getBusinessDashboard(undefined, { perPage: 1 })
  ]);
  if (!business) redirect("/business/dashboard?error=가게 프로필을 먼저 등록해주세요.");
  const links = await getBusinessMinihomeLinks(session.user.id);

  return (
    <main className="bg-[#F8F9FA]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 md:py-10 lg:flex-row lg:px-8">
        <OperatorSidebar business={business} active="minihome" />
        <div className="min-w-0 flex-grow space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">미니홈 관리</h1>
            <p className="mt-2 text-sm text-gray-500">가게 미니홈의 공개 상태와 공유 링크를 관리하세요.</p>
          </div>
          {params.error ? <FormBanner>{params.error}</FormBanner> : null}
          {params.message ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{params.message}</p> : null}
          <MinihomeManager business={business} visibilityAction={updateBusinessMinihomeVisibility} />
          <MinihomeLinkManager links={links} />
        </div>
      </div>
    </main>
  );
}
