"use client";

import { useActionState } from "react";
import { FormBanner, FormField } from "@/app/components/form-field";
import { emptyFormState } from "@/lib/form-errors";
import { updateResetPassword } from "../actions";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updateResetPassword, emptyFormState);
  return (
    <form action={action} className="mt-6 space-y-4">
      <FormBanner>{state.formError}</FormBanner>
      <FormField name="password" label="새 비밀번호" type="password" autoComplete="new-password" minLength={6} placeholder="6자 이상" required error={state.fieldErrors?.password} />
      <FormField name="password_confirm" label="새 비밀번호 확인" type="password" autoComplete="new-password" minLength={6} placeholder="새 비밀번호를 다시 입력해주세요" required error={state.fieldErrors?.password_confirm} />
      <button disabled={pending} className="w-full rounded-xl bg-primary px-5 py-3 font-black text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60">{pending ? "변경 중..." : "비밀번호 변경"}</button>
    </form>
  );
}
