import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { DeleteAccountForm } from "./delete-account-form";

export const metadata = {
  title: "회원 탈퇴"
};

export default async function DeleteAccountPage() {
  await requireUser("/account/delete");

  return (
    <main className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-charcoal">회원 탈퇴</h1>
            <p className="mt-1 text-sm text-gray-500">탈퇴 전 아래 내용을 꼭 확인해주세요.</p>
          </div>
        </div>

        <ul className="mt-6 space-y-3 rounded-xl bg-gray-50 p-5 text-sm leading-6 text-gray-600">
          <li className="flex gap-2">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
            <span>탈퇴 후에는 계정과 프로필을 복구할 수 없습니다. 같은 전화번호로 다시 가입할 수는 있지만 이전 활동 내역은 이어지지 않습니다.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
            <span>잔여 포인트는 모두 소멸되며 복구되지 않습니다. 환불 가능한 유상 포인트가 있다면 탈퇴 전에 환불을 먼저 진행해주세요.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
            <span>진행 중인 캠페인·협업이나 처리 중인 환불이 있으면 탈퇴할 수 없습니다. 먼저 완료하거나 취소해주세요.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
            <span>
              결제·정산 등 거래 기록이 있는 경우 개인정보는 즉시 삭제되지만, 해당 기록은{" "}
              <Link href="/terms" className="text-primary underline underline-offset-2">이용약관</Link>과 관계 법령에 따라 필요한 기간 동안 보관됩니다.
            </span>
          </li>
        </ul>

        <DeleteAccountForm />

        <p className="mt-6 text-center text-xs text-gray-400">
          탈퇴에 문제가 있다면 locallab.seoul@gmail.com으로 문의해주세요.
        </p>
      </div>
    </main>
  );
}
