import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PhoneOtpForm } from "../phone-otp-form";

type SignupRole = "creator" | "business";

export function SignupPhoneVerification({ role, phone }: { role: SignupRole; phone: string }) {
  return (
    <section className="w-full max-w-md rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck size={22} />
        </div>
        <h1 className="text-2xl font-black text-charcoal">전화번호 인증</h1>
        <p className="mt-2 text-sm text-gray-500">회원가입 마지막 단계입니다. 문자로 받은 인증번호를 입력해주세요.</p>
      </div>

      <PhoneOtpForm role={role} phone={phone} source="signup" submitLabel="인증 완료하고 시작하기" />

      <p className="mt-5 text-center text-sm text-gray-500">
        번호를 다시 입력해야 하나요?{" "}
        <Link href={`/auth/signup?role=${role}`} className="font-bold text-primary hover:underline">
          회원가입 다시하기
        </Link>
      </p>
    </section>
  );
}
