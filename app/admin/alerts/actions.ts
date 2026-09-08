"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAdminAlertCycle } from "@/lib/admin-alerts";
import { requireAdmin } from "@/lib/auth/guards";

const ALLOWED_STATUSES = ["open", "acknowledged", "resolved", "ignored"] as const;

export async function setAdminAlertStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("alert_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) return;

  const { error } = await supabase.rpc("admin_set_alert_status", {
    target_id: id,
    target_status: status
  });
  if (error) redirect(`/admin/alerts?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/alerts");
  revalidatePath("/admin", "layout");
}

export async function refreshAdminAlerts() {
  await requireAdmin();
  let result: Awaited<ReturnType<typeof runAdminAlertCycle>>;
  try {
    result = await runAdminAlertCycle();
  } catch (error) {
    redirect(`/admin/alerts?error=${encodeURIComponent(error instanceof Error ? error.message : "운영 알림 갱신에 실패했습니다.")}`);
  }

  revalidatePath("/admin/alerts");
  revalidatePath("/admin", "layout");
  const message = result.discordConfigured
    ? `운영 상태를 갱신하고 Discord로 ${result.sent}건을 보냈습니다.`
    : `운영 상태를 갱신했습니다. Discord Webhook은 아직 설정되지 않았습니다.`;
  redirect(`/admin/alerts?message=${encodeURIComponent(message)}`);
}
