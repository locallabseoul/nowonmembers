"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { adminUnreadMenuKeys, type AdminUnreadMenuKey } from "@/lib/admin-menu-unread";

export async function markAdminMenuRead(menuKey: AdminUnreadMenuKey, observedAt: string) {
  if (!adminUnreadMenuKeys.includes(menuKey)) return;

  const observedDate = new Date(observedAt);
  if (Number.isNaN(observedDate.getTime())) return;

  const { supabase } = await requireAdmin();
  // 렌더 시점 이후 들어온 항목까지 읽음 처리하지 않도록 화면이 관찰한 시각까지만 저장한다.
  const safeSeenAt = new Date(Math.min(observedDate.getTime(), Date.now())).toISOString();
  await supabase.rpc("mark_admin_menu_read", {
    target_menu_key: menuKey,
    target_seen_at: safeSeenAt
  });

  revalidatePath("/admin", "layout");
}
