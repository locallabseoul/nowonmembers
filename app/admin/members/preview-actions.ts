"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { READ_ONLY_PREVIEW_COOKIE } from "@/lib/auth/read-only-preview";

export async function startReadOnlyPreview(formData: FormData) {
  const { supabase, user } = await requireAdmin("/admin/members");
  const targetId = String(formData.get("user_id") ?? "");
  const { data: target } = await supabase
    .from("profiles")
    .select("id,role,status")
    .eq("id", targetId)
    .maybeSingle();

  if (!target || target.id === user.id || target.status !== "active" || (target.role !== "business" && target.role !== "creator")) {
    redirect("/admin/members?error=" + encodeURIComponent("미리보기할 수 없는 회원입니다."));
  }

  (await cookies()).set(READ_ONLY_PREVIEW_COOKIE, target.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30
  });
  redirect(target.role === "business" ? "/business/dashboard" : "/creator/dashboard");
}

export async function stopReadOnlyPreview() {
  (await cookies()).delete(READ_ONLY_PREVIEW_COOKIE);
  redirect("/admin/members");
}
