"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { getKoreaTodayString } from "@/lib/campaign-lifecycle";
import { logEvent } from "@/lib/events";
import { collectFieldErrors, fieldError, hasErrors, keepValues, type FormState } from "@/lib/form-errors";

const CAMPAIGN_IMAGE_BUCKET = "campaign-images";
const MAX_CAMPAIGN_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CAMPAIGN_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// 모집 인원은 예약 포인트와 직결돼 수정 대상에서 뺀다. 바꾸려면 취소 후 다시 만든다.
const EDITABLE_STATUSES = ["draft", "revision_requested"];

// 키워드는 한 줄에 쉼표로 나열하므로 쉼표로도 나눈다.
function splitKeywords(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// 요청사항은 문장이라 쉼표가 흔하다. 줄바꿈으로만 나눈다. 쉼표로 나누면
// "디저트, 커피 또는 굿즈 사진" 같은 문장이 두 조각으로 쪼개진다.
function splitRequirementLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getContentRequirements(formData: FormData) {
  const requirements = [
    ...formData.getAll("mission_options").map((value) => String(value).trim()).filter(Boolean),
    ...splitRequirementLines(formData.get("content_requirements"))
  ];
  const keywords = splitKeywords(formData.get("keywords"));

  return {
    keywords: Array.from(new Set(keywords)),
    requirements: Array.from(new Set(requirements))
  };
}

function toNullableNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/[^0-9]/g, "");
  return raw ? Number(raw) : null;
}

function toCoordinate(value: FormDataEntryValue | null) {
  const coordinate = Number(String(value ?? "").trim());
  return Number.isFinite(coordinate) ? coordinate : null;
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

export async function updateCampaign(_prevState: FormState, formData: FormData): Promise<FormState> {
  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  const { supabase, user } = await requireRole("business", `/business/campaigns/${campaignId}/edit`);

  const title = String(formData.get("title") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const regionDetail = String(formData.get("region_detail") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const benefitValue = String(formData.get("benefit_value") ?? "").trim();
  const recruitEnd = String(formData.get("recruit_end") ?? "");
  const selectionDate = String(formData.get("selection_date") ?? "");
  const submissionDue = String(formData.get("submission_due") ?? "");
  const latitude = toCoordinate(formData.get("latitude"));
  const longitude = toCoordinate(formData.get("longitude"));
  const coverImage = getImageFile(formData, "cover_image");
  const referenceImages = getImageFiles(formData, "reference_images").slice(0, 6);
  const resubmit = formData.get("resubmit") === "on";

  const kept = keepValues(formData, [
    "title",
    "region",
    "region_detail",
    "description",
    "benefit_value",
    "benefit_type",
    "fee",
    "usage_rights",
    "content_requirements",
    "keywords",
    "recruit_end",
    "selection_date",
    "submission_due",
    "category",
    "campaign_type"
  ]);

  const invalid = collectFieldErrors({
    title: title ? null : "캠페인 제목을 입력해주세요.",
    // 지오코딩이 못 찾는 주소도 있어 좌표는 없어도 저장한다.
    region: region ? null : "캠페인 주소를 입력해주세요.",
    description: description ? null : "캠페인 상세 설명을 입력해주세요.",
    benefit_value: benefitValue ? null : "제공 내역을 입력해주세요.",
    recruit_end: !recruitEnd
      ? "모집 마감일을 선택해주세요."
      : recruitEnd < getKoreaTodayString()
        ? "모집 마감일은 오늘 또는 이후 날짜로 설정해주세요."
        : null,
    selection_date:
      !selectionDate
        ? "선정 발표일을 선택해주세요."
        : selectionDate < recruitEnd
          ? "선정 발표일은 모집 마감일과 같거나 이후 날짜로 설정해주세요."
          : null,
    submission_due:
      submissionDue && selectionDate && submissionDue < selectionDate
        ? "콘텐츠 등록 마감일은 선정 발표일과 같거나 이후 날짜로 설정해주세요."
        : null,
    cover_image: coverImage ? validateImageFile(coverImage, "대표 이미지") : null,
    reference_images: referenceImages.map((file) => validateImageFile(file, "참고 사진")).find(Boolean) ?? null
  });

  if (hasErrors(invalid)) return { ...invalid, values: kept };

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,status,cover_image_url,reference_image_urls,business_profiles!inner(user_id)")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError || !campaign) {
    return { formError: "캠페인을 찾을 수 없습니다.", values: kept };
  }

  const owner = Array.isArray(campaign.business_profiles) ? campaign.business_profiles[0] : campaign.business_profiles;
  if (owner?.user_id !== user.id) {
    return { formError: "본인 가게의 캠페인만 수정할 수 있습니다.", values: kept };
  }

  if (!EDITABLE_STATUSES.includes(campaign.status)) {
    return { formError: "초안 또는 수정 요청 상태의 캠페인만 수정할 수 있습니다.", values: kept };
  }

  const uploadedPaths: string[] = [];
  let coverImageUrl = campaign.cover_image_url ?? "";
  let referenceImageUrls: string[] = Array.isArray(campaign.reference_image_urls)
    ? campaign.reference_image_urls
    : [];

  try {
    if (coverImage) {
      const uploaded = await uploadCampaignImage({ supabase, userId: user.id, file: coverImage });
      uploadedPaths.push(uploaded.path);
      coverImageUrl = uploaded.publicUrl;
    }

    // 참고 사진은 새로 올린 것이 있을 때만 통째로 교체한다.
    if (referenceImages.length) {
      const uploadedUrls: string[] = [];
      for (const image of referenceImages) {
        const uploaded = await uploadCampaignImage({ supabase, userId: user.id, file: image });
        uploadedPaths.push(uploaded.path);
        uploadedUrls.push(uploaded.publicUrl);
      }
      referenceImageUrls = uploadedUrls;
    }
  } catch {
    if (uploadedPaths.length) await supabase.storage.from(CAMPAIGN_IMAGE_BUCKET).remove(uploadedPaths);
    return { ...fieldError("cover_image", "이미지 업로드 중 오류가 발생했습니다."), values: kept };
  }

  if (!coverImageUrl) {
    return { ...fieldError("cover_image", "대표 이미지를 등록해주세요."), values: kept };
  }

  const { error: updateError } = await supabase
    .from("campaigns")
    .update({
      title,
      description,
      campaign_type: String(formData.get("campaign_type") ?? "visit"),
      region,
      region_detail: regionDetail || null,
      latitude,
      longitude,
      category: String(formData.get("category") ?? ""),
      recruit_end: recruitEnd,
      selection_date: selectionDate,
      submission_due: submissionDue || null,
      benefit_type: String(formData.get("benefit_type") ?? ""),
      benefit_value: benefitValue,
      fee: toNullableNumber(formData.get("fee")),
      content_requirements: getContentRequirements(formData),
      usage_rights: String(formData.get("usage_rights") ?? ""),
      cover_image_url: coverImageUrl,
      reference_image_urls: referenceImageUrls,
      beginner_friendly: formData.get("beginner_friendly") === "on",
      updated_at: new Date().toISOString()
    })
    .eq("id", campaignId);

  if (updateError) {
    if (uploadedPaths.length) await supabase.storage.from(CAMPAIGN_IMAGE_BUCKET).remove(uploadedPaths);
    logEvent("campaign.update_failed", { error: updateError.message, campaignId });
    return { formError: "캠페인을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.", values: kept };
  }

  if (resubmit) {
    const { data, error } = await supabase.rpc("submit_campaign_for_review", {
      target_campaign_id: campaignId,
      target_idempotency_key: `campaign_reserve:${campaignId}`
    });

    if (error) {
      logEvent("campaign.submit_failed", { error: error.message, campaignId });
      return { formError: error.message, values: kept };
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.submitted) {
      const params = new URLSearchParams({
        campaign: campaignId,
        required: String(result?.required_points ?? 0),
        shortfall: String(result?.shortfall_points ?? 0)
      });
      redirect(`/business/points?${params.toString()}`);
    }
  }

  revalidatePath("/business/dashboard");
  revalidatePath("/admin");
  redirect(
    `/business/dashboard?campaign=${campaignId}&message=${encodeURIComponent(
      resubmit ? "캠페인을 수정하고 검수를 다시 요청했습니다." : "캠페인 수정 내용을 저장했습니다."
    )}`
  );
}
