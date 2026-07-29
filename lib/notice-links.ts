// 공지 본문은 평문으로 저장된다. 링크로 만들 대상은 http(s) 주소와 아래 내부 경로만
// 허용해, "1/2" 같은 표현이나 임의 경로가 링크로 바뀌는 일이 없게 한다.
const INTERNAL_PREFIXES = ["guide", "campaigns", "stories", "notices", "terms", "privacy"];
const LINK_SOURCE = `https?://[^\\s<>()]+|/(?:${INTERNAL_PREFIXES.join("|")})[A-Za-z0-9\\-._~/]*`;
const LINK_PATTERN = new RegExp(`(${LINK_SOURCE})`, "g");
// split 결과에는 링크가 아닌 조각도 섞여 있다. 앞글자만 보고 판단하면 "/etc/..."로
// 시작하는 본문이 통째로 링크가 되므로, 조각 전체가 패턴과 일치할 때만 링크로 본다.
const EXACT_LINK_PATTERN = new RegExp(`^(?:${LINK_SOURCE})$`);

export type NoticeToken = {
  type: "text" | "internal" | "external";
  value: string;
};

export function tokenizeNoticeBody(body: string): NoticeToken[] {
  return body
    .split(LINK_PATTERN)
    .filter(Boolean)
    .map((value) => {
      if (!EXACT_LINK_PATTERN.test(value)) return { type: "text" as const, value };
      if (value.startsWith("/")) return { type: "internal" as const, value };
      return { type: "external" as const, value };
    });
}
