import { redirect } from "next/navigation";
import { cache } from "react";
import type { UserRole } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function getAccountPath(role?: UserRole | string | null) {
  if (role === "business") return "/business/dashboard";
  if (role === "admin") return "/admin";
  if (role === "creator") return "/creator/dashboard";
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
    .select("id,email,role,nickname,verification_status,status")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
});

export async function requireUser(next = "/") {
  const session = await getCurrentSessionProfile();

  if (!session.user) {
    redirect(withError(`/auth?next=${encodeURIComponent(next)}`, "로그인이 필요합니다"));
  }

  return {
    supabase: session.supabase,
    user: session.user,
    profile: session.profile
  };
}

export async function requireRole(roles: UserRole | UserRole[], next = "/") {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const session = await requireUser(next);
  const role = session.profile?.role as UserRole | undefined;

  if (!role || !allowedRoles.includes(role)) {
    redirect(withError(getAccountPath(role), "해당 계정으로 접근할 수 없는 페이지입니다"));
  }

  return session;
}
