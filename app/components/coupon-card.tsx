import Link from "next/link";
import { CalendarDays, Store, Ticket, Users } from "lucide-react";
import { Badge } from "@/app/components/ui";
import { getCouponBenefitLabel, getCouponDisplayStatus, type Coupon } from "@/lib/coupons";

const statusLabels = {
  scheduled: "공개 예정",
  claiming: "발급 중",
  claim_closed: "발급 마감",
  expired: "사용 종료",
  draft: "초안",
  in_review: "검수 대기",
  revision_requested: "수정 요청",
  approved: "승인",
  cancelled: "취소"
} as const;

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
  const open = status === "claiming";

  return (
    <Link href={`/coupons/${coupon.id}`} className="group overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden">
        <CouponImage coupon={coupon} className="h-full w-full transition duration-500 group-hover:scale-105" />
        <div className="absolute left-4 top-4"><Badge tone={open ? "red" : "gray"}>{statusLabels[status]}</Badge></div>
      </div>
      <div className="p-5">
        <p className="text-sm font-black text-primary">{getCouponBenefitLabel(coupon)}</p>
        <h2 className="mt-2 line-clamp-2 text-lg font-black leading-7 text-charcoal">{coupon.title}</h2>
        <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-gray-500">{coupon.description || coupon.terms}</p>
        <div className="mt-5 space-y-2 text-sm text-gray-600">
          <p className="flex items-center gap-2"><Store size={15} className="text-primary" />{coupon.businessName}</p>
          <p className="flex items-center gap-2"><CalendarDays size={15} className="text-primary" />사용 {coupon.useStart} ~ {coupon.useEnd}</p>
          <p className="flex items-center gap-2"><Users size={15} className="text-primary" />잔여 {coupon.remainingQuantity.toLocaleString()}장</p>
        </div>
      </div>
    </Link>
  );
}
