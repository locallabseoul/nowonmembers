"use client";

import { useActionState } from "react";
import { FieldError, FieldLabel, FormBanner, fieldControlClassName } from "@/app/components/form-field";
import { emptyFormState } from "@/lib/form-errors";
import { resendPasswordResetOtp, verifyPasswordResetOtp } from "../actions";

export function PasswordResetVerifyForm({ phone }: { phone: string }) {
  const [verifyState, verifyAction, verifying] = useActionState(verifyPasswordResetOtp, emptyFormState);
  const [resendState, resendAction, resending] = useActionState(resendPasswordResetOtp, emptyFormState);
  const phoneInput = <input type="hidden" name="phone" value={phone} />;
  return (
    <>
      {resendState.successMessage ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{resendState.successMessage}</p> : null}
      {verifyState.formError || resendState.formError ? <div className="mt-4"><FormBanner>{verifyState.formError ?? resendState.formError}</FormBanner></div> : null}
      <form action={verifyAction} className="mt-6 space-y-4">
        {phoneInput}
        <label className="block"><FieldLabel>전화번호</FieldLabel><input value={phone} readOnly className="w-full rounded-xl border border-slate-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-500" /></label>
        <label className="block">
          <FieldLabel required>인증번호</FieldLabel>
          <input name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required aria-invalid={verifyState.fieldErrors?.token ? true : undefined} className={fieldControlClassName(verifyState.fieldErrors?.token)} placeholder="6자리 인증번호" />
          <FieldError>{verifyState.fieldErrors?.token}</FieldError>
        </label>
        <button disabled={verifying} className="w-full rounded-xl bg-primary px-5 py-3 font-black text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60">{verifying ? "확인 중..." : "인증하기"}</button>
      </form>
      <form action={resendAction} className="mt-3">
        {phoneInput}
        <button disabled={resending} className="w-full rounded-xl border border-line bg-white px-5 py-3 text-sm font-black text-charcoal transition-colors hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-60">{resending ? "발송 중..." : "인증번호 다시 보내기"}</button>
      </form>
    </>
  );
}
