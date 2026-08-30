export const MINIHOME_LINK_TITLE_MAX_LENGTH = 60;
export const MINIHOME_LINK_URL_MAX_LENGTH = 2048;

export function normalizeMinihomeLinkUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function parseMinihomeLinkInput(titleValue: string, urlValue: string) {
  const title = titleValue.trim();
  const url = normalizeMinihomeLinkUrl(urlValue);

  if (!title) throw new Error("링크 이름을 입력해주세요.");
  if (title.length > MINIHOME_LINK_TITLE_MAX_LENGTH) {
    throw new Error(`링크 이름은 ${MINIHOME_LINK_TITLE_MAX_LENGTH}자 이하로 입력해주세요.`);
  }
  if (!url) throw new Error("연결할 주소를 입력해주세요.");
  if (url.length > MINIHOME_LINK_URL_MAX_LENGTH) throw new Error("연결할 주소가 너무 깁니다.");

  try {
    const parsed = new URL(url);
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname) throw new Error();
  } catch {
    throw new Error("올바른 웹 주소를 입력해주세요.");
  }

  return { title, url };
}
