"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";

function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveBusinessProfile(formData: FormData) {
  const { supabase, user } = await requireRole("business", "/business/dashboard");

  const { error: profileError } = await supabase.from("profiles").update({
    email: user.email,
    nickname: String(formData.get("business_name") ?? "")
  }).eq("id", user.id);

  if (profileError) redirect(`/business/dashboard?error=${encodeURIComponent(profileError.message)}`);

  const businessHours = String(formData.get("business_hours") ?? "");
  const { error } = await supabase.from("business_profiles").upsert({
    user_id: user.id,
    business_name: String(formData.get("business_name") ?? ""),
    category: String(formData.get("category") ?? ""),
    short_intro: String(formData.get("short_intro") ?? ""),
    description: String(formData.get("description") ?? ""),
    address: String(formData.get("address") ?? ""),
    district: String(formData.get("district") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    business_hours: businessHours ? { default: businessHours } : {},
    website_url: String(formData.get("website_url") ?? "") || null,
    social_urls: splitList(formData.get("social_urls")),
    cover_image_url: String(formData.get("cover_image_url") ?? "") || null,
    verification_status: "pending",
    is_public: false
  }, { onConflict: "user_id" });

  if (error) redirect(`/business/dashboard?error=${encodeURIComponent(error.message)}`);
  redirect("/business/dashboard");
}

export async function approveRecommendedApplication(formData: FormData) {
  const applicationId = String(formData.get("application_id") ?? "");
  const { supabase, user } = await requireRole("business", "/business/dashboard");

  const { data: application, error: applicationError } = await supabase
    .from("campaign_applications")
    .select(`
      id,
      campaign_id,
      creator_id,
      status,
      campaigns(
        submission_due,
        business_profiles(user_id)
      )
    `)
    .eq("id", applicationId)
    .eq("status", "recommended")
    .maybeSingle();

  if (applicationError || !application) {
    redirect(`/business/dashboard?error=${encodeURIComponent(applicationError?.message ?? "추천 지원서를 찾을 수 없습니다.")}`);
  }

  const campaign = Array.isArray(application.campaigns) ? application.campaigns[0] : application.campaigns;
  const businessProfile = Array.isArray(campaign?.business_profiles) ? campaign?.business_profiles[0] : campaign?.business_profiles;

  if (businessProfile?.user_id !== user.id) {
    redirect(`/business/dashboard?error=${encodeURIComponent("해당 캠페인의 가게 계정만 선정할 수 있습니다.")}`);
  }

  const { error: collaborationError } = await supabase.from("collaborations").insert({
    campaign_id: application.campaign_id,
    creator_id: application.creator_id,
    application_id: application.id,
    submission_due: campaign?.submission_due ?? null,
    status: "selected"
  });

  if (collaborationError) {
    redirect(`/business/dashboard?error=${encodeURIComponent(collaborationError.message)}`);
  }

  const { error: updateError } = await supabase
    .from("campaign_applications")
    .update({ status: "selected" })
    .eq("id", application.id);

  if (updateError) {
    redirect(`/business/dashboard?error=${encodeURIComponent(updateError.message)}`);
  }

  await supabase.from("campaigns").update({ status: "in_progress" }).eq("id", application.campaign_id);
  revalidatePath("/business/dashboard");
  redirect("/business/dashboard");
}
