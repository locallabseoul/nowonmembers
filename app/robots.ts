import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 관리자·API·계정 흐름은 검색에 노출할 이유가 없다.
      disallow: ["/admin", "/api/", "/auth", "/business/", "/creator/", "/notifications"]
    },
    sitemap: "https://nowon-me.kr/sitemap.xml"
  };
}
