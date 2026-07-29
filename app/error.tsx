"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export default function Error({
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
    <main className="flex min-h-[70vh] items-center justify-center bg-[#F8F9FA] px-4">
      <section className="w-full max-w-md rounded-[20px] border border-gray-100 bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <TriangleAlert size={42} className="mx-auto text-amber-500" />
        <h1 className="mt-5 text-xl font-black text-charcoal">문제가 발생했습니다</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          잠시 후 다시 시도해주세요. 계속 같은 화면이 나오면 아래 코드와 함께 문의해주시면 빠르게 확인할 수 있습니다.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-black text-white transition-colors hover:bg-primaryHover"
          >
            <RotateCcw size={17} />
            다시 시도
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary"
          >
            홈으로
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400">오류 코드 {error.digest}</p>
        ) : null}
      </section>
    </main>
  );
}
