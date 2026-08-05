"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert, Lock } from "lucide-react";
import { emptyFormState } from "@/lib/form-errors";
import { FieldError, FieldLabel, FormBanner, FormField, fieldControlClassName } from "@/app/components/form-field";
import {
  campaignBenefitTypeOptions,
  campaignCategoryOptions,
  campaignContentTypeOptions,
  campaignImageAccept,
  campaignMissionOptions
} from "@/lib/campaign-options";
import { formatPoints } from "@/lib/points";
import { updateCampaign } from "./actions";

export type CampaignEditValues = {
  id: string;
  status: string;
  adminMemo: string;
  category: string;
  title: string;
  campaignType: string;
  recruitCount: number;
  reservedPoints: number;
  region: string;
  regionDetail: string;
  latitude: string;
  longitude: string;
  recruitEnd: string;
  selectionDate: string;
  submissionDue: string;
  benefitType: string;
  benefitValue: string;
  fee: string;
  usageRights: string;
  description: string;
  missionOptions: string[];
  contentRequirements: string;
  keywords: string;
  coverImageUrl: string;
  beginnerFriendly: boolean;
};

export function CampaignEditForm({ campaign }: { campaign: CampaignEditValues }) {
  const [state, formAction, isPending] = useActionState(updateCampaign, emptyFormState);
  const fieldErrors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const isRevision = campaign.status === "revision_requested";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="campaign_id" value={campaign.id} />
      {/* 주소와 좌표는 이 화면에서 바꾸지 않는다. 값이 사라지지 않도록 그대로 넘긴다. */}
      <input type="hidden" name="region" value={campaign.region} />
      <input type="hidden" name="region_detail" value={campaign.regionDetail} />
      <input type="hidden" name="latitude" value={campaign.latitude} />
      <input type="hidden" name="longitude" value={campaign.longitude} />

      <FormBanner>{state.formError}</FormBanner>

      {campaign.adminMemo ? (
        <div className="flex items-start gap-3 rounded-[20px] border border-amber-200 bg-amber-50 p-5">
          <CircleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-black text-amber-800">운영자 수정 요청</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-amber-800">{campaign.adminMemo}</p>
          </div>
        </div>
      ) : null}

      <FormCard title="기본 정보">
        <label className="block">
          <FieldLabel required>캠페인 카테고리</FieldLabel>
          <select
            name="category"
            defaultValue={values.category ?? campaign.category}
            className={fieldControlClassName(fieldErrors.category, "bg-white")}
          >
            {campaignCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <FieldError>{fieldErrors.category}</FieldError>
        </label>

        <FormField
          name="title"
          label="캠페인 제목"
          required
          defaultValue={values.title ?? campaign.title}
          error={fieldErrors.title}
          placeholder="예: [노원/공릉] 감성 카페 디저트 세트 체험단"
        />

        <label className="block">
          <FieldLabel required>콘텐츠 유형</FieldLabel>
          <select
            name="campaign_type"
            defaultValue={values.campaign_type ?? campaign.campaignType}
            className={fieldControlClassName(fieldErrors.campaign_type, "bg-white")}
          >
            {campaignContentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <FieldError>{fieldErrors.campaign_type}</FieldError>
        </label>

        <LockedField
          label="모집 인원"
          value={`${campaign.recruitCount}명 · ${formatPoints(campaign.reservedPoints)} 예약`}
          note="예약한 포인트와 직결돼 수정할 수 없습니다. 인원을 바꾸려면 캠페인을 취소하고 다시 만들어주세요."
        />
        <LockedField
          label="캠페인 주소"
          value={[campaign.region, campaign.regionDetail].filter(Boolean).join(" ")}
          note="주소를 바꾸려면 캠페인을 취소하고 다시 만들어주세요."
        />
      </FormCard>

      <FormCard title="일정">
        <div className="grid gap-5 sm:grid-cols-3">
          <FormField
            name="recruit_end"
            label="모집 마감일"
            type="date"
            required
            defaultValue={values.recruit_end ?? campaign.recruitEnd}
            error={fieldErrors.recruit_end}
          />
          <FormField
            name="selection_date"
            label="선정 발표일"
            type="date"
            defaultValue={values.selection_date ?? campaign.selectionDate}
            error={fieldErrors.selection_date}
          />
          <FormField
            name="submission_due"
            label="콘텐츠 등록 마감일"
            type="date"
            defaultValue={values.submission_due ?? campaign.submissionDue}
            error={fieldErrors.submission_due}
          />
        </div>
      </FormCard>

      <FormCard title="제공 혜택">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>혜택 유형</FieldLabel>
            <select
              name="benefit_type"
              defaultValue={values.benefit_type ?? campaign.benefitType}
              className={fieldControlClassName(fieldErrors.benefit_type, "bg-white")}
            >
              {campaignBenefitTypeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <FieldError>{fieldErrors.benefit_type}</FieldError>
          </label>
          <FormField
            name="fee"
            label="활동비 또는 제작비"
            defaultValue={values.fee ?? campaign.fee}
            error={fieldErrors.fee}
            placeholder="선택 입력"
          />
        </div>
        <FormField
          name="benefit_value"
          label="제공 내역"
          required
          defaultValue={values.benefit_value ?? campaign.benefitValue}
          error={fieldErrors.benefit_value}
          placeholder="디저트 2종 + 음료 2잔 (약 22,000원 상당)"
        />
        <TextAreaField
          name="usage_rights"
          label="방문 및 사용 안내사항"
          rows={3}
          defaultValue={values.usage_rights ?? campaign.usageRights}
          error={fieldErrors.usage_rights}
          placeholder="예: 주말 방문 불가, 최소 2일 전 예약 필수"
        />
      </FormCard>

      <FormCard title="상세 내용과 미션">
        <TextAreaField
          name="description"
          label="캠페인 상세 설명"
          required
          rows={5}
          defaultValue={values.description ?? campaign.description}
          error={fieldErrors.description}
        />

        <div>
          <FieldLabel>콘텐츠 필수 조건</FieldLabel>
          <p className="mb-2 mt-1 text-xs leading-5 text-slate-500">크리에이터가 반드시 지켜야 할 조건입니다.</p>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {campaignMissionOptions.map((option) => (
              <label key={option} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3.5 text-sm text-charcoal transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="checkbox"
                  name="mission_options"
                  value={option}
                  defaultChecked={campaign.missionOptions.includes(option)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <FormField
          name="keywords"
          label="필수 키워드"
          helper="쉼표로 구분해 입력해주세요. 예: 공릉동맛집, 노원카페"
          defaultValue={values.keywords ?? campaign.keywords}
          error={fieldErrors.keywords}
        />

        <TextAreaField
          name="content_requirements"
          label="추가로 요청할 내용 (선택)"
          helper="위 조건만으로 부족한 부분이 있다면 적어주세요."
          rows={4}
          defaultValue={values.content_requirements ?? campaign.contentRequirements}
          error={fieldErrors.content_requirements}
        />
      </FormCard>

      <FormCard title="이미지">
        <div>
          <FieldLabel>대표 이미지</FieldLabel>
          {campaign.coverImageUrl ? (
            <img src={campaign.coverImageUrl} alt="" className="mb-3 aspect-video w-full max-w-md rounded-xl object-cover" />
          ) : null}
          <input
            name="cover_image"
            type="file"
            accept={campaignImageAccept}
            className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:font-bold file:text-primary"
          />
          <p className="mt-2 text-xs text-slate-500">새로 선택하지 않으면 기존 이미지가 유지됩니다.</p>
          <FieldError>{fieldErrors.cover_image}</FieldError>
        </div>

        <div>
          <FieldLabel>참고 사진</FieldLabel>
          <input
            name="reference_images"
            type="file"
            multiple
            accept={campaignImageAccept}
            className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:font-bold file:text-primary"
          />
          <p className="mt-2 text-xs text-slate-500">새로 선택하면 기존 참고 사진을 전부 대체합니다.</p>
          <FieldError>{fieldErrors.reference_images}</FieldError>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-bold text-charcoal">
          <input
            type="checkbox"
            name="beginner_friendly"
            defaultChecked={campaign.beginnerFriendly}
            className="h-4 w-4 accent-primary"
          />
          처음 참여하는 크리에이터도 지원할 수 있어요
        </label>
      </FormCard>

      <div className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="resubmit" defaultChecked className="mt-1 h-4 w-4 accent-primary" />
          <span className="text-sm leading-6 text-charcoal">
            <strong className="font-black">저장하고 검수를 다시 요청합니다.</strong>
            <br />
            <span className="text-gray-500">
              {isRevision
                ? "체크를 해제하면 저장만 하고 수정 요청 상태로 남습니다."
                : "체크를 해제하면 저장만 하고 초안으로 남습니다. 검수를 요청해야 공개 절차가 진행됩니다."}
              {campaign.reservedPoints > 0
                ? " 이미 예약한 포인트가 있어 다시 예약하지 않습니다."
                : " 검수를 요청하면 모집 인원만큼 포인트가 예약됩니다."}
            </span>
          </span>
        </label>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            disabled={isPending}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary px-6 py-3.5 font-black text-white transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "저장하는 중..." : "저장하기"}
          </button>
          <Link
            href={`/business/dashboard?campaign=${campaign.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3.5 font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary"
          >
            취소
          </Link>
        </div>
      </div>
    </form>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
      <h2 className="font-black text-charcoal">{title}</h2>
      {children}
    </section>
  );
}

function LockedField({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-500">
        <Lock size={14} className="shrink-0" />
        {value || "미입력"}
      </div>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function TextAreaField({
  name,
  label,
  rows = 3,
  required = false,
  defaultValue,
  placeholder,
  helper,
  error
}: {
  name: string;
  label: string;
  rows?: number;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  helper?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
      {helper ? <p className="mb-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
      <textarea
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={fieldControlClassName(error, "resize-y")}
      />
      <FieldError>{error}</FieldError>
    </label>
  );
}
