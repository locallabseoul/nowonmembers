import Link from "next/link";
import { Badge } from "@/app/components/ui";
import { getCurrentSessionProfile } from "@/lib/auth/guards";
import { getAdminMembers } from "@/lib/supabase/queries";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { FormBanner } from "@/app/components/form-field";
import { MemberActions } from "./member-actions";

const roleTabs = [
  ["", "전체"],
  ["business", "가게"],
  ["creator", "크리에이터"],
  ["admin", "관리자"]
] as const;

const verificationTabs = [
  ["", "전체"],
  ["pending", "인증 대기"],
  ["verified", "인증 완료"],
  ["rejected", "인증 반려"]
] as const;

function roleLabel(role: string) {
  if (role === "business") return "가게";
  if (role === "creator") return "크리에이터";
  if (role === "admin") return "관리자";
  return role;
}

function roleTone(role: string): "blue" | "green" | "gray" | "amber" {
  if (role === "admin") return "amber";
  if (role === "business") return "blue";
  return "green";
}

function verificationLabel(status: string) {
  if (status === "verified") return "인증 완료";
  if (status === "rejected") return "인증 반려";
  return "인증 대기";
}

function verificationTone(status: string): "green" | "gray" | "red" {
  if (status === "verified") return "green";
  if (status === "rejected") return "red";
  return "gray";
}

function formatJoinedAt(value: string) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;

  return `${year}.${month}.${day}`;
}

function memberHref(role: string, verification: string, searchQuery: string, page: number) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (verification) params.set("verification", verification);
  if (searchQuery) params.set("q", searchQuery);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();

  return query ? `/admin/members?${query}` : "/admin/members";
}

function Pagination({
  currentPage,
  totalPages,
  role,
  verification,
  searchQuery
}: {
  currentPage: number;
  totalPages: number;
  role: string;
  verification: string;
  searchQuery: string;
}) {
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const previousPage = Math.max(currentPage - 1, 1);
  const nextPage = Math.min(currentPage + 1, totalPages);
  const linkClassName = "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors";

  return (
    <nav className="flex items-center justify-center gap-1 border-t border-gray-100 bg-white p-4" aria-label="회원 목록 페이지">
      <Link
        href={memberHref(role, verification, searchQuery, previousPage)}
        aria-disabled={currentPage === 1}
        className={`${linkClassName} ${currentPage === 1 ? "pointer-events-none text-gray-300" : "text-gray-400 hover:bg-gray-50 hover:text-charcoal"}`}
      >
        <ChevronLeft size={14} />
      </Link>
      {pageNumbers.map((pageNumber) => (
        <Link
          key={pageNumber}
          href={memberHref(role, verification, searchQuery, pageNumber)}
          aria-current={pageNumber === currentPage ? "page" : undefined}
          className={`${linkClassName} ${pageNumber === currentPage ? "bg-primary font-bold text-white" : "text-gray-600 hover:bg-gray-50"}`}
        >
          {pageNumber}
        </Link>
      ))}
      <Link
        href={memberHref(role, verification, searchQuery, nextPage)}
        aria-disabled={currentPage === totalPages}
        className={`${linkClassName} ${currentPage === totalPages ? "pointer-events-none text-gray-300" : "text-gray-400 hover:bg-gray-50 hover:text-charcoal"}`}
      >
        <ChevronRight size={14} />
      </Link>
    </nav>
  );
}

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; role?: string; verification?: string; q?: string; page?: string }> }) {
  const { error, message, role, verification, q, page } = await searchParams;
  const roleFilter = roleTabs.some(([value]) => value === role) ? role ?? "" : "";
  const verificationFilter = verificationTabs.some(([value]) => value === verification) ? verification ?? "" : "";
  const searchQuery = (q ?? "").trim();
  const currentPageInput = Math.max(Number.parseInt(page ?? "1", 10) || 1, 1);
  const session = await getCurrentSessionProfile();
  const { members, totalCount, totalPages, currentPage } = await getAdminMembers({
    role: roleFilter,
    verification: verificationFilter,
    searchQuery,
    page: currentPageInput
  });
  const returnTo = memberHref(roleFilter, verificationFilter, searchQuery, currentPage);

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-charcoal">회원 관리</h1>
        <p className="mt-2 text-gray-500">가입 회원을 조회하고 인증 승인, 계정 정지, 관리자 권한을 관리합니다.</p>
      </div>
      {error ? <div className="mb-6"><FormBanner>{error}</FormBanner></div> : null}
      {message ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="space-y-4 border-b border-line p-5">
          <div className="flex flex-wrap items-center gap-2">
            {roleTabs.map(([value, label]) => (
              <Link
                key={label}
                href={memberHref(value, verificationFilter, searchQuery, 1)}
                className={`rounded-lg px-3 py-2 text-xs font-black ${roleFilter === value ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {label}
              </Link>
            ))}
            <span className="mx-1 h-4 w-px bg-gray-200" aria-hidden />
            {verificationTabs.map(([value, label]) => (
              <Link
                key={label}
                href={memberHref(roleFilter, value, searchQuery, 1)}
                className={`rounded-lg px-3 py-2 text-xs font-black ${verificationFilter === value ? "bg-charcoal text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {label}
              </Link>
            ))}
          </div>
          <form action="/admin/members" method="get" className="flex max-w-md gap-2">
            {roleFilter ? <input type="hidden" name="role" value={roleFilter} /> : null}
            {verificationFilter ? <input type="hidden" name="verification" value={verificationFilter} /> : null}
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                name="q"
                defaultValue={searchQuery}
                placeholder="닉네임 또는 이메일 검색"
                className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <button className="shrink-0 rounded-lg bg-charcoal px-4 py-2 text-sm font-black text-white">검색</button>
          </form>
          <p className="text-xs font-bold text-gray-400">총 {totalCount}명</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-400">
                <th className="px-5 py-3 font-bold">회원</th>
                <th className="px-3 py-3 font-bold">역할</th>
                <th className="px-3 py-3 font-bold">인증</th>
                <th className="px-3 py-3 font-bold">가입일</th>
                <th className="px-5 py-3 text-right font-bold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => (
                <tr key={member.id} className={member.status === "suspended" ? "bg-red-50/40" : undefined}>
                  <td className="px-5 py-4">
                    <p className="font-bold text-charcoal">
                      {member.nickname || member.businessName || "(이름 없음)"}
                      {member.status === "suspended" ? <Badge tone="red">정지됨</Badge> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{member.email || "이메일 없음"}{member.businessName && member.nickname !== member.businessName ? ` · ${member.businessName}` : ""}</p>
                  </td>
                  <td className="px-3 py-4">
                    <Badge tone={roleTone(member.role)}>{roleLabel(member.role)}</Badge>
                  </td>
                  <td className="px-3 py-4">
                    <Badge tone={verificationTone(member.verificationStatus)}>{verificationLabel(member.verificationStatus)}</Badge>
                  </td>
                  <td className="px-3 py-4 text-xs text-gray-500">{formatJoinedAt(member.createdAt)}</td>
                  <td className="px-5 py-4">
                    <MemberActions member={member} returnTo={returnTo} isSelf={member.id === session.user?.id} />
                  </td>
                </tr>
              ))}
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">조건에 맞는 회원이 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <Pagination currentPage={currentPage} totalPages={totalPages} role={roleFilter} verification={verificationFilter} searchQuery={searchQuery} />
        ) : null}
      </section>
    </main>
  );
}
