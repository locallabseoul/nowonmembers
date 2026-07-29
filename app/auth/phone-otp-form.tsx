"use client";

import { useActionState } from "react";
import { emptyFormState } from "@/lib/form-errors";
import { FieldError, FieldLabel, FormBanner, fieldControlClassName } from "@/app/components/form-field";
import { resendAuthPhoneOtp, verifyAuthPhoneOtp } from "./actions";

export function PhoneOtpForm({
  role,
  phone,
  type = "sms",
  next = "",
  source = "",
  submitLabel
}: {
  role: "creator" | "business";
  phone: string;
  type?: "sms" | "phone_change";
  next?: string;
  source?: string;
  submitLabel: string;
}) {
  const [verifyState, verifyAction, isVerifying] = useActionState(verifyAuthPhoneOtp, emptyFormState);
  const [resendState, resendAction, isResending] = useActionState(resendAuthPhoneOtp, emptyFormState);

  const hidden = (
    <>
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="type" value={type} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {source ? <input type="hidden" name="source" value={source} /> : null}
    </>
  );

  return (
    <>
      {resendState.successMessage ? (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{resendState.successMessage}</p>
      ) : null}
      {verifyState.formError || resendState.formError ? (
        <div className="mt-4">
          <FormBanner>{verifyState.formError ?? resendState.formError}</FormBanner>
        </div>
      ) : null}

      <form action={verifyAction} className="mt-6 space-y-4">
        {hidden}
        <label className="block">
          <FieldLabel>전화번호</FieldLabel>
          <input
            value={phone}
            readOnly
            className="w-full rounded-xl border border-slate-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-500"
          />
        </label>
        <label className="block">
          <FieldLabel required>인증번호</FieldLabel>
          <input
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            aria-invalid={verifyState.fieldErrors?.token ? true : undefined}
            className={fieldControlClassName(verifyState.fieldErrors?.token)}
            placeholder="6자리 인증번호"
          />
          <FieldError>{verifyState.fieldErrors?.token}</FieldError>
        </label>
        <button
          disabled={isVerifying}
          className="w-full rounded-xl bg-primary px-5 py-3 font-black text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60"
        >
          {isVerifying ? "확인 중..." : submitLabel}
        </button>
      </form>

      <form action={resendAction} className="mt-3">
        {hidden}
        <button
          disabled={isResending}
          className="w-full rounded-xl border border-line bg-white px-5 py-3 text-sm font-black text-charcoal transition-colors hover:border-primary hover:text-primary disabled:cursor-wait disabled:opacity-60"
        >
          {isResending ? "발송 중..." : "인증번호 다시 보내기"}
        </button>
      </form>
    </>
  );
}
