import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, X } from "lucide-react";
import { CAMPAIGN_GUIDE_META, campaignGuideFaq, campaignGuideSections } from "@/lib/campaign-guide";

export const metadata: Metadata = {
  title: "캠페인 작성 가이드",
  description: "지원이 잘 들어오는 캠페인을 쓰는 법. 제목부터 미션, 포인트 예약까지 4단계로 안내합니다.",
  openGraph: {
    title: "캠페인 작성 가이드",
    description: "지원이 잘 들어오는 캠페인을 쓰는 법. 제목부터 미션, 포인트 예약까지 4단계로 안내합니다."
  }
};

export default function CampaignGuidePage() {
  return (
    <main className="bg-white">
      <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pt-16 lg:px-8">
        <p className="text-sm font-black tracking-wide text-primary">CAMPAIGN GUIDE</p>
        <h1 className="mt-4 text-[28px] font-black leading-[1.4] tracking-tight text-charcoal sm:text-4xl sm:leading-[1.35]">
          좋은 캠페인이
          <br />
          좋은 크리에이터를 부릅니다
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-gray-500 sm:text-base">
          같은 가게, 같은 혜택이어도 어떻게 적었는지에 따라 지원자 수와 결과물의 질이 달라집니다. 실제로 자주 막히는 지점만
          모아 4단계로 정리했습니다.
        </p>

        <dl className="mt-9 flex w-full max-w-2xl flex-col divide-y divide-primaryBorder rounded-[20px] border border-primaryBorder bg-primaryLight px-6 py-5 sm:flex-row sm:divide-x sm:divide-y-0 sm:px-0 sm:py-0">
          {CAMPAIGN_GUIDE_META.map((item) => (
            <div key={item.label} className="flex-1 py-3 sm:px-6 sm:py-5">
              <dt className="text-xs font-bold text-gray-500">{item.label}</dt>
              <dd className="mt-1.5 font-black text-charcoal">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        {campaignGuideSections.map((section, index) => {
          const visualFirst = index % 2 === 1;

          return (
            <section key={section.step} className="rounded-[24px] bg-[#F5F6F8] p-6 sm:p-10">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
                <div className={visualFirst ? "lg:order-2" : undefined}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-charcoal px-3 py-1.5 text-xs font-black text-white">{section.step}</span>
                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-black text-gray-500">{section.badge}</span>
                  </div>

                  <h2 className="mt-5 text-xl font-black leading-[1.5] text-charcoal sm:text-2xl">
                    {section.heading}
                    <span className="text-primary">{section.highlight}</span>
                    {section.headingTail}
                  </h2>

                  <p className="mt-5 text-sm leading-7 text-gray-600">{section.body}</p>

                  <ul className="mt-6 space-y-2.5 border-t border-gray-200 pt-6">
                    {section.checklist.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm leading-6 text-gray-600">
                        <Check size={16} className="mt-1 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={visualFirst ? "lg:order-1" : undefined}>
                  <p className="text-xs font-bold text-gray-400">{section.caption}</p>
                  <p className="mt-2 font-black text-charcoal">{section.exampleTitle}</p>

                  <div className="mt-4 space-y-3">
                    <ExampleCard
                      tone="weak"
                      label={section.example.weakLabel ?? "아쉬운 예"}
                      items={section.example.weak}
                      strike={section.example.strikeWeak ?? true}
                    />
                    <ExampleCard
                      tone="strong"
                      label={section.example.strongLabel ?? "좋은 예"}
                      items={section.example.strong}
                    />
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="text-xl font-black text-charcoal sm:text-2xl">자주 묻는 질문</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {campaignGuideFaq.map((item) => (
            <div key={item.question} className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <p className="font-black text-charcoal">{item.question}</p>
              <p className="mt-3 text-sm leading-7 text-gray-500">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 rounded-[24px] bg-charcoal px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black leading-[1.5] text-white sm:text-2xl">
              이제 캠페인을 만들어볼까요?
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              작성 중에도 언제든 이 가이드로 돌아올 수 있습니다. 검수 요청 전까지는 저장해두고 이어서 쓸 수 있어요.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/business/campaigns/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-black text-white transition-colors hover:bg-primaryHover"
            >
              캠페인 만들기
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/campaigns"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 font-bold text-white transition-colors hover:bg-white/10"
            >
              다른 캠페인 둘러보기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ExampleCard({
  tone,
  label,
  items,
  strike = false
}: {
  tone: "weak" | "strong";
  label: string;
  items: string[];
  strike?: boolean;
}) {
  const strong = tone === "strong";

  return (
    <div
      className={`rounded-[20px] border bg-white p-5 ${
        strong ? "border-primary/30 shadow-[0_8px_30px_rgba(34,197,94,0.10)]" : "border-gray-200"
      }`}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${
          strong ? "bg-primaryLight text-primaryHover" : "bg-gray-100 text-gray-500"
        }`}
      >
        {strong ? <Check size={13} /> : <X size={13} />}
        {label}
      </span>
      <ul className="mt-3.5 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className={`text-sm leading-6 ${
              strong ? "font-bold text-charcoal" : `text-gray-400${strike ? " line-through decoration-gray-300" : ""}`
            }`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
