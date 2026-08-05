"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function recordCampaignView(campaignId: string, viewerKey: string) {
  // 조회 집계가 실패해도 화면에는 아무 영향이 없어야 한다.
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.rpc("record_campaign_view", {
      target_campaign_id: campaignId,
      target_viewer_key: viewerKey
    });
  } catch {
    // 조회수는 참고 지표다. 실패를 사용자에게 알릴 이유가 없다.
  }
}
