"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";

const SUBMISSION_IMAGE_BUCKET = "submission-images";
const MAX_SUBMISSION_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_SUBMISSION_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type SupabaseClient = Awaited<ReturnType<typeof requireRole>>["supabase"];

function redirectWithError(collaborationId: string, message: string): never {
  redirect(`/creator/submissions/${collaborationId}?error=${encodeURIComponent(message)}`);
}

function requiredText(formData: FormData, name: string, label: string, collaborationId: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) redirectWithError(collaborationId, `${label}을(를) 입력해주세요.`);

  return value;
}

function normalizeUrl(value: string, label: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }

    return value;
  } catch {
    throw new Error(`${label}은(는) http:// 또는 https://로 시작하는 올바른 URL이어야 합니다.`);
  }
}

function validateDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label}을(를) 올바른 날짜로 선택해주세요.`);
  }

  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label}을(를) 올바른 날짜로 선택해주세요.`);
  }
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

export async function submitContent(formData: FormData) {
  const collaborationId = String(formData.get("collaboration_id") ?? "");
  const { supabase, user } = await requireRole("creator", `/creator/submissions/${collaborationId}`);

  const platform = requiredText(formData, "platform", "게시 채널", collaborationId);
  const contentUrlRaw = requiredText(formData, "content_url", "콘텐츠 URL", collaborationId);
  const publishedAt = requiredText(formData, "published_at", "게시일", collaborationId);
  const disclosureConfirmed = formData.get("disclosure_confirmed") === "on";

  if (!disclosureConfirmed) {
    redirectWithError(collaborationId, "제공 사실 표시와 콘텐츠 유지 조건에 동의해주세요.");
  }

  let contentUrl = "";
  try {
    contentUrl = normalizeUrl(contentUrlRaw, "콘텐츠 URL");
    validateDate(publishedAt, "게시일");
  } catch (validationError) {
    const message = validationError instanceof Error ? validationError.message : "제출 정보를 확인해주세요.";
    redirectWithError(collaborationId, message);
  }

  const previewImage = getImageFile(formData, "preview_image");
  if (previewImage) {
    const imageValidationError = validateImageFile(previewImage);
    if (imageValidationError) redirectWithError(collaborationId, imageValidationError);
  }

  const { data: creator, error: creatorError } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (creatorError || !creator) {
    redirectWithError(collaborationId, creatorError?.message ?? "크리에이터 프로필을 찾을 수 없습니다.");
  }

  const { data: collaboration, error: collaborationError } = await supabase
    .from("collaborations")
    .select("id,status,campaign_id,campaigns(status)")
    .eq("id", collaborationId)
    .eq("creator_id", creator.id)
    .maybeSingle();

  if (collaborationError || !collaboration) {
    redirectWithError(collaborationId, collaborationError?.message ?? "제출 가능한 협업을 찾을 수 없습니다.");
  }

  if (!canSubmitForCollaborationStatus(collaboration.status)) {
    redirectWithError(collaborationId, "이미 종료되었거나 취소된 협업은 제출할 수 없습니다.");
  }

  const { data: existingSubmissions, error: existingSubmissionsError } = await supabase
    .from("content_submissions")
    .select("id,preview_image_url,review_status")
    .eq("collaboration_id", collaborationId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingSubmissionsError) redirectWithError(collaborationId, existingSubmissionsError.message);

  const existingSubmission = existingSubmissions?.[0] ?? null;
  if (existingSubmission?.review_status === "approved") {
    redirectWithError(collaborationId, "이미 승인된 제출물은 수정할 수 없습니다.");
  }

  if (!previewImage && !existingSubmission?.preview_image_url) {
    redirectWithError(collaborationId, "미리보기 이미지를 업로드해주세요.");
  }

  const uploadedPaths: string[] = [];
  let previewImageUrl = existingSubmission?.preview_image_url ?? "";

  if (previewImage) {
    try {
      const uploadedImage = await uploadSubmissionImage({ supabase, userId: user.id, collaborationId, file: previewImage });
      uploadedPaths.push(uploadedImage.path);
      previewImageUrl = uploadedImage.publicUrl;
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "이미지 업로드 중 오류가 발생했습니다.";
      redirectWithError(collaborationId, message);
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
    redirectWithError(collaborationId, error.message);
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
