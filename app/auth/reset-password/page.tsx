import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PasswordResetRequestForm } from "./request-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  return (
    <main className="flex items-center justify-center bg-[#F8F9FA] px-4 py-14 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><KeyRound size={22} /></div>
          <h1 className="text-2xl font-black text-charcoal">비밀번호 찾기</h1>
          <p className="mt-2 text-sm text-gray-500">가입한 휴대폰 번호로 본인 인증을 진행합니다.</p>
        </div>
        {message ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-700">{message}</p> : null}
        <PasswordResetRequestForm />
        <p className="mt-5 text-center text-sm text-gray-500"><Link href="/auth" className="font-bold text-primary hover:underline">로그인으로 돌아가기</Link></p>
      </section>
    </main>
  );
}
