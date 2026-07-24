"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  FileText,
  ImageIcon,
  Link2,
  MapPin,
  Phone,
  Sparkles,
  UserRound,
  Video
} from "lucide-react";
import { sendEmailVerification, sendPhoneVerification, verifyPhoneOtp } from "@/app/profile-verification-actions";
import { saveCreatorProfile } from "./actions";

export type CreatorProfileInitialData = {
  id?: string;
  nickname: string;
  email: string;
  name: string;
  phone: string;
  verification: {
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  activityAreas: string[];
  interests: string[];
  contentTypes: string[];
  availableDays: string[];
  bio: string;
  avatarUrl: string;
  channelPlatform: string;
  channelName: string;
  channelUrl: string;
  followerCount: string;
  averageViews: string;
  portfolioTitle: string;
  portfolioUrl: string;
};

type CreatorProfileWizardProps = {
  error?: string;
  message?: string;
  next?: string;
  initialProfile: CreatorProfileInitialData;
};

type CreatorProfileDraft = {
  name: string;
  phone: string;
  activity_areas: string[];
  interests: string[];
  content_types: string[];
  available_days: string[];
  bio: string;
  channel_platform: string;
  channel_name: string;
  channel_url: string;
  follower_count: string;
  average_views: string;
  portfolio_title: string;
  portfolio_url: string;
};

type ImagePreview = {
  url: string;
  name: string;
};

const steps = [
  {
    label: "기본 정보",
    title: "활동 성향을 알려주세요",
    description: "가입 닉네임은 그대로 사용하고, 캠페인 추천과 신청에 필요한 프로필을 완성합니다."
  },
  {
    label: "채널 정보",
    title: "대표 채널과 가능한 콘텐츠를 정리해주세요",
    description: "가게가 지원자를 검토할 때 가장 먼저 확인하는 정보입니다."
  },
  {
    label: "최종 검토",
    title: "저장 전 프로필을 확인해주세요",
    description: "저장한 정보는 캠페인 신청서 기본값과 대시보드에 사용됩니다."
  }
];

const districtOptions = ["공릉동", "월계동", "하계동", "중계동", "상계동"];
const interestOptions = ["맛집/카페", "뷰티", "동네산책", "문화/전시", "클래스", "쇼핑", "인터뷰", "숏폼"];
const contentTypeOptions = ["블로그", "인스타그램 피드", "릴스/쇼츠", "사진 콘텐츠", "인터뷰"];
const dayOptions = ["월", "화", "수", "목", "금", "토", "일"];
const channelPlatformOptions = ["네이버 블로그", "인스타그램", "유튜브", "틱톡", "기타"];
const creatorImageAccept = "image/jpeg,image/png,image/webp";
const maxCreatorImageBytes = 10 * 1024 * 1024;

function createInitialDraft(initialProfile: CreatorProfileInitialData): CreatorProfileDraft {
  return {
    name: initialProfile.name,
    phone: formatPhone(initialProfile.phone),
    activity_areas: initialProfile.activityAreas,
    interests: initialProfile.interests,
    content_types: initialProfile.contentTypes,
    available_days: initialProfile.availableDays,
    bio: initialProfile.bio,
    channel_platform: initialProfile.channelPlatform || channelPlatformOptions[0],
    channel_name: initialProfile.channelName,
    channel_url: initialProfile.channelUrl,
    follower_count: initialProfile.followerCount,
    average_views: initialProfile.averageViews,
    portfolio_title: initialProfile.portfolioTitle,
    portfolio_url: initialProfile.portfolioUrl
  };
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getImageValidationMessage(file: File) {
  if (!file.type.startsWith("image/") || !creatorImageAccept.split(",").includes(file.type)) {
    return "프로필 이미지는 JPG, PNG, WEBP 형식만 업로드할 수 있습니다.";
  }

  if (file.size > maxCreatorImageBytes) {
    return "프로필 이미지는 10MB 이하 파일만 업로드할 수 있습니다.";
  }

  return "";
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function numericInputValue(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function CreatorProfileWizard({
  error,
  message,
  next,
  initialProfile
}: CreatorProfileWizardProps) {
  if (initialProfile.id) {
    return <CreatorProfileEditForm error={error} message={message} next={next} initialProfile={initialProfile} />;
  }

  return <CreatorProfileCreateWizard error={error} message={message} next={next} initialProfile={initialProfile} />;
}

function CreatorProfileCreateWizard({
  error,
  next,
  initialProfile
}: CreatorProfileWizardProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => createInitialDraft(initialProfile));
  const [avatarPreview, setAvatarPreview] = useState<ImagePreview | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const storageKey = `creator-profile-wizard:${initialProfile.id ?? "new"}`;
  const displayAvatarUrl = avatarPreview?.url ?? initialProfile.avatarUrl;
  const mode = initialProfile.id ? "edit" : "create";
  const title = initialProfile.id ? "크리에이터 프로필 수정" : "크리에이터 프로필 등록";
  const submitLabel = initialProfile.id ? "프로필 저장하기" : "가입 완료하기";
  const availableDaysLabel = useMemo(() => draft.available_days.join(", "), [draft.available_days]);

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(storageKey);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft) as Partial<CreatorProfileDraft> & { step?: unknown };
        setDraft((current) => ({
          ...current,
          ...parsedDraft,
          activity_areas: Array.isArray(parsedDraft.activity_areas) ? parsedDraft.activity_areas.map(String).filter(Boolean) : current.activity_areas,
          interests: Array.isArray(parsedDraft.interests) ? parsedDraft.interests.map(String).filter(Boolean) : current.interests,
          content_types: Array.isArray(parsedDraft.content_types) ? parsedDraft.content_types.map(String).filter(Boolean) : current.content_types,
          available_days: Array.isArray(parsedDraft.available_days) ? parsedDraft.available_days.map(String).filter(Boolean) : current.available_days
        }));
        if (typeof parsedDraft.step === "number" && Number.isInteger(parsedDraft.step)) {
          setStep(Math.min(Math.max(parsedDraft.step, 0), steps.length - 1));
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setDraftLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!draftLoaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ ...draft, step }));
  }, [draft, draftLoaded, step, storageKey]);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview.url);
  }, [avatarPreview]);

  function updateDraftField(name: keyof CreatorProfileDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [name]: value
    }));
  }

  function updateDraftList(name: "activity_areas" | "interests" | "content_types" | "available_days", value: string) {
    setDraft((current) => ({
      ...current,
      [name]: toggleValue(current[name], value)
    }));
  }

  function setWeekdayPreset(type: "weekday" | "weekend") {
    setDraft((current) => ({
      ...current,
      available_days: type === "weekday" ? ["월", "화", "수", "목", "금"] : ["토", "일"]
    }));
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageError = getImageValidationMessage(file);
    if (imageError) {
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      setValidationMessage(imageError);
      return;
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview.url);
    setAvatarPreview({
      url: URL.createObjectURL(file),
      name: file.name
    });
    setValidationMessage(null);
  }

  function validateStep(stepIndex: number) {
    const requiredByStep = {
      0: [
        [draft.name.trim(), "이름을 입력해주세요."],
        [draft.phone.replace(/\D/g, "").length >= 10, "전화번호를 정확히 입력해주세요."],
        [draft.activity_areas.length, "활동 지역을 1개 이상 선택해주세요."],
        [draft.interests.length, "관심 분야를 1개 이상 선택해주세요."],
        [draft.bio.trim(), "자기소개를 입력해주세요."]
      ],
      1: [
        [draft.content_types.length, "콘텐츠 유형을 1개 이상 선택해주세요."],
        [draft.available_days.length, "가능 요일을 1개 이상 선택해주세요."],
        [draft.channel_url.trim(), "대표 채널 URL을 입력해주세요."]
      ],
      2: []
    } as const;

    const invalid = requiredByStep[stepIndex as 0 | 1 | 2].find(([value]) => !value);
    if (invalid) return invalid[1];

    if (stepIndex === 1 && draft.channel_url.trim() && !isValidUrl(draft.channel_url.trim())) {
      return "대표 채널 URL은 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다.";
    }

    if (stepIndex === 2 && draft.portfolio_url.trim() && !isValidUrl(draft.portfolio_url.trim())) {
      return "포트폴리오 URL은 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다.";
    }

    return "";
  }

  function handleNextStep() {
    const message = validateStep(step);
    if (message) {
      setValidationMessage(message);
      return;
    }

    setValidationMessage(null);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function handlePreviousStep() {
    setValidationMessage(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    for (let index = 0; index < steps.length; index += 1) {
      const message = validateStep(index);
      if (message) {
        event.preventDefault();
        setStep(index);
        setValidationMessage(message);
        return;
      }
    }
    window.localStorage.removeItem(storageKey);
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
          <UserRound size={14} />
          크리에이터 회원
        </div>
        <h1 className="mt-4 text-3xl font-black text-charcoal sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
          캠페인 신청과 선정 검토에 사용할 활동 프로필을 완성해주세요.
        </p>
      </div>

      <ol className="mb-8 grid gap-3 sm:grid-cols-3">
        {steps.map((item, index) => {
          const isActive = index === step;
          const isDone = index < step;

          return (
            <li
              key={item.label}
              className={`rounded-[20px] border p-4 transition-colors ${
                isActive
                  ? "border-primary bg-primary/10"
                  : isDone
                    ? "border-primary/20 bg-white"
                    : "border-slate-100 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                  isActive || isDone ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                }`}>
                  {isDone ? <Check size={16} strokeWidth={3} /> : index + 1}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-black ${isActive ? "text-primary" : "text-charcoal"}`}>{item.label}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.title}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {error ? <p className="mb-5 rounded-xl bg-primary/10 p-4 text-sm font-bold text-primary">{error}</p> : null}
      {validationMessage ? <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-700">{validationMessage}</p> : null}

      <form action={saveCreatorProfile} onSubmit={handleSubmit} className="space-y-8">
        <input type="hidden" name="next" value={next ?? ""} />
        <input type="hidden" name="profile_mode" value={mode} />
        <input type="hidden" name="activity_areas" value={draft.activity_areas.join(", ")} />
        <input type="hidden" name="interests" value={draft.interests.join(", ")} />
        <input type="hidden" name="content_types" value={draft.content_types.join(", ")} />
        <input type="hidden" name="available_days" value={draft.available_days.join(", ")} />

        <StepPanel active={step === 0}>
          <FormCard>
            <StepTitle step={steps[0]} />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-8">
                <div className="grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">
                  <label className="group flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50 text-center transition-colors hover:border-primary hover:bg-primary/5">
                    {displayAvatarUrl ? (
                      <span className="relative block h-full w-full">
                        <img src={displayAvatarUrl} alt="" className="h-full w-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-charcoal/80 px-3 py-2 text-xs font-bold text-white">
                          {avatarPreview?.name ?? "프로필 이미지 변경"}
                        </span>
                      </span>
                    ) : (
                      <span className="flex flex-col items-center px-4">
                        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Camera size={22} />
                        </span>
                        <span className="text-sm font-black text-charcoal">프로필 이미지</span>
                        <span className="mt-1 text-xs text-slate-500">선택 입력</span>
                      </span>
                    )}
                    <input ref={avatarInputRef} name="avatar_image" type="file" accept={creatorImageAccept} onChange={handleAvatarChange} className="sr-only" />
                  </label>

                  <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs font-bold text-slate-400">가입 계정</p>
                    <p className="mt-2 text-xl font-black text-charcoal">{initialProfile.nickname || initialProfile.email.split("@")[0] || "크리에이터"}</p>
                    <p className="mt-1 break-all text-sm font-bold text-slate-500">{initialProfile.email}</p>
                    <p className="mt-2 text-sm text-slate-500">닉네임과 이메일은 계정 설정에서 관리하며, 여기서는 활동 프로필에 필요한 연락 정보를 수정합니다.</p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField
                    name="name"
                    label="이름"
                    value={draft.name}
                    onChange={(value) => updateDraftField("name", value)}
                    placeholder="홍길동"
                    icon={<UserRound size={17} />}
                    requiredMark
                  />
                  <TextField
                    name="phone"
                    label="전화번호"
                    value={draft.phone}
                    onChange={(value) => updateDraftField("phone", formatPhone(value))}
                    placeholder="010-0000-0000"
                    icon={<Phone size={17} />}
                    type="tel"
                    requiredMark
                  />
                </div>

                <ChipGroup
                  label="활동 지역"
                  requiredMark
                  values={draft.activity_areas}
                  options={districtOptions}
                  onToggle={(value) => updateDraftList("activity_areas", value)}
                />
                <ChipGroup
                  label="관심 분야"
                  requiredMark
                  values={draft.interests}
                  options={interestOptions}
                  onToggle={(value) => updateDraftList("interests", value)}
                />
                <TextArea
                  name="bio"
                  label="자기소개"
                  value={draft.bio}
                  onChange={(value) => updateDraftField("bio", value)}
                  placeholder="노원에서 어떤 콘텐츠를 만들고 싶은지, 어떤 스타일의 리뷰를 잘 만드는지 적어주세요."
                  rows={6}
                  requiredMark
                />
              </div>

              <ProfilePreviewCard
                nickname={initialProfile.nickname}
                email={initialProfile.email}
                draft={draft}
                imageUrl={displayAvatarUrl}
                availableDaysLabel={availableDaysLabel}
              />
            </div>
          </FormCard>
        </StepPanel>

        <StepPanel active={step === 1}>
          <FormCard>
            <StepTitle step={steps[1]} />
            <ChipGroup
              label="콘텐츠 유형"
              requiredMark
              values={draft.content_types}
              options={contentTypeOptions}
              onToggle={(value) => updateDraftList("content_types", value)}
            />

            <Divider />

            <div>
              <FieldLabel>가능 요일 <Required /></FieldLabel>
              <div className="mb-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setWeekdayPreset("weekday")} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary">평일</button>
                <button type="button" onClick={() => setWeekdayPreset("weekend")} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary">주말</button>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {dayOptions.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => updateDraftList("available_days", day)}
                    className={`rounded-xl border px-3 py-3 text-sm font-black transition-colors ${
                      draft.available_days.includes(day)
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <Divider />

            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                name="channel_platform"
                label="채널 플랫폼"
                value={draft.channel_platform}
                onChange={(value) => updateDraftField("channel_platform", value)}
                options={channelPlatformOptions}
              />
              <TextField
                name="channel_name"
                label="채널명"
                value={draft.channel_name}
                onChange={(value) => updateDraftField("channel_name", value)}
                placeholder="@nowon_creator"
              />
              <TextField
                name="channel_url"
                label="대표 채널 URL"
                value={draft.channel_url}
                onChange={(value) => updateDraftField("channel_url", value)}
                placeholder="https://blog.naver.com/..."
                icon={<Link2 size={17} />}
                type="url"
                requiredMark
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  name="follower_count"
                  label="팔로워 수"
                  value={draft.follower_count}
                  onChange={(value) => updateDraftField("follower_count", numericInputValue(value))}
                  placeholder="1200"
                  type="text"
                />
                <TextField
                  name="average_views"
                  label="평균 조회수"
                  value={draft.average_views}
                  onChange={(value) => updateDraftField("average_views", numericInputValue(value))}
                  placeholder="800"
                  type="text"
                />
              </div>
            </div>
          </FormCard>
        </StepPanel>

        <StepPanel active={step === 2}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <FormCard>
              <StepTitle step={steps[2]} />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  name="portfolio_title"
                  label="포트폴리오 제목"
                  value={draft.portfolio_title}
                  onChange={(value) => updateDraftField("portfolio_title", value)}
                  placeholder="대표 콘텐츠 모음"
                  icon={<FileText size={17} />}
                />
                <TextField
                  name="portfolio_url"
                  label="포트폴리오 URL"
                  value={draft.portfolio_url}
                  onChange={(value) => updateDraftField("portfolio_url", value)}
                  placeholder="https://..."
                  icon={<Link2 size={17} />}
                  type="url"
                />
              </div>

              <Divider />

              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewItem label="닉네임" value={initialProfile.nickname || "미입력"} />
                <ReviewItem label="이름" value={draft.name} />
                <ReviewItem label="전화번호" value={draft.phone} />
                <ReviewItem label="활동 지역" value={draft.activity_areas.join(", ")} />
                <ReviewItem label="관심 분야" value={draft.interests.join(", ")} />
                <ReviewItem label="콘텐츠 유형" value={draft.content_types.join(", ")} />
                <ReviewItem label="가능 요일" value={availableDaysLabel} />
                <ReviewItem label="대표 채널" value={draft.channel_url} />
                <ReviewItem label="포트폴리오" value={draft.portfolio_url || "미입력"} />
                <ReviewItem label="자기소개" value={draft.bio} />
              </div>

              <label className="group mt-6 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                <input type="checkbox" name="final_agree" required className="sr-only" />
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-slate-300 bg-white transition-colors group-hover:border-primary group-has-[:checked]:border-primary group-has-[:checked]:bg-primary">
                  <Check size={13} className="text-white opacity-0 transition-opacity group-has-[:checked]:opacity-100" strokeWidth={3} />
                </span>
                입력한 크리에이터 프로필을 확인했으며, 위 내용으로 등록합니다.
              </label>
            </FormCard>

            <FormCard>
              <ProfilePreviewCard
                nickname={initialProfile.nickname}
                email={initialProfile.email}
                draft={draft}
                imageUrl={displayAvatarUrl}
                availableDaysLabel={availableDaysLabel}
                compact
              />
            </FormCard>
          </div>
        </StepPanel>

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <button
            type="button"
            onClick={handlePreviousStep}
            disabled={step === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-3.5 font-bold text-slate-600 transition-colors hover:bg-white hover:shadow-sm disabled:pointer-events-none disabled:text-slate-300 sm:w-auto"
          >
            <ArrowLeft size={16} />
            이전
          </button>
          {step === steps.length - 1 ? (
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-10 py-3.5 font-black text-white shadow-md shadow-primary/30 transition-colors hover:bg-primaryHover sm:w-auto">
              {submitLabel}
              <Check size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-10 py-3.5 font-black text-white shadow-md shadow-primary/30 transition-colors hover:bg-primaryHover sm:w-auto"
            >
              다음 단계로
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function CreatorProfileEditForm({
  error,
  message,
  next,
  initialProfile
}: CreatorProfileWizardProps) {
  const [draft, setDraft] = useState(() => createInitialDraft(initialProfile));
  const [avatarPreview, setAvatarPreview] = useState<ImagePreview | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const displayAvatarUrl = avatarPreview?.url ?? initialProfile.avatarUrl;
  const availableDaysLabel = useMemo(() => draft.available_days.join(", "), [draft.available_days]);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview.url);
  }, [avatarPreview]);

  function updateDraftField(name: keyof CreatorProfileDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [name]: value
    }));
  }

  function updateDraftList(name: "activity_areas" | "interests" | "content_types" | "available_days", value: string) {
    setDraft((current) => ({
      ...current,
      [name]: toggleValue(current[name], value)
    }));
  }

  function setWeekdayPreset(type: "weekday" | "weekend") {
    setDraft((current) => ({
      ...current,
      available_days: type === "weekday" ? ["월", "화", "수", "목", "금"] : ["토", "일"]
    }));
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageError = getImageValidationMessage(file);
    if (imageError) {
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      setValidationMessage(imageError);
      return;
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview.url);
    setAvatarPreview({
      url: URL.createObjectURL(file),
      name: file.name
    });
    setValidationMessage(null);
  }

  function validateEditForm() {
    if (!draft.name.trim()) return "이름을 입력해주세요.";
    if (draft.phone.replace(/\D/g, "").length < 10) return "전화번호를 정확히 입력해주세요.";
    if (!draft.activity_areas.length) return "활동 지역을 1개 이상 선택해주세요.";
    if (!draft.interests.length) return "관심 분야를 1개 이상 선택해주세요.";
    if (!draft.bio.trim()) return "자기소개를 입력해주세요.";
    if (!draft.content_types.length) return "콘텐츠 유형을 1개 이상 선택해주세요.";
    if (!draft.available_days.length) return "가능 요일을 1개 이상 선택해주세요.";
    if (!draft.channel_url.trim()) return "대표 채널 URL을 입력해주세요.";
    if (draft.channel_url.trim() && !isValidUrl(draft.channel_url.trim())) {
      return "대표 채널 URL은 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다.";
    }
    if (draft.portfolio_url.trim() && !isValidUrl(draft.portfolio_url.trim())) {
      return "포트폴리오 URL은 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다.";
    }

    return "";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    if (submitter?.dataset.skipProfileValidation === "true") return;

    const message = validateEditForm();
    if (!message) return;

    event.preventDefault();
    setValidationMessage(message);
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <UserRound size={14} />
            크리에이터 회원
          </div>
          <h1 className="mt-4 text-3xl font-black text-charcoal sm:text-4xl">크리에이터 프로필 수정</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            캠페인 신청과 선정 검토에 쓰이는 정보를 한 화면에서 수정합니다.
          </p>
        </div>
        <Link href="/creator/dashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition-colors hover:border-primary hover:text-primary">
          대시보드로 돌아가기
        </Link>
      </div>

      {error ? <p className="mb-5 rounded-xl bg-primary/10 p-4 text-sm font-bold text-primary">{error}</p> : null}
      {message ? <p className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p> : null}
      {validationMessage ? <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-700">{validationMessage}</p> : null}

      <form action={saveCreatorProfile} onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="next" value={next ?? ""} />
        <input type="hidden" name="profile_mode" value="edit" />
        <input type="hidden" name="activity_areas" value={draft.activity_areas.join(", ")} />
        <input type="hidden" name="interests" value={draft.interests.join(", ")} />
        <input type="hidden" name="content_types" value={draft.content_types.join(", ")} />
        <input type="hidden" name="available_days" value={draft.available_days.join(", ")} />

        <FormCard>
          <SectionHeading title="계정 정보" description="닉네임과 이메일은 읽기 전용이며, 이름과 전화번호만 수정할 수 있습니다." />
          <input type="hidden" name="verification_return_to" value="/creator/profile" />
          <div className="grid gap-5 sm:grid-cols-2">
            <ReadOnlyField label="닉네임" value={initialProfile.nickname || "미입력"} />
            <VerificationField
              type="email"
              label="이메일"
              value={initialProfile.email || "미입력"}
              verified={initialProfile.verification.emailVerified}
            />
            <TextField
              name="name"
              label="이름"
              value={draft.name}
              onChange={(value) => updateDraftField("name", value)}
              placeholder="홍길동"
              icon={<UserRound size={17} />}
              requiredMark
            />
            <div className="space-y-3">
              <TextField
                name="phone"
                label="전화번호"
                value={draft.phone}
                onChange={(value) => updateDraftField("phone", formatPhone(value))}
                placeholder="010-0000-0000"
                icon={<Phone size={17} />}
                type="tel"
                requiredMark
              />
              <PhoneVerificationControls verified={initialProfile.verification.phoneVerified} />
            </div>
          </div>
        </FormCard>

        <FormCard>
          <SectionHeading title="프로필 이미지와 소개" description="프로필 이미지는 선택 입력이고, 자기소개는 캠페인 지원자 검토에 표시됩니다." />
          <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
            <label className="group flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50 text-center transition-colors hover:border-primary hover:bg-primary/5">
              {displayAvatarUrl ? (
                <span className="relative block h-full w-full">
                  <img src={displayAvatarUrl} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-charcoal/80 px-3 py-2 text-xs font-bold text-white">
                    {avatarPreview?.name ?? "프로필 이미지 변경"}
                  </span>
                </span>
              ) : (
                <span className="flex flex-col items-center px-4">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Camera size={22} />
                  </span>
                  <span className="text-sm font-black text-charcoal">프로필 이미지</span>
                  <span className="mt-1 text-xs text-slate-500">선택 입력</span>
                </span>
              )}
              <input ref={avatarInputRef} name="avatar_image" type="file" accept={creatorImageAccept} onChange={handleAvatarChange} className="sr-only" />
            </label>
            <TextArea
              name="bio"
              label="자기소개"
              value={draft.bio}
              onChange={(value) => updateDraftField("bio", value)}
              placeholder="노원에서 어떤 콘텐츠를 만들고 싶은지, 어떤 스타일의 리뷰를 잘 만드는지 적어주세요."
              rows={7}
              requiredMark
            />
          </div>
        </FormCard>

        <FormCard>
          <SectionHeading title="활동 지역/관심 분야" description="캠페인 추천과 신청 가능 영역에 사용하는 정보입니다." />
          <div className="space-y-7">
            <ChipGroup label="활동 지역" requiredMark values={draft.activity_areas} options={districtOptions} onToggle={(value) => updateDraftList("activity_areas", value)} />
            <ChipGroup label="관심 분야" requiredMark values={draft.interests} options={interestOptions} onToggle={(value) => updateDraftList("interests", value)} />
          </div>
        </FormCard>

        <FormCard>
          <SectionHeading title="콘텐츠 유형/가능 요일" description="주로 제작 가능한 콘텐츠와 협업 가능 요일을 정리합니다." />
          <div className="space-y-7">
            <ChipGroup label="콘텐츠 유형" requiredMark values={draft.content_types} options={contentTypeOptions} onToggle={(value) => updateDraftList("content_types", value)} />
            <div>
              <FieldLabel>가능 요일 <Required /></FieldLabel>
              <div className="mb-3 flex gap-2">
                <button type="button" onClick={() => setWeekdayPreset("weekday")} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary">평일</button>
                <button type="button" onClick={() => setWeekdayPreset("weekend")} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary">주말</button>
              </div>
              <ChipGroup label="" values={draft.available_days} options={dayOptions} onToggle={(value) => updateDraftList("available_days", value)} />
              <p className="mt-3 text-xs font-bold text-slate-400">{availableDaysLabel || "가능 요일을 선택해주세요."}</p>
            </div>
          </div>
        </FormCard>

        <FormCard>
          <SectionHeading title="대표 채널" description="캠페인 신청서의 기본 채널 정보로 사용됩니다." />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField name="channel_platform" label="채널 플랫폼" value={draft.channel_platform} onChange={(value) => updateDraftField("channel_platform", value)} options={channelPlatformOptions} />
            <TextField name="channel_name" label="채널명" value={draft.channel_name} onChange={(value) => updateDraftField("channel_name", value)} placeholder="@nowon_creator" />
            <TextField name="channel_url" label="대표 채널 URL" value={draft.channel_url} onChange={(value) => updateDraftField("channel_url", value)} placeholder="https://blog.naver.com/..." icon={<Link2 size={17} />} type="url" requiredMark />
            <div className="grid grid-cols-2 gap-3">
              <TextField name="follower_count" label="팔로워 수" value={draft.follower_count} onChange={(value) => updateDraftField("follower_count", numericInputValue(value))} placeholder="1200" />
              <TextField name="average_views" label="평균 조회수" value={draft.average_views} onChange={(value) => updateDraftField("average_views", numericInputValue(value))} placeholder="800" />
            </div>
          </div>
        </FormCard>

        <FormCard>
          <SectionHeading title="포트폴리오" description="대표 콘텐츠 모음이 있다면 선택적으로 등록합니다." />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="portfolio_title" label="포트폴리오 제목" value={draft.portfolio_title} onChange={(value) => updateDraftField("portfolio_title", value)} placeholder="대표 콘텐츠 모음" icon={<FileText size={17} />} />
            <TextField name="portfolio_url" label="포트폴리오 URL" value={draft.portfolio_url} onChange={(value) => updateDraftField("portfolio_url", value)} placeholder="https://..." icon={<Link2 size={17} />} type="url" />
          </div>
        </FormCard>

        <div className="flex flex-col justify-end gap-3 sm:flex-row">
          <Link href="/creator/dashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary">
            취소
          </Link>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-10 py-3.5 font-black text-white shadow-md shadow-primary/30 transition-colors hover:bg-primaryHover">
            프로필 저장하기
            <Check size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}

function StepPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <div className={active ? "block" : "hidden"}>{children}</div>;
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="space-y-8 p-6 sm:space-y-10 sm:p-10">{children}</div>
    </div>
  );
}

function StepTitle({ step }: { step: (typeof steps)[number] }) {
  return (
    <div>
      <p className="text-sm font-black text-primary">{step.label}</p>
      <h2 className="mt-2 text-2xl font-black text-charcoal">{step.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{step.description}</p>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-black text-charcoal">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="min-h-[50px] rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-500">
        {value || "미입력"}
      </div>
    </div>
  );
}

function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black ${
      verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
    }`}>
      {verified ? "인증 완료" : "미인증"}
    </span>
  );
}

function VerificationField({
  label,
  value,
  verified,
  type
}: {
  label: string;
  value: string;
  verified: boolean;
  type: "email";
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="break-all text-sm font-bold text-slate-500">{value || "미입력"}</span>
          <VerificationBadge verified={verified} />
        </div>
        {!verified ? (
          <button
            type="submit"
            data-skip-profile-validation="true"
            formAction={type === "email" ? sendEmailVerification : undefined}
            className="mt-3 rounded-lg border border-primary/20 bg-white px-3 py-2 text-xs font-black text-primary transition-colors hover:bg-primary hover:text-white"
          >
            인증 메일 보내기
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PhoneVerificationControls({ verified }: { verified: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold text-slate-500">저장된 전화번호 기준으로 인증합니다.</p>
        <VerificationBadge verified={verified} />
      </div>
      {!verified ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          <button
            type="submit"
            data-skip-profile-validation="true"
            formAction={sendPhoneVerification}
            className="rounded-lg border border-primary/20 bg-white px-3 py-2 text-xs font-black text-primary transition-colors hover:bg-primary hover:text-white"
          >
            인증번호 받기
          </button>
          <input
            name="phone_otp"
            inputMode="numeric"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="인증번호 입력"
          />
          <button
            type="submit"
            data-skip-profile-validation="true"
            formAction={verifyPhoneOtp}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-black text-white transition-colors hover:bg-primaryHover"
          >
            확인
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-sm font-black text-charcoal">{children}</span>;
}

function Required() {
  return <span className="text-primary">*</span>;
}

function Divider() {
  return <hr className="border-slate-100" />;
}

function ChipGroup({
  label,
  values,
  options,
  onToggle,
  requiredMark = false
}: {
  label: string;
  values: string[];
  options: string[];
  onToggle: (value: string) => void;
  requiredMark?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label} {requiredMark ? <Required /> : null}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
              values.includes(option)
                ? "border-primary bg-primary text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextField({
  name,
  label,
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  requiredMark = false
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  requiredMark?: boolean;
}) {
  return (
    <label className="block">
      <FieldLabel>{label} {requiredMark ? <Required /> : null}</FieldLabel>
      <div className="relative">
        {icon ? <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">{icon}</span> : null}
        <input
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm text-charcoal outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary ${icon ? "pl-10" : ""}`}
          placeholder={placeholder}
          aria-required={requiredMark}
        />
      </div>
    </label>
  );
}

function SelectField({
  name,
  label,
  value,
  onChange,
  options
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const normalizedOptions = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-charcoal outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {normalizedOptions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  name,
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  requiredMark = false
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  requiredMark?: boolean;
}) {
  return (
    <label className="block">
      <FieldLabel>{label} {requiredMark ? <Required /> : null}</FieldLabel>
      <textarea
        name={name}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm leading-6 text-charcoal outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
        placeholder={placeholder}
        aria-required={requiredMark}
      />
    </label>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 line-clamp-3 text-sm font-black text-charcoal">{value || "미입력"}</p>
    </div>
  );
}

function ProfilePreviewCard({
  nickname,
  email,
  draft,
  imageUrl,
  availableDaysLabel,
  compact = false
}: {
  nickname: string;
  email: string;
  draft: CreatorProfileDraft;
  imageUrl: string;
  availableDaysLabel: string;
  compact?: boolean;
}) {
  const displayName = nickname || email.split("@")[0] || "크리에이터";

  return (
    <aside className={compact ? "" : "lg:pt-8"}>
      <div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm">
        <div className="bg-slate-50 p-6 text-center">
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-primary/10 text-primary">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon size={34} />
              </div>
            )}
          </div>
          <h3 className="mt-4 text-lg font-black text-charcoal">{displayName}</h3>
          <p className="mt-1 text-xs font-bold text-slate-400">{draft.channel_platform || "대표 채널"}</p>
        </div>
        <div className="space-y-4 p-5">
          <p className="line-clamp-3 text-sm leading-6 text-slate-600">{draft.bio || "자기소개"}</p>
          <div className="grid gap-2 text-sm text-slate-600">
            <span className="flex items-center gap-2"><MapPin size={16} className="text-primary" />{draft.activity_areas.join(", ") || "활동 지역"}</span>
            <span className="flex items-center gap-2"><Sparkles size={16} className="text-primary" />{draft.interests.join(", ") || "관심 분야"}</span>
            <span className="flex items-center gap-2"><Video size={16} className="text-primary" />{draft.content_types.join(", ") || "콘텐츠 유형"}</span>
            <span className="flex items-center gap-2"><Check size={16} className="text-primary" />{availableDaysLabel || "가능 요일"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
