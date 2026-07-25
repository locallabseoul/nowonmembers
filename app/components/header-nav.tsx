"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/campaigns", label: "캠페인", match: (pathname: string) => pathname.startsWith("/campaigns") },
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
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50 hover:text-charcoal ${active ? "bg-slate-50 text-charcoal" : "text-slate-500"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
