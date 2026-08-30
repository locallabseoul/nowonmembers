import Link from "next/link";
import { ArrowRight, CircleHelp, Link2, Megaphone, Package, Store, Ticket } from "lucide-react";

const managedContents = [
  {
    title: "외부 링크",
    description: "스마트스토어·예약·메뉴판 등 공개로 설정한 링크",
    action: "링크 관리",
    href: "#links",
    icon: Link2,
    tone: "bg-sky-50 text-sky-600"
  },
  {
    title: "제품",
    description: "제품 관리에서 공개로 설정한 제품 정보와 구매 링크",
    action: "제품 관리",
    href: "/business/products",
    icon: Package,
    tone: "bg-violet-50 text-violet-600"
  },
  {
    title: "쿠폰",
    description: "운영자 승인을 받고 현재 발급 중인 쿠폰",
    action: "쿠폰 관리",
    href: "/business/coupons",
    icon: Ticket,
    tone: "bg-orange-50 text-primary"
  },
  {
    title: "캠페인",
    description: "현재 크리에이터를 모집 중인 캠페인",
    action: "캠페인 관리",
    href: "/business/dashboard",
    icon: Megaphone,
    tone: "bg-emerald-50 text-emerald-600"
  }
];

export function MinihomeContentGuide() {
  return (
    <section className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-start gap-3 border-b border-gray-100 p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CircleHelp size={20} /></span>
        <div>
          <h2 className="text-lg font-black text-charcoal">미니홈에는 어떤 내용이 표시되나요?</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">정보마다 관리하는 위치가 다릅니다. 아래 버튼을 누르면 해당 수정 화면으로 이동합니다.</p>
        </div>
      </div>

      <div className="p-6">
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm"><Store size={20} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-charcoal">가게 소개와 기본 정보</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-primary">프로필 정보 연동</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600">대표 이미지, 가게명, 업종, 한 줄 소개, 상세 소개, 주소, 전화, 영업시간, 웹사이트·SNS가 표시됩니다.</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">입력하지 않은 선택 정보는 미니홈에서 빈칸 없이 자동으로 숨겨집니다.</p>
            </div>
            <Link href="/business/dashboard?profile=edit" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white">
              프로필 수정 <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {managedContents.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href} className="group flex items-center gap-3 rounded-2xl border border-gray-100 p-4 transition hover:border-primary/30 hover:bg-slate-50">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}><Icon size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-charcoal">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-gray-500">{item.description}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-gray-400 transition group-hover:text-primary">
                  {item.action}<ArrowRight size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
