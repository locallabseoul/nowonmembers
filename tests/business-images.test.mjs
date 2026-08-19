import assert from "node:assert/strict";
import test from "node:test";
import { isOwnedBusinessImagePath } from "../lib/business-images.ts";

const userId = "12345678-1234-4234-9234-123456789012";

test("가게 이미지는 로그인한 사용자의 business 폴더와 지원 형식만 허용한다", () => {
  assert.equal(isOwnedBusinessImagePath(userId, `${userId}/business/1234-photo.jpg`), true);
  assert.equal(isOwnedBusinessImagePath(userId, `${userId}/business/1234-photo.webp`), true);
});

test("다른 사용자 폴더와 하위 경로 위조를 거절한다", () => {
  assert.equal(isOwnedBusinessImagePath(userId, `other-user/business/photo.jpg`), false);
  assert.equal(isOwnedBusinessImagePath(userId, `${userId}/business/../photo.jpg`), false);
  assert.equal(isOwnedBusinessImagePath(userId, `${userId}/business/nested/photo.png`), false);
  assert.equal(isOwnedBusinessImagePath(userId, `${userId}/business/photo.svg`), false);
});
