"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NewBadge } from "./ui";

export const navItems = [
  { href: "/campaigns", label: "캠페인", match: (pathname: string) => pathname.startsWith("/campaigns") },
  { href: "/coupons", label: "쿠폰북", isNew: true, match: (pathname: string) => pathname.startsWith("/coupons") },
  { href: "/stories", label: "노원스토리", match: (pathname: string) => pathname.startsWith("/stories") }
];

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {navItems.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            // 뱃지가 라벨 밖으로 떠 있어 다음 메뉴와 겹치지 않도록 자리를 비워둔다.
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50 hover:text-charcoal ${item.isNew ? "mr-5" : ""} ${active ? "bg-slate-50 text-charcoal" : "text-slate-500"}`}
          >
            <span className="relative">
              {item.label}
              {item.isNew ? <NewBadge /> : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
