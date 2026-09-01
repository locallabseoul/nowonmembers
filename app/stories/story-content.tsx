import { ExternalLink } from "lucide-react";
import type { StoryContentBlock, StoryTextSegment } from "@/lib/story-content";

function RichText({ segments, fallback }: { segments?: StoryTextSegment[]; fallback: string }) {
  if (!segments?.length) return fallback;
  return <>{segments.map((segment, index) => {
    let content: React.ReactNode = segment.text;
    if (segment.marks?.includes("bold")) content = <strong>{content}</strong>;
    if (segment.marks?.includes("italic")) content = <em>{content}</em>;
    if (segment.marks?.includes("strike")) content = <s>{content}</s>;
    if (segment.link) content = <a href={segment.link} target="_blank" rel="noreferrer" className="font-bold text-primary underline decoration-primary/30 underline-offset-4">{content}</a>;
    return <span key={`${index}-${segment.text.slice(0, 12)}`}>{content}</span>;
  })}</>;
}

export function StoryContent({ blocks }: { blocks: StoryContentBlock[] }) {
  return <div className="space-y-7">{blocks.map((block) => {
    if (block.type === "heading") return <h2 key={block.id} className="pt-4 text-2xl font-black leading-tight text-charcoal"><RichText segments={block.segments} fallback={block.text} /></h2>;
    if (block.type === "quote") return <blockquote key={block.id} className="border-l-4 border-primary bg-primary/5 px-6 py-5 text-lg font-bold leading-8 text-charcoal"><RichText segments={block.segments} fallback={block.text} /></blockquote>;
    if (block.type === "link") return <a key={block.id} href={block.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white hover:bg-primaryHover">{block.label}<ExternalLink size={15} /></a>;
    if (block.type === "image") return <figure key={block.id}><img src={block.url} alt={block.alt} className="max-h-[720px] w-full rounded-2xl object-cover" />{block.caption ? <figcaption className="mt-3 text-center text-sm text-slate-400">{block.caption}</figcaption> : null}</figure>;
    return <p key={block.id} className="whitespace-pre-line text-base leading-8 text-slate-700"><RichText segments={block.segments} fallback={block.text} /></p>;
  })}</div>;
}
