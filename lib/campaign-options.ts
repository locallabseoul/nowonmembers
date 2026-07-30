// 캠페인 생성 위저드와 수정 폼이 같은 선택지를 써야 한다. 아이콘은 화면마다 다르므로
// 여기에는 저장되는 값과 라벨만 둔다.

export const campaignCategoryOptions = [
  { value: "맛집·카페", label: "맛집/카페" },
  { value: "뷰티·서비스", label: "뷰티/서비스" },
  { value: "문화·예술", label: "문화/예술" },
  { value: "제품·기타", label: "제품/기타" }
];

export const campaignContentTypeOptions = [
  {
    value: "visit",
    label: "네이버 블로그",
    description: "상세한 방문 리뷰와 여러 장의 사진이 필요할 때"
  },
  {
    value: "interview",
    label: "인스타그램 피드",
    description: "감성적인 사진과 해시태그로 빠른 확산이 필요할 때"
  },
  {
    value: "shortform",
    label: "인스타그램 릴스",
    description: "짧고 임팩트 있는 영상으로 생생한 전달이 필요할 때"
  }
];

export const campaignBenefitTypeOptions = [
  "방문 체험 제공",
  "제품 제공",
  "서비스 제공",
  "쿠폰·이용권 제공",
  "활동비 지급",
  "방문 체험 + 활동비",
  "제품 제공 + 활동비",
  "기타 협의"
];

export const campaignMissionOptions = [
  "사진 최소 15장 이상 포함",
  "동영상 15초 이상 최소 1개 포함",
  "네이버 지도 및 장소 링크 첨부",
  "공식 인스타그램 계정 태그"
];

export const campaignImageAccept = "image/jpeg,image/png,image/webp";
export const maxCampaignImageBytes = 10 * 1024 * 1024;
export const maxReferenceImageCount = 6;

export function campaignContentTypeLabel(value: string) {
  return campaignContentTypeOptions.find((option) => option.value === value)?.label ?? "채널 미선택";
}
