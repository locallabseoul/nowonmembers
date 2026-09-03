export const STORY_IMAGE_BUCKET = "story-images";
export const MAX_STORY_IMAGE_BYTES = 8 * 1024 * 1024;

export const STORY_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export function isOwnedStoryImagePath(userId: string, path: string) {
  const prefix = `${userId}/stories/`;
  if (!path.startsWith(prefix)) return false;

  const fileName = path.slice(prefix.length);
  return /^[A-Za-z0-9][A-Za-z0-9_-]*\.(?:jpg|jpeg|png|webp)$/.test(fileName);
}
