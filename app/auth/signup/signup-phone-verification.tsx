import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { resendAuthPhoneOtp, verifyAuthPhoneOtp } from "../actions";

type SignupRole = "creator" | "business";

export function SignupPhoneVerification({
  role,
  phone,
  error,
  message
}: {
  role: SignupRole;
  phone: string;
  error?: string;
  message?: string;
}) {
  return (
    <section className="w-full max-w-md rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck size={22} />
        </div>
        <h1 className="text-2xl font-black text-charcoal">전화번호 인증</h1>
        <p className="mt-2 text-sm text-gray-500">회원가입 마지막 단계입니다. 문자로 받은 인증번호를 입력해주세요.</p>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm font-bold text-primary">{error}</p> : null}
      {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}

      <form action={verifyAuthPhoneOtp} className="mt-6 space-y-4">
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="type" value="sms" />
        <input type="hidden" name="source" value="signup" />
        <label className="block">
          <span className="mb-2 block text-sm font-black text-charcoal">전화번호</span>
          <input value={phone} readOnly className="w-full rounded-lg border border-line bg-gray-50 px-4 py-3 text-sm text-gray-500" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black text-charcoal">인증번호</span>
          <input name="token" inputMode="numeric" autoComplete="one-time-code" required className="w-full rounded-lg border border-line px-4 py-3 text-sm focus-ring" placeholder="6자리 인증번호" />
        </label>
        <button className="w-full rounded-xl bg-primary px-5 py-3 font-black text-white shadow-sm transition-colors hover:bg-primaryHover">인증 완료하고 시작하기</button>
      </form>

      <form action={resendAuthPhoneOtp} className="mt-3">
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="type" value="sms" />
        <input type="hidden" name="source" value="signup" />
        <button className="w-full rounded-xl border border-line bg-white px-5 py-3 text-sm font-black text-charcoal transition-colors hover:border-primary hover:text-primary">
          인증번호 다시 보내기
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        번호를 다시 입력해야 하나요?{" "}
        <Link href={`/auth/signup?role=${role}`} className="font-bold text-primary hover:underline">
          회원가입 다시하기
        </Link>
      </p>
    </section>
  );
}
