"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { fieldError, keepValues, type FormState } from "@/lib/form-errors";

export async function cancelApplication(_prevState: FormState, formData: FormData): Promise<FormState> {
  const applicationId = String(formData.get("application_id") ?? "").trim();
  const { supabase } = await requireRole("creator", "/creator/dashboard");

  const { error } = await supabase.rpc("cancel_campaign_application", {
    target_application_id: applicationId
  });

  if (error) {
    return { formError: error.message };
  }

  revalidatePath("/creator/dashboard");

  return { successMessage: "지원을 취소했습니다." };
}

export async function saveVisitDate(_prevState: FormState, formData: FormData): Promise<FormState> {
  const collaborationId = String(formData.get("collaboration_id") ?? "").trim();
  const visitDate = String(formData.get("visit_date") ?? "").trim();
  const { supabase } = await requireRole("creator", "/creator/dashboard");
  const kept = keepValues(formData, ["visit_date"]);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return { ...fieldError("visit_date", "방문 날짜를 선택해주세요."), values: kept };
  }

  const { error } = await supabase.rpc("set_collaboration_visit_date", {
    target_collaboration_id: collaborationId,
    target_visit_date: visitDate
  });

  if (error) {
    return { ...fieldError("visit_date", error.message), values: kept };
  }

  revalidatePath("/creator/dashboard");
  revalidatePath(`/creator/submissions/${collaborationId}`);

  return { successMessage: "방문 예정일을 저장했습니다.", values: kept };
}
