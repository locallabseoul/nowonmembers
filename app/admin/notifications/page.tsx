import { AlertTriangle, Bell, MessageSquare } from "lucide-react";
import { FormBanner } from "@/app/components/form-field";
import { Badge } from "@/app/components/ui";
import { isSmsConfigured } from "@/lib/sms";
import { getNotificationEvents, getSmsOutbox } from "@/lib/supabase/queries";
import { flushSmsOutbox, setNotificationChannel, setOutboxStatus, updateNotificationEvent } from "../actions";
import { EventEditor } from "./event-editor";

const RETURN_TO = "/admin/notifications";

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function ToggleForm({ eventKey, channel, enabled, label }: { eventKey: string; channel: "app" | "sms"; enabled: boolean; label: string }) {
  return (
    <form action={setNotificationChannel} className="inline">
      <input type="hidden" name="event_key" value={eventKey} />
      <input type="hidden" name="channel" value={channel} />
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <input type="hidden" name="return_to" value={RETURN_TO} />
      <button
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
          enabled ? "bg-primary/10 text-primary hover:bg-primary/20" : "border border-gray-200 text-gray-400 hover:bg-gray-50"
        }`}
        aria-pressed={enabled}
      >
        {channel === "app" ? <Bell size={13} /> : <MessageSquare size={13} />}
        {label} {enabled ? "켜짐" : "꺼짐"}
      </button>
    </form>
  );
}

export default async function AdminNotificationsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string; eventUpdated?: string }>;
}) {
  const { error, message, eventUpdated } = await searchParams;
  const [events, outbox] = await Promise.all([getNotificationEvents(), getSmsOutbox()]);
  const smsReady = isSmsConfigured();
  const pending = outbox.filter((entry) => entry.status === "pending");
  const processed = outbox.filter((entry) => entry.status !== "pending");
  const smsOn = events.some((event) => event.smsEnabled);

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-charcoal">자동 알림</h1>
        <p className="mt-2 break-keep text-gray-500">지원·선정·제출처럼 일이 생겼을 때 자동으로 나가는 알림입니다. 문구를 고치고, 앱 알림과 문자를 따로 켤 수 있습니다.</p>
      </div>

      {error ? <div className="mb-6"><FormBanner>{error}</FormBanner></div> : null}
      {message ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {eventUpdated ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">문구를 저장했습니다.</p> : null}

      <section className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <ul className="divide-y divide-gray-100">
          {events.map((event) => (
            <li key={event.key} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-charcoal">{event.label}</span>
                  <Badge tone={event.audience === "business" ? "blue" : "green"}>
                    {event.audience === "business" ? "가게·브랜드" : "크리에이터"}
                  </Badge>
                </div>
                <p className="mt-1.5 break-keep text-sm font-bold text-charcoal">{event.title}</p>
                <p className="mt-0.5 break-keep text-sm text-gray-500">{event.body}</p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <ToggleForm eventKey={event.key} channel="app" enabled={event.appEnabled} label="앱 알림" />
                <ToggleForm eventKey={event.key} channel="sms" enabled={event.smsEnabled} label="문자" />
                <EventEditor event={event} returnTo={RETURN_TO} updateAction={updateNotificationEvent} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-3 break-keep text-xs leading-relaxed text-gray-500">
        여기 있는 알림은 모두 이미 진행 중인 일에 대한 안내(거래 안내)라 수신 동의 없이 보낼 수 있고 야간에도 나갑니다.
        (광고) 표기나 수신거부 안내는 붙지 않습니다.
      </p>

      <section className="mt-10">
        <h2 className="mb-1 text-xl font-black text-charcoal">문자 발송 대기열</h2>
        <p className="mb-4 break-keep text-sm text-gray-500">
          문자를 켠 알림이 생기면 여기에 쌓입니다. 알리고가 등록된 IP에서 온 요청만 받아서, 보내기는 운영자 PC에서만 됩니다.
        </p>

        {!smsOn ? (
          <div className="rounded-[20px] border border-dashed border-gray-200 p-10 text-center">
            <p className="break-keep text-sm text-gray-400">문자를 켠 알림이 없습니다. 위에서 문자를 켜면 여기에 쌓입니다.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-gray-100 bg-white px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <span className="flex items-center gap-2 text-sm font-bold text-charcoal">
                <MessageSquare size={16} className="text-primary" />
                보낼 문자 {pending.length}건
              </span>
              {smsReady ? (
                <form action={flushSmsOutbox}>
                  <input type="hidden" name="return_to" value={RETURN_TO} />
                  <button
                    disabled={!pending.length}
                    className="whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {pending.length}건 보내기
                  </button>
                </form>
              ) : (
                <span className="inline-flex items-center gap-1.5 break-keep text-xs font-bold text-amber-700">
                  <AlertTriangle size={13} /> 이 화면에서는 보낼 수 없습니다. 운영자 PC에서 보내주세요.
                </span>
              )}
            </div>

            {outbox.length ? (
              <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                {[...pending, ...processed].map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge tone={entry.status === "failed" ? "red" : entry.status === "sent" ? "green" : entry.status === "skipped" ? "gray" : "amber"}>
                          {entry.status === "sent" ? "발송됨" : entry.status === "failed" ? "실패" : entry.status === "skipped" ? "건너뜀" : "대기"}
                        </Badge>
                        <span className="font-bold text-charcoal">{entry.name}</span>
                        <span className="text-gray-400">{entry.maskedPhone}</span>
                        <span className="text-gray-400">{entry.eventLabel}</span>
                        <span className="text-gray-400">{formatDateTime(entry.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 break-keep text-sm font-bold text-charcoal">{entry.title}</p>
                      <p className="mt-0.5 break-keep text-sm text-gray-500">{entry.body}</p>
                      {entry.error ? <p className="mt-1 break-keep text-xs font-bold text-red-600">{entry.error}</p> : null}
                    </div>

                    <div className="flex shrink-0 gap-1.5">
                      {entry.status === "pending" ? (
                        <form action={setOutboxStatus} className="inline">
                          <input type="hidden" name="outbox_id" value={entry.id} />
                          <input type="hidden" name="status" value="skipped" />
                          <input type="hidden" name="return_to" value={RETURN_TO} />
                          <button className="whitespace-nowrap rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50">
                            건너뛰기
                          </button>
                        </form>
                      ) : null}
                      {entry.status === "failed" || entry.status === "skipped" ? (
                        <form action={setOutboxStatus} className="inline">
                          <input type="hidden" name="outbox_id" value={entry.id} />
                          <input type="hidden" name="status" value="pending" />
                          <input type="hidden" name="return_to" value={RETURN_TO} />
                          <button className="whitespace-nowrap rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50">
                            다시 대기로
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-[20px] border border-dashed border-gray-200 p-10 text-center">
                <p className="text-sm text-gray-400">아직 쌓인 문자가 없습니다.</p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
