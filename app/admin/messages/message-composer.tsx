"use client";

import { useState } from "react";
import { AlertTriangle, MessageSquare } from "lucide-react";
import {
  MESSAGE_KINDS,
  MESSAGE_ROLE_TARGETS,
  MESSAGE_VERIFICATION_TARGETS,
  SMS_BYTE_LIMIT,
  buildSmsText,
  euckrByteLength,
  resolveSmsType,
  type MessageKind,
  type MessageRoleTarget,
  type MessageVerificationTarget
} from "@/lib/messages";
import type { AdminMessageAudienceBucket } from "@/lib/supabase/queries";

const cardClassName = "rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]";
const inputClassName = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-primary";
const legendClassName = "mb-3 block text-sm font-black text-charcoal";

function chipClassName(isActive: boolean) {
  return `whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold transition-colors ${
    isActive ? "bg-charcoal text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
  }`;
}

export function MessageComposer({
  audience,
  sendAction,
  returnTo,
  smsReady,
  siteUrl
}: {
  audience: AdminMessageAudienceBucket[];
  sendAction: (formData: FormData) => void;
  returnTo: string;
  smsReady: boolean;
  siteUrl: string;
}) {
  const [kind, setKind] = useState<MessageKind>("transactional");
  const [role, setRole] = useState<MessageRoleTarget>("all");
  const [verification, setVerification] = useState<MessageVerificationTarget>("all");
  const [allowWithoutConsent, setAllowWithoutConsent] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [showPreparingNotice, setShowPreparingNotice] = useState(false);

  const isPromotional = kind === "promotional";
  // 광고는 동의자에게만 가는 게 기본이다. 경고를 확인해야 풀린다.
  const consentOverride = isPromotional && allowWithoutConsent;
  const marketingOnly = isPromotional && !consentOverride;

  const matching = audience.filter(
    (bucket) =>
      (role === "all" || bucket.role === role) &&
      (verification === "all" || bucket.verification === verification) &&
      (!marketingOnly || bucket.marketingOptIn)
  );
  const sum = (rows: AdminMessageAudienceBucket[]) => rows.reduce((total, bucket) => total + bucket.count, 0);

  // 문자는 번호가 있어야 간다.
  const recipientCount = sum(matching.filter((bucket) => bucket.hasPhone));
  const withoutPhoneCount = sum(matching) - recipientCount;

  // 광고 대상 안내에 쓰는 수는 동의 여부와 무관하게 조건에 맞는 전체를 기준으로 센다.
  const inScope = audience.filter(
    (bucket) => (role === "all" || bucket.role === role) && (verification === "all" || bucket.verification === verification)
  );
  const consentedCount = sum(inScope.filter((bucket) => bucket.marketingOptIn));
  const withoutConsentCount = sum(inScope) - consentedCount;

  // 실제로 발송되는 문구를 그대로 만든다.
  const previewText = buildSmsText({
    kind,
    title: title || "제목",
    body: body || "내용이 여기에 표시됩니다.",
    link,
    siteUrl
  });
  const previewBytes = euckrByteLength(previewText);
  const previewType = resolveSmsType(previewText);
  const canSend = Boolean(title.trim() && body.trim() && recipientCount > 0);

  function changeKind(next: MessageKind) {
    setKind(next);
    setConfirming(false);
    // 거래 안내로 돌아오면 예외 설정은 의미가 없다. 다시 광고를 골랐을 때
    // 예외가 켜진 채로 남아 있지 않도록 함께 되돌린다.
    if (next !== "promotional") {
      setAllowWithoutConsent(false);
      setWarningOpen(false);
    }
  }

  function requestSend() {
    // 발송 설정이 없으면 안내만 띄운다. 서버 액션도 같은 조건으로 막혀 있다.
    if (!smsReady) {
      setShowPreparingNotice(true);
      return;
    }

    setConfirming(true);
  }

  return (
    <>
      <form action={sendAction} className="space-y-6" onChange={() => setConfirming(false)}>
        <input type="hidden" name="return_to" value={returnTo} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="channels" value="sms" />
        <input type="hidden" name="target_role" value={role} />
        <input type="hidden" name="target_verification" value={verification} />
        {consentOverride ? <input type="hidden" name="allow_without_consent" value="on" /> : null}

        <section className={cardClassName}>
          <span className={legendClassName}>어떤 내용인가요?</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {MESSAGE_KINDS.map((item) => {
              const isActive = kind === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => changeKind(item.value)}
                  aria-pressed={isActive}
                  // globals.css가 버튼 라벨을 한 줄로 유지한다. 이 카드는 설명문이
                  // 들어가므로 줄바꿈을 되살린다.
                  className={`whitespace-normal rounded-2xl border-2 p-4 text-left transition-colors ${
                    isActive ? "border-primary bg-primary/5" : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <span className={`block font-black ${isActive ? "text-primary" : "text-charcoal"}`}>{item.label}</span>
                  <span className="mt-1.5 block break-keep text-xs leading-relaxed text-gray-500">{item.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={cardClassName}>
          <span className={legendClassName}>누구에게 보낼까요?</span>

          <div className="space-y-4">
            <div>
              <span className="mb-2 block text-xs font-bold text-gray-400">회원 유형</span>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_ROLE_TARGETS.map((item) => (
                  <button key={item.value} type="button" onClick={() => setRole(item.value)} aria-pressed={role === item.value} className={chipClassName(role === item.value)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-xs font-bold text-gray-400">인증 상태</span>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_VERIFICATION_TARGETS.map((item) => (
                  <button key={item.value} type="button" onClick={() => setVerification(item.value)} aria-pressed={verification === item.value} className={chipClassName(verification === item.value)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {isPromotional ? (
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="break-keep text-sm font-bold text-amber-800">
                  {consentOverride ? "마케팅 미동의 회원에게도 보냅니다." : "마케팅 수신에 동의한 회원에게만 보냅니다."}
                </p>
                <p className="mt-1 break-keep text-xs leading-relaxed text-amber-700">
                  광고성 문자는 수신 동의를 받은 사람에게만 보낼 수 있습니다. 현재 조건에서 동의자는 {consentedCount}명,
                  미동의자는 {withoutConsentCount}명입니다.
                </p>

                {warningOpen || consentOverride ? (
                  <label className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-white p-3">
                    <input
                      type="checkbox"
                      checked={allowWithoutConsent}
                      onChange={(event) => {
                        setAllowWithoutConsent(event.target.checked);
                        setConfirming(false);
                      }}
                      className="mt-0.5 h-4 w-4 accent-red-600"
                    />
                    <span className="min-w-0 break-keep text-xs leading-relaxed text-charcoal">
                      미동의 회원 {withoutConsentCount}명에게도 보냅니다. 정보통신망법상 과태료 대상이 될 수 있음을 확인했습니다.
                    </span>
                  </label>
                ) : (
                  <button type="button" onClick={() => setWarningOpen(true)} className="mt-2 whitespace-normal text-left text-xs font-bold text-amber-800 underline">
                    미동의 회원에게도 보내야 한다면
                  </button>
                )}
              </div>
            ) : null}

            <div className="border-t border-gray-100 pt-4">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500">받는 사람</span>
                <span className="text-lg font-black text-charcoal">{recipientCount}명</span>
                {consentOverride && withoutConsentCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                    <AlertTriangle size={13} /> 미동의 {withoutConsentCount}명 포함
                  </span>
                ) : null}
              </p>
              {withoutPhoneCount > 0 ? (
                <p className="mt-1 break-keep text-xs text-gray-400">번호가 없는 {withoutPhoneCount}명은 문자를 받을 수 없어 제외했습니다.</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className={cardClassName}>
          <span className={legendClassName}>내용</span>
          <div className="space-y-3">
            <div>
              <label htmlFor="message-title" className="mb-1.5 block text-xs font-bold text-gray-400">제목</label>
              <input
                id="message-title"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={60}
                className={inputClassName}
                placeholder="예: 이번 주 새 캠페인이 열렸어요"
              />
            </div>

            <div>
              <label htmlFor="message-body" className="mb-1.5 block text-xs font-bold text-gray-400">내용</label>
              <textarea
                id="message-body"
                name="body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={5}
                maxLength={500}
                className={`${inputClassName} resize-y`}
                placeholder="회원에게 전할 내용을 적어주세요."
              />
            </div>

            <div>
              <label htmlFor="message-link" className="mb-1.5 block text-xs font-bold text-gray-400">연결할 곳 (선택)</label>
              <input
                id="message-link"
                name="link"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                className={inputClassName}
                placeholder="/campaigns"
              />
              <p className="mt-1 break-keep text-xs text-gray-400">문자 끝에 전체 주소로 붙습니다. 사이트 안의 경로만 넣어주세요.</p>
            </div>
          </div>
        </section>

        <section className={cardClassName}>
          <span className={legendClassName}>이렇게 보입니다</span>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="whitespace-pre-wrap break-keep text-sm leading-relaxed text-charcoal">{previewText}</p>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
            <span className="font-bold text-gray-500">{previewType}</span>
            <span>{previewBytes}바이트</span>
            {previewType === "LMS" ? <span>{SMS_BYTE_LIMIT}바이트를 넘어 장문으로 나갑니다.</span> : null}
          </p>
          {isPromotional ? (
            <p className="mt-1 break-keep text-xs text-gray-400">광고성 문자에는 (광고) 표기와 무료 수신거부 안내가 자동으로 붙습니다.</p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-5">
            {confirming ? (
              <>
                <span className="mr-auto break-keep text-sm font-bold text-charcoal">{recipientCount}명에게 보냅니다. 취소할 수 없습니다.</span>
                <button type="button" onClick={() => setConfirming(false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">
                  취소
                </button>
                <button type="submit" className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:bg-red-700">
                  보내기 확정
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!canSend}
                onClick={requestSend}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                {recipientCount}명에게 문자 보내기
              </button>
            )}
          </div>
        </section>
      </form>

      {showPreparingNotice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="sms-preparing-title">
          <button type="button" onClick={() => setShowPreparingNotice(false)} className="absolute inset-0 bg-charcoal/50" aria-label="안내 닫기" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <MessageSquare size={22} />
            </span>
            <h3 id="sms-preparing-title" className="mt-4 break-keep text-lg font-black text-charcoal">운영자 PC에서 보내주세요</h3>
            <p className="mt-3 break-keep text-sm leading-6 text-gray-600">
              알리고가 등록된 IP에서 온 요청만 받아서, 배포 서버에서는 문자를 보낼 수 없습니다.
              여기서는 받는 사람과 문구를 미리 확인하는 용도로 쓸 수 있어요.
            </p>
            <button
              type="button"
              onClick={() => setShowPreparingNotice(false)}
              className="mt-5 w-full rounded-xl bg-charcoal py-3 font-black text-white transition-colors hover:bg-slate-800"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
