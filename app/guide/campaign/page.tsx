import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, MapPin, Store, Users, X } from "lucide-react";
import {
  CAMPAIGN_GUIDE_CLOSING,
  CAMPAIGN_GUIDE_HERO,
  CAMPAIGN_GUIDE_META,
  COMPARISON_SECTION,
  LOCAL_VALUE_SECTION,
  campaignGuideFaq,
  campaignGuideSections
} from "@/lib/campaign-guide";

export const metadata: Metadata = {
  title: "캠페인 작성 가이드",
  description:
    "노원에서 살고 일하는 로컬 크리에이터와 우리 가게를 연결합니다. 지원이 잘 들어오는 캠페인을 쓰는 법을 안내합니다.",
  openGraph: {
    title: "우리 동네를 가장 잘 아는 사람이, 우리 가게의 이야기를 전합니다",
    description:
      "노원에서 살고 일하는 로컬 크리에이터와 우리 가게를 연결합니다. 지원이 잘 들어오는 캠페인을 쓰는 법을 안내합니다."
  }
};

export default function CampaignGuidePage() {
  return (
    <main className="bg-white">
      <Hero />
      <LocalValue />
      <Comparison />
      <GuideSteps />
      <Faq />
      <Closing />
    </main>
  );
}

function Hero() {
  return (
    <section className="border-b border-gray-100 bg-gradient-to-b from-primaryLight to-white">
      <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <p className="text-sm font-black tracking-wide text-primary">{CAMPAIGN_GUIDE_HERO.eyebrow}</p>
        <h1 className="mt-4 text-[28px] font-black leading-[1.4] tracking-tight text-charcoal sm:text-[42px] sm:leading-[1.32]">
          {CAMPAIGN_GUIDE_HERO.headingLead}
          <br />
          <span className="text-primary">{CAMPAIGN_GUIDE_HERO.headingHighlight}</span>
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">
          {CAMPAIGN_GUIDE_HERO.body}
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/business/campaigns/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-4 font-black text-white shadow-[0_12px_30px_rgba(34,197,94,0.28)] transition-colors hover:bg-primaryHover"
          >
            {CAMPAIGN_GUIDE_HERO.primaryCta}
            <ArrowRight size={17} />
          </Link>
          <Link
            href="/campaigns"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-4 font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary"
          >
            {CAMPAIGN_GUIDE_HERO.secondaryCta}
          </Link>
        </div>

        <dl className="mt-12 flex w-full max-w-2xl flex-col divide-y divide-primaryBorder rounded-[20px] border border-primaryBorder bg-white/80 px-6 py-5 backdrop-blur sm:flex-row sm:divide-x sm:divide-y-0 sm:px-0 sm:py-0">
          {CAMPAIGN_GUIDE_META.map((item) => (
            <div key={item.label} className="flex-1 py-3 sm:px-6 sm:py-5">
              <dt className="text-xs font-bold text-gray-500">{item.label}</dt>
              <dd className="mt-1.5 font-black text-charcoal">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function LocalValue() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <SectionBadge>{LOCAL_VALUE_SECTION.badge}</SectionBadge>
      <h2 className="mt-5 max-w-3xl text-2xl font-black leading-[1.45] text-charcoal sm:text-[32px]">
        {LOCAL_VALUE_SECTION.heading}
        <span className="text-primary">{LOCAL_VALUE_SECTION.highlight}</span>
      </h2>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">{LOCAL_VALUE_SECTION.body}</p>

      <ConnectionDiagram />

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {LOCAL_VALUE_SECTION.points.map((point) => (
          <div key={point.title} className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primaryLight text-primary">
                <Check size={14} strokeWidth={3} />
              </span>
              <div>
                <p className="font-black text-charcoal">{point.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">{point.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// 가게 · 로컬 크리에이터 · 지역 주민이 이어지는 구조를 한눈에 보여준다.
function ConnectionDiagram() {
  const nodes = [
    { icon: <Store size={22} />, label: "우리 가게", caption: "노원의 지역 상권" },
    { icon: <MapPin size={22} />, label: "로컬 크리에이터", caption: "노원에서 생활하는 사람" },
    { icon: <Users size={22} />, label: "지역 주민", caption: "실제로 찾아오는 손님" }
  ];

  return (
    <div className="mt-12 rounded-[24px] bg-[#F5F6F8] px-6 py-10 sm:px-10">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center">
        {nodes.map((node, index) => (
          <div key={node.label} className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex w-full flex-col items-center rounded-[20px] border border-gray-100 bg-white px-6 py-7 text-center shadow-[0_8px_30px_rgb(0,0,0,0.05)] sm:w-44">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primaryLight text-primary">
                {node.icon}
              </span>
              <p className="mt-4 font-black text-charcoal">{node.label}</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">{node.caption}</p>
            </div>
            {index < nodes.length - 1 ? (
              <span className="flex items-center justify-center text-primary">
                <ArrowRight size={20} className="rotate-90 sm:rotate-0" />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm font-bold leading-6 text-gray-500">
        콘텐츠가 지역 안에서 돌기 때문에, 한 번의 캠페인이 단골로 이어집니다.
      </p>
    </div>
  );
}

function Comparison() {
  return (
    <section className="bg-[#F5F6F8]">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <SectionBadge>{COMPARISON_SECTION.badge}</SectionBadge>
        <h2 className="mt-5 max-w-3xl text-2xl font-black leading-[1.45] text-charcoal sm:text-[32px]">
          {COMPARISON_SECTION.heading}
          <span className="text-primary">{COMPARISON_SECTION.highlight}</span>
        </h2>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">{COMPARISON_SECTION.body}</p>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border border-gray-200 bg-white p-6 sm:p-8">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-500">
              {COMPARISON_SECTION.ordinaryLabel}
            </p>
            <ul className="mt-6 space-y-4">
              {COMPARISON_SECTION.rows.map((row) => (
                <li key={row.ordinary} className="flex items-start gap-3 text-sm leading-6 text-gray-400">
                  <X size={16} className="mt-0.5 shrink-0 text-gray-300" />
                  {row.ordinary}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[24px] border border-primary/30 bg-white p-6 shadow-[0_16px_40px_rgba(34,197,94,0.12)] sm:p-8">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primaryLight px-3 py-1.5 text-xs font-black text-primaryHover">
              {COMPARISON_SECTION.membersLabel}
            </p>
            <ul className="mt-6 space-y-4">
              {COMPARISON_SECTION.rows.map((row) => (
                <li key={row.members} className="flex items-start gap-3 text-sm font-bold leading-6 text-charcoal">
                  <Check size={16} className="mt-0.5 shrink-0 text-primary" strokeWidth={3} />
                  {row.members}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function GuideSteps() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <SectionBadge>캠페인 작성 가이드</SectionBadge>
      <h2 className="mt-5 max-w-3xl text-2xl font-black leading-[1.45] text-charcoal sm:text-[32px]">
        같은 가게여도 어떻게 적었는지에 따라 <span className="text-primary">지원자 수가 달라집니다</span>
      </h2>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
        실제로 자주 막히는 지점만 모아 4단계로 정리했습니다.
      </p>

      <div className="mt-10 space-y-6">
        {campaignGuideSections.map((section, index) => {
          const visualFirst = index % 2 === 1;

          return (
            <section
              key={section.step}
              className={`rounded-[24px] p-6 sm:p-10 ${index % 2 === 1 ? "bg-[#F5F6F8]" : "border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"}`}
            >
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
                <div className={visualFirst ? "lg:order-2" : undefined}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-charcoal px-3 py-1.5 text-xs font-black text-white">{section.step}</span>
                    <span className={`rounded-lg px-3 py-1.5 text-xs font-black text-gray-500 ${index % 2 === 1 ? "bg-white" : "bg-gray-100"}`}>
                      {section.badge}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-black leading-[1.5] text-charcoal sm:text-2xl">
                    {section.heading}
                    <span className="text-primary">{section.highlight}</span>
                    {section.headingTail}
                  </h3>

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
    </section>
  );
}

function Faq() {
  return (
    <section className="bg-[#F5F6F8]">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <SectionBadge>자주 묻는 질문</SectionBadge>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {campaignGuideFaq.map((item) => (
            <div key={item.question} className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <p className="font-black text-charcoal">{item.question}</p>
              <p className="mt-3 text-sm leading-7 text-gray-500">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="bg-charcoal">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <h2 className="text-2xl font-black leading-[1.45] text-white sm:text-[32px]">
              {CAMPAIGN_GUIDE_CLOSING.heading}
              <br />
              <span className="text-primary">{CAMPAIGN_GUIDE_CLOSING.headingHighlight}</span>
            </h2>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base sm:leading-8">
              {CAMPAIGN_GUIDE_CLOSING.body}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/business/campaigns/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-4 font-black text-white transition-colors hover:bg-primaryHover"
              >
                {CAMPAIGN_GUIDE_CLOSING.primaryCta}
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/campaigns"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-7 py-4 font-bold text-white transition-colors hover:bg-white/10"
              >
                {CAMPAIGN_GUIDE_CLOSING.secondaryCta}
              </Link>
            </div>
          </div>

          <CampaignCardPreview />
        </div>
      </div>
    </section>
  );
}

// 실제 캠페인 카드가 어떤 모습인지 감이 오도록 축약해 보여준다.
function CampaignCardPreview() {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
      <div className="rounded-[18px] bg-white p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primaryLight px-2.5 py-1 text-[11px] font-black text-primaryHover">모집 중</span>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black text-gray-500">맛집/카페</span>
        </div>
        <p className="mt-4 text-sm font-black leading-6 text-charcoal">
          공릉동 신메뉴 파스타 4종,
          <br />
          블로그 리뷰 4명 모집
        </p>
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
          <p className="flex items-center gap-2">
            <MapPin size={13} className="text-primary" />
            공릉동 · 경춘포레스트
          </p>
          <p className="flex items-center gap-2">
            <Users size={13} className="text-primary" />
            신청 12명 · 선정 4명
          </p>
        </div>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-slate-400">
        작성한 캠페인은 이렇게 노출됩니다.
      </p>
    </div>
  );
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-lg bg-primaryLight px-3 py-1.5 text-xs font-black text-primaryHover">
      {children}
    </span>
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
