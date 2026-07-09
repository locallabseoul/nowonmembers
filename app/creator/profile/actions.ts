"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function saveCreatorProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) redirect(`/auth?error=${encodeURIComponent("로그인이 필요합니다")}`);

  const nickname = String(formData.get("nickname") ?? "");
  const channelUrl = String(formData.get("channel_url") ?? "");
  const portfolioUrl = String(formData.get("portfolio_url") ?? "");

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    role: "creator",
    nickname,
    verification_status: "pending",
    status: "active"
  });

  if (profileError) redirect(`/creator/profile?error=${encodeURIComponent(profileError.message)}`);

  const { data: creator, error: creatorError } = await supabase
    .from("creator_profiles")
    .upsert({
      user_id: user.id,
      activity_areas: splitList(formData.get("activity_areas")),
      interests: splitList(formData.get("interests")),
      content_types: splitList(formData.get("content_types")),
      available_days: splitList(formData.get("available_days")),
      bio: String(formData.get("bio") ?? ""),
      verification_status: "pending"
    }, { onConflict: "user_id" })
    .select("id")
    .single();

  if (creatorError) redirect(`/creator/profile?error=${encodeURIComponent(creatorError.message)}`);

  if (channelUrl) {
    await supabase.from("creator_channels").insert({
      creator_id: creator.id,
      platform: "primary",
      channel_url: channelUrl
    });
  }

  if (portfolioUrl) {
    await supabase.from("portfolios").insert({
      creator_id: creator.id,
      title: "대표 포트폴리오",
      content_type: "link",
      url: portfolioUrl
    });
  }

  redirect("/creator/dashboard");
}
