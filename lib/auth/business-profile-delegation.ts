import { cache } from "react";
import { cookies } from "next/headers";
import { getReadOnlyPreview } from "@/lib/auth/read-only-preview";

export const BUSINESS_PROFILE_DELEGATION_COOKIE = "nowonmembers_business_profile_delegation";

export type BusinessProfileDelegation = {
  adminId: string;
  targetId: string;
  nickname: string;
  reason: string;
};

export const getBusinessProfileDelegation = cache(async (): Promise<BusinessProfileDelegation | null> => {
  const raw = (await cookies()).get(BUSINESS_PROFILE_DELEGATION_COOKIE)?.value;
  if (!raw) return null;

  let payload: { targetId?: string; reason?: string };
  try {
    payload = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }

  const preview = await getReadOnlyPreview();
  if (!preview || preview.role !== "business" || preview.targetId !== payload.targetId) return null;
  if (!payload.reason?.trim()) return null;

  return {
    adminId: preview.adminId,
    targetId: preview.targetId,
    nickname: preview.nickname,
    reason: payload.reason.trim()
  };
});
