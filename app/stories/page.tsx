import { getPublicStories } from "@/lib/supabase/queries";
import { StoryShelf } from "./story-shelf";

export default async function StoriesPage() {
  const stories = await getPublicStories();
  const sections = [
    { kind: "news" as const, title: "새소식", description: "노원의 새로운 소식과 놓치기 아쉬운 이야기를 전합니다." },
    { kind: "interview" as const, title: "인터뷰", description: "동네를 만들어가는 가게와 사람들의 목소리를 담았습니다." },
    { kind: "submission" as const, title: "노원스토리", description: "크리에이터와 가게가 함께 만든 생생한 콘텐츠입니다." }
  ];

  return (
    <main className="bg-slate-50/60 pb-20">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-sm font-black text-primary">NOWON STORIES</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-charcoal">노원스토리</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">우리 동네의 새소식부터 가게 인터뷰, 크리에이터가 직접 만든 콘텐츠까지 한곳에서 만나보세요.</p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
        {sections.map((section) => <StoryShelf key={section.kind} title={section.title} description={section.description} stories={stories.filter((story) => story.storyKind === section.kind)} />)}
      </div>
    </main>
  );
}
