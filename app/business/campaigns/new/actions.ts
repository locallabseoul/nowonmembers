"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getKoreaTodayString } from "@/lib/campaign-lifecycle";

const CAMPAIGN_IMAGE_BUCKET = "campaign-images";
const MAX_CAMPAIGN_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CAMPAIGN_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function splitLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getContentRequirements(formData: FormData) {
  const requirements = [
    ...formData.getAll("mission_options").map((value) => String(value).trim()).filter(Boolean),
    ...splitLines(formData.get("content_requirements"))
  ];

  return Array.from(new Set(requirements));
}

function toNullableNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/[^0-9]/g, "");
  return raw ? Number(raw) : null;
}

function toCoordinate(value: FormDataEntryValue | null) {
  const coordinate = Number(String(value ?? "").trim());
  return Number.isFinite(coordinate) ? coordinate : null;
}

function redirectWithError(message: string): never {
  redirect(`/business/campaigns/new?error=${encodeURIComponent(message)}`);
}

function getImageFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return value instanceof File && value.size > 0 ? value : null;
}

function getImageFiles(formData: FormData, fieldName: string) {
  return formData
    .getAll(fieldName)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function validateImageFile(file: File, label: string) {
  if (!ALLOWED_CAMPAIGN_IMAGE_TYPES.has(file.type)) {
    return `${label}는 JPG, PNG, WEBP 형식만 업로드할 수 있습니다.`;
  }

  if (file.size > MAX_CAMPAIGN_IMAGE_BYTES) {
    return `${label}는 10MB 이하 파일만 업로드할 수 있습니다.`;
  }

  return null;
}

function imageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function uploadCampaignImage({
  supabase,
  userId,
  file
}: {
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"];
  userId: string;
  file: File;
}) {
  const path = `${userId}/campaigns/${Date.now()}-${randomUUID()}.${imageExtension(file)}`;
  const { error } = await supabase.storage.from(CAMPAIGN_IMAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(CAMPAIGN_IMAGE_BUCKET).getPublicUrl(path);

  return { path, publicUrl: data.publicUrl };
}

export async function createCampaign(formData: FormData) {
  const { supabase, user } = await requireRole("business", "/business/campaigns/new");
  const title = String(formData.get("title") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const regionDetail = String(formData.get("region_detail") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const benefitValue = String(formData.get("benefit_value") ?? "").trim();
  const recruitCount = Number(formData.get("recruit_count") ?? 0);
  const recruitEnd = String(formData.get("recruit_end") ?? "");
  const selectionDate = String(formData.get("selection_date") ?? "");
  const submissionDue = String(formData.get("submission_due") ?? "");
  const latitude = toCoordinate(formData.get("latitude"));
  const longitude = toCoordinate(formData.get("longitude"));
  const coverImage = getImageFile(formData, "cover_image");
  const referenceImages = getImageFiles(formData, "reference_images").slice(0, 6);

  if (!title || !region || !description || !benefitValue || !recruitCount || !recruitEnd) {
    redirectWithError("캠페인 제목, 주소, 모집 인원, 모집 마감일, 제공 내역, 상세 설명을 입력해주세요.");
  }

  if (latitude === null || longitude === null) {
    redirectWithError("주소 검색 결과에서 캠페인 위치를 선택해주세요.");
  }

  if (!coverImage) {
    redirectWithError("대표 이미지를 등록해주세요.");
  }

  if (recruitEnd < getKoreaTodayString()) {
    redirectWithError("모집 마감일은 오늘 또는 이후 날짜로 설정해주세요.");
  }

  if (selectionDate && selectionDate < recruitEnd) {
    redirectWithError("선정 발표일은 모집 마감일과 같거나 이후 날짜로 설정해주세요.");
  }

  if (submissionDue && selectionDate && submissionDue < selectionDate) {
    redirectWithError("콘텐츠 등록 마감일은 선정 발표일과 같거나 이후 날짜로 설정해주세요.");
  }

  const imageValidationError = [coverImage, ...referenceImages]
    .map((file, index) => validateImageFile(file, index === 0 ? "대표 이미지" : "참고 사진"))
    .find(Boolean);

  if (imageValidationError) {
    redirectWithError(imageValidationError);
  }

  const { data: business, error: businessError } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (businessError || !business) {
    redirect(`/business/dashboard?error=${encodeURIComponent("캠페인 생성 전 가게 프로필을 먼저 등록해주세요.")}`);
  }

  const uploadedPaths: string[] = [];
  let coverImageUrl = "";
  const referenceImageUrls: string[] = [];

  try {
    const uploadedCoverImage = await uploadCampaignImage({ supabase, userId: user.id, file: coverImage });
    uploadedPaths.push(uploadedCoverImage.path);
    coverImageUrl = uploadedCoverImage.publicUrl;

    for (const image of referenceImages) {
      const uploadedImage = await uploadCampaignImage({ supabase, userId: user.id, file: image });
      uploadedPaths.push(uploadedImage.path);
      referenceImageUrls.push(uploadedImage.publicUrl);
    }
  } catch (uploadError) {
    if (uploadedPaths.length) await supabase.storage.from(CAMPAIGN_IMAGE_BUCKET).remove(uploadedPaths);
    const message = uploadError instanceof Error ? uploadError.message : "이미지 업로드 중 오류가 발생했습니다.";
    redirectWithError(message);
  }

  const { error } = await supabase.from("campaigns").insert({
    business_id: business.id,
    title,
    description,
    campaign_type: String(formData.get("campaign_type") ?? "visit"),
    region,
    region_detail: regionDetail || null,
    latitude,
    longitude,
    category: String(formData.get("category") ?? ""),
    recruit_count: recruitCount,
    recruit_start: String(formData.get("recruit_start") ?? "") || null,
    recruit_end: recruitEnd,
    selection_date: selectionDate || null,
    visit_start: String(formData.get("visit_start") ?? "") || null,
    visit_end: String(formData.get("visit_end") ?? "") || null,
    submission_due: submissionDue || null,
    benefit_type: String(formData.get("benefit_type") ?? ""),
    benefit_value: benefitValue,
    fee: toNullableNumber(formData.get("fee")),
    content_requirements: getContentRequirements(formData),
    usage_rights: String(formData.get("usage_rights") ?? ""),
    status: "in_review",
    cover_image_url: coverImageUrl,
    reference_image_urls: referenceImageUrls,
    beginner_friendly: formData.get("beginner_friendly") === "on"
  });

  if (error) {
    if (uploadedPaths.length) await supabase.storage.from(CAMPAIGN_IMAGE_BUCKET).remove(uploadedPaths);
    redirectWithError(error.message);
  }

  redirect("/business/dashboard");
}
