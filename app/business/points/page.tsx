import { ArrowDownLeft, ArrowUpRight, CalendarClock, Coins, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { formatPoints, pointEventLabel } from "@/lib/points";
import { getBusinessDashboard } from "@/lib/supabase/queries";
import { getBusinessPointOverview } from "@/lib/supabase/point-queries";
import { OperatorSidebar } from "@/app/business/components/operator-sidebar";
import { PointChargeButton } from "./point-charge-button";
import { RefundPointForm } from "./refund-point-form";

function formatDate(value: string | null) {
  if (!value) return "없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}

function orderStatusLabel(status: string) {
  if (status === "pending") return "결제 대기";
  if (status === "paid") return "충전 완료";
  if (status === "partially_refunded") return "일부 환불";
  if (status === "refunded") return "환불 완료";
  if (status === "failed") return "결제 실패";
  if (status === "cancelled") return "결제 취소";
  return status;
}

export default async function BusinessPointsPage({
  searchParams
}: {
  searchParams: Promise<{ campaign?: string; required?: string; shortfall?: string; error?: string; refunded?: string; charged?: string }>;
}) {
  const params = await searchParams;
  await requireRole("business", "/business/points");
  const [{ business }, overview] = await Promise.all([
    getBusinessDashboard(),
    getBusinessPointOverview()
  ]);

  if (!business) return null;

  return (
    <main className="bg-[#F8F9FA]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 md:py-10 lg:flex-row lg:px-8">
        <OperatorSidebar business={business} active="points" />
        <div className="min-w-0 flex-grow space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-charcoal sm:text-3xl">포인트·결제</h1>
            <p className="mt-2 text-sm text-gray-500">캠페인 모집 1명당 5,000P가 예약됩니다.</p>
          </div>

          {params.error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{params.error}</p> : null}
          {params.charged ? <p className="rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">50,000P 충전이 완료되었습니다.</p> : null}
          {params.refunded ? <p className="rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">남은 유상 포인트를 원결제수단으로 환불했습니다.</p> : null}
          {params.campaign ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-black">캠페인 검수 제출에 포인트가 부족합니다.</p>
              <p className="mt-1">
                필요 {formatPoints(Number(params.required ?? 0))} · 부족 {formatPoints(Number(params.shortfall ?? 0))}. 충전이 끝나면 저장된 캠페인을 자동으로 다시 제출합니다.
              </p>
            </div>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={<Coins size={20} />} label="사용 가능" value={formatPoints(overview.wallet.availablePoints)} />
            <SummaryCard icon={<ShieldCheck size={20} />} label="예약 중" value={formatPoints(overview.wallet.reservedPoints)} />
            <SummaryCard icon={<CalendarClock size={20} />} label="무료 포인트" value={formatPoints(overview.wallet.promotionalPoints)} detail={`다음 만료 ${formatDate(overview.wallet.nextExpirationAt)}`} />
            <SummaryCard icon={<CreditIcon />} label="유상 포인트" value={formatPoints(overview.wallet.paidPoints)} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="border-b border-gray-100 px-6 py-5">
                <h2 className="font-black text-charcoal">포인트 이용 내역</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {overview.ledger.map((item) => {
                  const positive = item.availableDelta > 0;
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-4 px-6 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${positive ? "bg-green-50 text-green-600" : "bg-primary/10 text-primary"}`}>
                          {positive ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-charcoal">{pointEventLabel(item.eventType)}</p>
                          <p className="truncate text-xs text-gray-500">{item.campaignTitle || item.memo} · {formatDate(item.createdAt)}</p>
                        </div>
                      </div>
                      <strong className={`shrink-0 text-sm ${positive ? "text-green-600" : "text-charcoal"}`}>
                        {item.availableDelta > 0 ? "+" : item.availableDelta < 0 ? "-" : ""}{formatPoints(Math.abs(item.availableDelta))}
                      </strong>
                    </div>
                  );
                })}
                {!overview.ledger.length ? <p className="px-6 py-12 text-center text-sm text-gray-500">포인트 내역이 없습니다.</p> : null}
              </div>
            </div>

            <aside className="space-y-5">
              <section className="rounded-[20px] border border-primary/15 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">기본 충전</span>
                <h2 className="mt-4 text-2xl font-black text-charcoal">50,000P</h2>
                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">공급가</dt><dd>50,000원</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">VAT</dt><dd>5,000원</dd></div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 font-black"><dt>총 결제금액</dt><dd>55,000원</dd></div>
                </dl>
                <div className="mt-6">
                  <PointChargeButton campaignId={params.campaign} />
                </div>
                <p className="mt-4 text-xs leading-5 text-gray-500">유상 포인트는 5년간 유효하며, 예약되지 않은 잔여분은 원결제수단으로 환불할 수 있습니다.</p>
              </section>
            </aside>
          </section>

          <section className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="font-black text-charcoal">결제 내역</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr><th className="px-6 py-3">주문일</th><th className="px-6 py-3">상품</th><th className="px-6 py-3">결제금액</th><th className="px-6 py-3">상태</th><th className="px-6 py-3 text-right">환불</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {overview.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 text-gray-500">{formatDate(order.paidAt || order.createdAt)}</td>
                      <td className="px-6 py-4 font-bold">{formatPoints(order.pointAmount)} 충전</td>
                      <td className="px-6 py-4">{order.totalAmount.toLocaleString("ko-KR")}원</td>
                      <td className="px-6 py-4">{orderStatusLabel(order.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {order.refundablePoints > 0 && order.paymentKey ? (
                          <RefundPointForm orderId={order.orderId} refundablePoints={order.refundablePoints} />
                        ) : <span className="text-xs text-gray-400">환불 가능 잔액 없음</span>}
                      </td>
                    </tr>
                  ))}
                  {!overview.orders.length ? <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">결제 내역이 없습니다.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CreditIcon() {
  return <Coins size={20} />;
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center gap-2 text-sm font-bold text-gray-500">{icon}{label}</div>
      <p className="mt-4 text-2xl font-black text-charcoal">{value}</p>
      {detail ? <p className="mt-1 text-xs text-gray-400">{detail}</p> : null}
    </div>
  );
}
