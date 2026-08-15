import { Eye, X } from "lucide-react";
import { getReadOnlyPreview } from "@/lib/auth/read-only-preview";
import { stopReadOnlyPreview } from "@/app/admin/members/preview-actions";

export async function ReadOnlyPreviewBanner() {
  const preview = await getReadOnlyPreview();
  if (!preview) return null;

  return (
    <div className="read-only-preview-banner relative z-50 bg-amber-400 text-amber-950">
      <div className="mx-auto flex min-h-11 max-w-7xl items-center justify-between gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <p className="flex items-center gap-2 font-black">
          <Eye size={17} aria-hidden />
          {preview.nickname} 회원의 화면을 읽기 전용으로 보고 있습니다.
        </p>
        <form action={stopReadOnlyPreview}>
          <button className="inline-flex items-center gap-1 rounded-lg bg-amber-950/10 px-3 py-1.5 text-xs font-black hover:bg-amber-950/20">
            <X size={14} aria-hidden /> 미리보기 종료
          </button>
        </form>
      </div>
    </div>
  );
}
