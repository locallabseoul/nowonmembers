"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  return (
    <button
      onClick={share}
      aria-label={copied ? "링크 복사됨" : "미니홈 공유"}
      title={copied ? "링크 복사됨" : "공유"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:border-primary hover:text-primary"
    >
      {copied ? <Check size={17} /> : <Share2 size={17} />}
    </button>
  );
}
