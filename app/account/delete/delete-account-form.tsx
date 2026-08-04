"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { emptyFormState } from "@/lib/form-errors";
import { FieldError, fieldControlClassName } from "@/app/components/form-field";
import { deleteAccount } from "../actions";

export function DeleteAccountForm() {
  const [state, formAction, isPending] = useActionState(deleteAccount, emptyFormState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {state.formError ? (
        <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">{state.formError}</p>
      ) : null}

      <div>
        <label htmlFor="delete-password" className="mb-2 block text-sm font-black text-charcoal">비밀번호 확인</label>
        <input
          id="delete-password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="현재 비밀번호를 입력해주세요"
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          className={fieldControlClassName(state.fieldErrors?.password)}
        />
        <FieldError>{state.fieldErrors?.password}</FieldError>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-2">
          <input type="checkbox" name="confirm_delete" className="mt-0.5 h-4 w-4 shrink-0 accent-red-600" />
          <span className="text-sm leading-6 text-gray-600">
            위 안내 사항을 모두 확인했으며, 탈퇴 시 계정을 복구할 수 없고 잔여 포인트가 소멸되는 것에 동의합니다.
          </span>
        </label>
        <FieldError>{state.fieldErrors?.confirm_delete}</FieldError>
      </div>

      <button
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 font-black text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? <Loader2 size={18} className="animate-spin" /> : null}
        {isPending ? "탈퇴 처리 중..." : "탈퇴하기"}
      </button>
    </form>
  );
}
