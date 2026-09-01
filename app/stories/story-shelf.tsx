"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { storyKindLabel } from "@/lib/story-content";
import type { LocalStory } from "@/lib/types";

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export function StoryShelf({ title, description, stories }: { title: string; description: string; stories: LocalStory[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  function scroll(direction: -1 | 1) {
    trackRef.current?.scrollBy({ left: direction * Math.max(280, trackRef.current.clientWidth * 0.8), behavior: "smooth" });
  }

  return (
    <section aria-labelledby={`story-section-${title}`}>
      <div className="mb-6 flex items-end justify-between gap-5">
        <div><h2 id={`story-section-${title}`} className="text-2xl font-black text-charcoal sm:text-3xl">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>
        {stories.length > 1 ? <div className="hidden shrink-0 gap-2 sm:flex"><button type="button" onClick={() => scroll(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-charcoal shadow-sm hover:border-primary/30 hover:text-primary" aria-label={`${title} 이전 콘텐츠`}><ChevronLeft size={19} /></button><button type="button" onClick={() => scroll(1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-charcoal shadow-sm hover:border-primary/30 hover:text-primary" aria-label={`${title} 다음 콘텐츠`}><ChevronRight size={19} /></button></div> : null}
      </div>
      {stories.length ? (
        <div ref={trackRef} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-1 sm:px-1 [&::-webkit-scrollbar]:hidden">
          {stories.map((story) => (
            <Link key={story.id} href={`/stories/${story.id}`} className="group w-[82vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:w-[calc((100%-3rem)/3)] sm:max-w-none lg:w-[calc((100%-3rem)/4)]">
              <div className="relative h-48 overflow-hidden"><img src={story.coverImage} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-primary shadow-sm backdrop-blur">{storyKindLabel(story.storyKind)}</span></div>
              <div className="p-5"><h3 className="line-clamp-2 min-h-12 text-lg font-black leading-6 text-charcoal group-hover:text-primary">{story.title}</h3><p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{story.summary}</p><div className="mt-5 flex items-center justify-between gap-2 text-xs font-bold text-slate-400"><span className="truncate">{story.storyKind === "submission" ? story.creatorNickname ?? "노원 크리에이터" : story.authorName}</span><span className="shrink-0">{formatDate(story.publishedAt)}</span></div></div>
            </Link>
          ))}
        </div>
      ) : <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center"><div><p className="font-black text-charcoal">콘텐츠를 준비하고 있어요</p><p className="mt-2 text-sm text-slate-400">곧 새로운 {title}{title === "인터뷰" ? "를" : "을"} 소개해드릴게요.</p></div></div>}
    </section>
  );
}
