import Link from "next/link";
import { ArrowRight, BellRing, RefreshCw, Settings, Ticket, UserRound } from "lucide-react";
import { FormBanner } from "@/app/components/form-field";
import { normalizeKoreanAuthPhone } from "@/lib/auth/phone";
import { requireRole } from "@/lib/auth/guards";

export const metadata = {
  title: "마이페이지"
};

function formatPhone(value: string) {
  const digits = normalizeKoreanAuthPhone(value);
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

const links = [
  { href: "/my/coupons", label: "내 쿠폰함", description: "받은 쿠폰과 사용 상태를 확인합니다.", icon: Ticket },
  { href: "/account/profile", label: "프로필 수정", description: "닉네임, 이름과 이메일을 관리합니다.", icon: Settings },
  { href: "/account/notifications", label: "수신 설정", description: "동네 혜택과 쿠폰 소식 수신 여부를 정합니다.", icon: BellRing },
  { href: "/account/upgrade", label: "회원 유형 전환", description: "크리에이터 또는 가게 회원으로 전환합니다.", icon: RefreshCw }
];

export default async function ResidentMyPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ error, message }, { supabase, user }] = await Promise.all([
    searchParams,
    requireRole("resident", "/my")
  ]);
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname,name,email,phone")
    .eq("id", user.id)
    .single();

  return (
    <main className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {error ? <div className="mb-6"><FormBanner>{error}</FormBanner></div> : null}
        {message ? <p className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p> : null}

        <section className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound size={25} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-primary">주민 회원</p>
                <h1 className="mt-1 truncate text-2xl font-black text-charcoal">{profile?.nickname || "내 프로필"}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {[profile?.name, formatPhone(profile?.phone || user.phone || "")].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <Link href="/account/profile" className="rounded-xl border border-primary px-5 py-3 text-center text-sm font-black text-primary hover:bg-primary/5">
              프로필 수정
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {links.map(({ href, label, description, icon: Icon }) => (
            <Link key={href} href={href} className="group flex items-center gap-4 rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-primary group-hover:bg-primary/10">
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-black text-charcoal">{label}</span>
                <span className="mt-1 block break-keep text-sm leading-5 text-gray-500">{description}</span>
              </span>
              <ArrowRight size={17} className="shrink-0 text-gray-300 group-hover:text-primary" />
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
