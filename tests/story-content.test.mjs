import assert from "node:assert/strict";
import test from "node:test";
import {
  isEditorialStoryKind,
  parseStoryContentBlocks,
  parseStoryContentBlocksJson,
  storyBlocksToPlainText,
  storyKindLabel
} from "../lib/story-content.ts";

test("스토리 공개 섹션과 관리자 작성 카테고리를 구분한다", () => {
  assert.equal(storyKindLabel("news"), "새소식");
  assert.equal(storyKindLabel("interview"), "인터뷰");
  assert.equal(storyKindLabel("submission"), "노원스토리");
  assert.equal(isEditorialStoryKind("news"), true);
  assert.equal(isEditorialStoryKind("submission"), false);
});

test("리치 콘텐츠 블록은 지원 형식과 안전한 웹 링크만 보존한다", () => {
  const blocks = parseStoryContentBlocks([
    { id: "a", type: "heading", text: "  가게 이야기  " },
    { id: "b", type: "paragraph", text: "본문", segments: [
      { text: "본", marks: ["bold", "unknown"] },
      { text: "문", link: "https://example.com/story" }
    ] },
    { id: "c", type: "link", label: "홈페이지", url: "https://example.com" },
    { id: "d", type: "link", label: "위험", url: "javascript:alert(1)" },
    { id: "e", type: "unknown", text: "무시" }
  ]);

  assert.deepEqual(blocks, [
    { id: "a", type: "heading", text: "가게 이야기" },
    { id: "b", type: "paragraph", text: "본문", segments: [
      { text: "본", marks: ["bold"] },
      { text: "문", link: "https://example.com/story" }
    ] },
    { id: "c", type: "link", label: "홈페이지", url: "https://example.com" }
  ]);
});

test("본문 이미지 업로드 자리표시자와 일반 텍스트 호환값을 만든다", () => {
  const blocks = parseStoryContentBlocksJson(JSON.stringify([
    { id: "image", type: "image", inputName: "block_image_image", caption: "매장 전경" },
    { id: "quote", type: "quote", text: "동네와 오래 함께하고 싶어요." }
  ]));

  assert.equal(blocks.length, 2);
  assert.match(storyBlocksToPlainText(blocks), /매장 전경/);
  assert.match(storyBlocksToPlainText(blocks), /동네와 오래/);
});
