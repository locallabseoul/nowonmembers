import assert from "node:assert/strict";
import test from "node:test";
import { getCreatorChannelUrlError, normalizeCreatorChannelUrl } from "../lib/creator-channel-url.ts";

test("인스타그램 아이디를 정식 프로필 URL로 변환한다", () => {
  for (const input of ["@junyeol257", "junyeol257", "http://junyeol257"]) {
    assert.equal(normalizeCreatorChannelUrl("인스타그램", input), "https://www.instagram.com/junyeol257/");
  }
});

test("인스타그램 프로필 URL은 https 정규 주소로 통일한다", () => {
  assert.equal(
    normalizeCreatorChannelUrl("인스타그램", "http://instagram.com/junyeol257?utm_source=test"),
    "https://www.instagram.com/junyeol257/"
  );
  assert.equal(
    normalizeCreatorChannelUrl("인스타그램", "www.instagram.com/junyeol257/"),
    "https://www.instagram.com/junyeol257/"
  );
});

test("인스타그램이 아닌 도메인과 게시물 URL은 대표 채널로 받지 않는다", () => {
  for (const input of ["https://example.com/junyeol257", "https://instagram.com/p/abc", "잘못된 아이디!"]) {
    assert.notEqual(getCreatorChannelUrlError("인스타그램", input), "");
  }
});

test("다른 플랫폼은 기존처럼 http 또는 https URL을 받는다", () => {
  assert.equal(normalizeCreatorChannelUrl("네이버 블로그", "https://blog.naver.com/example"), "https://blog.naver.com/example");
  assert.notEqual(getCreatorChannelUrlError("네이버 블로그", "@example"), "");
});
