import { AlertTriangle, MessageSquare } from "lucide-react";
import { FormBanner } from "@/app/components/form-field";
import { Badge } from "@/app/components/ui";
import { describeMessageTarget } from "@/lib/messages";
import { PUBLIC_SITE_URL } from "@/lib/site";
import { getSmsBalance, isSmsConfigured } from "@/lib/sms";
import { getAdminMessageAudience, getAdminMessages } from "@/lib/supabase/queries";
import { sendAdminMessage } from "../actions";
import { MessageComposer } from "./message-composer";

// 선불이라 잔여 건수가 모자라면 발송이 통째로 실패한다. 보내기 전에 보여준다.
async function loadSmsBalance() {
  if (!isSmsConfigured()) return null;

  try {
    return await getSmsBalance();
  } catch {
    // 잔여 건수를 못 읽어도 발송 화면은 열려야 한다.
    return null;
  }
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default async function AdminMessagesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; messageSent?: string }>;
}) {
  const { error, messageSent } = await searchParams;
  const [audience, messages, balance] = await Promise.all([
    getAdminMessageAudience(),
    getAdminMessages(),
    loadSmsBalance()
  ]);
  const smsReady = isSmsConfigured();

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-charcoal">문자 발송</h1>
        <p className="mt-2 break-keep text-gray-500">회원에게 문자를 보냅니다. 유형을 고르면 받는 사람과 표기 규칙이 함께 정해집니다.</p>
      </div>

      {error ? <div className="mb-6"><FormBanner>{error}</FormBanner></div> : null}
      {messageSent ? (
        <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{messageSent}명에게 문자를 보냈습니다.</p>
      ) : null}

      {smsReady ? (
        balance ? (
          <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-[20px] border border-gray-100 bg-white px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <span className="flex items-center gap-2 text-sm font-bold text-charcoal">
              <MessageSquare size={16} className="text-primary" /> 남은 발송 건수
            </span>
            <span className="text-sm text-gray-500">단문(SMS) <b className="text-charcoal">{balance.sms.toLocaleString("ko-KR")}건</b></span>
            <span className="text-sm text-gray-500">장문(LMS) <b className="text-charcoal">{balance.lms.toLocaleString("ko-KR")}건</b></span>
          </div>
        ) : null
      ) : (
        <div className="mb-6 flex items-start gap-3 rounded-[20px] border border-amber-200 bg-amber-50 p-5">
          <MessageSquare size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="font-black text-amber-900">이 화면에서는 문자를 보낼 수 없습니다</p>
            <p className="mt-1 break-keep text-sm leading-relaxed text-amber-800">
              알리고는 등록된 IP에서 온 요청만 받는데, 배포 서버는 나가는 IP가 매번 바뀌어 등록할 수가 없습니다.
              문자는 운영자 PC에서 개발 서버를 띄워 보내주세요. 여기서는 받는 사람 수와 실제 문구를 미리 확인할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      <MessageComposer
        audience={audience}
        sendAction={sendAdminMessage}
        returnTo="/admin/messages"
        smsReady={smsReady}
        siteUrl={PUBLIC_SITE_URL}
      />

      <section className="mt-10">
        <h2 className="mb-1 text-xl font-black text-charcoal">보낸 문자</h2>
        <p className="mb-4 text-sm text-gray-500">최근 30건입니다.</p>

        {messages.length ? (
          <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <ul className="divide-y divide-gray-100">
              {messages.map((message) => (
                <li key={message.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={message.kind === "promotional" ? "amber" : "blue"}>
                      {message.kind === "promotional" ? "광고·홍보" : "거래 안내"}
                    </Badge>
                    {message.consentOverride ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                        <AlertTriangle size={12} /> 미동의 포함
                      </span>
                    ) : null}
                    {message.status === "failed" ? <Badge tone="red">발송 실패</Badge> : null}
                    <span className="text-xs text-gray-400">{formatDateTime(message.createdAt)}</span>
                  </div>

                  <p className="mt-2 break-keep font-bold text-charcoal">{message.title}</p>
                  <p className="mt-1 line-clamp-2 break-keep text-sm text-gray-500">{message.body}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
                    <span>받는 사람 {describeMessageTarget(message.target)} · {message.recipientCount}명</span>
                    {message.smsSentCount > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-charcoal">
                        <MessageSquare size={12} /> {message.smsSentCount}명 발송
                      </span>
                    ) : null}
                    {message.smsPendingCount > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                        <MessageSquare size={12} /> 발송 대기 {message.smsPendingCount}명
                      </span>
                    ) : null}
                    {/* 못 받았다는 문의가 오면 이 번호로 알리고에서 통신사 전달 결과를 조회한다. */}
                    {message.providerMessageId ? (
                      <span className="text-gray-400">알리고 접수번호 {message.providerMessageId}</span>
                    ) : null}
                  </div>
                  {message.error ? <p className="mt-2 break-keep text-xs font-bold text-red-600">{message.error}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-400">아직 보낸 메시지가 없습니다.</p>
          </div>
        )}
      </section>
    </main>
  );
}
