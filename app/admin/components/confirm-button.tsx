"use client";

import { useState } from "react";

// 무게 있는 관리자 동작(승격·정지·예약 해제)에 쓰는 2단계 확인 버튼.
// children에는 실제 제출 폼을 넣는다.
export function ConfirmButton({
  label,
  confirmLabel,
  className,
  children
}: {
  label: string;
  confirmLabel: string;
  className: string;
  children: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={className}>
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50">
        취소
      </button>
      {children}
      <span className="sr-only">{confirmLabel}</span>
    </span>
  );
}
