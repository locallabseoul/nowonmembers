"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccountPath } from "@/lib/auth/guards";
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

function getConfiguredCallbackUrl(role: "business" | "creator") {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) return null;

  return `${siteUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(profilePathForRole(role))}`;
}

function getSignupRedirect(role: "business" | "creator", error: string) {
  return `/auth/signup?role=${role}&error=${encodeURIComponent(error)}`;
}

function requiredText(formData: FormData, name: string, label: string, role: "business" | "creator") {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) redirect(getSignupRedirect(role, `${label}을(를) 입력해주세요.`));

  return value;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = getSafeNext(String(formData.get("next") ?? ""));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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
  const email = requiredText(formData, "email", "이메일", role);
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
  const phone = requiredText(formData, "phone", "전화번호", role);
  const businessRegistrationNumber = role === "business"
    ? requiredText(formData, "business_registration_number", "사업자등록번호", role)
    : null;
  const referralCode = role === "business" ? String(formData.get("referral_code") ?? "").trim() || null : null;
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const emailRedirectTo =
    getConfiguredCallbackUrl(role) ??
    (origin ? `${origin}/auth/callback?next=${encodeURIComponent(profilePathForRole(role))}` : undefined);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        role,
        nickname,
        name,
        phone,
        business_registration_number: businessRegistrationNumber,
        referral_code: referralCode
      }
    }
  });

  if (error) redirect(getSignupRedirect(role, error.message));

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

    if (profileError) redirect(getSignupRedirect(role, profileError.message));
  }

  if (!data.session) {
    redirect(`/auth?message=${encodeURIComponent("가입 확인 메일을 확인한 뒤 로그인해주세요.")}`);
  }

  redirect(profilePathForRole(role));
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
