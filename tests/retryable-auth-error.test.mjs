import assert from "node:assert/strict";
import test from "node:test";
import { isRetryableAuthError } from "../lib/auth/retryable-error.ts";

test("Supabase의 재시도 가능한 Auth 오류를 구분한다", () => {
  assert.equal(isRetryableAuthError({ name: "AuthRetryableFetchError", status: 500 }), true);
  assert.equal(isRetryableAuthError({ name: "AuthApiError", status: 503 }), true);
});

test("입력 및 요청 제한 오류는 자동 재시도하지 않는다", () => {
  assert.equal(isRetryableAuthError({ name: "AuthApiError", status: 422 }), false);
  assert.equal(isRetryableAuthError({ name: "AuthApiError", status: 429 }), false);
  assert.equal(isRetryableAuthError(null), false);
});
