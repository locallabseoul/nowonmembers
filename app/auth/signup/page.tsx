import { signUp } from "../actions";
import { SignupForm } from "./signup-form";
import { SignupPhoneVerification } from "./signup-phone-verification";

function normalizeRole(value?: string): "creator" | "business" {
  return value === "business" ? "business" : "creator";
}

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ role?: string; error?: string; message?: string; phone?: string; verify?: string }>;
}) {
  const { role, error, message, phone = "", verify } = await searchParams;
  const safeRole = normalizeRole(role);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      {verify === "phone" ? (
        <SignupPhoneVerification role={safeRole} phone={phone} error={error} message={message} />
      ) : (
        <SignupForm action={signUp} error={error} initialRole={safeRole} />
      )}
    </main>
  );
}
