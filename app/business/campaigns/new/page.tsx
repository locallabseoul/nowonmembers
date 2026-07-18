import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { createCampaign } from "./actions";
import { CampaignCreateWizard } from "./campaign-create-wizard";

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase, user } = await requireRole("business", "/business/campaigns/new");

  const { data: business } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect(`/business/dashboard?next=${encodeURIComponent("/business/campaigns/new")}&error=${encodeURIComponent("캠페인 생성 전 가게 프로필을 먼저 등록해주세요.")}`);
  }

  return <CampaignCreateWizard action={createCampaign} error={error} />;
}
