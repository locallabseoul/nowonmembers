import type { CampaignPointReservation, PointLedgerItem, PointPaymentOrder, PointWalletSummary } from "@/lib/points";
import { createSupabaseServerClient } from "./server";

type WalletRow = {
  business_id: string;
  available_points: number;
  reserved_points: number;
  promotional_points: number;
  paid_points: number;
  next_expiration_at: string | null;
};

export type BusinessPointOverview = {
  wallet: PointWalletSummary;
  ledger: PointLedgerItem[];
  orders: PointPaymentOrder[];
  reservations: CampaignPointReservation[];
};

export async function getBusinessPointOverview(): Promise<BusinessPointOverview> {
  const supabase = await createSupabaseServerClient();
  const { data: walletRows, error: walletError } = await supabase.rpc("get_my_point_wallet");
  if (walletError) throw new Error(walletError.message);

  const walletRow = (Array.isArray(walletRows) ? walletRows[0] : walletRows) as WalletRow | undefined;
  if (!walletRow) throw new Error("포인트 지갑을 찾을 수 없습니다.");

  const [{ data: ledgerRows }, { data: orderRows }, { data: reservationRows }] = await Promise.all([
    supabase
      .from("point_ledger")
      .select("id,event_type,available_delta,reserved_delta,memo,created_at,campaigns(title)")
      .eq("business_id", walletRow.business_id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("point_payment_orders")
      .select("id,order_id,point_amount,total_amount,refunded_points,status,payment_key,paid_at,created_at,point_lots(available_points,reserved_points)")
      .eq("business_id", walletRow.business_id)
      .in("status", ["paid", "partially_refunded", "refunded"])
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_point_reservations")
      .select("campaign_id,requested_headcount,reserved_points,billable_headcount,consumed_points,returned_points,status")
      .eq("business_id", walletRow.business_id)
  ]);

  const ledger = (ledgerRows ?? []).map((row) => {
    const campaign = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns;
    return {
      id: row.id,
      eventType: row.event_type,
      availableDelta: Number(row.available_delta ?? 0),
      reservedDelta: Number(row.reserved_delta ?? 0),
      memo: row.memo ?? "",
      createdAt: row.created_at,
      campaignTitle: campaign?.title ?? ""
    };
  });

  const orders = (orderRows ?? []).map((row) => {
    const lots = Array.isArray(row.point_lots) ? row.point_lots : [];
    return {
      id: row.id,
      orderId: row.order_id,
      pointAmount: Number(row.point_amount),
      totalAmount: Number(row.total_amount),
      refundedPoints: Number(row.refunded_points),
      status: row.status,
      paymentKey: row.payment_key ?? "",
      paidAt: row.paid_at ?? "",
      createdAt: row.created_at,
      refundablePoints: lots.reduce((sum, lot) => sum + Number(lot.available_points ?? 0), 0)
    };
  });

  return {
    wallet: {
      businessId: walletRow.business_id,
      availablePoints: Number(walletRow.available_points),
      reservedPoints: Number(walletRow.reserved_points),
      promotionalPoints: Number(walletRow.promotional_points),
      paidPoints: Number(walletRow.paid_points),
      nextExpirationAt: walletRow.next_expiration_at
    },
    ledger,
    orders,
    reservations: (reservationRows ?? []).map((row) => ({
      campaignId: row.campaign_id,
      requestedHeadcount: Number(row.requested_headcount),
      reservedPoints: Number(row.reserved_points),
      billableHeadcount: row.billable_headcount === null ? null : Number(row.billable_headcount),
      consumedPoints: Number(row.consumed_points),
      returnedPoints: Number(row.returned_points),
      status: row.status
    }))
  };
}
