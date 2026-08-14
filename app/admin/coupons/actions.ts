"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";

async function updateStatus(formData: FormData, status: "approved" | "revision_requested" | "cancelled") {
  const id = String(formData.get("coupon_id") ?? "");
  const memo = String(formData.get("admin_memo") ?? "").trim();
  const { supabase } = await requireAdmin("/admin/coupons");
  const { data: coupon } = await supabase.from("coupons").select("status").eq("id", id).maybeSingle();
  if (!coupon || (coupon.status !== "in_review" && coupon.status !== "revision_requested")) {
    redirect("/admin/coupons?error=" + encodeURIComponent("현재 상태에서는 심사 결과를 변경할 수 없습니다."));
  }
  if (status === "approved") {
    const { data: codeState } = await supabase.from("coupons").select("redemption_code_configured").eq("id", id).maybeSingle();
    if (!codeState?.redemption_code_configured) redirect("/admin/coupons?error=" + encodeURIComponent("사용 코드가 설정된 쿠폰만 승인할 수 있습니다."));
  }
  if (status === "revision_requested" && !memo) redirect("/admin/coupons?error=" + encodeURIComponent("수정 요청 사유를 입력해주세요."));
  const { error } = await supabase.from("coupons").update({ status, admin_memo: memo || null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect("/admin/coupons?error=" + encodeURIComponent(error.message));
  revalidatePath("/admin/coupons");
  revalidatePath("/coupons");
  const label = status === "approved" ? "쿠폰을 승인했습니다." : status === "revision_requested" ? "수정을 요청했습니다." : "쿠폰을 취소했습니다.";
  redirect("/admin/coupons?message=" + encodeURIComponent(label));
}

export async function approveCoupon(formData: FormData) { return updateStatus(formData, "approved"); }
export async function requestCouponRevision(formData: FormData) { return updateStatus(formData, "revision_requested"); }
export async function cancelCoupon(formData: FormData) { return updateStatus(formData, "cancelled"); }
