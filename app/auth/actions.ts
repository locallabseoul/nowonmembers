"use server";

import { redirect } from "next/navigation";
import { getAccountPath } from "@/lib/auth/guards";
import { normalizePhoneNumber, toKoreanE164Phone } from "@/lib/auth/phone";
import { collectFieldErrors, fieldError, hasErrors, keepValues, type FormState } from "@/lib/form-errors";
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

// 중복 메시지를 어느 입력창에 붙일지까지 함께 정한다. 필드를 특정하지 못하면 폼 상단
// 배너로 보여준다.
function getDuplicateSignupField(message: string, nicknameField: string) {
  if (message.includes("닉네임")) return nicknameField;
  if (message.includes("전화번호")) return "phone";
  if (message.includes("이메일")) return "email";
  return null;
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

// Supabase는 영문 메시지를 준다. 어느 쪽이 틀렸는지는 알려주지 않는 편이 안전하므로
// 자격 증명 오류는 하나의 문구로 묶는다.
function getSignInErrorMessage(error: { message?: string; status?: number } | null | undefined) {
  const lower = (error?.message ?? "").toLowerCase();

  if (error?.status === 429 || lower.includes("rate limit") || lower.includes("too many")) {
    return "로그인 시도가 너무 잦습니다. 잠시 후 다시 시도해주세요.";
  }

  if (lower.includes("not confirmed") || lower.includes("not_confirmed")) {
    return "전화번호 인증이 완료되지 않았습니다. 인증을 먼저 진행해주세요.";
  }

  return "전화번호 또는 비밀번호가 올바르지 않습니다.";
}

export async function signIn(_prevState: FormState, formData: FormData): Promise<FormState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = getSafeNext(String(formData.get("next") ?? ""));
  const authPhone = toKoreanE164Phone(phone);

  const kept = keepValues(formData, ["phone"]);
  const invalid = collectFieldErrors({
    phone: !phone ? "전화번호를 입력해주세요." : !authPhone ? "전화번호를 정확히 입력해주세요." : null,
    password: password ? null : "비밀번호를 입력해주세요."
  });

  if (hasErrors(invalid) || !authPhone) return { ...invalid, values: kept };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ phone: authPhone, password });

  if (error) {
    return { ...fieldError("password", getSignInErrorMessage(error)), values: kept };
  }

  if (next) redirect(next);

  const { data: profile } = data.user
    ? await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle()
    : { data: null };

  redirect(getAccountPath(profile?.role));
}

export async function signUp(_prevState: FormState, formData: FormData): Promise<FormState> {
  const rawRole = String(formData.get("role") ?? "creator");
  const role: "business" | "creator" = rawRole === "business" ? "business" : "creator";
  const isBusiness = role === "business";
  const nicknameField = isBusiness ? "business_name" : "nickname";
  const nameField = isBusiness ? "manager_name" : "name";

  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const password = String(formData.get("password") ?? "");
  const nickname = String(formData.get(nicknameField) ?? "").trim();
  const name = String(formData.get(nameField) ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? "").trim());
  const authPhone = toKoreanE164Phone(phone);
  const businessRegistrationNumber = isBusiness
    ? normalizeBusinessRegistrationNumber(String(formData.get("business_registration_number") ?? ""))
    : null;
  const agreedTerms = formData.get("agreement_terms") === "on";
  const agreedPrivacy = formData.get("agreement_privacy") === "on";
  const marketingOptIn = formData.get("agreement_marketing") === "on";
  // 비밀번호는 돌려주지 않는다. 다시 입력받는다.
  const kept = keepValues(formData, ["email", "phone", nicknameField, nameField, "business_registration_number", "referral_code"]);

  // 한 번에 모아서 돌려준다. 하나씩 알려주면 고칠 때마다 다음 에러를 새로 만나게 된다.
  const invalid = collectFieldErrors({
    [nicknameField]: nickname ? null : `${isBusiness ? "상호" : "닉네임"}을(를) 입력해주세요.`,
    [nameField]: name ? null : `${isBusiness ? "담당자명" : "이름"}을(를) 입력해주세요.`,
    password: !password
      ? "비밀번호를 입력해주세요."
      : password.length < 6
        ? "비밀번호는 6자 이상이어야 합니다."
        : null,
    phone: !phone
      ? "전화번호를 입력해주세요."
      : phone.length < 10 || phone.length > 11 || !authPhone
        ? "전화번호를 정확히 입력해주세요."
        : null,
    business_registration_number: isBusiness
      ? !businessRegistrationNumber
        ? "사업자등록번호를 입력해주세요."
        : businessRegistrationNumber.length !== 10
          ? "사업자등록번호를 정확히 입력해주세요."
          : null
      : null,
    agreement: !agreedTerms || !agreedPrivacy ? "필수 약관에 동의해주세요." : null
  });

  if (hasErrors(invalid) || !authPhone) return { ...invalid, values: kept };

  const referralCode = isBusiness ? String(formData.get("referral_code") ?? "").trim() || null : null;
  const supabase = await createSupabaseServerClient();

  const [emailCheck, nicknameCheck, phoneCheck] = await Promise.all([
    email
      ? supabase.rpc("is_signup_email_available", { target_email: email })
      : Promise.resolve({ data: true, error: null }),
    supabase.rpc("is_signup_nickname_available", { target_nickname: nickname }),
    supabase.rpc("is_signup_phone_available", { target_phone: phone })
  ]);

  const unavailable = collectFieldErrors({
    email: emailCheck.error
      ? "이메일 중복 확인 중 오류가 발생했습니다."
      : emailCheck.data === false
        ? "이미 가입된 이메일입니다."
        : null,
    [nicknameField]: nicknameCheck.error
      ? "닉네임 중복 확인 중 오류가 발생했습니다."
      : nicknameCheck.data === false
        ? `이미 사용 중인 ${isBusiness ? "상호" : "닉네임"}입니다.`
        : null,
    phone: phoneCheck.error
      ? "전화번호 중복 확인 중 오류가 발생했습니다."
      : phoneCheck.data === false
        ? "이미 가입된 전화번호입니다."
        : null
  });

  if (hasErrors(unavailable)) return { ...unavailable, values: kept };

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
        referral_code: referralCode,
        marketing_opt_in: marketingOptIn ? "true" : "false"
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
          status: "active",
          marketing_opt_in: marketingOptIn,
          marketing_opt_in_at: marketingOptIn ? new Date().toISOString() : null
        }, { onConflict: "id" });

        if (profileError) {
          const message = getDuplicateSignupMessage(profileError);
          const field = message ? getDuplicateSignupField(message, nicknameField) : null;

          return field
            ? { ...fieldError(field, message as string), values: kept }
            : { formError: message ?? "가입 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.", values: kept };
        }

        redirect(profilePathForRole(role));
      }

      const { error: resendError } = await supabase.auth.resend({
        type: "sms",
        phone: authPhone
      });

      if (resendError) {
        return { ...fieldError("phone", getAuthOtpErrorMessage(resendError)), values: kept };
      }

      redirect(getSignupPhoneVerifyRedirect(role, phone, "인증번호를 다시 보냈습니다."));
    }

    if (duplicateMessage) {
      const field = getDuplicateSignupField(duplicateMessage, nicknameField);
      return field
        ? { ...fieldError(field, duplicateMessage), values: kept }
        : { formError: duplicateMessage, values: kept };
    }

    return { formError: "회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", values: kept };
  }

  if (!data.user) {
    return {
      formError: "전화번호 회원가입 요청이 생성되지 않았습니다. Phone Provider 설정을 확인해주세요.",
      values: kept
    };
  }

  redirect(`/auth/signup?role=${role}&verify=phone&phone=${encodeURIComponent(phone)}&message=${encodeURIComponent("문자로 받은 인증번호를 입력해주세요.")}`);
}

function getOtpVerifyErrorMessage(error: { message?: string; status?: number } | null | undefined) {
  const lower = (error?.message ?? "").toLowerCase();

  if (error?.status === 429 || lower.includes("rate limit") || lower.includes("too many")) {
    return "인증 시도가 너무 잦습니다. 잠시 후 다시 시도해주세요.";
  }

  if (lower.includes("expired")) return "인증번호가 만료되었습니다. 다시 받아주세요.";

  return "인증번호가 올바르지 않습니다.";
}

export async function verifyAuthPhoneOtp(_prevState: FormState, formData: FormData): Promise<FormState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const token = String(formData.get("token") ?? "").trim();
  const rawRole = String(formData.get("role") ?? "creator");
  const role: "business" | "creator" = rawRole === "business" ? "business" : "creator";
  const rawType = String(formData.get("type") ?? "sms");
  const type: "sms" | "phone_change" = rawType === "phone_change" ? "phone_change" : "sms";
  const next = getSafeNext(String(formData.get("next") ?? "")) ?? profilePathForRole(role);
  const authPhone = toKoreanE164Phone(phone);

  if (!authPhone) return { formError: "전화번호를 확인해주세요. 처음부터 다시 진행해주세요." };
  if (!token) return fieldError("token", "인증번호를 입력해주세요.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone: authPhone,
    token,
    type
  });

  if (error) {
    return fieldError("token", getOtpVerifyErrorMessage(error));
  }

  if (!data.user || !data.session) {
    return {
      formError:
        "전화번호 인증은 처리되었지만 로그인 세션이 생성되지 않았습니다. Phone Provider 설정과 인증번호 유형을 확인해주세요."
    };
  }

  {
    const metadata = data.user.user_metadata as Record<string, unknown> | undefined;
    const verifiedRole = getSignupRole(metadata, role);
    const verifiedPhone = normalizePhone(getUserMetadataString(metadata, "phone") || phone);
    const verifiedEmail = getUserMetadataString(metadata, "email") || data.user.email || null;
    const businessRegistrationNumber = getUserMetadataString(metadata, "business_registration_number") || null;
    const referralCode = getUserMetadataString(metadata, "referral_code") || null;
    const marketingOptIn = getUserMetadataString(metadata, "marketing_opt_in") === "true";
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
      status: "active",
      marketing_opt_in: marketingOptIn,
      marketing_opt_in_at: marketingOptIn ? new Date().toISOString() : null
    }, { onConflict: "id" });

    if (profileError) {
      const message = getDuplicateSignupMessage(profileError);
      return { formError: message ?? "가입 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요." };
    }
  }

  redirect(next);
}

export async function resendAuthPhoneOtp(_prevState: FormState, formData: FormData): Promise<FormState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const rawType = String(formData.get("type") ?? "sms");
  const type: "sms" | "phone_change" = rawType === "phone_change" ? "phone_change" : "sms";
  const authPhone = toKoreanE164Phone(phone);

  if (!authPhone) return { formError: "전화번호를 확인해주세요. 처음부터 다시 진행해주세요." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type,
    phone: authPhone
  });

  if (error) {
    return { formError: getAuthOtpErrorMessage(error) };
  }

  return { successMessage: "인증번호를 다시 보냈습니다." };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
