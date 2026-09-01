"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { Badge } from "@/app/components/ui";
import { replaceHeicSelection } from "@/lib/heic";
import { storyKindLabel, type StoryContentBlock } from "@/lib/story-content";
import type { AdminEditorialStory } from "@/lib/types";
import { NotionStoryEditor } from "./notion-story-editor";

type StoryAction = (formData: FormData) => void | Promise<void>;
type BusinessOption = { id: string; name: string };

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function newBlock(type: StoryContentBlock["type"]): StoryContentBlock {
  const id = makeId();
  if (type === "link") return { id, type, label: "", url: "" };
  if (type === "image") return { id, type, url: "", alt: "", caption: "", inputName: `block_image_${id}` };
  return { id, type, text: "" };
}

function formatDate(value: string) {
  if (!value) return "아직 공개되지 않음";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(new Date(value));
}

export function StoryManagement({
  stories,
  businesses,
  createAction,
  updateAction
}: {
  stories: AdminEditorialStory[];
  businesses: BusinessOption[];
  createAction: StoryAction;
  updateAction: StoryAction;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<AdminEditorialStory | null>(null);
  const [blocks, setBlocks] = useState<StoryContentBlock[]>([]);
  const [coverPreview, setCoverPreview] = useState("");
  const [imageError, setImageError] = useState("");

  function openCreate() {
    setEditing(null);
    setBlocks([newBlock("paragraph")]);
    setCoverPreview("");
    setImageError("");
    setIsOpen(true);
  }

  function openEdit(story: AdminEditorialStory) {
    setEditing(story);
    setBlocks(story.contentBlocks.length ? story.contentBlocks : [newBlock("paragraph")]);
    setCoverPreview(story.coverImage);
    setImageError("");
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-black text-charcoal">작성한 스토리</h2><p className="mt-1 text-sm text-gray-500">새소식과 인터뷰를 초안으로 저장하거나 바로 공개할 수 있습니다.</p></div>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primaryHover"><Plus size={18} />스토리 작성</button>
      </div>
      <div className="divide-y divide-line">
        {stories.length ? stories.map((story) => (
          <article key={story.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <img src={story.coverImage} alt="" className="h-24 w-full rounded-lg object-cover sm:w-36" />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap gap-2"><Badge tone={story.status === "published" ? "green" : "gray"}>{story.status === "published" ? "공개" : "비공개"}</Badge><Badge tone="blue">{storyKindLabel(story.storyKind)}</Badge></div>
              <h3 className="truncate font-black text-charcoal">{story.title}</h3>
              <p className="mt-1 line-clamp-1 text-sm text-gray-500">{story.summary}</p>
              <p className="mt-2 text-xs font-bold text-gray-400">{story.businessName ?? "연결 매장 없음"} · {formatDate(story.publishedAt)}</p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button type="button" onClick={() => openEdit(story)} className="inline-flex items-center gap-1.5 text-xs font-black text-charcoal hover:text-primary"><Pencil size={14} />수정</button>
              {story.status === "published" ? <Link href={`/stories/${story.id}`} className="text-xs font-black text-primary hover:underline">사용자 화면</Link> : null}
            </div>
          </article>
        )) : <p className="p-10 text-center text-sm font-bold text-gray-400">작성된 새소식과 인터뷰가 없습니다.</p>}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="story-editor-title">
          <button type="button" className="absolute inset-0 bg-charcoal/50" onClick={() => setIsOpen(false)} aria-label="스토리 편집 닫기" />
          <div className="relative flex max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:max-w-5xl sm:rounded-lg">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7">
              <div><h2 id="story-editor-title" className="text-xl font-black text-charcoal">{editing ? "스토리 수정" : "스토리 작성"}</h2><p className="mt-1 text-sm text-gray-500">문서를 작성하듯 새소식이나 인터뷰를 완성하세요.</p></div>
              <button type="button" onClick={() => setIsOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100" aria-label="닫기"><X size={21} /></button>
            </div>
            <form key={editing?.id ?? "create"} action={editing ? updateAction : createAction} className="flex min-h-0 flex-1 flex-col">
              {editing ? <input type="hidden" name="story_id" value={editing.id} /> : null}
              <input type="hidden" name="content_blocks" value={JSON.stringify(blocks)} />
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
                <div className="grid gap-7 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.5fr)]">
                  <div className="space-y-5">
                    <label className="block"><span className="mb-2 block text-sm font-black text-charcoal">카테고리</span><select name="story_kind" defaultValue={editing?.storyKind ?? "news"} className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring"><option value="news">새소식</option><option value="interview">인터뷰</option></select></label>
                    <label className="block"><span className="mb-2 block text-sm font-black text-charcoal">제목</span><input name="title" required maxLength={160} defaultValue={editing?.title ?? ""} className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" /></label>
                    <label className="block"><span className="mb-2 block text-sm font-black text-charcoal">요약</span><textarea name="summary" required maxLength={600} defaultValue={editing?.summary ?? ""} className="min-h-28 w-full resize-y rounded-lg border border-line px-4 py-3 text-sm leading-6 focus-ring" /></label>
                    <label className="block"><span className="mb-2 block text-sm font-black text-charcoal">연결 매장 <span className="font-medium text-gray-400">(선택)</span></span><select name="business_id" defaultValue={editing?.businessId ?? ""} className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring"><option value="">연결하지 않음</option>{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>
                    <label className="block"><span className="mb-2 block text-sm font-black text-charcoal">표지 이미지</span>{coverPreview ? <img src={coverPreview} alt="표지 미리보기" className="mb-3 h-44 w-full rounded-lg object-cover" /> : null}<input type="file" name="cover_image" required={!editing} accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const result = await replaceHeicSelection(event.currentTarget, file); setImageError(result.error); if (result.file) setCoverPreview(URL.createObjectURL(result.file)); }} className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-black file:text-primary" /><span className="mt-2 block text-xs text-gray-400">JPG, PNG, WEBP · 최대 8MB</span>{imageError ? <span className="mt-2 block text-xs font-bold text-red-600">{imageError}</span> : null}</label>
                    <label className="block"><span className="mb-2 block text-sm font-black text-charcoal">공개 상태</span><select name="status" defaultValue={editing?.status ?? "draft"} className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring"><option value="draft">비공개로 저장</option><option value="published">바로 공개</option></select></label>
                  </div>
                  <div><span className="mb-2 block text-sm font-black text-charcoal">본문</span><NotionStoryEditor value={blocks} onChange={setBlocks} /></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-line bg-gray-50 px-5 py-4 sm:px-7"><button type="button" onClick={() => setIsOpen(false)} className="rounded-lg border border-line bg-white px-5 py-3 text-sm font-black text-charcoal">닫기</button><button className="rounded-lg bg-primary px-6 py-3 text-sm font-black text-white hover:bg-primaryHover">{editing ? "수정 완료" : "스토리 저장"}</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
