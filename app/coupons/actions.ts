"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";

export async function claimCoupon(formData: FormData) {
  const couponId = String(formData.get("coupon_id") ?? "");
  if (!couponId) redirect("/coupons?error=" + encodeURIComponent("쿠폰 정보를 찾을 수 없습니다."));
  const { supabase } = await requireUser(`/coupons/${couponId}`);
  const { error } = await supabase.rpc("claim_coupon", { target_coupon_id: couponId });
  if (error) redirect(`/coupons/${couponId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/coupons");
  revalidatePath(`/coupons/${couponId}`);
  redirect("/my/coupons?message=" + encodeURIComponent("쿠폰을 받았습니다. 매장에서 직원이 사용 코드를 입력해드립니다."));
}
