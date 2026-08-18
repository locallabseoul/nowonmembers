"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { LEGAL_EFFECTIVE_DATE, termsSections } from "@/lib/legal";

export function ClaimCouponForm({
  couponId,
  needsTermsAcceptance,
  action
}: {
  couponId: string;
  needsTermsAcceptance: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (!needsTermsAcceptance) {
    return (
      <form action={action} className="mt-6">
        <input type="hidden" name="coupon_id" value={couponId} />
        <button className="w-full rounded-xl bg-primary py-4 text-sm font-black text-white shadow-sm">쿠폰 1매 받기</button>
      </form>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-6 w-full rounded-xl bg-primary py-4 text-sm font-black text-white shadow-sm">
        약관 동의하고 쿠폰 받기
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div role="dialog" aria-modal="true" aria-labelledby="coupon-terms-title" className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black text-primary">시행일: {LEGAL_EFFECTIVE_DATE}</p>
                <h2 id="coupon-terms-title" className="mt-1 text-xl font-black text-charcoal">개정 서비스 이용약관</h2>
                <p className="mt-2 text-sm text-gray-500">쿠폰 발급·사용 규정이 추가되었습니다.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기" className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-6">
                {termsSections.map((section) => (
                  <section key={section.title} className="space-y-2">
                    <h3 className="font-black text-charcoal">{section.title}</h3>
                    {section.body ? <p className="text-sm leading-7 text-gray-600">{section.body}</p> : null}
                    {section.items ? (
                      <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-gray-600">
                        {section.items.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>
            </div>
            <form action={action} className="border-t border-gray-100 bg-gray-50 p-5 sm:px-6">
              <input type="hidden" name="coupon_id" value={couponId} />
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white p-4 text-sm font-bold text-charcoal">
                <input name="accept_terms" type="checkbox" required className="mt-0.5 h-4 w-4 accent-primary" />
                개정 서비스 이용약관을 확인했으며 이에 동의합니다.
              </label>
              <button className="mt-3 w-full rounded-xl bg-primary py-4 text-sm font-black text-white">동의하고 쿠폰 받기</button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
