"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getReadOnlyPreview } from "@/lib/auth/read-only-preview";

// 헤더에서 목록을 펼치면 개인 알림을 읽음 처리한다. 공지는 상세를 열어야 읽음이 된다.
export async function markNotificationsRead() {
  if (await getReadOnlyPreview()) return;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  await supabase.rpc("mark_notifications_read", { target_ids: null });
  revalidatePath("/", "layout");
}
