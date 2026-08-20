import { createSupabaseServerClient } from "@/lib/supabase/server";

export const adminUnreadMenuKeys = ["campaigns", "coupons", "submissions", "notifications"] as const;
export type AdminUnreadMenuKey = (typeof adminUnreadMenuKeys)[number];
export type AdminMenuUnreadCounts = Record<AdminUnreadMenuKey, number>;

export type AdminMenuUnreadState = {
  counts: AdminMenuUnreadCounts;
  observedAt: string;
};

export async function getAdminMenuUnreadState(adminId: string): Promise<AdminMenuUnreadState> {
  const supabase = await createSupabaseServerClient();
  const observedAt = new Date().toISOString();
  const { data: readRows } = await supabase
    .from("admin_menu_reads")
    .select("menu_key,last_seen_at")
    .eq("admin_id", adminId);

  const lastSeen = new Map((readRows ?? []).map((row) => [row.menu_key, row.last_seen_at]));
  const baseline = observedAt;

  const [campaigns, coupons, submissions, notifications] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_review")
      .gt("updated_at", lastSeen.get("campaigns") ?? baseline)
      .lte("updated_at", observedAt),
    supabase
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_review")
      .gt("updated_at", lastSeen.get("coupons") ?? baseline)
      .lte("updated_at", observedAt),
    supabase
      .from("content_submissions")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "submitted")
      .gt("updated_at", lastSeen.get("submissions") ?? baseline)
      .lte("updated_at", observedAt),
    supabase
      .from("sms_outbox")
      .select("id", { count: "exact", head: true })
      .gt("created_at", lastSeen.get("notifications") ?? baseline)
      .lte("created_at", observedAt)
  ]);

  return {
    observedAt,
    counts: {
      campaigns: campaigns.count ?? 0,
      coupons: coupons.count ?? 0,
      submissions: submissions.count ?? 0,
      notifications: notifications.count ?? 0
    }
  };
}
