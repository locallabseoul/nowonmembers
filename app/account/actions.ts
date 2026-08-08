"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { normalizeKoreanAuthPhone, toKoreanE164Phone } from "@/lib/auth/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fieldError, type FormState } from "@/lib/form-errors";

const ACTIVE_CAMPAIGN_STATUSES = ["in_review", "revision_requested", "approved", "scheduled", "recruiting", "selecting", "in_progress", "submission_review"];
const ACTIVE_COLLABORATION_STATUSES = ["selected", "visit_scheduled", "visited", "submitted", "revision_requested", "approved"];

export async function deleteAccount(_prevState: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, profile } = await requireUser("/account/delete");
  const password = String(formData.get("password") ?? "");
  const confirmed = formData.get("confirm_delete") === "on";

  if (!confirmed) {
    return fieldError("confirm_delete", "안내 사항을 확인하고 동의해주세요.");
  }

  if (!password) {
    return fieldError("password", "비밀번호를 입력해주세요.");
  }

  // 관리자가 스스로 사라지면 남은 운영 권한이 없어질 수 있다. 권한을 먼저 넘긴다.
  if (profile?.is_admin) {
    return { formError: "관리자 권한이 있는 계정은 탈퇴할 수 없습니다. 다른 관리자에게 권한 해제를 요청한 뒤 다시 시도해주세요." };
  }

  // 인증 계정의 전화번호는 국가번호가 붙은 형식(8210...)이라 국내 형식으로
  // 되돌린 뒤 다시 E.164로 만든다. 바로 넣으면 자릿수 검사에서 걸린다.
  const authPhone = toKoreanE164Phone(normalizeKoreanAuthPhone(user.phone));
  if (!authPhone) {
    return { formError: "계정 정보를 확인할 수 없습니다. 운영자에게 문의해주세요." };
  }

  const { error: passwordError } = await supabase.auth.signInWithPassword({
    phone: authPhone,
    password
  });

  if (passwordError) {
    return fieldError("password", "비밀번호가 일치하지 않습니다.");
  }

  // 진행 중인 활동이 있으면 상대방(가게·크리에이터)이 피해를 본다. 끝내고 탈퇴한다.
  const { data: creatorProfile } = await supabase.from("creator_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (creatorProfile) {
    const { count } = await supabase
      .from("collaborations")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorProfile.id)
      .in("status", ACTIVE_COLLABORATION_STATUSES);

    if (count) {
      return { formError: "진행 중인 협업이 있습니다. 콘텐츠 제출을 완료하거나 운영자에게 문의한 뒤 탈퇴할 수 있습니다." };
    }
  }

  const { data: businessProfile } = await supabase.from("business_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (businessProfile) {
    const [activeCampaigns, wallet, pendingRefunds] = await Promise.all([
      supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("business_id", businessProfile.id).in("status", ACTIVE_CAMPAIGN_STATUSES),
      supabase.from("point_wallets").select("reserved_points").eq("business_id", businessProfile.id).maybeSingle(),
      supabase.from("point_refund_requests").select("id", { count: "exact", head: true }).eq("business_id", businessProfile.id).eq("status", "pending")
    ]);

    if (activeCampaigns.count) {
      return { formError: "진행 중인 캠페인이 있습니다. 캠페인을 종료하거나 취소한 뒤 탈퇴할 수 있습니다." };
    }
    if (Number(wallet.data?.reserved_points ?? 0) > 0) {
      return { formError: "캠페인에 예약된 포인트가 있습니다. 정산이 끝난 뒤 탈퇴할 수 있습니다." };
    }
    if (pendingRefunds.count) {
      return { formError: "처리 중인 환불 요청이 있습니다. 환불이 완료된 뒤 탈퇴할 수 있습니다." };
    }
  }

  // 설정 문제(예: 서버 키 누락)로 예외가 나도 오류 화면 대신 안내를 보여준다.
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch (adminError) {
    console.error("deleteAccount: admin client init failed", adminError);
    return { formError: "탈퇴 처리에 필요한 서버 설정에 문제가 있습니다. 운영자에게 문의해주세요." };
  }

  // 이력이 없는 계정은 계정과 데이터를 함께 삭제한다. 포인트 결제·캠페인 정산
  // 기록이 있으면 외래키(on delete restrict)가 삭제를 막는데, 그 기록은 약관
  // 제10조에 따라 보관 대상이므로 개인정보만 지우고 로그인을 막는다.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    const [profileScrub, businessScrub] = await Promise.all([
      admin.from("profiles").update({
        nickname: "탈퇴한 회원",
        name: null,
        email: null,
        phone: null,
        business_registration_number: null,
        marketing_opt_in: false,
        marketing_opt_in_at: null
      }).eq("id", user.id),
      businessProfile
        ? admin.from("business_profiles").update({ contact: "", is_public: false }).eq("id", businessProfile.id)
        : Promise.resolve({ error: null })
    ]);

    if (profileScrub.error || businessScrub.error) {
      return { formError: "탈퇴 처리에 실패했습니다. 잠시 후 다시 시도하거나 운영자에게 문의해주세요." };
    }

    // 100년 — 재로그인을 막는다.
    const { error: banError } = await admin.auth.admin.updateUserById(user.id, { ban_duration: "876000h" });
    if (banError) {
      return { formError: "탈퇴 처리에 실패했습니다. 운영자에게 문의해주세요." };
    }
  }

  await supabase.auth.signOut();
  redirect(`/auth?message=${encodeURIComponent("탈퇴가 완료되었습니다. 그동안 노원멤버스를 이용해주셔서 감사합니다.")}`);
}

// 광고 문자에 적는 수신거부 방법이다. 회원이 스스로 끌 수 있어야 동의 철회가 성립한다.
// 역할·상태 같은 권한 필드는 트리거가 막고 있어, 본인 프로필의 이 값만 바뀐다.
export async function setMarketingOptIn(_prevState: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/account/notifications");
  const optIn = formData.get("marketing_opt_in") === "on";

  const { error } = await supabase
    .from("profiles")
    .update({
      marketing_opt_in: optIn,
      // 동의한 시점은 남기고, 철회하면 지운다.
      marketing_opt_in_at: optIn ? new Date().toISOString() : null
    })
    .eq("id", user.id);

  if (error) {
    return { formError: "설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath("/account/notifications");

  return {
    successMessage: optIn
      ? "마케팅 정보 수신에 동의했습니다."
      : "마케팅 정보 수신을 거부했습니다. 앞으로 광고 문자를 보내지 않습니다."
  };
}
