import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTossPaymentByOrderId } from "@/lib/toss-payments";

// create_point_payment_order가 만드는 주문번호 형식.
const POINT_ORDER_ID_PATTERN = /^points_[A-Za-z0-9]{6,57}$/;

type TossWebhookBody = {
  eventType?: string;
  data?: {
    orderId?: string;
    paymentKey?: string;
    status?: string;
  };
  orderId?: string;
  paymentKey?: string;
  status?: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as TossWebhookBody | null;
  const orderId = body?.data?.orderId ?? body?.orderId;

  if (!orderId || !POINT_ORDER_ID_PATTERN.test(orderId)) {
    return NextResponse.json({ received: true });
  }

  const admin = createSupabaseAdminClient();

  try {
    // 우리가 만든 주문인지 먼저 확인한다. 이 엔드포인트는 인증이 없어서, 이 확인이
    // 없으면 임의의 주문번호로 토스 API 호출을 무제한 유발할 수 있다.
    const { data: order, error: orderError } = await admin
      .from("point_payment_orders")
      .select("order_id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (orderError) throw new Error(orderError.message);
    if (!order) return NextResponse.json({ received: true });

    const verifiedPayment = await getTossPaymentByOrderId(orderId);
    if (verifiedPayment.status !== "DONE" || typeof verifiedPayment.paymentKey !== "string") {
      return NextResponse.json({ received: true, reconciled: false });
    }

    const { error } = await admin.rpc("credit_point_payment", {
      target_order_id: orderId,
      target_payment_key: verifiedPayment.paymentKey,
      target_payment_method: typeof verifiedPayment.method === "string" ? verifiedPayment.method : "CARD",
      target_provider_response: verifiedPayment
    });

    if (error) throw new Error(error.message);
    logEvent("point.charged", { orderId });
    return NextResponse.json({ received: true, reconciled: true });
  } catch (error) {
    // 토스가 재시도하도록 5xx를 주되, 내부 오류 내용은 응답에 싣지 않는다.
    console.error("Toss webhook reconciliation failed", { orderId, error });
    logEvent("point.charge_reconcile_failed", { orderId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
