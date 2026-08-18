"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccountPath, requireRole } from "@/lib/auth/guards";

export async function upgradeResidentRole(formData: FormData) {
  const targetRole = String(formData.get("target_role") ?? "");
  if (targetRole !== "creator" && targetRole !== "business") {
    redirect(`/account/upgrade?error=${encodeURIComponent("전환할 회원 유형을 선택해주세요.")}`);
  }

  const businessName = String(formData.get("business_name") ?? "").trim();
  const businessCategory = String(formData.get("business_category") ?? "").trim();
  const { supabase } = await requireRole("resident", "/account/upgrade");
  const { error } = await supabase.rpc("upgrade_resident_role", {
    target_role: targetRole,
    target_business_name: targetRole === "business" ? businessName : null,
    target_business_category: targetRole === "business" ? businessCategory : null
  });

  if (error) {
    redirect(`/account/upgrade?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect(`${getAccountPath(targetRole)}?message=${encodeURIComponent("회원 유형 전환이 완료되었습니다. 프로필을 완성해주세요.")}`);
}
