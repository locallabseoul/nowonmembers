import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { createCampaign } from "./actions";
import { CampaignCreateWizard } from "./campaign-create-wizard";

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase, user } = await requireRole("business", "/business/campaigns/new");

  const { data: business } = await supabase
    .from("business_profiles")
    .select("id,business_name,address,address_detail,latitude,longitude")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect(`/business/dashboard?next=${encodeURIComponent("/business/campaigns/new")}&error=${encodeURIComponent("캠페인 생성 전 가게 프로필을 먼저 등록해주세요.")}`);
  }

  const { data: walletRows } = await supabase.rpc("get_my_point_wallet");
  const wallet = Array.isArray(walletRows) ? walletRows[0] : walletRows;

  return (
    <CampaignCreateWizard
      action={createCampaign}
      error={error}
      businessName={business.business_name ?? ""}
      businessAddress={business.address ?? ""}
      businessAddressDetail={business.address_detail ?? ""}
      businessLatitude={business.latitude === null ? "" : String(business.latitude)}
      businessLongitude={business.longitude === null ? "" : String(business.longitude)}
      availablePoints={Number(wallet?.available_points ?? 0)}
    />
  );
}
