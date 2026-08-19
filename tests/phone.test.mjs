import assert from "node:assert/strict";
import test from "node:test";
import { isKoreanMobilePhoneNumber } from "../lib/auth/phone.ts";

test("010 휴대폰 번호만 SMS 회원가입 번호로 허용한다", () => {
  assert.equal(isKoreanMobilePhoneNumber("010-1234-5678"), true);
  assert.equal(isKoreanMobilePhoneNumber("+82 10-1234-5678"), true);
});

test("유선전화와 불완전한 휴대폰 번호를 거절한다", () => {
  assert.equal(isKoreanMobilePhoneNumber("02-1234-5678"), false);
  assert.equal(isKoreanMobilePhoneNumber("010-123-4567"), false);
  assert.equal(isKoreanMobilePhoneNumber("011-1234-5678"), false);
});
