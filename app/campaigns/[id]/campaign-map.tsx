"use client";

import { useEffect, useId, useState, useRef } from "react";

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
        Event: {
          addListener: (target: unknown, name: string, callback: (event: { coord: { lat(): number; lng(): number } }) => void) => unknown;
          removeListener: (listener: unknown) => void;
        };
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
  onPick?: (latitude: number, longitude: number) => void;
};

let naverMapsScriptPromise: Promise<void> | null = null;

function loadNaverMaps(clientId: string) {
  if (window.naver?.maps) return Promise.resolve();
  if (naverMapsScriptPromise) return naverMapsScriptPromise;

  naverMapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-naver-maps-sdk='true']");
    const script = existing ?? document.createElement('script');
    function cleanup() { clearTimeout(timer); script.removeEventListener('load', loaded); script.removeEventListener('error', failed); }
    function loaded() { cleanup(); if (window.naver?.maps) resolve(); else { script.remove(); reject(new Error('지도 인증을 확인해주세요. 주소 검색 또는 좌표 입력은 계속 사용할 수 있습니다.')); } }
    function failed() { cleanup(); script.remove(); reject(new Error('지도를 불러오지 못했습니다. 주소 검색 또는 좌표 입력을 이용해주세요.')); }
    const timer = setTimeout(failed, 15000);
    script.addEventListener('load', loaded, { once: true });
    script.addEventListener('error', failed, { once: true });
    if (!existing) {
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`;
      script.async = true; script.defer = true; script.dataset.naverMapsSdk = 'true';
      document.head.appendChild(script);
    }
  }).catch(error => { naverMapsScriptPromise = null; throw error; });

  return naverMapsScriptPromise;
}

export function CampaignMap({ latitude, longitude, address, clientId, onPick }: CampaignMapProps) {
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const mapId = useId().replace(/:/g, "");
  const [message, setMessage] = useState(clientId ? "지도를 불러오는 중입니다." : "네이버 지도 API 키 설정이 필요합니다.");

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    let listener: unknown;

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

        if (pickRef.current) listener = window.naver.maps.Event.addListener(map, 'click', (event) => {
          pickRef.current?.(event.coord.lat(), event.coord.lng());
        });
        setMessage("");
      })
      .catch((error: unknown) => {
        const nextMessage = error instanceof Error ? error.message : "네이버 지도를 불러오지 못했습니다.";
        setMessage(nextMessage);
      });

    return () => {
      cancelled = true;
      if (listener) window.naver?.maps?.Event.removeListener(listener);
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
