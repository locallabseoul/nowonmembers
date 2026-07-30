import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { getBusinessDashboard } from "@/lib/supabase/queries";
import { campaignMissionOptions } from "@/lib/campaign-options";
import { CampaignEditForm, type CampaignEditValues } from "./campaign-edit-form";

const EDITABLE_STATUSES = ["draft", "revision_requested"];

type ContentRequirements = {
  keywords?: unknown;
  requirements?: unknown;
};

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function CampaignEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireRole("business", `/business/campaigns/${id}/edit`);

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, business_profiles!inner(user_id), campaign_point_reservations(reserved_points,status)")
    .eq("id", id)
    .maybeSingle();

  if (!campaign) notFound();

  const owner = Array.isArray(campaign.business_profiles) ? campaign.business_profiles[0] : campaign.business_profiles;
  if (owner?.user_id !== user.id) notFound();

  if (!EDITABLE_STATUSES.includes(campaign.status)) {
    redirect(
      `/business/dashboard?campaign=${id}&error=${encodeURIComponent(
        "초안 또는 수정 요청 상태의 캠페인만 수정할 수 있습니다."
      )}`
    );
  }

  const { business } = await getBusinessDashboard();
  if (!business) redirect("/business/dashboard");

  const requirements = (campaign.content_requirements ?? {}) as ContentRequirements;
  // 저장할 때 미션 선택지와 자유 서술을 한 배열로 합치므로, 편집 화면에서는 다시 나눈다.
  const allRequirements = toStringArray(requirements.requirements);
  const checkedMissions = allRequirements.filter((item) => campaignMissionOptions.includes(item));
  const freeRequirements = allRequirements.filter((item) => !campaignMissionOptions.includes(item));
  const reservation = Array.isArray(campaign.campaign_point_reservations)
    ? campaign.campaign_point_reservations[0]
    : campaign.campaign_point_reservations;

  const values: CampaignEditValues = {
    id: campaign.id,
    status: campaign.status,
    adminMemo: campaign.admin_memo ?? "",
    category: campaign.category ?? "",
    title: campaign.title ?? "",
    campaignType: campaign.campaign_type ?? "visit",
    recruitCount: Number(campaign.recruit_count ?? 0),
    reservedPoints: Number(reservation?.reserved_points ?? 0),
    region: campaign.region ?? "",
    regionDetail: campaign.region_detail ?? "",
    latitude: campaign.latitude === null ? "" : String(campaign.latitude),
    longitude: campaign.longitude === null ? "" : String(campaign.longitude),
    recruitEnd: campaign.recruit_end ?? "",
    selectionDate: campaign.selection_date ?? "",
    submissionDue: campaign.submission_due ?? "",
    benefitType: campaign.benefit_type ?? "",
    benefitValue: campaign.benefit_value ?? "",
    fee: campaign.fee === null ? "" : String(campaign.fee),
    usageRights: campaign.usage_rights ?? "",
    description: campaign.description ?? "",
    missionOptions: checkedMissions,
    contentRequirements: freeRequirements.join("\n"),
    keywords: toStringArray(requirements.keywords).join(", "),
    coverImageUrl: campaign.cover_image_url ?? "",
    beginnerFriendly: Boolean(campaign.beginner_friendly)
  };

  return (
    <main className="bg-[#F8F9FA]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 md:py-10 lg:flex-row lg:px-8">
        <OperatorSidebar business={business} active="campaigns" />

        <div className="min-w-0 flex-grow space-y-6">
          <div>
            <Link
              href={`/business/dashboard?campaign=${id}`}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 transition-colors hover:text-primary"
            >
              <ArrowLeft size={15} />
              캠페인 관리로 돌아가기
            </Link>
            <h1 className="mt-3 text-2xl font-bold text-charcoal sm:text-3xl">캠페인 수정</h1>
            <p className="mt-2 text-sm text-gray-500">
              {campaign.status === "revision_requested"
                ? "운영자 요청 사항을 반영한 뒤 검수를 다시 요청해주세요."
                : "검수 요청을 회수한 상태입니다. 수정을 마치면 다시 요청해주세요. 예약한 포인트는 그대로 유지됩니다."}
            </p>
          </div>

          <CampaignEditForm campaign={values} />
        </div>
      </div>
    </main>
  );
}
