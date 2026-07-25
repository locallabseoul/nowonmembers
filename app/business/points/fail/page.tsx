import Link from "next/link";
import { CircleX } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";

export default async function PointPaymentFailPage({
  searchParams
}: {
  searchParams: Promise<{ code?: string; message?: string; orderId?: string; campaign?: string }>;
}) {
  const { code, message, orderId, campaign } = await searchParams;
  const { supabase } = await requireRole("business", "/business/points");

  if (orderId) {
    await supabase.rpc("mark_point_payment_failed", {
      target_order_id: orderId,
      target_code: code ?? "PAYMENT_FAILED",
      target_message: message ?? "결제가 완료되지 않았습니다."
    });
  }

  const params = new URLSearchParams();
  if (campaign) params.set("campaign", campaign);

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#F8F9FA] px-4">
      <section className="w-full max-w-md rounded-[20px] border border-gray-100 bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <CircleX size={42} className="mx-auto text-red-500" />
        <h1 className="mt-5 text-xl font-black text-charcoal">포인트 충전이 완료되지 않았습니다</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">{message ?? "결제를 취소했거나 카드사 승인이 거절되었습니다."}</p>
        <Link href={`/business/points${params.toString() ? `?${params.toString()}` : ""}`} className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-black text-white">
          포인트 화면으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
