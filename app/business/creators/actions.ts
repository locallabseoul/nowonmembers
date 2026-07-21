"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";

function getSafeReturnPath(value: FormDataEntryValue | null) {
  const fallback = "/business/creators";
  const rawPath = String(value ?? "").trim();

  if (!rawPath.startsWith("/business/creators") || rawPath.startsWith("//")) return fallback;

  try {
    const url = new URL(rawPath, "https://nowonmembers.local");
    url.searchParams.delete("error");
    url.searchParams.delete("saved");
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

function withMessage(path: string, key: "error" | "saved", message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(message)}`;
}

function redirectWithError(formData: FormData, message: string): never {
  redirect(withMessage(getSafeReturnPath(formData.get("return_path")), "error", message));
}

function parseOptionalRating(formData: FormData, name: string, label: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) return null;

  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirectWithError(formData, `${label}은(는) 1점부터 5점까지 선택할 수 있습니다.`);
  }

  return rating;
}

function splitTags(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value ?? null;
}

export async function saveCreatorReview(formData: FormData) {
  const { supabase, user } = await requireRole("business", "/business/creators");
  const collaborationId = String(formData.get("collaboration_id") ?? "").trim();

  if (!collaborationId) redirectWithError(formData, "협업 정보를 찾을 수 없습니다.");

  const [contentQuality, guidelineCompliance, communication, punctuality] = [
    parseOptionalRating(formData, "content_quality", "콘텐츠 퀄리티"),
    parseOptionalRating(formData, "guideline_compliance", "가이드 준수"),
    parseOptionalRating(formData, "communication", "소통 신속성"),
    parseOptionalRating(formData, "punctuality", "일정 준수")
  ];
  const tags = splitTags(formData.get("tags"));
  const privateComment = String(formData.get("private_comment") ?? "").trim() || null;
  const reworkIntent = formData.get("rework_intent") === "on" || formData.get("rework_intent") === "true";

  const { data: business, error: businessError } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (businessError) redirectWithError(formData, businessError.message);
  if (!business) redirect("/business/dashboard?next=%2Fbusiness%2Fcreators");

  const { data: collaboration, error: collaborationError } = await supabase
    .from("collaborations")
    .select("id,creator_profiles!inner(user_id),campaigns!inner(business_id)")
    .eq("id", collaborationId)
    .eq("campaigns.business_id", business.id)
    .maybeSingle();

  if (collaborationError) redirectWithError(formData, collaborationError.message);
  if (!collaboration) redirectWithError(formData, "해당 가게의 협업만 평가할 수 있습니다.");

  const creatorProfile = firstRelation(collaboration.creator_profiles);
  if (!creatorProfile?.user_id) redirectWithError(formData, "크리에이터 계정 정보를 찾을 수 없습니다.");

  const { error: reviewError } = await supabase.from("reviews").upsert({
    collaboration_id: collaborationId,
    reviewer_id: user.id,
    reviewee_id: creatorProfile.user_id,
    content_quality: contentQuality,
    guideline_compliance: guidelineCompliance,
    communication,
    punctuality,
    rework_intent: reworkIntent,
    private_comment: privateComment,
    tags,
    updated_at: new Date().toISOString()
  }, { onConflict: "collaboration_id,reviewer_id" });

  if (reviewError) redirectWithError(formData, reviewError.message);

  revalidatePath("/business/creators");
  redirect(withMessage(getSafeReturnPath(formData.get("return_path")), "saved", "평가가 저장되었습니다."));
}
