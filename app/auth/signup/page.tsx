import { signUp } from "../actions";
import { SignupForm } from "./signup-form";
import { SignupPhoneVerification } from "./signup-phone-verification";

function normalizeRole(value?: string): "creator" | "business" {
  return value === "business" ? "business" : "creator";
}

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{
    role?: string;
    error?: string;
    message?: string;
    phone?: string;
    verify?: string;
    email?: string;
    nickname?: string;
    name?: string;
    business_name?: string;
    business_registration_number?: string;
    manager_name?: string;
    referral_code?: string;
    agreement_terms?: string;
    agreement_privacy?: string;
    agreement_marketing?: string;
  }>;
}) {
  const {
    role,
    error,
    message,
    phone = "",
    verify,
    email = "",
    nickname = "",
    name = "",
    business_name = "",
    business_registration_number = "",
    manager_name = "",
    referral_code = "",
    agreement_terms,
    agreement_privacy,
    agreement_marketing
  } = await searchParams;
  const safeRole = normalizeRole(role);

  return (
    <main className="flex items-center justify-center bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      {verify === "phone" ? (
        <SignupPhoneVerification role={safeRole} phone={phone} error={error} message={message} />
      ) : (
        <SignupForm
          action={signUp}
          error={error}
          initialRole={safeRole}
          initialValues={{
            email,
            phone,
            nickname,
            name,
            businessName: business_name,
            businessRegistrationNumber: business_registration_number,
            managerName: manager_name,
            referralCode: referral_code,
            agreedTerms: agreement_terms === "on",
            agreedPrivacy: agreement_privacy === "on",
            agreedMarketing: agreement_marketing === "on"
          }}
        />
      )}
    </main>
  );
}
