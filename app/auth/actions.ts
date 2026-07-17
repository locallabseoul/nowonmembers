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
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const rawRole = String(formData.get("role") ?? "creator");
  const role: "business" | "creator" = rawRole === "business" ? "business" : "creator";
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
