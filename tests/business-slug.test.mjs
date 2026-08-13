import assert from "node:assert/strict";
import test from "node:test";
import { getBusinessSlugError, normalizeBusinessSlug } from "../lib/business-slug.ts";

test("business slugs normalize spaces and uppercase letters", () => {
  assert.equal(normalizeBusinessSlug("  Cafe-Ordinary  "), "cafe-ordinary");
});

test("business slugs accept lowercase words, numbers, and internal hyphens", () => {
  for (const slug of ["cafe-ordinary", "store101", "nowon-101"]) {
    assert.equal(getBusinessSlugError(slug), "", slug);
  }
});

test("business slugs reject malformed and reserved values", () => {
  for (const slug of ["ab", "-cafe", "cafe-", "cafe--nowon", "카페", "cafe_nowon", "admin", "campaigns"]) {
    assert.notEqual(getBusinessSlugError(slug), "", slug);
  }
});

test("business slugs reject values over forty characters", () => {
  assert.notEqual(getBusinessSlugError("a".repeat(41)), "");
});
