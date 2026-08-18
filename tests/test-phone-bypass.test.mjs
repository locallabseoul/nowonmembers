import assert from "node:assert/strict";
import test from "node:test";
import { isTestPhoneBypassAllowed } from "../lib/auth/test-phone-bypass.ts";

const enabled = {
  NODE_ENV: "development",
  AUTH_TEST_PHONE_BYPASS_ENABLED: "true",
  AUTH_TEST_PHONE_NUMBERS: "010-0000-0001, 01000000002"
};

test("허용 목록에 등록한 테스트 번호만 인증을 건너뛴다", () => {
  assert.equal(isTestPhoneBypassAllowed("01000000001", enabled), true);
  assert.equal(isTestPhoneBypassAllowed("010-0000-0002", enabled), true);
  assert.equal(isTestPhoneBypassAllowed("01000000003", enabled), false);
});

test("기능을 명시적으로 켜지 않으면 허용 목록이 있어도 비활성화된다", () => {
  assert.equal(isTestPhoneBypassAllowed("01000000001", {
    ...enabled,
    AUTH_TEST_PHONE_BYPASS_ENABLED: "false"
  }), false);
});

test("Vercel Preview에서는 명시적으로 설정하면 사용할 수 있다", () => {
  assert.equal(isTestPhoneBypassAllowed("01000000001", {
    ...enabled,
    NODE_ENV: "production",
    VERCEL_ENV: "preview"
  }), true);
});

test("운영 배포에서는 환경변수와 무관하게 차단한다", () => {
  assert.equal(isTestPhoneBypassAllowed("01000000001", {
    ...enabled,
    NODE_ENV: "production"
  }), false);
  assert.equal(isTestPhoneBypassAllowed("01000000001", {
    ...enabled,
    NODE_ENV: "production",
    VERCEL_ENV: "production"
  }), false);
});
