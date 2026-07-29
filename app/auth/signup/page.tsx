import { signUp } from "../actions";
import { SignupForm } from "./signup-form";
import { SignupPhoneVerification } from "./signup-phone-verification";

function normalizeRole(value?: string): "creator" | "business" {
  return value === "business" ? "business" : "creator";
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
        <SignupPhoneVerification role={safeRole} phone={phone} />
      ) : (
        <SignupForm action={signUp} initialRole={safeRole} />
      )}
    </main>
  );
}
