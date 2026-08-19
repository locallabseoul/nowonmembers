export const BUSINESS_IMAGE_BUCKET = "business-images";

export function isOwnedBusinessImagePath(userId: string, path: string) {
  const prefix = `${userId}/business/`;
  if (!path.startsWith(prefix)) return false;

  const fileName = path.slice(prefix.length);
  return /^[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp)$/i.test(fileName);
}
