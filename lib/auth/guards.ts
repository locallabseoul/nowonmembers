import { redirect } from "next/navigation";
import { cache } from "react";
import type { UserRole } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getReadOnlyPreview } from "@/lib/auth/read-only-preview";

export function getAccountPath(role?: UserRole | string | null) {
  if (role === "business") return "/business/dashboard";
  if (role === "creator") return "/creator/dashboard";
  if (role === "resident") return "/my/coupons";
  return "/";
}

function withError(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}error=${encodeURIComponent(message)}`;
}

export const getCurrentSessionProfile = cache(async function getCurrentSessionProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser().catch(() => ({
    data: { user: null },
    error: new Error("Failed to read current user")
  }));
  if (authError) {
    return { supabase, user: null, profile: null };
  }

  const user = authData.user;

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,role,nickname,verification_status,status,is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
});

export async function requireUser(next = "/") {
  const session = await getCurrentSessionProfile();

  if (!session.user) {
    redirect(withError(`/auth?next=${encodeURIComponent(next)}`, "로그인이 필요합니다"));
  }

  // is_admin() 등 DB 쪽은 status까지 확인하므로, 앱 가드만 통과시키면 화면은
  // 열리는데 데이터는 전부 거부되는 어긋난 상태가 된다. 여기서 함께 막는다.
  if (session.profile?.status === "suspended") {
    redirect(withError("/auth", "정지된 계정입니다. 운영자에게 문의해주세요."));
  }

  return {
    supabase: session.supabase,
    user: session.user,
    profile: session.profile
  };
}

export async function requireRole(roles: UserRole | UserRole[], next = "/", allowReadOnlyPreview = false) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const session = await requireUser(next);
  const preview = await getReadOnlyPreview();

  if (preview && !allowReadOnlyPreview) {
    redirect(withError(getAccountPath(preview.role), "읽기 전용 미리보기에서는 변경할 수 없습니다"));
  }

  const role = (preview?.role ?? session.profile?.role) as UserRole | undefined;

  if (!role || !allowedRoles.includes(role)) {
    redirect(withError(getAccountPath(role), "해당 계정으로 접근할 수 없는 페이지입니다"));
  }

  if (!preview) return { ...session, readOnlyPreview: null };

  return {
    ...session,
    user: { ...session.user, id: preview.targetId },
    profile: { ...session.profile, id: preview.targetId, nickname: preview.nickname, role: preview.role, is_admin: false },
    readOnlyPreview: preview
  };
}

// 관리자는 별도 역할이 아니라 크리에이터/가게 계정에 붙는 플래그다. 마이페이지는
// 본래 역할의 대시보드가 뜨고, /admin은 이 가드를 통과해야 열린다.
export async function requireAdmin(next = "/admin") {
  const session = await requireUser(next);

  if (!session.profile?.is_admin) {
    redirect(withError(getAccountPath(session.profile?.role), "관리자만 접근할 수 있는 페이지입니다"));
  }

  return session;
}
