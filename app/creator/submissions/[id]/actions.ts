"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function submitContent(formData: FormData) {
  const collaborationId = String(formData.get("collaboration_id") ?? "");
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) redirect(`/auth?error=${encodeURIComponent("로그인이 필요합니다")}`);

  const { data: collaboration } = await supabase
    .from("collaborations")
    .select("id")
    .eq("id", collaborationId)
    .maybeSingle();

  if (!collaboration) {
    redirect(`/creator/submissions/${collaborationId}?error=${encodeURIComponent("제출 가능한 협업을 찾을 수 없습니다.")}`);
  }

  const { error } = await supabase.from("content_submissions").insert({
    collaboration_id: collaborationId,
    platform: String(formData.get("platform") ?? ""),
    content_url: String(formData.get("content_url") ?? ""),
    published_at: String(formData.get("published_at") ?? "") || null,
    preview_image_url: String(formData.get("preview_image_url") ?? "") || null,
    disclosure_confirmed: formData.get("disclosure_confirmed") === "on",
    review_status: "submitted"
  });

  if (error) redirect(`/creator/submissions/${collaborationId}?error=${encodeURIComponent(error.message)}`);

  await supabase.from("collaborations").update({ status: "submitted" }).eq("id", collaborationId);
  redirect("/creator/dashboard");
}
