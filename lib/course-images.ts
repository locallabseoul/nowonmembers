// Reuse the existing admin-only editorial image bucket.
export const COURSE_IMAGE_BUCKET = 'story-images';
export const MAX_COURSE_IMAGE_BYTES = 8 * 1024 * 1024;
export const COURSE_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};
export function courseImageError(file: { size: number; type: string }) {
  if (!COURSE_IMAGE_EXTENSIONS[file.type]) return 'JPG, PNG, WEBP 사진을 선택해주세요.';
  if (!file.size || file.size > MAX_COURSE_IMAGE_BYTES) return '사진은 0바이트보다 크고 8MB 이하여야 합니다.';
  return '';
}
