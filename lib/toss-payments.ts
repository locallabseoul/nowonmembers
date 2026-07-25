const TOSS_API_BASE = "https://api.tosspayments.com/v1";

function getTossAuthorization() {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) throw new Error("Missing TOSS_SECRET_KEY");

  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function parseTossResponse(response: Response) {
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof body.message === "string" ? body.message : "토스페이먼츠 요청에 실패했습니다.";
    const error = new Error(message) as Error & { code?: string; body?: Record<string, unknown> };
    error.code = typeof body.code === "string" ? body.code : undefined;
    error.body = body;
    throw error;
  }

  return body;
}

export async function confirmTossPayment({
  paymentKey,
  orderId,
  amount,
  idempotencyKey
}: {
  paymentKey: string;
  orderId: string;
  amount: number;
  idempotencyKey: string;
}) {
  const response = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method: "POST",
    headers: {
      Authorization: getTossAuthorization(),
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
    cache: "no-store"
  });

  return parseTossResponse(response);
}

export async function cancelTossPayment({
  paymentKey,
  cancelAmount,
  cancelReason,
  idempotencyKey
}: {
  paymentKey: string;
  cancelAmount: number;
  cancelReason: string;
  idempotencyKey: string;
}) {
  const response = await fetch(`${TOSS_API_BASE}/payments/${encodeURIComponent(paymentKey)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: getTossAuthorization(),
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify({ cancelAmount, cancelReason }),
    cache: "no-store"
  });

  return parseTossResponse(response);
}

export async function getTossPaymentByOrderId(orderId: string) {
  const response = await fetch(`${TOSS_API_BASE}/payments/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: getTossAuthorization() },
    cache: "no-store"
  });

  return parseTossResponse(response);
}
