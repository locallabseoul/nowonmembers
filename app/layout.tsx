import type { Metadata } from "next";
import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { AccountMenu } from "@/app/components/account-menu";
import { Logo } from "@/app/components/logo";
import { Analytics } from "@vercel/analytics/next";
import { HeaderNav } from "@/app/components/header-nav";
import { MobileNav } from "@/app/components/mobile-nav";
import { NoticeMenu } from "@/app/components/notice-menu";
import { markNotificationsRead } from "@/app/notifications/actions";
import { PinnedNoticeBar } from "@/app/components/pinned-notice-bar";
import { ReadOnlyPreviewBanner } from "@/app/components/read-only-preview-banner";
import { getAccountPath, getCurrentSessionProfile } from "@/lib/auth/guards";
import { getReadOnlyPreview } from "@/lib/auth/read-only-preview";
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
  description: "노원의 가게·크리에이터·주민을 연결하고 동네 쿠폰 혜택을 제공하는 지역 플랫폼",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "노원멤버스",
    title: "노원멤버스",
    description: "노원의 가게·크리에이터·주민을 연결하고 동네 쿠폰 혜택을 제공하는 지역 플랫폼"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="flex min-h-dvh flex-col bg-white antialiased">
        <ReadOnlyPreviewBanner />
        <Header />
        <div className="site-content">
          {children}
        </div>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}

async function Header() {
  const { user, profile } = await getCurrentSessionProfile();
  const preview = await getReadOnlyPreview();
  const authNickname = typeof user?.user_metadata?.nickname === "string" ? user.user_metadata.nickname.trim() : "";
  const authRole = typeof user?.user_metadata?.role === "string" && ["business", "creator", "resident"].includes(user.user_metadata.role)
    ? user.user_metadata.role
    : undefined;
  const displayName = preview?.nickname || profile?.nickname || authNickname || user?.email?.split("@")[0] || user?.phone || "내 계정";
  const role = preview?.role ?? profile?.role ?? authRole;
  const isLoggedIn = Boolean(user);
  const accountPath = getAccountPath(role);
  const profileEditPath = getProfileEditPath(role);
  const effectiveUserId = preview?.targetId ?? user?.id;
  const avatarUrl = isLoggedIn ? await getHeaderAvatarUrl(role, effectiveUserId) : "";
  const [feedData, pinnedNotice] = await Promise.all([
    isLoggedIn && effectiveUserId ? getHeaderFeedData(effectiveUserId) : Promise.resolve({ items: [], unreadCount: 0 }),
    getPinnedNotice()
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      {pinnedNotice ? <PinnedNoticeBar notice={pinnedNotice} /> : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 md:gap-8">
          <MobileNav isBusiness={role === "business"} />
          <Link href="/" className="flex items-center text-charcoal">
            <Logo />
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
              <NoticeMenu items={feedData.items} unreadCount={feedData.unreadCount} onOpen={preview ? undefined : markNotificationsRead} />
              <AccountMenu displayName={displayName} role={role} isAdmin={!preview && Boolean(profile?.is_admin)} isReadOnly={Boolean(preview)} accountPath={accountPath} profileEditPath={preview ? null : profileEditPath} avatarUrl={avatarUrl} signOutAction={signOut} />
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
  if (role === "resident") return "/account/profile";
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
            <span className="inline-block text-white"><Logo /></span>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">노원 지역의 가게·크리에이터·주민을 연결하고 캠페인과 동네 쿠폰 혜택을 제공하는 지역 플랫폼입니다.</p>
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
