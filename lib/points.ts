export const POINTS_PER_RECRUIT = 5_000;
export const POINT_PACK_POINTS = 50_000;
export const POINT_PACK_SUPPLY_AMOUNT = 50_000;
export const POINT_PACK_VAT_AMOUNT = 5_000;
export const POINT_PACK_TOTAL_AMOUNT = 55_000;
export const POINT_TERMS_VERSION = "2026-07-26";

export type PointWalletSummary = {
  businessId: string;
  availablePoints: number;
  reservedPoints: number;
  promotionalPoints: number;
  paidPoints: number;
  nextExpirationAt: string | null;
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

export function pointEventLabel(eventType: string) {
  if (eventType === "promotional_credit") return "출시 혜택";
  if (eventType === "paid_credit") return "포인트 충전";
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
