import Link from "next/link";
import { Store, Ticket } from "lucide-react";
import { daysUntilDate } from "@/lib/campaign-lifecycle";
import { getCouponBenefitLabel, getCouponBenefitTypeLabel, getCouponDisplayStatus, type Coupon } from "@/lib/coupons";

type BadgeTone = "red" | "green" | "blue" | "gray" | "amber";

// 캠페인 카드와 같은 규칙으로 읽히게 한다.
// 지금 받을 수 있으면 primary, 기다려야 하면 amber, 끝났으면 charcoal.
type CouponStatusStyle = { label: string; tone: BadgeTone; pill: string };

const activePill = "bg-primary text-white";
const waitingPill = "bg-amber-500 text-white";
const closedPill = "bg-charcoal/75 text-white";

export const couponStatusBadge: Record<string, CouponStatusStyle> = {
  claiming: { label: "발급 가능", tone: "red", pill: activePill },
  scheduled: { label: "공개 예정", tone: "amber", pill: waitingPill },
  setup_pending: { label: "사용 준비 중", tone: "amber", pill: waitingPill },
  claim_closed: { label: "발급 마감", tone: "gray", pill: closedPill },
  expired: { label: "사용 종료", tone: "gray", pill: closedPill },
  draft: { label: "초안", tone: "gray", pill: closedPill },
  in_review: { label: "검수 대기", tone: "amber", pill: waitingPill },
  revision_requested: { label: "수정 요청", tone: "red", pill: activePill },
  approved: { label: "승인", tone: "green", pill: activePill },
  cancelled: { label: "취소", tone: "gray", pill: closedPill }
};

export function getCouponStatusStyle(status: string) {
  return couponStatusBadge[status] ?? couponStatusBadge.draft;
}

// 캠페인 카드 우측 상단의 D-day 표기와 같은 자리, 같은 규칙.
function couponDeadlineLabel(coupon: Coupon, status: string) {
  if (status === "expired") return "종료됨";
  if (status === "scheduled") {
    const untilOpen = daysUntilDate(coupon.startDate);
    return untilOpen === null ? "공개 예정" : untilOpen === 0 ? "오늘 시작" : `${untilOpen}일 후`;
  }
  if (status === "claim_closed") return "소진";
  const remainingDays = daysUntilDate(coupon.endDate);
  if (remainingDays === null) return "기간 미정";
  if (remainingDays < 0) return "종료됨";
  if (remainingDays === 0) return "오늘마감";
  return `D-${remainingDays}`;
}

export function CouponImage({ coupon, className = "h-full w-full" }: { coupon: Coupon; className?: string }) {
  if (coupon.coverImage) return <img src={coupon.coverImage} alt="" className={`${className} object-cover`} />;
  return (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br from-primary/10 via-orange-50 to-amber-100 text-primary`}>
      <Ticket size={54} strokeWidth={1.5} />
    </div>
  );
}

export function CouponCard({ coupon }: { coupon: Coupon }) {
  const status = getCouponDisplayStatus(coupon);
  const style = getCouponStatusStyle(status);
  const almostGone = status === "claiming" && coupon.remainingQuantity <= Math.max(Math.floor(coupon.totalQuantity * 0.1), 1);

  return (
    <Link
      href={`/coupons/${coupon.id}`}
      className="group overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        <CouponImage coupon={coupon} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2.5 py-1 text-xs font-black text-charcoal shadow-sm backdrop-blur-sm">
            <Ticket size={13} />
            {getCouponBenefitTypeLabel(coupon)}
          </span>
          <span className={`rounded-md px-2.5 py-1 text-xs font-black shadow-sm ${style.pill}`}>{style.label}</span>
          {almostGone ? <span className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-black text-primary shadow-sm backdrop-blur-sm">마감 임박</span> : null}
        </div>

        <div className="absolute right-4 top-4 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-black text-white backdrop-blur-sm">
          {couponDeadlineLabel(coupon, status)}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-2 flex items-center gap-1.5 text-sm text-gray-500">
          <Store size={15} />
          {coupon.businessName}{coupon.businessCategory ? ` (${coupon.businessCategory})` : ""}
        </div>
        <h3 className="mb-1 line-clamp-1 text-lg font-black text-charcoal transition-colors group-hover:text-primary">
          {coupon.title}
        </h3>
        <p className="mb-4 line-clamp-2 text-sm leading-6 text-gray-500">{coupon.description || coupon.terms}</p>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Ticket size={15} />
            </div>
            <span className="truncate font-black text-charcoal">{getCouponBenefitLabel(coupon)}</span>
          </div>
          <div className="shrink-0 text-sm font-bold text-gray-500">
            잔여 {coupon.remainingQuantity.toLocaleString()}장
          </div>
        </div>
      </div>
    </Link>
  );
}
