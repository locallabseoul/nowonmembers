"use client";

import { ChevronLeft, ChevronRight, Clapperboard, Gift, Instagram, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

type HeroSlide = {
  type: "blog" | "reels" | "feed";
  label: string;
  image: string;
  region: string;
  title: string;
  benefit: string;
  recruitCount: number;
  appliedCount: number;
  dday: string;
};

const slides: HeroSlide[] = [
  {
    type: "blog",
    label: "블로그",
    image: "https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_b6fe1ec9cc_cd74fccec2ece25c.png",
    region: "공릉동",
    title: "공릉동 카페 신메뉴 콘텐츠 캠페인",
    benefit: "신메뉴 음료 2잔 + 디저트 제공",
    recruitCount: 5,
    appliedCount: 2,
    dday: "D-4"
  },
  {
    type: "reels",
    label: "인스타 릴스",
    image: "/images/nowon-local-market.webp",
    region: "노원구 일대",
    title: "노원 로컬마켓 현장 기록 캠페인",
    benefit: "행사 초대 + 활동비",
    recruitCount: 10,
    appliedCount: 7,
    dday: "D-7"
  },
  {
    type: "feed",
    label: "인스타 피드",
    image: "/images/bookshop-instagram-feed.webp",
    region: "월계동",
    title: "동네책방의 하루를 기록해주세요",
    benefit: "도서 1권 + 음료 제공",
    recruitCount: 3,
    appliedCount: 1,
    dday: "D-5"
  }
];

function ChannelIcon({ type }: { type: HeroSlide["type"] }) {
  if (type === "reels") return <Clapperboard size={13} className="text-purple-600" />;
  if (type === "feed") return <Instagram size={13} className="text-[#E1306C]" />;
  return <span className="font-black text-[#03C75A]">B</span>;
}

export function HomeHeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-[400px]">
      <div className="overflow-hidden rounded-3xl">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide) => (
              <div key={slide.title} className="w-full shrink-0">
                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
                  <div className="relative h-52 overflow-hidden">
                    <img className="h-full w-full object-cover" src={slide.image} alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="absolute bottom-4 right-4 z-10 rounded-full bg-charcoal/60 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur-sm">예시 화면</span>
                    <div className="absolute left-4 top-4 flex gap-2">
                      <span className="flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-black shadow-sm backdrop-blur-sm">
                        <ChannelIcon type={slide.type} />
                        {slide.label}
                      </span>
                      <span className="rounded-lg bg-primary px-2.5 py-1 text-xs font-black text-white shadow-sm">모집중</span>
                    </div>
                    <div className="absolute right-4 top-4 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-black text-white backdrop-blur-sm">{slide.dday}</div>
                    <div className="absolute bottom-4 left-4 flex -space-x-2">
                      {[1, 2, 3].slice(0, Math.min(3, slide.appliedCount)).map((avatar) => (
                        <img
                          key={avatar}
                          src={`https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-${avatar}.jpg`}
                          className="h-7 w-7 rounded-full border-2 border-white object-cover"
                          alt=""
                        />
                      ))}
                      {slide.appliedCount > 3 ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[9px] font-black text-slate-500">
                          +{slide.appliedCount - 3}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin size={12} className="text-primary" />
                      {slide.region}
                    </div>
                    <h4 className="mb-4 text-base font-black leading-snug text-charcoal">{slide.title}</h4>
                    <div className="border-t border-slate-100 pt-5">
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Gift size={14} />
                          </span>
                          <span className="min-w-0 truncate text-sm font-extrabold text-charcoal">{slide.benefit}</span>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="mb-1 text-[10px] font-medium leading-none text-slate-400">신청자</p>
                          <p className="text-sm font-extrabold leading-none text-charcoal">{slide.appliedCount}명</p>
                          <p className="mt-1 text-[10px] font-bold leading-none text-slate-400">선정 {slide.recruitCount}명</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-primary hover:text-primary"
            onClick={() => setIndex((currentIndex) => (currentIndex - 1 + slides.length) % slides.length)}
            aria-label="이전 캠페인"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-white shadow-sm transition-all hover:bg-primary"
            onClick={() => setIndex((currentIndex) => (currentIndex + 1) % slides.length)}
            aria-label="다음 캠페인"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.title}
              className={`h-2 rounded transition-all ${slideIndex === index ? "w-5 bg-primary" : "w-2 bg-slate-300"}`}
              onClick={() => setIndex(slideIndex)}
              aria-label={`${slideIndex + 1}번 캠페인 보기`}
            />
          ))}
        </div>
        <div className="text-xs font-bold text-slate-400">
          <span className="text-primary">{index + 1}</span> / {slides.length}
        </div>
      </div>
    </div>
  );
}
