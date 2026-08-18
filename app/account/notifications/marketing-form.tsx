"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { emptyFormState } from "@/lib/form-errors";
import { MARKETING_CONSENT_COPY } from "@/lib/messages";
import { setMarketingOptIn } from "../actions";

export function MarketingForm({ optIn, role }: { optIn: boolean; role: "creator" | "business" | "resident" }) {
  const [state, formAction, isPending] = useActionState(setMarketingOptIn, emptyFormState);
  const [checked, setChecked] = useState(optIn);

  return (
    <form action={formAction} className="mt-6">
      {state.formError ? (
        <p className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">{state.formError}</p>
      ) : null}
      {state.successMessage ? (
        <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700">{state.successMessage}</p>
      ) : null}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-4">
        <input
          type="checkbox"
          name="marketing_opt_in"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="min-w-0">
          <span className="block break-keep font-bold text-charcoal">{MARKETING_CONSENT_COPY[role].title}</span>
          <span className="mt-1 block break-keep text-sm leading-6 text-gray-500">
            {MARKETING_CONSENT_COPY[role].description} 동의하지 않아도 서비스 이용에는 아무 제한이 없습니다.
          </span>
        </span>
      </label>

      <button
        disabled={isPending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-charcoal py-3 font-black text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isPending ? <Loader2 size={17} className="animate-spin" /> : null}
        저장
      </button>
    </form>
  );
}
