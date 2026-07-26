import assert from "node:assert/strict";
import test from "node:test";
import {
  getPointChargeOption,
  POINT_CHARGE_OPTIONS,
  campaignPointCost,
  formatPoints
} from "../lib/points.ts";
import { cancelTossPayment, confirmTossPayment } from "../lib/toss-payments.ts";

test("campaign cost uses 5,000P per recruit", () => {
  assert.equal(campaignPointCost(1), 5_000);
  assert.equal(campaignPointCost(5), 25_000);
  assert.equal(campaignPointCost(10), 50_000);
  assert.equal(formatPoints(25_000), "25,000P");
});

test("point charge options include VAT and higher amounts grant a bonus", () => {
  assert.deepEqual(
    POINT_CHARGE_OPTIONS.map(({ paidPoints, bonusPoints, totalAmount }) => ({
      paidPoints,
      bonusPoints,
      totalAmount
    })),
    [
      { paidPoints: 25_000, bonusPoints: 0, totalAmount: 27_500 },
      { paidPoints: 50_000, bonusPoints: 5_000, totalAmount: 55_000 },
      { paidPoints: 100_000, bonusPoints: 10_000, totalAmount: 110_000 }
    ]
  );

  for (const option of POINT_CHARGE_OPTIONS) {
    assert.equal(option.totalAmount, Math.round(option.paidPoints * 1.1));
  }

  assert.equal(getPointChargeOption(75_000), undefined);
});

test("Toss confirmation sends the server-owned amount and idempotency key", async () => {
  process.env.TOSS_SECRET_KEY = "test_secret";
  const originalFetch = globalThis.fetch;
  let request = null;

  globalThis.fetch = async (input, init) => {
    request = { url: String(input), init };
    return new Response(JSON.stringify({ status: "DONE", method: "CARD", paymentKey: "payment-key" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const response = await confirmTossPayment({
      paymentKey: "payment-key",
      orderId: "points_order_123",
      amount: 55_000,
      idempotencyKey: "00000000-0000-4000-8000-000000000001"
    });

    assert.equal(response.status, "DONE");
    assert.equal(request?.url, "https://api.tosspayments.com/v1/payments/confirm");
    assert.equal(request?.init?.method, "POST");
    assert.equal(request?.init?.headers["Idempotency-Key"], "00000000-0000-4000-8000-000000000001");
    assert.deepEqual(JSON.parse(String(request?.init?.body)), {
      paymentKey: "payment-key",
      orderId: "points_order_123",
      amount: 55_000
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Toss partial cancellation sends only the refundable paid balance", async () => {
  process.env.TOSS_SECRET_KEY = "test_secret";
  const originalFetch = globalThis.fetch;
  let body = {};

  globalThis.fetch = async (_input, init) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ status: "PARTIAL_CANCELED" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    await cancelTossPayment({
      paymentKey: "payment-key",
      cancelAmount: 27_500,
      cancelReason: "미사용 유상 포인트 환불",
      idempotencyKey: "00000000-0000-4000-8000-000000000002"
    });
    assert.deepEqual(body, {
      cancelAmount: 27_500,
      cancelReason: "미사용 유상 포인트 환불"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Toss errors are surfaced without crediting points", async () => {
  process.env.TOSS_SECRET_KEY = "test_secret";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ code: "INVALID_AMOUNT", message: "결제 금액이 올바르지 않습니다." }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );

  try {
    await assert.rejects(
      confirmTossPayment({
        paymentKey: "payment-key",
        orderId: "points_order_123",
        amount: 1,
        idempotencyKey: "00000000-0000-4000-8000-000000000003"
      }),
      /결제 금액이 올바르지 않습니다/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
