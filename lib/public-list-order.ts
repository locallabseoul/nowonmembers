import type { Campaign } from "./types";

export type PublicCampaignSort = "deadline" | "popular" | "newest";

function campaignStatusRank(status: Campaign["status"]) {
  if (status === "recruiting") return 0;
  if (status === "selecting") return 1;
  if (status === "in_progress" || status === "submission_review") return 2;
  return 3;
}

function compareDateAscending(a: string, b: string) {
  return (a || "9999-12-31").localeCompare(b || "9999-12-31");
}

function compareDateDescending(a: string, b: string) {
  return (b || "0000-01-01").localeCompare(a || "0000-01-01");
}

export function sortPublicCampaigns(campaigns: Campaign[], sort: PublicCampaignSort = "deadline") {
  return [...campaigns].sort((a, b) => {
    const aRank = campaignStatusRank(a.status);
    const bRank = campaignStatusRank(b.status);
    if (aRank !== bRank) return aRank - bRank;

    // 종료 그룹은 과거 마감일이 작은 항목이 위로 올라오지 않도록 최근 종료 건부터 둔다.
    if (aRank === 3) {
      return compareDateDescending(a.recruitEnd, b.recruitEnd) || compareDateDescending(a.recruitStart, b.recruitStart);
    }

    if (sort === "popular") {
      return b.appliedCount - a.appliedCount || compareDateDescending(a.recruitStart, b.recruitStart);
    }
    if (sort === "newest") {
      return compareDateDescending(a.recruitStart, b.recruitStart);
    }

    if (aRank === 0) return compareDateAscending(a.recruitEnd, b.recruitEnd);
    if (aRank === 1) return compareDateAscending(a.selectionDate, b.selectionDate);
    return compareDateAscending(a.submissionDue, b.submissionDue);
  });
}

type PublicCouponStatus = "claiming" | "scheduled" | "setup_pending" | "claim_closed" | "expired" | string;

type PublicCouponListItem = {
  startDate: string;
  endDate: string;
  createdAt: string;
};

function couponStatusRank(status: PublicCouponStatus) {
  if (status === "claiming") return 0;
  if (status === "scheduled") return 1;
  if (status === "setup_pending") return 2;
  return 3;
}

export function preparePublicCouponBook<T extends PublicCouponListItem>(coupons: T[], getStatus: (coupon: T) => PublicCouponStatus) {
  return coupons
    .map((coupon) => ({ coupon, status: getStatus(coupon) }))
    .filter(({ status }) => status !== "expired" && status !== "claim_closed")
    .sort((a, b) => {
      const rankDifference = couponStatusRank(a.status) - couponStatusRank(b.status);
      if (rankDifference) return rankDifference;
      if (a.status === "claiming") return compareDateAscending(a.coupon.endDate, b.coupon.endDate);
      if (a.status === "scheduled") return compareDateAscending(a.coupon.startDate, b.coupon.startDate);
      return b.coupon.createdAt.localeCompare(a.coupon.createdAt);
    })
    .map(({ coupon }) => coupon);
}
