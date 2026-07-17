import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getCollaborationSubmissionDetail } from "@/lib/supabase/queries";
import { submitContent } from "./actions";

export default async function SubmissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  await requireRole("creator", `/creator/submissions/${id}`);
  const collaboration = await getCollaborationSubmissionDetail(id);
  if (!collaboration) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black text-charcoal">콘텐츠 제출하기</h1>
      <p className="mt-2 text-gray-500">{collaboration.campaignTitle} · 제출 마감 {collaboration.submissionDue}</p>
      {error ? <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}
      <form action={submitContent} className="mt-8 space-y-6 rounded-lg border border-line bg-white p-6 shadow-sm">
        <input type="hidden" name="collaboration_id" value={collaboration.id} />
        <label>
          <span className="mb-2 block text-sm font-black text-charcoal">게시 채널</span>
          <select name="platform" className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring">
            <option>블로그</option><option>인스타그램</option><option>유튜브 쇼츠</option><option>기타</option>
          </select>
        </label>
        <Field name="content_url" label="콘텐츠 URL" placeholder="https://..." required />
        <Field name="published_at" label="게시일" placeholder="2026-08-01" />
        <Field name="preview_image_url" label="미리보기 이미지 URL" placeholder="선택 입력" />
        <label className="flex items-start gap-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <input type="checkbox" name="disclosure_confirmed" className="mt-1" required />
          제공 사실 표시를 포함했고, 캠페인 종료 후 최소 6개월간 콘텐츠를 유지하는 데 동의합니다.
        </label>
        <button className="w-full rounded-lg bg-primary px-5 py-3 font-black text-white hover:bg-primaryHover">콘텐츠 제출 완료</button>
      </form>
    </main>
  );
}

function Field({ name, label, placeholder, required = false }: { name: string; label: string; placeholder: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-charcoal">{label}</span>
      <input name={name} required={required} className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder={placeholder} />
    </label>
  );
}
