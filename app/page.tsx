import Link from "next/link";
import { Check, CheckCircle2, Clapperboard, Compass, Gift, Instagram, Landmark, MapPin, Megaphone, MousePointerClick, PenTool, Plus, Store, Users, UserPlus } from "lucide-react";
import { HomeHeroCarousel } from "@/app/components/home-hero-carousel";
import { getBusiness, stories } from "@/lib/data";
import { getPublicCampaigns, getPublicStories } from "@/lib/supabase/queries";
import type { Campaign, LocalStory } from "@/lib/types";

function campaignChannel(campaign: Campaign) {
  if (campaign.campaignType === "shortform") return { icon: <Clapperboard size={13} className="text-purple-600" />, label: "인스타 릴스" };
  if (campaign.campaignType === "interview") return { icon: <span className="font-black text-[#03C75A]">B</span>, label: "+ 인터뷰" };
  return { icon: <span className="font-black text-[#03C75A]">B</span>, label: "블로그" };
}

function statusLabel(campaign: Campaign) {
  if (campaign.status === "selecting") return "선정중";
  if (campaign.status === "completed") return "완료";
  return campaign.appliedCount >= campaign.recruitCount ? "마감임박" : "모집중";
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const business = getBusiness(campaign.businessId);
  const channel = campaignChannel(campaign);
  const status = statusLabel(campaign);
  const progress = Math.min(100, Math.round((campaign.appliedCount / Math.max(campaign.recruitCount, 1)) * 100));

  return (
    <Link href={`/campaigns/${campaign.id}`} className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-green">
      <div className="relative h-52 overflow-hidden">
        <img src={campaign.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-black text-charcoal shadow-sm backdrop-blur-sm">
            {channel.icon}
            {channel.label}
          </span>
          <span className="rounded-lg bg-primary px-2.5 py-1 text-xs font-black text-white shadow-sm">{status}</span>
        </div>
        <span className="absolute right-4 top-4 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-black text-white backdrop-blur-sm">D-4</span>
      </div>
      <div className="p-6">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin size={13} className="text-primary" />
          {campaign.region}{business?.businessName ? ` · ${business.businessName}` : ""}
        </div>
        <h3 className="mb-3 line-clamp-2 min-h-12 text-lg font-black leading-snug text-charcoal transition-colors group-hover:text-primary">{campaign.title}</h3>
        <p className="mb-4 line-clamp-2 text-sm leading-6 text-slate-500">{campaign.description}</p>
        <div className="border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Gift size={14} />
              </span>
              <span className="min-w-0 truncate text-sm font-extrabold text-charcoal">{campaign.benefitValue}</span>
            </div>
            <div className="shrink-0 text-right">
              <p className="mb-1 text-[10px] font-medium leading-none text-slate-400">신청 현황</p>
              <p className="text-sm font-extrabold leading-none text-charcoal">{campaign.appliedCount}/{campaign.recruitCount}명</p>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ContentTypeCard({
  title,
  subtitle,
  description,
  image,
  icon,
  tags,
  accentClass
}: {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  icon: React.ReactNode;
  tags: string[];
  accentClass: string;
}) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-100 bg-white transition-all hover:shadow-xl">
      <div className="relative h-48 overflow-hidden">
        <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
      </div>
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl border text-2xl ${accentClass}`}>{icon}</div>
          <div>
            <h3 className="text-lg font-black text-charcoal">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-slate-500">{description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentTile({ story, index }: { story: LocalStory; index: number }) {
  const labels = ["블로그", "피드", "릴스", "피드"];
  const creators = ["크리에이터 지민", "크리에이터 하은", "크리에이터 서연", "크리에이터 예진"];

  return (
    <Link href={`/stories/${story.id}`} className="group relative h-72 cursor-pointer overflow-hidden rounded-2xl md:h-80">
      <img src={story.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
      <div className="content-card-overlay absolute inset-0" />
      <div className="absolute bottom-4 left-4 right-4">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
            {labels[index % labels.length] === "블로그" ? <span className="text-xs font-black text-[#03C75A]">B</span> : null}
            {labels[index % labels.length] === "피드" ? <Instagram size={12} className="text-[#E1306C]" /> : null}
            {labels[index % labels.length] === "릴스" ? <Clapperboard size={12} className="text-white" /> : null}
            {labels[index % labels.length]}
          </span>
        </div>
        <p className="line-clamp-2 text-sm font-bold text-white">{story.title}</p>
        <div className="mt-2 flex items-center gap-2">
          <img src={`https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-${index + 1}.jpg`} className="h-5 w-5 rounded-full border border-white/30 object-cover" alt="" />
          <span className="text-xs text-white/70">{creators[index % creators.length]}</span>
        </div>
      </div>
    </Link>
  );
}

const serviceSteps = [
  {
    step: "STEP 01",
    title: "캠페인 생성",
    description: "운영자가 체험 내용, 혜택, 콘텐츠 유형을 설정하여 캠페인을 만듭니다.",
    icon: <Megaphone size={24} />
  },
  {
    step: "STEP 02",
    title: "크리에이터 지원",
    description: "관심 있는 크리에이터가 캠페인에 지원하고, 운영자가 선정합니다.",
    icon: <MousePointerClick size={24} />
  },
  {
    step: "STEP 03",
    title: "콘텐츠 제출",
    description: "체험 후 블로그, 인스타그램에 콘텐츠를 게시하고 링크를 제출합니다.",
    icon: <PenTool size={24} />
  },
  {
    step: "STEP 04",
    title: "완료",
    description: "운영자가 콘텐츠를 확인하고 승인하면 캠페인이 완료됩니다.",
    icon: <CheckCircle2 size={24} />
  }
];

const campaignMakerGroups = [
  {
    title: "지역 가게와 브랜드",
    description: "신메뉴, 공간, 서비스, 브랜드 이야기를 알리고 싶은 때 캠페인을 만들어보세요.",
    icon: <Store size={24} />,
    examples: ["카페 신메뉴 체험 캠페인", "음식점 방문 콘텐츠 캠페인", "책방·공방 소개 캠페인", "매장 사진·릴스 콘텐츠 캠페인"],
    tags: ["카페", "맛집", "뷰티샵", "공방"]
  },
  {
    title: "지역 기관과 단체",
    description: "행사, 축제, 프로젝트, 시민 참여 프로그램에 함께할 사람을 모집할 수 있습니다.",
    icon: <Landmark size={24} />,
    examples: ["지역 행사 크리에이터 모집", "전통시장 콘텐츠 캠페인", "청년 서포터즈 모집", "동네 기록 프로젝트"],
    tags: ["구청", "도서관", "문화센터"]
  },
  {
    title: "로컬 프로젝트 운영자",
    description: "동네를 기록하거나 지역 안에서 함께 만들고 싶은 프로젝트가 있다면 캠페인으로 시작할 수 있습니다.",
    icon: <Users size={24} />,
    examples: ["오래된 가게 인터뷰 프로젝트", "우리 동네 산책 콘텐츠", "골목 이야기 기록단", "지역 사진·영상 챌린지"],
    tags: ["기획 캠페인", "동네 프로젝트"]
  }
];

function ServiceProcessSection() {
  return (
    <section id="service-process" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-black text-charcoal">노원멤버스는 이런 서비스입니다</h2>
          <p className="text-slate-500">캠페인 생성부터 콘텐츠 완료까지, 간단한 4단계로 진행됩니다.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {serviceSteps.map((item, index) => (
            <div key={item.step} className="group relative rounded-2xl bg-slate-50 px-7 py-8 text-center transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-green">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                {item.icon}
              </div>
              <p className="mb-2 text-[11px] font-black tracking-wide text-primary">{item.step}</p>
              <h3 className="mb-4 text-base font-black text-charcoal">{item.title}</h3>
              <p className="text-sm leading-6 text-slate-500">{item.description}</p>
              {index < serviceSteps.length - 1 ? (
                <span className="absolute -right-3 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-sm lg:flex" aria-hidden>
                  &gt;
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CampaignMakersSection() {
  return (
    <section id="campaign-makers" className="bg-charcoal py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-black text-white">캠페인은 누가 만들 수 있나요?</h2>
          <p className="text-slate-400">노원멤버스에서는 지역에서 사람과 콘텐츠가 필요한 누구나 캠페인을 만들 수 있습니다.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {campaignMakerGroups.map((group) => (
            <div
              key={group.title}
              className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-green"
            >
              <div className="mb-7 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                  {group.icon}
                </div>
                <h3 className="text-xl font-black text-white">{group.title}</h3>
              </div>
              <p className="mb-7 text-sm leading-7 text-slate-400">{group.description}</p>
              <p className="mb-4 text-xs font-bold text-slate-500">예시</p>
              <ul className="mb-7 space-y-3">
                {group.examples.map((example) => (
                  <li key={example} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-charcoal">
                      <Check size={10} strokeWidth={4} />
                    </span>
                    {example}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {group.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [campaigns, remoteStories] = await Promise.all([getPublicCampaigns(), getPublicStories()]);
  const featuredCampaigns = campaigns.slice(0, 3);
  const contentStories = (remoteStories.length ? remoteStories : stories).slice(0, 4);

  return (
    <main className="flex-grow bg-white">
      <section className="hero-gradient relative overflow-hidden">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 -translate-y-1/2 translate-x-1/4 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 -translate-x-1/4 translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="flex flex-col items-center gap-14 lg:flex-row">
            <div className="flex-1 text-center lg:text-left">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                노원에서 시작하는 하이퍼로컬 캠페인 플랫폼
              </div>
              <h1 className="mb-5 text-4xl font-black leading-[1.18] tracking-tight text-charcoal lg:text-5xl xl:text-[3.5rem]">
                우리 동네 캠페인이
                <br />
                <span className="text-primary">시작되는 곳</span>
              </h1>
              <p className="mx-auto mb-1 max-w-xl text-lg leading-relaxed text-slate-500 lg:mx-0">가게의 콘텐츠부터 지역 프로젝트까지,</p>
              <p className="mx-auto mb-9 max-w-xl text-lg leading-relaxed text-slate-500 lg:mx-0">캠페인을 만들고 가까운 크리에이터와 함께해보세요.</p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link href="#campaign-list" className="flex items-center justify-center gap-2 rounded-full bg-charcoal px-8 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-slate-800">
                  <Compass size={18} />
                  캠페인 둘러보기
                </Link>
                <Link href="/business/campaigns/new" className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-4 text-base font-bold text-charcoal transition-all hover:border-primary hover:text-primary">
                  <Plus size={16} />
                  캠페인 만들기
                </Link>
              </div>
              <div className="mt-10 flex justify-center lg:justify-start">
                <dl className="grid w-full max-w-[360px] grid-cols-3 divide-x divide-slate-200 sm:max-w-[420px]">
                  <div className="px-4 text-left sm:px-6">
                    <dt className="text-3xl font-black tracking-tight text-charcoal">127</dt>
                    <dd className="mt-1 text-xs font-medium text-slate-400">누적 캠페인</dd>
                  </div>
                  <div className="px-4 text-left sm:px-6">
                    <dt className="text-3xl font-black tracking-tight text-charcoal">340+</dt>
                    <dd className="mt-1 text-xs font-medium text-slate-400">참여 크리에이터</dd>
                  </div>
                  <div className="px-4 text-left sm:px-6">
                    <dt className="text-3xl font-black tracking-tight text-charcoal">58</dt>
                    <dd className="mt-1 text-xs font-medium text-slate-400">협력 가게</dd>
                  </div>
                </dl>
              </div>
              <div className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-slate-400 lg:justify-start">
                <span className="h-4 w-4 rounded-full bg-primary/10 text-center text-[10px] leading-4 text-primary">i</span>
                블로그 · 인스타그램 피드 · 인스타그램 릴스로 참여할 수 있어요.
              </div>
            </div>

            <div className="flex w-full max-w-md flex-1 justify-center lg:max-w-none lg:justify-end">
              <HomeHeroCarousel />
            </div>
          </div>
        </div>
      </section>

      <section id="campaign-list" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h2 className="mb-2 text-3xl font-black text-charcoal">지금 노원에서 모집 중인 캠페인</h2>
              <p className="text-slate-500">가까운 동네의 브랜드와 프로젝트를 만나보세요.</p>
            </div>
            <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primaryHover">
              전체 캠페인 보기 <span aria-hidden>-&gt;</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredCampaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}
          </div>
        </div>
      </section>

      <section id="content-types" className="bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-black text-charcoal">어떤 콘텐츠로 참여할 수 있나요?</h2>
            <p className="text-slate-500">캠페인 목적에 맞춰 블로그, 피드, 릴스 콘텐츠를 선택할 수 있습니다.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ContentTypeCard
              title="블로그"
              subtitle="상세 리뷰 콘텐츠"
              image="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_b6fe1ec9cc_cd74fccec2ece25c.png"
              icon={<span className="font-black text-[#03C75A]">B</span>}
              description="검색에 오래 남는 상세 리뷰로 가게의 메뉴와 공간, 이용 경험을 꼼꼼하게 전달합니다."
              tags={["검색 노출", "상세 리뷰"]}
              accentClass="border-green-100 bg-green-50 text-green-600"
            />
            <ContentTypeCard
              title="인스타그램 피드"
              subtitle="사진 + 해시태그"
              image="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_352d5b3cff_f77aabc46a29ff61.png"
              icon={<Instagram />}
              description="감각적인 사진과 해시태그로 가게를 알립니다. 팔로워와의 높은 인게이지먼트가 특징입니다."
              tags={["비주얼", "해시태그"]}
              accentClass="border-pink-100 bg-pink-50 text-pink-600"
            />
            <ContentTypeCard
              title="인스타그램 릴스"
              subtitle="숏폼 영상 콘텐츠"
              image="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_4c994d6158_742ddb6a101a962c.png"
              icon={<Clapperboard />}
              description="릴스 영상으로 가게의 분위기와 음식을 생동감 있게 전달합니다. 바이럴 효과가 가장 높은 채널입니다."
              tags={["바이럴", "숏폼 영상"]}
              accentClass="border-purple-100 bg-purple-50 text-purple-600"
            />
          </div>
        </div>
      </section>

      <ServiceProcessSection />

      <CampaignMakersSection />

      <section id="dual-cta" className="bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-black text-charcoal">누구를 위한 서비스인가요?</h2>
            <p className="text-slate-500">크리에이터와 캠페인 운영자 모두를 위한 플랫폼입니다.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl">
              <div className="relative h-56 overflow-hidden">
                <img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_530ba33369_55d59c3ffc25a8bf.png" alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/30" />
              </div>
              <div className="p-8">
                <h3 className="mb-3 text-2xl font-black text-charcoal">내 콘텐츠와 맞는<br /><span className="text-primary">동네 캠페인</span>을 찾아보세요</h3>
                <p className="mb-6 text-sm leading-relaxed text-slate-500">가까운 가게를 직접 체험하고 나만의 콘텐츠를 만들어보세요. 지역 소상공인과 연결되어 특별한 경험을 쌓을 수 있습니다.</p>
                <FeatureList items={["블로그, 인스타그램 캠페인에 자유롭게 지원", "내 활동 이력과 포트폴리오 관리", "지역 가게와 직접 연결되는 경험"]} />
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href="/creator/profile" className="inline-flex items-center justify-center gap-2 rounded-full bg-charcoal px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800">
                    <UserPlus size={16} /> 크리에이터 등록하기
                  </Link>
                  <Link href="/campaigns" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-charcoal transition-all hover:border-primary hover:text-primary">
                    <Compass size={16} /> 캠페인 둘러보기
                  </Link>
                </div>
              </div>
            </div>

            <div className="group overflow-hidden rounded-3xl border border-charcoal bg-charcoal shadow-sm transition-all hover:shadow-xl">
              <div className="relative h-56 overflow-hidden">
                <img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_bfd290a8db_5a8175c564097a78.png" alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-charcoal/50" />
              </div>
              <div className="p-8">
                <h3 className="mb-3 text-2xl font-black text-white">함께할 크리에이터가 필요하다면<br /><span className="text-primary">캠페인</span>으로 시작하세요</h3>
                <p className="mb-6 text-sm leading-relaxed text-slate-400">노원 지역의 열정적인 크리에이터들이 가게를 직접 체험하고 생생한 콘텐츠를 만들어 드립니다.</p>
                <FeatureList dark items={["간편한 캠페인 생성", "지원자 목록 확인 및 직접 선정", "완성된 콘텐츠 아카이브 관리"]} />
                <Link href="/business/campaigns/new" className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all hover:bg-primaryHover">
                  <Plus size={16} /> 캠페인 만들기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="nowon-content" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h2 className="mb-2 text-3xl font-black text-charcoal">노원에서 만들어진 콘텐츠</h2>
              <p className="text-slate-500">크리에이터들이 직접 만든 생생한 리뷰를 확인해보세요.</p>
            </div>
            <Link href="/stories" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primaryHover">
              전체 콘텐츠 보기 <span aria-hidden>-&gt;</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {contentStories.map((story, index) => <ContentTile key={story.id} story={story} index={index} />)}
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureList({ items, dark = false }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className={`flex items-center gap-3 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${dark ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}>
            <Check size={13} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
