import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentSessionProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
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
}

export async function requireUser(next = "/") {
  const session = await getCurrentSessionProfile();

  if (!session.user) {
    redirect(`/auth?next=${encodeURIComponent(next)}&error=${encodeURIComponent("로그인이 필요합니다")}`);
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

  if (!session.profile || !allowedRoles.includes(session.profile.role as UserRole)) {
    redirect(`${next}?error=${encodeURIComponent("접근 권한이 필요합니다")}`);
  }

  return session;
}
