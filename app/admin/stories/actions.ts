"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { isEditorialStoryKind, parseStoryContentBlocksJson, storyBlocksToPlainText, type StoryContentBlock } from "@/lib/story-content";

const STORY_IMAGE_BUCKET = "story-images";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

function adminStoriesUrl(params: Record<string, string> = {}) {
  const search = new URLSearchParams(params).toString();
  return search ? `/admin/stories?${search}` : "/admin/stories";
}

function validateImage(file: File) {
  if (!IMAGE_EXTENSIONS[file.type]) return "이미지는 JPG, PNG, WEBP 형식만 사용할 수 있습니다.";
  if (file.size > MAX_IMAGE_BYTES) return "이미지는 한 장당 8MB 이하만 업로드할 수 있습니다.";
  return "";
}

async function uploadStoryImage(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  userId: string,
  file: File,
  uploadedPaths: string[]
) {
  const validationError = validateImage(file);
  if (validationError) throw new Error(validationError);

  const path = `${userId}/stories/${randomUUID()}.${IMAGE_EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage.from(STORY_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000"
  });
  if (error) throw error;
  uploadedPaths.push(path);
  return supabase.storage.from(STORY_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function prepareStoryInput(formData: FormData, existingCoverImage = "") {
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const summary = String(formData.get("summary") ?? "").trim().slice(0, 600);
  const storyKindValue = String(formData.get("story_kind") ?? "");
  const status = formData.get("status") === "published" ? "published" : "draft";
  const businessId = String(formData.get("business_id") ?? "").trim() || null;
  const contentBlocks = parseStoryContentBlocksJson(String(formData.get("content_blocks") ?? "[]"));

  if (!title || !summary || !isEditorialStoryKind(storyKindValue)) {
    throw new Error("제목, 요약, 카테고리를 확인해주세요.");
  }
  if (!contentBlocks.length) throw new Error("본문 콘텐츠를 한 개 이상 작성해주세요.");

  const { supabase, user } = await requireAdmin();
  const uploadedPaths: string[] = [];

  try {
    const coverFile = formData.get("cover_image");
    let coverImageUrl = existingCoverImage;
    if (coverFile instanceof File && coverFile.size > 0) {
      coverImageUrl = await uploadStoryImage(supabase, user.id, coverFile, uploadedPaths);
    }
    if (!coverImageUrl) throw new Error("표지 이미지를 등록해주세요.");

    const hydratedBlocks: StoryContentBlock[] = [];
    for (const block of contentBlocks) {
      if (block.type !== "image") {
        hydratedBlocks.push(block);
        continue;
      }

      let imageUrl = block.url;
      if (block.inputName) {
        const imageFile = formData.get(block.inputName);
        if (imageFile instanceof File && imageFile.size > 0) {
          imageUrl = await uploadStoryImage(supabase, user.id, imageFile, uploadedPaths);
        }
      }
      if (!imageUrl) throw new Error("본문 이미지 파일을 선택해주세요.");
      hydratedBlocks.push({ id: block.id, type: "image", url: imageUrl, alt: block.alt, caption: block.caption });
    }

    return {
      supabase,
      uploadedPaths,
      values: {
        title,
        summary,
        story_kind: storyKindValue,
        status,
        business_id: businessId,
        category: storyKindValue === "interview" ? "인터뷰" : "새소식",
        author_name: "노원멤버스 편집부",
        cover_image_url: coverImageUrl,
        content_blocks: hydratedBlocks,
        body: storyBlocksToPlainText(hydratedBlocks)
      }
    };
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from(STORY_IMAGE_BUCKET).remove(uploadedPaths);
    throw error;
  }
}

export async function createEditorialStory(formData: FormData) {
  let prepared: Awaited<ReturnType<typeof prepareStoryInput>>;
  try {
    prepared = await prepareStoryInput(formData);
  } catch (error) {
    redirect(adminStoriesUrl({ error: error instanceof Error ? error.message : "스토리를 저장하지 못했습니다." }));
  }

  const now = new Date().toISOString();
  const { error } = await prepared.supabase.from("local_stories").insert({
    ...prepared.values,
    published_at: prepared.values.status === "published" ? now : null,
    updated_at: now
  });

  if (error) {
    if (prepared.uploadedPaths.length) await prepared.supabase.storage.from(STORY_IMAGE_BUCKET).remove(prepared.uploadedPaths);
    redirect(adminStoriesUrl({ error: error.message }));
  }

  revalidateStoryPaths();
  redirect(adminStoriesUrl({ created: "1" }));
}

export async function updateEditorialStory(formData: FormData) {
  const id = String(formData.get("story_id") ?? "");
  const { supabase } = await requireAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("local_stories")
    .select("id,story_kind,status,published_at,cover_image_url")
    .eq("id", id)
    .in("story_kind", ["news", "interview"])
    .maybeSingle();

  if (existingError || !existing) redirect(adminStoriesUrl({ error: "수정할 스토리를 찾을 수 없습니다." }));

  let prepared: Awaited<ReturnType<typeof prepareStoryInput>>;
  try {
    prepared = await prepareStoryInput(formData, existing.cover_image_url ?? "");
  } catch (error) {
    redirect(adminStoriesUrl({ error: error instanceof Error ? error.message : "스토리를 저장하지 못했습니다." }));
  }

  const now = new Date().toISOString();
  const { error } = await prepared.supabase.from("local_stories").update({
    ...prepared.values,
    published_at: prepared.values.status === "published" ? existing.published_at ?? now : null,
    updated_at: now
  }).eq("id", id);

  if (error) {
    if (prepared.uploadedPaths.length) await prepared.supabase.storage.from(STORY_IMAGE_BUCKET).remove(prepared.uploadedPaths);
    redirect(adminStoriesUrl({ error: error.message }));
  }

  revalidateStoryPaths(id);
  redirect(adminStoriesUrl({ updated: "1" }));
}

function revalidateStoryPaths(id?: string) {
  revalidatePath("/admin/stories");
  revalidatePath("/stories");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  if (id) revalidatePath(`/stories/${id}`);
}
