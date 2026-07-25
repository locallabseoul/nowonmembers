"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getKoreaTodayString } from "@/lib/campaign-lifecycle";

async function requireAdmin() {
  const { supabase } = await requireRole("admin", "/admin");
  return supabase;
}

const ACTIVE_COLLABORATION_STATUSES = ["selected", "visit_scheduled", "visited", "submitted", "revision_requested", "approved", "completed"];

type Relation<T> = T | T[] | null | undefined;

function asRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] : value ?? null;
}

async function refreshCampaignSubmissionStatus(supabase: Awaited<ReturnType<typeof requireAdmin>>, campaignId: string) {
  const { data, error } = await supabase
    .from("collaborations")
    .select("id,status")
    .eq("campaign_id", campaignId)
    .in("status", ACTIVE_COLLABORATION_STATUSES);

  if (error || !data?.length) return;

  const allCompleted = data.every((collaboration) => collaboration.status === "completed");
  await supabase
    .from("campaigns")
    .update({ status: allCompleted ? "completed" : "submission_review" })
    .eq("id", campaignId)
    .in("status", ["in_progress", "submission_review", "completed"]);
}

export async function approveCampaign(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("campaign_id") ?? "");

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id,status,recruit_start,recruit_end,billing_mode,campaign_point_reservations(status)")
    .eq("id", id)
    .maybeSingle();

  if (campaignError || !campaign) {
    redirect(`/admin?error=${encodeURIComponent(campaignError?.message ?? "승인할 캠페인을 찾을 수 없습니다.")}`);
  }

  if (!["in_review", "revision_requested"].includes(campaign.status)) {
    redirect(`/admin?error=${encodeURIComponent("검수 대기 또는 수정 요청 상태의 캠페인만 승인할 수 있습니다.")}`);
  }

  const today = getKoreaTodayString();
  if (campaign.recruit_end && campaign.recruit_end < today) {
    redirect(`/admin?error=${encodeURIComponent("모집 마감일이 지난 캠페인은 승인할 수 없습니다.")}`);
  }

  const reservation = Array.isArray(campaign.campaign_point_reservations)
    ? campaign.campaign_point_reservations[0]
    : campaign.campaign_point_reservations;
  if (campaign.billing_mode === "points_v1" && reservation?.status !== "reserved") {
    redirect(`/admin?error=${encodeURIComponent("활성 포인트 예약이 없는 캠페인은 승인할 수 없습니다.")}`);
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ status: "recruiting", recruit_start: campaign.recruit_start ?? today })
    .eq("id", id);

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
}

export async function rejectCampaign(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("campaign_id") ?? "");
  const reason = String(formData.get("admin_memo") ?? "관리자 검수 반려").trim();
  const { error } = await supabase.rpc("admin_reject_campaign", {
    target_campaign_id: id,
    target_reason: reason,
    target_idempotency_key: `admin_reject:${id}`
  });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
  revalidatePath("/business/dashboard");
  redirect(`/admin?message=${encodeURIComponent("캠페인을 반려하고 예약 포인트를 반환했습니다.")}`);
}

export async function adjustBusinessPoints(formData: FormData) {
  const supabase = await requireAdmin();
  const businessId = String(formData.get("business_id") ?? "");
  const points = Number(formData.get("points") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 500_000 || Math.abs(points) % 5_000 !== 0 || !reason) {
    redirect(`/admin?error=${encodeURIComponent("조정 포인트와 사유를 정확히 입력해주세요.")}`);
  }

  const { error } = await supabase.rpc("admin_adjust_business_points", {
    target_business_id: businessId,
    target_points: points,
    target_reason: reason,
    target_idempotency_key: `admin_adjust:${randomUUID()}`
  });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
  revalidatePath("/business/dashboard");
  revalidatePath("/business/points");
  redirect(`/admin?message=${encodeURIComponent("가게 포인트를 조정했습니다.")}`);
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

export async function createNotice(formData: FormData) {
  const supabase = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "draft");
  const status = rawStatus === "published" ? "published" : "draft";
  const isPinned = formData.get("is_pinned") === "on";

  if (!title || !body) {
    redirect(`/admin?error=${encodeURIComponent("공지 제목과 본문을 입력해주세요.")}`);
  }

  if (isPinned && status !== "published") {
    redirect(`/admin?error=${encodeURIComponent("상단 고정 공지는 공개 상태로 등록해주세요.")}`);
  }

  if (isPinned) {
    const { error: unpinError } = await supabase
      .from("notices")
      .update({ is_pinned: false })
      .eq("is_pinned", true);

    if (unpinError) redirect(`/admin?error=${encodeURIComponent(unpinError.message)}`);
  }

  const { error } = await supabase.from("notices").insert({
    title,
    body,
    status,
    is_pinned: isPinned,
    published_at: status === "published" ? new Date().toISOString() : null
  });

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/notices");
  revalidatePath("/", "layout");
  redirect("/admin?noticeCreated=1");
}

export async function updateNotice(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("notice_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "draft");
  const status = rawStatus === "published" ? "published" : "draft";
  const isPinned = formData.get("is_pinned") === "on";

  if (!id || !title || !body) {
    redirect(`/admin?error=${encodeURIComponent("공지 제목과 본문을 입력해주세요.")}`);
  }

  if (isPinned && status !== "published") {
    redirect(`/admin?error=${encodeURIComponent("상단 고정 공지는 공개 상태로 저장해주세요.")}`);
  }

  const { data: notice, error: noticeError } = await supabase
    .from("notices")
    .select("id,published_at")
    .eq("id", id)
    .maybeSingle();

  if (noticeError || !notice) {
    redirect(`/admin?error=${encodeURIComponent(noticeError?.message ?? "수정할 공지를 찾을 수 없습니다.")}`);
  }

  if (isPinned) {
    const { error: unpinError } = await supabase
      .from("notices")
      .update({ is_pinned: false })
      .eq("is_pinned", true)
      .neq("id", id);

    if (unpinError) redirect(`/admin?error=${encodeURIComponent(unpinError.message)}`);
  }

  const { error } = await supabase
    .from("notices")
    .update({
      title,
      body,
      status,
      is_pinned: isPinned,
      published_at: status === "published" ? notice.published_at ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/notices");
  revalidatePath(`/notices/${id}`);
  revalidatePath("/", "layout");
  redirect("/admin?noticeUpdated=1");
}

export async function recommendApplication(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("application_id") ?? "");

  const { data: application, error: applicationError } = await supabase
    .from("campaign_applications")
    .select("id,status,campaigns(status)")
    .eq("id", id)
    .maybeSingle();

  if (applicationError || !application) {
    redirect(`/admin?error=${encodeURIComponent(applicationError?.message ?? "추천할 지원서를 찾을 수 없습니다.")}`);
  }

  if (application.status !== "submitted") {
    redirect(`/admin?error=${encodeURIComponent("신규 제출 상태의 지원서만 추천할 수 있습니다.")}`);
  }

  const campaign = Array.isArray(application.campaigns) ? application.campaigns[0] : application.campaigns;
  if (!campaign || !["recruiting", "selecting"].includes(campaign.status)) {
    redirect(`/admin?error=${encodeURIComponent("모집중 또는 선정중 캠페인의 지원서만 추천할 수 있습니다.")}`);
  }

  const { error } = await supabase.from("campaign_applications").update({
    status: "recommended",
    admin_memo: String(formData.get("admin_memo") ?? "운영자 추천")
  }).eq("id", id).eq("status", "submitted");

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
  revalidatePath("/business/dashboard");
}

export async function unrecommendApplication(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("application_id") ?? "");

  const { data: application, error: applicationError } = await supabase
    .from("campaign_applications")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();

  if (applicationError || !application) {
    redirect(`/admin?error=${encodeURIComponent(applicationError?.message ?? "추천 해제할 지원서를 찾을 수 없습니다.")}`);
  }

  if (application.status !== "recommended") {
    redirect(`/admin?error=${encodeURIComponent("추천 상태의 지원서만 추천 해제할 수 있습니다.")}`);
  }

  const { error } = await supabase
    .from("campaign_applications")
    .update({ status: "submitted", admin_memo: null })
    .eq("id", id)
    .eq("status", "recommended");

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
  revalidatePath("/business/dashboard");
}

export async function approveSubmission(formData: FormData) {
  const supabase = await requireAdmin();
  const submissionId = String(formData.get("submission_id") ?? "");

  const { data: submission, error: submissionError } = await supabase
    .from("content_submissions")
    .select("id,collaboration_id,collaborations(campaign_id)")
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
  const collaboration = asRelation(submission.collaborations);
  if (collaboration?.campaign_id) {
    await refreshCampaignSubmissionStatus(supabase, collaboration.campaign_id);
  }

  revalidatePath("/admin");
  revalidatePath("/business/dashboard");
  revalidatePath("/campaigns");
}

export async function requestSubmissionRevision(formData: FormData) {
  const supabase = await requireAdmin();
  const submissionId = String(formData.get("submission_id") ?? "");

  const { data: submission, error: submissionError } = await supabase
    .from("content_submissions")
    .select("id,collaboration_id,collaborations(campaign_id)")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission) {
    redirect(`/admin?error=${encodeURIComponent(submissionError?.message ?? "제출물을 찾을 수 없습니다.")}`);
  }

  const { error } = await supabase
    .from("content_submissions")
    .update({
      review_status: "needs_revision",
      admin_memo: String(formData.get("admin_memo") ?? "제출 콘텐츠 수정 요청")
    })
    .eq("id", submissionId);

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  await supabase.from("collaborations").update({ status: "revision_requested" }).eq("id", submission.collaboration_id);
  const collaboration = asRelation(submission.collaborations);
  if (collaboration?.campaign_id) {
    await refreshCampaignSubmissionStatus(supabase, collaboration.campaign_id);
  }

  revalidatePath("/admin");
  revalidatePath("/business/dashboard");
  revalidatePath("/campaigns");
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
