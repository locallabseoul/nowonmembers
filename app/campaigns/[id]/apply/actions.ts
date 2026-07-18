"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getCampaignLifecycle } from "@/lib/campaign-lifecycle";
import type { Campaign } from "@/lib/types";

export async function applyCampaign(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const { supabase, user } = await requireRole("creator", `/campaigns/${campaignId}/apply`);
  await supabase.rpc("sync_expired_campaigns");

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,status,recruit_count,recruit_end,campaign_applications(count)")
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

  const { data: creator, error: creatorError } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (creatorError || !creator) {
    redirect(`/creator/profile?error=${encodeURIComponent("캠페인 신청 전 크리에이터 프로필을 완성해주세요.")}`);
  }

  const { error } = await supabase.from("campaign_applications").insert({
    campaign_id: campaignId,
    creator_id: creator.id,
    message: String(formData.get("message") ?? ""),
    available_dates: String(formData.get("available_dates") ?? ""),
    proposed_content_type: String(formData.get("proposed_content_type") ?? ""),
    status: "submitted"
  });

  if (error) redirect(`/campaigns/${campaignId}/apply?error=${encodeURIComponent(error.message)}`);
  redirect("/creator/dashboard");
}
