"use client";

import { useActionState, useMemo, useRef, useState, type ChangeEvent } from "react";
import { CalendarDays, Check, ExternalLink, ImageIcon, Link2, UploadCloud } from "lucide-react";
import type { CollaborationSubmissionDetail } from "@/lib/supabase/queries";
import { emptyFormState } from "@/lib/form-errors";
import { StoreContactCard } from "@/app/components/store-contact-card";
import { FieldError, FormBanner, FormField, fieldControlClassName } from "@/app/components/form-field";
import { submitContent } from "./actions";

type SubmissionDetail = NonNullable<CollaborationSubmissionDetail>;

type SubmissionFormProps = {
  collaboration: SubmissionDetail;
  error?: string;
};

type ImagePreview = {
  url: string;
  name: string;
};

const platformOptions = ["블로그", "인스타그램", "유튜브 쇼츠", "기타"];
const submissionImageAccept = "image/jpeg,image/png,image/webp";
const maxSubmissionImageBytes = 10 * 1024 * 1024;

function getImageValidationMessage(file: File) {
  if (!file.type.startsWith("image/") || !submissionImageAccept.split(",").includes(file.type)) {
    return "미리보기 이미지는 JPG, PNG, WEBP 형식만 업로드할 수 있습니다.";
  }

  if (file.size > maxSubmissionImageBytes) {
    return "미리보기 이미지는 10MB 이하 파일만 업로드할 수 있습니다.";
  }

  return "";
}

function formatDate(value: string) {
  if (!value) return "미정";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;

  return `${year}.${month}.${day}`;
}

function isLateSubmission(publishedAt: string, dueDate: string) {
  if (!publishedAt || !dueDate || dueDate === "미정") return false;
  return publishedAt.slice(0, 10) > dueDate.slice(0, 10);
}

function statusLabel(status: string) {
  if (status === "submitted") return "검수 대기";
  if (status === "needs_revision") return "수정 요청";
  if (status === "approved") return "승인 완료";
  if (status === "rejected") return "반려";
  if (status === "selected") return "선정";
  if (status === "visit_scheduled") return "방문 예정";
  if (status === "visited") return "방문 완료";
  return status || "진행중";
}

export function SubmissionForm({ collaboration }: SubmissionFormProps) {
  const [state, formAction, isPending] = useActionState(submitContent, emptyFormState);
  const fieldErrors = state.fieldErrors ?? {};
  const existingSubmission = collaboration.submission;
  const canEdit = existingSubmission?.reviewStatus !== "approved";
  const [platform, setPlatform] = useState(existingSubmission?.platform || platformOptions[0]);
  const [contentUrl, setContentUrl] = useState(existingSubmission?.contentUrl ?? "");
  const [publishedAt, setPublishedAt] = useState(existingSubmission?.publishedAt ?? "");
  const [disclosureConfirmed, setDisclosureConfirmed] = useState(existingSubmission?.disclosureConfirmed ?? false);
  const [previewImage, setPreviewImage] = useState<ImagePreview | null>(null);
  // 파일을 고르는 즉시 형식·용량을 알려준다. 서버 검증 결과와 같은 자리에 표시한다.
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const previewImageInputRef = useRef<HTMLInputElement>(null);
  const previewImageUrl = previewImage?.url ?? existingSubmission?.previewImageUrl ?? "";
  const isRevision = existingSubmission?.reviewStatus === "needs_revision";
  const submitLabel = existingSubmission ? "제출 수정하기" : "콘텐츠 제출 완료";
  const lateSubmission = useMemo(() => isLateSubmission(publishedAt, collaboration.submissionDue), [publishedAt, collaboration.submissionDue]);

  function handlePreviewImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageError = getImageValidationMessage(file);
    if (imageError) {
      if (previewImageInputRef.current) previewImageInputRef.current.value = "";
      setImageMessage(imageError);
      return;
    }

    if (previewImage) URL.revokeObjectURL(previewImage.url);
    setPreviewImage({
      url: URL.createObjectURL(file),
      name: file.name
    });
    setImageMessage(null);
  }



  if (!canEdit && existingSubmission) {
    return (
      <main className="bg-[#F8F9FA]">
        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <SubmissionHeader collaboration={collaboration} />
          <div className="mt-8 overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {existingSubmission.previewImageUrl ? <img src={existingSubmission.previewImageUrl} alt="" className="h-72 w-full object-cover" /> : null}
            <div className="space-y-5 p-6 sm:p-8">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">승인 완료</span>
              <h1 className="text-2xl font-black text-charcoal">제출 콘텐츠가 승인되었습니다</h1>
              <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <ReviewItem label="게시 채널" value={existingSubmission.platform} />
                <ReviewItem label="게시일" value={formatDate(existingSubmission.publishedAt)} />
                <ReviewItem label="콘텐츠 URL" value={existingSubmission.contentUrl} />
                <ReviewItem label="제공 사실 표시" value={existingSubmission.disclosureConfirmed ? "확인 완료" : "미확인"} />
              </div>
              <a href={existingSubmission.contentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white hover:bg-primaryHover">
                콘텐츠 열기
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[#F8F9FA]">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <SubmissionHeader collaboration={collaboration} />

        {state.formError ? <div className="mt-5"><FormBanner>{state.formError}</FormBanner></div> : null}
        {isRevision && existingSubmission?.adminMemo ? (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-700">수정 요청: {existingSubmission.adminMemo}</p>
        ) : null}

        <form action={formAction} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <input type="hidden" name="collaboration_id" value={collaboration.id} />

          <div className="space-y-6 rounded-[20px] border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-charcoal">게시 채널 <Required /></span>
                <select
                  name="platform"
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  className={fieldControlClassName(fieldErrors.platform, "bg-white")}
                >
                  {platformOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
                <FieldError>{fieldErrors.platform}</FieldError>
              </label>
              <TextField
                name="published_at"
                label="게시일"
                value={publishedAt}
                onChange={setPublishedAt}
                type="date"
                icon={<CalendarDays size={17} />}
                requiredMark
                error={fieldErrors.published_at}
              />
            </div>

            <TextField
              name="content_url"
              label="콘텐츠 URL"
              value={contentUrl}
              onChange={setContentUrl}
              placeholder="https://..."
              type="url"
              icon={<Link2 size={17} />}
              requiredMark
              error={fieldErrors.content_url}
            />

            {lateSubmission ? (
              <p className="rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-700">
                게시일이 제출 마감일 이후입니다. 제출은 가능하지만 지연 제출로 확인될 수 있습니다.
              </p>
            ) : null}

            <div>
              <span className="mb-2 block text-sm font-black text-charcoal">미리보기 이미지 <Required /></span>
              <label className={`group flex cursor-pointer justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors hover:border-primary hover:bg-primary/5 ${
                previewImageUrl ? "aspect-video border-primary bg-slate-100 p-0" : "border-slate-300 bg-slate-50 px-6 py-10"
              }`}>
                {previewImageUrl ? (
                  <span className="relative block h-full w-full">
                    <img src={previewImageUrl} alt="" className="h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-charcoal/80 px-4 py-3 text-sm font-bold text-white">
                      <span className="truncate">{previewImage?.name ?? "등록된 미리보기 이미지"}</span>
                      <span className="shrink-0 rounded-lg bg-white/15 px-3 py-1">변경</span>
                    </span>
                  </span>
                ) : (
                  <span className="flex flex-col items-center text-center">
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UploadCloud size={24} />
                    </span>
                    <span className="text-sm font-black text-charcoal">이미지 업로드</span>
                    <span className="mt-2 text-xs text-slate-500">JPG, PNG, WEBP · 최대 10MB</span>
                  </span>
                )}
                <input ref={previewImageInputRef} name="preview_image" type="file" accept={submissionImageAccept} onChange={handlePreviewImageChange} className="sr-only" />
              </label>
              <FieldError>{imageMessage ?? fieldErrors.preview_image}</FieldError>
            </div>

            <label className={`group flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold text-slate-600 ${fieldErrors.disclosure_confirmed ? "border-red-300 bg-red-50" : "border-transparent bg-slate-50"}`}>
              <input
                type="checkbox"
                name="disclosure_confirmed"
                checked={disclosureConfirmed}
                onChange={(event) => setDisclosureConfirmed(event.target.checked)}
                className="sr-only"
              />
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-slate-300 bg-white transition-colors group-hover:border-primary group-has-[:checked]:border-primary group-has-[:checked]:bg-primary">
                <Check size={13} className="text-white opacity-0 transition-opacity group-has-[:checked]:opacity-100" strokeWidth={3} />
              </span>
              제공 사실 표시를 포함했고, 캠페인 종료 후 최소 6개월간 콘텐츠를 유지하는 데 동의합니다.
            </label>
            <FieldError>{fieldErrors.disclosure_confirmed}</FieldError>

            <button
              disabled={isPending}
              className="w-full rounded-xl bg-primary px-5 py-3.5 font-black text-white shadow-md shadow-primary/25 transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60"
            >
              {isPending ? "제출하는 중..." : submitLabel}
            </button>
          </div>

          <aside className="space-y-4">
            <StoreContactCard store={collaboration.store} />
            <div className="rounded-[20px] border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg font-black text-charcoal">제출 전 확인</h2>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
              {previewImageUrl ? (
                <img src={previewImageUrl} alt="" className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center text-slate-300">
                  <ImageIcon size={38} />
                </div>
              )}
            </div>
            <div className="mt-5 space-y-3">
              <ReviewItem label="게시 채널" value={platform} />
              <ReviewItem label="게시일" value={formatDate(publishedAt)} />
              <ReviewItem label="콘텐츠 URL" value={contentUrl || "미입력"} />
              <ReviewItem label="제공 사실 표시" value={disclosureConfirmed ? "확인 완료" : "미확인"} />
            </div>
            </div>
          </aside>
        </form>
      </section>
    </main>
  );
}

function SubmissionHeader({ collaboration }: { collaboration: SubmissionDetail }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <div className="h-48 bg-slate-100 md:h-full">
          {collaboration.campaignCoverImage ? (
            <img src={collaboration.campaignCoverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <ImageIcon size={38} />
            </div>
          )}
        </div>
        <div className="p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{statusLabel(collaboration.status)}</span>
            {collaboration.visitDate ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">방문 {formatDate(collaboration.visitDate)}</span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">마감 {formatDate(collaboration.submissionDue)}</span>
            {collaboration.submission ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{statusLabel(collaboration.submission.reviewStatus)}</span> : null}
          </div>
          <h1 className="text-2xl font-black text-charcoal sm:text-3xl">콘텐츠 제출하기</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{collaboration.campaignTitle}</p>
        </div>
      </div>
    </div>
  );
}

function Required() {
  return <span className="text-primary">*</span>;
}

function TextField({
  name,
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  requiredMark = false,
  error
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  requiredMark?: boolean;
  error?: string;
}) {
  return (
    <FormField
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      icon={icon}
      type={type}
      required={requiredMark}
      error={error}
    />
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-black text-charcoal">{value || "미입력"}</p>
    </div>
  );
}
