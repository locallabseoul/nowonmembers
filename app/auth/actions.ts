"use server";

import { redirect } from "next/navigation";
import { getAccountPath } from "@/lib/auth/guards";
import { normalizePhoneNumber, toKoreanE164Phone } from "@/lib/auth/phone";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function profilePathForRole(role: "business" | "creator") {
  return role === "business" ? "/business/dashboard" : "/creator/profile";
}

function getSafeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}

function appendSignupFormState(params: URLSearchParams, formData?: FormData) {
  if (!formData) return;

  const preservedFields = [
    "email",
    "phone",
    "nickname",
    "name",
    "business_name",
    "business_registration_number",
    "manager_name",
    "referral_code"
  ];

  for (const field of preservedFields) {
    const value = String(formData.get(field) ?? "").trim();
    if (value) params.set(field, value);
  }

  for (const agreement of ["agreement_terms", "agreement_privacy", "agreement_marketing"]) {
    if (formData.get(agreement) === "on") params.set(agreement, "on");
  }
}

function getSignupRedirect(role: "business" | "creator", error: string, formData?: FormData) {
  const params = new URLSearchParams({ role, error });
  appendSignupFormState(params, formData);

  return `/auth/signup?${params.toString()}`;
}

function getSignupPhoneVerifyRedirect(role: "business" | "creator", phone: string, message: string) {
  const params = new URLSearchParams({
    role,
    verify: "phone",
    phone,
    message
  });

  return `/auth/signup?${params.toString()}`;
}

function getDuplicateSignupMessage(error: { code?: string; message?: string; status?: number } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";

  if (message.includes("profiles_nickname_normalized_unique") || message.includes("nickname")) {
    return "이미 사용 중인 닉네임입니다.";
  }

  if (message.includes("profiles_phone_normalized_unique") || message.includes("phone")) {
    return "이미 가입된 전화번호입니다.";
  }

  if (
    message.includes("profiles_email_normalized_unique") ||
    message.includes("email")
  ) {
    return "이미 가입된 이메일입니다.";
  }

  if (
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already registered") ||
    error?.status === 422
  ) {
    return "이미 가입되었거나 인증 대기 중인 전화번호입니다.";
  }

  if (error?.code === "23505" || message.includes("duplicate") || message.includes("unique")) {
    return "이미 사용 중인 정보가 있습니다.";
  }

  return null;
}

function requiredText(formData: FormData, name: string, label: string, role: "business" | "creator") {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) redirect(getSignupRedirect(role, `${label}을(를) 입력해주세요.`, formData));

  return value;
}

function normalizePhone(phone: string) {
  return normalizePhoneNumber(phone);
}

function normalizeBusinessRegistrationNumber(value: string) {
  return value.replace(/\D/g, "");
}

function getUserMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function getSignupRole(metadata: Record<string, unknown> | undefined, fallback: "business" | "creator") {
  return getUserMetadataString(metadata, "role") === "business" ? "business" : fallback;
}

function getAuthOtpErrorMessage(error: { message?: string; status?: number } | null | undefined) {
  const message = error?.message ?? "";
  const lower = message.toLowerCase();

  if (error?.status === 429 || lower.includes("rate limit") || lower.includes("too many")) {
    return "인증번호 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.";
  }

  if (lower.includes("phone")) return "전화번호를 확인해주세요.";
  if (lower.includes("sms") || lower.includes("provider") || lower.includes("twilio")) {
    return "문자 발송 설정을 확인해주세요.";
  }

  return message || "인증번호 발송 중 오류가 발생했습니다.";
}

export async function signIn(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = getSafeNext(String(formData.get("next") ?? ""));
  const authPhone = toKoreanE164Phone(phone);

  const supabase = await createSupabaseServerClient();
  const { data, error } = authPhone
    ? await supabase.auth.signInWithPassword({ phone: authPhone, password })
    : { data: { user: null }, error: new Error("전화번호를 정확히 입력해주세요.") };

  if (error) {
    const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";
    redirect(`/auth?mode=signin&error=${encodeURIComponent(error.message)}${nextParam}`);
  }

  if (next) redirect(next);

  const { data: profile } = data.user
    ? await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle()
    : { data: null };

  redirect(getAccountPath(profile?.role));
}

export async function signUp(formData: FormData) {
  const rawRole = String(formData.get("role") ?? "creator");
  const role: "business" | "creator" = rawRole === "business" ? "business" : "creator";
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const password = requiredText(formData, "password", "비밀번호", role);
  const agreedTerms = formData.get("agreement_terms") === "on";
  const agreedPrivacy = formData.get("agreement_privacy") === "on";

  if (!agreedTerms || !agreedPrivacy) {
    redirect(getSignupRedirect(role, "필수 약관에 동의해주세요.", formData));
  }

  if (password.length < 6) {
    redirect(getSignupRedirect(role, "비밀번호는 6자 이상이어야 합니다.", formData));
  }

  const nickname = role === "business"
    ? requiredText(formData, "business_name", "상호", role)
    : requiredText(formData, "nickname", "닉네임", role);
  const name = role === "business"
    ? requiredText(formData, "manager_name", "담당자명", role)
    : requiredText(formData, "name", "이름", role);
  const phone = normalizePhone(requiredText(formData, "phone", "전화번호", role));
  if (phone.length < 10 || phone.length > 11) {
    redirect(getSignupRedirect(role, "전화번호를 정확히 입력해주세요.", formData));
  }
  const authPhone = toKoreanE164Phone(phone);
  if (!authPhone) {
    redirect(getSignupRedirect(role, "전화번호를 정확히 입력해주세요.", formData));
  }

  const businessRegistrationNumber = role === "business"
    ? normalizeBusinessRegistrationNumber(requiredText(formData, "business_registration_number", "사업자등록번호", role))
    : null;
  if (role === "business" && businessRegistrationNumber?.length !== 10) {
    redirect(getSignupRedirect(role, "사업자등록번호를 정확히 입력해주세요.", formData));
  }

  const referralCode = role === "business" ? String(formData.get("referral_code") ?? "").trim() || null : null;
  const supabase = await createSupabaseServerClient();
  if (email) {
    const { data: isEmailAvailable, error: emailAvailabilityError } = await supabase.rpc("is_signup_email_available", {
      target_email: email
    });

    if (emailAvailabilityError) {
      redirect(getSignupRedirect(role, "이메일 중복 확인 중 오류가 발생했습니다.", formData));
    }

    if (!isEmailAvailable) {
      redirect(getSignupRedirect(role, "이미 가입된 이메일입니다.", formData));
    }
  }

  const { data: isNicknameAvailable, error: nicknameAvailabilityError } = await supabase.rpc(
    "is_signup_nickname_available",
    {
      target_nickname: nickname
    }
  );

  if (nicknameAvailabilityError) {
    redirect(getSignupRedirect(role, "닉네임 중복 확인 중 오류가 발생했습니다.", formData));
  }

  if (!isNicknameAvailable) {
    redirect(getSignupRedirect(role, "이미 사용 중인 닉네임입니다.", formData));
  }

  const { data: isPhoneAvailable, error: phoneAvailabilityError } = await supabase.rpc("is_signup_phone_available", {
    target_phone: phone
  });

  if (phoneAvailabilityError) {
    redirect(getSignupRedirect(role, "전화번호 중복 확인 중 오류가 발생했습니다.", formData));
  }

  if (!isPhoneAvailable) {
    redirect(getSignupRedirect(role, "이미 가입된 전화번호입니다.", formData));
  }

  const { data, error } = await supabase.auth.signUp({
    phone: authPhone,
    password,
    options: {
      channel: "sms",
      data: {
        role,
        nickname,
        name,
        email,
        phone,
        business_registration_number: businessRegistrationNumber,
        referral_code: referralCode
      }
    }
  });

  if (error) {
    const duplicateMessage = getDuplicateSignupMessage(error);

    if (duplicateMessage?.includes("전화번호")) {
      const { data: signInData } = await supabase.auth.signInWithPassword({
        phone: authPhone,
        password
      });

      if (signInData.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: signInData.user.id,
          email,
          role,
          nickname,
          name,
          phone,
          business_registration_number: businessRegistrationNumber,
          referral_code: referralCode,
          verification_status: "pending",
          status: "active"
        }, { onConflict: "id" });

        if (profileError) {
          redirect(getSignupRedirect(role, getDuplicateSignupMessage(profileError) ?? profileError.message, formData));
        }

        redirect(profilePathForRole(role));
      }

      const { error: resendError } = await supabase.auth.resend({
        type: "sms",
        phone: authPhone
      });

      if (resendError) {
        redirect(`${getSignupPhoneVerifyRedirect(role, phone, "")}&error=${encodeURIComponent(getAuthOtpErrorMessage(resendError))}`);
      }

      redirect(getSignupPhoneVerifyRedirect(role, phone, "인증번호를 다시 보냈습니다."));
    }

    redirect(getSignupRedirect(role, duplicateMessage ?? error.message, formData));
  }

  if (!data.user) {
    redirect(getSignupRedirect(role, "전화번호 회원가입 요청이 생성되지 않았습니다. Phone Provider 설정을 확인해주세요.", formData));
  }

  redirect(`/auth/signup?role=${role}&verify=phone&phone=${encodeURIComponent(phone)}&message=${encodeURIComponent("문자로 받은 인증번호를 입력해주세요.")}`);
}

export async function verifyAuthPhoneOtp(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const token = String(formData.get("token") ?? "").trim();
  const rawRole = String(formData.get("role") ?? "creator");
  const role: "business" | "creator" = rawRole === "business" ? "business" : "creator";
  const rawType = String(formData.get("type") ?? "sms");
  const type: "sms" | "phone_change" = rawType === "phone_change" ? "phone_change" : "sms";
  const source = String(formData.get("source") ?? "");
  const next = getSafeNext(String(formData.get("next") ?? "")) ?? profilePathForRole(role);
  const authPhone = toKoreanE164Phone(phone);
  const errorRedirect = source === "signup"
    ? `/auth/signup?role=${role}&verify=phone&phone=${encodeURIComponent(phone)}`
    : `/auth/verify-phone?role=${role}&phone=${encodeURIComponent(phone)}&type=${type}&next=${encodeURIComponent(next)}`;

  if (!authPhone || !token) {
    redirect(`${errorRedirect}&error=${encodeURIComponent("전화번호와 인증번호를 확인해주세요.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone: authPhone,
    token,
    type
  });

  if (error) {
    redirect(`${errorRedirect}&error=${encodeURIComponent(error.message)}`);
  }

  if (!data.user || !data.session) {
    redirect(`${errorRedirect}&error=${encodeURIComponent("전화번호 인증은 처리되었지만 로그인 세션이 생성되지 않았습니다. Phone Provider 설정과 인증번호 유형을 확인해주세요.")}`);
  }

  {
    const metadata = data.user.user_metadata as Record<string, unknown> | undefined;
    const verifiedRole = getSignupRole(metadata, role);
    const verifiedPhone = normalizePhone(getUserMetadataString(metadata, "phone") || phone);
    const verifiedEmail = getUserMetadataString(metadata, "email") || data.user.email || null;
    const businessRegistrationNumber = getUserMetadataString(metadata, "business_registration_number") || null;
    const referralCode = getUserMetadataString(metadata, "referral_code") || null;
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      email: verifiedEmail,
      role: verifiedRole,
      nickname: getUserMetadataString(metadata, "nickname"),
      name: getUserMetadataString(metadata, "name"),
      phone: verifiedPhone,
      business_registration_number: businessRegistrationNumber,
      referral_code: referralCode,
      verification_status: "pending",
      status: "active"
    }, { onConflict: "id" });

    if (profileError) {
      redirect(`${errorRedirect}&error=${encodeURIComponent(getDuplicateSignupMessage(profileError) ?? profileError.message)}`);
    }
  }

  redirect(next);
}

export async function resendAuthPhoneOtp(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const rawRole = String(formData.get("role") ?? "creator");
  const role: "business" | "creator" = rawRole === "business" ? "business" : "creator";
  const rawType = String(formData.get("type") ?? "sms");
  const type: "sms" | "phone_change" = rawType === "phone_change" ? "phone_change" : "sms";
  const source = String(formData.get("source") ?? "");
  const next = getSafeNext(String(formData.get("next") ?? "")) ?? profilePathForRole(role);
  const authPhone = toKoreanE164Phone(phone);
  const baseRedirect = source === "signup"
    ? `/auth/signup?role=${role}&verify=phone&phone=${encodeURIComponent(phone)}`
    : `/auth/verify-phone?role=${role}&phone=${encodeURIComponent(phone)}&type=${type}&next=${encodeURIComponent(next)}`;

  if (!authPhone) {
    redirect(`${baseRedirect}&error=${encodeURIComponent("전화번호를 정확히 입력해주세요.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type,
    phone: authPhone
  });

  if (error) {
    redirect(`${baseRedirect}&error=${encodeURIComponent(getAuthOtpErrorMessage(error))}`);
  }

  redirect(`${baseRedirect}&message=${encodeURIComponent("인증번호를 다시 보냈습니다.")}`);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
