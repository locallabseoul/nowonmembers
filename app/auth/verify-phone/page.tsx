import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PhoneOtpForm } from "../phone-otp-form";

function getSafeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "";
  }

  return next;
}

function normalizeRole(value?: string): "creator" | "business" | "resident" {
  if (value === "business") return "business";
  if (value === "resident") return "resident";
  return "creator";
}

export default async function VerifyPhonePage({
  searchParams
}: {
  searchParams: Promise<{ role?: string; phone?: string; type?: string; next?: string }>;
}) {
  const { role, phone = "", type = "sms", next } = await searchParams;
  const safeRole = normalizeRole(role);
  const safeNext = getSafeNext(next);
  const safeType = type === "phone_change" ? "phone_change" : "sms";

  return (
    <main className="flex items-center justify-center bg-[#F8F9FA] px-4 py-14 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck size={22} />
          </div>
          <h1 className="text-2xl font-black text-charcoal">전화번호 인증</h1>
          <p className="mt-2 text-sm text-gray-500">문자로 받은 인증번호를 입력하면 가입이 완료됩니다.</p>
        </div>

        <PhoneOtpForm
          role={safeRole}
          phone={phone}
          type={safeType}
          next={safeNext}
          submitLabel="인증 완료하기"
        />

        <p className="mt-5 text-center text-sm text-gray-500">
          번호가 잘못되었나요? <Link href="/auth/signup" className="font-bold text-primary hover:underline">회원가입 다시하기</Link>
        </p>
      </section>
    </main>
  );
}
