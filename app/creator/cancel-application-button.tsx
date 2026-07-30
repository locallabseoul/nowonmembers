"use client";

import { useActionState, useState } from "react";
import { emptyFormState } from "@/lib/form-errors";
import { cancelApplication } from "./actions";

// 되돌리려면 다시 지원해야 하므로 한 번 확인을 받는다.
export function CancelApplicationButton({ applicationId }: { applicationId: string }) {
  const [state, formAction, isPending] = useActionState(cancelApplication, emptyFormState);
  const [confirming, setConfirming] = useState(false);

  if (state.formError) {
    return <p className="text-xs font-bold leading-5 text-red-600">{state.formError}</p>;
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-lg px-4 py-2 text-center text-sm font-medium text-gray-400 transition-colors hover:text-red-600 sm:w-auto"
      >
        지원 취소
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full sm:w-auto">
      <input type="hidden" name="application_id" value={applicationId} />
      <p className="mb-2 text-xs font-bold text-charcoal sm:text-right">취소할까요?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:flex-none"
        >
          돌아가기
        </button>
        <button
          disabled={isPending}
          className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-black text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-60 sm:flex-none"
        >
          {isPending ? "취소 중..." : "취소하기"}
        </button>
      </div>
    </form>
  );
}
