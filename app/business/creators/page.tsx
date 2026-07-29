import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { getBusinessCreatorManagement } from "@/lib/supabase/queries";
import { requireRole } from "@/lib/auth/guards";
import { saveCreatorReview } from "./actions";
import { CreatorReviewCard } from "./creator-review-card";
import { FormBanner } from "@/app/components/form-field";

type RehireFilter = "all" | "yes" | "no";

function normalizePage(value?: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;

  return parsed;
}

function normalizeRehire(value?: string): RehireFilter {
  return value === "yes" || value === "no" ? value : "all";
}

function creatorsHref({
  q,
  campaignId,
  rehire,
  page
}: {
  q?: string;
  campaignId?: string;
  rehire?: RehireFilter;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (campaignId) params.set("campaignId", campaignId);
  if (rehire && rehire !== "all") params.set("rehire", rehire);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();

  return query ? `/business/creators?${query}` : "/business/creators";
}

function campaignStatusLabel(status: string) {
  if (status === "in_review") return "검수 대기";
  if (status === "revision_requested") return "수정 요청";
  if (status === "recruiting") return "모집중";
  if (status === "selecting") return "선정중";
  if (status === "in_progress") return "진행중";
  if (status === "submission_review") return "제출 검수";
  if (status === "completed") return "완료";
  if (status === "cancelled") return "취소";
  if (status === "failed") return "실패";
  return status;
}

function Pagination({
  currentPage,
  totalPages,
  q,
  campaignId,
  rehire
}: {
  currentPage: number;
  totalPages: number;
  q: string;
  campaignId: string;
  rehire: RehireFilter;
}) {
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const previousPage = Math.max(currentPage - 1, 1);
  const nextPage = Math.min(currentPage + 1, totalPages);
  const linkClassName = "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors";

  return (
    <nav className="flex items-center justify-center gap-1 rounded-[20px] border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]" aria-label="크리에이터 관리 페이지">
      <Link
        href={creatorsHref({ q, campaignId, rehire, page: previousPage })}
        aria-disabled={currentPage === 1}
        className={`${linkClassName} ${currentPage === 1 ? "pointer-events-none text-gray-300" : "text-gray-400 hover:bg-gray-50 hover:text-charcoal"}`}
      >
        <ChevronLeft size={14} />
      </Link>
      {pageNumbers.map((pageNumber) => (
        <Link
          key={pageNumber}
          href={creatorsHref({ q, campaignId, rehire, page: pageNumber })}
          aria-current={pageNumber === currentPage ? "page" : undefined}
          className={`${linkClassName} ${pageNumber === currentPage ? "bg-primary font-bold text-white" : "text-gray-600 hover:bg-gray-50"}`}
        >
          {pageNumber}
        </Link>
      ))}
      <Link
        href={creatorsHref({ q, campaignId, rehire, page: nextPage })}
        aria-disabled={currentPage === totalPages}
        className={`${linkClassName} ${currentPage === totalPages ? "pointer-events-none text-gray-300" : "text-gray-400 hover:bg-gray-50 hover:text-charcoal"}`}
      >
        <ChevronRight size={14} />
      </Link>
    </nav>
  );
}

export default async function BusinessCreatorsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; saved?: string; q?: string; campaignId?: string; rehire?: string; page?: string }>;
}) {
  const { error, saved, q, campaignId, rehire, page } = await searchParams;
  const normalizedRehire = normalizeRehire(rehire);
  await requireRole("business", "/business/creators");
  const data = await getBusinessCreatorManagement({
    q,
    campaignId,
    rehire: normalizedRehire,
    page: normalizePage(page)
  });

  if (!data.business) {
    redirect("/business/dashboard?next=%2Fbusiness%2Fcreators");
  }

  const returnPath = creatorsHref({
    q: data.filters.q,
    campaignId: data.filters.campaignId,
    rehire: data.filters.rehire,
    page: data.currentPage
  });
  const hasFilter = Boolean(data.filters.q || data.filters.campaignId || data.filters.rehire !== "all");

  return (
    <main className="bg-[#F8F9FA]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 md:py-10 lg:flex-row lg:px-8">
        <OperatorSidebar business={data.business} active="creators" />

        <div className="min-w-0 flex-grow space-y-6">
          {error ? <FormBanner>{error}</FormBanner> : null}
          {saved ? <p className="rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{saved}</p> : null}

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">크리에이터 평가 및 메모</h1>
              <p className="mt-2 text-sm text-gray-500">선정된 크리에이터와의 협업 만족도와 내부 메모를 관리하세요.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <Users size={16} className="text-primary" />
              총 {data.totalCount.toLocaleString("ko-KR")}건
            </div>
          </div>

          <form action="/business/creators" className="flex flex-col gap-4 rounded-[20px] border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:flex-row lg:items-center">
            <div className="relative min-w-[240px] flex-grow">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="q"
                defaultValue={data.filters.q}
                placeholder="크리에이터명 또는 캠페인명 검색"
                className="w-full rounded-xl border border-transparent bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/30 focus:bg-white"
              />
            </div>
            <select
              name="campaignId"
              defaultValue={data.filters.campaignId}
              className="rounded-xl border border-transparent bg-gray-50 px-4 py-2 text-sm text-gray-600 outline-none transition-colors focus:border-primary/30 focus:bg-white"
            >
              <option value="">캠페인 전체</option>
              {data.campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title} · {campaignStatusLabel(campaign.status)}
                </option>
              ))}
            </select>
            <select
              name="rehire"
              defaultValue={data.filters.rehire}
              className="rounded-xl border border-transparent bg-gray-50 px-4 py-2 text-sm text-gray-600 outline-none transition-colors focus:border-primary/30 focus:bg-white"
            >
              <option value="all">재섭외 여부 전체</option>
              <option value="yes">재섭외 희망</option>
              <option value="no">재섭외 보류</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primaryHover">
                검색
              </button>
              {hasFilter ? (
                <Link href="/business/creators" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50">
                  초기화
                </Link>
              ) : null}
            </div>
          </form>

          <section className="space-y-4">
            {data.creators.map((item) => (
              <CreatorReviewCard key={item.collaborationId} item={item} action={saveCreatorReview} returnPath={returnPath} />
            ))}

            {data.creators.length === 0 ? (
              <div className="rounded-[20px] border border-gray-100 bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Users size={22} />
                </div>
                <p className="font-bold text-charcoal">{hasFilter ? "검색/필터 결과가 없습니다." : "선정된 협업 크리에이터가 없습니다."}</p>
                <p className="mt-2 text-sm text-gray-500">캠페인에서 지원자를 선정하면 이곳에서 평가와 메모를 남길 수 있습니다.</p>
              </div>
            ) : null}
          </section>

          {data.totalPages > 1 ? (
            <Pagination
              currentPage={data.currentPage}
              totalPages={data.totalPages}
              q={data.filters.q}
              campaignId={data.filters.campaignId}
              rehire={data.filters.rehire}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
