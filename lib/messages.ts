// 관리자가 회원에게 보내는 문자의 규칙을 한곳에 모은다. 화면의 미리보기와 실제
// 발송이 같은 문구를 쓰도록 하기 위한 것이다.
//
// 법적 강제는 DB 함수(admin_send_message)가 한다. 화면만 고쳐서 우회할 수 없어야
// 하기 때문이다.

import { OPT_OUT_PATH, PUBLIC_SITE_URL, SERVICE_NAME } from "@/lib/site";

export type MessageKind = "transactional" | "promotional";
export type MessageChannel = "app" | "sms";
export type MessageRoleTarget = "all" | "creator" | "business";
export type MessageVerificationTarget = "all" | "verified" | "pending" | "rejected";

export const MESSAGE_KINDS: { value: MessageKind; label: string; description: string }[] = [
  {
    value: "transactional",
    label: "거래 안내",
    description: "선정 결과, 제출 기한처럼 이미 진행 중인 일을 알립니다. 수신 동의 없이 모두에게 보낼 수 있어요."
  },
  {
    value: "promotional",
    label: "광고·홍보",
    description: "새 캠페인 소식처럼 참여를 권하는 내용입니다. 마케팅 수신에 동의한 회원에게만 보낼 수 있어요."
  }
];

export const MESSAGE_ROLE_TARGETS: { value: MessageRoleTarget; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "creator", label: "크리에이터" },
  { value: "business", label: "가게·브랜드" }
];

export const MESSAGE_VERIFICATION_TARGETS: { value: MessageVerificationTarget; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "verified", label: "인증 완료" },
  { value: "pending", label: "인증 대기" },
  { value: "rejected", label: "인증 반려" }
];

export const AD_TITLE_PREFIX = "(광고)";

// 광고성 문자에는 무료로 수신거부할 방법을 함께 적어야 한다. 알리고의 080 무료거부
// 번호는 API 발송에 쓸 수 없어(lib/site.ts 참고), 회원이 직접 끄는 화면으로 안내한다.
export const SMS_UNSUBSCRIBE_NOTICE = `무료거부 ${PUBLIC_SITE_URL}${OPT_OUT_PATH}`;

// SMS는 90바이트까지다. 그보다 길면 LMS로 나가고 요금이 다르다. 알리고는 EUC-KR
// 기준으로 세므로 한글을 2바이트로 잡는다.
export const SMS_BYTE_LIMIT = 90;
// LMS 제목 칸은 44바이트다.
export const LMS_TITLE_BYTE_LIMIT = 44;

export function euckrByteLength(text: string) {
  let bytes = 0;
  for (const char of text) bytes += char.charCodeAt(0) > 0x7f ? 2 : 1;

  return bytes;
}

export function truncateToBytes(text: string, limit: number) {
  let bytes = 0;
  let result = "";
  for (const char of text) {
    const size = char.charCodeAt(0) > 0x7f ? 2 : 1;
    if (bytes + size > limit) break;
    bytes += size;
    result += char;
  }

  return result;
}

// 광고성 정보는 제목 맨 앞에 (광고)를 붙이고 보내는 사람을 밝혀야 한다.
// 통신사 관행대로 (광고) 뒤는 띄우지 않는다.
export function formatMessageTitle(kind: MessageKind, title: string) {
  const trimmed = title.trim();
  if (kind !== "promotional" || !trimmed) return trimmed;
  if (trimmed.startsWith(AD_TITLE_PREFIX)) return trimmed;

  return `${AD_TITLE_PREFIX}[${SERVICE_NAME}] ${trimmed}`;
}

// 실제로 발송되는 문구. 미리보기도 이 함수를 쓴다.
export function buildSmsText({
  kind,
  title,
  body,
  link,
  siteUrl
}: {
  kind: MessageKind;
  title: string;
  body: string;
  link?: string;
  siteUrl?: string;
}) {
  const parts = [formatMessageTitle(kind, title), body.trim()];

  // 문자에는 눌러서 들어갈 주소가 통째로 들어가야 한다.
  const path = (link ?? "").trim();
  if (path && siteUrl) parts.push(`${siteUrl.replace(/\/$/, "")}${path}`);

  if (kind === "promotional") parts.push(SMS_UNSUBSCRIBE_NOTICE);

  return parts.filter(Boolean).join("\n\n");
}

export function resolveSmsType(text: string) {
  return euckrByteLength(text) > SMS_BYTE_LIMIT ? "LMS" : "SMS";
}

export function describeMessageTarget(target: {
  role?: string | null;
  verification?: string | null;
  marketingOnly?: boolean | null;
}) {
  const role = MESSAGE_ROLE_TARGETS.find((item) => item.value === target.role)?.label ?? "전체";
  const verification = MESSAGE_VERIFICATION_TARGETS.find((item) => item.value === target.verification);
  const parts = [role];
  if (verification && verification.value !== "all") parts.push(verification.label);
  if (target.marketingOnly) parts.push("수신 동의자");

  return parts.join(" · ");
}
