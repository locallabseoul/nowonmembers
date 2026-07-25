import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTossPaymentByOrderId } from "@/lib/toss-payments";

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

  if (!orderId || !orderId.startsWith("points_")) {
    return NextResponse.json({ received: true });
  }

  try {
    const verifiedPayment = await getTossPaymentByOrderId(orderId);
    if (verifiedPayment.status !== "DONE" || typeof verifiedPayment.paymentKey !== "string") {
      return NextResponse.json({ received: true, reconciled: false });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.rpc("credit_point_payment", {
      target_order_id: orderId,
      target_payment_key: verifiedPayment.paymentKey,
      target_payment_method: typeof verifiedPayment.method === "string" ? verifiedPayment.method : "CARD",
      target_provider_response: verifiedPayment
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ received: true, reconciled: true });
  } catch (error) {
    return NextResponse.json(
      { received: false, error: error instanceof Error ? error.message : "Webhook reconciliation failed" },
      { status: 500 }
    );
  }
}
