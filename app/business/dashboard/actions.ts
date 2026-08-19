"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { BUSINESS_IMAGE_BUCKET, isOwnedBusinessImagePath } from "@/lib/business-images";
import { logEvent } from "@/lib/events";

function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSafeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "";
}

function getDashboardRedirect(formData: FormData, error?: string) {
  const params = new URLSearchParams();
  const next = getSafeNext(formData.get("next"));

  if (String(formData.get("profile_mode") ?? "") === "edit") params.set("profile", "edit");
  if (next) params.set("next", next);
  if (error) params.set("error", error);

  const query = params.toString();
  return query ? `/business/dashboard?${query}` : "/business/dashboard";
}

function redirectWithError(formData: FormData, message: string): never {
  logEvent("business_profile.save_failed", {
    error: message,
    mode: String(formData.get("profile_mode") ?? "") === "edit" ? "edit" : "create"
  });
  redirect(getDashboardRedirect(formData, message));
}

function requiredText(formData: FormData, name: string, label: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) redirectWithError(formData, `${label}을(를) 입력해주세요.`);

  return value;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function normalizeBusinessRegistrationNumber(value: string) {
  return value.replace(/\D/g, "");
}

function toCoordinate(value: FormDataEntryValue | null) {
  const coordinate = Number(String(value ?? "").trim());
  return Number.isFinite(coordinate) ? coordinate : null;
}

function getProfileDuplicateMessage(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  if (message.includes("profiles_nickname_normalized_unique") || message.includes("nickname")) {
    return "이미 사용 중인 상호입니다.";
  }

  if (message.includes("profiles_phone_normalized_unique") || message.includes("phone")) {
    return "이미 가입된 담당자 전화번호입니다.";
  }

  if (error?.code === "23505" || message.includes("duplicate") || message.includes("unique")) {
    return "이미 사용 중인 정보가 있습니다.";
  }

  return null;
}

function nullableText(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

function normalizeUrl(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }

    return trimmed;
  } catch {
    throw new Error(`${label}은(는) http:// 또는 https://로 시작하는 올바른 URL이어야 합니다.`);
  }
}

function getBusinessImagePath(formData: FormData, userId: string) {
  const path = String(formData.get("cover_image_path") ?? "").trim();
  if (!path) return null;

  if (!isOwnedBusinessImagePath(userId, path)) {
    redirectWithError(formData, "업로드한 대표 이미지 경로를 확인할 수 없습니다.");
  }

  return path;
}

export async function saveBusinessProfile(formData: FormData) {
  const { supabase, user } = await requireRole("business", "/business/dashboard");
  const businessName = requiredText(formData, "business_name", "가게명");
  const managerName = requiredText(formData, "manager_name", "담당자명");
  const managerPhone = normalizePhone(requiredText(formData, "manager_phone", "담당자 전화번호"));
  if (managerPhone.length < 10 || managerPhone.length > 11) {
    redirectWithError(formData, "담당자 전화번호를 정확히 입력해주세요.");
  }

  const businessRegistrationNumber = normalizeBusinessRegistrationNumber(requiredText(formData, "business_registration_number", "사업자등록번호"));
  if (businessRegistrationNumber.length !== 10) {
    redirectWithError(formData, "사업자등록번호를 정확히 입력해주세요.");
  }

  const category = requiredText(formData, "category", "업종");
  const shortIntro = requiredText(formData, "short_intro", "한 줄 소개");
  const address = requiredText(formData, "address", "주소");
  const addressDetail = nullableText(formData, "address_detail");
  const latitude = toCoordinate(formData.get("latitude"));
  const longitude = toCoordinate(formData.get("longitude"));
  const district = requiredText(formData, "district", "소재지");
  const contact = normalizePhone(requiredText(formData, "contact", "매장 연락처"));
  if (contact.length < 8 || contact.length > 11) {
    redirectWithError(formData, "매장 연락처를 정확히 입력해주세요.");
  }

  // 지오코딩이 못 찾는 주소(신축 건물, 상세 표기 차이 등)도 있어 좌표는 없어도 저장한다.
  // 좌표가 없으면 캠페인 상세의 지도만 생략된다.
  const businessHoursSummary = requiredText(formData, "business_hours_summary", "영업시간");
  const businessHoursPreset = String(formData.get("business_hours_preset") ?? "").trim();
  const businessHoursNote = String(formData.get("business_hours_note") ?? "").trim();
  // 수정 화면에서 시간 입력을 그대로 되살리려면 요약 문자열 말고 값도 남겨야 한다.
  const businessHoursOpen = String(formData.get("business_hours_open_value") ?? "").trim();
  const businessHoursClose = String(formData.get("business_hours_close_value") ?? "").trim();
  const websiteUrlRaw = String(formData.get("website_url") ?? "").trim();
  const socialUrlValues = splitList(formData.get("social_urls"));
  let websiteUrl: string | null = null;
  let socialUrls: string[] = [];

  try {
    websiteUrl = normalizeUrl(websiteUrlRaw, "웹사이트");
    socialUrls = socialUrlValues.map((url) => normalizeUrl(url, "SNS URL")).filter((url): url is string => Boolean(url));
  } catch (urlError) {
    const message = urlError instanceof Error ? urlError.message : "URL 형식을 확인해주세요.";
    redirectWithError(formData, message);
  }

  const [{ data: isNicknameAvailable, error: nicknameAvailabilityError }, { data: isPhoneAvailable, error: phoneAvailabilityError }] = await Promise.all([
    supabase.rpc("is_profile_nickname_available", {
      target_nickname: businessName,
      current_user_id: user.id
    }),
    supabase.rpc("is_profile_phone_available", {
      target_phone: managerPhone,
      current_user_id: user.id
    })
  ]);

  if (nicknameAvailabilityError) redirectWithError(formData, "상호 중복 확인 중 오류가 발생했습니다.");
  if (!isNicknameAvailable) redirectWithError(formData, "이미 사용 중인 상호입니다.");
  if (phoneAvailabilityError) redirectWithError(formData, "담당자 전화번호 중복 확인 중 오류가 발생했습니다.");
  if (!isPhoneAvailable) redirectWithError(formData, "이미 가입된 담당자 전화번호입니다.");

  const { data: existingBusiness, error: existingBusinessError } = await supabase
    .from("business_profiles")
    .select("id,cover_image_url,is_public")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingBusinessError) redirectWithError(formData, existingBusinessError.message);

  // 인증 상태는 회원 정보를 따르고 공개 여부는 기존 값을 지킨다. 저장할 때마다
  // pending·false로 되돌리면 프로필을 고쳤다는 이유로 인증이 풀린다.
  const { data: memberProfile } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", user.id)
    .maybeSingle();
  const uploadedImagePath = getBusinessImagePath(formData, user.id);
  if (!uploadedImagePath && !existingBusiness?.cover_image_url) redirectWithError(formData, "대표 이미지를 등록해주세요.");

  let coverImageUrl = existingBusiness?.cover_image_url ?? "";
  if (uploadedImagePath) {
    coverImageUrl = supabase.storage.from(BUSINESS_IMAGE_BUCKET).getPublicUrl(uploadedImagePath).data.publicUrl;
  }

  const { error } = await supabase.from("business_profiles").upsert({
    user_id: user.id,
    business_name: businessName,
    category,
    short_intro: shortIntro,
    description: nullableText(formData, "description"),
    address,
    address_detail: addressDetail,
    latitude,
    longitude,
    district,
    contact,
    business_hours: {
      summary: businessHoursSummary,
      preset: businessHoursPreset || "custom",
      open: businessHoursOpen,
      close: businessHoursClose,
      note: businessHoursNote
    },
    website_url: websiteUrl,
    social_urls: socialUrls,
    cover_image_url: coverImageUrl,
    verification_status: memberProfile?.verification_status ?? "pending",
    is_public: existingBusiness?.is_public ?? false
  }, { onConflict: "user_id" });

  if (error) {
    if (uploadedImagePath) await supabase.storage.from(BUSINESS_IMAGE_BUCKET).remove([uploadedImagePath]);
    redirectWithError(formData, error.message);
  }

  const { error: profileError } = await supabase.from("profiles").update({
    email: user.email,
    nickname: businessName,
    name: managerName,
    phone: managerPhone,
    business_registration_number: businessRegistrationNumber
  }).eq("id", user.id);

  if (profileError) redirectWithError(formData, getProfileDuplicateMessage(profileError) ?? profileError.message);

  logEvent("business_profile.saved", {
    mode: existingBusiness ? "update" : "create",
    hasCoordinates: latitude !== null && longitude !== null
  });
  revalidatePath("/business/dashboard");
  const next = getSafeNext(formData.get("next"));
  redirect(next || "/business/dashboard");
}

export async function logBusinessProfileUploadFailure(message: string) {
  await requireRole("business", "/business/dashboard");
  logEvent("business_profile.upload_failed", {
    error: message.slice(0, 300)
  });
}

export async function approveRecommendedApplication(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const { supabase } = await requireRole("business", "/business/dashboard");

  const { error } = await supabase.rpc("select_campaign_application", {
    target_application_id: applicationId
  });

  if (error) {
    logEvent("application.approve_failed", { error: error.message, applicationId });
    redirect(`/business/dashboard?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/business/dashboard");
  revalidatePath("/admin");
  revalidatePath("/creator/dashboard");
  revalidatePath("/campaigns");
  redirect("/business/dashboard");
}

export async function submitDraftCampaignForReview(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const { supabase } = await requireRole("business", "/business/dashboard");

  const { data, error } = await supabase.rpc("submit_campaign_for_review", {
    target_campaign_id: campaignId,
    target_idempotency_key: `campaign_reserve:${campaignId}`
  });

  if (error) {
    logEvent("campaign.submit_failed", { error: error.message, campaignId });
    redirect(`/business/dashboard?campaign=${campaignId}&error=${encodeURIComponent(error.message)}`);
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

  revalidatePath("/business/dashboard");
  revalidatePath("/admin");
  redirect(`/business/dashboard?campaign=${campaignId}&message=${encodeURIComponent("포인트를 예약하고 캠페인 검수를 요청했습니다.")}`);
}

// 검수 대기 중인 캠페인을 초안으로 되돌린다. 예약 포인트는 유지되므로 수정 후 다시
// 제출하면 재예약 없이 그대로 올라간다.
export async function withdrawCampaignFromReview(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const { supabase } = await requireRole("business", "/business/dashboard");

  const { error } = await supabase.rpc("withdraw_campaign_from_review", {
    target_campaign_id: campaignId
  });

  if (error) {
    logEvent("campaign.withdraw_failed", { error: error.message, campaignId });
    redirect(`/business/dashboard?campaign=${campaignId}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/business/dashboard");
  revalidatePath("/admin");
  redirect(`/business/campaigns/${campaignId}/edit`);
}

export async function finalizeCampaignSelection(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const { supabase } = await requireRole("business", "/business/dashboard");
  const { error } = await supabase.rpc("finalize_campaign_selection", {
    target_campaign_id: campaignId
  });

  if (error) {
    logEvent("campaign.finalize_failed", { error: error.message, campaignId });
    redirect(`/business/dashboard?campaign=${campaignId}&error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/business/dashboard");
  revalidatePath("/admin");
  revalidatePath("/creator/dashboard");
  revalidatePath("/campaigns");
  redirect(`/business/dashboard?campaign=${campaignId}&message=${encodeURIComponent("크리에이터 선정을 완료했습니다.")}`);
}

const CAMPAIGN_IMAGE_BUCKET = "campaign-images";

// 스토리지 public URL에서 버킷 뒤의 경로만 뽑는다. 형식이 다르면 건너뛴다.
function toStoragePath(url: string) {
  const marker = `/storage/v1/object/public/${CAMPAIGN_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);

  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

export async function deleteCampaign(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const { supabase } = await requireRole("business", "/business/dashboard");

  const { data, error } = await supabase.rpc("delete_campaign", {
    target_campaign_id: campaignId
  });

  if (error) {
    logEvent("campaign.delete_failed", { error: error.message, campaignId });
    redirect(`/business/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  // 캠페인이 사라진 뒤 이미지만 남으면 스토리지에 쓰레기가 쌓인다.
  const deleted = Array.isArray(data) ? data[0] : data;
  const paths = [deleted?.cover_image_url, ...(deleted?.reference_image_urls ?? [])]
    .filter((url): url is string => Boolean(url))
    .map(toStoragePath)
    .filter((path): path is string => Boolean(path));

  if (paths.length) {
    await supabase.storage.from(CAMPAIGN_IMAGE_BUCKET).remove(paths);
  }

  revalidatePath("/business/dashboard");
  revalidatePath("/admin");
  redirect(`/business/dashboard?message=${encodeURIComponent("캠페인을 삭제했습니다. 예약된 포인트가 있었다면 함께 반환됩니다.")}`);
}

export async function cancelCampaignBeforePublish(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const { supabase } = await requireRole("business", "/business/dashboard");
  const { error } = await supabase.rpc("cancel_campaign_before_publish", {
    target_campaign_id: campaignId,
    target_idempotency_key: `campaign_cancel:${campaignId}`
  });

  if (error) {
    logEvent("campaign.cancel_failed", { error: error.message, campaignId });
    redirect(`/business/dashboard?campaign=${campaignId}&error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/business/dashboard");
  revalidatePath("/admin");
  redirect(`/business/dashboard?message=${encodeURIComponent("캠페인을 취소하고 예약 포인트를 반환했습니다.")}`);
}
