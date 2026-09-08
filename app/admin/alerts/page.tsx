import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshAdminAlerts, setAdminAlertStatus } from "./actions";

type AlertRow = {
  id: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved" | "ignored";
  title: string;
  body: string;
  action_link: string | null;
  last_detected_at: string;
  discord_sent_at: string | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(value));
}

function statusLabel(status: AlertRow["status"]) {
  if (status === "open") return "미처리";
  if (status === "acknowledged") return "확인함";
  if (status === "resolved") return "해결됨";
  return "무시함";
}

export default async function AdminAlertsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const selectedStatus = ["open", "acknowledged", "resolved", "ignored"].includes(params.status ?? "") ? params.status! : "active";
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("admin_alerts")
    .select("id,severity,status,title,body,action_link,last_detected_at,discord_sent_at")
    .order("last_detected_at", { ascending: false })
    .limit(200);
  query = selectedStatus === "active" ? query.in("status", ["open", "acknowledged"]) : query.eq("status", selectedStatus);
  const { data, error } = await query;
  const alerts = (data ?? []) as AlertRow[];

  const filters = [["active", "조치 필요"], ["open", "미처리"], ["acknowledged", "확인함"], ["resolved", "해결됨"], ["ignored", "무시함"]];

  return (
    <main>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-black text-charcoal">운영 알림</h1>
          <p className="mt-2 break-keep text-gray-500">관리자가 확인하고 조치해야 하는 서비스 상태입니다. 해결된 상태는 다음 점검에서 자동 종료됩니다.</p>
        </div>
        <form action={refreshAdminAlerts}>
          <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white">
            <RefreshCw size={15} /> 지금 점검
          </button>
        </form>
      </div>

      {params.error || error ? <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600">{params.error ?? error?.message}</p> : null}
      {params.message ? <p className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{params.message}</p> : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map(([value, label]) => (
          <Link key={value} href={`/admin/alerts?status=${value}`} className={`rounded-full px-4 py-2 text-sm font-bold ${selectedStatus === value ? "bg-primary text-white" : "border border-gray-200 bg-white text-gray-600"}`}>
            {label}
          </Link>
        ))}
      </div>

      {alerts.length ? (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
              <span className={`mt-0.5 ${alert.severity === "critical" ? "text-red-500" : alert.severity === "warning" ? "text-amber-500" : "text-blue-500"}`}>
                {alert.status === "resolved" ? <CheckCircle2 size={20} /> : alert.severity === "critical" ? <CircleAlert size={20} /> : <AlertTriangle size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-black text-charcoal">{alert.title}</h2>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-600">{statusLabel(alert.status)}</span>
                  {alert.discord_sent_at ? <span className="text-[11px] font-bold text-indigo-500">Discord 전송됨</span> : null}
                </div>
                <p className="mt-1 break-keep text-sm text-gray-600">{alert.body}</p>
                <p className="mt-1 text-xs text-gray-400">마지막 감지 {formatDateTime(alert.last_detected_at)}</p>
                {alert.action_link ? <Link href={alert.action_link} className="mt-3 inline-block text-sm font-black text-primary hover:underline">관련 화면 열기</Link> : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {alert.status === "open" ? <StatusButton id={alert.id} status="acknowledged" label="확인" /> : null}
                {alert.status === "open" || alert.status === "acknowledged" ? <StatusButton id={alert.id} status="resolved" label="처리 완료" primary /> : null}
                {alert.status === "open" ? <StatusButton id={alert.id} status="ignored" label="무시" /> : null}
                {alert.status === "resolved" || alert.status === "ignored" ? <StatusButton id={alert.id} status="open" label="다시 열기" /> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-[20px] border border-dashed border-gray-200 p-12 text-center text-sm text-gray-400">해당 상태의 운영 알림이 없습니다.</div>
      )}
    </main>
  );
}

function StatusButton({ id, status, label, primary = false }: { id: string; status: AlertRow["status"]; label: string; primary?: boolean }) {
  return (
    <form action={setAdminAlertStatus}>
      <input type="hidden" name="alert_id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`rounded-lg px-3 py-2 text-xs font-black ${primary ? "bg-primary text-white" : "border border-gray-200 text-gray-600"}`}>{label}</button>
    </form>
  );
}
