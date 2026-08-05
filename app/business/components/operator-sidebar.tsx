import Link from "next/link";
import { BarChart3, CreditCard, ListChecks, Users } from "lucide-react";
import type { BusinessDashboardData } from "@/lib/supabase/queries";

type OperatorBusiness = NonNullable<BusinessDashboardData["business"]>;
type OperatorSection = "campaigns" | "creators" | "points" | "reports";

function navClassName(isActive: boolean) {
  return `flex items-center gap-3 border-l-4 px-6 py-4 transition-colors ${
    isActive
      ? "border-primary bg-primary/5 font-bold text-primary"
      : "border-transparent font-medium text-gray-600 hover:bg-gray-50 hover:text-charcoal"
  }`;
}

export function OperatorSidebar({ business, active }: { business: OperatorBusiness; active: OperatorSection }) {
  const initial = business.businessName.slice(0, 1);

  return (
    <aside className="w-full shrink-0 space-y-6 lg:w-64">
      <section className="flex flex-col items-center rounded-[20px] border border-gray-100 bg-white p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="mb-4 h-20 w-20 overflow-hidden rounded-full border-2 border-gray-100 bg-gray-200 shadow-sm">
          {business.coverImage ? (
            <img src={business.coverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-2xl font-black text-primary">{initial}</div>
          )}
        </div>
        <h2 className="text-lg font-bold text-charcoal">{business.businessName}</h2>
        <p className="mb-4 mt-1 text-sm text-gray-500">사업자 회원</p>
        <Link href="/business/dashboard?profile=edit" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
          프로필 수정
        </Link>
      </section>

      <nav className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]" aria-label="가게 대시보드 메뉴">
        <ul className="flex flex-col">
          <li>
            <Link href="/business/dashboard" className={navClassName(active === "campaigns")}>
              <ListChecks size={20} />
              캠페인 관리
            </Link>
          </li>
          <li>
            <Link href="/business/creators" className={navClassName(active === "creators")}>
              <Users size={20} />
              크리에이터 관리
            </Link>
          </li>
          <li>
            <Link href="/business/reports" className={navClassName(active === "reports")}>
              <BarChart3 size={20} />
              통계 및 리포트
            </Link>
          </li>
          <li>
            <Link href="/business/points" className={navClassName(active === "points")}>
              <CreditCard size={20} />
              포인트·결제
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
