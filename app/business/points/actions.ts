"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getPointChargeOption,
  normalizePaymentFailureCode,
  paymentFailureMessage,
  POINT_TERMS_VERSION, POINTS_PAYMENT_OPEN } from "@/lib/points";
import { requireRole } from "@/lib/auth/guards";
import { logEvent } from "@/lib/events";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cancelTossPayment } from "@/lib/toss-payments";

export type PointChargeOrder = {
  orderId: string;
  amount: number;
  points: number;
  bonusPoints: number;
  customerKey: string;
  clientKey: string;
};

export async function createPointChargeOrder(
  pointAmount: number,
  acceptedTermsVersion: string
): Promise<PointChargeOrder> {
  if (!POINTS_PAYMENT_OPEN) {
    throw new Error("카드 결제는 준비 중입니다. 포인트가 필요하시면 운영자에게 문의해주세요.");
  }

  const chargeOption = getPointChargeOption(pointAmount);
  if (!chargeOption) throw new Error("충전 금액을 확인해주세요.");
  // 주문에 기록되는 동의 버전은 사용자가 실제로 확인한 버전이어야 한다.
  if (acceptedTermsVersion !== POINT_TERMS_VERSION) {
    throw new Error("포인트 이용약관이 변경되었습니다. 새로고침 후 다시 확인해주세요.");
  }

  const { supabase } = await requireRole("business", "/business/points");
  const orderId = `points_${randomUUID().replaceAll("-", "")}`;
  const { data, error } = await supabase.rpc("create_point_payment_order", {
    target_order_id: orderId,
    target_terms_version: acceptedTermsVersion,
    target_point_amount: chargeOption.paidPoints
  });

  if (error) {
    logEvent("point.charge_order_failed", { error: error.message, points: chargeOption.paidPoints });
    throw new Error(error.message);
  }
  const order = Array.isArray(data) ? data[0] : data;
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!order || !clientKey) throw new Error("결제 설정을 확인해주세요.");
  logEvent("point.charge_order_created", { orderId, points: chargeOption.paidPoints });

  return {
    orderId: order.order_id,
    amount: Number(order.total_amount),
    points: Number(order.point_amount),
    bonusPoints: Number(order.bonus_points),
    // 가게마다 고정된 값이어야 토스 쪽에서 같은 고객의 결제로 묶인다.
    customerKey: `customer_${order.business_id}`,
    clientKey
  };
}

export async function markPointChargeOrderFailed(orderId: string, code: string, message: string) {
  const { supabase } = await requireRole("business", "/business/points");
  if (!orderId.startsWith("points_")) throw new Error("결제 주문번호를 확인해주세요.");

  const failureCode = normalizePaymentFailureCode(code);
  const { error } = await supabase.rpc("mark_point_payment_failed", {
    target_order_id: orderId,
    target_code: failureCode,
    // 결제창 SDK가 준 원문은 운영 확인에 쓰이므로 남기되 길이는 제한한다.
    target_message: message?.slice(0, 200) || paymentFailureMessage(failureCode)
  });

  if (error) throw new Error(error.message);
  logEvent("point.charge_failed", { orderId, code: failureCode });
  revalidatePath("/business/points");
}

export async function refundPointOrder(formData: FormData) {
  if (!POINTS_PAYMENT_OPEN) {
    redirect(`/business/points?error=${encodeURIComponent("결제·환불 기능은 준비 중입니다. 운영자에게 문의해주세요.")}`);
  }

  const orderId = String(formData.get("order_id") ?? "");
  const { supabase } = await requireRole("business", "/business/points");

  const { data: order, error: orderError } = await supabase
    .from("point_payment_orders")
    .select("order_id,payment_key,status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (orderError || !order?.payment_key) {
    redirect(`/business/points?error=${encodeURIComponent(orderError?.message ?? "환불할 결제를 찾을 수 없습니다.")}`);
  }

  const refundId = randomUUID();
  const { data: refundRows, error: refundError } = await supabase.rpc("create_point_refund_request", {
    target_order_id: orderId,
    target_refund_id: refundId,
    target_idempotency_key: `refund_request:${refundId}`
  });

  if (refundError) {
    redirect(`/business/points?error=${encodeURIComponent(refundError.message)}`);
  }

  const refund = Array.isArray(refundRows) ? refundRows[0] : refundRows;
  if (!refund) redirect(`/business/points?error=${encodeURIComponent("환불 요청을 만들지 못했습니다.")}`);

  const admin = createSupabaseAdminClient();

  try {
    const response = await cancelTossPayment({
      paymentKey: order.payment_key,
      cancelAmount: Number(refund.refund_amount),
      cancelReason: "미사용 유상 포인트 환불",
      idempotencyKey: refundId
    });
    const { error } = await admin.rpc("complete_point_refund", {
      target_refund_id: refundId,
      target_provider_response: response
    });
    if (error) throw new Error(error.message);
  } catch (refundFailure) {
    const message = refundFailure instanceof Error ? refundFailure.message : "결제 취소에 실패했습니다.";
    await admin.rpc("fail_point_refund", {
      target_refund_id: refundId,
      target_failure_message: message
    });
    logEvent("point.refund_failed", { error: message, orderId });
    redirect(`/business/points?error=${encodeURIComponent(message)}`);
  }

  logEvent("point.refunded", { orderId });
  revalidatePath("/business/points");
  revalidatePath("/business/dashboard");
  redirect("/business/points?refunded=1");
}
