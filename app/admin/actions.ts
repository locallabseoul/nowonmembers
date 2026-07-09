"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";

async function requireAdmin() {
  const { supabase } = await requireRole("admin", "/admin");
  return supabase;
}

export async function approveCampaign(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("campaign_id") ?? "");
  const { error } = await supabase.from("campaigns").update({ status: "recruiting" }).eq("id", id);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
  revalidatePath("/campaigns");
}

export async function requestCampaignRevision(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("campaign_id") ?? "");
  const { error } = await supabase.from("campaigns").update({
    status: "revision_requested",
    admin_memo: String(formData.get("admin_memo") ?? "운영자 수정 요청")
  }).eq("id", id);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
}

export async function recommendApplication(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("application_id") ?? "");
  const { error } = await supabase.from("campaign_applications").update({
    status: "recommended",
    admin_memo: String(formData.get("admin_memo") ?? "운영자 추천")
  }).eq("id", id);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
}

export async function selectApplication(formData: FormData) {
  const supabase = await requireAdmin();
  const applicationId = String(formData.get("application_id") ?? "");

  const { data: application, error: applicationError } = await supabase
    .from("campaign_applications")
    .select("id,campaign_id,creator_id,campaigns(submission_due)")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    redirect(`/admin?error=${encodeURIComponent(applicationError?.message ?? "지원서를 찾을 수 없습니다.")}`);
  }

  const campaign = Array.isArray(application.campaigns) ? application.campaigns[0] : application.campaigns;

  const { error: collaborationError } = await supabase.from("collaborations").insert({
    campaign_id: application.campaign_id,
    creator_id: application.creator_id,
    application_id: application.id,
    submission_due: campaign?.submission_due ?? null,
    status: "selected"
  });

  if (collaborationError) redirect(`/admin?error=${encodeURIComponent(collaborationError.message)}`);

  const { error: updateError } = await supabase
    .from("campaign_applications")
    .update({ status: "selected" })
    .eq("id", applicationId);

  if (updateError) redirect(`/admin?error=${encodeURIComponent(updateError.message)}`);

  await supabase.from("campaigns").update({ status: "in_progress" }).eq("id", application.campaign_id);
  revalidatePath("/admin");
}

export async function approveSubmission(formData: FormData) {
  const supabase = await requireAdmin();
  const submissionId = String(formData.get("submission_id") ?? "");

  const { data: submission, error: submissionError } = await supabase
    .from("content_submissions")
    .select("id,collaboration_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission) {
    redirect(`/admin?error=${encodeURIComponent(submissionError?.message ?? "제출물을 찾을 수 없습니다.")}`);
  }

  const { error } = await supabase
    .from("content_submissions")
    .update({ review_status: "approved" })
    .eq("id", submissionId);

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  await supabase.from("collaborations").update({ status: "completed" }).eq("id", submission.collaboration_id);
  revalidatePath("/admin");
}

export async function requestSubmissionRevision(formData: FormData) {
  const supabase = await requireAdmin();
  const submissionId = String(formData.get("submission_id") ?? "");

  const { error } = await supabase
    .from("content_submissions")
    .update({
      review_status: "needs_revision",
      admin_memo: String(formData.get("admin_memo") ?? "제출 콘텐츠 수정 요청")
    })
    .eq("id", submissionId);

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
}

export async function publishLocalStory(formData: FormData) {
  const supabase = await requireAdmin();
  const submissionId = String(formData.get("submission_id") ?? "");

  const { data: submission, error: submissionError } = await supabase
    .from("content_submissions")
    .select(`
      id,
      content_url,
      preview_image_url,
      collaboration_id,
      collaborations(
        campaign_id,
        creator_id,
        campaigns(
          title,
          category,
          business_id,
          description,
          cover_image_url
        )
      )
    `)
    .eq("id", submissionId)
    .eq("review_status", "approved")
    .maybeSingle();

  if (submissionError || !submission) {
    redirect(`/admin?error=${encodeURIComponent(submissionError?.message ?? "승인된 제출물을 찾을 수 없습니다.")}`);
  }

  const collaboration = Array.isArray(submission.collaborations) ? submission.collaborations[0] : submission.collaborations;
  const campaign = Array.isArray(collaboration?.campaigns) ? collaboration?.campaigns[0] : collaboration?.campaigns;

  if (!collaboration || !campaign) {
    redirect(`/admin?error=${encodeURIComponent("로컬 스토리로 발행할 캠페인 정보를 찾을 수 없습니다.")}`);
  }

  const title = `${campaign.title} 로컬 스토리`;
  const { error } = await supabase.from("local_stories").insert({
    title,
    summary: "노원 가게와 지역 크리에이터가 함께 만든 콘텐츠 협업 기록입니다.",
    body: `${campaign.description ?? ""}\n\n콘텐츠 URL: ${submission.content_url}`,
    cover_image_url: submission.preview_image_url ?? campaign.cover_image_url,
    business_id: campaign.business_id,
    creator_id: collaboration.creator_id,
    campaign_id: collaboration.campaign_id,
    category: campaign.category ?? "로컬 스토리",
    published_at: new Date().toISOString()
  });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
  revalidatePath("/stories");
}
