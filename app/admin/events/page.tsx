import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 100;

// 실패 이벤트는 *_failed 접미사를 쓰기로 한 규약에 기댄다(lib/events.ts 참고).
function isFailureEvent(event: string) {
  return event.endsWith("_failed");
}

const formatOccurredAt = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(new Date(value));

type EventRow = {
  id: string;
  occurred_at: string;
  event: string;
  context: Record<string, unknown> | null;
  user_id: string | null;
  profiles: { nickname: string | null; role: string | null } | null;
};

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ filter?: string; event?: string }> }) {
  const { filter, event } = await searchParams;
  const failedOnly = filter === "failed";
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("app_events")
    .select("id,occurred_at,event,context,user_id,profiles(nickname,role)")
    .order("occurred_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (failedOnly) query = query.like("event", "%_failed");
  if (event) query = query.like("event", `${event}%`);

  const { data, error } = await query;
  const events = (data ?? []) as unknown as EventRow[];

  return (
    <section>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-black text-charcoal">이벤트 로그</h1>
          <p className="mt-2 text-sm text-gray-500">
            회원 화면에서 벌어진 주요 이벤트, 특히 저장 실패를 기록합니다. 회원이 &ldquo;에러가 난다&rdquo;고 하면 여기부터 확인해주세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/events"
            className={`rounded-full border px-4 py-2 text-sm font-bold ${!failedOnly ? "border-primary bg-primary/10 text-primary" : "border-gray-200 text-gray-600"}`}
          >
            전체
          </Link>
          <Link
            href="/admin/events?filter=failed"
            className={`rounded-full border px-4 py-2 text-sm font-bold ${failedOnly ? "border-primary bg-primary/10 text-primary" : "border-gray-200 text-gray-600"}`}
          >
            실패만
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600">
          이벤트를 불러오지 못했습니다: {error.message}
        </p>
      ) : events.length === 0 ? (
        <p className="rounded-[20px] border border-gray-100 bg-white p-10 text-center text-sm text-gray-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          아직 기록된 이벤트가 없습니다.
        </p>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <ul className="divide-y divide-gray-100">
            {events.map((row) => {
              const failed = isFailureEvent(row.event);
              const context = row.context ?? {};
              const errorMessage = typeof context.error === "string" ? context.error : "";
              const extraEntries = Object.entries(context).filter(([key]) => key !== "error");

              return (
                <li key={row.id} className="flex items-start gap-3 px-5 py-4">
                  <span className={`mt-0.5 shrink-0 ${failed ? "text-red-500" : "text-emerald-500"}`}>
                    {failed ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <code className="text-sm font-black text-charcoal">{row.event}</code>
                      <span className="text-xs text-gray-400">{formatOccurredAt(row.occurred_at)}</span>
                      {row.user_id ? (
                        <Link href={`/admin/members?q=${encodeURIComponent(row.profiles?.nickname ?? row.user_id)}`} className="text-xs font-bold text-primary hover:underline">
                          {row.profiles?.nickname ?? row.user_id.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">비로그인</span>
                      )}
                    </div>
                    {errorMessage ? <p className="mt-1 text-sm font-bold text-red-600">{errorMessage}</p> : null}
                    {extraEntries.length ? (
                      <p className="mt-1 break-all text-xs text-gray-500">
                        {extraEntries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">최근 {PAGE_SIZE}건까지 표시합니다.</p>
    </section>
  );
}
