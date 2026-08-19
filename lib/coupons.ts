import { getKoreaTodayString } from "@/lib/campaign-lifecycle";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CouponReviewStatus = "draft" | "in_review" | "revision_requested" | "approved" | "cancelled";
export type CouponClaimStatus = "issued" | "redeemed" | "cancelled";
export type CouponBenefitType = "fixed_amount" | "percentage" | "free_item" | "other";

export type Coupon = {
  id: string;
  businessId: string;
  businessName: string;
  businessCategory: string;
  businessAddress: string;
  businessContact: string;
  businessCoverImage: string;
  title: string;
  description: string;
  coverImage: string;
  benefitType: CouponBenefitType;
  benefitValue: string;
  terms: string;
  totalQuantity: number;
  claimedQuantity: number;
  remainingQuantity: number;
  startDate: string;
  endDate: string;
  status: CouponReviewStatus;
  redemptionCodeConfigured: boolean;
  adminMemo: string;
  createdAt: string;
};

export type CouponClaim = {
  id: string;
  status: CouponClaimStatus;
  failedRedemptionAttempts: number;
  redemptionLockedUntil: string;
  claimedAt: string;
  redeemedAt: string;
  cancelledAt: string;
  coupon: Coupon;
};

type Relation<T> = T | T[] | null | undefined;

type CouponRow = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  benefit_type: CouponBenefitType;
  benefit_value: string;
  terms: string;
  total_quantity: number;
  claimed_quantity: number;
  start_date: string;
  end_date: string;
  status: CouponReviewStatus;
  redemption_code_configured: boolean;
  admin_memo: string | null;
  created_at: string;
  business_profiles?: Relation<{
    business_name: string | null;
    category: string | null;
    address: string | null;
    address_detail: string | null;
    contact: string | null;
    cover_image_url: string | null;
  }>;
};

type PublicCouponRow = Omit<CouponRow, "admin_memo" | "business_profiles"> & {
  business_name: string | null;
  business_category: string | null;
  business_address: string | null;
  business_address_detail: string | null;
  business_contact: string | null;
  business_cover_image_url: string | null;
};

const couponSelect = "id,business_id,title,description,cover_image_url,benefit_type,benefit_value,terms,total_quantity,claimed_quantity,start_date,end_date,status,redemption_code_configured,admin_memo,created_at,business_profiles(business_name,category,address,address_detail,contact,cover_image_url)";

function one<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function mapCoupon(row: CouponRow): Coupon {
  const business = one(row.business_profiles);
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: business?.business_name ?? "노원멤버스 파트너",
    businessCategory: business?.category ?? "",
    businessAddress: [business?.address, business?.address_detail].filter(Boolean).join(" "),
    businessContact: business?.contact ?? "",
    businessCoverImage: business?.cover_image_url ?? "",
    title: row.title,
    description: row.description ?? "",
    coverImage: row.cover_image_url || business?.cover_image_url || "",
    benefitType: row.benefit_type,
    benefitValue: row.benefit_value,
    terms: row.terms,
    totalQuantity: Number(row.total_quantity),
    claimedQuantity: Number(row.claimed_quantity),
    remainingQuantity: Math.max(Number(row.total_quantity) - Number(row.claimed_quantity), 0),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    redemptionCodeConfigured: Boolean(row.redemption_code_configured),
    adminMemo: row.admin_memo ?? "",
    createdAt: row.created_at
  };
}

function mapPublicCoupon(row: PublicCouponRow): Coupon {
  return mapCoupon({
    ...row,
    admin_memo: null,
    business_profiles: {
      business_name: row.business_name,
      category: row.business_category,
      address: row.business_address,
      address_detail: row.business_address_detail,
      contact: row.business_contact,
      cover_image_url: row.business_cover_image_url
    }
  });
}

export function getCouponDisplayStatus(coupon: Coupon) {
  const today = getKoreaTodayString();
  if (coupon.status !== "approved") return coupon.status;
  if (today > coupon.endDate) return "expired";
  if (!coupon.redemptionCodeConfigured) return "setup_pending";
  if (today < coupon.startDate) return "scheduled";
  if (coupon.remainingQuantity <= 0) return "claim_closed";
  return "claiming";
}

const benefitTypeLabels: Record<CouponBenefitType, string> = {
  fixed_amount: "정액 할인",
  percentage: "정률 할인",
  free_item: "무료 제공",
  other: "기타 혜택"
};

export function getCouponBenefitTypeLabel(coupon: Pick<Coupon, "benefitType">) {
  return benefitTypeLabels[coupon.benefitType] ?? "혜택";
}

export function getCouponBenefitLabel(coupon: Pick<Coupon, "benefitType" | "benefitValue">) {
  if (coupon.benefitType === "fixed_amount") return `${coupon.benefitValue}원 할인`;
  if (coupon.benefitType === "percentage") return `${coupon.benefitValue}% 할인`;
  return coupon.benefitValue;
}

export async function getPublicCoupons(query = "") {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("get_public_coupons");
  const coupons = ((data ?? []) as unknown as PublicCouponRow[]).map(mapPublicCoupon);
  const keyword = query.trim().toLocaleLowerCase("ko-KR");
  if (!keyword) return coupons;
  return coupons.filter((coupon) => [coupon.title, coupon.benefitValue, coupon.businessName].some((value) => value.toLocaleLowerCase("ko-KR").includes(keyword)));
}

export async function getPublicCoupon(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("get_public_coupons", { target_coupon_id: id }).maybeSingle();
  return data ? mapPublicCoupon(data as unknown as PublicCouponRow) : null;
}

export async function getMyCouponClaims(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("coupon_claims")
    .select(`id,status,failed_redemption_attempts,redemption_locked_until,claimed_at,redeemed_at,cancelled_at,coupons(${couponSelect})`)
    .eq("user_id", userId)
    .order("claimed_at", { ascending: false });

  return (data ?? []).flatMap((row) => {
    const coupon = one(row.coupons as unknown as Relation<CouponRow>);
    if (!coupon) return [];
    return [{
      id: row.id,
      status: row.status as CouponClaimStatus,
      failedRedemptionAttempts: Number(row.failed_redemption_attempts ?? 0),
      redemptionLockedUntil: row.redemption_locked_until ?? "",
      claimedAt: row.claimed_at,
      redeemedAt: row.redeemed_at ?? "",
      cancelledAt: row.cancelled_at ?? "",
      coupon: mapCoupon(coupon)
    } satisfies CouponClaim];
  });
}

export async function getBusinessCoupons(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: business } = await supabase.from("business_profiles").select("id").eq("user_id", userId).maybeSingle();
  if (!business) return [];
  const { data } = await supabase.from("coupons").select(couponSelect).eq("business_id", business.id).order("created_at", { ascending: false });
  return ((data ?? []) as unknown as CouponRow[]).map(mapCoupon);
}

export async function getBusinessCoupon(userId: string, couponId: string) {
  const coupons = await getBusinessCoupons(userId);
  return coupons.find((coupon) => coupon.id === couponId) ?? null;
}

export async function getAdminCoupons() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("coupons").select(couponSelect).order("created_at", { ascending: false });
  return ((data ?? []) as unknown as CouponRow[]).map(mapCoupon);
}
