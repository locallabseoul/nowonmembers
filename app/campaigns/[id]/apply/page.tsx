import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getCampaignLifecycle } from "@/lib/campaign-lifecycle";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicCampaign } from "@/lib/supabase/queries";
import { ApplicationForm } from "./application-form";

export default async function CampaignApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireRole("creator", `/campaigns/${id}/apply`);
  const { data: creator } = await supabase.from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle();

  if (!creator) {
    redirect(`/creator/profile?next=${encodeURIComponent(`/campaigns/${id}/apply`)}&error=${encodeURIComponent("캠페인 신청 전 크리에이터 프로필을 완성해주세요.")}`);
  }

  const [campaign, defaults] = await Promise.all([getPublicCampaign(id), getCreatorApplicationDefaults()]);
  if (!campaign) notFound();
  const lifecycle = getCampaignLifecycle(campaign);

  if (!lifecycle.canApply) {
    redirect(`/campaigns/${id}?error=${encodeURIComponent(lifecycle.actionLabel)}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black text-charcoal">캠페인 신청하기</h1>
      <p className="mt-2 text-gray-500">{campaign.title}</p>
      <ApplicationForm
        campaignId={campaign.id}
        selectionDate={campaign.selectionDate}
        submissionDue={campaign.submissionDue}
        defaults={defaults}
      />
    </main>
  );
}

async function getCreatorApplicationDefaults() {
  const empty = {
    applicantName: "",
    channelUrl: "",
    availableDates: "",
    proposedContentType: "블로그",
    message: ""
  };
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser().catch(() => ({
    data: { user: null },
    error: new Error("Failed to read current user")
  }));
  if (authError) return empty;

  const user = authData.user;

  if (!user) return empty;

  const { data } = await supabase
    .from("profiles")
    .select("nickname, creator_profiles(id, bio, available_days, content_types, creator_channels(channel_url))")
    .eq("id", user.id)
    .maybeSingle();

  const creator = Array.isArray(data?.creator_profiles) ? data?.creator_profiles[0] : data?.creator_profiles;
  const channel = Array.isArray(creator?.creator_channels) ? creator?.creator_channels[0] : creator?.creator_channels;
  const firstContentType = creator?.content_types?.[0] ?? empty.proposedContentType;

  return {
    applicantName: data?.nickname ?? "",
    channelUrl: channel?.channel_url ?? "",
    availableDates: creator?.available_days?.length ? creator.available_days.join(", ") : "",
    proposedContentType: normalizeContentType(firstContentType),
    message: creator?.bio ?? ""
  };
}

function normalizeContentType(value: string) {
  if (value.includes("인스타")) return "인스타그램 피드";
  if (value.includes("릴스") || value.includes("쇼츠") || value.includes("숏폼")) return "릴스·쇼츠";
  if (value.includes("사진")) return "사진 콘텐츠";
  if (value.includes("인터뷰")) return "인터뷰";
  return "블로그";
}
