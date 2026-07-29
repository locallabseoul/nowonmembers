"use client";

import { useActionState } from "react";
import { emptyFormState } from "@/lib/form-errors";
import { FieldError, FieldLabel, FormBanner, FormField, fieldControlClassName } from "@/app/components/form-field";
import { ApplicationDatePicker } from "./application-date-picker";
import { applyCampaign } from "./actions";

type ApplicationDefaults = {
  applicantName: string;
  channelUrl: string;
  availableDates: string;
  proposedContentType: string;
  message: string;
};

export function ApplicationForm({
  campaignId,
  selectionDate,
  submissionDue,
  defaults
}: {
  campaignId: string;
  selectionDate: string;
  submissionDue: string;
  defaults: ApplicationDefaults;
}) {
  const [state, formAction, isPending] = useActionState(applyCampaign, emptyFormState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-8 space-y-6 rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <FormBanner>{state.formError}</FormBanner>

      <FormField
        name="applicant_name"
        label="신청자 이름"
        placeholder="김노원"
        defaultValue={state.values?.applicant_name ?? defaults.applicantName}
        error={fieldErrors.applicant_name}
      />
      <FormField
        name="channel_url"
        label="운영 채널 URL"
        placeholder="https://blog.naver.com/..."
        defaultValue={state.values?.channel_url ?? defaults.channelUrl}
        error={fieldErrors.channel_url}
      />

      <div>
        <ApplicationDatePicker
          minDate={selectionDate}
          maxDate={submissionDue}
          defaultValue={defaults.availableDates}
        />
        <FieldError>{fieldErrors.available_dates}</FieldError>
      </div>

      <label className="block">
        <FieldLabel>제작하려는 콘텐츠 형식</FieldLabel>
        <select
          name="proposed_content_type"
          defaultValue={state.values?.proposed_content_type ?? defaults.proposedContentType}
          className={fieldControlClassName(fieldErrors.proposed_content_type)}
        >
          <option>블로그</option>
          <option>인스타그램 피드</option>
          <option>릴스·쇼츠</option>
          <option>사진 콘텐츠</option>
          <option>인터뷰</option>
        </select>
        <FieldError>{fieldErrors.proposed_content_type}</FieldError>
      </label>

      <label className="block">
        <FieldLabel>신청 한마디</FieldLabel>
        <textarea
          name="message"
          defaultValue={state.values?.message ?? defaults.message}
          className={fieldControlClassName(fieldErrors.message, "min-h-32")}
          placeholder="캠페인 진행 방향이나 제안하고 싶은 콘텐츠 아이디어를 적어주세요."
        />
        <FieldError>{fieldErrors.message}</FieldError>
      </label>

      <div className="rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
        제공 사실 표시, 사전 합의된 콘텐츠 형식, 방문 일정 준수에 동의합니다. 긍정 표현 강요나 허위 경험 작성은 노원멤버스 원칙에 맞지 않습니다.
      </div>

      <button
        disabled={isPending}
        className="w-full rounded-xl bg-primary px-5 py-3 font-black text-white transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "신청하는 중..." : "신청 완료하기"}
      </button>
    </form>
  );
}
