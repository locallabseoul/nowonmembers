import { cache } from "react";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const READ_ONLY_PREVIEW_COOKIE = "nowonmembers_read_only_preview";

export type ReadOnlyPreview = {
  adminId: string;
  targetId: string;
  nickname: string;
  role: "business" | "creator" | "resident";
};

export const getReadOnlyPreview = cache(async (): Promise<ReadOnlyPreview | null> => {
  const targetId = (await cookies()).get(READ_ONLY_PREVIEW_COOKIE)?.value;
  if (!targetId) return null;

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user || authData.user.id === targetId) return null;

  const [{ data: admin }, { data: target }] = await Promise.all([
    supabase.from("profiles").select("id,is_admin,status").eq("id", authData.user.id).maybeSingle(),
    supabase.from("profiles").select("id,nickname,role,status").eq("id", targetId).maybeSingle()
  ]);

  if (!admin?.is_admin || admin.status !== "active") return null;
  if (!target || target.status !== "active" || !["business", "creator", "resident"].includes(target.role)) return null;

  return {
    adminId: admin.id,
    targetId: target.id,
    nickname: target.nickname || "이름 없는 회원",
    role: target.role as ReadOnlyPreview["role"]
  };
});
