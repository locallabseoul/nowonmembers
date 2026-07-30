export const POINTS_PER_RECRUIT = 5_000;
export const POINT_CHARGE_OPTIONS = [
  {
    paidPoints: 25_000,
    bonusPoints: 0,
    supplyAmount: 25_000,
    vatAmount: 2_500,
    totalAmount: 27_500
  },
  {
    paidPoints: 50_000,
    bonusPoints: 5_000,
    supplyAmount: 50_000,
    vatAmount: 5_000,
    totalAmount: 55_000
  },
  {
    paidPoints: 100_000,
    bonusPoints: 10_000,
    supplyAmount: 100_000,
    vatAmount: 10_000,
    totalAmount: 110_000
  }
] as const;
export const DEFAULT_POINT_CHARGE_POINTS = 50_000;
export const POINT_TERMS_VERSION = "2026-07-26-v2";

// 출시 혜택 조건. supabase/migrations/20260726120000_create_campaign_points.sql의
// grant_launch_point_bonus를 따른다. 지급 시점은 가게 프로필 등록이고 유효기간은
// 30일이다. 값이 바뀌면 함수와 함께 고쳐야 한다.
export const LAUNCH_BONUS_POINTS = 50_000;
export const LAUNCH_BONUS_VALID_DAYS = 30;

export function getPointChargeOption(paidPoints: number) {
  return POINT_CHARGE_OPTIONS.find((option) => option.paidPoints === paidPoints);
}

export type PointWalletSummary = {
  businessId: string;
  availablePoints: number;
  reservedPoints: number;
  promotionalPoints: number;
  paidPoints: number;
  bonusPoints: number;
  nextExpirationAt: string | null;
  nextBonusExpirationAt: string | null;
};

export type PointLedgerItem = {
  id: string;
  eventType: string;
  availableDelta: number;
  reservedDelta: number;
  memo: string;
  createdAt: string;
  campaignTitle: string;
};

export type PointPaymentOrder = {
  id: string;
  orderId: string;
  pointAmount: number;
  bonusPoints: number;
  totalAmount: number;
  refundedPoints: number;
  status: string;
  paymentKey: string;
  paidAt: string;
  createdAt: string;
  refundablePoints: number;
};

export type CampaignPointReservation = {
  campaignId: string;
  requestedHeadcount: number;
  reservedPoints: number;
  billableHeadcount: number | null;
  consumedPoints: number;
  returnedPoints: number;
  status: string;
};

export function formatPoints(value: number) {
  return `${Math.max(0, value).toLocaleString("ko-KR")}P`;
}

export function campaignPointCost(recruitCount: number) {
  return Math.max(0, Math.trunc(recruitCount)) * POINTS_PER_RECRUIT;
}

const POINT_PAYMENT_FAILURE_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: "결제를 취소했습니다.",
  PAY_PROCESS_ABORTED: "결제 진행 중 오류가 발생해 결제가 중단되었습니다.",
  REJECT_CARD_COMPANY: "카드사에서 결제를 거절했습니다."
};

export function normalizePaymentFailureCode(code?: string | null) {
  return code && /^[A-Z0-9_]{1,50}$/.test(code) ? code : "PAYMENT_FAILED";
}

// 결제 실패 사유는 리다이렉트 쿼리로 들어온다. 그 문구를 그대로 화면에 옮기면
// 링크 하나로 임의의 안내문을 띄울 수 있어, 아는 코드만 우리 문구로 바꿔 보여준다.
export function paymentFailureMessage(code: string) {
  return POINT_PAYMENT_FAILURE_MESSAGES[code] ?? "결제가 완료되지 않았습니다. 잠시 후 다시 시도해주세요.";
}

export function pointEventLabel(eventType: string) {
  if (eventType === "promotional_credit") return "출시 혜택";
  if (eventType === "paid_credit") return "포인트 충전";
  if (eventType === "bonus_credit") return "충전 보너스";
  if (eventType === "bonus_revoke") return "환불 보너스 회수";
  if (eventType === "admin_credit") return "운영자 지급";
  if (eventType === "admin_debit") return "운영자 차감";
  if (eventType === "campaign_reserve") return "캠페인 예약";
  if (eventType === "campaign_settle") return "캠페인 정산";
  if (eventType === "campaign_release") return "예약 반환";
  if (eventType === "point_expire") return "포인트 만료";
  if (eventType === "refund_hold") return "환불 접수";
  if (eventType === "refund_complete") return "환불 완료";
  if (eventType === "refund_restore") return "환불 실패 복원";
  return eventType;
}
