"use client";

import { useEffect, useId, useState } from "react";

declare global {
  interface Window {
    naver?: {
      maps?: {
        LatLng: new (latitude: number, longitude: number) => unknown;
        Map: new (
          element: string | HTMLElement,
          options: {
            center: unknown;
            zoom: number;
            minZoom?: number;
            zoomControl?: boolean;
            zoomControlOptions?: {
              position?: unknown;
            };
          }
        ) => unknown;
        Marker: new (options: { position: unknown; map: unknown }) => unknown;
        Position?: {
          TOP_RIGHT?: unknown;
        };
      };
    };
  }
}

type CampaignMapProps = {
  latitude: number;
  longitude: number;
  address: string;
  clientId?: string;
};

let naverMapsScriptPromise: Promise<void> | null = null;

function loadNaverMaps(clientId: string) {
  if (window.naver?.maps) return Promise.resolve();
  if (naverMapsScriptPromise) return naverMapsScriptPromise;

  naverMapsScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-naver-maps-sdk='true']");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("네이버 지도 SDK를 불러오지 못했습니다.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`;
    script.async = true;
    script.defer = true;
    script.dataset.naverMapsSdk = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("네이버 지도 SDK를 불러오지 못했습니다.")), { once: true });
    document.head.appendChild(script);
  });

  return naverMapsScriptPromise;
}

export function CampaignMap({ latitude, longitude, address, clientId }: CampaignMapProps) {
  const mapId = useId().replace(/:/g, "");
  const [message, setMessage] = useState(clientId ? "지도를 불러오는 중입니다." : "네이버 지도 API 키 설정이 필요합니다.");

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;

    loadNaverMaps(clientId)
      .then(() => {
        if (cancelled || !window.naver?.maps) return;

        const mapElement = document.getElementById(mapId);
        if (!mapElement) return;

        const position = new window.naver.maps.LatLng(latitude, longitude);
        const map = new window.naver.maps.Map(mapElement, {
          center: position,
          zoom: 16,
          minZoom: 8,
          zoomControl: true,
          zoomControlOptions: {
            position: window.naver.maps.Position?.TOP_RIGHT
          }
        });

        new window.naver.maps.Marker({
          position,
          map
        });

        setMessage("");
      })
      .catch((error: unknown) => {
        const nextMessage = error instanceof Error ? error.message : "네이버 지도를 불러오지 못했습니다.";
        setMessage(nextMessage);
      });

    return () => {
      cancelled = true;
    };
  }, [address, clientId, latitude, longitude, mapId]);

  return (
    <div className="relative h-56 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
      <div id={mapId} aria-label={`${address} 지도`} className="h-full w-full" />
      {message ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 px-4 text-center text-sm font-bold text-slate-400">
          {message}
        </div>
      ) : null}
    </div>
  );
}
