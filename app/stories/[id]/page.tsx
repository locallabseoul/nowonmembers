import { notFound } from "next/navigation";
import { ExternalLink, Store } from "lucide-react";
import { Badge } from "@/app/components/ui";
import { storyKindLabel } from "@/lib/story-content";
import { getPublicCampaign, getPublicStory } from "@/lib/supabase/queries";
import { StoryContent } from "../story-content";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export default async function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await getPublicStory(id);
  if (!story) notFound();
  const campaign = story.storyKind === "submission" && story.campaignId ? await getPublicCampaign(story.campaignId) : undefined;
  return (
    <main className="bg-slate-50/60 py-10 sm:py-14">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <img src={story.coverImage} alt="" className="h-64 w-full object-cover sm:h-[460px]" />
        <div className="p-6 sm:p-10">
          <Badge tone="red">{storyKindLabel(story.storyKind)}</Badge><h1 className="mt-5 text-3xl font-black leading-tight text-charcoal sm:text-4xl">{story.title}</h1><p className="mt-5 text-lg leading-8 text-slate-600">{story.summary}</p>
          {story.storyKind === "submission" ? <div className="mt-8 grid gap-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600 sm:grid-cols-3"><div><b className="block text-charcoal">가게</b>{story.businessName ?? "노원멤버스 파트너"}</div><div><b className="block text-charcoal">크리에이터</b>{story.creatorNickname ?? "노원 크리에이터"}</div><div><b className="block text-charcoal">연결 캠페인</b>{campaign?.title ?? "노원멤버스 캠페인"}</div></div> : <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-slate-100 py-4 text-sm text-slate-500"><span className="font-black text-charcoal">{story.authorName}</span><span>{formatDate(story.publishedAt)}</span>{story.businessName ? <span className="inline-flex items-center gap-1.5"><Store size={15} className="text-primary" />{story.businessName}</span> : null}</div>}
          <div className="mt-10">{story.storyKind !== "submission" && story.contentBlocks.length ? <StoryContent blocks={story.contentBlocks} /> : <p className="whitespace-pre-line text-base leading-8 text-slate-700">{story.body}</p>}</div>
          {story.storyKind === "submission" && story.contentUrl ? <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-5"><p className="text-sm font-black text-charcoal">크리에이터 원본 콘텐츠</p><a href={story.contentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white hover:bg-primaryHover">콘텐츠 바로가기<ExternalLink size={15} /></a></div> : null}
        </div>
      </article>
    </main>
  );
}
