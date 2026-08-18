"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { FieldError, FieldLabel, FormBanner, FormField, fieldControlClassName } from "@/app/components/form-field";
import { replaceHeicSelection } from "@/lib/heic";
import type { CouponFormState } from "./actions";
import type { Coupon } from "@/lib/coupons";

type SaveAction = (state: CouponFormState, formData: FormData) => Promise<CouponFormState>;

export function CouponForm({ action, coupon, error }: { action: SaveAction; coupon?: Coupon | null; error?: string }) {
  const [state, submit] = useActionState(action, error ? { error, values: {} } : null);
  // 저장에 실패하면 돌려받은 제출값을 우선 사용해 입력 내용을 그대로 남긴다.
  const kept = (name: string, fallback = "") => state?.values?.[name] || fallback;
  // 아이폰 사진(HEIC)은 제출 전에 JPEG로 바꾼다.
  const [heicError, setHeicError] = useState("");

  async function handleCoverImageChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const { error: conversionError } = await replaceHeicSelection(input, file);
    setHeicError(conversionError);
  }

  return (
    <form action={submit} className="space-y-7">
      {coupon ? <input type="hidden" name="coupon_id" value={coupon.id} /> : null}
      <input type="hidden" name="redemption_code_configured" value={coupon?.redemptionCodeConfigured ? "true" : "false"} />
      {coupon?.coverImage ? <input type="hidden" name="existing_cover_image_url" value={coupon.coverImage} /> : null}
      {state?.error ? <FormBanner>{state.error}</FormBanner> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><FormField name="title" label="쿠폰명" required max={100} defaultValue={kept("title", coupon?.title)} placeholder="예: 평일 브런치 5,000원 할인" /></div>
        <label>
          <FieldLabel required>혜택 유형</FieldLabel>
          <select name="benefit_type" defaultValue={kept("benefit_type", coupon?.benefitType ?? "fixed_amount")} className={fieldControlClassName()} required>
            <option value="fixed_amount">정액 할인</option>
            <option value="percentage">정률 할인</option>
            <option value="free_item">무료 제공</option>
            <option value="other">기타 혜택</option>
          </select>
        </label>
        <FormField name="benefit_value" label="혜택 값" required defaultValue={kept("benefit_value", coupon?.benefitValue)} placeholder="정액은 5000, 정률은 10, 증정은 아메리카노 1잔" />
        <FormField name="total_quantity" label="총 발행 수량" type="number" min={coupon?.claimedQuantity ?? 1} max={100000} required defaultValue={kept("total_quantity", String(coupon?.totalQuantity ?? 100))} suffix="장" />
        <label>
          <FieldLabel>대표 이미지</FieldLabel>
          <input name="cover_image" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={handleCoverImageChange} className={fieldControlClassName(undefined, "file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-black file:text-primary")} />
          <p className="mt-2 text-xs text-gray-400">JPG, PNG, WEBP · 최대 10MB · 미등록 시 가게 대표 이미지 사용 · 아이폰 사진(HEIC)은 자동 변환</p>
          <FieldError>{heicError}</FieldError>
        </label>
        <div className="sm:col-span-2">
          <label>
            <FieldLabel required>쿠폰 소개</FieldLabel>
            <textarea name="description" required defaultValue={kept("description", coupon?.description)} rows={4} placeholder="회원에게 보일 혜택을 소개해주세요." className={fieldControlClassName()} />
          </label>
        </div>
      </div>

      <section className="rounded-2xl bg-slate-50 p-5">
        <h2 className="font-black text-charcoal">쿠폰 기간</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">이 기간 동안 회원이 쿠폰을 받고 매장에서 사용합니다.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FormField name="start_date" label="시작일" type="date" required defaultValue={kept("start_date", coupon?.startDate)} />
          <FormField name="end_date" label="종료일" type="date" required defaultValue={kept("end_date", coupon?.endDate)} />
        </div>
      </section>

      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <h2 className="font-black text-charcoal">현장 사용 코드</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          매장에서 운영자가 회원 휴대폰에 입력할 숫자 6자리입니다. 저장 후에는 다시 표시되지 않습니다.
        </p>
        {coupon?.redemptionCodeConfigured ? (
          <p className="mt-3 text-xs font-bold text-emerald-700">사용 코드가 설정되어 있습니다. 변경하려면 새 코드를 입력하세요.</p>
        ) : null}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FormField
            name="redemption_code"
            label={coupon?.redemptionCodeConfigured ? "새 사용 코드 (선택)" : "사용 코드"}
            type="password"
            inputMode="numeric"
            minLength={6}
            maxLength={6}
            pattern="[0-9]{6}"
            required={!coupon?.redemptionCodeConfigured}
            placeholder="숫자 6자리"
            autoComplete="new-password"
          />
          <FormField
            name="redemption_code_confirm"
            label={coupon?.redemptionCodeConfigured ? "새 사용 코드 확인" : "사용 코드 확인"}
            type="password"
            inputMode="numeric"
            minLength={6}
            maxLength={6}
            pattern="[0-9]{6}"
            required={!coupon?.redemptionCodeConfigured}
            placeholder="동일한 코드 재입력"
            autoComplete="new-password"
          />
        </div>
      </section>

      <label className="block">
        <FieldLabel required>상세 이용 조건</FieldLabel>
        <textarea name="terms" required defaultValue={kept("terms", coupon?.terms)} rows={6} placeholder={"예: 1만원 이상 주문 시 사용 가능\n다른 할인과 중복 사용 불가\n주말 및 공휴일 제외"} className={fieldControlClassName()} />
      </label>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
        <button name="intent" value="draft" className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-black text-gray-600">초안 저장</button>
        <button name="intent" value="review" className="rounded-xl bg-primary px-6 py-3 text-sm font-black text-white">저장 후 검수 요청</button>
      </div>
    </form>
  );
}
