"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { DEFAULT_POINT_CHARGE_POINTS, formatPoints, POINT_CHARGE_OPTIONS, POINT_TERMS_VERSION, POINTS_PAYMENT_OPEN } from "@/lib/points";
import { track } from "@vercel/analytics";
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
  const [showPreparingNotice, setShowPreparingNotice] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState(DEFAULT_POINT_CHARGE_POINTS);
  const selectedOption = POINT_CHARGE_OPTIONS.find((option) => option.paidPoints === selectedPoints)
    ?? POINT_CHARGE_OPTIONS[1];

  function startPayment() {
    if (!agreed) return;

    // 토스 심사 승인 전까지는 결제창 대신 준비중 안내를 띄운다. 서버 액션도
    // 같은 플래그로 막혀 있어 화면을 우회해도 주문은 생성되지 않는다.
    if (!POINTS_PAYMENT_OPEN) {
      // 결제를 열기 전의 실수요 지표. 결제 오픈 시점을 정할 때 쓴다.
      track("charge_attempted_while_closed", { points: selectedPoints });
      setShowPreparingNotice(true);
      return;
    }

    setError("");
    startTransition(async () => {
      let order: PointChargeOrder | null = null;

      try {
        order = await createPointChargeOrder(selectedPoints, POINT_TERMS_VERSION);
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
      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-black text-charcoal">결제 전 확인사항</p>
        <ul className="mt-2 space-y-1.5 text-xs leading-5 text-gray-600">
          <li>
            결제금액 {selectedOption.totalAmount.toLocaleString("ko-KR")}원 (공급가 {selectedOption.supplyAmount.toLocaleString("ko-KR")}원 + 부가세 {selectedOption.vatAmount.toLocaleString("ko-KR")}원)
          </li>
          <li>
            지급 포인트 {formatPoints(selectedOption.paidPoints)}
            {selectedOption.bonusPoints > 0 ? ` + 충전 보너스 ${formatPoints(selectedOption.bonusPoints)}` : ""}
          </li>
          <li>유상 포인트는 충전일로부터 5년간 유효하며, 캠페인에 예약되지 않은 잔액은 원결제수단으로 환불할 수 있습니다.</li>
          <li>충전 보너스는 지급일로부터 1년간 유효하고 현금으로 환불되지 않으며, 연결된 유상 포인트를 환불하면 남은 보너스는 회수됩니다.</li>
        </ul>
        <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-gray-200 pt-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            disabled={isPending}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-xs font-bold leading-5 text-charcoal">
            위 내용과{" "}
            <Link href="/terms" target="_blank" rel="noreferrer" className="text-primary underline">
              포인트 이용약관
            </Link>
            을 확인했으며 결제에 동의합니다.
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={startPayment}
        disabled={!agreed || isPending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-black text-white shadow-sm transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
        {selectedOption.totalAmount.toLocaleString("ko-KR")}원 결제하고 충전
      </button>
      {error ? <p className="mt-3 text-center text-sm font-bold text-red-600">{error}</p> : null}

      {showPreparingNotice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="payment-preparing-title">
          <button type="button" onClick={() => setShowPreparingNotice(false)} className="absolute inset-0 bg-charcoal/50" aria-label="안내 닫기" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <CreditCard size={22} />
            </span>
            <h3 id="payment-preparing-title" className="mt-4 text-lg font-black text-charcoal">카드 결제 오픈을 준비하고 있어요</h3>
            <p className="mt-3 break-keep text-sm leading-6 text-gray-600">
              결제 시스템 심사가 진행 중입니다. 그동안 포인트가 필요하시면{" "}
              <a href="mailto:locallab.seoul@gmail.com" className="font-bold text-primary underline">locallab.seoul@gmail.com</a>
              으로 문의해주세요. 확인 후 바로 지급해드립니다.
            </p>
            <button
              type="button"
              onClick={() => setShowPreparingNotice(false)}
              className="mt-5 w-full rounded-xl bg-charcoal py-3 font-black text-white transition-colors hover:bg-slate-800"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
