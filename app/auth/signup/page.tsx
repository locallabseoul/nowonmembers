import { signUp } from "../actions";
import { SignupForm } from "./signup-form";

function normalizeRole(value?: string): "creator" | "business" {
  return value === "business" ? "business" : "creator";
}

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ role?: string; error?: string }>;
}) {
  const { role, error } = await searchParams;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      <SignupForm action={signUp} error={error} initialRole={normalizeRole(role)} />
    </main>
  );
}
