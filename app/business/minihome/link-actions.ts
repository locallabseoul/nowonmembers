"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { parseMinihomeLinkInput } from "@/lib/minihome-link-input";

const MANAGE_PATH = "/business/minihome";
const MAX_LINK_COUNT = 20;

function resultUrl(kind: "error" | "message", message: string) {
  return `${MANAGE_PATH}?${kind}=${encodeURIComponent(message)}#links`;
}

function revalidateMinihomeLinks(slug?: string | null) {
  revalidatePath(MANAGE_PATH);
  if (slug) revalidatePath(`/${slug}`);
}

async function getOwnedBusiness() {
  const { supabase, user } = await requireRole("business", MANAGE_PATH);
  const { data: business } = await supabase.from("business_profiles").select("id,slug").eq("user_id", user.id).maybeSingle();
  if (!business) redirect(resultUrl("error", "가게 프로필을 먼저 등록해주세요."));
  return { supabase, business };
}

function readLink(formData: FormData) {
  return parseMinihomeLinkInput(
    String(formData.get("title") ?? ""),
    String(formData.get("url") ?? "")
  );
}

export async function createMinihomeLink(formData: FormData) {
  let values: ReturnType<typeof readLink>;
  try {
    values = readLink(formData);
  } catch (error) {
    redirect(resultUrl("error", error instanceof Error ? error.message : "링크를 등록할 수 없습니다."));
  }

  const { supabase, business } = await getOwnedBusiness();
  const { count } = await supabase
    .from("business_minihome_links")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);
  if ((count ?? 0) >= MAX_LINK_COUNT) redirect(resultUrl("error", `외부 링크는 최대 ${MAX_LINK_COUNT}개까지 등록할 수 있습니다.`));

  const { data: lastLink } = await supabase
    .from("business_minihome_links")
    .select("sort_order")
    .eq("business_id", business.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("business_minihome_links").insert({
    business_id: business.id,
    ...values,
    is_visible: true,
    sort_order: (lastLink?.sort_order ?? -1) + 1
  });
  if (error) redirect(resultUrl("error", "링크를 등록할 수 없습니다. 잠시 후 다시 시도해주세요."));

  revalidateMinihomeLinks(business.slug);
  redirect(resultUrl("message", "외부 링크를 등록했습니다."));
}

export async function updateMinihomeLink(formData: FormData) {
  const linkId = String(formData.get("link_id") ?? "");
  let values: ReturnType<typeof readLink>;
  try {
    values = readLink(formData);
  } catch (error) {
    redirect(resultUrl("error", error instanceof Error ? error.message : "링크를 수정할 수 없습니다."));
  }

  const { supabase, business } = await getOwnedBusiness();
  const { data, error } = await supabase
    .from("business_minihome_links")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("business_id", business.id)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(resultUrl("error", "수정할 링크를 찾을 수 없습니다."));

  revalidateMinihomeLinks(business.slug);
  redirect(resultUrl("message", "외부 링크를 수정했습니다."));
}

export async function toggleMinihomeLinkVisibility(formData: FormData) {
  const linkId = String(formData.get("link_id") ?? "");
  const isVisible = String(formData.get("is_visible") ?? "") === "true";
  const { supabase, business } = await getOwnedBusiness();
  const { data, error } = await supabase
    .from("business_minihome_links")
    .update({ is_visible: isVisible, updated_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("business_id", business.id)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(resultUrl("error", "링크 공개 상태를 변경할 수 없습니다."));

  revalidateMinihomeLinks(business.slug);
  redirect(resultUrl("message", isVisible ? "외부 링크를 공개했습니다." : "외부 링크를 숨겼습니다."));
}

export async function deleteMinihomeLink(formData: FormData) {
  const linkId = String(formData.get("link_id") ?? "");
  const { supabase, business } = await getOwnedBusiness();
  const { data, error } = await supabase
    .from("business_minihome_links")
    .delete()
    .eq("id", linkId)
    .eq("business_id", business.id)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(resultUrl("error", "삭제할 링크를 찾을 수 없습니다."));

  revalidateMinihomeLinks(business.slug);
  redirect(resultUrl("message", "외부 링크를 삭제했습니다."));
}
