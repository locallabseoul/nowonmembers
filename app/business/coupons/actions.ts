"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { logEvent } from "@/lib/events";

const bucket = "coupon-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function fail(path: string, message: string): never {
  logEvent("coupon.action_failed", { error: message, path });
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

// 저장에 실패해도 가게가 처음부터 다시 입력하지 않도록 제출값을 그대로 돌려준다.
// 사용 코드는 비밀값이라 일부러 담지 않는다.
const echoedFields = ["title", "description", "benefit_type", "benefit_value", "total_quantity", "start_date", "end_date", "terms"] as const;

export type CouponFormState = { error: string; values: Record<string, string> } | null;

function echoValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(echoedFields.map((field) => [field, String(formData.get(field) ?? "")]));
}

function parseCoupon(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const benefitType = String(formData.get("benefit_type") ?? "");
  const benefitValue = String(formData.get("benefit_value") ?? "").trim();
  const terms = String(formData.get("terms") ?? "").trim();
  const totalQuantity = Number(formData.get("total_quantity"));
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  if (!title || !description || !benefitValue || !terms || !startDate || !endDate) throw new Error("필수 항목을 모두 입력해주세요.");
  if (!["fixed_amount", "percentage", "free_item", "other"].includes(benefitType)) throw new Error("혜택 유형을 확인해주세요.");
  if (!Number.isInteger(totalQuantity) || totalQuantity < 1 || totalQuantity > 100000) throw new Error("수량은 1장 이상 100,000장 이하로 입력해주세요.");
  if (startDate > endDate) throw new Error("종료일은 시작일과 같거나 이후여야 합니다.");
  return { title, description, benefit_type: benefitType, benefit_value: benefitValue, terms, total_quantity: totalQuantity, start_date: startDate, end_date: endDate };
}

function parseRedemptionCode(formData: FormData, isNew: boolean) {
  const code = String(formData.get("redemption_code") ?? "").trim();
  const confirmation = String(formData.get("redemption_code_confirm") ?? "").trim();
  const configured = String(formData.get("redemption_code_configured")) === "true";
  if (!code && !confirmation && !isNew && configured) return null;
  if (!/^\d{6}$/.test(code)) throw new Error("사용 코드는 숫자 6자리로 입력해주세요.");
  if (code !== confirmation) throw new Error("사용 코드와 확인 값이 일치하지 않습니다.");
  return code;
}

async function uploadImage(supabase: Awaited<ReturnType<typeof requireRole>>["supabase"], userId: string, formData: FormData) {
  const image = formData.get("cover_image");
  if (!(image instanceof File) || image.size === 0) return String(formData.get("existing_cover_image_url") ?? "") || null;
  if (!allowedTypes.has(image.type)) throw new Error("대표 이미지는 JPG, PNG, WEBP만 업로드할 수 있습니다.");
  if (image.size > 10 * 1024 * 1024) throw new Error("대표 이미지는 10MB 이하여야 합니다.");
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/coupons/${Date.now()}-${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, image, { contentType: image.type, cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function saveCoupon(_previous: CouponFormState, formData: FormData): Promise<CouponFormState> {
  const couponId = String(formData.get("coupon_id") ?? "");
  const returnPath = couponId ? `/business/coupons/${couponId}/edit` : "/business/coupons/new";
  const { supabase, user } = await requireRole("business", returnPath);
  const submitted = echoValues(formData);
  const reject = (message: string): CouponFormState => {
    logEvent("coupon.save_failed", { error: message, couponId });
    return { error: message, values: submitted };
  };

  let values: ReturnType<typeof parseCoupon>;
  let redemptionCode: string | null;
  let coverImageUrl: string | null;
  try {
    values = parseCoupon(formData);
    redemptionCode = parseRedemptionCode(formData, !couponId);
    coverImageUrl = await uploadImage(supabase, user.id, formData);
  } catch (error) {
    return reject(error instanceof Error ? error.message : "쿠폰을 저장할 수 없습니다.");
  }
  const { data: business } = await supabase.from("business_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!business) fail("/business/dashboard", "가게 프로필을 먼저 등록해주세요.");

  let savedId = couponId;
  if (couponId) {
    const { error } = await supabase.from("coupons").update({ ...values, cover_image_url: coverImageUrl, admin_memo: null }).eq("id", couponId);
    if (error) return reject(error.message);
  } else {
    const { data, error } = await supabase.from("coupons").insert({ ...values, business_id: business.id, cover_image_url: coverImageUrl, status: "draft" }).select("id").single();
    if (error || !data) return reject(error?.message ?? "쿠폰을 저장할 수 없습니다.");
    savedId = data.id;
  }

  if (redemptionCode) {
    const { error } = await supabase.rpc("set_coupon_redemption_code", {
      target_coupon_id: savedId,
      target_code: redemptionCode
    });
    // 쿠폰 자체는 저장됐으므로 수정 화면으로 보내 코드만 다시 받는다.
    if (error) fail(`/business/coupons/${savedId}/edit`, error.message);
  }

  if (String(formData.get("intent")) === "review") {
    const { data: codeState } = await supabase.from("coupons").select("redemption_code_configured").eq("id", savedId).maybeSingle();
    if (!codeState?.redemption_code_configured) fail(`/business/coupons/${savedId}/edit`, "검수 요청 전에 사용 코드를 설정해주세요.");
    const { error } = await supabase.from("coupons").update({ status: "in_review", admin_memo: null }).eq("id", savedId);
    if (error) fail(`/business/coupons/${savedId}/edit`, error.message);
  }
  revalidatePath("/business/coupons");
  redirect(`/business/coupons?message=${encodeURIComponent(String(formData.get("intent")) === "review" ? "관리자 검수를 요청했습니다." : "쿠폰 초안을 저장했습니다.")}`);
}

export async function submitCouponForReview(formData: FormData) {
  const id = String(formData.get("coupon_id") ?? "");
  const { supabase } = await requireRole("business", "/business/coupons");
  const { data: coupon } = await supabase.from("coupons").select("redemption_code_configured").eq("id", id).maybeSingle();
  if (!coupon?.redemption_code_configured) fail("/business/coupons", "검수 요청 전에 사용 코드를 설정해주세요.");
  const { error } = await supabase.from("coupons").update({ status: "in_review", admin_memo: null }).eq("id", id);
  if (error) fail("/business/coupons", error.message);
  revalidatePath("/business/coupons");
  redirect("/business/coupons?message=" + encodeURIComponent("관리자 검수를 요청했습니다."));
}

export async function setCouponRedemptionCode(formData: FormData) {
  const couponId = String(formData.get("coupon_id") ?? "");
  const code = String(formData.get("redemption_code") ?? "").trim();
  const confirmation = String(formData.get("redemption_code_confirm") ?? "").trim();
  const { supabase } = await requireRole("business", "/business/coupons");
  if (!/^\d{6}$/.test(code)) fail("/business/coupons", "사용 코드는 숫자 6자리로 입력해주세요.");
  if (code !== confirmation) fail("/business/coupons", "사용 코드와 확인 값이 일치하지 않습니다.");
  const { error } = await supabase.rpc("set_coupon_redemption_code", { target_coupon_id: couponId, target_code: code });
  if (error) fail("/business/coupons", error.message);
  revalidatePath("/business/coupons");
  revalidatePath("/my/coupons");
  revalidatePath("/coupons");
  revalidatePath(`/coupons/${couponId}`);
  redirect("/business/coupons?message=" + encodeURIComponent("쿠폰 사용 코드를 설정했습니다. 기존 코드는 즉시 무효화되었습니다."));
}
