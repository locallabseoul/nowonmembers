"use client";

import { useActionState } from "react";
import { FormBanner, FormField } from "@/app/components/form-field";
import { emptyFormState } from "@/lib/form-errors";
import { requestPasswordReset } from "./actions";

export function PasswordResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, emptyFormState);
  return (
    <form action={action} className="mt-6 space-y-4">
      <FormBanner>{state.formError}</FormBanner>
      <FormField name="phone" label="전화번호" type="tel" inputMode="tel" autoComplete="tel" placeholder="010-0000-0000" required defaultValue={state.values?.phone} error={state.fieldErrors?.phone} />
      <button disabled={pending} className="w-full rounded-xl bg-primary px-5 py-3 font-black text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60">
        {pending ? "발송 중..." : "인증번호 받기"}
      </button>
    </form>
  );
}
