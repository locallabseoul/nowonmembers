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
    <button onClick={share} className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-sm font-black text-charcoal shadow-lg backdrop-blur">
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? "링크 복사됨" : "공유"}
    </button>
  );
}
