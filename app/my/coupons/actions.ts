"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";

export async function cancelCouponClaim(formData: FormData) {
  const claimId = String(formData.get("claim_id") ?? "");
  const { supabase } = await requireUser("/my/coupons");
  const { error } = await supabase.rpc("cancel_coupon_claim", { target_claim_id: claimId });
  if (error) redirect(`/my/coupons?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/my/coupons");
  revalidatePath("/coupons");
  redirect("/my/coupons?message=" + encodeURIComponent("쿠폰 발급을 취소했습니다."));
}
