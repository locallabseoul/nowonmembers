"use server";

import { track } from "@vercel/analytics/server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { fieldError, keepValues, type FormState } from "@/lib/form-errors";
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

export async function applyCampaign(_prevState: FormState, formData: FormData): Promise<FormState> {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const { supabase, user } = await requireRole("creator", `/campaigns/${campaignId}/apply`);
  await supabase.rpc("sync_expired_campaigns");

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,status,recruit_count,recruit_end,selection_date,submission_due,applicant_count")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError || !campaign) {
    redirect(`/campaigns?error=${encodeURIComponent("신청 가능한 캠페인을 찾을 수 없습니다.")}`);
  }

  // 지원 내역은 본인 것만 읽히므로 조인으로 세면 정원 확인이 무의미해진다.
  const applicationCount = campaign.applicant_count ?? 0;
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

  const kept = keepValues(formData, ["applicant_name", "channel_url", "proposed_content_type", "message"]);

  if (!minDate || !maxDate || minDate > maxDate) {
    return { formError: "캠페인 방문 가능 기간이 올바르지 않습니다. 운영자에게 문의해주세요.", values: kept };
  }

  if (!availableDates.selectedDates.length) {
    return { ...fieldError("available_dates", "방문 가능한 날짜를 1개 이상 선택해주세요."), values: kept };
  }

  const outOfRangeDate = availableDates.selectedDates.find((date) => !isDateInRange(date, minDate, maxDate));
  if (outOfRangeDate) {
    return {
      ...fieldError(
        "available_dates",
        "방문 가능한 날짜는 선정 발표일 이후부터 콘텐츠 등록 마감일까지 선택해주세요."
      ),
      values: kept
    };
  }

  const { data: creator, error: creatorError } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (creatorError || !creator) {
    redirect(`/creator/profile?next=${encodeURIComponent(`/campaigns/${campaignId}/apply`)}&error=${encodeURIComponent("캠페인 신청 전 크리에이터 프로필을 완성해주세요.")}`);
  }

  const message = String(formData.get("message") ?? "");
  const contentType = String(formData.get("proposed_content_type") ?? "");

  const { error } = await supabase.from("campaign_applications").insert({
    campaign_id: campaignId,
    creator_id: creator.id,
    message,
    available_dates: availableDates.text,
    proposed_content_type: contentType,
    status: "submitted"
  });

  if (error) {
    // unique (campaign_id, creator_id) 때문에 취소한 캠페인에는 다시 지원할 수 없다.
    // 취소된 행이면 되살린다.
    if (error.code !== "23505") {
      return { formError: "신청을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.", values: kept };
    }

    const { error: restoreError } = await supabase.rpc("restore_campaign_application", {
      target_campaign_id: campaignId,
      application_message: message,
      application_available_dates: availableDates.text,
      application_content_type: contentType
    });

    if (restoreError) {
      return { formError: restoreError.message, values: kept };
    }
  }

  await track("campaign_applied").catch(() => {});

  redirect("/creator/dashboard");
}
