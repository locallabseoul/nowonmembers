import "server-only";
import { isPointPaymentAllowed } from "@/lib/point-payment-policy";

const PAYMENT_CLOSED_MESSAGE =
  "카드 결제는 준비 중입니다. 포인트가 필요하시면 운영자에게 문의해주세요.";

/**
 * 토스 심사 중에는 지정한 계정만 결제를 쓸 수 있다. 심사 승인 후
 * POINT_PAYMENT_ACCESS_MODE=open으로 바꾸면 모든 가게 계정에 열린다.
 */
export function canAccessPointPayments(userId: string) {
  return isPointPaymentAllowed(
    userId,
    process.env.POINT_PAYMENT_ACCESS_MODE,
    process.env.TOSS_REVIEW_USER_IDS
  );
}

export function assertPointPaymentAccess(userId: string) {
  if (!canAccessPointPayments(userId)) throw new Error(PAYMENT_CLOSED_MESSAGE);
}
