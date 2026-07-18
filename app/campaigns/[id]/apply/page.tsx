import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getCampaignLifecycle } from "@/lib/campaign-lifecycle";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicCampaign } from "@/lib/supabase/queries";
import { applyCampaign } from "./actions";

export default async function CampaignApplyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, user } = await requireRole("creator", `/campaigns/${id}/apply`);
  const { data: creator } = await supabase.from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle();

  if (!creator) {
    redirect(`/creator/profile?error=${encodeURIComponent("캠페인 신청 전 크리에이터 프로필을 완성해주세요.")}`);
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
      {error ? <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}
      <form action={applyCampaign} className="mt-8 space-y-6 rounded-lg border border-line bg-white p-6 shadow-sm">
        <input type="hidden" name="campaign_id" value={campaign.id} />
        <Field name="applicant_name" label="신청자 이름" placeholder="김노원" defaultValue={defaults.applicantName} />
        <Field name="channel_url" label="운영 채널 URL" placeholder="https://blog.naver.com/..." defaultValue={defaults.channelUrl} />
        <Field name="available_dates" label="방문 가능한 날짜" placeholder="예: 7월 24일 오후, 7월 27일 오전" defaultValue={defaults.availableDates} />
        <label className="block">
          <span className="mb-2 block text-sm font-black text-charcoal">제작하려는 콘텐츠 형식</span>
          <select name="proposed_content_type" defaultValue={defaults.proposedContentType} className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring">
            <option>블로그</option>
            <option>인스타그램 피드</option>
            <option>릴스·쇼츠</option>
            <option>사진 콘텐츠</option>
            <option>인터뷰</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black text-charcoal">신청 한마디</span>
          <textarea name="message" defaultValue={defaults.message} className="min-h-32 w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="캠페인 진행 방향이나 제안하고 싶은 콘텐츠 아이디어를 적어주세요." />
        </label>
        <div className="rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-600">
          제공 사실 표시, 사전 합의된 콘텐츠 형식, 방문 일정 준수에 동의합니다. 긍정 표현 강요나 허위 경험 작성은 노원멤버스 원칙에 맞지 않습니다.
        </div>
        <button className="w-full rounded-lg bg-primary px-5 py-3 font-black text-white hover:bg-primaryHover">신청 완료하기</button>
      </form>
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
  const { data: authData } = await supabase.auth.getUser();
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

function Field({ name, label, placeholder, defaultValue = "" }: { name: string; label: string; placeholder: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-charcoal">{label}</span>
      <input name={name} defaultValue={defaultValue} className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder={placeholder} />
    </label>
  );
}
