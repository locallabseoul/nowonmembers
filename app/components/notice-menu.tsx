"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { HeaderFeedItem } from "@/lib/types";

function formatRelative(value: string) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";

  const diffMinutes = Math.floor((Date.now() - time) / 60_000);
  if (diffMinutes < 1) return "방금";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }).format(new Date(value));
}

export function NoticeMenu({
  items,
  unreadCount,
  onOpen
}: {
  items: HeaderFeedItem[];
  unreadCount: number;
  onOpen?: () => void | Promise<void>;
}) {
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

  function toggle() {
    const next = !open;
    setOpen(next);
    // 목록을 펼치는 순간 개인 알림을 읽음 처리한다. 공지는 상세를 열어야 읽음이 된다.
    if (next && unreadCount > 0) void onOpen?.();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-primary hover:text-primary"
        aria-label="알림"
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
            {items.length ? items.map((item) => (
              <Link
                key={`${item.kind}-${item.id}`}
                href={item.link}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-start gap-2">
                  {!item.isRead ? (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  ) : (
                    <span className="mt-2 h-2 w-2 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <FeedKindBadge kind={item.kind} />
                      <span className="ml-auto shrink-0 text-[11px] font-bold text-slate-400">
                        {formatRelative(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-sm font-black text-charcoal">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.body}</p>
                  </div>
                </div>
              </Link>
            )) : (
              <p className="px-3 py-6 text-center text-sm font-bold text-slate-400">받은 공지와 알림이 없습니다.</p>
            )}
          </div>
          <div className="flex border-t border-slate-100">
            <Link
              href="/notifications"
              role="menuitem"
              className="flex-1 border-r border-slate-100 px-4 py-3 text-center text-sm font-black text-primary transition-colors hover:bg-primary/5"
            >
              알림 전체보기
            </Link>
            <Link
              href="/notices"
              role="menuitem"
              className="flex-1 px-4 py-3 text-center text-sm font-black text-slate-500 transition-colors hover:bg-slate-50"
            >
              공지 전체보기
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FeedKindBadge({ kind }: { kind: HeaderFeedItem["kind"] }) {
  const isNotice = kind === "notice";

  return (
    <span
      className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black ${
        isNotice ? "bg-slate-100 text-slate-600" : "bg-primaryLight text-primaryHover"
      }`}
    >
      {isNotice ? "공지" : "알림"}
    </span>
  );
}
