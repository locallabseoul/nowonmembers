"use client";

import { useEffect } from "react";
import { recordCampaignView } from "./view-actions";

const VIEWER_KEY_STORAGE = "nowon_viewer_key";

// 방문자를 구분할 값. 개인을 식별하려는 게 아니라 같은 사람이 새로고침할 때
// 중복으로 세지 않으려는 용도라, 브라우저에만 두고 서버로는 이 값만 보낸다.
function getViewerKey() {
  try {
    const saved = window.localStorage.getItem(VIEWER_KEY_STORAGE);
    if (saved) return saved;

    const next = crypto.randomUUID();
    window.localStorage.setItem(VIEWER_KEY_STORAGE, next);
    return next;
  } catch {
    // 시크릿 모드 등 저장이 막힌 경우. 세션 안에서만 유효한 값으로 대체한다.
    return null;
  }
}

// 크롤러는 자바스크립트를 실행하지 않으므로 이 방식만으로도 봇 조회가 대부분 걸러진다.
export function CampaignViewTracker({ campaignId }: { campaignId: string }) {
  useEffect(() => {
    const viewerKey = getViewerKey();
    if (!viewerKey) return;

    // 화면을 열자마자 세면 스치듯 지나간 방문도 잡힌다. 잠깐 머문 뒤에 센다.
    const timer = window.setTimeout(() => {
      void recordCampaignView(campaignId, viewerKey);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [campaignId]);

  return null;
}
