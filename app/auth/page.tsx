import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { SignInForm } from "./sign-in-form";

function getSafeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "";
  }

  return next;
}

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ message?: string; next?: string }> }) {
  const { message, next } = await searchParams;
  const safeNext = getSafeNext(next);

  return (
    <main className="flex items-center justify-center bg-[#F8F9FA] px-4 py-14 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LogIn size={22} />
          </div>
          <h1 className="text-2xl font-black text-charcoal">로그인</h1>
          <p className="mt-2 text-sm text-gray-500">가입한 전화번호로 캠페인과 프로필을 관리합니다.</p>
        </div>
        {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
        <SignInForm next={safeNext} />
        <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
          <p className="text-sm font-medium text-gray-500">아직 계정이 없으신가요?</p>
          <Link href="/auth/signup" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-white px-5 py-3 text-sm font-black text-primary transition-colors hover:bg-primary/5">
            <UserPlus size={16} />
            회원가입
          </Link>
        </div>
      </section>
    </main>
  );
}
