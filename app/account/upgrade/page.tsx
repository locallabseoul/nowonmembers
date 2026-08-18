import Link from "next/link";
import { BriefcaseBusiness, Camera, ShieldCheck } from "lucide-react";
import { FormBanner } from "@/app/components/form-field";
import { requireRole } from "@/lib/auth/guards";
import { upgradeResidentRole } from "./actions";

export const metadata = { title: "회원 유형 전환" };

export default async function UpgradeAccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }] = await Promise.all([searchParams, requireRole("resident", "/account/upgrade")]);

  return (
    <main className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck size={22} /></span>
          <h1 className="mt-5 text-3xl font-black text-charcoal">활동 유형 전환</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">주민 회원에서 한 번 전환하면 직접 되돌릴 수 없습니다. 이후 변경은 운영자에게 문의해주세요.</p>
        </div>
        {error ? <div className="mx-auto mt-6 max-w-xl"><FormBanner>{error}</FormBanner></div> : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-sm">
            <Camera className="text-primary" size={28} />
            <h2 className="mt-4 text-xl font-black text-charcoal">크리에이터로 전환</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">캠페인에 지원하고 가게를 체험한 콘텐츠를 만들 수 있습니다. 전환 후 활동 지역과 채널 프로필을 완성해주세요.</p>
            <form action={upgradeResidentRole} className="mt-6">
              <input type="hidden" name="target_role" value="creator" />
              <button className="w-full rounded-xl bg-primary py-3.5 text-sm font-black text-white">크리에이터로 전환</button>
            </form>
          </section>

          <section className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-sm">
            <BriefcaseBusiness className="text-primary" size={28} />
            <h2 className="mt-4 text-xl font-black text-charcoal">가게·브랜드로 전환</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">쿠폰과 캠페인을 만들 수 있습니다. 기본 가게 정보를 입력한 뒤 상세 프로필을 완성해주세요.</p>
            <form action={upgradeResidentRole} className="mt-6 space-y-4">
              <input type="hidden" name="target_role" value="business" />
              <label className="block text-sm font-bold text-charcoal">상호
                <input name="business_name" required minLength={2} placeholder="노원 동네가게" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-primary" />
              </label>
              <label className="block text-sm font-bold text-charcoal">업종
                <input name="business_category" required placeholder="카페, 음식점, 소매점 등" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-primary" />
              </label>
              <button className="w-full rounded-xl bg-charcoal py-3.5 text-sm font-black text-white">가게·브랜드로 전환</button>
            </form>
          </section>
        </div>
        <Link href="/my/coupons" className="mt-8 block text-center text-sm font-bold text-gray-400 hover:text-primary">내 쿠폰함으로 돌아가기</Link>
      </div>
    </main>
  );
}
