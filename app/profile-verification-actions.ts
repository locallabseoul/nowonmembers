"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { toKoreanE164Phone } from "@/lib/auth/phone";

function getSafeReturnTo(value: FormDataEntryValue | null) {
  const returnTo = String(value ?? "");
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) return "/creator/profile";

  return returnTo;
}

function withParam(path: string, key: "error" | "message", value: string) {
  const url = new URL(path, "http://local");
  url.searchParams.delete("error");
  url.searchParams.delete("message");
  url.searchParams.set(key, value);

  return `${url.pathname}${url.search}`;
}

function getEmailRedirectTo(origin: string | null, returnTo: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  if (!siteUrl) return undefined;

  return `${siteUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(returnTo)}`;
}

function mapVerificationError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("sms") || lower.includes("provider")) return "SMS 발송 설정을 확인해주세요.";
  if (lower.includes("token") || lower.includes("otp")) return "인증번호를 확인해주세요.";
  if (lower.includes("rate")) return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";

  return message;
}

export async function sendEmailVerification(formData: FormData) {
  const returnTo = getSafeReturnTo(formData.get("verification_return_to"));
  const { supabase, user } = await requireUser(returnTo);
  const email = user.email;

  if (!email) redirect(withParam(returnTo, "error", "인증할 이메일이 없습니다."));
  if (user.email_confirmed_at) redirect(withParam(returnTo, "message", "이미 이메일 인증이 완료되었습니다."));

  const headerStore = await headers();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: getEmailRedirectTo(headerStore.get("origin"), returnTo)
    }
  });

  if (error) redirect(withParam(returnTo, "error", mapVerificationError(error.message)));

  redirect(withParam(returnTo, "message", "인증 메일을 발송했습니다. 메일함을 확인해주세요."));
}

export async function sendPhoneVerification(formData: FormData) {
  const returnTo = getSafeReturnTo(formData.get("verification_return_to"));
  const { supabase, user } = await requireUser(returnTo);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) redirect(withParam(returnTo, "error", profileError.message));

  const e164Phone = toKoreanE164Phone(profile?.phone);
  if (!e164Phone) redirect(withParam(returnTo, "error", "저장된 전화번호를 정확히 입력한 뒤 저장해주세요."));

  const { error } = await supabase.auth.updateUser({ phone: e164Phone });
  if (error) {
    const { error: resendError } = await supabase.auth.resend({ type: "phone_change", phone: e164Phone });
    if (resendError) redirect(withParam(returnTo, "error", mapVerificationError(resendError.message)));
  }

  redirect(withParam(returnTo, "message", "인증번호를 발송했습니다."));
}

export async function verifyPhoneOtp(formData: FormData) {
  const returnTo = getSafeReturnTo(formData.get("verification_return_to"));
  const token = String(formData.get("phone_otp") ?? "").replace(/\D/g, "");
  if (!token) redirect(withParam(returnTo, "error", "인증번호를 입력해주세요."));

  const { supabase, user } = await requireUser(returnTo);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) redirect(withParam(returnTo, "error", profileError.message));

  const e164Phone = toKoreanE164Phone(profile?.phone);
  if (!e164Phone) redirect(withParam(returnTo, "error", "저장된 전화번호를 정확히 입력한 뒤 저장해주세요."));

  const { error } = await supabase.auth.verifyOtp({
    phone: e164Phone,
    token,
    type: "phone_change"
  });

  if (error) redirect(withParam(returnTo, "error", mapVerificationError(error.message)));

  revalidatePath(returnTo.split("?")[0] || "/");
  redirect(withParam(returnTo, "message", "전화번호 인증이 완료되었습니다."));
}
