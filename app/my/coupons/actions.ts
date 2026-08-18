"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { logEvent } from "@/lib/events";

export async function cancelCouponClaim(formData: FormData) {
  const claimId = String(formData.get("claim_id") ?? "");
  const { supabase } = await requireUser("/my/coupons");
  const { error } = await supabase.rpc("cancel_coupon_claim", { target_claim_id: claimId });
  if (error) {
    logEvent("coupon.claim_cancel_failed", { error: error.message, claimId });
    redirect(`/my/coupons?error=${encodeURIComponent(error.message)}`);
  }
  logEvent("coupon.claim_cancelled", { claimId });
  revalidatePath("/my/coupons");
  revalidatePath("/coupons");
  redirect("/my/coupons?message=" + encodeURIComponent("쿠폰 발급을 취소했습니다."));
}

export async function redeemMyCouponClaim(formData: FormData) {
  const claimId = String(formData.get("claim_id") ?? "");
  const code = String(formData.get("redemption_code") ?? "").trim();
  const { supabase } = await requireUser("/my/coupons");
  if (!/^\d{6}$/.test(code)) {
    redirect(`/my/coupons?claim=${encodeURIComponent(claimId)}&error=${encodeURIComponent("사용 코드는 숫자 6자리입니다.")}`);
  }

  const { data, error } = await supabase.rpc("redeem_my_coupon_claim", {
    target_claim_id: claimId,
    target_code: code
  });
  if (error) {
    logEvent("coupon.redeem_failed", { error: error.message, claimId });
    redirect(`/my/coupons?claim=${encodeURIComponent(claimId)}&error=${encodeURIComponent(error.message)}`);
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.redeemed) {
    const message = result?.error_code === "locked"
      ? "사용 코드 입력이 5회 실패해 10분간 잠겼습니다. 잠시 후 다시 시도해주세요."
      : result?.error_code === "not_configured"
        ? "가게에서 사용 코드를 준비 중입니다."
        : "사용 코드가 올바르지 않습니다.";
    logEvent("coupon.redeem_failed", { error: message, errorCode: result?.error_code ?? "invalid_code", claimId });
    revalidatePath("/my/coupons");
    redirect(`/my/coupons?claim=${encodeURIComponent(claimId)}&error=${encodeURIComponent(message)}`);
  }

  logEvent("coupon.redeemed", { claimId });
  revalidatePath("/my/coupons");
  revalidatePath("/business/coupons");
  redirect("/my/coupons?message=" + encodeURIComponent("쿠폰 사용이 완료되었습니다."));
}
