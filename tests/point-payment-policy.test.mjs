import assert from "node:assert/strict";
import test from "node:test";
import { isPointPaymentAllowed } from "../lib/point-payment-policy.ts";

test("심사 모드에서는 허용 목록에 등록한 계정만 결제할 수 있다", () => {
  assert.equal(isPointPaymentAllowed("review-user", "review", "other-user, review-user"), true);
  assert.equal(isPointPaymentAllowed("business-user", "review", "review-user"), false);
});

test("허용 목록이 없거나 알 수 없는 모드이면 결제를 닫는다", () => {
  assert.equal(isPointPaymentAllowed("review-user", undefined, undefined), false);
  assert.equal(isPointPaymentAllowed("review-user", "unexpected", "review-user"), false);
});

test("오픈 모드에서는 모든 가게 계정의 결제를 허용한다", () => {
  assert.equal(isPointPaymentAllowed("business-user", "open", ""), true);
});
