import { Eye, PenLine, X } from "lucide-react";
import { getReadOnlyPreview } from "@/lib/auth/read-only-preview";
import { getBusinessProfileDelegation } from "@/lib/auth/business-profile-delegation";
import { stopReadOnlyPreview } from "@/app/admin/members/preview-actions";

export async function ReadOnlyPreviewBanner() {
  const preview = await getReadOnlyPreview();
  if (!preview) return null;
  const delegation = await getBusinessProfileDelegation();

  return (
    <div className={`${delegation ? "profile-delegation-banner bg-emerald-500 text-white" : "read-only-preview-banner bg-amber-400 text-amber-950"} relative z-50`}>
      <div className="mx-auto flex min-h-11 max-w-7xl items-center justify-between gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <p className="flex items-center gap-2 font-black">
          {delegation ? <PenLine size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
          {delegation ? `${preview.nickname} 회원의 가게 프로필을 대행 작성하고 있습니다.` : `${preview.nickname} 회원의 화면을 읽기 전용으로 보고 있습니다.`}
        </p>
        <form action={stopReadOnlyPreview}>
          <button className="inline-flex items-center gap-1 rounded-lg bg-amber-950/10 px-3 py-1.5 text-xs font-black hover:bg-amber-950/20">
            <X size={14} aria-hidden /> {delegation ? "대행 종료" : "미리보기 종료"}
          </button>
        </form>
      </div>
    </div>
  );
}
