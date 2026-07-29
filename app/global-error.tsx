"use client";

import { useEffect } from "react";
import "./globals.css";

// 루트 레이아웃(헤더의 세션·공지 조회 포함)에서 던진 오류는 app/error.tsx가
// 잡지 못한다. 이 컴포넌트가 레이아웃 자체를 대체한다.
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="flex min-h-dvh items-center justify-center bg-[#F8F9FA] px-4 antialiased">
        <section className="w-full max-w-md rounded-[20px] border border-gray-100 bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <span className="text-lg font-black tracking-tight text-charcoal">
            NOWON<span className="text-primary">MEMBERS</span>
          </span>
          <h1 className="mt-5 text-xl font-black text-charcoal">서비스에 일시적인 문제가 있습니다</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            잠시 후 다시 시도해주세요. 계속되면 아래 코드와 함께 문의해주세요.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-black text-white transition-colors hover:bg-primaryHover"
          >
            다시 시도
          </button>
          {error.digest ? (
            <p className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400">오류 코드 {error.digest}</p>
          ) : null}
        </section>
      </body>
    </html>
  );
}
