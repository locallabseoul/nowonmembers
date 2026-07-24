import type { Metadata } from "next";
import Link from "next/link";
import { Menu, Plus, UserRound } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { AccountMenu } from "@/app/components/account-menu";
import { HeaderNav } from "@/app/components/header-nav";
import { getAccountPath, getCurrentSessionProfile } from "@/lib/auth/guards";
import "./globals.css";

export const metadata: Metadata = {
  title: "노원멤버스",
  description: "노원의 가게와 지역 크리에이터를 연결하는 로컬 콘텐츠 협업 플랫폼"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}

async function Header() {
  const { user, profile } = await getCurrentSessionProfile();
  const displayName = profile?.nickname || user?.email?.split("@")[0] || user?.phone || "내 계정";
  const role = profile?.role;
  const isLoggedIn = Boolean(user);
  const accountPath = getAccountPath(role);
  const profileEditPath = getProfileEditPath(role);
  const avatarUrl = isLoggedIn ? await getHeaderAvatarUrl(role, user?.id) : "";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <span className="text-lg font-black tracking-tight text-charcoal">NOWON<span className="text-primary">MEMBERS</span></span>
          </Link>
          <HeaderNav />
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {role === "business" ? (
                <Link
                  href="/business/campaigns/new"
                  className="hidden items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 md:inline-flex"
                >
                  <Plus size={13} /> 캠페인 만들기
                </Link>
              ) : null}
              <AccountMenu displayName={displayName} role={role} accountPath={accountPath} profileEditPath={profileEditPath} avatarUrl={avatarUrl} signOutAction={signOut} />
            </>
          ) : (
            <>
              <Link href="/auth" className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:border-primary hover:text-primary">
                <UserRound size={15} />
                <span className="hidden sm:inline">로그인</span>
              </Link>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden" aria-label="메뉴">
                <Menu size={19} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function getProfileEditPath(role?: string | null) {
  if (role === "business") return "/business/dashboard?profile=edit";
  if (role === "creator") return "/creator/profile";
  return null;
}

async function getHeaderAvatarUrl(role?: string | null, userId?: string) {
  if (!userId) return "";

  const { supabase } = await getCurrentSessionProfile();

  if (role === "creator") {
    const { data } = await supabase
      .from("creator_profiles")
      .select("avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    return data?.avatar_url ?? "";
  }

  if (role === "business") {
    const { data } = await supabase
      .from("business_profiles")
      .select("cover_image_url")
      .eq("user_id", userId)
      .maybeSingle();

    return data?.cover_image_url ?? "";
  }

  return "";
}

async function Footer() {
  const { profile } = await getCurrentSessionProfile();
  const role = profile?.role;
  const serviceLinks: [string, string][] = [["/campaigns", "캠페인 목록"], ["/stories", "완료 콘텐츠"]];
  if (role === "business") serviceLinks.push(["/business/campaigns/new", "캠페인 만들기"]);

  return (
    <footer className="bg-charcoal pb-8 pt-14 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-10 lg:flex-row">
          <div className="max-w-xs">
            <div className="mb-4 flex items-center">
              <span className="text-xl font-black tracking-tight">NOWON<span className="text-primary">MEMBERS</span></span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-slate-400">노원 지역 소상공인과 크리에이터를 연결하는 로컬 콘텐츠 캠페인 플랫폼입니다.</p>
            <div className="text-xs font-medium text-gray-500">A service by <span className="font-bold text-primary">Local Lab Community</span></div>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:gap-16">
            <FooterColumn title="서비스" links={serviceLinks} />
            <FooterColumn title="마이페이지" links={[["/creator/dashboard", "크리에이터 마이페이지"], ["/business/dashboard", "운영자 마이페이지"], ["/auth", "콘텐츠 제출"]]} />
            <FooterColumn title="정보" links={[["/auth", "이용약관"], ["/auth", "개인정보처리방침"], ["/auth", "고객센터"]]} />
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-gray-500">&copy; 2026 NOWON MEMBERS. All rights reserved.</p>
          <p className="text-xs text-gray-500">A service by <span className="font-semibold text-primary">Local Lab Community</span></p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-black uppercase tracking-wide text-white">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(([href, label]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-gray-400 transition-colors hover:text-white">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
