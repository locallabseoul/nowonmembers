import { FormBanner } from "@/app/components/form-field";
import { getAdminEditorialStories, getAdminStoryBusinesses } from "@/lib/supabase/queries";
import { createEditorialStory, deleteEditorialStory, updateEditorialStory } from "./actions";
import { StoryManagement } from "./story-management";

export default async function AdminStoriesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string; deleted?: string; warning?: string }>;
}) {
  const [{ error, created, updated, deleted, warning }, stories, businesses] = await Promise.all([
    searchParams,
    getAdminEditorialStories(),
    getAdminStoryBusinesses()
  ]);

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-charcoal">스토리 관리</h1>
        <p className="mt-2 text-gray-500">노원스토리에 소개할 새소식과 인터뷰를 작성하고 공개 상태를 관리합니다.</p>
      </div>
      {error ? <div className="mb-6"><FormBanner>{error}</FormBanner></div> : null}
      {created ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">스토리가 등록되었습니다.</p> : null}
      {updated ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">스토리가 수정되었습니다.</p> : null}
      {deleted ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">스토리가 영구 삭제되었습니다.</p> : null}
      {warning ? <p className="mb-6 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-700">{warning}</p> : null}
      <StoryManagement
        stories={stories}
        businesses={businesses}
        createAction={createEditorialStory}
        updateAction={updateEditorialStory}
        deleteAction={deleteEditorialStory}
      />
    </main>
  );
}
