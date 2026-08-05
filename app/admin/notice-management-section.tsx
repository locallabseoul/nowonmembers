"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { Badge } from "@/app/components/ui";
import type { Notice } from "@/lib/types";

type NoticeAction = (formData: FormData) => void | Promise<void>;

function noticeStatusLabel(status: string) {
  return status === "published" ? "공개" : "비공개";
}

function noticeStatusTone(status: string): "green" | "gray" {
  return status === "published" ? "green" : "gray";
}

function formatNoticeDate(value: string) {
  if (!value) return "게시일 미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function NoticeManagementSection({
  notices,
  createAction,
  updateAction
}: {
  notices: Notice[];
  createAction: NoticeAction;
  updateAction: NoticeAction;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [status, setStatus] = useState<Notice["status"]>("draft");
  const [isPinned, setIsPinned] = useState(false);

  function openCreateModal() {
    setEditingNotice(null);
    setStatus("draft");
    setIsPinned(false);
    setIsOpen(true);
  }

  function openEditModal(notice: Notice) {
    setEditingNotice(notice);
    setStatus(notice.status);
    setIsPinned(notice.isPinned);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <section className="mb-8 rounded-lg border border-line bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-charcoal">공지 관리</h2>
          <p className="mt-1 text-sm text-gray-500">전체 사용자에게 노출할 공지를 관리합니다.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primaryHover"
        >
          <Plus size={18} />
          공지 작성
        </button>
      </div>

      <div className="divide-y divide-line">
        {notices.length ? notices.map((notice) => (
          <div key={notice.id} className="p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={noticeStatusTone(notice.status)}>{noticeStatusLabel(notice.status)}</Badge>
              {notice.isPinned ? <Badge tone="blue">상단 고정</Badge> : null}
              <span className="text-xs font-bold text-gray-400">{formatNoticeDate(notice.publishedAt || notice.createdAt)}</span>
            </div>
            <p className="text-sm font-black text-charcoal">{notice.title}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{notice.body}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => openEditModal(notice)}
                className="inline-flex items-center gap-1.5 text-xs font-black text-charcoal hover:text-primary"
              >
                <Pencil size={13} />
                수정
              </button>
              {notice.status === "published" ? (
                <Link href={`/notices/${notice.id}`} className="inline-flex text-xs font-black text-primary hover:underline">
                  사용자 화면 보기
                </Link>
              ) : null}
            </div>
          </div>
        )) : (
          <p className="p-8 text-center text-sm font-bold text-gray-400">등록된 공지가 없습니다.</p>
        )}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="notice-compose-title">
          <button type="button" className="absolute inset-0 bg-charcoal/50" onClick={closeModal} aria-label="공지 편집 닫기" />
          <div className="relative flex max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:max-w-3xl sm:rounded-lg">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7">
              <div>
                <h2 id="notice-compose-title" className="text-xl font-black text-charcoal">{editingNotice ? "공지 수정" : "공지 작성"}</h2>
                <p className="mt-1 text-sm text-gray-500">{editingNotice ? "등록된 공지 내용을 변경합니다." : "사용자에게 전달할 내용을 작성하세요."}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="닫기"
              >
                <X size={21} />
              </button>
            </div>

            <form
              key={editingNotice?.id ?? "create"}
              action={editingNotice ? updateAction : createAction}
              className="flex min-h-0 flex-1 flex-col"
            >
              {editingNotice ? <input type="hidden" name="notice_id" value={editingNotice.id} /> : null}
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-charcoal">제목</span>
                  <input
                    name="title"
                    required
                    autoFocus
                    defaultValue={editingNotice?.title ?? ""}
                    className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring"
                    placeholder="공지 제목을 입력하세요."
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-charcoal">본문</span>
                  <textarea
                    name="body"
                    required
                    defaultValue={editingNotice?.body ?? ""}
                    className="min-h-64 w-full resize-y rounded-lg border border-line px-4 py-3 text-sm leading-7 focus-ring"
                    placeholder="공지 내용을 입력하세요."
                  />
                </label>
                <label className="block sm:max-w-52">
                  <span className="mb-2 block text-sm font-black text-charcoal">공개 상태</span>
                  <select
                    name="status"
                    value={status}
                    onChange={(event) => {
                      const nextStatus = event.target.value === "published" ? "published" : "draft";
                      setStatus(nextStatus);
                      if (nextStatus === "draft") setIsPinned(false);
                    }}
                    className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring"
                  >
                    <option value="draft">비공개로 저장</option>
                    <option value="published">바로 공개</option>
                  </select>
                </label>
                <label className={`flex items-start gap-3 rounded-lg border p-4 ${status === "published" ? "cursor-pointer border-line" : "cursor-not-allowed border-gray-100 bg-gray-50"}`}>
                  <input
                    type="checkbox"
                    name="is_pinned"
                    checked={isPinned}
                    disabled={status !== "published"}
                    onChange={(event) => setIsPinned(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-black text-charcoal">상단 공지로 고정</span>
                    <span className="mt-1 block text-xs leading-5 text-gray-500">
                      네비게이션 위에 공지 바를 표시합니다. 기존 상단 공지는 자동으로 교체됩니다.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-line bg-gray-50 px-5 py-4 sm:px-7">
                <button type="button" onClick={closeModal} className="rounded-lg border border-line bg-white px-5 py-3 text-sm font-black text-charcoal hover:bg-gray-100">
                  닫기
                </button>
                <button className="rounded-lg bg-primary px-6 py-3 text-sm font-black text-white hover:bg-primaryHover">
                  {editingNotice ? "수정 완료" : "공지 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
