import { ImageResponse } from "next/og";

export const alt = "노원멤버스 - 노원의 가게와 지역 크리에이터를 연결하는 로컬 콘텐츠 협업 플랫폼";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 96px",
          background: "#0f172a"
        }}
      >
        <div style={{ display: "flex", fontSize: 84, fontWeight: 900, letterSpacing: -2 }}>
          <span style={{ color: "#ffffff" }}>NOWON</span>
          <span style={{ color: "#22c55e" }}>MEMBERS</span>
        </div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 34, color: "#94a3b8" }}>
          노원의 가게와 지역 크리에이터를 연결합니다
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 56,
            padding: "14px 32px",
            borderRadius: 999,
            background: "#22c55e",
            color: "#052e16",
            fontSize: 28,
            fontWeight: 700
          }}
        >
          로컬 콘텐츠 캠페인 플랫폼
        </div>
      </div>
    ),
    size
  );
}
