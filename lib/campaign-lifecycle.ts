import type { Campaign, CampaignStatus } from "@/lib/types";

type CampaignGate = Pick<Campaign, "status" | "recruitEnd" | "recruitCount" | "appliedCount">;

type CampaignLifecycle = {
  label: string;
  description: string;
  visibilityLabel: string;
  actionLabel: string;
  canApply: boolean;
  isClosed: boolean;
  badgeTone: "red" | "green" | "blue" | "gray" | "amber";
};

const statusLabels: Record<CampaignStatus, string> = {
  draft: "초안",
  in_review: "검수 대기",
  revision_requested: "수정 요청",
  approved: "승인 완료",
  scheduled: "공개 예정",
  recruiting: "모집중",
  selecting: "선정중",
  in_progress: "진행중",
  submission_review: "제출 검수",
  completed: "완료",
  cancelled: "취소",
  failed: "실패"
};

export function getKoreaTodayString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${value.year}-${value.month}-${value.day}`;
}

export function isRecruitmentExpired(campaign: CampaignGate, today = getKoreaTodayString()) {
  return Boolean(campaign.recruitEnd && campaign.recruitEnd < today);
}

export function canApplyToCampaign(campaign: CampaignGate, today = getKoreaTodayString()) {
  return campaign.status === "recruiting" && !isRecruitmentExpired(campaign, today);
}

export function daysUntilDate(value: string, today = getKoreaTodayString()) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00+09:00`).getTime();
  const current = new Date(`${today}T00:00:00+09:00`).getTime();
  if (Number.isNaN(target) || Number.isNaN(current)) return null;

  return Math.ceil((target - current) / 86_400_000);
}

export function getCampaignDeadlineLabel(campaign: CampaignGate, today = getKoreaTodayString()) {
  if (campaign.status !== "recruiting") return "마감됨";

  const remainingDays = daysUntilDate(campaign.recruitEnd, today);
  if (remainingDays === null) return "마감일 미정";
  if (remainingDays < 0) return "마감됨";
  if (remainingDays === 0) return "오늘마감";
  return `D-${remainingDays}`;
}

export function getCampaignLifecycle(campaign: CampaignGate, today = getKoreaTodayString()): CampaignLifecycle {
  if (campaign.status === "recruiting") {
    if (isRecruitmentExpired(campaign, today)) {
      return {
        label: "모집 종료",
        description: "모집 마감일이 지나 선정 단계로 전환됩니다.",
        visibilityLabel: "공개 목록 미노출",
        actionLabel: "모집 기간이 종료되었습니다.",
        canApply: false,
        isClosed: true,
        badgeTone: "gray"
      };
    }

    return {
      label: "모집중",
      description: "공개 목록에 노출되며 선정 인원과 관계없이 모집 기간 동안 신청을 받을 수 있습니다.",
      visibilityLabel: "공개 모집중",
      actionLabel: "캠페인 신청하기",
      canApply: true,
      isClosed: false,
      badgeTone: "red"
    };
  }

  if (campaign.status === "in_review") {
    return {
      label: "검수 대기",
      description: "운영자 승인 전이라 공개 목록에 노출되지 않습니다.",
      visibilityLabel: "비공개",
      actionLabel: "운영자 승인 후 신청할 수 있습니다.",
      canApply: false,
      isClosed: false,
      badgeTone: "amber"
    };
  }

  if (campaign.status === "revision_requested") {
    return {
      label: "수정 요청",
      description: "운영자 수정 요청이 있어 보완 후 다시 검수가 필요합니다.",
      visibilityLabel: "비공개",
      actionLabel: "수정 완료 후 신청을 받을 수 있습니다.",
      canApply: false,
      isClosed: false,
      badgeTone: "amber"
    };
  }

  if (campaign.status === "selecting") {
    return {
      label: "선정중",
      description: "모집이 종료되어 크리에이터 선정이 진행 중입니다.",
      visibilityLabel: "모집 종료",
      actionLabel: "모집이 종료되어 신청할 수 없습니다.",
      canApply: false,
      isClosed: true,
      badgeTone: "gray"
    };
  }

  if (campaign.status === "in_progress" || campaign.status === "submission_review") {
    return {
      label: campaign.status === "submission_review" ? "제출 검수" : "진행중",
      description: "선정된 크리에이터와 캠페인이 진행 중입니다.",
      visibilityLabel: "진행중",
      actionLabel: "진행 중인 캠페인입니다.",
      canApply: false,
      isClosed: false,
      badgeTone: "blue"
    };
  }

  if (campaign.status === "completed") {
    return {
      label: "완료",
      description: "완료된 캠페인입니다. 완료 콘텐츠는 스토리에서 확인할 수 있습니다.",
      visibilityLabel: "완료",
      actionLabel: "완료된 캠페인입니다.",
      canApply: false,
      isClosed: true,
      badgeTone: "green"
    };
  }

  if (campaign.status === "cancelled" || campaign.status === "failed") {
    return {
      label: campaign.status === "cancelled" ? "취소" : "실패",
      description: "운영이 종료된 캠페인입니다.",
      visibilityLabel: "종료",
      actionLabel: "종료된 캠페인입니다.",
      canApply: false,
      isClosed: true,
      badgeTone: "gray"
    };
  }

  return {
    label: statusLabels[campaign.status],
    description: "아직 공개 모집 단계가 아닙니다.",
    visibilityLabel: "비공개",
    actionLabel: "아직 신청할 수 없습니다.",
    canApply: false,
    isClosed: false,
    badgeTone: "gray"
  };
}
