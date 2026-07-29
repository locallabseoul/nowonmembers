"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { collectFieldErrors, fieldError, hasErrors, keepValues, type FormState } from "@/lib/form-errors";

const SUBMISSION_IMAGE_BUCKET = "submission-images";
const MAX_SUBMISSION_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_SUBMISSION_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type SupabaseClient = Awaited<ReturnType<typeof requireRole>>["supabase"];

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00+09:00`).getTime());
}

function getImageFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return value instanceof File && value.size > 0 ? value : null;
}

function validateImageFile(file: File) {
  if (!ALLOWED_SUBMISSION_IMAGE_TYPES.has(file.type)) {
    return "미리보기 이미지는 JPG, PNG, WEBP 형식만 업로드할 수 있습니다.";
  }

  if (file.size > MAX_SUBMISSION_IMAGE_BYTES) {
    return "미리보기 이미지는 10MB 이하 파일만 업로드할 수 있습니다.";
  }

  return null;
}

function imageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function uploadSubmissionImage({
  supabase,
  userId,
  collaborationId,
  file
}: {
  supabase: SupabaseClient;
  userId: string;
  collaborationId: string;
  file: File;
}) {
  const path = `${userId}/submissions/${collaborationId}/${Date.now()}-${randomUUID()}.${imageExtension(file)}`;
  const { error } = await supabase.storage.from(SUBMISSION_IMAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(SUBMISSION_IMAGE_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

function canSubmitForCollaborationStatus(status: string) {
  return !["completed", "cancelled", "no_show"].includes(status);
}

export async function submitContent(_prevState: FormState, formData: FormData): Promise<FormState> {
  const collaborationId = String(formData.get("collaboration_id") ?? "");
  const { supabase, user } = await requireRole("creator", `/creator/submissions/${collaborationId}`);

  const platform = String(formData.get("platform") ?? "").trim();
  const contentUrl = String(formData.get("content_url") ?? "").trim();
  const publishedAt = String(formData.get("published_at") ?? "").trim();
  const disclosureConfirmed = formData.get("disclosure_confirmed") === "on";
  const previewImage = getImageFile(formData, "preview_image");
  const kept = keepValues(formData, ["platform", "content_url", "published_at"]);

  const invalid = collectFieldErrors({
    platform: platform ? null : "게시 채널을 선택해주세요.",
    content_url: !contentUrl
      ? "콘텐츠 URL을 입력해주세요."
      : !isValidUrl(contentUrl)
        ? "콘텐츠 URL은 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다."
        : null,
    published_at: !publishedAt
      ? "게시일을 선택해주세요."
      : !isValidDate(publishedAt)
        ? "게시일을 올바른 날짜로 선택해주세요."
        : null,
    preview_image: previewImage ? validateImageFile(previewImage) : null,
    disclosure_confirmed: disclosureConfirmed ? null : "제공 사실 표시와 콘텐츠 유지 조건에 동의해주세요."
  });

  if (hasErrors(invalid)) return { ...invalid, values: kept };

  const { data: creator, error: creatorError } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (creatorError || !creator) {
    return { formError: "크리에이터 프로필을 찾을 수 없습니다.", values: kept };
  }

  const { data: collaboration, error: collaborationError } = await supabase
    .from("collaborations")
    .select("id,status,campaign_id,campaigns(status)")
    .eq("id", collaborationId)
    .eq("creator_id", creator.id)
    .maybeSingle();

  if (collaborationError || !collaboration) {
    return { formError: "제출 가능한 협업을 찾을 수 없습니다.", values: kept };
  }

  if (!canSubmitForCollaborationStatus(collaboration.status)) {
    return { formError: "이미 종료되었거나 취소된 협업은 제출할 수 없습니다.", values: kept };
  }

  const { data: existingSubmissions, error: existingSubmissionsError } = await supabase
    .from("content_submissions")
    .select("id,preview_image_url,review_status")
    .eq("collaboration_id", collaborationId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingSubmissionsError) {
    return { formError: "이전 제출 내역을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.", values: kept };
  }

  const existingSubmission = existingSubmissions?.[0] ?? null;
  if (existingSubmission?.review_status === "approved") {
    return { formError: "이미 승인된 제출물은 수정할 수 없습니다.", values: kept };
  }

  if (!previewImage && !existingSubmission?.preview_image_url) {
    return { ...fieldError("preview_image", "미리보기 이미지를 업로드해주세요."), values: kept };
  }

  const uploadedPaths: string[] = [];
  let previewImageUrl = existingSubmission?.preview_image_url ?? "";

  if (previewImage) {
    try {
      const uploadedImage = await uploadSubmissionImage({ supabase, userId: user.id, collaborationId, file: previewImage });
      uploadedPaths.push(uploadedImage.path);
      previewImageUrl = uploadedImage.publicUrl;
    } catch {
      return { ...fieldError("preview_image", "이미지 업로드 중 오류가 발생했습니다."), values: kept };
    }
  }

  const payload = {
    collaboration_id: collaborationId,
    platform,
    content_url: contentUrl,
    published_at: publishedAt,
    preview_image_url: previewImageUrl,
    disclosure_confirmed: disclosureConfirmed,
    review_status: "submitted" as const,
    admin_memo: null
  };

  const { error } = existingSubmission
    ? await supabase.from("content_submissions").update(payload).eq("id", existingSubmission.id)
    : await supabase.from("content_submissions").insert(payload);

  if (error) {
    if (uploadedPaths.length) await supabase.storage.from(SUBMISSION_IMAGE_BUCKET).remove(uploadedPaths);
    return { formError: "제출을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.", values: kept };
  }

  await supabase.from("collaborations").update({ status: "submitted" }).eq("id", collaborationId);
  const campaign = Array.isArray(collaboration.campaigns) ? collaboration.campaigns[0] : collaboration.campaigns;
  if (campaign?.status === "in_progress") {
    await supabase.from("campaigns").update({ status: "submission_review" }).eq("id", collaboration.campaign_id);
  }

  revalidatePath("/creator/dashboard");
  revalidatePath(`/creator/submissions/${collaborationId}`);
  revalidatePath("/business/dashboard");
  revalidatePath("/admin");
  redirect("/creator/dashboard");
}
