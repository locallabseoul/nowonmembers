import assert from 'node:assert/strict';
import test from 'node:test';
import { courseImageError, MAX_COURSE_IMAGE_BYTES } from '../lib/course-images.ts';
test('course cover upload accepts supported formats up to the limit', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(courseImageError({ type, size: MAX_COURSE_IMAGE_BYTES }), '');
});
test('course cover upload rejects empty, oversized and active content', () => {
  for (const file of [{ type: 'image/png', size: 0 }, { type: 'image/png', size: MAX_COURSE_IMAGE_BYTES + 1 }, { type: 'image/svg+xml', size: 10 }, { type: 'text/html', size: 10 }]) assert.notEqual(courseImageError(file), '');
});
