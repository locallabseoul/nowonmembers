"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { FormBanner, FormField } from "@/app/components/form-field";
import { emptyFormState } from "@/lib/form-errors";
import { saveResidentProfile } from "./actions";

type ResidentProfile = {
  nickname: string;
  name: string;
  email: string;
  phone: string;
};

export function ResidentProfileForm({ profile }: { profile: ResidentProfile }) {
  const [state, formAction, isPending] = useActionState(saveResidentProfile, emptyFormState);

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <FormBanner>{state.formError}</FormBanner>
      {state.successMessage ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {state.successMessage}
        </p>
      ) : null}

      <FormField
        name="nickname"
        label="닉네임"
        required
        minLength={2}
        maxLength={20}
        autoComplete="nickname"
        defaultValue={state.values?.nickname ?? profile.nickname}
        error={state.fieldErrors?.nickname}
      />
      <FormField
        name="name"
        label="이름"
        required
        maxLength={50}
        autoComplete="name"
        defaultValue={state.values?.name ?? profile.name}
        error={state.fieldErrors?.name}
      />
      <FormField
        name="email"
        label="이메일 (선택)"
        type="email"
        autoComplete="email"
        placeholder="example@email.com"
        defaultValue={state.values?.email ?? profile.email}
        error={state.fieldErrors?.email}
      />

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-charcoal">전화번호</span>
        <input
          value={profile.phone}
          readOnly
          className="w-full rounded-xl border border-slate-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-500"
        />
        <span className="mt-2 block text-xs leading-5 text-gray-400">인증된 계정 전화번호는 프로필에서 변경할 수 없습니다.</span>
      </label>

      <button
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-black text-white transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? <Loader2 size={17} className="animate-spin" /> : null}
        {isPending ? "저장 중..." : "프로필 저장"}
      </button>
    </form>
  );
}
