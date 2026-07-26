"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { DEFAULT_POINT_CHARGE_POINTS, formatPoints, POINT_CHARGE_OPTIONS } from "@/lib/points";
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
  const [selectedPoints, setSelectedPoints] = useState(DEFAULT_POINT_CHARGE_POINTS);
  const selectedOption = POINT_CHARGE_OPTIONS.find((option) => option.paidPoints === selectedPoints)
    ?? POINT_CHARGE_OPTIONS[1];

  function startPayment() {
    setError("");
    startTransition(async () => {
      let order: PointChargeOrder | null = null;

      try {
        order = await createPointChargeOrder(selectedPoints);
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
          orderName: "노원멤버스 포인트 충전",
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
      <div className="space-y-3">
        {POINT_CHARGE_OPTIONS.map((option) => {
          const selected = option.paidPoints === selectedPoints;
          const grantedPoints = option.paidPoints + option.bonusPoints;

          return (
            <button
              key={option.paidPoints}
              type="button"
              onClick={() => setSelectedPoints(option.paidPoints)}
              disabled={isPending}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-gray-200 bg-white hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-charcoal">{formatPoints(grantedPoints)}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    최대 {Math.floor(grantedPoints / 5_000)}명 모집
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-charcoal">{option.totalAmount.toLocaleString("ko-KR")}원</p>
                  {option.bonusPoints > 0 ? (
                    <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-black text-green-700">
                      +{formatPoints(option.bonusPoints)}
                    </span>
                  ) : option.paidPoints === DEFAULT_POINT_CHARGE_POINTS ? (
                    <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-black text-primary">
                      추천
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-400">
                공급가 {option.supplyAmount.toLocaleString("ko-KR")}원 · VAT {option.vatAmount.toLocaleString("ko-KR")}원
              </p>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={startPayment}
        disabled={isPending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-black text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
        {selectedOption.totalAmount.toLocaleString("ko-KR")}원 결제하고 충전
      </button>
      {error ? <p className="mt-3 text-center text-sm font-bold text-red-600">{error}</p> : null}
    </div>
  );
}
