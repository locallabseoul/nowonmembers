"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { createPointChargeOrder, markPointChargeOrderFailed, type PointChargeOrder } from "./actions";

type TossPayment = {
  requestPayment: (options: {
    method: "CARD";
    amount: { currency: "KRW"; value: number };
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }) => Promise<void>;
};

type TossPaymentsFactory = (clientKey: string) => {
  payment: (options: { customerKey: string }) => TossPayment;
};

declare global {
  interface Window {
    TossPayments?: TossPaymentsFactory;
  }
}

let tossScriptPromise: Promise<void> | null = null;

function loadTossScript() {
  if (window.TossPayments) return Promise.resolve();
  if (tossScriptPromise) return tossScriptPromise;

  tossScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("결제창을 불러오지 못했습니다."));
    document.head.appendChild(script);
  });

  return tossScriptPromise;
}

export function PointChargeButton({ campaignId }: { campaignId?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function startPayment() {
    setError("");
    startTransition(async () => {
      let order: PointChargeOrder | null = null;

      try {
        order = await createPointChargeOrder();
        await loadTossScript();
        if (!window.TossPayments) throw new Error("결제창 초기화에 실패했습니다.");

        const tossPayments = window.TossPayments(order.clientKey);
        const payment = tossPayments.payment({ customerKey: order.customerKey });
        const params = new URLSearchParams();
        if (campaignId) params.set("campaign", campaignId);
        const suffix = params.toString() ? `?${params.toString()}` : "";

        await payment.requestPayment({
          method: "CARD",
          amount: { currency: "KRW", value: order.amount },
          orderId: order.orderId,
          orderName: `${order.points.toLocaleString("ko-KR")}P 포인트 충전`,
          successUrl: `${window.location.origin}/business/points/success${suffix}`,
          failUrl: `${window.location.origin}/business/points/fail${suffix}`
        });
      } catch (paymentError) {
        const message = paymentError instanceof Error ? paymentError.message : "결제를 시작하지 못했습니다.";
        const code =
          typeof paymentError === "object" &&
          paymentError !== null &&
          "code" in paymentError &&
          typeof paymentError.code === "string"
            ? paymentError.code
            : "PAYMENT_WINDOW_CLOSED";

        if (order) {
          try {
            await markPointChargeOrderFailed(order.orderId, code, message);
          } catch {
            // 결제 오류 안내를 우선하고, 실패 상태 동기화는 서버 재조회로 복구한다.
          }
        }

        setError(message);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={startPayment}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-black text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
        55,000원 결제하고 충전
      </button>
      {error ? <p className="mt-3 text-center text-sm font-bold text-red-600">{error}</p> : null}
    </div>
  );
}
