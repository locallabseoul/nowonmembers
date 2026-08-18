// 관리자가 회원에게 보내는 문자의 규칙을 한곳에 모은다. 화면의 미리보기와 실제
// 발송이 같은 문구를 쓰도록 하기 위한 것이다.
//
// 법적 강제는 DB 함수(admin_send_message)가 한다. 화면만 고쳐서 우회할 수 없어야
// 하기 때문이다.

import { OPT_OUT_PATH, PUBLIC_SITE_URL, SERVICE_NAME } from "@/lib/site";

export type MessageKind = "transactional" | "promotional";
export type MessageChannel = "app" | "sms";
export type MessageRoleTarget = "all" | "creator" | "business" | "resident";
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
  { value: "business", label: "가게·브랜드" },
  { value: "resident", label: "주민 회원" }
];

export const MESSAGE_VERIFICATION_TARGETS: { value: MessageVerificationTarget; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "verified", label: "인증 완료" },
  { value: "pending", label: "인증 대기" },
  { value: "rejected", label: "인증 반려" }
];

// 마케팅 수신 동의 문구. 가게는 캠페인을 여는 쪽이라 크리에이터와 받을 내용이 다르다.
// 가입 화면과 수신 설정 화면이 같은 말을 하도록 여기 모아둔다.
export const MARKETING_CONSENT_COPY: Record<"creator" | "business" | "resident", { title: string; description: string }> = {
  creator: {
    title: "새 캠페인이 열리면 문자로 알려드릴게요",
    description: "노원 가게의 새 캠페인과 이벤트 소식을 보내드려요."
  },
  business: {
    title: "크리에이터 소식과 혜택을 문자로 알려드릴게요",
    description: "새로 합류한 크리에이터, 포인트 혜택, 캠페인 운영에 도움되는 소식을 보내드려요."
  },
  resident: {
    title: "새 쿠폰과 동네 혜택을 문자로 알려드릴게요",
    description: "노원 가게의 새 쿠폰, 이벤트와 생활권 혜택 소식을 보내드려요."
  }
};

export const MARKETING_CONSENT_FOOTNOTE = "마이페이지 수신 설정에서 언제든 끌 수 있습니다.";

// 자주 보내는 안내는 매번 새로 쓰지 않는다. 유형과 대상까지 함께 담아두면, 이 문자가
// 광고인지 거래 안내인지 관리자가 매번 판단하지 않아도 된다.
// 고르면 폼이 채워질 뿐이라 보내기 전에 얼마든지 고쳐 쓸 수 있다.
export type MessageTemplateCampaign = {
  id: string;
  title: string;
  businessName: string;
  recruitEnd: string;
};

export type MessageTemplate = {
  id: string;
  label: string;
  hint: string;
  kind: MessageKind;
  role: MessageRoleTarget;
  title: string;
  body: string;
  link: string;
  // 캠페인을 고르면 가게 이름과 마감일이 문구에 들어가고 링크가 그 캠페인을 가리킨다.
  withCampaign?: (campaign: MessageTemplateCampaign) => { title: string; body: string; link: string };
};

// 모집 마감일은 'YYYY-MM-DD' 문자열이다. Date로 바꾸면 시간대 때문에 하루가 밀리므로
// 문자열에서 바로 읽는다.
export function formatMonthDay(date: string) {
  const [, month, day] = (date ?? "").split("-");
  if (!month || !day) return date ?? "";

  return `${Number(month)}월 ${Number(day)}일`;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "new-local-coupon",
    label: "새 쿠폰·동네 혜택",
    hint: "주민 회원에게 새 쿠폰이나 지역 혜택을 알립니다",
    kind: "promotional",
    role: "resident",
    title: "새로운 동네 혜택이 열렸어요",
    body: "노원 지역 가게의 새 쿠폰과 혜택을 확인해보세요.",
    link: "/coupons"
  },
  {
    id: "new-campaign",
    label: "새 캠페인 모집",
    hint: "새로 열린 캠페인을 크리에이터에게 알립니다",
    kind: "promotional",
    role: "creator",
    title: "새 캠페인이 열렸어요",
    body: "노원 지역 가게에서 함께할 크리에이터를 찾고 있어요. 모집 마감 전에 캠페인을 확인해보세요.",
    link: "/campaigns",
    withCampaign: (campaign) => ({
      title: "새 캠페인이 열렸어요",
      body: `${campaign.businessName}의 '${campaign.title}' 캠페인이 열렸어요. ${formatMonthDay(campaign.recruitEnd)}까지 지원할 수 있습니다.`,
      link: `/campaigns/${campaign.id}`
    })
  },
  {
    id: "closing-soon",
    label: "모집 마감 임박",
    hint: "마감이 가까운 캠페인을 다시 알립니다",
    kind: "promotional",
    role: "creator",
    title: "모집 마감이 얼마 남지 않았어요",
    body: "지원할 수 있는 캠페인의 모집이 곧 마감됩니다. 놓치기 전에 확인해보세요.",
    link: "/campaigns",
    withCampaign: (campaign) => ({
      title: "모집 마감이 얼마 남지 않았어요",
      body: `${campaign.businessName}의 '${campaign.title}' 캠페인 모집이 ${formatMonthDay(campaign.recruitEnd)}에 마감됩니다. 놓치기 전에 지원해보세요.`,
      link: `/campaigns/${campaign.id}`
    })
  },
  {
    id: "selection-result",
    label: "선정 결과 안내",
    hint: "지원자에게 결과 확인을 요청합니다. 거래 안내라 동의 없이 보낼 수 있어요",
    kind: "transactional",
    role: "creator",
    title: "캠페인 선정 결과가 나왔어요",
    body: "지원하신 캠페인의 선정 결과를 확인해주세요. 선정되셨다면 방문 일정도 함께 안내드립니다.",
    link: "/creator/dashboard"
  },
  {
    id: "submission-due",
    label: "제출 기한 안내",
    hint: "협업 중인 크리에이터에게 기한을 알립니다. 거래 안내입니다",
    kind: "transactional",
    role: "creator",
    title: "콘텐츠 제출 기한이 다가와요",
    body: "진행 중인 협업의 콘텐츠 제출 기한이 얼마 남지 않았습니다. 기한 안에 올려주세요.",
    link: "/creator/dashboard"
  },
  {
    id: "new-creators",
    label: "신규 크리에이터 합류",
    hint: "가게에 캠페인 개설을 권합니다",
    kind: "promotional",
    role: "business",
    title: "새로운 크리에이터가 합류했어요",
    body: "노원 지역에서 활동하는 크리에이터가 새로 합류했어요. 캠페인을 열어 우리 가게를 알려보세요.",
    link: "/business/campaigns/new"
  }
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
  recentCustomers?: boolean | null;
}) {
  const role = MESSAGE_ROLE_TARGETS.find((item) => item.value === target.role)?.label ?? "전체";
  const verification = MESSAGE_VERIFICATION_TARGETS.find((item) => item.value === target.verification);
  const parts = [role];
  if (verification && verification.value !== "all") parts.push(verification.label);
  if (target.marketingOnly) parts.push(target.recentCustomers ? "수신 동의자 + 최근 거래" : "수신 동의자");

  return parts.join(" · ");
}
