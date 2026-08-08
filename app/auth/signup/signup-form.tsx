"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { BriefcaseBusiness, Camera, CheckCircle2, UserPlus, X } from "lucide-react";
import { LEGAL_EFFECTIVE_DATE, marketingSections, privacySections, termsSections, type LegalSection } from "@/lib/legal";
import { MARKETING_CONSENT_COPY, MARKETING_CONSENT_FOOTNOTE } from "@/lib/messages";
import { emptyFormState, type FormState } from "@/lib/form-errors";
import { FieldError, FieldLabel, FormBanner, FormField, fieldControlClassName } from "@/app/components/form-field";

type SignupRole = "creator" | "business";
type SignupAction = (state: FormState, formData: FormData) => Promise<FormState>;
type NicknameCheckStatus = "idle" | "checking" | "available" | "unavailable" | "error";
type LegalModalType = "terms" | "privacy" | "marketing";

// 공용 FormField로 위임한다. 예전에는 파일마다 입력창을 따로 그려서 에러를 붙일
// 자리가 없었다.
function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
  minLength,
  error,
  defaultValue
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  error?: string;
  defaultValue?: string;
}) {
  return (
    <FormField
      name={name}
      label={label}
      type={type}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      error={error}
      defaultValue={defaultValue}
    />
  );
}

function NicknameField({
  label,
  name,
  placeholder,
  value,
  onChange,
  status,
  message,
  error
}: {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  status: NicknameCheckStatus;
  message: string;
  error?: string;
}) {
  const tone = status === "available" ? "text-emerald-700" : "text-gray-500";

  return (
    <label className="block">
      <FieldLabel required>{label}</FieldLabel>
      <input
        name={name}
        value={value}
        onChange={onChange}
        required
        minLength={2}
        aria-invalid={error ? true : undefined}
        className={fieldControlClassName(error)}
        placeholder={placeholder}
      />
      {/* 서버가 돌려준 에러가 우선한다. 입력 중 확인 결과는 그 다음. */}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : message ? (
        status === "unavailable" || status === "error" ? (
          <FieldError>{message}</FieldError>
        ) : (
          <p className={`mt-2 text-xs font-bold ${tone}`}>{message}</p>
        )
      ) : null}
    </label>
  );
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatBusinessRegistrationNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function BusinessRegistrationField({
  value,
  onChange,
  error
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <FieldLabel required>사업자등록번호</FieldLabel>
      <input
        name="business_registration_number"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(formatBusinessRegistrationNumber(event.target.value))}
        required
        minLength={12}
        maxLength={12}
        aria-invalid={error ? true : undefined}
        className={fieldControlClassName(error)}
        placeholder="000-00-00000"
      />
      <FieldError>{error}</FieldError>
    </label>
  );
}

function PhoneField({
  value,
  onChange,
  error
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <FieldLabel required>전화번호</FieldLabel>
      <input
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={value}
        onChange={(event) => onChange(formatPhone(event.target.value))}
        required
        minLength={12}
        maxLength={13}
        aria-invalid={error ? true : undefined}
        className={fieldControlClassName(error)}
        placeholder="010-0000-0000"
      />
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <p className="mt-2 text-xs font-medium text-gray-400">숫자만 입력해도 자동으로 하이픈이 입력됩니다.</p>
      )}
    </label>
  );
}

function RoleCard({
  role,
  selectedRole,
  icon,
  title,
  description,
  onSelect
}: {
  role: SignupRole;
  selectedRole: SignupRole | null;
  icon: ReactNode;
  title: string;
  description: string;
  onSelect: (role: SignupRole) => void;
}) {
  const selected = role === selectedRole;

  return (
    <button
      type="button"
      onClick={() => onSelect(role)}
      className={`relative flex min-h-[132px] flex-col items-center rounded-xl border-2 p-5 text-center transition-all ${
        selected ? "border-primary bg-primary/5" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <span className={selected ? "text-primary" : "text-gray-400"}>{icon}</span>
      <span className={`mt-3 font-bold ${selected ? "text-charcoal" : "text-gray-600"}`}>{title}</span>
      <span className={`mt-1 text-xs ${selected ? "text-gray-500" : "text-gray-400"}`}>{description}</span>
      {selected ? <CheckCircle2 size={18} className="absolute right-3 top-3 text-primary" /> : null}
    </button>
  );
}

function SectionTitle({ number, children }: { number: number; children: ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-charcoal">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">{number}</span>
      {children}
    </h2>
  );
}

function LegalAgreementModal({
  type,
  onClose
}: {
  type: LegalModalType;
  onClose: () => void;
}) {
  const title = type === "terms" ? "서비스 이용약관" : type === "privacy" ? "개인정보 수집 및 이용" : "마케팅 정보 수신 동의";
  const sections: LegalSection[] = type === "terms" ? termsSections : type === "privacy" ? privacySections : marketingSections;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black text-primary">시행일: {LEGAL_EFFECTIVE_DATE}</p>
            <h2 className="mt-1 text-xl font-black text-charcoal">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-charcoal"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.title} className="space-y-2">
                <h3 className="text-base font-black text-charcoal">{section.title}</h3>
                {section.body ? <p className="text-sm leading-7 text-gray-600">{section.body}</p> : null}
                {section.items ? (
                  <ul className="space-y-2 text-sm leading-7 text-gray-600">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition-colors hover:bg-primaryHover"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export function SignupForm({
  action,
  initialRole
}: {
  action: SignupAction;
  initialRole: SignupRole | null;
}) {
  const [state, formAction, isPending] = useActionState(action, emptyFormState);
  const fieldErrors = state.fieldErrors ?? {};
  const [role, setRole] = useState<SignupRole | null>(initialRole);
  const [creatorNickname, setCreatorNickname] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<NicknameCheckStatus>("idle");
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [legalModal, setLegalModal] = useState<LegalModalType | null>(null);
  const activeNickname = useMemo(
    () => (role === null ? "" : role === "business" ? businessName : creatorNickname).trim(),
    [businessName, creatorNickname, role]
  );

  useEffect(() => {
    if (activeNickname.length === 0) {
      setNicknameStatus("idle");
      setNicknameMessage("");
      return;
    }

    if (activeNickname.length < 2) {
      setNicknameStatus("unavailable");
      setNicknameMessage("닉네임/상호는 2자 이상 입력해주세요.");
      return;
    }

    const controller = new AbortController();
    setNicknameStatus("checking");
    setNicknameMessage("중복 확인 중입니다.");

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/auth/signup/check-nickname?value=${encodeURIComponent(activeNickname)}`, {
          signal: controller.signal
        });
        const result = await response.json() as { available?: boolean; message?: string };

        if (!response.ok) {
          setNicknameStatus("error");
          setNicknameMessage(result.message ?? "닉네임 중복 확인 중 오류가 발생했습니다.");
          return;
        }

        setNicknameStatus(result.available ? "available" : "unavailable");
        setNicknameMessage(result.message ?? (result.available ? "사용 가능한 닉네임입니다." : "이미 사용 중인 닉네임입니다."));
      } catch {
        if (controller.signal.aborted) return;
        setNicknameStatus("error");
        setNicknameMessage("닉네임 중복 확인 중 오류가 발생했습니다.");
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeNickname]);

  // 회원 유형을 고르지 않으면 진행할 수 없다.
  const canSubmit = role !== null && nicknameStatus === "available";

  return (
    <div className="w-full max-w-2xl rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-10">
      {legalModal ? <LegalAgreementModal type={legalModal} onClose={() => setLegalModal(null)} /> : null}

      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserPlus size={22} />
        </div>
        <h1 className="text-3xl font-black text-charcoal">회원가입</h1>
        <p className="mt-3 text-sm text-gray-500">노원멤버스에서 캠페인 참여와 운영을 시작하세요.</p>
      </div>

      {state.formError ? <div className="mb-6"><FormBanner>{state.formError}</FormBanner></div> : null}

      <form action={formAction} className="space-y-8">
        <input type="hidden" name="role" value={role ?? ""} />

        <section>
          <SectionTitle number={1}>회원 유형 선택</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RoleCard
              role="creator"
              selectedRole={role}
              icon={<Camera size={26} />}
              title="크리에이터"
              description="캠페인에 참여해 콘텐츠를 만들어요"
              onSelect={setRole}
            />
            <RoleCard
              role="business"
              selectedRole={role}
              icon={<BriefcaseBusiness size={26} />}
              title="가게·브랜드"
              description="캠페인을 열어 크리에이터를 모집해요"
              onSelect={setRole}
            />
          </div>
          {role === null ? (
            <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-center text-sm font-bold text-gray-500">
              위에서 회원 유형을 선택하면 다음 단계가 이어집니다.
            </p>
          ) : null}
        </section>

        {role === null ? null : (
        <>
        <hr className="border-gray-100" />

        <section className="space-y-5">
          <SectionTitle number={2}>계정 정보</SectionTitle>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <PhoneField value={phone} onChange={setPhone} error={fieldErrors.phone} />
            <Field label="비밀번호" name="password" type="password" placeholder="6자 이상" minLength={6} error={fieldErrors.password} />
          </div>
          <p className="text-xs font-medium text-gray-400">전화번호로 로그인하고, 가입 완료 전 SMS 인증을 진행합니다.</p>
          <Field label="이메일" name="email" type="email" placeholder="example@email.com" required={false} error={fieldErrors.email} defaultValue={state.values?.email} />
          <p className="text-xs font-medium text-gray-400">이메일은 계정 안내와 알림을 위한 선택 입력입니다.</p>
        </section>

        <hr className="border-gray-100" />

        <section className="space-y-5">
          <SectionTitle number={3}>{role === "business" ? "가게 정보" : "크리에이터 정보"}</SectionTitle>
          {role === "business" ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <NicknameField
                  label="상호"
                  name="business_name"
                  placeholder="노원역 감성카페"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  status={nicknameStatus}
                  message={role === "business" ? nicknameMessage : ""}
                  error={fieldErrors.business_name}
                />
                <BusinessRegistrationField
                  value={businessRegistrationNumber}
                  onChange={setBusinessRegistrationNumber}
                  error={fieldErrors.business_registration_number}
                />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="담당자명" name="manager_name" placeholder="홍길동" error={fieldErrors.manager_name} defaultValue={state.values?.manager_name} />
                <Field label="추천코드" name="referral_code" placeholder="추천코드가 있다면 입력" required={false} defaultValue={state.values?.referral_code} />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <NicknameField
                  label="닉네임"
                  name="nickname"
                  placeholder="노원리뷰어"
                  value={creatorNickname}
                  onChange={(event) => setCreatorNickname(event.target.value)}
                  status={nicknameStatus}
                  message={role === "creator" ? nicknameMessage : ""}
                  error={fieldErrors.nickname}
                />
                <Field label="이름" name="name" placeholder="홍길동" error={fieldErrors.name} defaultValue={state.values?.name} />
              </div>
            </>
          )}
        </section>

        <hr className="border-gray-100" />

        <section
          className={`space-y-4 rounded-xl border bg-gray-50 p-5 ${
            fieldErrors.agreement ? "border-red-300" : "border-gray-200"
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input name="agreement_terms" type="checkbox" required className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm font-bold text-charcoal">
              (필수) <button type="button" onClick={(event) => { event.preventDefault(); setLegalModal("terms"); }} className="text-primary underline underline-offset-2">서비스 이용약관</button> 동의
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input name="agreement_privacy" type="checkbox" required className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm font-bold text-charcoal">
              (필수) <button type="button" onClick={(event) => { event.preventDefault(); setLegalModal("privacy"); }} className="text-primary underline underline-offset-2">개인정보 수집 및 이용</button> 동의
            </span>
          </label>
          {/* 받게 될 내용이 곧 가입 이유인데 '마케팅 정보 수신'이라고만 적혀 있어 아무도
              누르지 않았다. 무엇을 받는지 그대로 적고, 필수 항목과 같은 무게로 보이게 한다.
              가게는 캠페인을 여는 쪽이라 크리에이터와 받을 내용이 다르다. */}
          <label className="flex cursor-pointer items-start gap-3">
            <input name="agreement_marketing" type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm font-bold text-charcoal">
              (선택) {MARKETING_CONSENT_COPY[role].title}
              <span className="mt-1 block break-keep text-xs font-medium leading-relaxed text-gray-500">
                {MARKETING_CONSENT_COPY[role].description} {MARKETING_CONSENT_FOOTNOTE}{" "}
                <button type="button" onClick={(event) => { event.preventDefault(); setLegalModal("marketing"); }} className="text-primary underline underline-offset-2">마케팅 정보 수신 동의</button> 내용 보기
              </span>
            </span>
          </label>
          <FieldError>{fieldErrors.agreement}</FieldError>
        </section>
        </>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={!canSubmit || isPending}
            className="w-full rounded-xl bg-primary px-5 py-4 font-black text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            {isPending ? "인증 문자 보내는 중..." : role === null ? "회원 유형을 선택해주세요" : "인증 문자 보내기"}
          </button>
          <p className="mt-3 text-center text-xs font-bold text-gray-400">입력한 전화번호로 인증번호를 보낸 뒤, 같은 회원가입 페이지에서 인증을 완료합니다.</p>
          <p className="mt-4 text-center text-sm text-gray-500">
            이미 계정이 있으신가요? <Link href="/auth" className="font-bold text-primary hover:underline">로그인</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
