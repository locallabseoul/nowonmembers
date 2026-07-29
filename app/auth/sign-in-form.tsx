"use client";

import { useActionState } from "react";
import { emptyFormState } from "@/lib/form-errors";
import { FormBanner, FormField } from "@/app/components/form-field";
import { signIn } from "./actions";

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(signIn, emptyFormState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormBanner>{state.formError}</FormBanner>
      <FormField
        name="phone"
        label="전화번호"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="010-0000-0000"
        required
        defaultValue={state.values?.phone}
        error={state.fieldErrors?.phone}
      />
      <FormField
        name="password"
        label="비밀번호"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
        error={state.fieldErrors?.password}
      />
      <button
        disabled={isPending}
        className="w-full rounded-xl bg-primary px-5 py-3 font-black text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
