"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLink, Save, Star } from "lucide-react";
import type { BusinessCreatorReviewItem } from "@/lib/supabase/queries";

type ReviewAction = (formData: FormData) => void | Promise<void>;

const ratingFields = [
  ["content_quality", "콘텐츠 퀄리티"],
  ["guideline_compliance", "가이드 준수"],
  ["communication", "소통 신속성"],
  ["punctuality", "일정 준수"]
] as const;

function formatDate(value: string) {
  if (!value) return "미정";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;

  return `${year}.${month}.${day}`;
}

function formatDateTime(value: string) {
  if (!value) return "저장 전";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function submissionStatusLabel(status?: string) {
  if (status === "approved") return "승인 완료";
  if (status === "needs_revision") return "수정 요청";
  if (status === "rejected") return "반려";
  if (status === "submitted") return "검수 대기";
  return "제출 대기";
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function CreatorAvatar({ item }: { item: BusinessCreatorReviewItem }) {
  const initial = item.creatorNickname.slice(0, 1);

  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-primary/10">
      {item.creatorAvatarUrl ? (
        <img src={item.creatorAvatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg font-black text-primary">{initial}</div>
      )}
    </div>
  );
}

function RatingInput({
  name,
  label,
  value,
  onChange
}: {
  name: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <input type="hidden" name={name} value={value ?? ""} />
      <div className="flex gap-1" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => {
          const active = value !== null && star <= value;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(value === star ? null : star)}
              className={`rounded-md p-0.5 transition-colors ${active ? "text-primary" : "text-gray-200 hover:text-primary/60"}`}
              aria-label={`${label} ${star}점`}
            >
              <Star size={16} fill={active ? "currentColor" : "none"} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60"
    >
      <Save size={15} />
      {pending ? "저장 중" : "저장"}
    </button>
  );
}

export function CreatorReviewCard({
  item,
  action,
  returnPath
}: {
  item: BusinessCreatorReviewItem;
  action: ReviewAction;
  returnPath: string;
}) {
  const [ratings, setRatings] = useState({
    content_quality: item.review?.contentQuality ?? null,
    guideline_compliance: item.review?.guidelineCompliance ?? null,
    communication: item.review?.communication ?? null,
    punctuality: item.review?.punctuality ?? null
  });
  const [reworkIntent, setReworkIntent] = useState(item.review?.reworkIntent ?? false);
  const [tagsText, setTagsText] = useState(item.review?.tags.join(", ") ?? "");
  const [privateComment, setPrivateComment] = useState(item.review?.privateComment ?? "");
  const tags = useMemo(() => splitTags(tagsText), [tagsText]);

  return (
    <form action={action} className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors hover:border-primary/20">
      <input type="hidden" name="collaboration_id" value={item.collaborationId} />
      <input type="hidden" name="return_path" value={returnPath} />

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row">
          <section className="w-full space-y-4 xl:w-[28%]">
            <div className="flex items-center gap-4">
              <CreatorAvatar item={item} />
              <div className="min-w-0">
                <h3 className="truncate font-bold text-charcoal">{item.creatorNickname}</h3>
                <p className="truncate text-xs text-gray-400">{item.creatorChannelSummary}</p>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase text-gray-400">연계 캠페인</p>
              <p className="line-clamp-2 text-xs font-medium text-charcoal">{item.campaignTitle}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                <span className="rounded-lg bg-primary/10 px-2 py-1 text-primary">선정 {formatDate(item.selectedAt)}</span>
                <span className="rounded-lg bg-gray-100 px-2 py-1 text-gray-500">마감 {formatDate(item.submissionDue)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-500">
                {submissionStatusLabel(item.submission?.reviewStatus)}
              </span>
              {item.submission?.contentUrl ? (
                <a
                  href={item.submission.contentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] font-bold text-primary"
                >
                  콘텐츠 보기 <ExternalLink size={12} />
                </a>
              ) : null}
              {item.creatorChannelUrl ? (
                <a
                  href={item.creatorChannelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-bold text-gray-500"
                >
                  채널 보기 <ExternalLink size={12} />
                </a>
              ) : null}
            </div>

            <label className="flex items-center justify-between px-1 text-xs font-medium text-gray-500">
              재섭외 의사
              <span className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  name="rework_intent"
                  checked={reworkIntent}
                  onChange={(event) => setReworkIntent(event.target.checked)}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-gray-200 transition-colors after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </span>
            </label>
          </section>

          <section className="w-full space-y-5 border-y border-gray-100 py-5 xl:flex-1 xl:border-x xl:border-y-0 xl:px-6 xl:py-0">
            <div>
              <p className="mb-3 text-sm font-bold text-charcoal">협업 평가</p>
              <div className="grid grid-cols-2 gap-4">
                {ratingFields.map(([name, label]) => (
                  <RatingInput
                    key={name}
                    name={name}
                    label={label}
                    value={ratings[name]}
                    onChange={(nextValue) => setRatings((current) => ({ ...current, [name]: nextValue }))}
                  />
                ))}
              </div>
            </div>

            <div>
              <label htmlFor={`tags-${item.collaborationId}`} className="mb-2 block text-xs font-bold uppercase text-gray-400">
                특징 태그
              </label>
              <input
                id={`tags-${item.collaborationId}`}
                name="tags"
                type="text"
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                className="w-full rounded-xl border border-transparent bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-primary/30 focus:bg-white"
              />
              <div className="mt-3 flex min-h-7 flex-wrap gap-2">
                {tags.length ? (
                  tags.map((tag) => (
                    <span key={tag} className="rounded-lg border border-primary/10 bg-primary/5 px-2 py-1 text-[10px] font-bold text-primary">
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-medium text-gray-400">등록된 태그 없음</span>
                )}
              </div>
            </div>
          </section>

          <section className="flex w-full flex-col xl:w-[30%]">
            <label htmlFor={`memo-${item.collaborationId}`} className="mb-3 text-sm font-bold text-charcoal">
              내부 메모
            </label>
            <textarea
              id={`memo-${item.collaborationId}`}
              name="private_comment"
              value={privateComment}
              onChange={(event) => setPrivateComment(event.target.value)}
              className="min-h-[136px] flex-grow resize-none rounded-2xl border-0 bg-gray-50 p-4 text-xs text-gray-600 outline-none transition-colors focus:bg-white focus:ring-1 focus:ring-primary/20"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[10px] italic text-gray-400">최종 수정: {formatDateTime(item.review?.updatedAt ?? "")}</p>
              <SaveButton />
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
