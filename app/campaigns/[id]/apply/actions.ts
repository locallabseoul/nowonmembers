"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";

export async function applyCampaign(formData: FormData) {
  const campaignId = String(formData.get("campaign_id") ?? "");
  const { supabase, user } = await requireRole("creator", `/campaigns/${campaignId}/apply`);

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
