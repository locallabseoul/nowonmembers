"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAccountPath, requireAdmin } from "@/lib/auth/guards";
import { READ_ONLY_PREVIEW_COOKIE } from "@/lib/auth/read-only-preview";
import { BUSINESS_PROFILE_DELEGATION_COOKIE } from "@/lib/auth/business-profile-delegation";

export async function startReadOnlyPreview(formData: FormData) {
  const { supabase, user } = await requireAdmin("/admin/members");
  const targetId = String(formData.get("user_id") ?? "");
  const { data: target } = await supabase
    .from("profiles")
    .select("id,role,status")
    .eq("id", targetId)
    .maybeSingle();

  if (!target || target.id === user.id || target.status !== "active" || !["business", "creator", "resident"].includes(target.role)) {
    redirect("/admin/members?error=" + encodeURIComponent("미리보기할 수 없는 회원입니다."));
  }

  (await cookies()).set(READ_ONLY_PREVIEW_COOKIE, target.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30
  });
  redirect(getAccountPath(target.role));
}

export async function startBusinessProfileDelegation(formData: FormData) {
  const { supabase, user } = await requireAdmin("/admin/members");
  const targetId = String(formData.get("user_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) redirect("/admin/members?error=" + encodeURIComponent("대행 사유를 입력해주세요."));

  const [{ data: target }, { data: business }] = await Promise.all([
    supabase.from("profiles").select("id,role,status").eq("id", targetId).maybeSingle(),
    supabase.from("business_profiles").select("id").eq("user_id", targetId).maybeSingle()
  ]);

  if (!target || target.id === user.id || target.role !== "business" || target.status !== "active" || business) {
    redirect("/admin/members?error=" + encodeURIComponent("최초 프로필 작성 대행을 시작할 수 없는 회원입니다."));
  }

  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30
  };
  cookieStore.set(READ_ONLY_PREVIEW_COOKIE, target.id, options);
  cookieStore.set(BUSINESS_PROFILE_DELEGATION_COOKIE, encodeURIComponent(JSON.stringify({ targetId: target.id, reason })), options);
  redirect("/business/dashboard");
}

export async function stopReadOnlyPreview() {
  const cookieStore = await cookies();
  cookieStore.delete(READ_ONLY_PREVIEW_COOKIE);
  cookieStore.delete(BUSINESS_PROFILE_DELEGATION_COOKIE);
  redirect("/admin/members");
}
