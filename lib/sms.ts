// 알리고(apis.aligo.in) 문자 발송. 선불 충전식이고, 발신번호는 사전등록된 번호만
// 쓸 수 있다.
//
// 요청 하나에 수신번호를 최대 1000개까지 넣을 수 있고 응답은 성공/실패 건수만 준다.
// 누가 실패했는지는 알려주지 않으므로, 결과도 발송 건 단위로 기록한다.
//
// ── 배포본에서는 문자가 나가지 않는다 ──
// 알리고는 사전등록한 IP에서 온 요청만 받는다. Vercel 서버리스 함수는 나가는 IP가
// 매번 달라 등록할 수가 없다(고정 IP는 Enterprise의 Secure Compute 전용).
// 그래서 ALIGO_* 환경변수는 로컬(.env.local)에만 두고 Vercel에는 넣지 않는다.
// 배포본에서는 isSmsConfigured()가 false라 화면과 서버 액션 양쪽이 막힌다.
// 문자는 운영자 PC에서 개발 서버를 띄워 보낸다 — 나가는 IP를 알리고에 등록해두면 된다.

import { LMS_TITLE_BYTE_LIMIT, resolveSmsType, truncateToBytes } from "@/lib/messages";

const ALIGO_API_BASE = "https://apis.aligo.in";
// 알리고가 한 번에 받는 수신번호 개수.
const RECEIVERS_PER_REQUEST = 1000;

export type SmsSendResult = {
  providerMessageId: string;
  successCount: number;
  errorCount: number;
  messageType: string;
};

function getAligoCredentials() {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const sender = process.env.ALIGO_SENDER;

  if (!apiKey || !userId || !sender) {
    throw new Error("문자 발송 설정이 없습니다. ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER를 확인해주세요.");
  }

  return { apiKey, userId, sender };
}

export function isSmsConfigured() {
  return Boolean(process.env.ALIGO_API_KEY && process.env.ALIGO_USER_ID && process.env.ALIGO_SENDER);
}

type AligoResponse = {
  result_code?: string | number;
  message?: string;
  msg_id?: string | number;
  success_cnt?: string | number;
  error_cnt?: string | number;
  msg_type?: string;
  SMS_CNT?: string | number;
  LMS_CNT?: string | number;
};

async function callAligo(path: string, params: Record<string, string>) {
  const { apiKey, userId } = getAligoCredentials();
  const body = new URLSearchParams({ key: apiKey, user_id: userId, ...params });

  const response = await fetch(`${ALIGO_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  });

  // 알리고는 실패해도 200으로 내려주고 result_code를 음수로 준다.
  const data = await response.json().catch(() => ({})) as AligoResponse;

  if (!response.ok) {
    throw new Error(`문자 발송 서버에 연결하지 못했습니다. (HTTP ${response.status})`);
  }

  if (Number(data.result_code ?? -1) <= 0) {
    throw new Error(typeof data.message === "string" && data.message ? data.message : "문자 발송에 실패했습니다.");
  }

  return data;
}

// 남은 건수. 선불이라 보내기 전에 모자라지 않은지 볼 수 있어야 한다.
export async function getSmsBalance() {
  const data = await callAligo("/remain/", {});

  return {
    sms: Number(data.SMS_CNT ?? 0),
    lms: Number(data.LMS_CNT ?? 0)
  };
}

export async function sendSms({
  receivers,
  title,
  text,
  testMode = false
}: {
  receivers: string[];
  title: string;
  text: string;
  // 알리고 테스트 모드. 실제로 나가지 않고 과금도 없다. 연결 확인용이다.
  testMode?: boolean;
}): Promise<SmsSendResult> {
  const { sender } = getAligoCredentials();
  const numbers = [...new Set(receivers.map((value) => value.replace(/\D/g, "")).filter(Boolean))];

  if (!numbers.length) throw new Error("보낼 번호가 없습니다.");

  const messageType = resolveSmsType(text);
  let providerMessageId = "";
  let successCount = 0;
  let errorCount = 0;

  for (let index = 0; index < numbers.length; index += RECEIVERS_PER_REQUEST) {
    const chunk = numbers.slice(index, index + RECEIVERS_PER_REQUEST);
    const data = await callAligo("/send/", {
      sender,
      receiver: chunk.join(","),
      msg: text,
      msg_type: messageType,
      // 제목은 LMS에서만 쓰이고 44바이트를 넘으면 거부된다.
      title: truncateToBytes(title, LMS_TITLE_BYTE_LIMIT),
      testmode_yn: testMode ? "Y" : "N"
    });

    if (!providerMessageId) providerMessageId = String(data.msg_id ?? "");
    successCount += Number(data.success_cnt ?? 0);
    errorCount += Number(data.error_cnt ?? 0);
  }

  return { providerMessageId, successCount, errorCount, messageType };
}
