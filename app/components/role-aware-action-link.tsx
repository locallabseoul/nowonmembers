"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import type { UserRole } from "@/lib/types";

type RoleAwareActionLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  currentRole?: UserRole | string | null;
  requiredRole: "business" | "creator";
  unauthenticatedHref?: string;
};

const warningMessages = {
  business: "캠페인 만들기는 가게 계정으로만 이용할 수 있습니다.",
  creator: "크리에이터 등록은 크리에이터 계정으로만 이용할 수 있습니다."
};

export function RoleAwareActionLink({
  href,
  className,
  children,
  currentRole,
  requiredRole,
  unauthenticatedHref
}: RoleAwareActionLinkProps) {
  const targetHref = currentRole ? href : unauthenticatedHref ?? href;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!currentRole || currentRole === requiredRole) return;

    event.preventDefault();
    window.alert(warningMessages[requiredRole]);
  }

  return (
    <Link href={targetHref} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
