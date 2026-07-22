"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BriefcaseBusiness, Camera, CheckCircle2, UserPlus } from "lucide-react";

type SignupRole = "creator" | "business";
type SignupAction = (formData: FormData) => void | Promise<void>;

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
  minLength
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
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
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder={placeholder}
      />
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
  initialRole
}: {
  action: SignupAction;
  error?: string;
  initialRole: SignupRole;
}) {
  const [role, setRole] = useState<SignupRole>(initialRole);

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
            <Field label="이메일" name="email" type="email" placeholder="example@email.com" />
            <Field label="비밀번호" name="password" type="password" placeholder="6자 이상" minLength={6} />
          </div>
        </section>

        <hr className="border-gray-100" />

        <section className="space-y-5">
          <SectionTitle number={3}>{role === "business" ? "운영자 정보" : "크리에이터 정보"}</SectionTitle>
          {role === "business" ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="상호" name="business_name" placeholder="노원역 감성카페" />
                <Field label="사업자등록번호" name="business_registration_number" placeholder="000-00-00000" />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="담당자명" name="manager_name" placeholder="홍길동" />
                <Field label="전화번호" name="phone" type="tel" placeholder="010-0000-0000" />
              </div>
              <Field label="추천코드" name="referral_code" placeholder="추천코드가 있다면 입력" required={false} />
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="닉네임" name="nickname" placeholder="노원리뷰어" />
                <Field label="이름" name="name" placeholder="홍길동" />
              </div>
              <Field label="전화번호" name="phone" type="tel" placeholder="010-0000-0000" />
            </>
          )}
        </section>

        <hr className="border-gray-100" />

        <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input name="agreement_terms" type="checkbox" required className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm font-bold text-charcoal">(필수) 서비스 이용약관 동의</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input name="agreement_privacy" type="checkbox" required className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm font-bold text-charcoal">(필수) 개인정보 수집 및 이용 동의</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input name="agreement_marketing" type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm text-gray-600">(선택) 맞춤 캠페인 추천 알림 수신 동의</span>
          </label>
        </section>

        <div className="pt-2">
          <button type="submit" className="w-full rounded-xl bg-primary px-5 py-4 font-black text-white shadow-sm transition-colors hover:bg-primaryHover">
            가입 완료하기
          </button>
          <p className="mt-4 text-center text-sm text-gray-500">
            이미 계정이 있으신가요? <Link href="/auth" className="font-bold text-primary hover:underline">로그인</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
