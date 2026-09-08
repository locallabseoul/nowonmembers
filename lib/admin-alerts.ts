import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_SITE_URL } from "@/lib/site";

type PendingAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  action_link: string | null;
  first_detected_at: string;
};

function discordColor(severity: PendingAlert["severity"]) {
  if (severity === "critical") return 0xdc2626;
  if (severity === "warning") return 0xf59e0b;
  return 0x2563eb;
}

async function sendDiscordAlert(webhookUrl: string, alert: PendingAlert) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "노원멤버스 운영 알림",
      allowed_mentions: { parse: [] },
      embeds: [{
        title: alert.title.slice(0, 256),
        description: alert.body.slice(0, 4096),
        color: discordColor(alert.severity),
        url: alert.action_link ? new URL(alert.action_link, PUBLIC_SITE_URL).toString() : undefined,
        timestamp: alert.first_detected_at,
        footer: { text: alert.severity === "critical" ? "긴급 조치 필요" : "관리자 확인 필요" }
      }]
    }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) throw new Error(`Discord webhook returned ${response.status}`);
}

export async function runAdminAlertCycle() {
  const supabase = createSupabaseAdminClient();
  const { data: detected, error: refreshError } = await supabase.rpc("refresh_admin_alerts");
  if (refreshError) throw new Error(refreshError.message);

  const { data, error } = await supabase
    .from("admin_alerts")
    .select("id,severity,title,body,action_link,first_detected_at")
    .eq("status", "open")
    .is("discord_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);

  const pending = (data ?? []) as PendingAlert[];
  const webhookUrl = process.env.DISCORD_ADMIN_WEBHOOK_URL?.trim();
  let sent = 0;
  const failures: string[] = [];

  if (webhookUrl) {
    for (const alert of pending) {
      try {
        await sendDiscordAlert(webhookUrl, alert);
        const { error: updateError } = await supabase
          .from("admin_alerts")
          .update({ discord_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", alert.id)
          .is("discord_sent_at", null);
        if (updateError) throw new Error(updateError.message);
        sent += 1;
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  return { detected: Number(detected ?? 0), pending: pending.length, sent, discordConfigured: Boolean(webhookUrl), failures };
}
