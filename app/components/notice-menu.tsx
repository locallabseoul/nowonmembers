"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Notice } from "@/lib/types";

export function NoticeMenu({ notices, unreadCount }: { notices: Notice[]; unreadCount: number }) {
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
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-primary hover:text-primary"
        aria-label="공지사항"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div role="menu" className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <div className="max-h-80 overflow-y-auto p-2">
            {notices.length ? notices.map((notice) => (
              <Link
                key={notice.id}
                href={`/notices/${notice.id}`}
                role="menuitem"
                className="block rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-start gap-2">
                  {!notice.isRead ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" /> : <span className="mt-2 h-2 w-2 shrink-0" />}
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-black text-charcoal">{notice.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{notice.body}</p>
                  </div>
                </div>
              </Link>
            )) : (
              <p className="px-3 py-6 text-center text-sm font-bold text-slate-400">등록된 공지가 없습니다.</p>
            )}
          </div>
          <Link href="/notices" role="menuitem" className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-black text-primary transition-colors hover:bg-primary/5">
            공지 전체보기
          </Link>
        </div>
      ) : null}
    </div>
  );
}
