import type { Metadata } from "next";
import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { AccountMenu } from "@/app/components/account-menu";
import { HeaderNav } from "@/app/components/header-nav";
import { MobileNav } from "@/app/components/mobile-nav";
import { NoticeMenu } from "@/app/components/notice-menu";
import { markNotificationsRead } from "@/app/notifications/actions";
import { PinnedNoticeBar } from "@/app/components/pinned-notice-bar";
import { getAccountPath, getCurrentSessionProfile } from "@/lib/auth/guards";
import { COMPANY_INFO } from "@/lib/legal";
import { getHeaderFeedData, getPinnedNotice } from "@/lib/supabase/queries";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "노원멤버스",
    template: "%s | 노원멤버스"
  },
  description: "노원의 가게와 지역 크리에이터를 연결하는 로컬 콘텐츠 협업 플랫폼",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "노원멤버스",
    title: "노원멤버스",
    description: "노원의 가게와 지역 크리에이터를 연결하는 로컬 콘텐츠 협업 플랫폼"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="flex min-h-dvh flex-col bg-white antialiased">
        <Header />
        <div className="site-content">
          {children}
        </div>
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
  const [feedData, pinnedNotice] = await Promise.all([
    isLoggedIn && user ? getHeaderFeedData(user.id) : Promise.resolve({ items: [], unreadCount: 0 }),
    getPinnedNotice()
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      {pinnedNotice ? <PinnedNoticeBar notice={pinnedNotice} /> : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 md:gap-8">
          <MobileNav isBusiness={role === "business"} />
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
              <NoticeMenu items={feedData.items} unreadCount={feedData.unreadCount} onOpen={markNotificationsRead} />
              <AccountMenu displayName={displayName} role={role} isAdmin={Boolean(profile?.is_admin)} accountPath={accountPath} profileEditPath={profileEditPath} avatarUrl={avatarUrl} signOutAction={signOut} />
            </>
          ) : (
            <Link href="/auth" className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:border-primary hover:text-primary">
              <UserRound size={15} />
              <span className="hidden sm:inline">로그인</span>
            </Link>
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

function Footer() {
  return (
    <footer className="bg-charcoal py-8 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-lg font-black tracking-tight">NOWON<span className="text-primary">MEMBERS</span></span>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">노원 지역 소상공인과 크리에이터를 연결하는 로컬 콘텐츠 캠페인 플랫폼입니다.</p>
            <div className="mt-3 flex max-w-2xl flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-gray-500">
              <span>상호: {COMPANY_INFO.name}</span>
              <span>대표: {COMPANY_INFO.representative}</span>
              <span>사업자등록번호: {COMPANY_INFO.businessRegistrationNumber}</span>
              {COMPANY_INFO.mailOrderSalesNumber ? (
                <span>통신판매업신고번호: {COMPANY_INFO.mailOrderSalesNumber}</span>
              ) : null}
              <span>주소: {COMPANY_INFO.address}</span>
              <span>문의: {COMPANY_INFO.email}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-gray-400">
            <Link href="/guide/campaign" className="transition-colors hover:text-white">캠페인 작성 가이드</Link>
            <Link href="/terms" className="transition-colors hover:text-white">이용약관</Link>
            <Link href="/privacy" className="transition-colors hover:text-white">개인정보처리방침</Link>
          </div>
        </div>
        <p className="mt-6 border-t border-white/10 pt-5 text-xs text-gray-500">&copy; 2026 NOWON MEMBERS. All rights reserved.</p>
      </div>
    </footer>
  );
}
