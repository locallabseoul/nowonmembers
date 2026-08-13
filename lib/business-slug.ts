export const BUSINESS_SLUG_MIN_LENGTH = 3;
export const BUSINESS_SLUG_MAX_LENGTH = 40;

export const RESERVED_BUSINESS_SLUGS = new Set([
  "account", "admin", "api", "auth", "brand", "business", "campaigns", "creator",
  "guide", "marketing", "notices", "notifications", "optout", "privacy", "stories", "terms"
]);

const BUSINESS_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeBusinessSlug(value: string) {
  return value.trim().toLowerCase();
}
export function getBusinessSlugError(value: string) {
  const slug = normalizeBusinessSlug(value);
  if (!slug) return "미니홈 주소를 입력해주세요.";
  if (slug.length < BUSINESS_SLUG_MIN_LENGTH || slug.length > BUSINESS_SLUG_MAX_LENGTH) {
    return `미니홈 주소는 ${BUSINESS_SLUG_MIN_LENGTH}~${BUSINESS_SLUG_MAX_LENGTH}자로 입력해주세요.`;
  }
  if (!BUSINESS_SLUG_PATTERN.test(slug)) {
    return "영문 소문자, 숫자, 하이픈만 사용할 수 있으며 하이픈은 단어 사이에만 넣을 수 있습니다.";
  }
  if (RESERVED_BUSINESS_SLUGS.has(slug)) return "서비스에서 사용 중인 주소입니다. 다른 주소를 입력해주세요.";
  return "";
}
