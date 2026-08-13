import { FieldLabel, FormBanner, FormField, fieldControlClassName } from "@/app/components/form-field";
import type { Coupon } from "@/lib/coupons";

export function CouponForm({ action, coupon, error }: { action: (formData: FormData) => void | Promise<void>; coupon?: Coupon | null; error?: string }) {
  return (
    <form action={action} encType="multipart/form-data" className="space-y-7">
      {coupon ? <input type="hidden" name="coupon_id" value={coupon.id} /> : null}
      {coupon?.coverImage ? <input type="hidden" name="existing_cover_image_url" value={coupon.coverImage} /> : null}
      {error ? <FormBanner>{error}</FormBanner> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><FormField name="title" label="쿠폰명" required max={100} defaultValue={coupon?.title} placeholder="예: 평일 브런치 5,000원 할인" /></div>
        <label>
          <FieldLabel required>혜택 유형</FieldLabel>
          <select name="benefit_type" defaultValue={coupon?.benefitType ?? "fixed_amount"} className={fieldControlClassName()} required>
            <option value="fixed_amount">정액 할인</option>
            <option value="percentage">정률 할인</option>
            <option value="free_item">무료 제공</option>
            <option value="other">기타 혜택</option>
          </select>
        </label>
        <FormField name="benefit_value" label="혜택 값" required defaultValue={coupon?.benefitValue} placeholder="정액은 5000, 정률은 10, 증정은 아메리카노 1잔" />
        <FormField name="total_quantity" label="총 발행 수량" type="number" min={coupon?.claimedQuantity ?? 1} max={100000} required defaultValue={String(coupon?.totalQuantity ?? 100)} suffix="장" />
        <label>
          <FieldLabel>대표 이미지</FieldLabel>
          <input name="cover_image" type="file" accept="image/jpeg,image/png,image/webp" className={fieldControlClassName(undefined, "file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-black file:text-primary")} />
          <p className="mt-2 text-xs text-gray-400">JPG, PNG, WEBP · 최대 10MB · 미등록 시 가게 대표 이미지 사용</p>
        </label>
        <div className="sm:col-span-2">
          <label>
            <FieldLabel required>쿠폰 소개</FieldLabel>
            <textarea name="description" required defaultValue={coupon?.description} rows={4} placeholder="회원에게 보일 혜택을 소개해주세요." className={fieldControlClassName()} />
          </label>
        </div>
      </div>

      <section className="rounded-2xl bg-slate-50 p-5">
        <h2 className="mb-5 font-black text-charcoal">발급 및 사용 기간</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField name="claim_start" label="발급 시작일" type="date" required defaultValue={coupon?.claimStart} />
          <FormField name="claim_end" label="발급 종료일" type="date" required defaultValue={coupon?.claimEnd} />
          <FormField name="use_start" label="사용 시작일" type="date" required defaultValue={coupon?.useStart} />
          <FormField name="use_end" label="사용 종료일" type="date" required defaultValue={coupon?.useEnd} />
        </div>
      </section>

      <label className="block">
        <FieldLabel required>상세 이용 조건</FieldLabel>
        <textarea name="terms" required defaultValue={coupon?.terms} rows={6} placeholder={"예: 1만원 이상 주문 시 사용 가능\n다른 할인과 중복 사용 불가\n주말 및 공휴일 제외"} className={fieldControlClassName()} />
      </label>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
        <button name="intent" value="draft" className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-black text-gray-600">초안 저장</button>
        <button name="intent" value="review" className="rounded-xl bg-primary px-6 py-3 text-sm font-black text-white">저장 후 검수 요청</button>
      </div>
    </form>
  );
}
