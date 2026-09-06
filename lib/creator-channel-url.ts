const INSTAGRAM_USERNAME_PATTERN = /^[A-Za-z0-9._]{1,30}$/;

function instagramUsernameFromInput(value: string) {
  const trimmed = value.trim();
  const handle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (INSTAGRAM_USERNAME_PATTERN.test(handle)) return handle;

  const withProtocol = /^(?:https?:\/\/)/i.test(trimmed)
    ? trimmed
    : /^(?:www\.)?instagram\.com\//i.test(trimmed)
      ? `https://${trimmed}`
      : "";
  if (!withProtocol) return "";

  try {
    const url = new URL(withProtocol);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    // 예전 검증을 통과한 http://아이디 형태도 프로필 수정 시 자동으로 복구한다.
    if (!hostname.includes(".") && !url.pathname.replace(/\//g, "")) {
      return INSTAGRAM_USERNAME_PATTERN.test(hostname) ? hostname : "";
    }
    if (hostname !== "instagram.com") return "";

    const [username, extraPath] = url.pathname.split("/").filter(Boolean);
    if (!username || extraPath || !INSTAGRAM_USERNAME_PATTERN.test(username)) return "";
    return username;
  } catch {
    return "";
  }
}

export function normalizeCreatorChannelUrl(platform: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("대표 채널 URL을 입력해주세요.");

  if (platform === "인스타그램") {
    const username = instagramUsernameFromInput(trimmed);
    if (!username) {
      throw new Error("인스타그램 아이디(@아이디) 또는 프로필 URL을 정확히 입력해주세요.");
    }
    return `https://www.instagram.com/${username}/`;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
    return trimmed;
  } catch {
    throw new Error("대표 채널 URL은 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다.");
  }
}

export function getCreatorChannelUrlError(platform: string, value: string) {
  try {
    normalizeCreatorChannelUrl(platform, value);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "대표 채널 정보를 확인해주세요.";
  }
}
