"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";

const bucket = "coupon-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

function parseCoupon(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const benefitType = String(formData.get("benefit_type") ?? "");
  const benefitValue = String(formData.get("benefit_value") ?? "").trim();
  const terms = String(formData.get("terms") ?? "").trim();
  const totalQuantity = Number(formData.get("total_quantity"));
  const claimStart = String(formData.get("claim_start") ?? "");
  const claimEnd = String(formData.get("claim_end") ?? "");
  const useStart = String(formData.get("use_start") ?? "");
  const useEnd = String(formData.get("use_end") ?? "");
  if (!title || !description || !benefitValue || !terms || !claimStart || !claimEnd || !useStart || !useEnd) throw new Error("필수 항목을 모두 입력해주세요.");
  if (!["fixed_amount", "percentage", "free_item", "other"].includes(benefitType)) throw new Error("혜택 유형을 확인해주세요.");
  if (!Number.isInteger(totalQuantity) || totalQuantity < 1 || totalQuantity > 100000) throw new Error("수량은 1장 이상 100,000장 이하로 입력해주세요.");
  if (claimStart > claimEnd) throw new Error("발급 종료일은 시작일 이후여야 합니다.");
  if (useStart > useEnd) throw new Error("사용 종료일은 시작일 이후여야 합니다.");
  if (claimEnd > useEnd) throw new Error("사용 종료일은 발급 종료일과 같거나 이후여야 합니다.");
  return { title, description, benefit_type: benefitType, benefit_value: benefitValue, terms, total_quantity: totalQuantity, claim_start: claimStart, claim_end: claimEnd, use_start: useStart, use_end: useEnd };
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

export async function saveCoupon(formData: FormData) {
  const couponId = String(formData.get("coupon_id") ?? "");
  const returnPath = couponId ? `/business/coupons/${couponId}/edit` : "/business/coupons/new";
  const { supabase, user } = await requireRole("business", returnPath);
  let values: ReturnType<typeof parseCoupon>;
  let coverImageUrl: string | null;
  try {
    values = parseCoupon(formData);
    coverImageUrl = await uploadImage(supabase, user.id, formData);
  } catch (error) {
    fail(returnPath, error instanceof Error ? error.message : "쿠폰을 저장할 수 없습니다.");
  }
  const { data: business } = await supabase.from("business_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (!business) fail("/business/dashboard", "가게 프로필을 먼저 등록해주세요.");

  let savedId = couponId;
  if (couponId) {
    const { error } = await supabase.from("coupons").update({ ...values, cover_image_url: coverImageUrl, admin_memo: null }).eq("id", couponId);
    if (error) fail(returnPath, error.message);
  } else {
    const { data, error } = await supabase.from("coupons").insert({ ...values, business_id: business.id, cover_image_url: coverImageUrl, status: "draft" }).select("id").single();
    if (error || !data) fail(returnPath, error?.message ?? "쿠폰을 저장할 수 없습니다.");
    savedId = data.id;
  }

  if (String(formData.get("intent")) === "review") {
    const { error } = await supabase.from("coupons").update({ status: "in_review", admin_memo: null }).eq("id", savedId);
    if (error) fail(`/business/coupons/${savedId}/edit`, error.message);
  }
  revalidatePath("/business/coupons");
  redirect(`/business/coupons?message=${encodeURIComponent(String(formData.get("intent")) === "review" ? "관리자 검수를 요청했습니다." : "쿠폰 초안을 저장했습니다.")}`);
}

export async function submitCouponForReview(formData: FormData) {
  const id = String(formData.get("coupon_id") ?? "");
  const { supabase } = await requireRole("business", "/business/coupons");
  const { error } = await supabase.from("coupons").update({ status: "in_review", admin_memo: null }).eq("id", id);
  if (error) fail("/business/coupons", error.message);
  revalidatePath("/business/coupons");
  redirect("/business/coupons?message=" + encodeURIComponent("관리자 검수를 요청했습니다."));
}

export async function redeemCoupon(formData: FormData) {
  const claimId = String(formData.get("claim_id") ?? "");
  const { supabase } = await requireRole("business", "/business/coupons");
  const { error } = await supabase.rpc("redeem_coupon_claim", { target_claim_id: claimId });
  if (error) fail("/business/coupons", error.message);
  revalidatePath("/business/coupons");
  revalidatePath("/my/coupons");
  redirect("/business/coupons?message=" + encodeURIComponent("쿠폰 사용 처리를 완료했습니다."));
}
