import Link from "next/link";
import { SectionHeader } from "../components/ui";
import { getPublicStories } from "@/lib/supabase/queries";

export default async function StoriesPage() {
  const stories = await getPublicStories();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeader title="노원스토리" description="크리에이터와 가게가 함께 만든 로컬 스토리를 확인하세요." />
      {stories.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="font-bold text-charcoal">첫 번째 노원스토리를 준비하고 있어요</p>
          <p className="mt-2 text-sm text-gray-500">캠페인이 완료되면 크리에이터가 만든 콘텐츠가 이곳에 소개됩니다.</p>
          <Link href="/campaigns" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-primaryHover">
            진행 중인 캠페인 보기
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <Link key={story.id} href={`/stories/${story.id}`} className="overflow-hidden rounded-lg border border-line bg-white shadow-sm hover:shadow-soft">
              <img src={story.coverImage} alt="" className="h-56 w-full object-cover" />
              <div className="p-5">
                <div className="mb-3 text-xs font-black text-primary">{story.category}</div>
                <h2 className="text-xl font-black text-charcoal">{story.title}</h2>
                <p className="mt-3 text-sm leading-6 text-gray-500">{story.summary}</p>
                <p className="mt-5 text-xs font-bold text-gray-400">{story.businessName ?? "노원멤버스 파트너"} · {story.creatorNickname ?? "노원 크리에이터"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
