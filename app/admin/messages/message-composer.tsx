"use client";

import { useState } from "react";
import { AlertTriangle, MessageSquare } from "lucide-react";
import {
  MESSAGE_KINDS,
  MESSAGE_ROLE_TARGETS,
  MESSAGE_TEMPLATES,
  MESSAGE_VERIFICATION_TARGETS,
  SMS_BYTE_LIMIT,
  buildSmsText,
  euckrByteLength,
  resolveSmsType,
  formatMonthDay,
  type MessageKind,
  type MessageRoleTarget,
  type MessageTemplate,
  type MessageTemplateCampaign,
  type MessageVerificationTarget
} from "@/lib/messages";
import type { AdminMessageMember } from "@/lib/supabase/queries";

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
  campaigns,
  sendAction,
  returnTo,
  smsReady,
  siteUrl
}: {
  audience: AdminMessageMember[];
  campaigns: MessageTemplateCampaign[];
  sendAction: (formData: FormData) => void;
  returnTo: string;
  smsReady: boolean;
  siteUrl: string;
}) {
  const [kind, setKind] = useState<MessageKind>("transactional");
  const [role, setRole] = useState<MessageRoleTarget>("all");
  const [verification, setVerification] = useState<MessageVerificationTarget>("all");
  const [allowWithoutConsent, setAllowWithoutConsent] = useState(false);
  // 거래관계 예외는 법이 허용하는 범위라 기본으로 켜둔다.
  const [includeRecentCustomers, setIncludeRecentCustomers] = useState(true);
  const [warningOpen, setWarningOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [showPreparingNotice, setShowPreparingNotice] = useState(false);

  const isPromotional = kind === "promotional";
  // 광고는 동의자에게만 가는 게 기본이다. 경고를 확인해야 풀린다.
  const consentOverride = isPromotional && allowWithoutConsent;
  const includeRecent = isPromotional && !consentOverride && includeRecentCustomers;
  const marketingOnly = isPromotional && !consentOverride;

  const canReceive = (member: AdminMessageMember) =>
    !marketingOnly || member.marketingOptIn || (includeRecent && member.recentCustomer);

  const inScope = audience.filter(
    (member) => (role === "all" || member.role === role) && (verification === "all" || member.verification === verification)
  );
  const allowed = inScope.filter(canReceive);

  // 문자는 번호가 있어야 간다.
  const recipients = allowed.filter((member) => member.hasPhone);
  const recipientCount = recipients.length;
  const withoutPhoneCount = allowed.length - recipientCount;

  const consentedCount = inScope.filter((member) => member.marketingOptIn).length;
  const withoutConsentCount = inScope.length - consentedCount;
  // 동의는 안 했지만 거래관계로 보낼 수 있는 인원.
  const recentCustomerCount = inScope.filter((member) => !member.marketingOptIn && member.recentCustomer).length;

  // 실제로 발송되는 문구를 그대로 만든다.
  // 템플릿을 고른 뒤 문구를 고치면 더는 그 템플릿이 아니다. 값이 그대로일 때만
  // 선택 표시를 남긴다.
  const activeTemplate = MESSAGE_TEMPLATES.find((template) => template.id === selectedTemplate);
  const expected = activeTemplate
    ? fillTemplate(activeTemplate, campaigns.find((item) => item.id === selectedCampaignId))
    : null;
  const templateIntact =
    Boolean(expected) &&
    activeTemplate?.kind === kind &&
    activeTemplate?.role === role &&
    expected?.title === title &&
    expected?.body === body &&
    expected?.link === link;

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

  // 캠페인을 고르면 가게 이름과 마감일이 들어간 문구가, 아니면 일반 문구가 나온다.
  function fillTemplate(template: MessageTemplate, campaign?: MessageTemplateCampaign) {
    if (template.withCampaign && campaign) return template.withCampaign(campaign);

    return { title: template.title, body: template.body, link: template.link };
  }

  // 템플릿은 폼을 채워줄 뿐이다. 고른 뒤에도 얼마든지 고쳐 쓸 수 있다.
  function applyTemplate(template: MessageTemplate, campaignId = selectedCampaignId) {
    const campaign = campaigns.find((item) => item.id === campaignId);
    const filled = fillTemplate(template, campaign);

    setSelectedTemplate(template.id);
    setSelectedCampaignId(template.withCampaign ? campaignId : "");
    setKind(template.kind);
    setRole(template.role);
    setTitle(filled.title);
    setBody(filled.body);
    setLink(filled.link);
    setConfirming(false);
    if (template.kind !== "promotional") {
      setAllowWithoutConsent(false);
      setWarningOpen(false);
    }
  }

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
        {includeRecent ? <input type="hidden" name="allow_recent_customers" value="on" /> : null}

        <section className={cardClassName}>
          <span className={legendClassName}>자주 보내는 안내</span>
          <p className="-mt-2 mb-3 break-keep text-xs text-gray-500">
            고르면 유형·대상·문구가 한 번에 채워집니다. 보내기 전에 고쳐 쓸 수 있어요.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MESSAGE_TEMPLATES.map((template) => {
              const isActive = templateIntact && selectedTemplate === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  aria-pressed={isActive}
                  className={`whitespace-normal rounded-xl border p-3.5 text-left transition-colors ${
                    isActive ? "border-primary bg-primary/5" : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={`text-sm font-bold ${isActive ? "text-primary" : "text-charcoal"}`}>{template.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      template.kind === "promotional" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {template.kind === "promotional" ? "광고" : "거래 안내"}
                    </span>
                  </span>
                  <span className="mt-1 block break-keep text-xs leading-relaxed text-gray-500">{template.hint}</span>
                </button>
              );
            })}
          </div>

          {/* 캠페인을 고르면 가게 이름과 마감일이 문구에 들어가고 링크가 그 캠페인을 가리킨다. */}
          {activeTemplate?.withCampaign ? (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <label htmlFor="template-campaign" className="mb-2 block text-xs font-bold text-gray-400">
                어떤 캠페인인가요? (선택)
              </label>
              {campaigns.length ? (
                <>
                  <select
                    id="template-campaign"
                    value={selectedCampaignId}
                    onChange={(event) => applyTemplate(activeTemplate, event.target.value)}
                    className={inputClassName}
                  >
                    <option value="">캠페인을 고르지 않고 일반 안내로 보내기</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.businessName} · {campaign.title} (~{formatMonthDay(campaign.recruitEnd)})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 break-keep text-xs text-gray-400">
                    고르면 가게 이름과 마감일이 문구에 들어가고, 링크가 그 캠페인으로 바뀝니다.
                  </p>
                </>
              ) : (
                <p className="break-keep text-xs text-gray-500">지금 모집중인 캠페인이 없습니다. 일반 안내 문구로 나갑니다.</p>
              )}
            </div>
          ) : null}
        </section>

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

                {/* 정보통신망법 제50조 제1항 단서. 거래관계로 연락처를 받았다면 6개월 안에는
                    같은 종류의 광고를 동의 없이 보낼 수 있다. */}
                {consentOverride ? null : (
                  <label className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-white p-3">
                    <input
                      type="checkbox"
                      checked={includeRecentCustomers}
                      onChange={(event) => {
                        setIncludeRecentCustomers(event.target.checked);
                        setConfirming(false);
                      }}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span className="min-w-0 break-keep text-xs leading-relaxed text-charcoal">
                      <b className="font-bold">최근 6개월 안에 지원·협업한 크리에이터도 포함</b>
                      <span className="mt-0.5 block text-gray-500">
                        캠페인에 지원한 적이 있으면 거래관계가 생겨, 같은 종류의 소식은 동의 없이 보낼 수 있습니다.
                        {recentCustomerCount > 0 ? ` 지금 조건에서 ${recentCustomerCount}명이 늘어납니다.` : " 지금 조건에서는 해당자가 없습니다."}
                      </span>
                    </span>
                  </label>
                )}

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

              {/* 돈이 나가고 실제 사람에게 닿는 일이라, 보내기 전에 누구인지 볼 수 있어야 한다. */}
              {recipientCount > 0 ? (
                <details className="mt-3 rounded-xl border border-gray-100">
                  <summary className="cursor-pointer px-4 py-2.5 text-xs font-bold text-gray-600">받는 사람 명단 보기</summary>
                  <ul className="max-h-64 overflow-y-auto border-t border-gray-100 px-4 py-2">
                    {recipients.map((member) => (
                      <li key={member.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1.5 text-xs">
                        <span className="font-bold text-charcoal">{member.name}</span>
                        <span className="text-gray-400">{member.maskedPhone}</span>
                        <span className="text-gray-400">{member.role === "business" ? "가게·브랜드" : "크리에이터"}</span>
                        {isPromotional && !member.marketingOptIn ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">
                            {member.recentCustomer ? "거래관계" : "미동의"}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </details>
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
