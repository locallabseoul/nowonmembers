import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePhoneNumber } from "@/lib/auth/phone";

/** 관리자 허용 목록은 브라우저에 노출하지 않고 service role로만 확인한다. */
export async function isAdminPhoneBypassAllowed(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!/^010\d{8}$/.test(normalizedPhone)) return false;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("phone_signup_bypass_allowlist")
      .select("phone")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    return !error && data?.phone === normalizedPhone;
  } catch {
    // 허용 목록을 확인할 수 없을 때는 보안상 일반 SMS 가입 흐름을 사용한다.
    return false;
  }
}
