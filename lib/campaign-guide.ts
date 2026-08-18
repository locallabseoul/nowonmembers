import { LAUNCH_BONUS_POINTS, LAUNCH_BONUS_VALID_DAYS, formatPoints } from "@/lib/points";

export const LAUNCH_EVENT_BANNER = {
  badge: "2026 오픈 이벤트",
  headline: `가게 프로필만 등록해도 ${formatPoints(LAUNCH_BONUS_POINTS)}`,
  terms: `지급일로부터 ${LAUNCH_BONUS_VALID_DAYS}일간 사용 가능`
};

export const CAMPAIGN_GUIDE_HERO = {
  eyebrow: "NOWON MEMBERS",
  headingLead: "우리 동네를 가장 잘 아는 사람이,",
  headingHighlight: "우리 가게의 이야기를 전합니다",
  body:
    "노원에서 살고, 일하고, 일상을 보내는 로컬 크리에이터와 지역의 가게를 연결하는 하이퍼로컬 콘텐츠 플랫폼입니다.",
  primaryCta: "우리 가게 캠페인 만들기",
  secondaryCta: "노원의 캠페인 둘러보기"
};

export const LOCAL_VALUE_SECTION = {
  badge: "지역성",
  heading: "지역을 아는 사람이 만드는 ",
  highlight: "콘텐츠는 다릅니다",
  body:
    "노원의 골목과 상권, 주민의 생활 방식을 잘 아는 로컬 크리에이터가 직접 가게를 방문하고 자신의 경험을 콘텐츠로 기록합니다.",
  points: [
    {
      title: "노원에서 생활하는 크리에이터",
      description: "노원에서 살거나 일하며 지역을 자주 경험하는 사람들이 참여합니다."
    },
    {
      title: "상권을 이해하는 콘텐츠",
      description: "가게의 위치와 주변 상권을 알기 때문에 어떤 손님에게 닿아야 하는지 압니다."
    },
    {
      title: "한 번으로 끝나지 않는 관계",
      description: "일회성 방문이 아니라 지역 안에서 계속 이어지는 관계로 남습니다."
    },
    {
      title: "실제 고객에게 닿는 이야기",
      description: "같은 생활권 주민이 공감할 수 있는 이야기가 만들어집니다."
    }
  ]
};

export const COMPARISON_SECTION = {
  badge: "일반 체험단과의 차이",
  heading: "한 번의 체험으로 끝나지 않는 ",
  highlight: "로컬 콘텐츠",
  body:
    "노원멤버스는 단순한 체험 후기를 넘어, 가게와 동네의 이야기가 지역 안에서 이어지는 콘텐츠를 만듭니다.",
  ordinaryLabel: "일반적인 체험단",
  membersLabel: "노원멤버스",
  rows: [
    { ordinary: "지역과 관계없는 방문자", members: "노원에서 생활하는 로컬 크리에이터" },
    { ordinary: "상품 중심의 단발성 후기", members: "가게와 동네 이야기를 함께 담은 콘텐츠" },
    { ordinary: "체험 후 관계 종료", members: "지역 안에서 다시 연결될 수 있는 관계" },
    { ordinary: "전국 단위의 불특정 홍보", members: "노원 생활권을 중심으로 한 지역 홍보" }
  ]
};

export const CAMPAIGN_GUIDE_CLOSING = {
  heading: "노원을 아는 크리에이터와",
  headingHighlight: "우리 가게의 이야기를 시작해보세요",
  body:
    "노원멤버스는 노원에서 살고, 일하고, 일상을 보내는 로컬 크리에이터와 지역의 가게를 연결합니다. 우리 동네를 직접 경험하고 이해하는 크리에이터가 가게의 상품과 공간, 사장님의 이야기를 콘텐츠로 기록할 수 있도록 좋은 캠페인을 만드는 방법을 안내해드립니다.",
  primaryCta: "우리 가게 캠페인 만들기",
  secondaryCta: "노원의 캠페인 둘러보기"
};

export const CAMPAIGN_GUIDE_META = [
  { label: "작성 단계", value: "4단계" },
  { label: "예상 소요", value: "약 10분" },
  { label: "필요 포인트", value: "모집 1명당 5,000P" }
];

export type GuideExample = {
  weak: string[];
  strong: string[];
  weakLabel?: string;
  strongLabel?: string;
  // 잘못 쓴 예가 아니라 단순 대비일 때는 취소선을 긋지 않는다.
  strikeWeak?: boolean;
};

export type GuideSection = {
  step: string;
  badge: string;
  heading: string;
  highlight: string;
  headingTail?: string;
  body: string;
  caption: string;
  exampleTitle: string;
  example: GuideExample;
  checklist: string[];
};

export const campaignGuideSections: GuideSection[] = [
  {
    step: "STEP 1",
    badge: "캠페인 제목 작성",
    heading: "제목만 읽어도 ",
    highlight: "무엇을, 누구에게 맡기는지",
    headingTail: " 알 수 있게 써주세요",
    body: "크리에이터는 목록에서 제목과 대표 이미지만 보고 들어올지 말지를 정합니다. 업종, 지역, 맡길 콘텐츠가 제목에 들어가면 지원자의 성격이 달라집니다. 소개글에는 가게를 자랑하기보다 '이 캠페인에서 무엇을 하게 되는지'를 먼저 적어주세요.",
    caption: "제목 · 카테고리 · 지역 · 대표 이미지 · 한 줄 소개",
    exampleTitle: "캠페인 제목",
    example: {
      weak: ["체험단 모집합니다", "저희 가게 많이 홍보해주세요!"],
      strong: [
        "공릉동 신메뉴 파스타 4종, 블로그 리뷰 4명 모집",
        "노원 실내 클라이밍장 첫 방문기, 릴스 3명 모집"
      ]
    },
    checklist: [
      "대표 이미지는 매장 외관보다 실제 제공하는 메뉴나 서비스가 잘 보이는 사진이 좋습니다",
      "지역은 크리에이터가 이동 거리를 가늠하는 기준이라 정확히 골라주세요"
    ]
  },
  {
    step: "STEP 2",
    badge: "제공 혜택 작성",
    heading: "제공 내역은 ",
    highlight: "품목과 금액까지",
    headingTail: " 적어야 지원이 들어옵니다",
    body: "'음료 제공'처럼 모호하게 적으면 크리에이터는 얼마짜리 일인지 가늠하지 못해 그냥 넘깁니다. 무엇을 몇 개, 대략 얼마 상당으로 제공하는지 적어주세요. 별도 원고료가 있다면 그것도 함께 적는 편이 지원율에 도움이 됩니다.",
    caption: "제공 내역 · 원고료 · 혜택 유형",
    exampleTitle: "제공 내역",
    example: {
      weak: ["음료 제공", "식사 제공 (1인)"],
      strong: [
        "시그니처 음료 2잔 + 계절 디저트 1개 (약 22,000원 상당)",
        "2인 코스 정식 1회 (약 68,000원 상당) + 원고료 3만원"
      ]
    },
    checklist: [
      "혜택 유형과 실제 제공 내역이 어긋나지 않는지 확인해주세요",
      "원고료가 있다면 금액을 함께 적는 편이 지원율에 도움이 됩니다"
    ]
  },
  {
    step: "STEP 3",
    badge: "콘텐츠 미션 작성",
    heading: "미션은 ",
    highlight: "숫자로 셀 수 있게",
    headingTail: " 적어주세요",
    body: "'예쁘게 찍어주세요' 같은 요청은 사람마다 해석이 달라 결과물이 들쭉날쭉해집니다. 사진 장수, 글자 수, 포함할 키워드, 게시 유지 기간처럼 나중에 확인할 수 있는 기준으로 적으면 검수도 빨라지고 서로 얼굴 붉힐 일이 없습니다.",
    caption: "콘텐츠 요구사항 · 필수 미션 · 키워드 · 이미지 활용 범위 · 참고 이미지",
    exampleTitle: "필수 미션",
    example: {
      weak: ["사진 예쁘게 찍어서 잘 써주세요", "솔직한 후기 부탁드립니다"],
      strong: [
        "매장 사진 3장 이상, 메뉴 사진 2장 이상 포함",
        "'공릉동 파스타' 키워드를 제목과 본문에 각 1회 포함",
        "발행 후 3개월간 게시글 유지"
      ]
    },
    checklist: [
      "대가를 제공받은 사실을 콘텐츠에 표시하도록 안내해주세요. 표시 누락은 이용약관 제8조 위반이자 법적 문제가 될 수 있습니다",
      "긍정적인 내용만 쓰도록 요구하는 것은 금지되어 있습니다",
      "촬영물을 가게 SNS에 다시 쓰고 싶다면 '이미지 활용 범위'에 반드시 적어두세요"
    ]
  },
  {
    step: "STEP 4",
    badge: "모집 인원 및 일정 설정",
    heading: "모집 인원은 ",
    highlight: "그대로 예약 포인트",
    headingTail: "가 됩니다",
    body: "검수를 요청하는 시점에 모집 인원만큼 포인트가 잠깁니다. 공개 전에 캠페인을 취소하거나 운영진이 반려하면 예약한 포인트는 전액 돌아옵니다. 다만 공개된 뒤에는 마음대로 취소해도 자동으로 돌아오지 않으니, 요청 전에 인원과 날짜를 한 번 더 확인해주세요.",
    caption: "모집 인원 · 모집 마감일 · 선정일 · 제출 기한 · 포인트 예약",
    exampleTitle: "예약 포인트는 언제 돌아오나요",
    example: {
      weakLabel: "반환되지 않음",
      strongLabel: "반환됨",
      strikeWeak: false,
      weak: ["공개 후 운영자가 임의로 취소", "선정 후 취소 또는 노쇼", "크리에이터가 콘텐츠를 제출하지 않음"],
      strong: [
        "공개 전 캠페인 취소 → 전액 반환",
        "운영진 반려 → 전액 반환",
        "5명 모집에 3명만 지원 → 부족한 2명분 10,000P 반환"
      ]
    },
    checklist: [
      "모집 인원 1명당 5,000P가 예약됩니다. 5명을 모집하면 25,000P가 필요합니다",
      "모집 마감일, 선정일, 제출 기한 순서가 어긋나지 않는지 확인해주세요",
      "처음 참여하는 크리에이터도 받고 싶다면 '초보 가능'을 켜두면 지원 폭이 넓어집니다",
      "지원자가 정원보다 많은데 일부만 선정한 경우에는 포인트가 반환되지 않습니다",
      "포인트가 부족하면 충전 화면으로 이동하고, 충전을 마치면 캠페인이 자동으로 다시 제출됩니다"
    ]
  }
];

export const campaignGuideFaq = [
  {
    question: "캠페인을 올리면 바로 공개되나요?",
    answer:
      "아닙니다. 검수 요청 후 운영진 확인을 거쳐 공개됩니다. 내용에 보완이 필요하면 수정 요청을 드립니다."
  },
  {
    question: "지원자가 한 명도 없으면 어떻게 되나요?",
    answer:
      "모집이 마감되면 캠페인은 종료 처리되고 예약했던 포인트는 전액 돌아옵니다."
  },
  {
    question: "포인트는 환불되나요?",
    answer:
      "캠페인에 예약되지 않은 유상 포인트는 원결제수단으로 환불할 수 있습니다. 충전 보너스는 현금 환불되지 않으며, 연결된 유상 포인트를 환불하면 남은 보너스는 회수됩니다."
  },
  {
    question: "크리에이터가 콘텐츠를 안 올리면요?",
    answer:
      "제출 기한이 지나도 제출이 없으면 운영진에게 알려주세요. 다만 이 경우 포인트가 자동으로 반환되지는 않습니다."
  }
];
