import Link from "next/link";
import { UserRound } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { normalizeKoreanAuthPhone } from "@/lib/auth/phone";
import { ResidentProfileForm } from "./profile-form";

export const metadata = {
  title: "프로필 수정"
};

function formatPhone(value: string) {
  const digits = normalizeKoreanAuthPhone(value);
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

export default async function ResidentProfilePage() {
  const { supabase, user } = await requireRole("resident", "/account/profile");
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname,name,email,phone")
    .eq("id", user.id)
    .single();

  return (
    <main className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-charcoal">프로필 수정</h1>
            <p className="mt-1 text-sm text-gray-500">서비스에 표시되는 주민 회원 정보를 관리합니다.</p>
          </div>
        </div>

        <ResidentProfileForm
          profile={{
            nickname: profile?.nickname ?? "",
            name: profile?.name ?? "",
            email: profile?.email ?? "",
            phone: formatPhone(profile?.phone || user.phone || "")
          }}
        />

        <Link href="/my" className="mt-5 block text-center text-sm font-bold text-gray-400 hover:text-primary">
          마이페이지로 돌아가기
        </Link>
      </div>
    </main>
  );
}
