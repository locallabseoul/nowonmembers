import Link from "next/link";
import { BellRing } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { MarketingForm } from "./marketing-form";

export const metadata = {
  title: "수신 설정"
};

export default async function NotificationSettingsPage() {
  const { supabase, user } = await requireUser("/account/notifications");
  const { data: profile } = await supabase
    .from("profiles")
    .select("marketing_opt_in")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BellRing size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-charcoal">수신 설정</h1>
            <p className="mt-1 break-keep text-sm text-gray-500">광고성 문자를 받을지 직접 정할 수 있습니다.</p>
          </div>
        </div>

        <p className="mt-6 break-keep rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
          선정 결과나 제출 기한처럼 진행 중인 일에 대한 안내는 이 설정과 관계없이 계속 보내드립니다.
          서비스 이용에 꼭 필요한 내용이기 때문입니다.
        </p>

        <MarketingForm optIn={Boolean(profile?.marketing_opt_in)} />

        <Link href="/account/delete" className="mt-6 block text-center text-xs text-gray-400 underline hover:text-gray-500">
          회원 탈퇴
        </Link>
      </div>
    </main>
  );
}
