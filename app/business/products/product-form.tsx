"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { FieldError, FieldLabel, FormBanner, FormField, fieldControlClassName } from "@/app/components/form-field";
import { replaceHeicSelection } from "@/lib/heic";
import type { BusinessProduct } from "@/lib/products";
import type { ProductFormState } from "./actions";

type SaveAction = (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;

export function ProductForm({ action, product }: { action: SaveAction; product?: BusinessProduct | null }) {
  const [state, submit] = useActionState(action, null);
  const [heicError, setHeicError] = useState("");
  const kept = (name: string, fallback = "") => state?.values?.[name] ?? fallback;

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const { error } = await replaceHeicSelection(input, file);
    setHeicError(error);
  }

  return (
    <form action={submit} className="space-y-6">
      {product ? <input type="hidden" name="product_id" value={product.id} /> : null}
      {state?.error ? <FormBanner>{state.error}</FormBanner> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label>
            <FieldLabel required>대표 이미지</FieldLabel>
            {product?.imageUrl ? <img src={product.imageUrl} alt="" className="mb-3 h-24 w-24 rounded-2xl object-cover" /> : null}
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required={!product} onChange={handleImageChange} className={fieldControlClassName(undefined, "file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-black file:text-primary")} />
            <p className="mt-2 text-xs text-gray-400">JPG, PNG, WEBP · 최대 10MB · 아이폰 사진은 자동 변환</p>
            <FieldError>{heicError}</FieldError>
          </label>
        </div>
        <FormField name="name" label="제품명" required maxLength={100} defaultValue={kept("name", product?.name)} placeholder="예: 시그니처 드립백 세트" />
        <FormField name="price" label="가격" type="number" inputMode="numeric" min={0} max={1000000000} step={1} suffix="원" required defaultValue={kept("price", product ? String(product.price) : "")} placeholder="15000" />
        <div className="sm:col-span-2">
          <label>
            <FieldLabel required>제품 소개</FieldLabel>
            <textarea name="short_description" required maxLength={200} rows={4} defaultValue={kept("short_description", product?.shortDescription)} placeholder="제품의 특징을 200자 이내로 소개해주세요." className={fieldControlClassName()} />
          </label>
        </div>
        <div className="sm:col-span-2">
          <FormField name="link_url" label="구매 링크" type="url" inputMode="url" required defaultValue={kept("link_url", product?.linkUrl)} placeholder="https://smartstore.naver.com/..." helper="스마트스토어, 자사몰 등 구매할 수 있는 주소를 입력해주세요." />
        </div>
      </div>
      <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
        <input name="is_visible" value="true" type="checkbox" defaultChecked={kept("is_visible", product ? String(product.isVisible) : "true") === "true"} className="mt-1 h-4 w-4" />
        <span><span className="block text-sm font-black text-charcoal">미니홈에 바로 노출</span><span className="mt-1 block text-xs leading-5 text-gray-500">체크를 해제하면 제품은 저장되지만 방문자에게 보이지 않습니다.</span></span>
      </label>
      <div className="flex justify-end border-t border-slate-100 pt-5">
        <button className="rounded-xl bg-primary px-7 py-3 text-sm font-black text-white">{product ? "제품 수정" : "제품 등록"}</button>
      </div>
    </form>
  );
}
