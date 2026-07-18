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
  const { supabase } = await requireRole("business", "/business/dashboard");

  const { error } = await supabase.rpc("select_campaign_application", {
    target_application_id: applicationId
  });

  if (error) redirect(`/business/dashboard?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/business/dashboard");
  revalidatePath("/admin");
  revalidatePath("/creator/dashboard");
  revalidatePath("/campaigns");
  redirect("/business/dashboard");
}
