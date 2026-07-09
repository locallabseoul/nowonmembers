"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function profilePathForRole(role: "business" | "creator") {
  return role === "business" ? "/business/dashboard" : "/creator/profile";
}

function getConfiguredCallbackUrl(role: "business" | "creator") {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) return null;

  return `${siteUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(profilePathForRole(role))}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/creator/dashboard");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(`/auth?mode=signin&error=${encodeURIComponent(error.message)}`);
  redirect(next);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "creator") as "business" | "creator";
  const nickname = String(formData.get("nickname") ?? "");
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
      data: { role, nickname }
    }
  });

  if (error) redirect(`/auth?mode=signup&error=${encodeURIComponent(error.message)}`);

  if (data.session && data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      role,
      nickname,
      verification_status: "pending",
      status: "active"
    });
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
