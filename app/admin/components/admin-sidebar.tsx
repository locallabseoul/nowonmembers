"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BellRing, ClipboardCheck, CreditCard, FileCheck, LayoutDashboard, Megaphone, ScrollText, Send, ShieldCheck, Ticket, Users } from "lucide-react";
import type { AdminMenuUnreadState, AdminUnreadMenuKey } from "@/lib/admin-menu-unread";
import { markAdminMenuRead } from "./actions";

// operator-sidebar와 같은 모양새. 다만 관리자 페이지는 레이아웃이 사이드바를 한 번만
// 렌더링하므로, 페이지마다 active를 넘기는 대신 경로로 판단한다.
const menuItems: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  unreadKey?: AdminUnreadMenuKey;
}> = [
  { href: "/admin", label: "개요", icon: LayoutDashboard, exact: true },
  { href: "/admin/campaigns", label: "캠페인 심사", icon: ClipboardCheck, exact: false, unreadKey: "campaigns" },
  { href: "/admin/coupons", label: "쿠폰 심사", icon: Ticket, exact: false, unreadKey: "coupons" },
  { href: "/admin/submissions", label: "콘텐츠 검수", icon: FileCheck, exact: false, unreadKey: "submissions" },
  { href: "/admin/members", label: "회원 관리", icon: Users, exact: false },
  { href: "/admin/points", label: "포인트·정산", icon: CreditCard, exact: false },
  { href: "/admin/notices", label: "공지 관리", icon: Megaphone, exact: false },
  { href: "/admin/messages", label: "문자 발송", icon: Send, exact: false },
  { href: "/admin/notifications", label: "자동 알림", icon: BellRing, exact: false, unreadKey: "notifications" },
  { href: "/admin/events", label: "이벤트 로그", icon: ScrollText, exact: false }
];

function navClassName(isActive: boolean) {
  return `flex items-center gap-3 border-l-4 px-6 py-4 transition-colors ${
    isActive
      ? "border-primary bg-primary/5 font-bold text-primary"
      : "border-transparent font-medium text-gray-600 hover:bg-gray-50 hover:text-charcoal"
  }`;
}

export function AdminSidebar({ unreadState }: { unreadState: AdminMenuUnreadState }) {
  const pathname = usePathname();
  const activeUnreadKey = useMemo(() => menuItems.find((item) => item.unreadKey && pathname.startsWith(item.href))?.unreadKey as AdminUnreadMenuKey | undefined, [pathname]);
  const [counts, setCounts] = useState(unreadState.counts);

  useEffect(() => {
    setCounts(unreadState.counts);
  }, [unreadState]);

  useEffect(() => {
    if (!activeUnreadKey || unreadState.counts[activeUnreadKey] <= 0) return;
    setCounts((current) => ({ ...current, [activeUnreadKey]: 0 }));
    void markAdminMenuRead(activeUnreadKey, unreadState.observedAt);
  }, [activeUnreadKey, unreadState.counts, unreadState.observedAt]);

  return (
    <aside className="w-full shrink-0 space-y-6 lg:w-64">
      <section className="flex items-center gap-3 rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-charcoal text-white">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h2 className="font-black text-charcoal">관리자 콘솔</h2>
          <p className="mt-0.5 text-xs text-gray-500">노원멤버스 운영</p>
        </div>
      </section>

      <nav className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]" aria-label="관리자 메뉴">
        <ul className="flex flex-col">
          {menuItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            const unreadCount = item.unreadKey ? counts[item.unreadKey] : 0;
            return (
              <li key={item.href}>
                <Link href={item.href} className={navClassName(isActive)}>
                  <Icon size={20} />
                  <span className="flex-1">{item.label}</span>
                  {unreadCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black leading-4 text-white" aria-label={`읽지 않은 새 항목 ${unreadCount}개`}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
