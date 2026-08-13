import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BASE_URL = "https://nowon-me.kr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/campaigns`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/coupons`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/stories`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/guide/campaign`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/notices`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/marketing`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/brand`, changeFrequency: "yearly", priority: 0.2 }
  ];

  // 공개 목록에 노출되는 것만 담는다. 조회에 실패해도 정적 페이지는 내보낸다.
  try {
    const supabase = await createSupabaseServerClient();
    const [campaignRows, couponRows, storyRows] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id,updated_at")
        .in("status", ["recruiting", "selecting", "in_progress", "submission_review", "completed"]),
      supabase.from("coupons").select("id,updated_at").eq("status", "approved"),
      supabase.from("local_stories").select("id,published_at").not("published_at", "is", null)
    ]);

    const campaigns: MetadataRoute.Sitemap = (campaignRows.data ?? []).map((campaign) => ({
      url: `${BASE_URL}/campaigns/${campaign.id}`,
      lastModified: campaign.updated_at ?? undefined,
      changeFrequency: "daily",
      priority: 0.8
    }));
    const stories: MetadataRoute.Sitemap = (storyRows.data ?? []).map((story) => ({
      url: `${BASE_URL}/stories/${story.id}`,
      lastModified: story.published_at ?? undefined,
      changeFrequency: "weekly",
      priority: 0.6
    }));
    const coupons: MetadataRoute.Sitemap = (couponRows.data ?? []).map((coupon) => ({
      url: `${BASE_URL}/coupons/${coupon.id}`,
      lastModified: coupon.updated_at ?? undefined,
      changeFrequency: "daily",
      priority: 0.8
    }));

    return [...staticPages, ...campaigns, ...coupons, ...stories];
  } catch {
    return staticPages;
  }
}
