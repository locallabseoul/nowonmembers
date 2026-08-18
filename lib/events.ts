import { after } from "next/server";
import { getCurrentSessionProfile } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// 주요 이벤트(특히 실패)를 app_events에 남긴다. 서버 액션·라우트 핸들러 안에서만
// 부를 것. 응답이 나간 뒤(after) 실행하고 어떤 오류도 삼킨다 — 로깅이 본 기능을
// 막는 순간 로깅 자체가 장애가 된다.
// context에는 에러 메시지와 상황 구분값만 넣고, 회원이 입력한 원문은 넣지 않는다.
export function logEvent(event: string, context: Record<string, unknown> = {}) {
  after(async () => {
    try {
      const { user } = await getCurrentSessionProfile();
      const supabase = createSupabaseAdminClient();
      await supabase.from("app_events").insert({
        event,
        user_id: user?.id ?? null,
        context
      });
    } catch {
      // 로그 실패는 무시한다.
    }
  });
}
