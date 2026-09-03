import assert from "node:assert/strict";
import test from "node:test";
import { isOwnedStoryImagePath } from "../lib/story-images.ts";

test("스토리 이미지 경로는 로그인한 사용자의 stories 폴더만 허용한다", () => {
  assert.equal(isOwnedStoryImagePath("admin-1", "admin-1/stories/cover_123.webp"), true);
  assert.equal(isOwnedStoryImagePath("admin-1", "admin-2/stories/cover_123.webp"), false);
  assert.equal(isOwnedStoryImagePath("admin-1", "admin-1/stories/nested/cover.jpg"), false);
  assert.equal(isOwnedStoryImagePath("admin-1", "admin-1/stories/../cover.jpg"), false);
  assert.equal(isOwnedStoryImagePath("admin-1", "admin-1/stories/cover.svg"), false);
});
