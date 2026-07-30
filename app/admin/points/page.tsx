import { Badge, StatCard } from "@/app/components/ui";
import { formatPoints } from "@/lib/points";
import { getAdminPointsData, type AdminReservation, type AdminWallet } from "@/lib/supabase/queries";
import { AlertTriangle, Coins, CreditCard, Lock, RotateCcw } from "lucide-react";
import { adjustBusinessPoints, releaseCampaignReservation } from "../actions";
import { ConfirmButton } from "../components/confirm-button";
import { FormBanner } from "@/app/components/form-field";

const RETURN_TO = "/admin/points";

function campaignStatusLabel(status: string) {
  if (status === "draft") return "초안";
  if (status === "in_review") return "검수 대기";
  if (status === "revision_requested") return "수정 요청";
  if (status === "approved") return "승인 완료";
  if (status === "scheduled") return "공개 예정";
  if (status === "recruiting") return "모집중";
  if (status === "selecting") return "선정중";
  if (status === "in_progress") return "진행중";
  if (status === "submission_review") return "제출 검수";
  if (status === "completed") return "완료";
  if (status === "cancelled") return "취소";
  if (status === "failed") return "실패";
  return status;
}

function reservationStatusLabel(status: string) {
  if (status === "reserved") return "예약중";
  if (status === "settled") return "정산 완료";
  if (status === "released") return "반환 완료";
  return status;
}

function reservationStatusTone(status: string): "blue" | "green" | "gray" | "amber" {
  if (status === "reserved") return "amber";
  if (status === "settled") return "green";
  return "gray";
}

function orderStatusLabel(status: string) {
  if (status === "pending") return "결제 대기";
  if (status === "paid") return "결제 완료";
  if (status === "failed") return "결제 실패";
  if (status === "partially_refunded") return "부분 환불";
  if (status === "refunded") return "환불 완료";
  if (status === "cancelled") return "취소";
  return status;
}

function orderStatusTone(status: string): "blue" | "green" | "gray" | "amber" | "red" {
  if (status === "paid") return "green";
  if (status === "failed") return "red";
  if (status === "partially_refunded" || status === "refunded") return "amber";
  if (status === "pending") return "blue";
  return "gray";
}

function refundStatusLabel(status: string) {
  if (status === "pending") return "처리 대기";
  if (status === "completed") return "환불 완료";
  if (status === "failed") return "실패";
  return status;
}

function refundStatusTone(status: string): "green" | "gray" | "amber" | "red" {
  if (status === "completed") return "green";
  if (status === "failed") return "red";
  return "amber";
}

function formatDateTimeShort(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatAmount(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function WalletRow({ wallet }: { wallet: AdminWallet }) {
  return (
    <tr>
      <td className="px-5 py-4">
        <p className="font-bold text-charcoal">{wallet.businessName}</p>
        <p className="mt-0.5 text-xs text-gray-400">누적 충전 {formatPoints(wallet.lifetimeCredited)} · 누적 사용 {formatPoints(wallet.lifetimeSpent)}</p>
      </td>
      <td className="px-3 py-4 text-right font-black text-charcoal">{formatPoints(wallet.availablePoints)}</td>
      <td className="px-3 py-4 text-right font-bold text-amber-600">{formatPoints(wallet.reservedPoints)}</td>
      <td className="px-5 py-4">
        {/* 수동 지급·차감. 캠페인 팝업에 있던 폼과 같은 액션을 쓴다. */}
        <form action={adjustBusinessPoints} className="flex flex-wrap justify-end gap-2">
          <input type="hidden" name="business_id" value={wallet.businessId} />
          <input type="hidden" name="return_to" value={RETURN_TO} />
          <input
            type="number"
            name="points"
            step="5000"
            placeholder="+/- 포인트"
            required
            className="w-28 rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <input
            name="reason"
            placeholder="사유"
            required
            className="w-36 rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <button className="rounded-lg bg-charcoal px-3 py-2 text-xs font-black text-white transition-colors hover:bg-slate-800">보정</button>
        </form>
      </td>
    </tr>
  );
}

function ReservationRow({ reservation }: { reservation: AdminReservation }) {
  return (
    <tr className={reservation.isStuck ? "bg-red-50/50" : undefined}>
      <td className="px-5 py-4">
        <p className="font-bold text-charcoal">{reservation.campaignTitle}</p>
        <p className="mt-0.5 text-xs text-gray-400">{reservation.businessName}</p>
      </td>
      <td className="px-3 py-4">
        <span className="inline-flex flex-wrap gap-1">
          <Badge tone="gray">{campaignStatusLabel(reservation.campaignStatus)}</Badge>
          <Badge tone={reservationStatusTone(reservation.status)}>{reservationStatusLabel(reservation.status)}</Badge>
        </span>
      </td>
      <td className="px-3 py-4 text-xs text-gray-500">
        모집 {reservation.requestedHeadcount}명{reservation.billableHeadcount !== null ? ` · 청구 ${reservation.billableHeadcount}명` : ""}
      </td>
      <td className="px-3 py-4 text-right text-xs">
        <p className="font-black text-charcoal">{formatPoints(reservation.reservedPoints)}</p>
        {reservation.status !== "reserved" ? (
          <p className="mt-0.5 text-gray-400">소진 {formatPoints(reservation.consumedPoints)} · 반환 {formatPoints(reservation.returnedPoints)}</p>
        ) : null}
      </td>
      <td className="px-3 py-4 text-xs text-gray-500">
        <p>{formatDateTimeShort(reservation.settledAt)}</p>
        {reservation.settlementReason ? <p className="mt-0.5 text-gray-400">{reservation.settlementReason}</p> : null}
      </td>
      <td className="px-5 py-4 text-right">
        {reservation.isStuck ? (
          <div className="flex flex-col items-end gap-1.5">
            <p className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
              <AlertTriangle size={13} />
              초안에 잠긴 예약
            </p>
            <ConfirmButton
              label="예약 해제"
              confirmLabel="예약 포인트를 가게에 반환합니다"
              className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
            >
              <form action={releaseCampaignReservation} className="inline">
                <input type="hidden" name="campaign_id" value={reservation.campaignId} />
                <input type="hidden" name="reason" value="관리자 예약 해제 (방치된 초안)" />
                <input type="hidden" name="return_to" value={RETURN_TO} />
                <button className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-black text-white transition-colors hover:bg-red-700">해제 확정</button>
              </form>
            </ConfirmButton>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

export default async function AdminPointsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  const { wallets, reservations, orders, refunds } = await getAdminPointsData();

  const totalAvailable = wallets.reduce((sum, wallet) => sum + wallet.availablePoints, 0);
  const totalReserved = wallets.reduce((sum, wallet) => sum + wallet.reservedPoints, 0);
  const totalPaidAmount = orders
    .filter((order) => ["paid", "partially_refunded", "refunded"].includes(order.status))
    .reduce((sum, order) => sum + order.totalAmount, 0);
  const pendingRefunds = refunds.filter((refund) => refund.status === "pending").length;
  const failedRefunds = refunds.filter((refund) => refund.status === "failed").length;
  const stuckReservations = reservations.filter((reservation) => reservation.isStuck);

  return (
    <main>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-charcoal">포인트·정산</h1>
        <p className="mt-2 text-gray-500">
          가게 지갑과 캠페인 정산, 결제·환불 내역을 관리합니다. 이 페이지를 열면 모집이 마감된 캠페인의 정산이 바로 실행됩니다.
        </p>
      </div>
      {error ? <div className="mb-6"><FormBanner>{error}</FormBanner></div> : null}
      {message ? <p className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {stuckReservations.length > 0 ? (
        <p className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
          <AlertTriangle size={16} />
          초안 상태에 잠긴 예약이 {stuckReservations.length}건 있습니다. 아래 캠페인 정산에서 해제할 수 있습니다.
        </p>
      ) : null}

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <StatCard label="총 보유 포인트" value={formatPoints(totalAvailable)} icon={<Coins size={20} />} />
        <StatCard label="총 예약 포인트" value={formatPoints(totalReserved)} icon={<Lock size={20} />} />
        <StatCard label="누적 결제액" value={formatAmount(totalPaidAmount)} icon={<CreditCard size={20} />} />
        <StatCard label="환불 대기·실패" value={`${pendingRefunds + failedRefunds}건`} icon={<RotateCcw size={20} />} />
      </div>

      <section className="mb-8 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-black text-charcoal">가게 지갑</h2>
          <p className="mt-1 text-sm text-gray-500">보정은 5,000P 단위, 1회 최대 500,000P까지 지급·차감할 수 있습니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-400">
                <th className="px-5 py-3 font-bold">가게</th>
                <th className="px-3 py-3 text-right font-bold">보유</th>
                <th className="px-3 py-3 text-right font-bold">예약</th>
                <th className="px-5 py-3 text-right font-bold">보정 지급·차감</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {wallets.map((wallet) => <WalletRow key={wallet.businessId} wallet={wallet} />)}
              {wallets.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">아직 지갑이 없습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-black text-charcoal">캠페인 정산</h2>
          <p className="mt-1 text-sm text-gray-500">캠페인마다 모집 1명당 5,000P가 예약되고, 모집 마감 시 지원자 수만큼 소진된 뒤 나머지가 반환됩니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-400">
                <th className="px-5 py-3 font-bold">캠페인</th>
                <th className="px-3 py-3 font-bold">상태</th>
                <th className="px-3 py-3 font-bold">인원</th>
                <th className="px-3 py-3 text-right font-bold">예약 포인트</th>
                <th className="px-3 py-3 font-bold">정산일·사유</th>
                <th className="px-5 py-3 text-right font-bold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservations.map((reservation) => <ReservationRow key={reservation.campaignId} reservation={reservation} />)}
              {reservations.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">포인트 예약이 아직 없습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-black text-charcoal">결제 주문</h2>
          <p className="mt-1 text-sm text-gray-500">최근 50건의 포인트 충전 주문입니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-400">
                <th className="px-5 py-3 font-bold">주문</th>
                <th className="px-3 py-3 font-bold">상태</th>
                <th className="px-3 py-3 text-right font-bold">결제액</th>
                <th className="px-3 py-3 text-right font-bold">포인트</th>
                <th className="px-5 py-3 font-bold">결제일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-4">
                    <p className="font-bold text-charcoal">{order.businessName}</p>
                    <p className="mt-0.5 break-all text-xs text-gray-400">{order.orderId}</p>
                    {order.failureMessage ? <p className="mt-1 text-xs font-bold text-red-600">{order.failureMessage}</p> : null}
                  </td>
                  <td className="px-3 py-4"><Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</Badge></td>
                  <td className="px-3 py-4 text-right font-bold text-charcoal">{formatAmount(order.totalAmount)}</td>
                  <td className="px-3 py-4 text-right text-xs">
                    <p className="font-black text-charcoal">{formatPoints(order.pointAmount)}</p>
                    {order.bonusPoints > 0 ? <p className="mt-0.5 text-gray-400">보너스 {formatPoints(order.bonusPoints)}</p> : null}
                    {order.refundedPoints > 0 ? <p className="mt-0.5 text-amber-600">환불 {formatPoints(order.refundedPoints)}</p> : null}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">{formatDateTimeShort(order.paidAt)}</td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">결제 주문이 아직 없습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-black text-charcoal">환불 요청</h2>
          <p className="mt-1 text-sm text-gray-500">실패한 환불은 붉게 표시됩니다. 실패 사유를 확인하고 필요하면 위의 보정 지급·차감으로 정리해주세요.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-400">
                <th className="px-5 py-3 font-bold">요청</th>
                <th className="px-3 py-3 font-bold">상태</th>
                <th className="px-3 py-3 text-right font-bold">환불 포인트</th>
                <th className="px-3 py-3 text-right font-bold">환불 금액</th>
                <th className="px-5 py-3 font-bold">일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {refunds.map((refund) => (
                <tr key={refund.id} className={refund.status === "failed" ? "bg-red-50/50" : undefined}>
                  <td className="px-5 py-4">
                    <p className="font-bold text-charcoal">{refund.businessName}</p>
                    <p className="mt-0.5 break-all text-xs text-gray-400">{refund.orderId}</p>
                    {refund.failureMessage ? <p className="mt-1 text-xs font-bold text-red-600">{refund.failureMessage}</p> : null}
                  </td>
                  <td className="px-3 py-4"><Badge tone={refundStatusTone(refund.status)}>{refundStatusLabel(refund.status)}</Badge></td>
                  <td className="px-3 py-4 text-right font-black text-charcoal">{formatPoints(refund.refundPoints)}</td>
                  <td className="px-3 py-4 text-right font-bold text-charcoal">{formatAmount(refund.refundAmount)}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    <p>요청 {formatDateTimeShort(refund.createdAt)}</p>
                    {refund.completedAt ? <p className="mt-0.5">처리 {formatDateTimeShort(refund.completedAt)}</p> : null}
                  </td>
                </tr>
              ))}
              {refunds.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">환불 요청이 아직 없습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
