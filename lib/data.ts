import type { BusinessProfile, Campaign, CampaignApplication, Collaboration, ContentSubmission, CreatorProfile, LocalStory } from "./types";

export const businesses: BusinessProfile[] = [
  {
    id: "ordinary-cafe",
    businessName: "카페 오디너리",
    category: "카페·베이커리",
    shortIntro: "공릉동 골목의 계절 디저트와 스페셜티 커피",
    description: "직접 굽는 디저트와 편안한 공간을 소개하고 싶은 동네 카페입니다.",
    address: "서울 노원구 공릉로 101",
    district: "공릉동",
    contact: "02-000-1010",
    businessHours: "매일 10:00-21:00",
    socialUrls: ["https://instagram.com/ordinary.nowon"],
    verificationStatus: "verified",
    coverImage: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "studio-forest",
    businessName: "스튜디오 포레스트",
    category: "공방·클래스",
    shortIntro: "초록 식물과 함께하는 원데이 클래스",
    description: "지역 주민과 크리에이터가 함께 기록할 수 있는 식물 클래스를 운영합니다.",
    address: "서울 노원구 동일로 1500",
    district: "상계동",
    contact: "02-000-2020",
    businessHours: "화-일 11:00-19:00",
    socialUrls: ["https://instagram.com/studioforest"],
    verificationStatus: "verified",
    coverImage: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1400&q=80"
  }
];

export const creators: CreatorProfile[] = [
  {
    id: "creator-kim",
    nickname: "김노원",
    bio: "노원 생활권 카페와 산책 코스를 기록하는 블로그·릴스 크리에이터입니다.",
    activityAreas: ["공릉동", "상계동", "중계동"],
    interests: ["카페", "디저트", "동네 산책"],
    contentTypes: ["블로그", "인스타그램", "숏폼"],
    availableDays: ["금", "토", "일"],
    verificationStatus: "verified",
    avatarUrl: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg",
    completionRate: 96,
    deadlineRate: 92
  },
  {
    id: "creator-lee",
    nickname: "동네기록자",
    bio: "인터뷰와 사진으로 작은 브랜드의 이야기를 정리합니다.",
    activityAreas: ["노원구 전역"],
    interests: ["인터뷰", "공방", "로컬 브랜드"],
    contentTypes: ["사진", "인터뷰", "블로그"],
    availableDays: ["수", "토"],
    verificationStatus: "pending",
    avatarUrl: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg",
    completionRate: 88,
    deadlineRate: 90
  }
];

export const campaigns: Campaign[] = [
  {
    id: "ordinary-dessert",
    businessId: "ordinary-cafe",
    title: "공릉동 시그니처 디저트와 커피 콘텐츠 협업",
    description: "직접 굽는 시그니처 디저트와 스페셜티 커피를 경험하고, 공간의 분위기와 메뉴 이야기를 콘텐츠로 기록할 크리에이터를 찾습니다.",
    campaignType: "visit",
    region: "공릉동",
    category: "카페·베이커리",
    recruitCount: 15,
    appliedCount: 5,
    recruitStart: "2026-07-03",
    recruitEnd: "2026-07-18",
    selectionDate: "2026-07-20",
    visitStart: "2026-07-22",
    visitEnd: "2026-08-02",
    submissionDue: "2026-08-09",
    benefitType: "체험 제공",
    benefitValue: "디저트 2종 + 음료 2잔",
    contentRequirements: ["제공 사실 표시", "대표 메뉴 2개 이상 소개", "공간 사진 3장 이상", "예약 방문 일정 준수"],
    usageRights: "가게 SNS 리그램과 노원멤버스 로컬 스토리 소개에 활용",
    status: "recruiting",
    coverImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1400&q=80",
    referenceImages: [],
    beginnerFriendly: true,
    operatorRecommended: true
  },
  {
    id: "forest-shortform",
    businessId: "studio-forest",
    title: "식물 원데이 클래스 숏폼 제작 파트너 모집",
    description: "식물 클래스를 체험하고 클래스 과정과 완성 작품을 짧은 영상으로 담아낼 크리에이터를 모집합니다.",
    campaignType: "shortform",
    region: "상계동",
    category: "공방·클래스",
    recruitCount: 6,
    appliedCount: 2,
    recruitStart: "2026-07-05",
    recruitEnd: "2026-07-24",
    selectionDate: "2026-07-25",
    visitStart: "2026-07-29",
    visitEnd: "2026-08-08",
    submissionDue: "2026-08-15",
    benefitType: "체험 + 제작비",
    benefitValue: "클래스 1회 + 제작비 50,000원",
    fee: "50,000원",
    contentRequirements: ["릴스 또는 쇼츠 1개", "과정 컷 3장 이상", "제공 사실 표시", "원본 파일 선택 제출"],
    usageRights: "가게 채널 게시 전 별도 동의 필요, 노원멤버스 아카이브 썸네일 사용 가능",
    status: "recruiting",
    coverImage: "https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=1400&q=80",
    referenceImages: [],
    beginnerFriendly: false,
    operatorRecommended: false
  },
  {
    id: "owner-interview",
    businessId: "ordinary-cafe",
    title: "오래 운영한 동네 가게 사장님 인터뷰 프로젝트",
    description: "가게의 시작과 동네에서 쌓아온 이야기를 인터뷰 콘텐츠로 정리합니다.",
    campaignType: "interview",
    region: "노원구",
    category: "인터뷰",
    recruitCount: 3,
    appliedCount: 10,
    recruitStart: "2026-06-20",
    recruitEnd: "2026-07-02",
    selectionDate: "2026-07-03",
    visitStart: "2026-07-07",
    visitEnd: "2026-07-15",
    submissionDue: "2026-07-24",
    benefitType: "활동비",
    benefitValue: "인터뷰 제작비 100,000원",
    fee: "100,000원",
    contentRequirements: ["사전 질문지 공유", "사진 5장 이상", "본문 1,500자 이상", "사실 확인 요청 반영"],
    usageRights: "노원멤버스 로컬 스토리 본문 발행 및 가게 소개 페이지 연결",
    status: "selecting",
    coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80",
    referenceImages: [],
    beginnerFriendly: false,
    operatorRecommended: true
  }
];

export const applications: CampaignApplication[] = [
  {
    id: "app-1",
    campaignId: "ordinary-dessert",
    creatorId: "creator-kim",
    message: "공릉동 카페 콘텐츠를 꾸준히 기록하고 있어 메뉴와 공간 분위기를 자연스럽게 소개할 수 있습니다.",
    availableDates: "7월 24일, 7월 27일",
    proposedContentType: "블로그 + 인스타그램 피드",
    status: "recommended",
    adminMemo: "지역 적합성과 카페 콘텐츠 이력이 좋음"
  },
  {
    id: "app-2",
    campaignId: "forest-shortform",
    creatorId: "creator-lee",
    message: "클래스 진행 과정과 완성 작품을 사진 중심으로 기록하고 짧은 클립도 제작 가능합니다.",
    availableDates: "8월 1일",
    proposedContentType: "숏폼 + 사진",
    status: "submitted"
  }
];

export const collaborations: Collaboration[] = [
  {
    id: "collab-1",
    campaignId: "ordinary-dessert",
    creatorId: "creator-kim",
    visitDate: "2026-07-24",
    submissionDue: "2026-08-09",
    status: "visit_scheduled"
  }
];

export const submissions: ContentSubmission[] = [
  {
    id: "sub-1",
    collaborationId: "collab-1",
    platform: "블로그",
    contentUrl: "https://blog.example.com/ordinary-dessert",
    publishedAt: "2026-08-01",
    previewImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    disclosureConfirmed: true,
    reviewStatus: "approved"
  }
];

export const stories: LocalStory[] = [
  {
    id: "ordinary-local-story",
    title: "공릉동 골목에서 만난 계절 디저트",
    summary: "카페 오디너리와 지역 크리에이터가 함께 기록한 여름 디저트 이야기",
    body: "직접 구운 디저트와 작은 골목의 분위기를 중심으로 노원의 일상적인 장면을 기록했습니다.",
    coverImage: "https://images.unsplash.com/photo-1464306076886-da185f6a9d05?auto=format&fit=crop&w=1400&q=80",
    businessId: "ordinary-cafe",
    creatorId: "creator-kim",
    campaignId: "ordinary-dessert",
    category: "오늘의 가게",
    publishedAt: "2026-08-03"
  }
];

export function getBusiness(id: string) {
  return businesses.find((business) => business.id === id);
}

export function getCampaign(id: string) {
  return campaigns.find((campaign) => campaign.id === id);
}

export function getCreator(id: string) {
  return creators.find((creator) => creator.id === id);
}
