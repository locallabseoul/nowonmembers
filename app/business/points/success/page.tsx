import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { confirmTossPayment } from "@/lib/toss-payments";

export default async function PointPaymentSuccessPage({
  searchParams
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string; campaign?: string }>;
}) {
  const { paymentKey, orderId, amount, campaign } = await searchParams;
  const { supabase } = await requireRole("business", "/business/points");

  if (!paymentKey || !orderId || !amount) {
    redirect(`/business/points?error=${encodeURIComponent("결제 승인 정보가 누락되었습니다.")}`);
  }

  const { data: order, error: orderError } = await supabase
    .from("point_payment_orders")
    .select("id,order_id,total_amount,status,payment_key")
    .eq("order_id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    redirect(`/business/points?error=${encodeURIComponent(orderError?.message ?? "포인트 주문을 찾을 수 없습니다.")}`);
  }

  if (Number(amount) !== Number(order.total_amount)) {
    redirect(`/business/points?error=${encodeURIComponent("결제 금액이 주문 정보와 일치하지 않습니다.")}`);
  }

  if (!["paid", "partially_refunded", "refunded"].includes(order.status)) {
    try {
      const response = await confirmTossPayment({
        paymentKey,
        orderId,
        amount: Number(order.total_amount),
        idempotencyKey: order.id
      });
      const admin = createSupabaseAdminClient();
      const { error } = await admin.rpc("credit_point_payment", {
        target_order_id: orderId,
        target_payment_key: paymentKey,
        target_payment_method: typeof response.method === "string" ? response.method : "CARD",
        target_provider_response: response
      });
      if (error) throw new Error(error.message);
    } catch (confirmationError) {
      const message = confirmationError instanceof Error ? confirmationError.message : "결제 승인에 실패했습니다.";
      redirect(`/business/points?error=${encodeURIComponent(message)}`);
    }
  } else if (order.payment_key !== paymentKey) {
    redirect(`/business/points?error=${encodeURIComponent("주문과 결제 정보가 일치하지 않습니다.")}`);
  }

  if (campaign) {
    const { data, error } = await supabase.rpc("submit_campaign_for_review", {
      target_campaign_id: campaign,
      target_idempotency_key: `campaign_reserve:${campaign}`
    });
    const result = Array.isArray(data) ? data[0] : data;

    if (!error && result?.submitted) {
      redirect(`/business/dashboard?campaign=${campaign}&message=${encodeURIComponent("포인트 충전과 캠페인 검수 요청이 완료되었습니다.")}`);
    }

    if (error) {
      redirect(`/business/points?campaign=${campaign}&error=${encodeURIComponent(error.message)}`);
    }

    const retryParams = new URLSearchParams({
      campaign,
      required: String(result?.required_points ?? 0),
      shortfall: String(result?.shortfall_points ?? 0)
    });
    redirect(`/business/points?${retryParams.toString()}`);
  }

  redirect(`/business/points?charged=${orderId}`);
}
