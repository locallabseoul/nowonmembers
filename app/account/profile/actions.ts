"use server";

import { revalidatePath } from "next/cache";
import { collectFieldErrors, hasErrors, type FormState } from "@/lib/form-errors";
import { requireRole } from "@/lib/auth/guards";

function isValidEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function duplicateField(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("nickname")) return "nickname";
  if (lower.includes("email")) return "email";
  return null;
}

export async function saveResidentProfile(_prevState: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireRole("resident", "/account/profile");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const values = { nickname, name, email };

  const invalid = collectFieldErrors({
    nickname: !nickname
      ? "닉네임을 입력해주세요."
      : nickname.length < 2
        ? "닉네임은 2자 이상이어야 합니다."
        : nickname.length > 20
          ? "닉네임은 20자 이하로 입력해주세요."
          : null,
    name: !name
      ? "이름을 입력해주세요."
      : name.length > 50
        ? "이름은 50자 이하로 입력해주세요."
        : null,
    email: isValidEmail(email) ? null : "이메일 형식을 확인해주세요."
  });

  if (hasErrors(invalid)) return { ...invalid, values };

  const { data: nicknameAvailable, error: nicknameError } = await supabase.rpc("is_profile_nickname_available", {
    target_nickname: nickname,
    current_user_id: user.id
  });

  if (nicknameError) {
    return { formError: "닉네임 중복 확인 중 오류가 발생했습니다.", values };
  }
  if (!nicknameAvailable) {
    return { fieldErrors: { nickname: "이미 사용 중인 닉네임입니다." }, values };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ nickname, name, email: email || null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    const field = duplicateField(error.message);
    return field
      ? { fieldErrors: { [field]: field === "email" ? "이미 사용 중인 이메일입니다." : "이미 사용 중인 닉네임입니다." }, values }
      : { formError: "프로필을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.", values };
  }

  // profiles가 예기치 않게 복구되어야 할 때도 최신 표시명을 사용할 수 있도록
  // Auth 메타데이터를 함께 맞춘다. 프로필 저장은 이미 끝났으므로 실패해도 막지 않는다.
  await supabase.auth.updateUser({ data: { nickname, name, email: email || null } }).catch(() => null);

  revalidatePath("/");
  revalidatePath("/my");
  revalidatePath("/account/profile");

  return { successMessage: "프로필을 수정했습니다." };
}
