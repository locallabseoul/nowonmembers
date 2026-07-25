import Link from "next/link";
import { LegalCloseButton } from "@/app/components/legal-close-button";
import type { LegalSection } from "@/lib/legal";

export function LegalPage({
  title,
  description,
  sections,
  companionLink
}: {
  title: string;
  description: string;
  sections: LegalSection[];
  companionLink: {
    href: string;
    label: string;
  };
}) {
  return (
    <main className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-10">
        <div className="border-b border-gray-100 pb-8">
          <p className="text-sm font-black text-primary">NOWON MEMBERS</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-charcoal sm:text-4xl">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-gray-500">{description}</p>
        </div>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-lg font-black text-charcoal">{section.title}</h2>
              {section.body ? <p className="text-sm leading-7 text-gray-600">{section.body}</p> : null}
              {section.items ? (
                <ul className="space-y-2 text-sm leading-7 text-gray-600">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-primary/20 bg-primary/10 p-5 text-sm leading-6 text-charcoal">
          <p className="font-black">운영 전 확인 필요</p>
          <p className="mt-2 text-gray-600">이 문서는 서비스 기본 틀이며, 정식 오픈 전 사업자 정보, 고객센터 연락처, 위탁 처리 업체, 실제 운영 정책을 반영해 최종 검토해야 합니다.</p>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href={companionLink.href} className="text-sm font-bold text-primary hover:underline">
            {companionLink.label}
          </Link>
          <LegalCloseButton />
        </div>
      </article>
    </main>
  );
}
