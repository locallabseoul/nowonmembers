import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { isKoreanMobilePhoneNumber, normalizePhoneNumber } from "@/lib/auth/phone";
import { PasswordResetVerifyForm } from "./verify-form";

export default async function ResetPasswordVerifyPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const { phone: rawPhone = "" } = await searchParams;
  const phone = normalizePhoneNumber(rawPhone);
  if (!isKoreanMobilePhoneNumber(phone)) redirect("/auth/reset-password");
  return (
    <main className="flex items-center justify-center bg-[#F8F9FA] px-4 py-14 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck size={22} /></div>
          <h1 className="text-2xl font-black text-charcoal">인증번호 확인</h1>
          <p className="mt-2 text-sm text-gray-500">가입된 번호라면 문자로 인증번호를 보냈습니다.</p>
        </div>
        <PasswordResetVerifyForm phone={phone} />
        <p className="mt-5 text-center text-sm text-gray-500">번호가 잘못되었나요? <Link href="/auth/reset-password" className="font-bold text-primary hover:underline">다시 입력하기</Link></p>
      </section>
    </main>
  );
}
