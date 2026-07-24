"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { BriefcaseBusiness, Camera, CheckCircle2, UserPlus } from "lucide-react";

type SignupRole = "creator" | "business";
type SignupAction = (formData: FormData) => void | Promise<void>;
type NicknameCheckStatus = "idle" | "checking" | "available" | "unavailable" | "error";

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
  minLength,
  defaultValue
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-bold text-gray-700">
        {label} {required ? <span className="text-primary">*</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder={placeholder}
      />
    </label>
  );
}

function NicknameField({
  label,
  name,
  placeholder,
  value,
  onChange,
  status,
  message
}: {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  status: NicknameCheckStatus;
  message: string;
}) {
  const tone = status === "available" ? "text-emerald-700" : status === "checking" ? "text-gray-500" : "text-primary";

  return (
    <label className="block space-y-2">
      <span className="block text-sm font-bold text-gray-700">
        {label} <span className="text-primary">*</span>
      </span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        required
        minLength={2}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder={placeholder}
      />
      {message ? <p className={`text-xs font-bold ${tone}`}>{message}</p> : null}
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
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-bold text-gray-700">
        사업자등록번호 <span className="text-primary">*</span>
      </span>
      <input
        name="business_registration_number"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(formatBusinessRegistrationNumber(event.target.value))}
        required
        minLength={12}
        maxLength={12}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder="000-00-00000"
      />
    </label>
  );
}

function PhoneField({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-bold text-gray-700">
        전화번호 <span className="text-primary">*</span>
      </span>
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
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder="010-0000-0000"
      />
      <p className="text-xs font-medium text-gray-400">숫자만 입력해도 자동으로 하이픈이 입력됩니다.</p>
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
  selectedRole: SignupRole;
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

export function SignupForm({
  action,
  error,
  initialRole,
  initialValues
}: {
  action: SignupAction;
  error?: string;
  initialRole: SignupRole;
  initialValues?: {
    email?: string;
    phone?: string;
    nickname?: string;
    name?: string;
    businessName?: string;
    businessRegistrationNumber?: string;
    managerName?: string;
    referralCode?: string;
    agreedTerms?: boolean;
    agreedPrivacy?: boolean;
    agreedMarketing?: boolean;
  };
}) {
  const [role, setRole] = useState<SignupRole>(initialRole);
  const [creatorNickname, setCreatorNickname] = useState(initialValues?.nickname ?? "");
  const [businessName, setBusinessName] = useState(initialValues?.businessName ?? "");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState(initialValues?.businessRegistrationNumber ?? "");
  const [phone, setPhone] = useState(initialValues?.phone ?? "");
  const [nicknameStatus, setNicknameStatus] = useState<NicknameCheckStatus>("idle");
  const [nicknameMessage, setNicknameMessage] = useState("");
  const activeNickname = useMemo(
    () => (role === "business" ? businessName : creatorNickname).trim(),
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

  const canSubmit = nicknameStatus === "available";

  return (
    <div className="w-full max-w-2xl rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-10">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserPlus size={22} />
        </div>
        <h1 className="text-3xl font-black text-charcoal">회원가입</h1>
        <p className="mt-3 text-sm text-gray-500">노원멤버스에서 캠페인 참여와 운영을 시작하세요.</p>
      </div>

      {error ? <p className="mb-6 rounded-xl bg-primary/10 p-4 text-sm font-bold text-primary">{error}</p> : null}

      <form action={action} className="space-y-8">
        <input type="hidden" name="role" value={role} />

        <section>
          <SectionTitle number={1}>회원 유형 선택</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RoleCard
              role="creator"
              selectedRole={role}
              icon={<Camera size={26} />}
              title="크리에이터"
              description="캠페인 참여 및 콘텐츠 제출"
              onSelect={setRole}
            />
            <RoleCard
              role="business"
              selectedRole={role}
              icon={<BriefcaseBusiness size={26} />}
              title="캠페인 운영자"
              description="캠페인 등록 및 지원자 관리"
              onSelect={setRole}
            />
          </div>
        </section>

        <hr className="border-gray-100" />

        <section className="space-y-5">
          <SectionTitle number={2}>계정 정보</SectionTitle>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <PhoneField value={phone} onChange={setPhone} />
            <Field label="비밀번호" name="password" type="password" placeholder="6자 이상" minLength={6} />
          </div>
          <p className="text-xs font-medium text-gray-400">전화번호로 로그인하고, 가입 완료 전 SMS 인증을 진행합니다.</p>
          <Field label="이메일" name="email" type="email" placeholder="example@email.com" required={false} defaultValue={initialValues?.email} />
          <p className="text-xs font-medium text-gray-400">이메일은 계정 안내와 알림을 위한 선택 입력입니다.</p>
        </section>

        <hr className="border-gray-100" />

        <section className="space-y-5">
          <SectionTitle number={3}>{role === "business" ? "운영자 정보" : "크리에이터 정보"}</SectionTitle>
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
                />
                <BusinessRegistrationField value={businessRegistrationNumber} onChange={setBusinessRegistrationNumber} />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="담당자명" name="manager_name" placeholder="홍길동" defaultValue={initialValues?.managerName} />
                <Field label="추천코드" name="referral_code" placeholder="추천코드가 있다면 입력" required={false} defaultValue={initialValues?.referralCode} />
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
                />
                <Field label="이름" name="name" placeholder="홍길동" defaultValue={initialValues?.name} />
              </div>
            </>
          )}
        </section>

        <hr className="border-gray-100" />

        <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input name="agreement_terms" type="checkbox" required defaultChecked={initialValues?.agreedTerms} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm font-bold text-charcoal">(필수) 서비스 이용약관 동의</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input name="agreement_privacy" type="checkbox" required defaultChecked={initialValues?.agreedPrivacy} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm font-bold text-charcoal">(필수) 개인정보 수집 및 이용 동의</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input name="agreement_marketing" type="checkbox" defaultChecked={initialValues?.agreedMarketing} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm text-gray-600">(선택) 맞춤 캠페인 추천 알림 수신 동의</span>
          </label>
        </section>

        <div className="pt-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-primary px-5 py-4 font-black text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            인증 문자 보내기
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
