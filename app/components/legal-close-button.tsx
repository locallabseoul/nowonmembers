"use client";

import { useRouter } from "next/navigation";

export function LegalCloseButton() {
  const router = useRouter();

  function closePage() {
    window.close();

    if (!window.closed) {
      router.back();
    }
  }

  return (
    <button
      type="button"
      onClick={closePage}
      className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition-colors hover:bg-primaryHover"
    >
      닫기
    </button>
  );
}
