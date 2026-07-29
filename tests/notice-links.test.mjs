import assert from "node:assert/strict";
import test from "node:test";
import { tokenizeNoticeBody } from "../lib/notice-links.ts";

function linksOf(body) {
  return tokenizeNoticeBody(body)
    .filter((token) => token.type !== "text")
    .map((token) => token.value);
}

test("notice bodies link only allowed internal paths and http(s) urls", () => {
  assert.deepEqual(linksOf("가이드는 /guide/campaign 에서 확인하세요."), ["/guide/campaign"]);
  assert.deepEqual(linksOf("약관 /terms 과 /privacy 를 확인하세요."), ["/terms", "/privacy"]);
  assert.deepEqual(linksOf("자세한 내용은 https://nowonmembers.com/notices 참고"), [
    "https://nowonmembers.com/notices"
  ]);
});

test("notice bodies never turn arbitrary text into links", () => {
  // 링크가 아닌 조각이 "/"로 시작한다는 이유로 링크가 되면 임의 경로가 href에 실린다.
  for (const body of [
    "1/2 정도 진행됐고 3/4은 남았습니다.",
    "캠페인은 이렇게 작성하시면 됩니다.",
    "/etc/passwd 같은 경로",
    "javascript:alert(1) 은 링크가 되면 안 됩니다",
    "/admin 은 허용 목록에 없습니다"
  ]) {
    assert.deepEqual(linksOf(body), [], body);
  }
});

test("notice body text survives tokenizing unchanged", () => {
  const body = "가이드는 /guide/campaign 에서 확인하세요.";
  assert.equal(tokenizeNoticeBody(body).map((token) => token.value).join(""), body);
});
