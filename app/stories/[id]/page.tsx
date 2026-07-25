import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/app/components/ui";
import { getDisplayBusiness, getDisplayCreator, getPublicCampaign, getPublicStory } from "@/lib/supabase/queries";

export default async function StoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await getPublicStory(id);
  if (!story) notFound();
  const business = getDisplayBusiness(story.businessId);
  const creator = getDisplayCreator(story.creatorId);
  const campaign = await getPublicCampaign(story.campaignId);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <img src={story.coverImage} alt="" className="h-96 w-full object-cover" />
        <article className="p-6 sm:p-8">
          <Badge tone="red">{story.category}</Badge>
          <h1 className="mt-4 text-3xl font-black leading-tight text-charcoal">{story.title}</h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">{story.summary}</p>
          <div className="mt-8 grid gap-4 rounded-lg bg-gray-50 p-5 text-sm text-gray-600 sm:grid-cols-3">
            <div><b className="block text-charcoal">가게</b>{business?.businessName}</div>
            <div><b className="block text-charcoal">크리에이터</b>{creator?.nickname}</div>
            <div><b className="block text-charcoal">연결 캠페인</b>{campaign?.title}</div>
          </div>
          <p className="mt-8 whitespace-pre-line text-base leading-8 text-gray-700">{story.body}</p>
          {story.contentUrl ? (
            <div className="mt-8 rounded-lg border border-primary/20 bg-primary/10 p-5">
              <p className="text-sm font-black text-charcoal">크리에이터 원본 콘텐츠</p>
              <a
                href={story.contentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-primaryHover"
              >
                콘텐츠 바로가기
                <ExternalLink size={15} />
              </a>
            </div>
          ) : null}
        </article>
      </div>
    </main>
  );
}
