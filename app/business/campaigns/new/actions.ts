"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function splitLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/[^0-9]/g, "");
  return raw ? Number(raw) : null;
}

export async function createCampaign(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) redirect(`/auth?error=${encodeURIComponent("로그인이 필요합니다")}`);

  const { data: business, error: businessError } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (businessError || !business) {
    redirect(`/business/dashboard?error=${encodeURIComponent("캠페인 생성 전 가게 프로필을 먼저 등록해주세요.")}`);
  }

  const { error } = await supabase.from("campaigns").insert({
    business_id: business.id,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    campaign_type: String(formData.get("campaign_type") ?? "visit"),
    region: String(formData.get("region") ?? ""),
    category: String(formData.get("category") ?? ""),
    recruit_count: Number(formData.get("recruit_count") ?? 1),
    recruit_start: String(formData.get("recruit_start") ?? "") || null,
    recruit_end: String(formData.get("recruit_end") ?? "") || null,
    selection_date: String(formData.get("selection_date") ?? "") || null,
    visit_start: String(formData.get("visit_start") ?? "") || null,
    visit_end: String(formData.get("visit_end") ?? "") || null,
    submission_due: String(formData.get("submission_due") ?? "") || null,
    benefit_type: String(formData.get("benefit_type") ?? ""),
    benefit_value: String(formData.get("benefit_value") ?? ""),
    fee: toNullableNumber(formData.get("fee")),
    content_requirements: splitLines(formData.get("content_requirements")),
    usage_rights: String(formData.get("usage_rights") ?? ""),
    status: "in_review",
    cover_image_url: String(formData.get("cover_image_url") ?? "") || null,
    beginner_friendly: formData.get("beginner_friendly") === "on"
  });

  if (error) redirect(`/business/campaigns/new?error=${encodeURIComponent(error.message)}`);
  redirect("/business/dashboard");
}
