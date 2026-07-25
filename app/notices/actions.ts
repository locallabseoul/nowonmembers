"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSessionProfile } from "@/lib/auth/guards";

export async function markNoticeRead(noticeId: string) {
  const { supabase, user } = await getCurrentSessionProfile();
  if (!user || !noticeId) return;

  await supabase.from("notice_reads").upsert({
    notice_id: noticeId,
    user_id: user.id,
    read_at: new Date().toISOString()
  }, { onConflict: "notice_id,user_id" });

  revalidatePath("/");
  revalidatePath("/notices");
  revalidatePath(`/notices/${noticeId}`);
}
