"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getKoreaTodayString } from "@/lib/campaign-lifecycle";

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
  const { supabase, user } = await requireRole("business", "/business/campaigns/new");
  const title = String(formData.get("title") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const benefitValue = String(formData.get("benefit_value") ?? "").trim();
  const recruitCount = Number(formData.get("recruit_count") ?? 0);
  const recruitEnd = String(formData.get("recruit_end") ?? "");

  if (!title || !region || !description || !benefitValue || !recruitCount || !recruitEnd) {
    redirect(`/business/campaigns/new?error=${encodeURIComponent("캠페인 제목, 지역, 모집 인원, 모집 마감일, 제공 내역, 상세 설명을 입력해주세요.")}`);
  }

  if (recruitEnd < getKoreaTodayString()) {
    redirect(`/business/campaigns/new?error=${encodeURIComponent("모집 마감일은 오늘 또는 이후 날짜로 설정해주세요.")}`);
  }

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
    title,
    description,
    campaign_type: String(formData.get("campaign_type") ?? "visit"),
    region,
    category: String(formData.get("category") ?? ""),
    recruit_count: recruitCount,
    recruit_start: String(formData.get("recruit_start") ?? "") || null,
    recruit_end: recruitEnd,
    selection_date: String(formData.get("selection_date") ?? "") || null,
    visit_start: String(formData.get("visit_start") ?? "") || null,
    visit_end: String(formData.get("visit_end") ?? "") || null,
    submission_due: String(formData.get("submission_due") ?? "") || null,
    benefit_type: String(formData.get("benefit_type") ?? ""),
    benefit_value: benefitValue,
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
