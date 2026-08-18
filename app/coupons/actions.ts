"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { logEvent } from "@/lib/events";
import { TERMS_VERSION } from "@/lib/legal";

export async function claimCoupon(formData: FormData) {
  const couponId = String(formData.get("coupon_id") ?? "");
  if (!couponId) redirect("/coupons?error=" + encodeURIComponent("쿠폰 정보를 찾을 수 없습니다."));
  const { supabase } = await requireUser(`/coupons/${couponId}`);
  if (formData.get("accept_terms") === "on") {
    const { error: acceptanceError } = await supabase.rpc("accept_legal_document", {
      target_document_type: "terms",
      target_version: TERMS_VERSION,
      acceptance_source: "coupon_claim"
    });
    if (acceptanceError) redirect(`/coupons/${couponId}?error=${encodeURIComponent("이용약관 동의를 저장하지 못했습니다.")}`);
  }
  const { error } = await supabase.rpc("claim_coupon", { target_coupon_id: couponId });
  if (error) {
    logEvent("coupon.claim_failed", { error: error.message, couponId });
    redirect(`/coupons/${couponId}?error=${encodeURIComponent(error.message)}`);
  }
  logEvent("coupon.claimed", { couponId });
  revalidatePath("/coupons");
  revalidatePath(`/coupons/${couponId}`);
  redirect("/my/coupons?message=" + encodeURIComponent("쿠폰을 받았습니다. 매장에서 직원이 사용 코드를 입력해드립니다."));
}
