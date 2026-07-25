"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CircleAlert,
  Clapperboard,
  CloudUpload,
  ImageIcon,
  Instagram,
  MapPin,
  PackageOpen,
  PenLine,
  Scissors,
  Ticket,
  Utensils
} from "lucide-react";

type CampaignCreateWizardProps = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  businessName?: string;
  businessAddress?: string;
  businessAddressDetail?: string;
  businessLatitude?: string;
  businessLongitude?: string;
};

const steps = [
  {
    label: "기본 정보 입력",
    title: "어떤 캠페인을 만드시나요?",
    description: "크리에이터들이 매력을 느낄 수 있도록 캠페인의 기본 정보를 정확하게 입력해주세요."
  },
  {
    label: "모집 및 제공 정보",
    title: "모집 조건과 제공 내역을 설정해주세요",
    description: "크리에이터가 캠페인 참여를 결정하는 가장 중요한 정보입니다."
  },
  {
    label: "상세 내용 및 미션 작성",
    title: "어떤 콘텐츠가 필요한지 상세히 적어주세요",
    description: "크리에이터가 작성해야 할 핵심 가이드와 필수 미션입니다."
  },
  {
    label: "최종 검토 및 발행",
    title: "캠페인 내용을 최종 확인해주세요",
    description: "발행 후에는 일부 내용을 수정하기 어려울 수 있습니다. 꼼꼼히 확인해주세요."
  }
];

const categoryOptions = [
  { value: "맛집·카페", label: "맛집/카페", icon: <Utensils size={26} /> },
  { value: "뷰티·서비스", label: "뷰티/서비스", icon: <Scissors size={26} /> },
  { value: "문화·예술", label: "문화/예술", icon: <Ticket size={26} /> },
  { value: "제품·기타", label: "제품/기타", icon: <PackageOpen size={26} /> }
];

const contentTypeOptions = [
  {
    value: "visit",
    label: "네이버 블로그",
    description: "상세한 방문 리뷰와 여러 장의 사진이 필요할 때",
    icon: <PenLine size={26} />
  },
  {
    value: "interview",
    label: "인스타그램 피드",
    description: "감성적인 사진과 해시태그로 빠른 확산이 필요할 때",
    icon: <Instagram size={26} />
  },
  {
    value: "shortform",
    label: "인스타그램 릴스",
    description: "짧고 임팩트 있는 영상으로 생생한 전달이 필요할 때",
    icon: <Clapperboard size={26} />
  }
];

const benefitTypeOptions = [
  "방문 체험 제공",
  "제품 제공",
  "서비스 제공",
  "쿠폰·이용권 제공",
  "활동비 지급",
  "방문 체험 + 활동비",
  "제품 제공 + 활동비",
  "기타 협의"
];

const missionOptions = [
  "사진 최소 15장 이상 포함",
  "동영상 15초 이상 최소 1개 포함",
  "네이버 지도 및 장소 링크 첨부",
  "공식 인스타그램 계정 태그"
];

const campaignImageAccept = "image/jpeg,image/png,image/webp";
const maxImageSizeBytes = 10 * 1024 * 1024;
const maxReferenceImageCount = 6;
const fallbackPreviewImage = "https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_abe3604481_9dd7ad35470b2f2a.png";

type ImagePreview = {
  id: string;
  file: File;
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

type CampaignDraft = {
  category: string;
  title: string;
  operatorName: string;
  region: string;
  regionDetail: string;
  campaignType: string;
  recruitCount: string;
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
};

function getKoreaDateInputValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${value.year}-${value.month}-${value.day}`;
}

function addDaysToDateInput(value: string, days: number) {
  const date = new Date(`${value}T00:00:00+09:00`);
  date.setDate(date.getDate() + days);

  return getKoreaDateInputValue(date);
}

function getDefaultCampaignSchedule() {
  const today = getKoreaDateInputValue();
  const recruitEnd = addDaysToDateInput(today, 7);
  const selectionDate = addDaysToDateInput(recruitEnd, 2);
  const submissionDue = addDaysToDateInput(selectionDate, 14);

  return { today, recruitEnd, selectionDate, submissionDue };
}

function normalizeKeywordTag(value: string) {
  const keyword = normalizeKeywordText(value);
  return keyword ? `#${keyword}` : "";
}

function normalizeKeywordText(value: string) {
  return value.trim().replace(/^#+/, "").replace(/\s+/g, "");
}

function getFormValue(formData: FormData, name: string, fallback = "") {
  return String(formData.get(name) ?? fallback).trim();
}

function createInitialCampaignDraft(defaultSchedule: ReturnType<typeof getDefaultCampaignSchedule>, businessName = "", businessAddress = "", businessAddressDetail = ""): CampaignDraft {
  return {
    category: categoryOptions[0]?.value ?? "",
    title: "",
    operatorName: businessName,
    region: businessAddress,
    regionDetail: businessAddressDetail,
    campaignType: contentTypeOptions[0]?.value ?? "",
    recruitCount: "",
    recruitEnd: defaultSchedule.recruitEnd,
    selectionDate: defaultSchedule.selectionDate,
    submissionDue: defaultSchedule.submissionDue,
    benefitType: benefitTypeOptions[0] ?? "",
    benefitValue: "",
    fee: "",
    usageRights: "",
    description: "",
    missionOptions: missionOptions.slice(0, 2),
    contentRequirements: ""
  };
}

function createCampaignDraftFromForm(form: HTMLFormElement, defaultSchedule: ReturnType<typeof getDefaultCampaignSchedule>): CampaignDraft {
  const formData = new FormData(form);

  return {
    category: getFormValue(formData, "category", categoryOptions[0]?.value),
    title: getFormValue(formData, "title"),
    operatorName: getFormValue(formData, "operator_name"),
    region: getFormValue(formData, "region"),
    regionDetail: getFormValue(formData, "region_detail"),
    campaignType: getFormValue(formData, "campaign_type", contentTypeOptions[0]?.value),
    recruitCount: getFormValue(formData, "recruit_count"),
    recruitEnd: getFormValue(formData, "recruit_end", defaultSchedule.recruitEnd),
    selectionDate: getFormValue(formData, "selection_date", defaultSchedule.selectionDate),
    submissionDue: getFormValue(formData, "submission_due", defaultSchedule.submissionDue),
    benefitType: getFormValue(formData, "benefit_type", benefitTypeOptions[0]),
    benefitValue: getFormValue(formData, "benefit_value"),
    fee: getFormValue(formData, "fee"),
    usageRights: getFormValue(formData, "usage_rights"),
    description: getFormValue(formData, "description"),
    missionOptions: formData.getAll("mission_options").map((value) => String(value)),
    contentRequirements: getFormValue(formData, "content_requirements")
  };
}

function contentTypeLabel(value: string) {
  return contentTypeOptions.find((option) => option.value === value)?.label ?? "채널 미선택";
}

function formatReviewDate(value: string) {
  if (!value) return "입력 전";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;

  return `${year}.${month}.${day}`;
}

function dDayLabel(value: string) {
  if (!value) return "D-?";
  const today = new Date(`${getKoreaDateInputValue()}T00:00:00+09:00`).getTime();
  const target = new Date(`${value}T00:00:00+09:00`).getTime();
  if (Number.isNaN(target)) return "D-?";

  const dayDiff = Math.ceil((target - today) / 86_400_000);
  if (dayDiff < 0) return "마감";
  if (dayDiff === 0) return "D-day";
  return `D-${dayDiff}`;
}

function displayOrPending(value: string, fallback = "입력 전") {
  return value.trim() || fallback;
}

export function CampaignCreateWizard({
  action,
  error,
  businessName = "",
  businessAddress = "",
  businessAddressDetail = "",
  businessLatitude = "",
  businessLongitude = ""
}: CampaignCreateWizardProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const regionInputRef = useRef<HTMLInputElement>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const keywordHiddenInputRef = useRef<HTMLInputElement>(null);
  const keywordComposingRef = useRef(false);
  const keywordTagsRef = useRef<string[]>([]);
  const referenceImagesInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [defaultSchedule] = useState(getDefaultCampaignSchedule);
  const [step, setStep] = useState(0);
  const [validationMessage, setValidationMessage] = useState("");
  const [addressSearchMessage, setAddressSearchMessage] = useState("");
  const [addressQuery, setAddressQuery] = useState(businessAddress);
  const [selectedAddress, setSelectedAddress] = useState(businessAddress);
  const [addressDetail, setAddressDetail] = useState(businessAddressDetail);
  const [addressResults, setAddressResults] = useState<AddressSearchResult[]>([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ latitude: string; longitude: string } | null>(
    businessLatitude && businessLongitude ? { latitude: businessLatitude, longitude: businessLongitude } : null
  );
  const [isAddressSearching, setIsAddressSearching] = useState(false);
  const [keywordTags, setKeywordTags] = useState<string[]>([]);
  const [campaignDraft, setCampaignDraft] = useState(() => createInitialCampaignDraft(defaultSchedule, businessName, businessAddress, businessAddressDetail));
  const [coverImagePreview, setCoverImagePreview] = useState<ImagePreview | null>(null);
  const [referenceImagePreviews, setReferenceImagePreviews] = useState<ImagePreview[]>([]);
  const progress = ((step + 1) / steps.length) * 100;
  const isLastStep = step === steps.length - 1;
  const current = steps[step];
  const requiredMessage = "현재 단계의 필수 입력 항목을 모두 작성해주세요.";
  const keywordRequiredMessage = "필수 삽입 키워드를 하나 이상 추가해주세요.";
  const reviewTitle = displayOrPending(campaignDraft.title, "캠페인 제목 미입력");
  const reviewChannel = contentTypeLabel(campaignDraft.campaignType);
  const reviewRecruitCount = campaignDraft.recruitCount ? `총 ${campaignDraft.recruitCount}명` : "입력 전";
  const reviewRecruitPeriod = `운영자 승인일 ~ ${formatReviewDate(campaignDraft.recruitEnd)}`;
  const reviewBenefit = [campaignDraft.benefitType, campaignDraft.benefitValue].filter(Boolean).join(" / ") || "입력 전";
  const reviewFee = campaignDraft.fee ? `활동비 ${campaignDraft.fee}` : "활동비 없음";
  const reviewMissions = campaignDraft.missionOptions.length ? campaignDraft.missionOptions.join(", ") : "선택 없음";
  const cardRegion = displayOrPending(campaignDraft.region, "지역 미입력");
  const cardBenefit = campaignDraft.benefitValue ? `제공: ${campaignDraft.benefitValue}` : "제공 내역 미입력";
  const selectionDateMin = campaignDraft.recruitEnd || defaultSchedule.today;
  const submissionDueMin = campaignDraft.selectionDate || selectionDateMin;

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const query = addressQuery.trim();
    if (query.length < 2 || query === selectedAddress) {
      setIsAddressSearching(false);
      setAddressResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsAddressSearching(true);
      setAddressSearchMessage("");

      try {
        const response = await fetch(`/api/maps/geocode?query=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        const result = await response.json() as { addresses?: AddressSearchResult[]; error?: string };

        if (!response.ok) throw new Error(result.error ?? "주소 검색 중 오류가 발생했습니다.");

        const addresses = result.addresses ?? [];
        setAddressResults(addresses);
        setAddressSearchMessage(addresses.length ? "후보 주소를 선택해주세요." : "검색 결과가 없습니다. 도로명 주소는 건물번호까지 입력해주세요.");
      } catch (addressError) {
        if (controller.signal.aborted) return;
        setAddressSearchMessage(addressError instanceof Error ? addressError.message : "주소 검색 중 오류가 발생했습니다.");
        setAddressResults([]);
      } finally {
        if (!controller.signal.aborted) setIsAddressSearching(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [addressQuery, selectedAddress]);

  function refreshCampaignDraft() {
    if (!formRef.current) return;
    setCampaignDraft(createCampaignDraftFromForm(formRef.current, defaultSchedule));
  }

  function handleFormDraftChange() {
    refreshCampaignDraft();
  }

  function setRegionValue(value: string) {
    if (!regionInputRef.current) return;
    regionInputRef.current.value = value;
    regionInputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    setCampaignDraft((currentDraft) => ({ ...currentDraft, region: value }));
  }

  function handleAddressInputChange(value: string) {
    setAddressQuery(value);
    setSelectedAddress("");
    setSelectedCoordinates(null);
    setAddressSearchMessage("");
    setRegionValue(value);
  }

  function handleAddressDetailChange(value: string) {
    setAddressDetail(value);
    setCampaignDraft((currentDraft) => ({ ...currentDraft, regionDetail: value }));
  }

  function selectAddressResult(result: AddressSearchResult) {
    const address = result.roadAddress || result.address || result.jibunAddress || "";
    setAddressQuery(address);
    setSelectedAddress(address);
    setRegionValue(address);
    setSelectedCoordinates({ latitude: result.latitude, longitude: result.longitude });
    setAddressResults([]);
    setAddressSearchMessage("주소와 좌표가 선택되었습니다.");
    setValidationMessage("");
  }

  function getStepControls(stepIndex: number) {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step-panel="${stepIndex}"]`);
    if (!panel) return [];

    return Array.from(panel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")).filter((control) => !control.disabled);
  }

  function validateStep(stepIndex: number, report = true) {
    const invalidControl = getStepControls(stepIndex).find((control) => !control.checkValidity());

    if (invalidControl) {
      if (report) {
        setValidationMessage(requiredMessage);
        invalidControl.focus();
        invalidControl.reportValidity();
      }

      return false;
    }

    if (stepIndex === 0 && !selectedCoordinates) {
      if (report) {
        setValidationMessage("주소 검색 결과에서 캠페인 위치를 선택해주세요.");
        regionInputRef.current?.focus();
      }

      return false;
    }

    if (stepIndex === 2 && keywordTagsRef.current.length === 0 && !normalizeKeywordTag(getKeywordInputValue())) {
      if (report) {
        setValidationMessage(keywordRequiredMessage);
        keywordInputRef.current?.focus();
      }

      return false;
    }

    if (report) setValidationMessage("");
    return true;
  }

  function handleNextStep() {
    if (step === 2) commitKeywordInput();
    refreshCampaignDraft();
    if (!validateStep(step)) return;
    setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1));
  }

  function handlePreviousStep() {
    setValidationMessage("");
    if (step === 0) {
      history.back();
      return;
    }

    setStep((currentStep) => currentStep - 1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    commitKeywordInput();
    refreshCampaignDraft();
    const firstInvalidStep = steps.findIndex((_, stepIndex) => !validateStep(stepIndex, false));
    if (firstInvalidStep === -1) {
      setValidationMessage("");
      return;
    }

    event.preventDefault();
    setStep(firstInvalidStep);
    setValidationMessage(requiredMessage);
    window.requestAnimationFrame(() => validateStep(firstInvalidStep));
  }

  function getImageValidationMessage(file: File) {
    if (!file.type.startsWith("image/") || !campaignImageAccept.split(",").includes(file.type)) {
      return "이미지는 JPG, PNG, WEBP 형식만 등록할 수 있습니다.";
    }

    if (file.size > maxImageSizeBytes) {
      return "이미지는 10MB 이하 파일만 등록할 수 있습니다.";
    }

    return "";
  }

  function createImagePreview(file: File): ImagePreview {
    const url = URL.createObjectURL(file);
    previewUrlsRef.current.push(url);

    return {
      id: `${file.name}-${file.lastModified}-${url}`,
      file,
      url,
      name: file.name
    };
  }

  function revokeImagePreview(preview: ImagePreview) {
    URL.revokeObjectURL(preview.url);
    previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== preview.url);
  }

  function syncReferenceImageInput(previews: ImagePreview[]) {
    if (!referenceImagesInputRef.current) return;

    const dataTransfer = new DataTransfer();
    previews.forEach((preview) => dataTransfer.items.add(preview.file));
    referenceImagesInputRef.current.files = dataTransfer.files;
  }

  function handleCoverImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      if (coverImagePreview) revokeImagePreview(coverImagePreview);
      setCoverImagePreview(null);
      return;
    }

    const imageError = getImageValidationMessage(file);
    if (imageError) {
      event.currentTarget.value = "";
      setValidationMessage(imageError);
      return;
    }

    const nextPreview = createImagePreview(file);
    if (coverImagePreview) revokeImagePreview(coverImagePreview);
    setCoverImagePreview(nextPreview);
    setValidationMessage("");
  }

  function handleReferenceImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    if (!selectedFiles.length) return;

    const validFiles: File[] = [];
    const invalidFile = selectedFiles.find((file) => {
      const imageError = getImageValidationMessage(file);
      if (!imageError) {
        validFiles.push(file);
        return false;
      }

      setValidationMessage(imageError);
      return true;
    });

    if (invalidFile || !validFiles.length) {
      event.currentTarget.value = "";
      syncReferenceImageInput(referenceImagePreviews);
      return;
    }

    const remainingSlots = maxReferenceImageCount - referenceImagePreviews.length;
    const nextFiles = validFiles.slice(0, Math.max(remainingSlots, 0));
    const nextPreviews = [...referenceImagePreviews, ...nextFiles.map(createImagePreview)];

    if (validFiles.length > remainingSlots) {
      setValidationMessage(`참고 사진은 최대 ${maxReferenceImageCount}장까지 등록할 수 있습니다.`);
    } else {
      setValidationMessage("");
    }

    syncReferenceImageInput(nextPreviews);
    setReferenceImagePreviews(nextPreviews);
  }

  function removeReferenceImage(id: string) {
    setReferenceImagePreviews((currentPreviews) => {
      const targetPreview = currentPreviews.find((preview) => preview.id === id);
      if (targetPreview) revokeImagePreview(targetPreview);

      const nextPreviews = currentPreviews.filter((preview) => preview.id !== id);
      syncReferenceImageInput(nextPreviews);
      return nextPreviews;
    });
  }

  function getKeywordInputValue() {
    return keywordInputRef.current?.value ?? "";
  }

  function setKeywordInputValue(value: string) {
    if (keywordInputRef.current) keywordInputRef.current.value = value;
  }

  function setKeywordTagValues(tags: string[]) {
    keywordTagsRef.current = tags;
    setKeywordTags(tags);
    if (keywordHiddenInputRef.current) keywordHiddenInputRef.current.value = tags.join(",");
  }

  function addKeywordTags(value: string) {
    const tags = value.split(",").map(normalizeKeywordTag).filter(Boolean);
    if (!tags.length) return false;

    const seen = new Set(keywordTagsRef.current.map((tag) => tag.toLocaleLowerCase("ko-KR")));
    const nextTags = [...keywordTagsRef.current];

    tags.forEach((tag) => {
      const key = tag.toLocaleLowerCase("ko-KR");
      if (seen.has(key)) return;
      seen.add(key);
      nextTags.push(tag);
    });

    setKeywordTagValues(nextTags);

    return true;
  }

  function syncKeywordHiddenInput() {
    if (keywordHiddenInputRef.current) keywordHiddenInputRef.current.value = keywordTagsRef.current.join(",");
  }

  function clearKeywordInput() {
    setKeywordInputValue("");
  }

  function commitKeywordInput(value = getKeywordInputValue()) {
    if (!value.trim()) return false;
    const committed = addKeywordTags(value);
    if (committed) clearKeywordInput();
    syncKeywordHiddenInput();

    return committed;
  }

  function handleKeywordInputValue(value: string) {
    if (!value.includes(",")) return;

    const parts = value.split(",");
    const pendingValue = parts.pop() ?? "";
    addKeywordTags(parts.join(","));
    setKeywordInputValue(pendingValue);
  }

  function handleKeywordChange(event: ChangeEvent<HTMLInputElement>) {
    if (keywordComposingRef.current) return;
    handleKeywordInputValue(event.currentTarget.value);
  }

  function handleKeywordKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const isCommitKey = event.key === "Tab" || event.key === "Enter" || event.key === ",";
    if (!isCommitKey) return;

    const isComposing = keywordComposingRef.current || event.nativeEvent.isComposing || event.key === "Process" || event.keyCode === 229;
    if (isComposing) return;

    if (!normalizeKeywordTag(event.currentTarget.value)) return;

    event.preventDefault();
    commitKeywordInput(event.currentTarget.value);
  }

  function handleKeywordCompositionStart() {
    keywordComposingRef.current = true;
  }

  function handleKeywordCompositionEnd() {
    keywordComposingRef.current = false;
  }

  function removeKeywordTag(tag: string) {
    setKeywordTagValues(keywordTagsRef.current.filter((currentTag) => currentTag !== tag));
  }

  return (
    <main className="bg-surface">
      <div className={`mx-auto px-4 py-8 pb-28 sm:px-6 md:py-12 lg:px-8 ${isLastStep ? "max-w-6xl" : "max-w-4xl"}`}>
        <div className={isLastStep ? "mx-auto mb-8 max-w-4xl" : "mb-8"}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-black text-primary">Step {step + 1} of 4</span>
            <span className="text-sm font-medium text-slate-500">{current.label}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className={`mb-8 ${isLastStep ? "mx-auto max-w-4xl text-center" : "text-center sm:text-left"}`}>
          <h1 className="mb-2 text-2xl font-black text-charcoal sm:text-3xl">{current.title}</h1>
          <p className="text-slate-500">{current.description}</p>
          {error ? <p className="mt-4 rounded-xl bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}
          {validationMessage ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-700">{validationMessage}</p> : null}
        </div>

        <form ref={formRef} action={action} noValidate onInput={handleFormDraftChange} onChange={handleFormDraftChange} onSubmit={handleSubmit}>
          <StepPanel index={0} active={step === 0}>
            <FormCard>
              <section>
                <FieldLabel>캠페인 카테고리 <Required /></FieldLabel>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {categoryOptions.map((option, index) => (
                    <ChoiceCard key={option.value} name="category" value={option.value} defaultChecked={index === 0}>
                      <div className="text-slate-400 transition-colors group-has-[:checked]:text-primary">{option.icon}</div>
                      <span className="text-sm font-bold text-slate-700 group-has-[:checked]:text-charcoal">{option.label}</span>
                    </ChoiceCard>
                  ))}
                </div>
              </section>

              <Divider />

              <section className="space-y-6">
                <TextField
                  name="title"
                  label="캠페인 제목"
                  placeholder="예: [노원/공릉] 분위기 좋은 감성 카페 오디너리 디저트 세트 체험단"
                  helper="크리에이터의 시선을 끌 수 있는 매력적인 제목을 작성해주세요. 지역명 포함을 권장합니다."
                  requiredMark
                />
                <div className="grid gap-6 sm:grid-cols-2">
                  <TextField name="operator_name" label="상호명 (제공처)" placeholder="상호명을 입력해주세요" defaultValue={businessName} requiredMark />
                  <AddressSearchField
                    inputRef={regionInputRef}
                    value={addressQuery}
                    detailValue={addressDetail}
                    results={addressResults}
                    isSearching={isAddressSearching}
                    selectedAddress={selectedAddress}
                    selectedCoordinates={selectedCoordinates}
                    message={addressSearchMessage}
                    onChange={handleAddressInputChange}
                    onDetailChange={handleAddressDetailChange}
                    onSelect={selectAddressResult}
                  />
                </div>
              </section>

              <Divider />

              <section>
                <div className="mb-2 flex items-end justify-between gap-4">
                  <FieldLabel>대표 이미지 (썸네일) <Required /></FieldLabel>
                  <span className="text-xs text-slate-400">권장 사이즈 1200x800px (최대 10MB)</span>
                </div>
                <label className={`group mt-2 flex cursor-pointer justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors hover:border-primary hover:bg-primary/5 ${coverImagePreview ? "border-primary bg-slate-100 p-0" : "border-slate-300 bg-slate-50 px-6 py-10"}`}>
                  {coverImagePreview ? (
                    <div className="relative h-64 w-full">
                      <img src={coverImagePreview.url} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-charcoal/70 px-4 py-3 text-sm font-bold text-white backdrop-blur-sm">
                        {coverImagePreview.name}
                      </div>
                      <div className="absolute right-3 top-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-black text-primary shadow-sm">
                        이미지 변경
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-100 bg-white text-primary shadow-sm transition-transform group-hover:scale-110">
                        <CloudUpload size={24} />
                      </div>
                      <div className="mt-4 flex justify-center text-sm leading-6 text-slate-600">
                        <span className="font-bold text-primary transition-colors hover:text-primaryHover">파일 업로드</span>
                        <p className="pl-1">또는 여기로 드래그 앤 드롭</p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">PNG, JPG, JPEG, WEBP 지원</p>
                    </div>
                  )}
                  <input name="cover_image" type="file" accept={campaignImageAccept} required onChange={handleCoverImageChange} className="sr-only" />
                </label>
              </section>
            </FormCard>
          </StepPanel>

          <StepPanel index={1} active={step === 1}>
            <FormCard>
              <section>
                <FieldLabel>모집 채널 및 콘텐츠 타입 <Required /></FieldLabel>
                <div className="grid gap-4 sm:grid-cols-3">
                  {contentTypeOptions.map((option, index) => (
                    <ChoiceCard key={option.value} name="campaign_type" value={option.value} defaultChecked={index === 0}>
                      <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors group-has-[:checked]:bg-primary/10 group-has-[:checked]:text-primary">
                        {option.icon}
                      </div>
                      <span className="mb-1 block font-black text-charcoal group-hover:text-primary group-has-[:checked]:text-primary">{option.label}</span>
                      <span className="text-xs leading-5 text-slate-500">{option.description}</span>
                    </ChoiceCard>
                  ))}
                </div>
              </section>

              <Divider />

              <section className="space-y-6">
                <TextField name="recruit_count" label="선정 인원" placeholder="예: 5" suffix="명" type="number" min={1} requiredMark />
                <div>
                  <FieldLabel>캠페인 일정 설정 <Required /></FieldLabel>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <TextField name="recruit_end" label="모집 마감일" type="date" min={defaultSchedule.today} defaultValue={defaultSchedule.recruitEnd} requiredMark />
                    <TextField name="selection_date" label="크리에이터 선정 발표일" type="date" min={selectionDateMin} defaultValue={defaultSchedule.selectionDate} />
                    <TextField name="submission_due" label="콘텐츠 등록 마감일" type="date" min={submissionDueMin} defaultValue={defaultSchedule.submissionDue} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">선정 발표일은 모집 마감일 이후, 콘텐츠 등록 마감일은 선정 발표일 이후로 설정해주세요.</p>
                </div>
              </section>

              <Divider />

              <section className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <SelectField name="benefit_type" label="혜택 유형" options={benefitTypeOptions} defaultValue="방문 체험 제공" />
                  <TextField name="benefit_value" label="제공 내역 (혜택)" placeholder="디저트 2종 + 음료 2잔" requiredMark />
                  <TextField name="fee" label="활동비 또는 제작비" placeholder="선택 입력" />
                </div>
                <TextArea name="usage_rights" label="방문 및 사용 안내사항" placeholder="예: 주말 방문 불가, 최소 2일 전 예약 필수, 가게 SNS 리그램 가능" />
              </section>
            </FormCard>
          </StepPanel>

          <StepPanel index={2} active={step === 2}>
            <FormCard>
              <TextArea
                name="description"
                label="캠페인 상세 설명"
                placeholder="예: 저희 매장은 노원구에서 가장 신선한 재료를 사용하는 브런치 카페입니다. 이번 신메뉴 출시를 맞이하여 널리 알리고자 합니다."
                rows={5}
                helper="매장의 특장점, 캠페인의 목적, 강조하고 싶은 포인트를 자유롭게 적어주세요."
                requiredMark
              />

              <Divider />

              <section>
                <FieldLabel>대표 이미지 및 참고 사진</FieldLabel>
                <p className="mb-4 text-xs text-slate-500">1단계에서 등록한 대표 이미지는 첫 번째 카드에 표시됩니다. 추가 참고사진은 선택사항입니다.</p>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="group relative h-32 overflow-hidden rounded-xl border border-primary bg-slate-100">
                    <span className="absolute left-2 top-2 z-10 rounded bg-charcoal px-2 py-0.5 text-[10px] font-bold text-white">대표</span>
                    {coverImagePreview ? (
                      <img src={coverImagePreview.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageIcon size={28} />
                      </div>
                    )}
                  </div>

                  {referenceImagePreviews.map((preview) => (
                    <div key={preview.id} className="group relative h-32 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <img src={preview.url} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeReferenceImage(preview.id)} className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-slate-500 opacity-0 shadow-sm transition-all hover:text-primary group-hover:opacity-100" aria-label={`${preview.name} 삭제`}>
                        ×
                      </button>
                    </div>
                  ))}

                  {referenceImagePreviews.length < maxReferenceImageCount ? (
                    <label htmlFor="reference-images" className="relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-primary hover:bg-slate-50 hover:text-primary">
                      <Camera size={26} />
                      <span className="mt-2 text-xs font-bold">참고사진 추가</span>
                    </label>
                  ) : null}
                  <input id="reference-images" ref={referenceImagesInputRef} name="reference_images" type="file" className="sr-only" multiple accept={campaignImageAccept} onChange={handleReferenceImagesChange} />
                </div>
              </section>

              <Divider />

              <section>
                <FieldLabel>필수 삽입 키워드 <Required /></FieldLabel>
                <p className="mb-3 text-xs text-slate-500">제목과 본문에 반드시 포함되어야 할 해시태그나 키워드를 입력해주세요.</p>
                <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                  {keywordTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-bold text-charcoal">
                      {tag}
                      <button type="button" onClick={() => removeKeywordTag(tag)} className="ml-1 text-slate-400 transition-colors hover:text-primary" aria-label={`${tag} 삭제`}>
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    ref={keywordInputRef}
                    onChange={handleKeywordChange}
                    onCompositionStart={handleKeywordCompositionStart}
                    onCompositionEnd={handleKeywordCompositionEnd}
                    onKeyDown={handleKeywordKeyDown}
                    className="min-w-[160px] flex-1 border-none bg-transparent p-1 text-sm outline-none placeholder:text-slate-400"
                    placeholder={keywordTags.length ? "키워드 추가..." : "예: 노원맛집 입력 후 Tab 또는 쉼표"}
                  />
                  <input ref={keywordHiddenInputRef} type="hidden" name="keywords" defaultValue="" />
                </div>
              </section>

              <Divider />

              <section className="space-y-6">
                <div>
                  <FieldLabel>콘텐츠 필수 조건 (체크리스트) <Required /></FieldLabel>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {missionOptions.map((mission, index) => (
                      <label key={mission} className="group flex cursor-pointer items-start gap-3">
                        <input type="checkbox" name="mission_options" value={mission} defaultChecked={index < 2} className="sr-only" />
                        <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border-2 border-slate-300 bg-white transition-colors group-hover:border-primary group-has-[:checked]:border-primary group-has-[:checked]:bg-primary">
                          <Check size={13} className="text-white opacity-0 transition-opacity group-has-[:checked]:opacity-100" strokeWidth={3} />
                        </span>
                        <span className="text-sm font-medium text-charcoal">{mission}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <TextArea
                  name="content_requirements"
                  label="상세 촬영 미션 및 작성 가이드"
                  placeholder={"1. 매장 외부 간판 사진 1장 필수\n2. 시그니처 메뉴 디테일 컷 3장 이상\n3. 분위기가 좋아 데이트하기 좋다는 내용 본문 포함"}
                  rows={4}
                  helper="번호를 매겨 구체적으로 지시해주시면 크리에이터가 가이드에 맞춰 더 좋은 콘텐츠를 제작할 수 있습니다."
                  requiredMark
                />
              </section>
            </FormCard>
          </StepPanel>

          <StepPanel index={3} active={step === 3}>
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-8">
                <div className="flex gap-4 rounded-[20px] border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <CircleAlert size={20} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="mb-1 text-sm font-black text-charcoal">발행 전 꼭 확인하세요!</p>
                    <p className="text-sm leading-6 text-slate-500">모집 기간, 제공 내역, 필수 해시태그 등 크리에이터가 참고할 중요한 정보가 정확한지 다시 한번 점검해주세요.</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="p-6 sm:p-8">
                    <ReviewSection title="1. 기본 정보" onEdit={() => setStep(0)}>
                      <ReviewRow label="캠페인 제목" value={reviewTitle} strong />
                      <ReviewRow label="상호명" value={displayOrPending(campaignDraft.operatorName)} />
                      <ReviewRow label="카테고리" value={displayOrPending(campaignDraft.category)} />
                      <ReviewRow label="모집 채널" value={reviewChannel} />
                      <ReviewRow label="선정 인원" value={reviewRecruitCount} />
                      <ReviewRow label="모집 기간" value={reviewRecruitPeriod} />
                      <ReviewRow label="선정 발표일" value={formatReviewDate(campaignDraft.selectionDate)} />
                      <ReviewRow label="콘텐츠 마감일" value={formatReviewDate(campaignDraft.submissionDue)} />
                    </ReviewSection>
                    <ReviewSection title="2. 제공 내역 및 안내" onEdit={() => setStep(1)}>
                      <ReviewRow label="제공 서비스" value={reviewBenefit} />
                      <ReviewRow label="활동비" value={reviewFee} />
                      <ReviewRow label="방문 위치" value={displayOrPending(campaignDraft.region)} />
                      <ReviewRow label="상세 주소" value={campaignDraft.regionDetail || "입력 없음"} />
                      <ReviewRow label="방문 및 사용 안내" value={displayOrPending(campaignDraft.usageRights, "입력된 안내사항이 없습니다.")} boxed />
                    </ReviewSection>
                    <ReviewSection title="3. 미션 상세 가이드" onEdit={() => setStep(2)} last>
                      <ReviewRow label="상세 설명" value={displayOrPending(campaignDraft.description)} boxed />
                      <div className="grid gap-1 sm:grid-cols-3 sm:gap-4">
                        <dt className="pt-1 text-sm font-medium text-slate-500">필수 해시태그</dt>
                        <dd className="flex flex-wrap gap-2 text-sm font-medium sm:col-span-2">
                          {keywordTags.length ? (
                            keywordTags.map((tag) => (
                              <span key={tag} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-charcoal">{tag}</span>
                            ))
                          ) : (
                            <span className="text-sm text-slate-400">입력 전</span>
                          )}
                        </dd>
                      </div>
                      <ReviewRow label="콘텐츠 조건" value={reviewMissions} />
                      <ReviewRow label="상세 가이드" value={displayOrPending(campaignDraft.contentRequirements)} boxed />
                      <ReviewRow label="참고 사진" value={referenceImagePreviews.length ? `${referenceImagePreviews.length}장 추가` : "추가 참고사진 없음"} />
                    </ReviewSection>
                  </div>
                </div>
              </div>

              <aside className="lg:col-span-4">
                <div className="sticky top-24 rounded-[20px] border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-black text-charcoal">카드 미리보기</h3>
                    <span className="text-xs text-slate-400">앱/웹 노출 화면</span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 transition-shadow hover:shadow-md">
                    <div className="relative h-40 bg-slate-100">
                      <img className="h-full w-full object-cover" src={coverImagePreview?.url ?? fallbackPreviewImage} alt="" />
                      <div className="absolute left-3 top-3 flex gap-1.5">
                        <span className="rounded bg-charcoal/90 px-2 py-1 text-[10px] font-bold text-white">{reviewChannel}</span>
                      </div>
                      <div className="absolute bottom-3 right-3 rounded bg-white/90 px-2 py-1 text-[10px] font-bold text-primary shadow-sm">{dDayLabel(campaignDraft.recruitEnd)}</div>
                    </div>
                    <div className="bg-white p-4">
                      <div className="mb-1 text-xs font-medium text-slate-500">{cardRegion}</div>
                      <h4 className="mb-2 line-clamp-2 text-sm font-black leading-tight text-charcoal">{reviewTitle}</h4>
                      <p className="mb-3 truncate text-xs text-slate-500">{cardBenefit}</p>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="text-xs text-slate-500">모집 <span className="font-bold text-charcoal">{campaignDraft.recruitCount || "-"}명</span></div>
                        <div className="rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">검수 대기</div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            <label className="group mx-auto mt-8 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm sm:w-fit">
              <input type="checkbox" name="final_agree" required className="sr-only" />
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-slate-300 bg-white transition-colors group-hover:border-primary group-has-[:checked]:border-primary group-has-[:checked]:bg-primary">
                <Check size={15} className="text-white opacity-0 transition-opacity group-has-[:checked]:opacity-100" strokeWidth={3} />
              </span>
              <span className="text-sm font-black text-charcoal sm:text-base">작성된 내용을 모두 확인하였으며, 위 내용으로 캠페인을 발행합니다.</span>
            </label>
            <label className="group mx-auto mt-4 flex w-full cursor-pointer items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 sm:w-fit">
              <input type="checkbox" name="beginner_friendly" className="sr-only" />
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-slate-300 bg-white transition-colors group-hover:border-primary group-has-[:checked]:border-primary group-has-[:checked]:bg-primary">
                <Check size={13} className="text-white opacity-0 transition-opacity group-has-[:checked]:opacity-100" strokeWidth={3} />
              </span>
              초보 크리에이터 참여 가능
            </label>
          </StepPanel>

          <div className={`mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row ${isLastStep ? "mx-auto max-w-4xl" : ""}`}>
            <button
              type="button"
              onClick={handlePreviousStep}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-3.5 font-bold text-slate-600 transition-all hover:bg-white hover:shadow-sm sm:w-auto"
            >
              <ArrowLeft size={16} />
              {step === 0 ? "취소" : "이전"}
            </button>
            <div className="flex w-full gap-3 sm:w-auto">
              <button type="button" className="flex w-full items-center justify-center rounded-xl px-6 py-3.5 font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 sm:w-auto">
                임시저장
              </button>
              {isLastStep ? (
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-10 py-3.5 font-black text-white shadow-md shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primaryHover sm:w-auto">
                  캠페인 발행하기
                  <Check size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-10 py-3.5 font-black text-white shadow-md shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primaryHover sm:w-auto"
                >
                  다음 단계로
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

function StepPanel({ index, active, children }: { index: number; active: boolean; children: React.ReactNode }) {
  return <div data-step-panel={index} className={active ? "block" : "hidden"}>{children}</div>;
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="space-y-8 p-6 sm:space-y-10 sm:p-10">{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-3 block text-sm font-black text-charcoal">{children}</label>;
}

function Required() {
  return <span className="text-primary">*</span>;
}

function Divider() {
  return <hr className="border-slate-100" />;
}

function ChoiceCard({
  name,
  value,
  defaultChecked,
  children
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="group relative flex cursor-pointer rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-colors hover:bg-slate-50">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <div className="flex w-full flex-col items-center justify-center gap-2">{children}</div>
      <span className="pointer-events-none absolute -inset-px rounded-xl border-2 border-transparent peer-checked:border-primary" aria-hidden />
    </label>
  );
}

function TextField({
  name,
  label,
  placeholder,
  helper,
  icon,
  suffix,
  type = "text",
  min,
  defaultValue,
  requiredMark = false
}: {
  name: string;
  label: string;
  placeholder?: string;
  helper?: string;
  icon?: React.ReactNode;
  suffix?: string;
  type?: string;
  min?: number | string;
  defaultValue?: string;
  requiredMark?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-charcoal">{label} {requiredMark ? <Required /> : null}</span>
      <div className="relative">
        {icon ? <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">{icon}</span> : null}
        <input
          name={name}
          type={type}
          min={min}
          defaultValue={defaultValue}
          required={requiredMark}
          className={`w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm text-charcoal outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary ${icon ? "pl-10" : ""} ${suffix ? "pr-12" : ""}`}
          placeholder={placeholder}
        />
        {suffix ? <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">{suffix}</span> : null}
      </div>
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
    </label>
  );
}

function AddressSearchField({
  inputRef,
  value,
  detailValue,
  results,
  isSearching,
  selectedAddress,
  selectedCoordinates,
  message,
  onChange,
  onDetailChange,
  onSelect
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  detailValue: string;
  results: AddressSearchResult[];
  isSearching: boolean;
  selectedAddress: string;
  selectedCoordinates: { latitude: string; longitude: string } | null;
  message?: string;
  onChange: (value: string) => void;
  onDetailChange: (value: string) => void;
  onSelect: (result: AddressSearchResult) => void;
}) {
  const isErrorMessage = message?.includes("오류") || message?.includes("실패") || message?.includes("설정") || message?.includes("없습니다");

  return (
    <div className="sm:col-span-1">
      <span className="mb-2 block text-sm font-black text-charcoal">캠페인 주소 <Required /></span>
      <input type="hidden" name="region" value={(selectedAddress || value).trim()} />
      <input type="hidden" name="region_detail" value={detailValue.trim()} />
      <input type="hidden" name="latitude" value={selectedCoordinates?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={selectedCoordinates?.longitude ?? ""} />
      <div className="space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><MapPin size={17} /></span>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) {
                event.preventDefault();
                onSelect(results[0]);
              }
            }}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3.5 pl-10 text-sm text-charcoal outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="도로명 주소는 건물번호까지 입력해주세요"
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
                    onClick={() => onSelect(result)}
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
          value={detailValue}
          onChange={(event) => onDetailChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm text-charcoal outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="상세 주소를 입력해주세요 (예: 2층, 201호)"
        />
      </div>
      <p className={`mt-2 text-xs ${isErrorMessage ? "font-bold text-primary" : "text-slate-500"}`}>
        {message || "예: 서울특별시 노원구 동일로183길 10. 후보 주소를 선택하면 지도 표시용 좌표가 함께 저장됩니다."}
      </p>
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  defaultValue,
  requiredMark = false
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
  requiredMark?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-charcoal">{label} {requiredMark ? <Required /> : null}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? options[0]}
        required={requiredMark}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-charcoal outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  name,
  label,
  placeholder,
  helper,
  rows = 3,
  requiredMark = false
}: {
  name: string;
  label: string;
  placeholder?: string;
  helper?: string;
  rows?: number;
  requiredMark?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-charcoal">{label} {requiredMark ? <Required /> : null}</span>
      <textarea
        name={name}
        required={requiredMark}
        rows={rows}
        className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3.5 text-sm text-charcoal outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
        placeholder={placeholder}
      />
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
    </label>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
  last = false
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? "" : "mb-8"}>
      <div className="mb-4 flex items-center justify-between border-b-2 border-slate-100 pb-2">
        <h3 className="text-lg font-black text-charcoal">{title}</h3>
        <button type="button" onClick={onEdit} className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          <PenLine size={13} />
          수정
        </button>
      </div>
      <dl className="space-y-4">{children}</dl>
    </section>
  );
}

function ReviewRow({ label, value, strong = false, boxed = false }: { label: string; value: string; strong?: boolean; boxed?: boolean }) {
  return (
    <div className="grid gap-1 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className={`text-sm sm:col-span-2 ${strong ? "font-black" : "font-medium"} ${boxed ? "whitespace-pre-line rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-600" : "text-charcoal"}`}>{value}</dd>
    </div>
  );
}
