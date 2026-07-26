"use client";

import { RotateCcw } from "lucide-react";
import { formatPoints } from "@/lib/points";
import { refundPointOrder } from "./actions";

export function RefundPointForm({ orderId, refundablePoints }: { orderId: string; refundablePoints: number }) {
  return (
    <form
      action={refundPointOrder}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `${formatPoints(refundablePoints)}를 원결제수단으로 환불할까요? 환불 접수 후 해당 포인트는 즉시 사용할 수 없으며, 이 결제에서 남은 충전 보너스도 함께 회수됩니다.`
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="order_id" value={orderId} />
      <button className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:border-primary hover:text-primary">
        <RotateCcw size={13} /> {formatPoints(refundablePoints)} 환불
      </button>
    </form>
  );
}
