"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { euckrByteLength, resolveSmsType } from "@/lib/messages";
import type { NotificationEvent } from "@/lib/supabase/queries";

const inputClassName = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-primary";

// 미리보기에 채워 넣을 예시. 실제로는 캠페인 제목과 관리자 메모가 들어간다.
const SAMPLE_CAMPAIGN = "노원 수제맥주 체험단";
const SAMPLE_REASON = "촬영 미션이 구체적이지 않아 보완이 필요합니다.";

function render(text: string) {
  return text.replace(/\{캠페인\}/g, SAMPLE_CAMPAIGN).replace(/\{사유\}/g, SAMPLE_REASON);
}

export function EventEditor({
  event,
  returnTo,
  updateAction
}: {
  event: NotificationEvent;
  returnTo: string;
  updateAction: (formData: FormData) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [body, setBody] = useState(event.body);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function open() {
    setTitle(event.title);
    setBody(event.body);
    setIsOpen(true);
  }

  const previewTitle = render(title || "제목");
  const previewBody = render(body || "내용");
  const smsText = `${previewTitle}\n\n${previewBody}`;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
      >
        <Pencil size={13} /> 문구 수정
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center" role="dialog" aria-modal="true" aria-labelledby={`event-${event.key}-title`}>
          <button type="button" onClick={() => setIsOpen(false)} className="absolute inset-0 bg-charcoal/50" aria-label="닫기" />
          <section className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] bg-white text-left shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div className="min-w-0">
                <h2 id={`event-${event.key}-title`} className="break-keep text-lg font-black text-charcoal">{event.label} 문구</h2>
                <p className="mt-0.5 text-xs text-gray-500">{event.audience === "business" ? "가게·브랜드" : "크리에이터"}에게 갑니다.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100" aria-label="닫기">
                <X size={18} />
              </button>
            </div>

            <form action={updateAction} className="flex min-h-0 flex-1 flex-col">
              <input type="hidden" name="event_key" value={event.key} />
              <input type="hidden" name="return_to" value={returnTo} />

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                <div>
                  <label htmlFor={`title-${event.key}`} className="mb-1.5 block text-xs font-bold text-gray-400">제목</label>
                  <input id={`title-${event.key}`} name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} className={inputClassName} />
                </div>

                <div>
                  <label htmlFor={`body-${event.key}`} className="mb-1.5 block text-xs font-bold text-gray-400">내용</label>
                  <textarea id={`body-${event.key}`} name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={400} className={`${inputClassName} resize-y`} />
                  <p className="mt-1.5 break-keep text-xs text-gray-500">
                    <b className="font-bold text-charcoal">{"{캠페인}"}</b>은 캠페인 제목으로,{" "}
                    <b className="font-bold text-charcoal">{"{사유}"}</b>는 운영자가 남긴 메모로 바뀝니다.
                  </p>
                </div>

                <div>
                  <span className="mb-1.5 block text-xs font-bold text-gray-400">이렇게 보입니다</span>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="break-keep font-bold text-charcoal">{previewTitle}</p>
                    <p className="mt-1.5 whitespace-pre-wrap break-keep text-sm leading-relaxed text-gray-600">{previewBody}</p>
                  </div>
                  {event.smsEnabled ? (
                    <p className="mt-1.5 text-xs text-gray-400">
                      문자 {resolveSmsType(smsText)} · {euckrByteLength(smsText)}바이트
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 p-5">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">
                  닫기
                </button>
                <button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-primaryHover">
                  저장
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
