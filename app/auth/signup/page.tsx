import { signUp } from "../actions";
import { SignupForm } from "./signup-form";
import { SignupPhoneVerification } from "./signup-phone-verification";

// 고르지 않은 상태를 그대로 넘긴다. 예전에는 값이 없으면 크리에이터로 채워서,
// 사장님이 회원 유형을 지나치면 크리에이터로 가입됐다.
function normalizeRole(value?: string): "creator" | "business" | null {
  if (value === "business") return "business";
  if (value === "creator") return "creator";

  return null;
}

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ role?: string; phone?: string; verify?: string }>;
}) {
  // 입력값을 URL로 되돌리던 파라미터는 더 이상 필요 없다. 검증에 걸려도 화면이
  // 그대로 남아 입력한 내용이 유지된다.
  const { role, phone = "", verify } = await searchParams;
  const safeRole = normalizeRole(role);

  return (
    <main className="flex items-center justify-center bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      {verify === "phone" ? (
        <SignupPhoneVerification role={safeRole ?? "creator"} phone={phone} />
      ) : (
        <SignupForm action={signUp} initialRole={safeRole} />
      )}
    </main>
  );
}
