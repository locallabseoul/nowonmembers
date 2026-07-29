"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPointChargeOption, POINT_TERMS_VERSION } from "@/lib/points";
import { requireRole } from "@/lib/auth/guards";
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

  if (error) throw new Error(error.message);
  const order = Array.isArray(data) ? data[0] : data;
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!order || !clientKey) throw new Error("결제 설정을 확인해주세요.");

  return {
    orderId: order.order_id,
    amount: Number(order.total_amount),
    points: Number(order.point_amount),
    bonusPoints: Number(order.bonus_points),
    customerKey: `customer_${randomUUID()}`,
    clientKey
  };
}

export async function markPointChargeOrderFailed(orderId: string, code: string, message: string) {
  const { supabase } = await requireRole("business", "/business/points");
  if (!orderId.startsWith("points_")) throw new Error("결제 주문번호를 확인해주세요.");

  const { error } = await supabase.rpc("mark_point_payment_failed", {
    target_order_id: orderId,
    target_code: code || "PAYMENT_FAILED",
    target_message: message || "결제가 완료되지 않았습니다."
  });

  if (error) throw new Error(error.message);
  revalidatePath("/business/points");
}

export async function refundPointOrder(formData: FormData) {
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
    redirect(`/business/points?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/business/points");
  revalidatePath("/business/dashboard");
  redirect("/business/points?refunded=1");
}
