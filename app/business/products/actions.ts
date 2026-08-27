"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { logEvent } from "@/lib/events";

const PRODUCT_IMAGE_BUCKET = "product-images";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const echoedFields = ["name", "short_description", "price", "link_url", "is_visible"] as const;

export type ProductFormState = { error: string; values: Record<string, string> } | null;

function echoValues(formData: FormData) {
  return Object.fromEntries(echoedFields.map((field) => [field, String(formData.get(field) ?? "")]));
}

function parseProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const shortDescription = String(formData.get("short_description") ?? "").trim();
  const price = Number(formData.get("price"));
  const linkUrl = String(formData.get("link_url") ?? "").trim();
  const isVisible = String(formData.get("is_visible") ?? "") === "true";
  if (!name || !shortDescription || !linkUrl) throw new Error("필수 항목을 모두 입력해주세요.");
  if (name.length > 100) throw new Error("제품명은 100자 이하로 입력해주세요.");
  if (shortDescription.length > 200) throw new Error("제품 소개는 200자 이하로 입력해주세요.");
  if (!Number.isInteger(price) || price < 0 || price > 1_000_000_000) throw new Error("가격은 0원 이상 10억원 이하의 원 단위로 입력해주세요.");
  try {
    const url = new URL(linkUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    throw new Error("구매 링크는 http:// 또는 https://로 시작하는 주소여야 합니다.");
  }
  return { name, short_description: shortDescription, price, link_url: linkUrl, is_visible: isVisible };
}

async function uploadImage(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  userId: string,
  formData: FormData
) {
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.has(image.type)) throw new Error("대표 이미지는 JPG, PNG, WEBP만 업로드할 수 있습니다.");
  if (image.size > 10 * 1024 * 1024) throw new Error("대표 이미지는 10MB 이하여야 합니다.");
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/products/${Date.now()}-${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, image, {
    contentType: image.type,
    cacheControl: "31536000"
  });
  if (error) throw new Error(error.message);
  return { path, url: supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl };
}

async function revalidateProductPaths(slug?: string | null) {
  revalidatePath("/business/products");
  revalidatePath("/business/minihome");
  if (slug) revalidatePath(`/${slug}`);
}

export async function saveProduct(_previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const productId = String(formData.get("product_id") ?? "");
  const returnPath = productId ? `/business/products/${productId}/edit` : "/business/products/new";
  const { supabase, user } = await requireRole("business", returnPath);
  const submitted = echoValues(formData);
  const reject = (message: string): ProductFormState => {
    logEvent("product.save_failed", { error: message, productId });
    return { error: message, values: submitted };
  };

  const { data: business } = await supabase.from("business_profiles").select("id,slug").eq("user_id", user.id).maybeSingle();
  if (!business) return reject("가게 프로필을 먼저 등록해주세요.");
  const { data: existing } = productId
    ? await supabase.from("business_products").select("id,image_url,image_path").eq("id", productId).eq("business_id", business.id).maybeSingle()
    : { data: null };
  if (productId && !existing) return reject("제품을 찾을 수 없습니다.");

  let values: ReturnType<typeof parseProduct>;
  let uploaded: Awaited<ReturnType<typeof uploadImage>> = null;
  try {
    values = parseProduct(formData);
    uploaded = await uploadImage(supabase, user.id, formData);
    if (!uploaded && !existing?.image_url) throw new Error("대표 이미지를 등록해주세요.");
  } catch (error) {
    return reject(error instanceof Error ? error.message : "제품을 저장할 수 없습니다.");
  }

  const imageUrl = uploaded?.url ?? existing?.image_url ?? "";
  const imagePath = uploaded?.path ?? existing?.image_path ?? "";
  const query = productId
    ? supabase.from("business_products").update({ ...values, image_url: imageUrl, image_path: imagePath, updated_at: new Date().toISOString() }).eq("id", productId).eq("business_id", business.id)
    : supabase.from("business_products").insert({ ...values, business_id: business.id, image_url: imageUrl, image_path: imagePath });
  const { error } = await query;
  if (error) {
    if (uploaded) await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([uploaded.path]);
    return reject(error.message);
  }
  if (uploaded && existing?.image_path) await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([existing.image_path]);

  await revalidateProductPaths(business.slug);
  redirect(`/business/products?message=${encodeURIComponent(productId ? "제품을 수정했습니다." : "제품을 등록했습니다.")}`);
}

export async function toggleProductVisibility(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  const isVisible = String(formData.get("is_visible") ?? "") === "true";
  const { supabase, user } = await requireRole("business", "/business/products");
  const { data: business } = await supabase.from("business_profiles").select("id,slug").eq("user_id", user.id).maybeSingle();
  if (!business) redirect("/business/dashboard?error=가게 프로필을 먼저 등록해주세요.");
  const { error } = await supabase.from("business_products").update({ is_visible: isVisible, updated_at: new Date().toISOString() }).eq("id", productId).eq("business_id", business.id);
  if (error) redirect(`/business/products?error=${encodeURIComponent(error.message)}`);
  await revalidateProductPaths(business.slug);
  redirect(`/business/products?message=${encodeURIComponent(isVisible ? "제품을 미니홈에 공개했습니다." : "제품을 숨겼습니다.")}`);
}

export async function deleteProduct(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "");
  const { supabase, user } = await requireRole("business", "/business/products");
  const { data: business } = await supabase.from("business_profiles").select("id,slug").eq("user_id", user.id).maybeSingle();
  if (!business) redirect("/business/dashboard?error=가게 프로필을 먼저 등록해주세요.");
  const { data: product } = await supabase.from("business_products").select("image_path").eq("id", productId).eq("business_id", business.id).maybeSingle();
  if (!product) redirect("/business/products?error=제품을 찾을 수 없습니다.");
  const { error } = await supabase.from("business_products").delete().eq("id", productId).eq("business_id", business.id);
  if (error) redirect(`/business/products?error=${encodeURIComponent(error.message)}`);
  if (product.image_path) await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([product.image_path]);
  await revalidateProductPaths(business.slug);
  redirect(`/business/products?message=${encodeURIComponent("제품을 삭제했습니다.")}`);
}
