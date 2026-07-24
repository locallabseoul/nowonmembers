"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";

const BUSINESS_IMAGE_BUCKET = "business-images";
const MAX_BUSINESS_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_BUSINESS_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function getImageFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return value instanceof File && value.size > 0 ? value : null;
}

function validateImageFile(file: File) {
  if (!ALLOWED_BUSINESS_IMAGE_TYPES.has(file.type)) {
    return "대표 이미지는 JPG, PNG, WEBP 형식만 업로드할 수 있습니다.";
  }

  if (file.size > MAX_BUSINESS_IMAGE_BYTES) {
    return "대표 이미지는 10MB 이하 파일만 업로드할 수 있습니다.";
  }

  return null;
}

function imageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function uploadBusinessImage({
  supabase,
  userId,
  file
}: {
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"];
  userId: string;
  file: File;
}) {
  const path = `${userId}/business/${Date.now()}-${randomUUID()}.${imageExtension(file)}`;
  const { error } = await supabase.storage.from(BUSINESS_IMAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUSINESS_IMAGE_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
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

  if (latitude === null || longitude === null) {
    redirectWithError(formData, "주소 검색 결과에서 매장 위치를 선택해주세요.");
  }

  const businessHoursSummary = requiredText(formData, "business_hours_summary", "영업시간");
  const businessHoursPreset = String(formData.get("business_hours_preset") ?? "").trim();
  const businessHoursNote = String(formData.get("business_hours_note") ?? "").trim();
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

  const coverImage = getImageFile(formData, "cover_image");
  if (coverImage) {
    const imageValidationError = validateImageFile(coverImage);
    if (imageValidationError) redirectWithError(formData, imageValidationError);
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
    .select("id,cover_image_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingBusinessError) redirectWithError(formData, existingBusinessError.message);
  if (!coverImage && !existingBusiness?.cover_image_url) redirectWithError(formData, "대표 이미지를 등록해주세요.");

  const uploadedPaths: string[] = [];
  let coverImageUrl = existingBusiness?.cover_image_url ?? "";

  if (coverImage) {
    try {
      const uploadedImage = await uploadBusinessImage({ supabase, userId: user.id, file: coverImage });
      uploadedPaths.push(uploadedImage.path);
      coverImageUrl = uploadedImage.publicUrl;
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "이미지 업로드 중 오류가 발생했습니다.";
      redirectWithError(formData, message);
    }
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
      note: businessHoursNote
    },
    website_url: websiteUrl,
    social_urls: socialUrls,
    cover_image_url: coverImageUrl,
    verification_status: "pending",
    is_public: false
  }, { onConflict: "user_id" });

  if (error) {
    if (uploadedPaths.length) await supabase.storage.from(BUSINESS_IMAGE_BUCKET).remove(uploadedPaths);
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

  revalidatePath("/business/dashboard");
  const next = getSafeNext(formData.get("next"));
  redirect(next || "/business/dashboard");
}

export async function approveRecommendedApplication(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const { supabase } = await requireRole("business", "/business/dashboard");

  const { error } = await supabase.rpc("select_campaign_application", {
    target_application_id: applicationId
  });

  if (error) redirect(`/business/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/business/dashboard");
  revalidatePath("/admin");
  revalidatePath("/creator/dashboard");
  revalidatePath("/campaigns");
  redirect("/business/dashboard");
}
