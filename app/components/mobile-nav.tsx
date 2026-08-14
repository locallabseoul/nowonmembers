"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { navItems } from "./header-nav";
import { NewBadge } from "./ui";

export function MobileNav({ isBusiness }: { isBusiness: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="메뉴"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100"
      >
        {open ? <X size={19} /> : <Menu size={19} />}
      </button>

      {open ? (
        <div role="menu" className="absolute left-0 mt-3 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <div className="p-2">
            {navItems.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-bold transition-colors hover:bg-slate-50 hover:text-primary ${active ? "bg-slate-50 text-charcoal" : "text-slate-600"}`}
                >
                  <span className="relative">
                    {item.label}
                    {item.isNew ? <NewBadge /> : null}
                  </span>
                </Link>
              );
            })}
            {isBusiness ? (
              <div className="mt-1 border-t border-slate-100 pt-1">
                <Link
                  href="/business/campaigns/new"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
                >
                  <Plus size={15} />
                  캠페인 만들기
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
