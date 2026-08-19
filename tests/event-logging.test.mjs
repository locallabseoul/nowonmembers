import assert from "node:assert/strict";
import test from "node:test";
import { getErrorLogContext, isFailureEventName } from "../lib/event-logging.ts";

test("Auth 오류는 원인 확인에 필요한 코드와 상태를 기록한다", () => {
  assert.deepEqual(getErrorLogContext({
    name: "AuthApiError",
    message: "{}",
    code: "sms_send_failed",
    status: 500,
    phone: "+821012345678"
  }), {
    error: "{}",
    errorCode: "sms_send_failed",
    errorStatus: 500,
    errorName: "AuthApiError"
  });
});

test("화면용 오류와 원본 오류를 구분하고 입력 개인정보는 기록하지 않는다", () => {
  assert.deepEqual(getErrorLogContext({
    message: "User already registered",
    code: "phone_exists",
    phone: "+821012345678"
  }, "이미 가입된 전화번호입니다."), {
    error: "User already registered",
    errorCode: "phone_exists",
    displayError: "이미 가입된 전화번호입니다."
  });
});

test("점과 밑줄 접미사의 실패 이벤트를 모두 구분한다", () => {
  assert.equal(isFailureEventName("signup.failed"), true);
  assert.equal(isFailureEventName("auth.otp_failed"), true);
  assert.equal(isFailureEventName("signup.completed"), false);
});
