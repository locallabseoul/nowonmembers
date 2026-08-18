"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { logEvent } from "@/lib/events";

const CREATOR_IMAGE_BUCKET = "creator-images";
const MAX_CREATOR_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CREATOR_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type SupabaseClient = Awaited<ReturnType<typeof requireRole>>["supabase"];

function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSafeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "";
}

function getProfileRedirect(formData: FormData, error?: string) {
  const params = new URLSearchParams();
  const next = getSafeNext(formData.get("next"));

  if (next) params.set("next", next);
  if (error) params.set("error", error);

  const query = params.toString();
  return query ? `/creator/profile?${query}` : "/creator/profile";
}

function redirectWithError(formData: FormData, message: string): never {
  logEvent("creator_profile.save_failed", { error: message });
  redirect(getProfileRedirect(formData, message));
}

function requiredList(formData: FormData, name: string, label: string) {
  const value = splitList(formData.get(name));
  if (!value.length) redirectWithError(formData, `${label}을(를) 1개 이상 선택해주세요.`);

  return value;
}

function requiredText(formData: FormData, name: string, label: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) redirectWithError(formData, `${label}을(를) 입력해주세요.`);

  return value;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function getProfileDuplicateMessage(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  if (message.includes("profiles_phone_normalized_unique") || message.includes("phone")) {
    return "이미 가입된 전화번호입니다.";
  }

  if (message.includes("profiles_nickname_normalized_unique") || message.includes("nickname")) {
    return "이미 사용 중인 닉네임입니다.";
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

function toNullableNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/[^0-9]/g, "");
  return raw ? Number(raw) : null;
}

function getImageFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return value instanceof File && value.size > 0 ? value : null;
}

function validateImageFile(file: File) {
  if (!ALLOWED_CREATOR_IMAGE_TYPES.has(file.type)) {
    return "프로필 이미지는 JPG, PNG, WEBP 형식만 업로드할 수 있습니다.";
  }

  if (file.size > MAX_CREATOR_IMAGE_BYTES) {
    return "프로필 이미지는 10MB 이하 파일만 업로드할 수 있습니다.";
  }

  return null;
}

function imageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function uploadCreatorImage({
  supabase,
  userId,
  file
}: {
  supabase: SupabaseClient;
  userId: string;
  file: File;
}) {
  const path = `${userId}/creator/${Date.now()}-${randomUUID()}.${imageExtension(file)}`;
  const { error } = await supabase.storage.from(CREATOR_IMAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(CREATOR_IMAGE_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

async function replaceCreatorChannel({
  supabase,
  creatorId,
  platform,
  channelName,
  channelUrl,
  followerCount,
  averageViews
}: {
  supabase: SupabaseClient;
  creatorId: string;
  platform: string;
  channelName: string | null;
  channelUrl: string;
  followerCount: number | null;
  averageViews: number | null;
}) {
  const { data: existingChannels, error: existingChannelsError } = await supabase
    .from("creator_channels")
    .select("id")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: true });

  if (existingChannelsError) throw new Error(existingChannelsError.message);

  const primaryChannel = existingChannels?.[0];
  const duplicateIds = (existingChannels ?? []).slice(1).map((channel) => channel.id);
  if (duplicateIds.length) {
    const { error } = await supabase.from("creator_channels").delete().in("id", duplicateIds);
    if (error) throw new Error(error.message);
  }

  const payload = {
    creator_id: creatorId,
    platform,
    channel_name: channelName,
    channel_url: channelUrl,
    follower_count: followerCount,
    average_views: averageViews
  };

  const { error } = primaryChannel
    ? await supabase.from("creator_channels").update(payload).eq("id", primaryChannel.id)
    : await supabase.from("creator_channels").insert(payload);

  if (error) throw new Error(error.message);
}

async function replacePortfolio({
  supabase,
  creatorId,
  title,
  url
}: {
  supabase: SupabaseClient;
  creatorId: string;
  title: string;
  url: string | null;
}) {
  const { data: existingPortfolios, error: existingPortfoliosError } = await supabase
    .from("portfolios")
    .select("id")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: true });

  if (existingPortfoliosError) throw new Error(existingPortfoliosError.message);

  if (!url) {
    if (existingPortfolios?.length) {
      const { error } = await supabase.from("portfolios").delete().in("id", existingPortfolios.map((portfolio) => portfolio.id));
      if (error) throw new Error(error.message);
    }
    return;
  }

  const primaryPortfolio = existingPortfolios?.[0];
  const duplicateIds = (existingPortfolios ?? []).slice(1).map((portfolio) => portfolio.id);
  if (duplicateIds.length) {
    const { error } = await supabase.from("portfolios").delete().in("id", duplicateIds);
    if (error) throw new Error(error.message);
  }

  const payload = {
    creator_id: creatorId,
    title: title || "대표 포트폴리오",
    content_type: "link",
    url
  };

  const { error } = primaryPortfolio
    ? await supabase.from("portfolios").update(payload).eq("id", primaryPortfolio.id)
    : await supabase.from("portfolios").insert(payload);

  if (error) throw new Error(error.message);
}

export async function saveCreatorProfile(formData: FormData) {
  const { supabase, user } = await requireRole("creator", "/creator/profile");
  const name = requiredText(formData, "name", "이름");
  const phone = normalizePhone(requiredText(formData, "phone", "전화번호"));
  if (phone.length < 10 || phone.length > 11) {
    redirectWithError(formData, "전화번호를 정확히 입력해주세요.");
  }

  const activityAreas = requiredList(formData, "activity_areas", "활동 지역");
  const interests = requiredList(formData, "interests", "관심 분야");
  const contentTypes = requiredList(formData, "content_types", "콘텐츠 유형");
  const availableDays = splitList(formData.get("available_days"));
  const bio = requiredText(formData, "bio", "자기소개");
  const channelPlatform = requiredText(formData, "channel_platform", "채널 플랫폼");
  const channelName = nullableText(formData, "channel_name");
  const channelUrlRaw = requiredText(formData, "channel_url", "대표 채널 URL");
  const portfolioTitle = String(formData.get("portfolio_title") ?? "").trim();
  const portfolioUrlRaw = String(formData.get("portfolio_url") ?? "").trim();
  let channelUrl = "";
  let portfolioUrl: string | null = null;

  try {
    channelUrl = normalizeUrl(channelUrlRaw, "대표 채널 URL") ?? "";
    portfolioUrl = normalizeUrl(portfolioUrlRaw, "포트폴리오 URL");
  } catch (urlError) {
    const message = urlError instanceof Error ? urlError.message : "URL 형식을 확인해주세요.";
    redirectWithError(formData, message);
  }

  const avatarImage = getImageFile(formData, "avatar_image");
  if (avatarImage) {
    const imageValidationError = validateImageFile(avatarImage);
    if (imageValidationError) redirectWithError(formData, imageValidationError);
  }

  const { data: isPhoneAvailable, error: phoneAvailabilityError } = await supabase.rpc("is_profile_phone_available", {
    target_phone: phone,
    current_user_id: user.id
  });

  if (phoneAvailabilityError) redirectWithError(formData, "전화번호 중복 확인 중 오류가 발생했습니다.");
  if (!isPhoneAvailable) redirectWithError(formData, "이미 가입된 전화번호입니다.");

  const { data: existingCreator, error: existingCreatorError } = await supabase
    .from("creator_profiles")
    .select("id,avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingCreatorError) redirectWithError(formData, existingCreatorError.message);

  // 관리자가 회원 인증을 먼저 승인한 뒤 프로필을 만드는 경우도 있어, 회원 정보의
  // 인증 상태를 그대로 가져온다.
  const { data: memberProfile } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", user.id)
    .maybeSingle();
  const memberVerification = memberProfile?.verification_status ?? "pending";

  const uploadedPaths: string[] = [];
  let avatarUrl = existingCreator?.avatar_url ?? null;

  if (avatarImage) {
    try {
      const uploadedImage = await uploadCreatorImage({ supabase, userId: user.id, file: avatarImage });
      uploadedPaths.push(uploadedImage.path);
      avatarUrl = uploadedImage.publicUrl;
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "이미지 업로드 중 오류가 발생했습니다.";
      redirectWithError(formData, message);
    }
  }

  const { data: creator, error: creatorError } = await supabase
    .from("creator_profiles")
    .upsert({
      user_id: user.id,
      activity_areas: activityAreas,
      interests,
      content_types: contentTypes,
      available_days: availableDays,
      bio,
      avatar_url: avatarUrl,
      // 인증 상태는 회원 정보(profiles)를 따른다. 여기서 pending으로 덮으면
      // 관리자가 승인해둔 인증이 프로필 수정만으로 풀려 공개 목록에서 사라진다.
      verification_status: memberVerification
    }, { onConflict: "user_id" })
    .select("id")
    .single();

  if (creatorError) {
    if (uploadedPaths.length) await supabase.storage.from(CREATOR_IMAGE_BUCKET).remove(uploadedPaths);
    redirectWithError(formData, creatorError.message);
  }

  const { error: profileError } = await supabase.from("profiles").update({
    name,
    phone
  }).eq("id", user.id);

  if (profileError) {
    const message = getProfileDuplicateMessage(profileError) ?? profileError.message;
    redirectWithError(formData, message);
  }

  try {
    await replaceCreatorChannel({
      supabase,
      creatorId: creator.id,
      platform: channelPlatform,
      channelName,
      channelUrl,
      followerCount: toNullableNumber(formData.get("follower_count")),
      averageViews: toNullableNumber(formData.get("average_views"))
    });
    await replacePortfolio({
      supabase,
      creatorId: creator.id,
      title: portfolioTitle,
      url: portfolioUrl
    });
  } catch (relatedError) {
    const message = relatedError instanceof Error ? relatedError.message : "크리에이터 프로필 저장 중 오류가 발생했습니다.";
    redirectWithError(formData, message);
  }

  logEvent("creator_profile.saved", {});
  revalidatePath("/creator/profile");
  revalidatePath("/creator/dashboard");
  const next = getSafeNext(formData.get("next"));
  redirect(next || "/creator/dashboard");
}
