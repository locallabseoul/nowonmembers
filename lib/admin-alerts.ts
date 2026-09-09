import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_SITE_URL } from "@/lib/site";

type PendingAlert = {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  action_link: string | null;
  first_detected_at: string;
  metadata: Record<string, unknown>;
  discord_notified_count: number;
};

const failureEventLabels: Record<string, string> = {
  "application.approve_failed": "지원자 선정 처리 실패",
  "campaign.create_failed": "캠페인 생성 실패",
  "campaign.update_failed": "캠페인 수정 실패",
  "campaign.submit_failed": "캠페인 검수 요청 실패",
  "admin.campaign_approve_failed": "캠페인 승인 실패",
  "admin.campaign_reject_failed": "캠페인 취소 실패",
  "admin.message_send_failed": "관리자 문자 발송 실패",
  "point.charge_failed": "포인트 충전 실패",
  "point.charge_reconcile_failed": "결제 결과 반영 실패",
  "point.refund_failed": "포인트 환불 실패"
};

function formatKoreaDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));
}

function shortId(value: unknown) {
  return typeof value === "string" && value ? value.slice(0, 8) : "-";
}

async function enrichFailureAlerts(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data: alerts, error } = await supabase
    .from("admin_alerts")
    .select("id,metadata,discord_notified_count")
    .eq("alert_type", "app_failure")
    .in("status", ["open", "acknowledged"]);
  if (error) throw new Error(error.message);

  for (const alert of alerts ?? []) {
    const metadata = (alert.metadata ?? {}) as Record<string, unknown>;
    const event = typeof metadata.event === "string" ? metadata.event : "";
    if (!event) continue;

    const { data: events, error: eventsError } = await supabase
      .from("app_events")
      .select("occurred_at,user_id,context,profiles(nickname,role)")
      .eq("event", event)
      .gte("occurred_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("occurred_at", { ascending: false })
      .limit(5);
    if (eventsError) throw new Error(eventsError.message);
    if (!events?.length) continue;

    const latest = events[0];
    const context = (latest.context ?? {}) as Record<string, unknown>;
    const profileValue = Array.isArray(latest.profiles) ? latest.profiles[0] : latest.profiles;
    const profile = profileValue as { nickname?: string | null; role?: string | null } | null;
    const count = Number(metadata.count ?? events.length);
    const targetEntries = Object.entries(context).filter(([key]) => key !== "error");
    const target = targetEntries.length
      ? targetEntries.map(([key, value]) => `${key}: ${shortId(value)}`).join(" · ")
      : "대상 정보 없음";
    const role = profile?.role === "business" ? "가게·브랜드" : profile?.role === "creator" ? "크리에이터" : profile?.role ?? "미확인";
    const body = [
      `오류: ${typeof context.error === "string" ? context.error : "상세 오류 메시지 없음"}`,
      `최근 발생: ${formatKoreaDateTime(latest.occurred_at)} · 최근 24시간 ${count}건`,
      `발생 사용자: ${profile?.nickname ?? shortId(latest.user_id)} (${role})`,
      `대상: ${target}`,
      `이벤트: ${event}`
    ].join("\n");

    const update: Record<string, unknown> = {
      title: failureEventLabels[event] ?? "서비스 처리 오류",
      body,
      metadata: { ...metadata, latestError: context.error ?? null, latestOccurredAt: latest.occurred_at }
    };
    if (count > Number(alert.discord_notified_count ?? 0)) update.discord_sent_at = null;

    const { error: updateError } = await supabase.from("admin_alerts").update(update).eq("id", alert.id);
    if (updateError) throw new Error(updateError.message);
  }
}

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
  await enrichFailureAlerts(supabase);

  const { data, error } = await supabase
    .from("admin_alerts")
    .select("id,alert_type,severity,title,body,action_link,first_detected_at,metadata,discord_notified_count")
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
          .update({
            discord_sent_at: new Date().toISOString(),
            discord_notified_count: alert.alert_type === "app_failure" ? Number(alert.metadata.count ?? 1) : alert.discord_notified_count,
            updated_at: new Date().toISOString()
          })
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
