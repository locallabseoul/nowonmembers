"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, ChevronDown, LayoutDashboard, LogOut, Settings, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AccountMenuProps = {
  displayName: string;
  role?: string | null;
  isAdmin?: boolean;
  accountPath: string;
  profileEditPath: string | null;
  avatarUrl: string;
  signOutAction: () => void | Promise<void>;
};

function getRoleLabel(role?: string | null, isAdmin?: boolean) {
  const base = role === "business" ? "가게·브랜드" : role === "creator" ? "크리에이터" : "회원";

  return isAdmin ? `${base} · 관리자` : base;
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "N";
}

function Avatar({ displayName, avatarUrl, size }: { displayName: string; avatarUrl: string; size: "sm" | "md" }) {
  const sizeClassName = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-black text-primary ${sizeClassName}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitial(displayName)
      )}
    </span>
  );
}

export function AccountMenu({ displayName, role, isAdmin = false, accountPath, profileEditPath, avatarUrl, signOutAction }: AccountMenuProps) {
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
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-primary hover:text-charcoal"
      >
        <Avatar displayName={displayName} avatarUrl={avatarUrl} size="sm" />
        <span className="hidden max-w-28 truncate sm:inline">{displayName}</span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div role="menu" className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <Avatar displayName={displayName} avatarUrl={avatarUrl} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-charcoal">{displayName}</p>
              <p className="mt-0.5 text-xs font-bold text-slate-400">{getRoleLabel(role, isAdmin)}</p>
            </div>
          </div>
          <div className="p-2">
            <Link href={accountPath} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary">
              <LayoutDashboard size={17} />
              마이페이지
            </Link>
            {profileEditPath ? (
              <Link href={profileEditPath} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary">
                <Settings size={17} />
                프로필 수정
              </Link>
            ) : null}
            <Link href="/account/notifications" role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary">
              <BellRing size={17} />
              수신 설정
            </Link>
            {isAdmin ? (
              <Link href="/admin" role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary">
                <ShieldCheck size={17} />
                관리자 콘솔
              </Link>
            ) : null}
            <form action={signOutAction} className="mt-1 border-t border-slate-100 pt-1">
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary">
                <LogOut size={17} />
                로그아웃
              </button>
            </form>
            <Link href="/account/delete" role="menuitem" className="block rounded-xl px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-500">
              회원 탈퇴
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
