"use client";

import { useEffect } from "react";
import { markNoticeRead } from "./actions";

export function NoticeReadMarker({ noticeId }: { noticeId: string }) {
  useEffect(() => {
    void markNoticeRead(noticeId);
  }, [noticeId]);

  return null;
}
