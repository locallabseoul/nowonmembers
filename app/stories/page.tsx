import Link from "next/link";
import { SectionHeader } from "../components/ui";
import { getDisplayBusiness, getDisplayCreator, getPublicStories } from "@/lib/supabase/queries";

export default async function StoriesPage() {
  const stories = await getPublicStories();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeader title="완료된 콘텐츠 아카이브" description="크리에이터와 가게가 함께 만든 로컬 스토리를 확인하세요." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => {
          const business = getDisplayBusiness(story.businessId);
          const creator = getDisplayCreator(story.creatorId);
          return (
            <Link key={story.id} href={`/stories/${story.id}`} className="overflow-hidden rounded-lg border border-line bg-white shadow-sm hover:shadow-soft">
              <img src={story.coverImage} alt="" className="h-56 w-full object-cover" />
              <div className="p-5">
                <div className="mb-3 text-xs font-black text-primary">{story.category}</div>
                <h2 className="text-xl font-black text-charcoal">{story.title}</h2>
                <p className="mt-3 text-sm leading-6 text-gray-500">{story.summary}</p>
                <p className="mt-5 text-xs font-bold text-gray-400">{business?.businessName} · {creator?.nickname}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
