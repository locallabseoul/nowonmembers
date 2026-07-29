import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSessionProfile } from "@/lib/auth/guards";

const MAX_QUERY_LENGTH = 100;

type NaverGeocodeAddress = {
  roadAddress?: string;
  jibunAddress?: string;
  x?: string;
  y?: string;
};

type NaverGeocodeResponse = {
  status?: string;
  errorMessage?: string;
  addresses?: NaverGeocodeAddress[];
};

type NaverApiErrorResponse = {
  error?: {
    errorCode?: string;
    message?: string;
    details?: string;
  };
};

function getNaverMapsCredentials() {
  const keyId = process.env.NAVER_MAPS_CLIENT_ID ?? process.env.NAVER_CLOUD_MAPS_CLIENT_ID;
  const key = process.env.NAVER_MAPS_CLIENT_SECRET ?? process.env.NAVER_CLOUD_MAPS_CLIENT_SECRET;

  return { keyId, key };
}

function getNaverErrorMessage(status: number, body: string) {
  let details = "";
  try {
    const parsed = JSON.parse(body) as NaverApiErrorResponse;
    details = parsed.error?.details ?? parsed.error?.message ?? "";
  } catch {
    details = body;
  }

  if (details.includes("subscription") || details.includes("Permission Denied")) {
    return "네이버 Cloud 콘솔에서 Geocoding API 구독/활성화가 필요합니다.";
  }

  if (status === 401 || status === 403) {
    return "네이버 지도 API 인증에 실패했습니다. API 키와 서비스 활성화 상태를 확인해주세요.";
  }

  return "주소 검색 API 호출에 실패했습니다.";
}

function getAddressQueryCandidates(query: string) {
  const normalizedRoadName = query.replace(/([가-힣]+(?:로|길))(\d)/g, "$1 $2");
  return Array.from(new Set([query, normalizedRoadName].map((value) => value.trim()).filter(Boolean)));
}

async function fetchNaverGeocode(query: string, keyId: string, key: string) {
  const url = new URL("https://maps.apigw.ntruss.com/map-geocode/v2/geocode");
  url.searchParams.set("query", query);
  url.searchParams.set("count", "5");

  return fetch(url, {
    headers: {
      Accept: "application/json",
      "x-ncp-apigw-api-key-id": keyId,
      "x-ncp-apigw-api-key": key
    }
  });
}

export async function GET(request: NextRequest) {
  // 주소 검색은 가게 프로필과 캠페인 생성 위저드에서만 쓴다. 열어두면 네이버
  // Geocoding 호출 비용을 누구나 발생시킬 수 있다.
  const { profile } = await getCurrentSessionProfile();
  if (profile?.role !== "business") {
    return NextResponse.json(
      { error: "가게 계정으로 로그인해야 주소를 검색할 수 있습니다.", addresses: [] },
      { status: 403 }
    );
  }

  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  if (query.length < 2 || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ addresses: [] });
  }

  const { keyId, key } = getNaverMapsCredentials();
  if (!keyId || !key) {
    return NextResponse.json(
      { error: "네이버 지도 API 키가 설정되지 않았습니다.", addresses: [] },
      { status: 500 }
    );
  }

  let response: Response | null = null;
  let result: NaverGeocodeResponse | null = null;

  for (const candidate of getAddressQueryCandidates(query)) {
    response = await fetchNaverGeocode(candidate, keyId, key);

    if (!response.ok) break;

    result = await response.json() as NaverGeocodeResponse;
    if ((result.addresses ?? []).length > 0) break;
  }

  if (!response) {
    return NextResponse.json(
      { error: "주소 검색 API 호출에 실패했습니다.", addresses: [] },
      { status: 500 }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Naver geocode request failed", {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });

    return NextResponse.json(
      {
        error: getNaverErrorMessage(response.status, errorText),
        addresses: []
      },
      { status: response.status }
    );
  }

  if (result?.status && result.status !== "OK") {
    return NextResponse.json(
      { error: result.errorMessage ?? "주소 검색 결과를 불러오지 못했습니다.", addresses: [] },
      { status: 500 }
    );
  }

  return NextResponse.json({
    addresses: (result?.addresses ?? []).map((address) => ({
      address: address.roadAddress || address.jibunAddress || "",
      roadAddress: address.roadAddress ?? "",
      jibunAddress: address.jibunAddress ?? "",
      longitude: address.x ?? "",
      latitude: address.y ?? ""
    })).filter((address) => address.address && address.latitude && address.longitude)
  });
}
