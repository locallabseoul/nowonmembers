import { Badge } from "@/app/components/ui";
import { getAdminRecentSubmissions } from "@/lib/supabase/queries";
import { ExternalLink } from "lucide-react";
import { approveSubmission, publishLocalStory, requestSubmissionRevision } from "../actions";
import { FormBanner } from "@/app/components/form-field";

function reviewStatusLabel(status: string) {
  if (status === "submitted") return "검수 대기";
  if (status === "needs_revision") return "수정 요청됨";
  if (status === "approved") return "승인 완료";
  if (status === "rejected") return "반려";
  return status;
}

function reviewStatusTone(status: string): "blue" | "green" | "gray" | "amber" | "red" {
  if (status === "approved") return "green";
  if (status === "needs_revision" || status === "rejected") return "red";
  if (status === "submitted") return "amber";
  return "blue";
}

export default async function AdminSubmissionsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  const submissions = await getAdminRecentSubmissions();

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-charcoal">콘텐츠 검수</h1>
        <p className="mt-2 text-gray-500">최근 제출된 콘텐츠를 승인하거나 수정을 요청하고, 승인된 콘텐츠는 로컬 스토리로 발행합니다.</p>
      </div>
      {error ? <div className="mb-6"><FormBanner>{error}</FormBanner></div> : null}
      {message ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}

      <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-black text-charcoal">최근 제출 콘텐츠</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {submissions.map((submission) => (
            <div key={submission.id} className="overflow-hidden rounded-lg bg-gray-50 text-sm">
              {submission.previewImageUrl ? <img src={submission.previewImageUrl} alt="" className="h-36 w-full object-cover" /> : null}
              <div className="p-4">
                <Badge tone={reviewStatusTone(submission.reviewStatus)}>{reviewStatusLabel(submission.reviewStatus)}</Badge>
                <p className="mt-2 text-xs font-bold text-gray-400">{submission.platform}{submission.publishedAt ? ` · ${submission.publishedAt}` : ""}</p>
                {submission.contentUrl ? (
                  <div className="mt-3 space-y-2">
                    <p className="break-all text-gray-600">{submission.contentUrl}</p>
                    <a
                      href={submission.contentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/5"
                    >
                      콘텐츠 바로가기
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ) : (
                  <p className="mt-3 text-gray-500">콘텐츠 URL이 없습니다.</p>
                )}
                {submission.reviewStatus === "submitted" ? (
                  <div className="mt-3 flex gap-2">
                    <form action={approveSubmission}>
                      <input type="hidden" name="submission_id" value={submission.id} />
                      <button className="rounded-lg bg-primary px-3 py-2 text-xs font-black text-white">승인</button>
                    </form>
                    <form action={requestSubmissionRevision}>
                      <input type="hidden" name="submission_id" value={submission.id} />
                      <input type="hidden" name="admin_memo" value="제출 콘텐츠 수정 요청" />
                      <button className="rounded-lg bg-white px-3 py-2 text-xs font-black text-charcoal ring-1 ring-line">수정 요청</button>
                    </form>
                  </div>
                ) : null}
                {submission.reviewStatus === "approved" ? (
                  <form action={publishLocalStory} className="mt-3">
                    <input type="hidden" name="submission_id" value={submission.id} />
                    <button className="rounded-lg bg-white px-3 py-2 text-xs font-black text-primary ring-1 ring-primary/20">로컬 스토리 발행</button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
          {submissions.length === 0 ? <p className="text-sm text-gray-500">제출된 콘텐츠가 없습니다.</p> : null}
        </div>
      </section>
    </main>
  );
}
