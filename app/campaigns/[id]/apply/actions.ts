"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getCampaignLifecycle } from "@/lib/campaign-lifecycle";
import type { Campaign } from "@/lib/types";

function parseDateInput(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function parseDateList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((date) => parseDateInput(date))
    .filter(Boolean);
}

function formatApplyDate(value: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(date);
}

function normalizeAvailableDates(formData: FormData) {
  const selectedDates = Array.from(new Set(parseDateList(formData.get("available_date_values")))).sort();
  const note = String(formData.get("available_dates_note") ?? "").trim();

  return {
    selectedDates,
    text: [
      ...selectedDates.map(formatApplyDate),
      note
    ].filter(Boolean).join(", ")
  };
}

function isDateInRange(value: string, minDate: string, maxDate: string) {
  return value >= minDate && value <= maxDate;
}

export async function applyCampaign(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const { supabase, user } = await requireRole("creator", `/campaigns/${campaignId}/apply`);
  await supabase.rpc("sync_expired_campaigns");

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,status,recruit_count,recruit_end,selection_date,submission_due,campaign_applications(count)")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError || !campaign) {
    redirect(`/campaigns?error=${encodeURIComponent("신청 가능한 캠페인을 찾을 수 없습니다.")}`);
  }

  const applicationCount = Array.isArray(campaign.campaign_applications)
    ? campaign.campaign_applications[0]?.count ?? 0
    : 0;
  const lifecycle = getCampaignLifecycle({
    status: campaign.status as Campaign["status"],
    recruitEnd: campaign.recruit_end ?? "",
    recruitCount: campaign.recruit_count,
    appliedCount: applicationCount
  });

  if (!lifecycle.canApply) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(lifecycle.actionLabel)}`);
  }

  const minDate = parseDateInput(campaign.selection_date);
  const maxDate = parseDateInput(campaign.submission_due);
  const availableDates = normalizeAvailableDates(formData);

  if (!minDate || !maxDate || minDate > maxDate) {
    redirect(`/campaigns/${campaignId}/apply?error=${encodeURIComponent("캠페인 방문 가능 기간이 올바르지 않습니다. 운영자에게 문의해주세요.")}`);
  }

  if (!availableDates.selectedDates.length) {
    redirect(`/campaigns/${campaignId}/apply?error=${encodeURIComponent("방문 가능한 날짜를 1개 이상 선택해주세요.")}`);
  }

  const outOfRangeDate = availableDates.selectedDates.find((date) => !isDateInRange(date, minDate, maxDate));
  if (outOfRangeDate) {
    redirect(`/campaigns/${campaignId}/apply?error=${encodeURIComponent("방문 가능한 날짜는 선정 발표일 이후부터 콘텐츠 등록 마감일까지 선택해주세요.")}`);
  }

  const { data: creator, error: creatorError } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (creatorError || !creator) {
    redirect(`/creator/profile?next=${encodeURIComponent(`/campaigns/${campaignId}/apply`)}&error=${encodeURIComponent("캠페인 신청 전 크리에이터 프로필을 완성해주세요.")}`);
  }

  const { error } = await supabase.from("campaign_applications").insert({
    campaign_id: campaignId,
    creator_id: creator.id,
    message: String(formData.get("message") ?? ""),
    available_dates: availableDates.text,
    proposed_content_type: String(formData.get("proposed_content_type") ?? ""),
    status: "submitted"
  });

  if (error) redirect(`/campaigns/${campaignId}/apply?error=${encodeURIComponent(error.message)}`);
  redirect("/creator/dashboard");
}
