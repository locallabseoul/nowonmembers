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

function getSignupRedirect(role: "business" | "creator", error: string) {
  return `/auth/signup?role=${role}&error=${encodeURIComponent(error)}`;
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
    message.includes("email") ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already registered") ||
    error?.status === 422
  ) {
    return "이미 가입된 이메일입니다.";
  }

  if (error?.code === "23505" || message.includes("duplicate") || message.includes("unique")) {
    return "이미 사용 중인 정보가 있습니다.";
  }

  return null;
}

function requiredText(formData: FormData, name: string, label: string, role: "business" | "creator") {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) redirect(getSignupRedirect(role, `${label}을(를) 입력해주세요.`));

  return value;
}

function normalizePhone(phone: string) {
  return normalizePhoneNumber(phone);
}

function normalizeBusinessRegistrationNumber(value: string) {
  return value.replace(/\D/g, "");
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
    redirect(getSignupRedirect(role, "필수 약관에 동의해주세요."));
  }

  if (password.length < 6) {
    redirect(getSignupRedirect(role, "비밀번호는 6자 이상이어야 합니다."));
  }

  const nickname = role === "business"
    ? requiredText(formData, "business_name", "상호", role)
    : requiredText(formData, "nickname", "닉네임", role);
  const name = role === "business"
    ? requiredText(formData, "manager_name", "담당자명", role)
    : requiredText(formData, "name", "이름", role);
  const phone = normalizePhone(requiredText(formData, "phone", "전화번호", role));
  if (phone.length < 10 || phone.length > 11) {
    redirect(getSignupRedirect(role, "전화번호를 정확히 입력해주세요."));
  }
  const authPhone = toKoreanE164Phone(phone);
  if (!authPhone) {
    redirect(getSignupRedirect(role, "전화번호를 정확히 입력해주세요."));
  }

  const businessRegistrationNumber = role === "business"
    ? normalizeBusinessRegistrationNumber(requiredText(formData, "business_registration_number", "사업자등록번호", role))
    : null;
  if (role === "business" && businessRegistrationNumber?.length !== 10) {
    redirect(getSignupRedirect(role, "사업자등록번호를 정확히 입력해주세요."));
  }

  const referralCode = role === "business" ? String(formData.get("referral_code") ?? "").trim() || null : null;
  const supabase = await createSupabaseServerClient();
  if (email) {
    const { data: isEmailAvailable, error: emailAvailabilityError } = await supabase.rpc("is_signup_email_available", {
      target_email: email
    });

    if (emailAvailabilityError) {
      redirect(getSignupRedirect(role, "이메일 중복 확인 중 오류가 발생했습니다."));
    }

    if (!isEmailAvailable) {
      redirect(getSignupRedirect(role, "이미 가입된 이메일입니다."));
    }
  }

  const { data: isNicknameAvailable, error: nicknameAvailabilityError } = await supabase.rpc(
    "is_signup_nickname_available",
    {
      target_nickname: nickname
    }
  );

  if (nicknameAvailabilityError) {
    redirect(getSignupRedirect(role, "닉네임 중복 확인 중 오류가 발생했습니다."));
  }

  if (!isNicknameAvailable) {
    redirect(getSignupRedirect(role, "이미 사용 중인 닉네임입니다."));
  }

  const { data: isPhoneAvailable, error: phoneAvailabilityError } = await supabase.rpc("is_signup_phone_available", {
    target_phone: phone
  });

  if (phoneAvailabilityError) {
    redirect(getSignupRedirect(role, "전화번호 중복 확인 중 오류가 발생했습니다."));
  }

  if (!isPhoneAvailable) {
    redirect(getSignupRedirect(role, "이미 가입된 전화번호입니다."));
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

  if (error) redirect(getSignupRedirect(role, getDuplicateSignupMessage(error) ?? error.message));

  if (data.session && data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      role,
      nickname,
      name,
      phone,
      business_registration_number: businessRegistrationNumber,
      referral_code: referralCode,
      verification_status: "pending",
      status: "active"
    });

    if (profileError) redirect(getSignupRedirect(role, getDuplicateSignupMessage(profileError) ?? profileError.message));
  }

  if (!data.session) {
    redirect(`/auth/signup?role=${role}&verify=phone&phone=${encodeURIComponent(phone)}&message=${encodeURIComponent("문자로 받은 인증번호를 입력해주세요.")}`);
  }

  redirect(profilePathForRole(role));
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

  if (data.user) {
    await supabase
      .from("profiles")
      .update({ phone })
      .eq("id", data.user.id);
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
