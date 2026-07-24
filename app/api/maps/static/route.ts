import { NextResponse, type NextRequest } from "next/server";

function getNaverMapsCredentials() {
  const keyId = process.env.NAVER_MAPS_CLIENT_ID ?? process.env.NAVER_CLOUD_MAPS_CLIENT_ID;
  const key = process.env.NAVER_MAPS_CLIENT_SECRET ?? process.env.NAVER_CLOUD_MAPS_CLIENT_SECRET;

  return { keyId, key };
}

function svgFallback(message: string) {
  return new NextResponse(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320" viewBox="0 0 640 320">
      <rect width="640" height="320" fill="#f1f5f9"/>
      <text x="320" y="156" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#334155">${message}</text>
      <text x="320" y="184" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#64748b">NAVER Maps Static API</text>
    </svg>`,
    {
      headers: {
        "content-type": "image/svg+xml",
        "cache-control": "no-store"
      }
    }
  );
}

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return svgFallback("좌표 정보가 없습니다.");
  }

  const { keyId, key } = getNaverMapsCredentials();
  if (!keyId || !key) {
    return svgFallback("네이버 지도 API 키 설정이 필요합니다.");
  }

  const url = new URL("https://maps.apigw.ntruss.com/map-static/v2/raster");
  url.searchParams.set("w", "640");
  url.searchParams.set("h", "320");
  url.searchParams.set("center", `${longitude},${latitude}`);
  url.searchParams.set("level", "16");
  url.searchParams.set("format", "png");
  url.searchParams.set("scale", "2");
  url.searchParams.append("markers", `type:n|size:mid|color:red|pos:${longitude} ${latitude}`);

  const response = await fetch(url, {
    headers: {
      "x-ncp-apigw-api-key-id": keyId,
      "x-ncp-apigw-api-key": key
    }
  });

  if (!response.ok || !response.body) {
    return svgFallback("지도 이미지를 불러오지 못했습니다.");
  }

  return new NextResponse(response.body, {
    headers: {
      "content-type": response.headers.get("content-type") ?? "image/png",
      "cache-control": "public, max-age=3600"
    }
  });
}
