import { ExternalLink, Eye, EyeOff, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/app/components/confirm-button";
import { fieldControlClassName } from "@/app/components/form-field";
import type { MinihomeLink } from "@/lib/minihome-links";
import { createMinihomeLink, deleteMinihomeLink, toggleMinihomeLinkVisibility, updateMinihomeLink } from "./link-actions";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function MinihomeLinkManager({ links }: { links: MinihomeLink[] }) {
  return (
    <section id="links" className="scroll-mt-6 rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black text-charcoal"><Link2 size={20} className="text-primary" /> 외부 링크</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">스마트스토어, 예약, 메뉴판 등 방문자를 연결할 링크를 최대 20개까지 등록할 수 있습니다.</p>
      </div>

      <form action={createMinihomeLink} className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)_auto] md:items-end">
        <label>
          <span className="mb-2 block text-xs font-black text-gray-500">링크 이름</span>
          <input name="title" required maxLength={60} placeholder="예: 네이버 스마트스토어" className={fieldControlClassName()} />
        </label>
        <label>
          <span className="mb-2 block text-xs font-black text-gray-500">연결 주소</span>
          <input name="url" required inputMode="url" placeholder="smartstore.naver.com/..." className={fieldControlClassName()} />
        </label>
        <button className="inline-flex h-[50px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-white">
          <Plus size={16} /> 추가
        </button>
      </form>

      {links.length ? (
        <div className="mt-6 divide-y divide-slate-100 border-y border-slate-100">
          {links.map((link) => (
            <article key={link.id} className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><ExternalLink size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-black text-charcoal">{link.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${link.isVisible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {link.isVisible ? "공개" : "숨김"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-400">{hostname(link.url)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a href={link.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-2 text-gray-400" aria-label={`${link.title} 열기`}><ExternalLink size={15} /></a>
                  <form action={toggleMinihomeLinkVisibility}>
                    <input type="hidden" name="link_id" value={link.id} />
                    <input type="hidden" name="is_visible" value={link.isVisible ? "false" : "true"} />
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-gray-600">
                      {link.isVisible ? <EyeOff size={14} /> : <Eye size={14} />}{link.isVisible ? "숨기기" : "공개"}
                    </button>
                  </form>
                  <ConfirmButton label="삭제" confirmLabel={`${link.title} 링크를 삭제합니다.`} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black text-red-500">
                    <form action={deleteMinihomeLink}>
                      <input type="hidden" name="link_id" value={link.id} />
                      <button className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white"><Trash2 size={13} /> 삭제 확정</button>
                    </form>
                  </ConfirmButton>
                </div>
              </div>

              <details className="group mt-3 rounded-xl border border-slate-100 bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 text-xs font-black text-gray-500"><Pencil size={13} /> 링크 수정</summary>
                <form action={updateMinihomeLink} className="grid gap-3 border-t border-slate-100 p-4 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)_auto] md:items-end">
                  <input type="hidden" name="link_id" value={link.id} />
                  <label><span className="mb-2 block text-xs font-black text-gray-500">링크 이름</span><input name="title" required maxLength={60} defaultValue={link.title} className={fieldControlClassName()} /></label>
                  <label><span className="mb-2 block text-xs font-black text-gray-500">연결 주소</span><input name="url" required inputMode="url" defaultValue={link.url} className={fieldControlClassName()} /></label>
                  <button className="h-[50px] rounded-xl bg-charcoal px-5 text-sm font-black text-white">저장</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">
          <Link2 size={27} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-gray-500">아직 등록한 외부 링크가 없습니다.</p>
        </div>
      )}
    </section>
  );
}
