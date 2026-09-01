"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { collectFieldErrors, fieldError, hasErrors, keepValues, type FormState } from "@/lib/form-errors";
import { getErrorLogContext } from "@/lib/event-logging";
import { logEvent } from "@/lib/events";
import { isKoreanMobilePhoneNumber, normalizePhoneNumber, toKoreanE164Phone } from "@/lib/auth/phone";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RESET_FLOW_COOKIE, RESET_FLOW_MAX_AGE } from "./constants";

function isRateLimited(error: { message?: string; status?: number } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.status === 429 || message.includes("rate limit") || message.includes("too many");
}

function otpErrorMessage(error: { message?: string; status?: number } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  if (isRateLimited(error)) return "인증 시도가 너무 잦습니다. 잠시 후 다시 시도해주세요.";
  if (message.includes("expired")) return "인증번호가 만료되었습니다. 다시 받아주세요.";
  return "인증번호가 올바르지 않습니다.";
}

async function sendResetOtp(phone: string) {
  const authPhone = toKoreanE164Phone(phone);
  if (!authPhone) return { error: { message: "invalid phone" } };

  const supabase = await createSupabaseServerClient();
  return supabase.auth.signInWithOtp({
    phone: authPhone,
    options: { channel: "sms", shouldCreateUser: false }
  });
}

export async function requestPasswordReset(_previous: FormState, formData: FormData): Promise<FormState> {
  const phone = normalizePhoneNumber(String(formData.get("phone") ?? ""));
  const kept = keepValues(formData, ["phone"]);
  const invalid = collectFieldErrors({
    phone: !phone
      ? "휴대폰 번호를 입력해주세요."
      : !isKoreanMobilePhoneNumber(phone)
        ? "SMS 수신 가능한 010 휴대폰 번호 11자리를 입력해주세요."
        : null
  });

  if (hasErrors(invalid)) return { ...invalid, values: kept };

  const { error } = await sendResetOtp(phone);
  if (error) {
    logEvent("auth.password_reset_otp_failed", { stage: "request", ...getErrorLogContext(error) });
    if (isRateLimited(error)) {
      return { formError: "인증번호 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.", values: kept };
    }
  } else {
    logEvent("auth.password_reset_otp_sent");
  }

  // 존재하지 않는 계정도 같은 화면과 문구를 보여 계정 가입 여부를 노출하지 않는다.
  redirect(`/auth/reset-password/verify?phone=${encodeURIComponent(phone)}`);
}

export async function resendPasswordResetOtp(_previous: FormState, formData: FormData): Promise<FormState> {
  const phone = normalizePhoneNumber(String(formData.get("phone") ?? ""));
  if (!isKoreanMobilePhoneNumber(phone)) return { formError: "전화번호를 다시 입력해주세요." };

  const { error } = await sendResetOtp(phone);
  if (error) {
    logEvent("auth.password_reset_otp_failed", { stage: "resend", ...getErrorLogContext(error) });
    if (isRateLimited(error)) return { formError: "인증번호 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." };
  } else {
    logEvent("auth.password_reset_otp_sent", { resend: true });
  }

  return { successMessage: "가입된 번호라면 인증번호를 다시 보냈습니다." };
}

export async function verifyPasswordResetOtp(_previous: FormState, formData: FormData): Promise<FormState> {
  const phone = normalizePhoneNumber(String(formData.get("phone") ?? ""));
  const token = String(formData.get("token") ?? "").trim();
  const authPhone = toKoreanE164Phone(phone);

  if (!authPhone || !isKoreanMobilePhoneNumber(phone)) return { formError: "전화번호를 다시 입력해주세요." };
  if (!/^\d{6}$/.test(token)) return fieldError("token", "6자리 인증번호를 입력해주세요.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ phone: authPhone, token, type: "sms" });
  if (error || !data.user || !data.session) {
    logEvent("auth.password_reset_otp_failed", { stage: "verify", ...getErrorLogContext(error) });
    return fieldError("token", otpErrorMessage(error));
  }

  const cookieStore = await cookies();
  cookieStore.set(RESET_FLOW_COOKIE, data.user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth/reset-password",
    maxAge: RESET_FLOW_MAX_AGE
  });
  logEvent("auth.password_reset_otp_verified");
  redirect("/auth/reset-password/new");
}

export async function updateResetPassword(_previous: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const invalid = collectFieldErrors({
    password: !password ? "새 비밀번호를 입력해주세요." : password.length < 6 ? "비밀번호는 6자 이상이어야 합니다." : null,
    password_confirm: !passwordConfirm
      ? "새 비밀번호를 한 번 더 입력해주세요."
      : password !== passwordConfirm
        ? "비밀번호가 일치하지 않습니다."
        : null
  });
  if (hasErrors(invalid)) return invalid;

  const cookieStore = await cookies();
  const resetUserId = cookieStore.get(RESET_FLOW_COOKIE)?.value;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!resetUserId || !userData.user || resetUserId !== userData.user.id) {
    cookieStore.set(RESET_FLOW_COOKIE, "", { path: "/auth/reset-password", maxAge: 0 });
    redirect("/auth/reset-password?message=" + encodeURIComponent("인증이 만료되었습니다. 다시 인증해주세요."));
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    logEvent("auth.password_reset_failed", { stage: "update", ...getErrorLogContext(error) });
    return { formError: "비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  logEvent("auth.password_reset_completed");
  cookieStore.set(RESET_FLOW_COOKIE, "", { path: "/auth/reset-password", maxAge: 0 });
  await supabase.auth.signOut();
  redirect("/auth?message=" + encodeURIComponent("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요."));
}
