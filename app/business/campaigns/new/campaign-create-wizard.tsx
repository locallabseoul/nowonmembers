"use client";

import { useState } from "react";
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

const missionOptions = [
  "사진 최소 15장 이상 포함",
  "동영상 15초 이상 최소 1개 포함",
  "네이버 지도 및 장소 링크 첨부",
  "공식 인스타그램 계정 태그"
];

export function CampaignCreateWizard({ action, error }: CampaignCreateWizardProps) {
  const [step, setStep] = useState(0);
  const progress = ((step + 1) / steps.length) * 100;
  const isLastStep = step === steps.length - 1;
  const current = steps[step];

  return (
    <main className="min-h-screen bg-surface">
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
        </div>

        <form action={action}>
          <StepPanel active={step === 0}>
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
                  <TextField name="operator_name" label="상호명 (제공처)" placeholder="상호명을 입력해주세요" requiredMark />
                  <TextField name="region" label="위치/지역" placeholder="공릉동 또는 도로명 주소" icon={<MapPin size={17} />} requiredMark />
                </div>
              </section>

              <Divider />

              <section>
                <div className="mb-2 flex items-end justify-between gap-4">
                  <FieldLabel>대표 이미지 (썸네일) <Required /></FieldLabel>
                  <span className="text-xs text-slate-400">권장 사이즈 1200x800px (최대 5MB)</span>
                </div>
                <label className="group mt-2 flex cursor-pointer justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 transition-colors hover:border-primary hover:bg-primary/5">
                  <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-100 bg-white text-primary shadow-sm transition-transform group-hover:scale-110">
                      <CloudUpload size={24} />
                    </div>
                    <div className="mt-4 flex justify-center text-sm leading-6 text-slate-600">
                      <span className="font-bold text-primary transition-colors hover:text-primaryHover">파일 업로드</span>
                      <p className="pl-1">또는 여기로 드래그 앤 드롭</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">PNG, JPG, JPEG 지원</p>
                  </div>
                  <input name="file-upload" type="file" accept="image/*" className="sr-only" />
                </label>
              </section>
            </FormCard>
          </StepPanel>

          <StepPanel active={step === 1}>
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
                <TextField name="recruit_count" label="모집 인원" placeholder="예: 5" suffix="명" requiredMark />
                <div>
                  <FieldLabel>캠페인 일정 설정 <Required /></FieldLabel>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <TextField name="recruit_end" label="모집 마감일" type="date" requiredMark />
                    <TextField name="selection_date" label="크리에이터 선정 발표일" type="date" />
                    <TextField name="submission_due" label="콘텐츠 등록 마감일" type="date" />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">선정 발표일은 모집 마감일 이후, 콘텐츠 등록 마감일은 선정 발표일 이후로 설정해주세요.</p>
                </div>
              </section>

              <Divider />

              <section className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField name="benefit_type" label="혜택 유형" placeholder="체험 제공" />
                  <TextField name="benefit_value" label="제공 내역 (혜택)" placeholder="디저트 2종 + 음료 2잔" requiredMark />
                  <TextField name="fee" label="활동비 또는 제작비" placeholder="선택 입력" />
                </div>
                <TextArea name="usage_rights" label="방문 및 사용 안내사항" placeholder="예: 주말 방문 불가, 최소 2일 전 예약 필수, 가게 SNS 리그램 가능" />
              </section>
            </FormCard>
          </StepPanel>

          <StepPanel active={step === 2}>
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
                <FieldLabel>대표 이미지 및 참고 사진 <Required /></FieldLabel>
                <p className="mb-4 text-xs text-slate-500">캠페인 목록에 노출될 대표 이미지와 크리에이터가 참고할 수 있는 사진을 등록해주세요.</p>
                <div className="grid gap-4 sm:grid-cols-4">
                  <label className="relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-primary hover:bg-slate-50 hover:text-primary">
                    <Camera size={26} />
                    <span className="mt-2 text-xs font-bold">사진 추가</span>
                    <input type="file" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" multiple accept="image/*" />
                  </label>

                  <div className="grid gap-4 sm:col-span-3 sm:grid-cols-3">
                    <div className="group relative h-32 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <span className="absolute left-2 top-2 z-10 rounded bg-charcoal px-2 py-0.5 text-[10px] font-bold text-white">대표</span>
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageIcon size={28} />
                      </div>
                      <button type="button" className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-slate-500 opacity-0 shadow-sm transition-all hover:text-primary group-hover:opacity-100" aria-label="이미지 삭제">
                        ×
                      </button>
                    </div>
                    <div className="flex h-32 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-300">
                      <ImageIcon size={28} />
                    </div>
                    <div className="hidden h-32 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-300 sm:flex">
                      <ImageIcon size={28} />
                    </div>
                  </div>
                </div>
              </section>

              <Divider />

              <section>
                <FieldLabel>필수 삽입 키워드 <Required /></FieldLabel>
                <p className="mb-3 text-xs text-slate-500">제목과 본문에 반드시 포함되어야 할 해시태그나 키워드를 입력해주세요.</p>
                <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                  {["#노원맛집", "#노원역데이트", "#신상카페"].map((tag) => (
                    <span key={tag} className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-bold text-charcoal">{tag}</span>
                  ))}
                  <input name="keywords" className="min-w-[120px] flex-1 border-none bg-transparent p-1 text-sm outline-none placeholder:text-slate-400" placeholder="태그 입력..." />
                </div>
              </section>

              <Divider />

              <section className="space-y-6">
                <div>
                  <FieldLabel>콘텐츠 필수 조건 (체크리스트) <Required /></FieldLabel>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {missionOptions.map((mission, index) => (
                      <label key={mission} className="group flex cursor-pointer items-start gap-3">
                        <input type="checkbox" defaultChecked={index < 2} className="sr-only" />
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

          <StepPanel active={step === 3}>
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
                      <ReviewRow label="캠페인 제목" value="[노원역] 신선한 브런치와 커피가 있는 감성 카페 체험단" strong />
                      <ReviewRow label="모집 채널" value="네이버 블로그 | 인스타그램" />
                      <ReviewRow label="모집 인원" value="총 10명" />
                      <ReviewRow label="모집 기간" value="2026.07.10 ~ 2026.07.20" />
                    </ReviewSection>
                    <ReviewSection title="2. 제공 내역 및 안내" onEdit={() => setStep(1)}>
                      <ReviewRow label="제공 서비스" value="3만원 상당의 브런치 세트 (2인 기준)" />
                      <ReviewRow label="방문 위치" value="서울시 노원구 상계동 123-45, 1층" />
                      <ReviewRow label="유의사항" value="방문 하루 전 예약 필수, 주말 방문 불가, 초과 비용 본인 부담" boxed />
                    </ReviewSection>
                    <ReviewSection title="3. 미션 상세 가이드" onEdit={() => setStep(2)} last>
                      <div className="grid gap-1 sm:grid-cols-3 sm:gap-4">
                        <dt className="pt-1 text-sm font-medium text-slate-500">필수 해시태그</dt>
                        <dd className="flex flex-wrap gap-2 text-sm font-medium sm:col-span-2">
                          {["#노원맛집", "#노원역데이트", "#신상카페"].map((tag) => (
                            <span key={tag} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-charcoal">{tag}</span>
                          ))}
                        </dd>
                      </div>
                      <ReviewRow label="콘텐츠 조건" value="사진 최소 15장 이상 포함, 동영상 15초 이상 최소 1개 포함" />
                      <ReviewRow label="상세 가이드" value="매장 외부 간판, 시그니처 메뉴 디테일 컷, 분위기 설명을 포함해주세요." />
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
                      <img className="h-full w-full object-cover" src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_abe3604481_9dd7ad35470b2f2a.png" alt="" />
                      <div className="absolute left-3 top-3 flex gap-1.5">
                        <span className="rounded bg-charcoal/90 px-2 py-1 text-[10px] font-bold text-white">블로그</span>
                        <span className="rounded bg-charcoal/90 px-2 py-1 text-[10px] font-bold text-white">인스타</span>
                      </div>
                      <div className="absolute bottom-3 right-3 rounded bg-white/90 px-2 py-1 text-[10px] font-bold text-primary shadow-sm">D-10</div>
                    </div>
                    <div className="bg-white p-4">
                      <div className="mb-1 text-xs font-medium text-slate-500">노원구 상계동</div>
                      <h4 className="mb-2 line-clamp-2 text-sm font-black leading-tight text-charcoal">[노원역] 신선한 브런치와 커피가 있는 감성 카페 체험단</h4>
                      <p className="mb-3 truncate text-xs text-slate-500">제공: 3만원 상당 브런치 세트</p>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="text-xs text-slate-500">모집 <span className="font-bold text-charcoal">10명</span></div>
                        <div className="rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">모집중</div>
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
              onClick={() => (step === 0 ? history.back() : setStep((currentStep) => currentStep - 1))}
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
                  onClick={() => setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1))}
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
  requiredMark = false
}: {
  name: string;
  label: string;
  placeholder?: string;
  helper?: string;
  icon?: React.ReactNode;
  suffix?: string;
  type?: string;
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
      <dd className={`text-sm sm:col-span-2 ${strong ? "font-black" : "font-medium"} ${boxed ? "rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-600" : "text-charcoal"}`}>{value}</dd>
    </div>
  );
}
