import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMinihomeLinkUrl, parseMinihomeLinkInput } from "../lib/minihome-link-input.ts";

test("미니홈 외부 링크는 프로토콜이 없으면 https를 붙인다", () => {
  assert.equal(normalizeMinihomeLinkUrl(" smartstore.naver.com/shop "), "https://smartstore.naver.com/shop");
});

test("미니홈 외부 링크 이름과 주소의 공백을 정리한다", () => {
  assert.deepEqual(parseMinihomeLinkInput(" 스마트스토어 ", " https://example.com/store "), {
    title: "스마트스토어",
    url: "https://example.com/store"
  });
});

test("미니홈 외부 링크는 웹 주소만 허용한다", () => {
  for (const url of ["ftp://example.com", "javascript:alert(1)", "https://"] ) {
    assert.throws(() => parseMinihomeLinkInput("구매하기", url));
  }
});

test("미니홈 외부 링크 이름은 필수이며 60자를 넘을 수 없다", () => {
  assert.throws(() => parseMinihomeLinkInput(" ", "example.com"));
  assert.throws(() => parseMinihomeLinkInput("가".repeat(61), "example.com"));
});
