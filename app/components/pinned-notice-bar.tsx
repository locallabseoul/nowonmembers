"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Notice } from "@/lib/types";

const DISMISSED_NOTICE_KEY = "nowonmembers-dismissed-pinned-notice";

export function PinnedNoticeBar({ notice }: { notice: Notice }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(window.localStorage.getItem(DISMISSED_NOTICE_KEY) !== notice.id);
  }, [notice.id]);

  function dismiss() {
    window.localStorage.setItem(DISMISSED_NOTICE_KEY, notice.id);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative bg-primary text-white">
      <div className="mx-auto flex min-h-10 max-w-7xl items-center justify-center px-12 py-2 sm:px-16">
        <Link href={`/notices/${notice.id}`} className="flex min-w-0 items-center gap-2 text-center text-xs font-bold sm:text-sm">
          <span className="shrink-0 rounded bg-white/20 px-2 py-0.5 text-[10px] font-black sm:text-xs">공지</span>
          <span className="line-clamp-1">{notice.title}</span>
          <span className="hidden shrink-0 text-xs font-black underline underline-offset-2 sm:inline">자세히 보기</span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white sm:right-5"
          aria-label="상단 공지 닫기"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
