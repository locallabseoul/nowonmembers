"use client";

import { useActionState } from "react";
import { CalendarCheck } from "lucide-react";
import { emptyFormState } from "@/lib/form-errors";
import { FieldError, fieldControlClassName } from "@/app/components/form-field";
import { saveVisitDate } from "./actions";

// 매장과 통화로 정한 날짜를 여기에 남긴다. 남기지 않으면 방문일이 계속 "미정"으로
// 남아 가게도 크리에이터도 일정을 확인할 수 없다.
export function VisitDateForm({
  collaborationId,
  visitDate,
  maxDate
}: {
  collaborationId: string;
  visitDate: string;
  maxDate?: string;
}) {
  const [state, formAction, isPending] = useActionState(saveVisitDate, emptyFormState);
  const error = state.fieldErrors?.visit_date ?? state.formError;

  return (
    <form action={formAction} className="mt-4 border-t border-primary/20 pt-4">
      <input type="hidden" name="collaboration_id" value={collaborationId} />
      <label className="mb-2 flex items-center gap-1.5 text-xs font-black text-charcoal">
        <CalendarCheck size={14} className="text-primary" />
        방문 예정일
      </label>
      <div className="flex gap-2">
        <input
          type="date"
          name="visit_date"
          defaultValue={state.values?.visit_date ?? (visitDate && visitDate !== "미정" ? visitDate.slice(0, 10) : "")}
          max={maxDate && maxDate !== "미정" ? maxDate.slice(0, 10) : undefined}
          aria-invalid={error ? true : undefined}
          className={fieldControlClassName(error, "flex-1 bg-white py-2.5 text-sm")}
        />
        <button
          disabled={isPending}
          className="shrink-0 rounded-xl bg-charcoal px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
      </div>
      {state.successMessage ? (
        <p className="mt-2 text-xs font-bold text-primaryHover">{state.successMessage}</p>
      ) : (
        <FieldError>{error}</FieldError>
      )}
    </form>
  );
}
