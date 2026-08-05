"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CircleAlert,
  Clock,
  Globe,
  ImageIcon,
  Link2,
  MapPin,
  Phone,
  Store,
  Tag,
  X
} from "lucide-react";
import { FieldError, FieldLabel, FormBanner, FormField, fieldControlClassName } from "@/app/components/form-field";
import { sendEmailVerification, sendPhoneVerification, verifyPhoneOtp } from "@/app/profile-verification-actions";
import type { BusinessDashboardData } from "@/lib/supabase/queries";

type InitialBusinessProfile = NonNullable<BusinessDashboardData["business"]>;

type BusinessProfileWizardProps = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  message?: string;
  next?: string;
  mode?: "create" | "edit";
  initialBusiness?: InitialBusinessProfile;
};

type BusinessProfileDraft = {
  business_name: string;
  manager_name: string;
  manager_phone: string;
  business_registration_number: string;
  category: string;
  district: string;
  short_intro: string;
  address: string;
  address_detail: string;
  latitude: string;
  longitude: string;
  contact: string;
  business_hours_preset: string;
  business_hours_custom: string;
  business_hours_open: string;
  business_hours_close: string;
  business_hours_note: string;
  website_url: string;
  social_urls: string[];
  description: string;
};

type ImagePreview = {
  url: string;
  name: string;
};

type AddressSearchResult = {
  address: string;
  jibunAddress?: string;
  roadAddress?: string;
  latitude: string;
  longitude: string;
};

const steps = [
  {
    label: "기본 정보",
    title: "가게를 먼저 소개해주세요",
    description: "캠페인 카드와 크리에이터 지원 화면에 노출되는 핵심 정보입니다."
  },
  {
    label: "운영 정보",
    title: "방문과 문의에 필요한 정보를 정리해주세요",
    description: "주소, 연락처, 운영시간은 캠페인 생성 전 필수로 확인합니다."
  },
  {
    label: "최종 검토",
    title: "저장 전 가게 정보를 확인해주세요",
    description: "저장 후 운영자 검수 상태로 등록되며, 캠페인 생성에 사용할 수 있습니다."
  }
];

const categoryOptions = [
  "맛집/카페",
  "뷰티/서비스",
  "피트니스/건강",
  "문화/체험",
  "교육/클래스",
  "생활/로컬서비스",
  "쇼핑/제품",
  "기타"
];

const districtOptions = ["공릉동", "월계동", "하계동", "중계동", "상계동"];

// 요일만 정한다. 시간은 가게마다 다르므로 아래 시간 입력에서 직접 고른다.
const businessHourPresets = [
  { value: "daily", label: "매일 운영", days: "매일" },
  { value: "weekday", label: "평일 운영", days: "월-금" },
  { value: "weekend", label: "주말 운영", days: "토-일" },
  { value: "reservation", label: "예약제", days: "" },
  { value: "custom", label: "직접 입력", days: "" }
];

const DEFAULT_OPEN_TIME = "10:00";
const DEFAULT_CLOSE_TIME = "21:00";

// 브라우저 기본 시간 선택기는 사파리·크롬마다 생김새가 다르고 색도 손댈 수 없다.
// 시와 분을 직접 고르게 해 사이트 안에서 같은 모양을 유지한다.
const hourOptions = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const minuteOptions = ["00", "10", "20", "30", "40", "50"];

function hourLabel(hour: string) {
  const value = Number(hour);
  if (value === 0) return "오전 12시";
  if (value < 12) return `오전 ${value}시`;
  if (value === 12) return "오후 12시";

  return `오후 ${value - 12}시`;
}

function splitTime(value: string) {
  const [hour = "", minute = ""] = value.split(":");
  return { hour, minute };
}

// "매일 10:00-21:00" 같은 기존 요약에서 시간을 되찾는다. 시간 필드가 없던 시절에
// 저장된 프로필을 수정할 때 입력칸이 비어 보이지 않게 한다.
function parseTimeRange(summary: string) {
  const matched = summary.match(/(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})/);
  if (!matched) return null;

  const pad = (time: string) => (time.length === 4 ? `0${time}` : time);
  return { open: pad(matched[1]), close: pad(matched[2]) };
}

const businessImageAccept = "image/jpeg,image/png,image/webp";
const maxBusinessImageBytes = 10 * 1024 * 1024;

function getDefaultBusinessHours(initial?: InitialBusinessProfile) {
  const initialPreset = initial?.businessHoursPreset;
  const initialSummary = initial?.businessHours ?? "";
  const matchedPreset = businessHourPresets.find((preset) => preset.value === initialPreset);
  const parsedTime = parseTimeRange(initialSummary);
  const openTime = initial?.businessHoursOpen || parsedTime?.open || DEFAULT_OPEN_TIME;
  const closeTime = initial?.businessHoursClose || parsedTime?.close || DEFAULT_CLOSE_TIME;

  if (matchedPreset && matchedPreset.value !== "custom") {
    return { preset: matchedPreset.value, custom: "", openTime, closeTime };
  }

  if (initialSummary) {
    return { preset: "custom", custom: initialSummary, openTime, closeTime };
  }

  return {
    preset: businessHourPresets[0]?.value ?? "daily",
    custom: "",
    openTime,
    closeTime
  };
}

function createInitialDraft(initial?: InitialBusinessProfile): BusinessProfileDraft {
  const businessHours = getDefaultBusinessHours(initial);

  return {
    business_name: initial?.businessName ?? "",
    manager_name: initial?.managerName ?? "",
    manager_phone: formatPhone(initial?.managerPhone ?? ""),
    business_registration_number: formatBusinessRegistrationNumber(initial?.businessRegistrationNumber ?? ""),
    category: initial?.category || categoryOptions[0],
    district: initial?.district ?? "",
    short_intro: initial?.shortIntro ?? "",
    address: initial?.address ?? "",
    address_detail: initial?.addressDetail ?? "",
    latitude: initial?.latitude === null || initial?.latitude === undefined ? "" : String(initial.latitude),
    longitude: initial?.longitude === null || initial?.longitude === undefined ? "" : String(initial.longitude),
    contact: formatContactNumber(initial?.contact ?? ""),
    business_hours_preset: businessHours.preset,
    business_hours_custom: businessHours.custom,
    business_hours_open: businessHours.openTime,
    business_hours_close: businessHours.closeTime,
    business_hours_note: initial?.businessHoursNote ?? "",
    website_url: initial?.websiteUrl ?? "",
    social_urls: initial?.socialUrls ?? [],
    description: initial?.description ?? ""
  };
}

// 자정을 넘겨 영업하는 가게는 '직접 입력'을 쓰게 안내한다. 시간 두 개만으로는
// 22:00-02:00 같은 경우를 표현할 수 없다.
function getClosingTimeError(draft: BusinessProfileDraft) {
  if (draft.business_hours_preset === "custom" || draft.business_hours_preset === "reservation") return "";
  if (!draft.business_hours_open || !draft.business_hours_close) return "여는 시간과 닫는 시간을 지정해주세요.";
  if (draft.business_hours_close <= draft.business_hours_open) {
    return "닫는 시간이 여는 시간보다 빨라요. 자정을 넘겨 영업한다면 '직접 입력'을 골라주세요.";
  }

  return "";
}

function getBusinessHoursSummary(draft: BusinessProfileDraft) {
  const preset = businessHourPresets.find((item) => item.value === draft.business_hours_preset);
  if (!preset || preset.value === "custom") return draft.business_hours_custom.trim();
  if (preset.value === "reservation") return "예약제로 운영";
  if (!draft.business_hours_open || !draft.business_hours_close) return "";

  return `${preset.days} ${draft.business_hours_open}-${draft.business_hours_close}`;
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
  if (!file.type.startsWith("image/") || !businessImageAccept.split(",").includes(file.type)) {
    return "대표 이미지는 JPG, PNG, WEBP 형식만 업로드할 수 있습니다.";
  }

  if (file.size > maxBusinessImageBytes) {
    return "대표 이미지는 10MB 이하 파일만 업로드할 수 있습니다.";
  }

  return "";
}

function splitSocialInput(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatContactNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatBusinessRegistrationNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function BusinessProfileWizard({
  action,
  error,
  message,
  next,
  mode = "create",
  initialBusiness
}: BusinessProfileWizardProps) {
  if (mode === "edit" && initialBusiness) {
    return <BusinessProfileEditForm action={action} error={error} message={message} next={next} initialBusiness={initialBusiness} />;
  }

  return <BusinessProfileCreateWizard action={action} error={error} message={message} next={next} mode={mode} initialBusiness={initialBusiness} />;
}

function BusinessProfileCreateWizard({
  action,
  error,
  message,
  next,
  mode = "create",
  initialBusiness
}: BusinessProfileWizardProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => createInitialDraft(initialBusiness));
  const [coverImagePreview, setCoverImagePreview] = useState<ImagePreview | null>(null);
  const [socialInput, setSocialInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draftLoaded, setDraftLoaded] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = mode === "edit";
  const draftIdentity = initialBusiness?.managerEmail || initialBusiness?.managerPhone || initialBusiness?.id || "anonymous";
  const draftStorageKey = `business-profile-wizard:${mode}:${draftIdentity}`;
  const businessHoursSummary = useMemo(() => getBusinessHoursSummary(draft), [draft]);
  const displayImageUrl = coverImagePreview?.url ?? initialBusiness?.coverImage ?? "";
  const title = isEditMode ? "가게 프로필 수정" : "가게 프로필 등록";
  const submitLabel = isEditMode ? "프로필 저장하기" : "가게 프로필 저장";

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(draftStorageKey);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft) as Partial<BusinessProfileDraft> & { step?: unknown };
        setDraft((current) => ({
          ...current,
          ...parsedDraft,
          business_name: current.business_name || parsedDraft.business_name || "",
          manager_name: current.manager_name || parsedDraft.manager_name || "",
          manager_phone: current.manager_phone || parsedDraft.manager_phone || "",
          business_registration_number: current.business_registration_number || parsedDraft.business_registration_number || "",
          social_urls: Array.isArray(parsedDraft.social_urls) ? parsedDraft.social_urls.map(String).filter(Boolean) : current.social_urls
        }));
        if (typeof parsedDraft.step === "number" && Number.isInteger(parsedDraft.step)) {
          setStep(Math.min(Math.max(parsedDraft.step, 0), steps.length - 1));
        }
      }
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    } finally {
      setDraftLoaded(true);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftLoaded) return;
    window.localStorage.setItem(draftStorageKey, JSON.stringify({ ...draft, step }));
  }, [draft, draftLoaded, draftStorageKey, step]);

  useEffect(() => () => {
    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview.url);
  }, [coverImagePreview]);

  function updateDraftField(name: keyof BusinessProfileDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [name]: value
    }));
  }

  function setSocialUrls(nextSocialUrls: string[]) {
    setDraft((current) => ({
      ...current,
      social_urls: nextSocialUrls
    }));
  }

  // 어떤 항목이 걸렸는지 필드 이름과 함께 모은다. 첫 항목에서 멈추지 않는다.
  function collectProfileErrors(stepIndex?: number) {
    const hasCoverImage = Boolean(coverImagePreview || initialBusiness?.coverImage);
    const stepZero: Record<string, string> = {
      cover_image: hasCoverImage ? "" : "대표 이미지를 등록해주세요.",
      business_name: draft.business_name.trim() ? "" : "가게명을 입력해주세요.",
      category: draft.category.trim() ? "" : "업종을 선택해주세요.",
      district: draft.district.trim() ? "" : "소재지를 선택해주세요.",
      short_intro: draft.short_intro.trim() ? "" : "한 줄 소개를 입력해주세요."
    };
    const stepOne: Record<string, string> = {
      address: !draft.address.trim()
        ? "주소를 입력해주세요."
        : !draft.latitude.trim() || !draft.longitude.trim()
          ? "주소 검색 결과에서 매장 위치를 선택해주세요."
          : "",
      contact: draft.contact.replace(/\D/g, "").length >= 8 ? "" : "매장 연락처를 정확히 입력해주세요.",
      manager_name: draft.manager_name.trim() ? "" : "담당자명을 입력해주세요.",
      manager_phone: draft.manager_phone.replace(/\D/g, "").length >= 10 ? "" : "담당자 전화번호를 정확히 입력해주세요.",
      business_registration_number:
        draft.business_registration_number.replace(/\D/g, "").length === 10 ? "" : "사업자등록번호를 정확히 입력해주세요.",
      business_hours_summary: businessHoursSummary ? "" : "영업시간을 입력해주세요.",
      business_hours_close: getClosingTimeError(draft),
      website_url:
        draft.website_url.trim() && !isValidUrl(draft.website_url.trim())
          ? "웹사이트는 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다."
          : ""
    };

    const source = stepIndex === 0 ? stepZero : stepIndex === 1 ? stepOne : stepIndex === 2 ? {} : { ...stepZero, ...stepOne };

    return Object.fromEntries(Object.entries(source).filter(([, message]) => message));
  }

  function validateStep(stepIndex: number) {
    return collectProfileErrors(stepIndex);
  }


  function handleCoverImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageError = getImageValidationMessage(file);
    if (imageError) {
      if (coverInputRef.current) coverInputRef.current.value = "";
      setFieldErrors((current) => ({ ...current, cover_image: imageError }));
      return;
    }

    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview.url);
    setCoverImagePreview({
      url: URL.createObjectURL(file),
      name: file.name
    });
    setFieldErrors((current) => ({ ...current, cover_image: "" }));
  }

  function addSocialUrls(rawValue: string) {
    const nextUrls = splitSocialInput(rawValue);
    if (!nextUrls.length) return;

    const invalidUrl = nextUrls.find((url) => !isValidUrl(url));
    if (invalidUrl) {
      setFieldErrors((current) => ({
        ...current,
        social_urls: "SNS URL은 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다."
      }));
      return;
    }

    setSocialUrls(Array.from(new Set([...draft.social_urls, ...nextUrls])));
    setSocialInput("");
    setFieldErrors((current) => ({ ...current, social_urls: "" }));
  }

  function handleSocialKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addSocialUrls(socialInput);
  }

  function handleSocialPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!/[\n,]/.test(text)) return;

    event.preventDefault();
    addSocialUrls(text);
  }

  function removeSocialUrl(url: string) {
    setSocialUrls(draft.social_urls.filter((item) => item !== url));
  }

  function focusFirstError(errors: Record<string, string>) {
    const [firstName] = Object.keys(errors);
    if (!firstName) return;

    const control = document.querySelector<HTMLElement>(`[name="${firstName}"]`);
    control?.focus();
    control?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function handleNextStep() {
    const errors = validateStep(step);
    setFieldErrors(errors);

    if (Object.keys(errors).length) {
      focusFirstError(errors);
      return;
    }

    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function handlePreviousStep() {
    setFieldErrors({});
    setStep((current) => Math.max(current - 1, 0));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    for (let index = 0; index < steps.length; index += 1) {
      const errors = validateStep(index);
      if (Object.keys(errors).length) {
        event.preventDefault();
        setStep(index);
        setFieldErrors(errors);
        window.requestAnimationFrame(() => focusFirstError(errors));
        return;
      }
    }
    window.localStorage.removeItem(draftStorageKey);
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
          <Building2 size={14} />
          사업자 회원
        </div>
        <h1 className="mt-4 text-3xl font-black text-charcoal sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
          캠페인 생성 전 크리에이터에게 보여질 가게 정보를 완성해주세요.
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

      {error ? <div className="mb-5"><FormBanner>{error}</FormBanner></div> : null}
      {message ? <p className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p> : null}

      <form action={action} onSubmit={handleSubmit} className="space-y-8">
        <input type="hidden" name="next" value={next ?? ""} />
        <input type="hidden" name="profile_mode" value={mode} />
        <input type="hidden" name="business_hours_summary" value={businessHoursSummary} />
        <input type="hidden" name="business_hours_preset" value={draft.business_hours_preset} />
        <input type="hidden" name="business_hours_open_value" value={draft.business_hours_open} />
        <input type="hidden" name="business_hours_close_value" value={draft.business_hours_close} />
        <input type="hidden" name="social_urls" value={draft.social_urls.join(", ")} />

        <StepPanel active={step === 0}>
          <FormCard>
            <StepTitle step={steps[0]} />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <div>
                  <FieldLabel>대표 이미지 <Required /></FieldLabel>
                  <label className={`group flex cursor-pointer justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors hover:border-primary hover:bg-primary/5 ${
                    displayImageUrl ? "aspect-[16/10] border-primary bg-slate-100 p-0" : "border-slate-300 bg-slate-50 px-6 py-10"
                  }`}>
                    {displayImageUrl ? (
                      <span className="relative block h-full w-full">
                        <img src={displayImageUrl} alt="" className="h-full w-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-charcoal/80 px-4 py-3 text-sm font-bold text-white">
                          <span className="truncate">{coverImagePreview?.name ?? "등록된 대표 이미지"}</span>
                          <span className="shrink-0 rounded-lg bg-white/15 px-3 py-1">변경</span>
                        </span>
                      </span>
                    ) : (
                      <span className="flex flex-col items-center text-center">
                        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Camera size={24} />
                        </span>
                        <span className="text-sm font-black text-charcoal">대표 이미지 등록</span>
                        <span className="mt-2 text-xs text-slate-500">JPG, PNG, WEBP · 최대 10MB</span>
                      </span>
                    )}
                    <input ref={coverInputRef} name="cover_image" type="file" accept={businessImageAccept} onChange={handleCoverImageChange} className="sr-only" />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    name="business_name"
                    label="가게명"
                    value={draft.business_name}
                    onChange={(value) => updateDraftField("business_name", value)}
                    placeholder="카페 오디너리"
                    icon={<Store size={17} />}
                    requiredMark
                    error={fieldErrors.business_name}
                  />
                  <SelectField
                    name="category"
                    label="업종"
                    value={draft.category}
                    onChange={(value) => updateDraftField("category", value)}
                    options={categoryOptions}
                    requiredMark
                    error={fieldErrors.category}
                  />
                </div>

                <div>
                  <TextField
                    name="district"
                    label="소재지"
                    value={draft.district}
                    onChange={(value) => updateDraftField("district", value)}
                    placeholder="공릉동"
                    icon={<MapPin size={17} />}
                    requiredMark
                    error={fieldErrors.district}
                  />
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {districtOptions.map((district) => (
                      <button
                        key={district}
                        type="button"
                        onClick={() => updateDraftField("district", district)}
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                          draft.district === district
                            ? "border-primary bg-primary text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
                        }`}
                      >
                        {district}
                      </button>
                    ))}
                  </div>
                </div>

                <TextField
                  name="short_intro"
                  label="한 줄 소개"
                  value={draft.short_intro}
                  onChange={(value) => updateDraftField("short_intro", value)}
                  placeholder="공릉동 골목의 계절 디저트와 스페셜티 커피"
                  requiredMark
                    error={fieldErrors.short_intro}
                  />
              </div>

              <ProfilePreviewCard draft={draft} businessHoursSummary={businessHoursSummary} imageUrl={displayImageUrl} />
            </div>
          </FormCard>
        </StepPanel>

        <StepPanel active={step === 1}>
          <FormCard>
            <StepTitle step={steps[1]} />
            <div className="grid gap-5 sm:grid-cols-2">
              <BusinessAddressField
                value={draft.address}
                detailValue={draft.address_detail}
                latitude={draft.latitude}
                longitude={draft.longitude}
                onChange={(address, addressDetail, latitude, longitude) => {
                  updateDraftField("address", address);
                  updateDraftField("address_detail", addressDetail);
                  updateDraftField("latitude", latitude);
                  updateDraftField("longitude", longitude);
                }}
              />
              <TextField
                name="contact"
                label="매장 연락처"
                value={draft.contact}
                onChange={(value) => updateDraftField("contact", formatContactNumber(value))}
                placeholder="02-000-0000"
                icon={<Phone size={17} />}
                requiredMark
                    error={fieldErrors.contact}
                  />
            </div>

            <Divider />

            <div>
              <FieldLabel>운영자 계정 정보 <Required /></FieldLabel>
              <div className="grid gap-5 sm:grid-cols-3">
                <TextField
                  name="manager_name"
                  label="담당자명"
                  value={draft.manager_name}
                  onChange={(value) => updateDraftField("manager_name", value)}
                  placeholder="홍길동"
                  requiredMark
                    error={fieldErrors.manager_name}
                  />
                <TextField
                  name="manager_phone"
                  label="담당자 전화번호"
                  value={draft.manager_phone}
                  onChange={(value) => updateDraftField("manager_phone", formatPhone(value))}
                  placeholder="010-0000-0000"
                  icon={<Phone size={17} />}
                  type="tel"
                  requiredMark
                    error={fieldErrors.manager_phone}
                  />
                <TextField
                  name="business_registration_number"
                  label="사업자등록번호"
                  value={draft.business_registration_number}
                  onChange={(value) => updateDraftField("business_registration_number", formatBusinessRegistrationNumber(value))}
                  placeholder="000-00-00000"
                  requiredMark
                    error={fieldErrors.business_registration_number}
                  />
              </div>
              {initialBusiness?.referralCode ? (
                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold text-slate-400">추천코드</p>
                  <p className="mt-1 text-sm font-black text-charcoal">{initialBusiness.referralCode}</p>
                </div>
              ) : null}
            </div>

            <Divider />

            <div>
              <FieldLabel>영업 요일 <Required /></FieldLabel>
              <BusinessHoursFields draft={draft} updateDraftField={updateDraftField} fieldErrors={fieldErrors} />
            </div>

            <Divider />

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                name="website_url"
                label="웹사이트"
                value={draft.website_url}
                onChange={(value) => updateDraftField("website_url", value)}
                placeholder="https://nowon.example.com"
                icon={<Globe size={17} />}
                type="url"
                    error={fieldErrors.website_url}
                  />
              <div>
                <FieldLabel>SNS 링크</FieldLabel>
                <div className="flex rounded-xl border border-slate-200 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                  <span className="flex items-center pl-4 text-slate-400">
                    <Link2 size={17} />
                  </span>
                  <input
                    value={socialInput}
                    onChange={(event) => setSocialInput(event.target.value)}
                    onKeyDown={handleSocialKeyDown}
                    onPaste={handleSocialPaste}
                    className="min-w-0 flex-1 rounded-xl px-3 py-3.5 text-sm text-charcoal outline-none placeholder:text-slate-400"
                    placeholder="https://instagram.com/nowon"
                  />
                  <button
                    type="button"
                    onClick={() => addSocialUrls(socialInput)}
                    className="m-1.5 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-600 transition-colors hover:bg-primary hover:text-white"
                  >
                    추가
                  </button>
                </div>
                {draft.social_urls.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {draft.social_urls.map((url) => (
                      <span key={url} className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                        <span className="truncate">{url}</span>
                        <button type="button" onClick={() => removeSocialUrl(url)} className="shrink-0 rounded-full p-0.5 hover:bg-primary/15" aria-label={`${url} 삭제`}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </FormCard>
        </StepPanel>

        <StepPanel active={step === 2}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <FormCard>
              <StepTitle step={steps[2]} />
              <TextArea
                name="description"
                label="가게 소개"
                value={draft.description}
                onChange={(value) => updateDraftField("description", value)}
                placeholder="가게의 이야기와 크리에이터와 협업하고 싶은 콘텐츠 방향을 적어주세요."
                rows={7}
              />

              <Divider />

              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewItem label="가게명" value={draft.business_name} />
                <ReviewItem label="업종" value={draft.category} />
                <ReviewItem label="소재지" value={draft.district} />
                <ReviewItem label="주소" value={draft.address} />
                <ReviewItem label="상세 주소" value={draft.address_detail || "입력 없음"} />
                <ReviewItem label="매장 연락처" value={draft.contact} />
                <ReviewItem label="담당자명" value={draft.manager_name} />
                <ReviewItem label="담당자 전화번호" value={draft.manager_phone} />
                <ReviewItem label="사업자등록번호" value={draft.business_registration_number} />
                <ReviewItem label="영업시간" value={businessHoursSummary} />
                <ReviewItem label="웹사이트" value={draft.website_url || "미입력"} />
                <ReviewItem label="SNS 링크" value={draft.social_urls.length ? `${draft.social_urls.length}개 등록` : "미입력"} />
              </div>

              <label className="group mt-6 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                <input type="checkbox" name="final_agree" required className="sr-only" />
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-slate-300 bg-white transition-colors group-hover:border-primary group-has-[:checked]:border-primary group-has-[:checked]:bg-primary">
                  <Check size={13} className="text-white opacity-0 transition-opacity group-has-[:checked]:opacity-100" strokeWidth={3} />
                </span>
                입력한 가게정보를 확인했으며, 위 내용으로 등록합니다.
              </label>
            </FormCard>

            <FormCard>
              <ProfilePreviewCard draft={draft} businessHoursSummary={businessHoursSummary} imageUrl={displayImageUrl} compact />
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

function BusinessProfileEditForm({
  action,
  error,
  message,
  next,
  initialBusiness
}: {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  message?: string;
  next?: string;
  initialBusiness: InitialBusinessProfile;
}) {
  const [draft, setDraft] = useState(() => createInitialDraft(initialBusiness));
  const [coverImagePreview, setCoverImagePreview] = useState<ImagePreview | null>(null);
  const [socialInput, setSocialInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const coverInputRef = useRef<HTMLInputElement>(null);
  const businessHoursSummary = useMemo(() => getBusinessHoursSummary(draft), [draft]);
  const displayImageUrl = coverImagePreview?.url ?? initialBusiness.coverImage ?? "";

  useEffect(() => () => {
    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview.url);
  }, [coverImagePreview]);

  function updateDraftField(name: keyof BusinessProfileDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [name]: value
    }));
  }

  function setSocialUrls(nextSocialUrls: string[]) {
    setDraft((current) => ({
      ...current,
      social_urls: nextSocialUrls
    }));
  }

  function handleCoverImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageError = getImageValidationMessage(file);
    if (imageError) {
      if (coverInputRef.current) coverInputRef.current.value = "";
      setFieldErrors((current) => ({ ...current, cover_image: imageError }));
      return;
    }

    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview.url);
    setCoverImagePreview({
      url: URL.createObjectURL(file),
      name: file.name
    });
    setFieldErrors((current) => ({ ...current, cover_image: "" }));
  }

  function addSocialUrls(rawValue: string) {
    const nextUrls = splitSocialInput(rawValue);
    if (!nextUrls.length) return;

    const invalidUrl = nextUrls.find((url) => !isValidUrl(url));
    if (invalidUrl) {
      setFieldErrors((current) => ({
        ...current,
        social_urls: "SNS URL은 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다."
      }));
      return;
    }

    setSocialUrls(Array.from(new Set([...draft.social_urls, ...nextUrls])));
    setSocialInput("");
    setFieldErrors((current) => ({ ...current, social_urls: "" }));
  }

  function handleSocialKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addSocialUrls(socialInput);
  }

  function handleSocialPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!/[\n,]/.test(text)) return;

    event.preventDefault();
    addSocialUrls(text);
  }

  function removeSocialUrl(url: string) {
    setSocialUrls(draft.social_urls.filter((item) => item !== url));
  }

  function collectEditErrors() {
    const errors: Record<string, string> = {
      cover_image: displayImageUrl ? "" : "대표 이미지를 등록해주세요.",
      business_name: draft.business_name.trim() ? "" : "가게명을 입력해주세요.",
      category: draft.category.trim() ? "" : "업종을 선택해주세요.",
      district: draft.district.trim() ? "" : "소재지를 선택해주세요.",
      short_intro: draft.short_intro.trim() ? "" : "한 줄 소개를 입력해주세요.",
      address: !draft.address.trim()
        ? "주소를 입력해주세요."
        : !draft.latitude.trim() || !draft.longitude.trim()
          ? "주소 검색 결과에서 매장 위치를 선택해주세요."
          : "",
      contact: draft.contact.replace(/\D/g, "").length >= 8 ? "" : "매장 연락처를 정확히 입력해주세요.",
      manager_name: draft.manager_name.trim() ? "" : "담당자명을 입력해주세요.",
      manager_phone: draft.manager_phone.replace(/\D/g, "").length >= 10 ? "" : "담당자 전화번호를 정확히 입력해주세요.",
      business_registration_number:
        draft.business_registration_number.replace(/\D/g, "").length === 10 ? "" : "사업자등록번호를 정확히 입력해주세요.",
      business_hours_summary: businessHoursSummary ? "" : "영업시간을 입력해주세요.",
      business_hours_close: getClosingTimeError(draft),
      website_url:
        draft.website_url.trim() && !isValidUrl(draft.website_url.trim())
          ? "웹사이트는 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다."
          : ""
    };

    return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
  }


  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    if (submitter?.dataset.skipProfileValidation === "true") return;

    const errors = collectEditErrors();
    if (!Object.keys(errors).length) return;

    event.preventDefault();
    setFieldErrors(errors);

    const [firstName] = Object.keys(errors);
    const control = document.querySelector<HTMLElement>(`[name="${firstName}"]`);
    control?.focus();
    control?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  return (
    <section className="w-full">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <Building2 size={14} />
            사업자 회원
          </div>
          <h1 className="mt-4 text-3xl font-black text-charcoal sm:text-4xl">가게 프로필 수정</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            캠페인 운영과 공개 노출에 쓰이는 가게 정보를 한 화면에서 수정합니다.
          </p>
        </div>
        <Link href="/business/dashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition-colors hover:border-primary hover:text-primary">
          대시보드로 돌아가기
        </Link>
      </div>

      {error ? <div className="mb-5"><FormBanner>{error}</FormBanner></div> : null}
      {message ? <p className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p> : null}

      <form action={action} onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="next" value={next ?? ""} />
        <input type="hidden" name="profile_mode" value="edit" />
        <input type="hidden" name="business_hours_summary" value={businessHoursSummary} />
        <input type="hidden" name="business_hours_preset" value={draft.business_hours_preset} />
        <input type="hidden" name="business_hours_open_value" value={draft.business_hours_open} />
        <input type="hidden" name="business_hours_close_value" value={draft.business_hours_close} />
        <input type="hidden" name="social_urls" value={draft.social_urls.join(", ")} />
        <input type="hidden" name="verification_return_to" value="/business/dashboard?profile=edit" />

        <FormCard>
          <SectionHeading title="가게 기본 정보" description="가게명은 운영자 계정의 상호와 함께 동기화됩니다." />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="business_name" label="가게명/상호" value={draft.business_name} onChange={(value) => updateDraftField("business_name", value)} placeholder="카페 오디너리" icon={<Store size={17} />} requiredMark
                    error={fieldErrors.business_name}
                  />
            <SelectField name="category" label="업종" value={draft.category} onChange={(value) => updateDraftField("category", value)} options={categoryOptions} requiredMark
                    error={fieldErrors.category}
                  />
            <div>
              <TextField name="district" label="소재지" value={draft.district} onChange={(value) => updateDraftField("district", value)} placeholder="공릉동" icon={<MapPin size={17} />} requiredMark
                    error={fieldErrors.district}
                  />
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {districtOptions.map((district) => (
                  <button
                    key={district}
                    type="button"
                    onClick={() => updateDraftField("district", district)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                      draft.district === district
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {district}
                  </button>
                ))}
              </div>
            </div>
            <TextField name="short_intro" label="한 줄 소개" value={draft.short_intro} onChange={(value) => updateDraftField("short_intro", value)} placeholder="공릉동 골목의 계절 디저트와 스페셜티 커피" requiredMark
                    error={fieldErrors.short_intro}
                  />
          </div>
        </FormCard>

        <FormCard>
          <SectionHeading title="대표 이미지" description="캠페인 생성과 가게 프로필에 표시되는 이미지입니다." />
          <label className={`group flex cursor-pointer justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors hover:border-primary hover:bg-primary/5 ${
            displayImageUrl ? "aspect-[16/8] border-primary bg-slate-100 p-0" : "border-slate-300 bg-slate-50 px-6 py-10"
          }`}>
            {displayImageUrl ? (
              <span className="relative block h-full w-full">
                <img src={displayImageUrl} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-charcoal/80 px-4 py-3 text-sm font-bold text-white">
                  <span className="truncate">{coverImagePreview?.name ?? "등록된 대표 이미지"}</span>
                  <span className="shrink-0 rounded-lg bg-white/15 px-3 py-1">변경</span>
                </span>
              </span>
            ) : (
              <span className="flex flex-col items-center text-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Camera size={24} />
                </span>
                <span className="text-sm font-black text-charcoal">대표 이미지 등록</span>
                <span className="mt-2 text-xs text-slate-500">JPG, PNG, WEBP · 최대 10MB</span>
              </span>
            )}
            <input ref={coverInputRef} name="cover_image" type="file" accept={businessImageAccept} onChange={handleCoverImageChange} className="sr-only" />
          </label>
        </FormCard>

        <FormCard>
          <SectionHeading title="주소와 매장 연락처" description="크리에이터가 방문과 문의에 참고하는 공개 정보입니다." />
          <div className="grid gap-5 sm:grid-cols-2">
            <BusinessAddressField
              value={draft.address}
              detailValue={draft.address_detail}
              latitude={draft.latitude}
              longitude={draft.longitude}
              onChange={(address, addressDetail, latitude, longitude) => {
                updateDraftField("address", address);
                updateDraftField("address_detail", addressDetail);
                updateDraftField("latitude", latitude);
                updateDraftField("longitude", longitude);
              }}
            />
            <TextField name="contact" label="매장 연락처" value={draft.contact} onChange={(value) => updateDraftField("contact", formatContactNumber(value))} placeholder="02-000-0000" icon={<Phone size={17} />} requiredMark
                    error={fieldErrors.contact}
                  />
          </div>
        </FormCard>

        <FormCard>
          <SectionHeading title="운영자 계정 정보" description="운영자 본인 확인과 계정 관리에 사용하는 정보입니다." />
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField name="manager_name" label="담당자명" value={draft.manager_name} onChange={(value) => updateDraftField("manager_name", value)} placeholder="홍길동" requiredMark
                    error={fieldErrors.manager_name}
                  />
            <div className="space-y-3">
              <TextField name="manager_phone" label="담당자 전화번호" value={draft.manager_phone} onChange={(value) => updateDraftField("manager_phone", formatPhone(value))} placeholder="010-0000-0000" icon={<Phone size={17} />} type="tel" requiredMark
                    error={fieldErrors.manager_phone}
                  />
              <PhoneVerificationControls verified={initialBusiness.verification.phoneVerified} />
            </div>
            <TextField name="business_registration_number" label="사업자등록번호" value={draft.business_registration_number} onChange={(value) => updateDraftField("business_registration_number", formatBusinessRegistrationNumber(value))} placeholder="000-00-00000" requiredMark
                    error={fieldErrors.business_registration_number}
                  />
          </div>
          <div className="mt-5">
            <VerificationField
              label="계정 이메일"
              value={initialBusiness.managerEmail || "미입력"}
              verified={initialBusiness.verification.emailVerified}
            />
          </div>
          {initialBusiness.referralCode ? (
            <div className="mt-5">
              <ReadOnlyField label="추천코드" value={initialBusiness.referralCode} />
            </div>
          ) : null}
        </FormCard>

        <FormCard>
          <SectionHeading title="영업시간" description="운영하는 요일을 고르고 여는 시간과 닫는 시간을 지정합니다." />
          <BusinessHoursFields draft={draft} updateDraftField={updateDraftField} fieldErrors={fieldErrors} />
        </FormCard>

        <FormCard>
          <SectionHeading title="웹/SNS" description="공개 채널이 있다면 선택적으로 추가합니다." />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField name="website_url" label="웹사이트" value={draft.website_url} onChange={(value) => updateDraftField("website_url", value)} placeholder="https://nowon.example.com" icon={<Globe size={17} />} type="url"
                    error={fieldErrors.website_url}
                  />
            <div>
              <FieldLabel>SNS 링크</FieldLabel>
              <div className="flex rounded-xl border border-slate-200 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <span className="flex items-center pl-4 text-slate-400"><Link2 size={17} /></span>
                <input value={socialInput} onChange={(event) => setSocialInput(event.target.value)} onKeyDown={handleSocialKeyDown} onPaste={handleSocialPaste} className="min-w-0 flex-1 rounded-xl px-3 py-3.5 text-sm text-charcoal outline-none placeholder:text-slate-400" placeholder="https://instagram.com/nowon" />
                <button type="button" onClick={() => addSocialUrls(socialInput)} className="m-1.5 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-600 transition-colors hover:bg-primary hover:text-white">추가</button>
              </div>
              {draft.social_urls.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.social_urls.map((url) => (
                    <span key={url} className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                      <span className="truncate">{url}</span>
                      <button type="button" onClick={() => removeSocialUrl(url)} className="shrink-0 rounded-full p-0.5 hover:bg-primary/15" aria-label={`${url} 삭제`}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </FormCard>

        <FormCard>
          <SectionHeading title="가게 소개" description="가게의 이야기와 협업 방향을 자유롭게 적어주세요." />
          <TextArea name="description" label="가게 소개" value={draft.description} onChange={(value) => updateDraftField("description", value)} placeholder="가게의 이야기와 크리에이터와 협업하고 싶은 콘텐츠 방향을 적어주세요." rows={7} />
        </FormCard>

        <div className="flex flex-col justify-end gap-3 sm:flex-row">
          <Link href="/business/dashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary">
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

function TimeSelect({
  label,
  value,
  error,
  onChange
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const { hour, minute } = splitTime(value);
  // 예전에 저장된 09:25 같은 값도 그대로 보여준다. 목록에 없다고 비워버리면
  // 사용자가 손대지도 않은 시간이 바뀐다.
  const minutes = minute && !minuteOptions.includes(minute)
    ? [...minuteOptions, minute].sort()
    : minuteOptions;
  const selectClassName = `${fieldControlClassName(error, "bg-white font-bold")} appearance-none bg-[length:14px] bg-[right_0.85rem_center] bg-no-repeat pr-9`;
  const caret = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"
  };

  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold text-slate-500">{label}</span>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <select
          aria-label={`${label} 시`}
          value={hour}
          onChange={(event) => onChange(`${event.target.value}:${minute}`)}
          className={`${selectClassName} min-w-0`}
          style={caret}
        >
          {hourOptions.map((option) => (
            <option key={option} value={option}>{hourLabel(option)}</option>
          ))}
        </select>
        <select
          aria-label={`${label} 분`}
          value={minute}
          onChange={(event) => onChange(`${hour}:${event.target.value}`)}
          className={`${selectClassName} min-w-0`}
          style={caret}
        >
          {minutes.map((option) => (
            <option key={option} value={option}>{option}분</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// 두 폼(신규 작성·수정)이 같은 영업시간 입력을 쓴다.
function BusinessHoursFields({
  draft,
  updateDraftField,
  fieldErrors
}: {
  draft: BusinessProfileDraft;
  updateDraftField: (field: keyof BusinessProfileDraft, value: string) => void;
  fieldErrors: Record<string, string>;
}) {
  const isReservation = draft.business_hours_preset === "reservation";
  const isCustom = draft.business_hours_preset === "custom";
  const timeError = fieldErrors.business_hours_close || fieldErrors.business_hours_open;
  const summary = getBusinessHoursSummary(draft);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {businessHourPresets.map((preset) => {
          const isSelected = draft.business_hours_preset === preset.value;

          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => updateDraftField("business_hours_preset", preset.value)}
              aria-pressed={isSelected}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-black transition-colors ${
                isSelected
                  ? "border-primary bg-primary text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
              }`}
            >
              {isSelected ? <Check size={14} strokeWidth={3} /> : null}
              {preset.label}
            </button>
          );
        })}
      </div>

      {isCustom ? (
        <div className="mt-4">
          <TextField
            name="business_hours_custom"
            label="영업시간 직접 입력"
            value={draft.business_hours_custom}
            onChange={(value) => updateDraftField("business_hours_custom", value)}
            placeholder="화-일 11:00-20:00, 월 휴무"
            icon={<Clock size={17} />}
            error={fieldErrors.business_hours_custom}
          />
        </div>
      ) : null}

      {!isCustom && !isReservation ? (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock size={15} className="text-primary" />
            <p className="text-sm font-black text-charcoal">영업 시간</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <TimeSelect
              label="여는 시간"
              value={draft.business_hours_open}
              error={timeError}
              onChange={(next) => updateDraftField("business_hours_open", next)}
            />
            <span className="hidden pt-6 text-sm font-black text-slate-300 sm:block">~</span>
            <TimeSelect
              label="닫는 시간"
              value={draft.business_hours_close}
              error={timeError}
              onChange={(next) => updateDraftField("business_hours_close", next)}
            />
          </div>
          {timeError ? (
            <FieldError>{timeError}</FieldError>
          ) : (
            <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
              <CircleAlert size={13} className="mt-0.5 shrink-0 text-slate-400" />
              요일마다 시간이 다르거나 자정을 넘겨 영업한다면 위에서 &lsquo;직접 입력&rsquo;을 골라주세요.
            </p>
          )}
        </div>
      ) : null}

      {summary ? (
        <p className="mt-4 rounded-xl bg-primaryLight px-4 py-3 text-sm font-bold text-primaryHover">
          크리에이터에게 이렇게 보여요 · {summary}
        </p>
      ) : null}

      <div className="mt-4">
        <TextField
          name="business_hours_note"
          label="운영 메모 (선택)"
          value={draft.business_hours_note}
          onChange={(value) => updateDraftField("business_hours_note", value)}
          placeholder="브레이크타임 15:00-17:00, 월 휴무"
          icon={<Clock size={17} />}
          error={fieldErrors.business_hours_note}
        />
      </div>
    </>
  );
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

function VerificationField({ label, value, verified }: { label: string; value: string; verified: boolean }) {
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
            formAction={sendEmailVerification}
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
        <p className="text-xs font-bold text-slate-500">저장된 담당자 전화번호 기준으로 인증합니다.</p>
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


function Required() {
  return <span className="text-primary">*</span>;
}

function Divider() {
  return <hr className="border-slate-100" />;
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

function BusinessAddressField({
  value,
  detailValue,
  latitude,
  longitude,
  onChange
}: {
  value: string;
  detailValue: string;
  latitude: string;
  longitude: string;
  onChange: (address: string, addressDetail: string, latitude: string, longitude: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [selectedAddress, setSelectedAddress] = useState(value);
  const [detailAddress, setDetailAddress] = useState(detailValue);
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [message, setMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const hasCoordinates = Boolean(latitude && longitude);
  const isErrorMessage = message.includes("오류") || message.includes("실패") || message.includes("설정") || message.includes("없습니다");

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || trimmedQuery === selectedAddress) {
      setIsSearching(false);
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setMessage("");

      try {
        const response = await fetch(`/api/maps/geocode?query=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal
        });
        const result = await response.json() as { addresses?: AddressSearchResult[]; error?: string };

        if (!response.ok) throw new Error(result.error ?? "주소 검색 중 오류가 발생했습니다.");

        const addresses = result.addresses ?? [];
        setResults(addresses);
        setMessage(addresses.length ? "후보 주소를 선택해주세요." : "검색 결과가 없습니다. 도로명 주소는 건물번호까지 입력해주세요.");
      } catch (addressError) {
        if (controller.signal.aborted) return;
        setMessage(addressError instanceof Error ? addressError.message : "주소 검색 중 오류가 발생했습니다.");
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, selectedAddress]);

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    setSelectedAddress("");
    setMessage("");
    onChange(nextQuery, detailAddress, "", "");
  }

  function handleDetailChange(nextDetail: string) {
    setDetailAddress(nextDetail);
    onChange(selectedAddress || query, nextDetail, latitude, longitude);
  }

  function selectResult(result: AddressSearchResult) {
    const address = result.roadAddress || result.address || result.jibunAddress || "";
    setQuery(address);
    setSelectedAddress(address);
    setResults([]);
    setMessage("주소와 좌표가 선택되었습니다.");
    onChange(address, detailAddress, result.latitude, result.longitude);
  }

  return (
    <div className="block">
      <FieldLabel>주소 <Required /></FieldLabel>
      <input type="hidden" name="address" value={(selectedAddress || query).trim()} />
      <input type="hidden" name="address_detail" value={detailAddress.trim()} />
      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />
      <div className="space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><MapPin size={17} /></span>
          <input
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) {
                event.preventDefault();
                selectResult(results[0]);
              }
            }}
            className="w-full rounded-xl border border-slate-200 px-4 py-3.5 pl-10 text-sm text-charcoal outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="도로명 주소는 건물번호까지 입력해주세요"
            aria-required
          />
          {isSearching ? (
            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-xs font-bold text-slate-400">검색 중</span>
          ) : null}
          {results.length ? (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              {results.map((result) => {
                const displayAddress = result.roadAddress || result.address || result.jibunAddress;
                return (
                  <button
                    key={`${result.longitude}-${result.latitude}-${displayAddress}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectResult(result)}
                    className="block w-full border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-primary/5"
                  >
                    <span className="block text-sm font-black text-charcoal">{displayAddress}</span>
                    {result.jibunAddress && result.jibunAddress !== displayAddress ? (
                      <span className="mt-1 block text-xs text-slate-500">지번: {result.jibunAddress}</span>
                    ) : null}
                    <span className="mt-1 block text-[11px] font-bold text-slate-400">
                      좌표 {result.longitude}, {result.latitude}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <input
          value={detailAddress}
          onChange={(event) => handleDetailChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm text-charcoal outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="상세 주소를 입력해주세요 (예: 2층, 201호)"
        />
      </div>
      <p className={`mt-2 text-xs ${isErrorMessage ? "font-bold text-primary" : "text-slate-500"}`}>
        {message || (hasCoordinates ? "저장된 좌표를 사용합니다. 주소를 바꾸면 후보 주소를 다시 선택해주세요." : "후보 주소를 선택하면 지도 표시용 좌표가 함께 저장됩니다.")}
      </p>
    </div>
  );
}

function SelectField({
  name,
  label,
  value,
  onChange,
  options,
  requiredMark = false,
  error
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  requiredMark?: boolean;
  error?: string;
}) {
  const normalizedOptions = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <label className="block">
      <FieldLabel required={requiredMark}>{label}</FieldLabel>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldControlClassName(error, "bg-white")}
        aria-required={requiredMark}
        aria-invalid={error ? true : undefined}
      >
        {normalizedOptions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <FieldError>{error}</FieldError>
    </label>
  );
}

function TextArea({
  name,
  label,
  value,
  onChange,
  placeholder,
  rows = 4
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        name={name}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm leading-6 text-charcoal outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
        placeholder={placeholder}
      />
    </label>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-black text-charcoal">{value}</p>
    </div>
  );
}

function ProfilePreviewCard({
  draft,
  businessHoursSummary,
  imageUrl,
  compact = false
}: {
  draft: BusinessProfileDraft;
  businessHoursSummary: string;
  imageUrl: string;
  compact?: boolean;
}) {
  const initial = draft.business_name.trim().slice(0, 1) || "N";

  return (
    <aside className={compact ? "" : "lg:pt-8"}>
      <div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm">
        <div className="relative aspect-[16/10] bg-slate-100">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <ImageIcon size={40} />
            </div>
          )}
          <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-primary shadow-sm">{draft.category}</div>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">{initial}</div>
            <div className="min-w-0">
              <h3 className="line-clamp-1 text-lg font-black text-charcoal">{draft.business_name || "가게명"}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{draft.short_intro || "한 줄 소개"}</p>
            </div>
          </div>
          <div className="grid gap-2 text-sm text-slate-600">
            <span className="flex items-center gap-2"><MapPin size={16} className="text-primary" />{draft.district || "소재지"}</span>
            <span className="flex items-center gap-2"><Phone size={16} className="text-primary" />{draft.contact || "매장 연락처"}</span>
            <span className="flex items-center gap-2"><Clock size={16} className="text-primary" />{businessHoursSummary || "영업시간"}</span>
            {draft.social_urls.length ? <span className="flex items-center gap-2"><Tag size={16} className="text-primary" />SNS {draft.social_urls.length}개</span> : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
