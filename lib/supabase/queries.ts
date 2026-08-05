import { normalizeKoreanAuthPhone } from "@/lib/auth/phone";
import { getKoreaTodayString } from "@/lib/campaign-lifecycle";
import type { AppNotification, Campaign, HeaderFeedItem, LocalStory, Notice } from "@/lib/types";
import { createSupabaseServerClient } from "./server";

type CampaignRow = {
  id: string;
  business_id: string;
  admin_memo?: string | null;
  title: string;
  description: string | null;
  campaign_type: string;
  region: string;
  region_detail: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  recruit_count: number;
  recruit_start: string | null;
  recruit_end: string | null;
  selection_date: string | null;
  visit_start: string | null;
  visit_end: string | null;
  submission_due: string | null;
  benefit_type: string | null;
  benefit_value: string | null;
  fee: number | null;
  content_requirements: unknown;
  usage_rights: string | null;
  status: Campaign["status"];
  cover_image_url: string | null;
  reference_image_urls: string[] | null;
  beginner_friendly: boolean;
  operator_recommended: boolean;
  billing_mode?: "legacy_free" | "points_v1";
  business_profiles?: {
    business_name?: string | null;
    category?: string | null;
    business_hours?: unknown;
    cover_image_url?: string | null;
    address?: string | null;
    address_detail?: string | null;
  } | null;
  applicant_count?: number | null;
  campaign_applications?: { count: number }[];
  campaign_point_reservations?: Relation<{
    requested_headcount: number;
    reserved_points: number;
    billable_headcount: number | null;
    consumed_points: number;
    returned_points: number;
    status: string;
  }>;
};

type StoryRow = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  cover_image_url: string | null;
  business_id: string | null;
  creator_id: string | null;
  campaign_id: string | null;
  category: string | null;
  published_at: string | null;
  business_profiles?: { business_name: string | null } | { business_name: string | null }[] | null;
  creator_profiles?: { profiles: { nickname: string | null } | { nickname: string | null }[] | null } | { profiles: { nickname: string | null } | { nickname: string | null }[] | null }[] | null;
};

type NoticeRow = {
  id: string;
  title: string;
  body: string | null;
  status: "draft" | "published";
  is_pinned: boolean;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CountRelation = { count: number }[] | null | undefined;

type Relation<T> = T | T[] | null | undefined;

type CreatorChannelRow = {
  platform: string | null;
  channel_name: string | null;
  channel_url?: string | null;
  follower_count: number | null;
};

type ApplicantCreatorRow = {
  id: string;
  user_id?: string | null;
  profiles?: Relation<{ nickname: string | null; email: string | null }>;
  creator_channels?: CreatorChannelRow[] | null;
  portfolios?: CountRelation;
};

type ApplicationCampaignRow = {
  id: string;
  title: string | null;
  status: Campaign["status"];
  recruit_count: number;
  campaign_applications?: CountRelation;
  collaborations?: CountRelation;
};

type DashboardApplicationRow = {
  id: string;
  campaign_id: string;
  creator_id: string;
  message: string | null;
  available_dates: string | null;
  proposed_content_type: string | null;
  status: string;
  admin_memo: string | null;
  applied_at: string | null;
  campaigns?: Relation<ApplicationCampaignRow>;
  creator_profiles?: Relation<ApplicantCreatorRow>;
  collaborations?: CountRelation;
};

type ApplicationSummaryRow = {
  id: string;
  campaign_id: string;
  status: string;
};

type CollaborationSummaryRow = {
  id: string;
  campaign_id: string;
  status: string;
  content_submissions?: Pick<DashboardSubmissionContentRow, "id" | "review_status">[] | null;
};

type DashboardSubmissionContentRow = {
  id: string;
  platform: string | null;
  content_url: string | null;
  published_at: string | null;
  preview_image_url: string | null;
  disclosure_confirmed: boolean | null;
  review_status: string | null;
  admin_memo: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DashboardSubmissionRow = {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: string;
  submission_due: string | null;
  selected_at: string | null;
  creator_profiles?: Relation<ApplicantCreatorRow>;
  content_submissions?: DashboardSubmissionContentRow[] | null;
};

type BusinessCreatorCampaignRow = {
  id: string;
  title: string | null;
  status: Campaign["status"];
  cover_image_url: string | null;
};

type BusinessCreatorProfileRow = {
  id: string;
  user_id: string;
  avatar_url: string | null;
  activity_areas: string[] | null;
  interests: string[] | null;
  content_types: string[] | null;
  profiles?: Relation<{ nickname: string | null; email: string | null }>;
  creator_channels?: CreatorChannelRow[] | null;
  portfolios?: CountRelation;
};

type BusinessCreatorReviewRow = {
  id: string;
  content_quality: number | null;
  guideline_compliance: number | null;
  communication: number | null;
  punctuality: number | null;
  rework_intent: boolean | null;
  private_comment: string | null;
  tags: string[] | null;
  updated_at: string | null;
};

type BusinessCreatorCollaborationRow = {
  id: string;
  campaign_id: string;
  creator_id: string;
  selected_at: string | null;
  submission_due: string | null;
  status: string;
  created_at: string | null;
  campaigns?: Relation<BusinessCreatorCampaignRow>;
  creator_profiles?: Relation<BusinessCreatorProfileRow>;
  content_submissions?: DashboardSubmissionContentRow[] | null;
  reviews?: BusinessCreatorReviewRow[] | null;
};

type BusinessHoursValue =
  | string
  | {
    default?: unknown;
    summary?: unknown;
    preset?: unknown;
    note?: unknown;
    open?: unknown;
    close?: unknown;
  }
  | null;

type CampaignApplicationStats = {
  applicationCount: number;
  recommendedCount: number;
  selectedCount: number;
  submissionCount: number;
  pendingSubmissionCount: number;
  pendingReviewCount: number;
  revisionRequestedCount: number;
  approvedSubmissionCount: number;
};

export type DashboardCampaign = Campaign & CampaignApplicationStats & {
  billingMode: "legacy_free" | "points_v1";
  // 운영자가 수정 요청을 하면서 남긴 사유. 가게가 무엇을 고쳐야 하는지 알아야 한다.
  adminMemo: string;
  pointReservation: {
    requestedHeadcount: number;
    reservedPoints: number;
    billableHeadcount: number | null;
    consumedPoints: number;
    returnedPoints: number;
    status: string;
  } | null;
};

// 이 가게가 예전에 같은 크리에이터와 협업하고 남긴 평가 요약. 선정 판단에 쓴다.
export type ApplicantPastReview = {
  collaborationCount: number;
  averageRating: number | null;
  reworkIntent: boolean | null;
  tags: string[];
};

export type DashboardApplication = {
  id: string;
  creatorUserId: string;
  pastReview: ApplicantPastReview | null;
  campaignId: string;
  campaignTitle: string;
  campaignStatus: Campaign["status"];
  recruitCount: number;
  applicationCount: number;
  selectedCount: number;
  creatorNickname: string;
  creatorChannelSummary: string;
  portfolioCount: number;
  message: string;
  availableDates: string;
  proposedContentType: string;
  status: string;
  adminMemo: string;
  appliedAt: string;
  hasCollaboration: boolean;
};

export type DashboardSubmission = {
  collaborationId: string;
  campaignId: string;
  creatorId: string;
  creatorNickname: string;
  creatorChannelSummary: string;
  collaborationStatus: string;
  submissionDue: string;
  selectedAt: string;
  submission: {
    id: string;
    platform: string;
    contentUrl: string;
    publishedAt: string;
    previewImageUrl: string;
    disclosureConfirmed: boolean;
    reviewStatus: string;
    adminMemo: string;
    submittedAt: string;
    updatedAt: string;
  } | null;
};

export type BusinessDashboardBusiness = {
    id: string;
    businessName: string;
    category: string;
    shortIntro: string;
    description: string;
    address: string;
    addressDetail: string;
    latitude: number | null;
    longitude: number | null;
    district: string;
    contact: string;
    businessHours: string;
    businessHoursPreset: string;
    businessHoursOpen: string;
    businessHoursClose: string;
    businessHoursNote: string;
    websiteUrl: string;
    socialUrls: string[];
    verificationStatus: string;
    isPublic: boolean;
    coverImage: string;
    managerName: string;
    managerEmail: string;
    managerPhone: string;
    businessRegistrationNumber: string;
    referralCode: string;
    verification: {
      emailVerified: boolean;
      phoneVerified: boolean;
    };
};

export type BusinessDashboardData = {
  business: BusinessDashboardBusiness | null;
  businessProfileDefaults: BusinessDashboardBusiness | null;
  // 현재 페이지에 보이는 캠페인만 담는다. 지원자·협업 통계도 이 목록에 대해서만 센다.
  campaigns: DashboardCampaign[];
  campaignSummary: { recruiting: number; progressing: number; review: number; completed: number };
  totalPages: number;
  currentPage: number;
  selectedCampaign: DashboardCampaign | null;
  selectedCampaignApplications: DashboardApplication[];
  selectedCampaignSubmissions: DashboardSubmission[];
  recommendedApplications: DashboardApplication[];
};

export type BusinessCreatorReviewItem = {
  collaborationId: string;
  campaignId: string;
  campaignTitle: string;
  campaignStatus: Campaign["status"];
  campaignCoverImage: string;
  selectedAt: string;
  submissionDue: string;
  collaborationStatus: string;
  creatorId: string;
  creatorUserId: string;
  creatorNickname: string;
  creatorEmail: string;
  creatorAvatarUrl: string;
  creatorChannelSummary: string;
  creatorChannelUrl: string;
  activityAreas: string[];
  interests: string[];
  contentTypes: string[];
  portfolioCount: number;
  submission: {
    id: string;
    platform: string;
    contentUrl: string;
    publishedAt: string;
    previewImageUrl: string;
    reviewStatus: string;
    adminMemo: string;
    submittedAt: string;
    updatedAt: string;
  } | null;
  review: {
    id: string;
    contentQuality: number | null;
    guidelineCompliance: number | null;
    communication: number | null;
    punctuality: number | null;
    reworkIntent: boolean | null;
    privateComment: string;
    tags: string[];
    updatedAt: string;
  } | null;
};

export type BusinessCreatorManagementData = {
  business: BusinessDashboardData["business"];
  campaigns: {
    id: string;
    title: string;
    status: Campaign["status"];
  }[];
  creators: BusinessCreatorReviewItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  filters: {
    q: string;
    campaignId: string;
    rehire: "all" | "yes" | "no";
  };
};

function buildBusinessProfileDefaults({
  user,
  profile
}: {
  user: {
    email?: string | null;
    email_confirmed_at?: string | null;
    phone?: string | null;
    phone_confirmed_at?: string | null;
  };
  profile: {
    nickname?: string | null;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    business_registration_number?: string | null;
    referral_code?: string | null;
  } | null;
}): BusinessDashboardBusiness {
  return {
    id: "signup-defaults",
    businessName: profile?.nickname ?? "",
    category: "",
    shortIntro: "",
    description: "",
    address: "",
    addressDetail: "",
    latitude: null,
    longitude: null,
    district: "",
    contact: "",
    businessHours: "",
    businessHoursPreset: "",
    businessHoursOpen: "",
    businessHoursClose: "",
    businessHoursNote: "",
    websiteUrl: "",
    socialUrls: [],
    verificationStatus: "pending",
    isPublic: false,
    coverImage: "",
    managerName: profile?.name ?? "",
    managerEmail: profile?.email ?? user.email ?? "",
    managerPhone: profile?.phone ?? "",
    businessRegistrationNumber: profile?.business_registration_number ?? "",
    referralCode: profile?.referral_code ?? "",
    verification: {
      emailVerified: Boolean(user.email_confirmed_at),
      phoneVerified: Boolean(
        user.phone_confirmed_at
        && normalizeKoreanAuthPhone(user.phone) === normalizeKoreanAuthPhone(profile?.phone)
      )
    }
  };
}

export type AdminOverviewStats = {
  businesses: number;
  verifiedCreators: number;
  recruitingCampaigns: number;
  approvedSubmissions: number;
  totalSubmissions: number;
  pendingReviewCampaigns: number;
  pendingSubmissions: number;
  pendingVerifications: number;
};

export type AdminCampaignsData = {
  campaigns: DashboardCampaign[];
  selectedCampaign: DashboardCampaign | null;
  selectedCampaignApplications: DashboardApplication[];
  selectedCampaignSubmissions: DashboardSubmission[];
};

export type AdminRecentSubmission = {
  id: string;
  contentUrl: string;
  previewImageUrl: string;
  publishedAt: string;
  reviewStatus: string;
  platform: string;
};

export type AdminMember = {
  id: string;
  nickname: string;
  email: string;
  role: string;
  isAdmin: boolean;
  status: string;
  verificationStatus: string;
  createdAt: string;
  businessName: string;
  // 가입만 하고 크리에이터 프로필을 아직 만들지 않은 회원을 구분한다.
  hasRoleProfile: boolean;
};

export type AdminMembersData = {
  members: AdminMember[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

export type AdminMemberListOptions = {
  role?: string;
  verification?: string;
  searchQuery?: string;
  page?: number;
};

export type CreatorDashboardData = {
  creator: {
    id: string;
    nickname: string;
    email: string;
    avatarUrl: string;
    activityAreas: string[];
    interests: string[];
    contentTypes: string[];
    deadlineRate: number;
  } | null;
  applications: {
    id: string;
    campaignId: string;
    campaignTitle: string;
    campaignCoverImage: string;
    campaignRegion: string;
    campaignType: string;
    selectionDate: string;
    benefitSummary: string;
    status: string;
    proposedContentType: string;
    canCancel: boolean;
  }[];
  collaborations: {
    id: string;
    campaignId: string;
    campaignTitle: string;
    campaignCoverImage: string;
    campaignRegion: string;
    campaignType: string;
    benefitSummary: string;
    visitDate: string;
    submissionDue: string;
    status: string;
    hasSubmission: boolean;
    submissionReviewStatus: string;
    submissionContentUrl: string;
    submissionUpdatedAt: string;
    // 선정된 크리에이터가 방문 일정을 잡으려면 매장에 연락할 수단이 있어야 한다.
    store: {
      name: string;
      address: string;
      contact: string;
      businessHours: string;
    };
  }[];
  submissions: {
    id: string;
    reviewStatus: string;
  }[];
};

export type CollaborationSubmissionDetail = {
  id: string;
  campaignTitle: string;
  campaignCoverImage: string;
  submissionDue: string;
  status: string;
  visitDate: string;
  // 방문 일정을 잡으려면 크리에이터가 매장에 연락할 수 있어야 한다.
  store: {
    name: string;
    address: string;
    contact: string;
    businessHours: string;
  };
  submission: {
    id: string;
    platform: string;
    contentUrl: string;
    publishedAt: string;
    previewImageUrl: string;
    disclosureConfirmed: boolean;
    reviewStatus: string;
    adminMemo: string;
  } | null;
} | null;

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function getCampaignRequirementData(value: unknown) {
  if (Array.isArray(value)) {
    const values = value.map(String).filter(Boolean);
    return {
      requirements: values.filter((item) => !item.trim().startsWith("#")),
      keywords: values.filter((item) => item.trim().startsWith("#"))
    };
  }

  if (!value || typeof value !== "object") {
    return {
      requirements: [],
      keywords: []
    };
  }

  const data = value as { requirements?: unknown; keywords?: unknown };
  return {
    requirements: asStringArray(data.requirements).filter(Boolean),
    keywords: asStringArray(data.keywords).filter(Boolean)
  };
}

function asRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] : value ?? null;
}

function relationCount(value: CountRelation) {
  return value?.[0]?.count ?? 0;
}

function getBusinessHoursText(value: BusinessHoursValue, key: "summary" | "preset" | "note" | "open" | "close") {
  if (!value) return "";
  if (typeof value === "string") return key === "summary" ? value : "";

  const nextValue = key === "summary" ? value.summary ?? value.default : value[key];
  return typeof nextValue === "string" ? nextValue : "";
}

function formatCreatorChannelSummary(channels?: CreatorChannelRow[] | null) {
  if (!channels?.length) return "등록 채널 없음";

  const sortedChannels = [...channels].sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0));
  const primary = sortedChannels[0];
  const platform = primary.platform || "채널";
  const channelName = primary.channel_name ? ` ${primary.channel_name}` : "";
  const followers = primary.follower_count ? ` · ${primary.follower_count.toLocaleString("ko-KR")}명` : "";
  const extra = sortedChannels.length > 1 ? ` 외 ${sortedChannels.length - 1}개` : "";

  return `${platform}${channelName}${followers}${extra}`;
}

function formatBenefitSummary(benefitType?: string | null, benefitValue?: string | null) {
  return [benefitType, benefitValue].filter(Boolean).join(" / ");
}

type ApplicantReviewRow = {
  reviewee_id: string;
  content_quality: number | null;
  guideline_compliance: number | null;
  communication: number | null;
  punctuality: number | null;
  rework_intent: boolean | null;
  tags: string[] | null;
  updated_at: string | null;
};

// 같은 크리에이터와 여러 번 협업했을 수 있다. 평점은 전체 평균, 재섭외 의사는 가장
// 최근 평가를 따른다.
function buildApplicantPastReviews(rows: ApplicantReviewRow[]) {
  const grouped = new Map<string, ApplicantReviewRow[]>();

  for (const row of rows) {
    const list = grouped.get(row.reviewee_id) ?? [];
    list.push(row);
    grouped.set(row.reviewee_id, list);
  }

  const summaries = new Map<string, ApplicantPastReview>();

  for (const [revieweeId, reviews] of grouped) {
    const scores = reviews.flatMap((review) =>
      [review.content_quality, review.guideline_compliance, review.communication, review.punctuality].filter(
        (score): score is number => typeof score === "number"
      )
    );
    const latest = [...reviews].sort((a, b) => getTimestamp(b.updated_at ?? "") - getTimestamp(a.updated_at ?? ""))[0];

    summaries.set(revieweeId, {
      collaborationCount: reviews.length,
      averageRating: scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : null,
      reworkIntent: latest?.rework_intent ?? null,
      tags: Array.from(new Set(reviews.flatMap((review) => review.tags ?? []))).slice(0, 4)
    });
  }

  return summaries;
}

function mapDashboardApplication(row: DashboardApplicationRow): DashboardApplication {
  const campaign = asRelation(row.campaigns);
  const creator = asRelation(row.creator_profiles);
  const profile = asRelation(creator?.profiles);

  return {
    id: row.id,
    creatorUserId: creator?.user_id ?? "",
    pastReview: null,
    campaignId: row.campaign_id,
    campaignTitle: campaign?.title ?? "캠페인",
    campaignStatus: campaign?.status ?? "draft",
    recruitCount: campaign?.recruit_count ?? 0,
    applicationCount: relationCount(campaign?.campaign_applications),
    selectedCount: relationCount(campaign?.collaborations),
    creatorNickname: profile?.nickname || profile?.email?.split("@")[0] || "크리에이터",
    creatorChannelSummary: formatCreatorChannelSummary(creator?.creator_channels),
    portfolioCount: relationCount(creator?.portfolios),
    message: row.message ?? "",
    availableDates: row.available_dates ?? "",
    proposedContentType: row.proposed_content_type ?? "",
    status: row.status,
    adminMemo: row.admin_memo ?? "",
    appliedAt: row.applied_at ?? "",
    hasCollaboration: relationCount(row.collaborations) > 0
  };
}

function mapDashboardSubmission(row: DashboardSubmissionRow): DashboardSubmission {
  const creator = asRelation(row.creator_profiles);
  const profile = asRelation(creator?.profiles);
  const submission = row.content_submissions?.[0] ?? null;

  return {
    collaborationId: row.id,
    campaignId: row.campaign_id,
    creatorId: row.creator_id,
    creatorNickname: profile?.nickname || profile?.email?.split("@")[0] || "크리에이터",
    creatorChannelSummary: formatCreatorChannelSummary(creator?.creator_channels),
    collaborationStatus: row.status,
    submissionDue: row.submission_due ?? "",
    selectedAt: row.selected_at ?? "",
    submission: submission
      ? {
        id: submission.id,
        platform: submission.platform ?? "",
        contentUrl: submission.content_url ?? "",
        publishedAt: submission.published_at ?? "",
        previewImageUrl: submission.preview_image_url ?? "",
        disclosureConfirmed: Boolean(submission.disclosure_confirmed),
        reviewStatus: submission.review_status ?? "",
        adminMemo: submission.admin_memo ?? "",
        submittedAt: submission.created_at ?? "",
        updatedAt: submission.updated_at ?? ""
      }
      : null
  };
}

function getPrimaryCreatorChannel(channels?: CreatorChannelRow[] | null) {
  if (!channels?.length) return null;

  return [...channels].sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0))[0];
}

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function mapBusinessCreatorReviewItem(row: BusinessCreatorCollaborationRow): BusinessCreatorReviewItem {
  const campaign = asRelation(row.campaigns);
  const creator = asRelation(row.creator_profiles);
  const profile = asRelation(creator?.profiles);
  const primaryChannel = getPrimaryCreatorChannel(creator?.creator_channels);
  const submission = row.content_submissions?.[0] ?? null;
  const review = row.reviews?.[0] ?? null;

  return {
    collaborationId: row.id,
    campaignId: row.campaign_id,
    campaignTitle: campaign?.title ?? "캠페인",
    campaignStatus: campaign?.status ?? "draft",
    campaignCoverImage: campaign?.cover_image_url ?? "",
    selectedAt: row.selected_at ?? row.created_at ?? "",
    submissionDue: row.submission_due ?? "",
    collaborationStatus: row.status,
    creatorId: row.creator_id,
    creatorUserId: creator?.user_id ?? "",
    creatorNickname: profile?.nickname || profile?.email?.split("@")[0] || "크리에이터",
    creatorEmail: profile?.email ?? "",
    creatorAvatarUrl: creator?.avatar_url ?? "",
    creatorChannelSummary: formatCreatorChannelSummary(creator?.creator_channels),
    creatorChannelUrl: primaryChannel?.channel_url ?? "",
    activityAreas: asStringArray(creator?.activity_areas),
    interests: asStringArray(creator?.interests),
    contentTypes: asStringArray(creator?.content_types),
    portfolioCount: relationCount(creator?.portfolios),
    submission: submission
      ? {
        id: submission.id,
        platform: submission.platform ?? "",
        contentUrl: submission.content_url ?? "",
        publishedAt: submission.published_at ?? "",
        previewImageUrl: submission.preview_image_url ?? "",
        reviewStatus: submission.review_status ?? "",
        adminMemo: submission.admin_memo ?? "",
        submittedAt: submission.created_at ?? "",
        updatedAt: submission.updated_at ?? ""
      }
      : null,
    review: review
      ? {
        id: review.id,
        contentQuality: review.content_quality,
        guidelineCompliance: review.guideline_compliance,
        communication: review.communication,
        punctuality: review.punctuality,
        reworkIntent: review.rework_intent,
        privateComment: review.private_comment ?? "",
        tags: asStringArray(review.tags),
        updatedAt: review.updated_at ?? ""
      }
      : null
  };
}

function buildCampaignApplicationStats(applications: ApplicationSummaryRow[], collaborations: CollaborationSummaryRow[]) {
  const stats = new Map<string, CampaignApplicationStats>();
  const emptyStats = (): CampaignApplicationStats => ({
    applicationCount: 0,
    recommendedCount: 0,
    selectedCount: 0,
    submissionCount: 0,
    pendingSubmissionCount: 0,
    pendingReviewCount: 0,
    revisionRequestedCount: 0,
    approvedSubmissionCount: 0
  });

  applications.forEach((application) => {
    if (application.status === "cancelled") return;

    const current = stats.get(application.campaign_id) ?? emptyStats();
    current.applicationCount += 1;
    if (application.status === "recommended") current.recommendedCount += 1;
    stats.set(application.campaign_id, current);
  });

  collaborations.forEach((collaboration) => {
    if (collaboration.status === "cancelled") return;

    const current = stats.get(collaboration.campaign_id) ?? emptyStats();
    const submission = collaboration.content_submissions?.[0] ?? null;
    current.selectedCount += 1;
    if (!submission) {
      current.pendingSubmissionCount += 1;
    } else {
      current.submissionCount += 1;
      if (submission.review_status === "approved") current.approvedSubmissionCount += 1;
      if (submission.review_status === "needs_revision") current.revisionRequestedCount += 1;
      if (submission.review_status === "submitted") current.pendingReviewCount += 1;
    }
    stats.set(collaboration.campaign_id, current);
  });

  return stats;
}

function mapDashboardCampaign(row: CampaignRow, stats?: CampaignApplicationStats): DashboardCampaign {
  const campaign = mapCampaign(row);
  const reservation = asRelation(row.campaign_point_reservations);

  return {
    ...campaign,
    adminMemo: row.admin_memo ?? "",
    applicationCount: stats?.applicationCount ?? campaign.appliedCount,
    recommendedCount: stats?.recommendedCount ?? 0,
    selectedCount: stats?.selectedCount ?? 0,
    submissionCount: stats?.submissionCount ?? 0,
    pendingSubmissionCount: stats?.pendingSubmissionCount ?? 0,
    pendingReviewCount: stats?.pendingReviewCount ?? 0,
    revisionRequestedCount: stats?.revisionRequestedCount ?? 0,
    approvedSubmissionCount: stats?.approvedSubmissionCount ?? 0,
    billingMode: row.billing_mode ?? "legacy_free",
    pointReservation: reservation ? {
      requestedHeadcount: reservation.requested_headcount,
      reservedPoints: reservation.reserved_points,
      billableHeadcount: reservation.billable_headcount,
      consumedPoints: reservation.consumed_points,
      returnedPoints: reservation.returned_points,
      status: reservation.status
    } : null
  };
}

function resolveSelectedCampaign(campaigns: DashboardCampaign[], selectedCampaignId?: string) {
  if (!selectedCampaignId) return null;
  return campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
}

const dashboardApplicationSelect = `
  id,
  campaign_id,
  creator_id,
  message,
  available_dates,
  proposed_content_type,
  status,
  admin_memo,
  applied_at,
  collaborations(count),
  creator_profiles(
    id,
    user_id,
    profiles(nickname,email),
    creator_channels(platform,channel_name,follower_count),
    portfolios(count)
  ),
  campaigns(
    id,
    title,
    status,
    recruit_count,
    campaign_applications(count),
    collaborations(count)
  )
`;

const dashboardSubmissionSelect = `
  id,
  campaign_id,
  creator_id,
  status,
  submission_due,
  selected_at,
  creator_profiles(
    id,
    profiles(nickname,email),
    creator_channels(platform,channel_name,follower_count)
  ),
  content_submissions(
    id,
    platform,
    content_url,
    published_at,
    preview_image_url,
    disclosure_confirmed,
    review_status,
    admin_memo,
    created_at,
    updated_at
  )
`;

function mapCampaign(row: CampaignRow): Campaign {
  const requirementData = getCampaignRequirementData(row.content_requirements);
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_profiles?.business_name ?? undefined,
    businessCategory: row.business_profiles?.category ?? undefined,
    businessHours: getBusinessHoursText(row.business_profiles?.business_hours as BusinessHoursValue, "summary"),
    businessCoverImage: row.business_profiles?.cover_image_url ?? undefined,
    businessAddress: row.business_profiles?.address ?? undefined,
    businessAddressDetail: row.business_profiles?.address_detail ?? undefined,
    title: row.title,
    description: row.description ?? "",
    campaignType: row.campaign_type === "shortform" ? "shortform" : row.campaign_type === "interview" ? "interview" : "visit",
    region: row.region,
    regionDetail: row.region_detail ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    category: row.category ?? "콘텐츠 협업",
    recruitCount: row.recruit_count,
    // 지원 내역은 본인·해당 가게·관리자만 읽을 수 있어, 조인으로 세면 방문자에게
    // 0이 된다. 캠페인 행에 저장해둔 집계를 쓴다.
    appliedCount: row.applicant_count ?? row.campaign_applications?.[0]?.count ?? 0,
    recruitStart: row.recruit_start ?? "",
    recruitEnd: row.recruit_end ?? "",
    selectionDate: row.selection_date ?? "",
    visitStart: row.visit_start ?? "",
    visitEnd: row.visit_end ?? "",
    submissionDue: row.submission_due ?? "",
    benefitType: row.benefit_type ?? "",
    benefitValue: row.benefit_value ?? "",
    fee: row.fee ? `${row.fee.toLocaleString("ko-KR")}원` : undefined,
    contentRequirements: requirementData.requirements,
    requiredKeywords: requirementData.keywords,
    usageRights: row.usage_rights ?? "",
    status: row.status,
    coverImage: row.cover_image_url ?? "https://storage.googleapis.com/uxpilot-auth.appspot.com/default-placeholder.png",
    referenceImages: Array.isArray(row.reference_image_urls) ? row.reference_image_urls.filter(Boolean) : [],
    beginnerFriendly: row.beginner_friendly,
    operatorRecommended: row.operator_recommended
  };
}

function mapStory(row: StoryRow): LocalStory {
  const body = row.body ?? "";

  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? "",
    body: removeStoryContentUrlLine(body),
    contentUrl: extractStoryContentUrl(body),
    coverImage: row.cover_image_url ?? "https://storage.googleapis.com/uxpilot-auth.appspot.com/default-placeholder.png",
    businessId: row.business_id ?? "",
    creatorId: row.creator_id ?? "",
    campaignId: row.campaign_id ?? "",
    category: row.category ?? "로컬 스토리",
    publishedAt: row.published_at ?? "",
    businessName: asRelation(row.business_profiles)?.business_name ?? undefined,
    creatorNickname: asRelation(asRelation(row.creator_profiles)?.profiles)?.nickname ?? undefined
  };
}

function extractStoryContentUrl(body: string) {
  return body.match(/(?:^|\n)\s*콘텐츠 URL:\s*(https?:\/\/\S+)/)?.[1] ?? "";
}

function removeStoryContentUrlLine(body: string) {
  return body.replace(/(?:^|\n)\s*콘텐츠 URL:\s*https?:\/\/\S+\s*$/m, "").trim();
}

function mapNotice(row: NoticeRow): Notice {
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? "",
    status: row.status,
    isPinned: row.is_pinned,
    publishedAt: row.published_at ?? "",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? ""
  };
}

async function syncExpiredCampaigns(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  await supabase.rpc("sync_expired_campaigns");
}

async function getCurrentSupabaseUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data, error } = await supabase.auth.getUser().catch(() => ({
    data: { user: null },
    error: new Error("Failed to read current user")
  }));

  return error ? null : data.user;
}

async function getSelectedCampaignSubmissions(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  selectedCampaign: DashboardCampaign | null
) {
  if (!selectedCampaign) return [];

  const { data } = await supabase
    .from("collaborations")
    .select(dashboardSubmissionSelect)
    .eq("campaign_id", selectedCampaign.id)
    .neq("status", "cancelled")
    .order("selected_at", { ascending: false });

  return ((data ?? []) as DashboardSubmissionRow[]).map(mapDashboardSubmission);
}

export async function getPublicCampaigns(): Promise<Campaign[]> {
  const supabase = await createSupabaseServerClient();
  await syncExpiredCampaigns(supabase);
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, business_profiles(business_name,category,business_hours,cover_image_url,address,address_detail), campaign_applications(count)")
    .neq("campaign_applications.status", "cancelled")
    .in("status", ["recruiting", "selecting", "in_progress", "submission_review", "completed", "cancelled", "failed"])
    .order("recruit_end", { ascending: true });

  if (error || !data?.length) return [];
  return (data as CampaignRow[]).map(mapCampaign);
}

export async function getPublicCampaign(id: string): Promise<Campaign | undefined> {
  const supabase = await createSupabaseServerClient();
  await syncExpiredCampaigns(supabase);
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, business_profiles(business_name,category,business_hours,cover_image_url,address,address_detail), campaign_applications(count)")
    .neq("campaign_applications.status", "cancelled")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return undefined;
  return mapCampaign(data as CampaignRow);
}

export async function getPublicStories(): Promise<LocalStory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("local_stories")
    .select("*, business_profiles(business_name), creator_profiles(profiles(nickname))")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error || !data?.length) return [];
  return (data as StoryRow[]).map(mapStory);
}

export async function getPublicStory(id: string): Promise<LocalStory | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("local_stories")
    .select("*, business_profiles(business_name), creator_profiles(profiles(nickname))")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return undefined;
  return mapStory(data as StoryRow);
}

export async function getPublishedNotices(): Promise<Notice[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notices")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as NoticeRow[]).map(mapNotice);
}

export async function getPublishedNotice(id: string): Promise<Notice | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notices")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return undefined;
  return mapNotice(data as NoticeRow);
}

export async function getPinnedNotice(): Promise<Notice | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notices")
    .select("*")
    .eq("status", "published")
    .eq("is_pinned", true)
    .maybeSingle();

  if (error || !data) return undefined;
  return mapNotice(data as NoticeRow);
}

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  // 기존 스키마의 본문 컬럼 이름은 message다.
  message: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

// 헤더 종 아이콘은 운영자 공지와 개인 알림을 함께 보여준다. 두 출처를 최신순으로
// 합치고, 읽지 않은 개수도 합쳐서 센다.
export async function getHeaderFeedData(userId: string): Promise<{ items: HeaderFeedItem[]; unreadCount: number }> {
  const supabase = await createSupabaseServerClient();

  const [{ data: noticeRows }, { data: notificationRows }] = await Promise.all([
    supabase
      .from("notices")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("notifications")
      .select("id,type,title,message,link,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  const notices = ((noticeRows ?? []) as NoticeRow[]).map(mapNotice);
  const noticeIds = notices.map((notice) => notice.id);
  const { data: readRows } = noticeIds.length
    ? await supabase.from("notice_reads").select("notice_id").eq("user_id", userId).in("notice_id", noticeIds)
    : { data: [] };
  const readNoticeIds = new Set((readRows ?? []).map((row) => row.notice_id as string));

  const noticeItems: HeaderFeedItem[] = notices.map((notice) => ({
    id: notice.id,
    kind: "notice",
    title: notice.title,
    body: notice.body,
    link: `/notices/${notice.id}`,
    createdAt: notice.publishedAt || notice.createdAt,
    isRead: readNoticeIds.has(notice.id)
  }));

  const notificationItems: HeaderFeedItem[] = ((notificationRows ?? []) as NotificationRow[]).map((row) => ({
    id: row.id,
    kind: "notification",
    title: row.title,
    body: row.message ?? "",
    link: row.link ?? "/notifications",
    createdAt: row.created_at,
    isRead: Boolean(row.read_at)
  }));

  const items = [...noticeItems, ...notificationItems].sort(
    (a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
  );

  return {
    items: items.slice(0, 6),
    unreadCount: items.filter((item) => !item.isRead).length
  };
}

export async function getUserNotifications(): Promise<AppNotification[]> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentSupabaseUser(supabase);
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("id,type,title,message,link,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return ((data ?? []) as NotificationRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.message ?? "",
    link: row.link ?? "",
    createdAt: row.created_at,
    isRead: Boolean(row.read_at)
  }));
}

export async function getAdminNotices(): Promise<Notice[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as NoticeRow[]).map(mapNotice);
}

export async function getPublicHomeStats() {
  const supabase = await createSupabaseServerClient();
  // profiles는 본인 행과 관리자만 읽을 수 있어, 비로그인 방문자가 직접 세면 0이
  // 나온다. 숫자만 돌려주는 함수를 쓴다.
  const { data } = await supabase.rpc("get_public_home_stats");
  const stats = Array.isArray(data) ? data[0] : data;

  return {
    campaigns: Number(stats?.campaigns ?? 0),
    creators: Number(stats?.creators ?? 0),
    businesses: Number(stats?.businesses ?? 0)
  };
}

export type DashboardListFilter = "" | "active" | "review" | "completed";
export type DashboardListSort = "latest" | "deadline";

export type DashboardListOptions = {
  filter?: DashboardListFilter;
  q?: string;
  sort?: DashboardListSort;
  page?: number;
  perPage?: number;
};

function dashboardDateOrderValue(value: string) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(`${value.slice(0, 10)}T00:00:00+09:00`).getTime();

  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function filterDashboardCampaigns(campaigns: DashboardCampaign[], filter: DashboardListFilter, q: string, sort: DashboardListSort) {
  const normalizedQuery = q.trim().toLocaleLowerCase("ko-KR");
  const filtered = campaigns.filter((campaign) => {
    if (filter === "active" && campaign.status !== "recruiting" && campaign.status !== "selecting") return false;
    if (filter === "review" && campaign.status !== "submission_review" && campaign.status !== "in_progress") return false;
    if (filter === "completed" && campaign.status !== "completed" && campaign.status !== "cancelled" && campaign.status !== "failed") return false;
    if (!normalizedQuery) return true;

    return [campaign.title, campaign.category, campaign.region].some((value) =>
      value.toLocaleLowerCase("ko-KR").includes(normalizedQuery)
    );
  });

  if (sort !== "deadline") return filtered;

  return [...filtered].sort((a, b) => dashboardDateOrderValue(a.recruitEnd) - dashboardDateOrderValue(b.recruitEnd));
}

export async function getBusinessDashboard(
  selectedCampaignId?: string,
  listOptions: DashboardListOptions = {}
): Promise<BusinessDashboardData> {
  const supabase = await createSupabaseServerClient();
  await syncExpiredCampaigns(supabase);
  const user = await getCurrentSupabaseUser(supabase);

  if (!user) {
    return {
      business: null,
      businessProfileDefaults: null,
      campaigns: [],
      campaignSummary: { recruiting: 0, progressing: 0, review: 0, completed: 0 },
      totalPages: 1,
      currentPage: 1,
      selectedCampaign: null,
      selectedCampaignApplications: [],
      selectedCampaignSubmissions: [],
      recommendedApplications: []
    };
  }

  const [{ data: business }, { data: profile }] = await Promise.all([
    supabase
      .from("business_profiles")
      .select("id,business_name,category,short_intro,description,address,address_detail,latitude,longitude,district,contact,business_hours,website_url,social_urls,verification_status,is_public,cover_image_url")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("nickname,email,name,phone,business_registration_number,referral_code")
      .eq("id", user.id)
      .maybeSingle()
  ]);

  const businessProfileDefaults = buildBusinessProfileDefaults({ user, profile });

  if (!business) {
    return {
      business: null,
      businessProfileDefaults,
      campaigns: [],
      campaignSummary: { recruiting: 0, progressing: 0, review: 0, completed: 0 },
      totalPages: 1,
      currentPage: 1,
      selectedCampaign: null,
      selectedCampaignApplications: [],
      selectedCampaignSubmissions: [],
      recommendedApplications: []
    };
  }

  const { data: campaignRows } = await supabase
    .from("campaigns")
    .select("*, business_profiles(business_name), campaign_applications(count), campaign_point_reservations(requested_headcount,reserved_points,billable_headcount,consumed_points,returned_points,status)")
    .neq("campaign_applications.status", "cancelled")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const allRows = (campaignRows ?? []) as CampaignRow[];
  // 통계 없이 먼저 만들어 상태 집계와 필터·정렬에만 쓴다. 필터 조건은 통계를 보지 않는다.
  const allCampaigns = allRows.map((campaign) => mapDashboardCampaign(campaign));
  const campaignSummary = {
    recruiting: allCampaigns.filter((item) => item.status === "recruiting").length,
    progressing: allCampaigns.filter((item) => item.status === "in_progress").length,
    review: allCampaigns.filter((item) => item.status === "submission_review").length,
    completed: allCampaigns.filter((item) => item.status === "completed").length
  };

  const perPage = listOptions.perPage ?? 6;
  const visible = filterDashboardCampaigns(
    allCampaigns,
    listOptions.filter ?? "",
    listOptions.q ?? "",
    listOptions.sort ?? "latest"
  );
  const totalPages = Math.max(Math.ceil(visible.length / perPage), 1);
  const currentPage = Math.min(Math.max(listOptions.page ?? 1, 1), totalPages);
  const pageCampaignIds = visible.slice((currentPage - 1) * perPage, currentPage * perPage).map((item) => item.id);

  // 선택된 캠페인은 모달에서 통계를 쓰므로 현재 페이지에 없더라도 함께 센다.
  const statsTargetIds = Array.from(
    new Set([...pageCampaignIds, ...(selectedCampaignId ? [selectedCampaignId] : [])])
  ).filter((id) => allCampaigns.some((item) => item.id === id));

  const [applicationSummaryRows, collaborationSummaryRows] = statsTargetIds.length
    ? await Promise.all([
      supabase.from("campaign_applications").select("id,campaign_id,status").in("campaign_id", statsTargetIds),
      supabase.from("collaborations").select("id,campaign_id,status,content_submissions(id,review_status)").in("campaign_id", statsTargetIds)
    ])
    : [{ data: [] }, { data: [] }];
  const stats = buildCampaignApplicationStats(
    (applicationSummaryRows.data ?? []) as ApplicationSummaryRow[],
    (collaborationSummaryRows.data ?? []) as CollaborationSummaryRow[]
  );

  const withStats = new Map(
    allRows
      .filter((row) => statsTargetIds.includes(row.id))
      .map((row) => [row.id, mapDashboardCampaign(row, stats.get(row.id))] as const)
  );
  const campaigns = pageCampaignIds.map((id) => withStats.get(id)).filter((item): item is DashboardCampaign => Boolean(item));
  const selectedCampaign = selectedCampaignId ? withStats.get(selectedCampaignId) ?? null : null;
  const { data: selectedApplicationRows } = selectedCampaign
    ? await supabase
      .from("campaign_applications")
      .select(dashboardApplicationSelect)
      .eq("campaign_id", selectedCampaign.id)
      .in("status", ["submitted", "recommended", "selected", "rejected"])
      .order("applied_at", { ascending: false })
    : { data: [] };
  const mappedApplications = ((selectedApplicationRows ?? []) as DashboardApplicationRow[]).map(mapDashboardApplication);
  const applicantUserIds = Array.from(new Set(mappedApplications.map((item) => item.creatorUserId).filter(Boolean)));
  const { data: pastReviewRows } = applicantUserIds.length
    ? await supabase
      .from("reviews")
      .select("reviewee_id,content_quality,guideline_compliance,communication,punctuality,rework_intent,tags,updated_at")
      .eq("reviewer_id", user.id)
      .in("reviewee_id", applicantUserIds)
    : { data: [] };
  const pastReviews = buildApplicantPastReviews((pastReviewRows ?? []) as ApplicantReviewRow[]);
  const selectedCampaignApplications = mappedApplications.map((item) => ({
    ...item,
    pastReview: pastReviews.get(item.creatorUserId) ?? null
  }));
  const selectedCampaignSubmissions = await getSelectedCampaignSubmissions(supabase, selectedCampaign);

  return {
    business: {
      id: business.id,
      businessName: business.business_name,
      category: business.category,
      shortIntro: business.short_intro ?? "",
      description: business.description ?? "",
      address: business.address ?? "",
      addressDetail: business.address_detail ?? "",
      latitude: business.latitude === null ? null : Number(business.latitude),
      longitude: business.longitude === null ? null : Number(business.longitude),
      district: business.district ?? "",
      contact: business.contact ?? "",
      businessHours: getBusinessHoursText(business.business_hours as BusinessHoursValue, "summary"),
      businessHoursPreset: getBusinessHoursText(business.business_hours as BusinessHoursValue, "preset"),
      businessHoursOpen: getBusinessHoursText(business.business_hours as BusinessHoursValue, "open"),
      businessHoursClose: getBusinessHoursText(business.business_hours as BusinessHoursValue, "close"),
      businessHoursNote: getBusinessHoursText(business.business_hours as BusinessHoursValue, "note"),
      websiteUrl: business.website_url ?? "",
      socialUrls: Array.isArray(business.social_urls) ? business.social_urls.filter(Boolean) : [],
      verificationStatus: business.verification_status,
      isPublic: business.is_public,
      coverImage: business.cover_image_url ?? "",
      managerName: profile?.name ?? "",
      managerEmail: profile?.email ?? user.email ?? "",
      managerPhone: profile?.phone ?? "",
      businessRegistrationNumber: profile?.business_registration_number ?? "",
      referralCode: profile?.referral_code ?? "",
      verification: {
        emailVerified: Boolean(user.email_confirmed_at),
        phoneVerified: Boolean(
          user.phone_confirmed_at
          && normalizeKoreanAuthPhone(user.phone) === normalizeKoreanAuthPhone(profile?.phone)
        )
      }
    },
    businessProfileDefaults,
    campaigns,
    campaignSummary,
    totalPages,
    currentPage,
    selectedCampaign,
    selectedCampaignApplications,
    selectedCampaignSubmissions,
    recommendedApplications: selectedCampaignApplications.filter((application) => application.status === "recommended")
  };
}

export async function getBusinessCreatorManagement({
  q,
  campaignId,
  rehire,
  page,
  perPage = 6
}: {
  q?: string;
  campaignId?: string;
  rehire?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<BusinessCreatorManagementData> {
  const supabase = await createSupabaseServerClient();
  await syncExpiredCampaigns(supabase);
  const user = await getCurrentSupabaseUser(supabase);
  const normalizedQuery = q?.trim() ?? "";
  const normalizedCampaignId = campaignId?.trim() ?? "";
  const normalizedRehire = rehire === "yes" || rehire === "no" ? rehire : "all";
  const requestedPage = Number.isInteger(page) && page && page > 0 ? page : 1;

  const emptyResult = (business: BusinessCreatorManagementData["business"] = null): BusinessCreatorManagementData => ({
    business,
    campaigns: [],
    creators: [],
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    filters: {
      q: normalizedQuery,
      campaignId: normalizedCampaignId,
      rehire: normalizedRehire
    }
  });

  if (!user) return emptyResult();

  const [{ data: business }, { data: profile }] = await Promise.all([
    supabase
      .from("business_profiles")
      .select("id,business_name,category,short_intro,description,address,address_detail,latitude,longitude,district,contact,business_hours,website_url,social_urls,verification_status,is_public,cover_image_url")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("email,name,phone,business_registration_number,referral_code")
      .eq("id", user.id)
      .maybeSingle()
  ]);

  if (!business) return emptyResult();

  const businessSummary: BusinessCreatorManagementData["business"] = {
    id: business.id,
    businessName: business.business_name,
    category: business.category,
    shortIntro: business.short_intro ?? "",
    description: business.description ?? "",
    address: business.address ?? "",
    addressDetail: business.address_detail ?? "",
    latitude: business.latitude === null ? null : Number(business.latitude),
    longitude: business.longitude === null ? null : Number(business.longitude),
    district: business.district ?? "",
    contact: business.contact ?? "",
    businessHours: getBusinessHoursText(business.business_hours as BusinessHoursValue, "summary"),
    businessHoursPreset: getBusinessHoursText(business.business_hours as BusinessHoursValue, "preset"),
    businessHoursOpen: getBusinessHoursText(business.business_hours as BusinessHoursValue, "open"),
    businessHoursClose: getBusinessHoursText(business.business_hours as BusinessHoursValue, "close"),
    businessHoursNote: getBusinessHoursText(business.business_hours as BusinessHoursValue, "note"),
    websiteUrl: business.website_url ?? "",
    socialUrls: Array.isArray(business.social_urls) ? business.social_urls.filter(Boolean) : [],
    verificationStatus: business.verification_status,
    isPublic: business.is_public,
    coverImage: business.cover_image_url ?? "",
    managerName: profile?.name ?? "",
    managerEmail: profile?.email ?? user.email ?? "",
    managerPhone: profile?.phone ?? "",
    businessRegistrationNumber: profile?.business_registration_number ?? "",
    referralCode: profile?.referral_code ?? "",
    verification: {
      emailVerified: Boolean(user.email_confirmed_at),
      phoneVerified: Boolean(
        user.phone_confirmed_at
        && normalizeKoreanAuthPhone(user.phone) === normalizeKoreanAuthPhone(profile?.phone)
      )
    }
  };

  const { data: campaignRows } = await supabase
    .from("campaigns")
    .select("id,title,status")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  let collaborationQuery = supabase
    .from("collaborations")
    .select(`
      id,
      campaign_id,
      creator_id,
      selected_at,
      submission_due,
      status,
      created_at,
      campaigns!inner(
        id,
        title,
        status,
        cover_image_url
      ),
      creator_profiles!inner(
        id,
        user_id,
        avatar_url,
        activity_areas,
        interests,
        content_types,
        profiles(nickname,email),
        creator_channels(platform,channel_name,channel_url,follower_count),
        portfolios(count)
      ),
      content_submissions(
        id,
        platform,
        content_url,
        published_at,
        preview_image_url,
        review_status,
        admin_memo,
        created_at,
        updated_at
      ),
      reviews(
        id,
        content_quality,
        guideline_compliance,
        communication,
        punctuality,
        rework_intent,
        private_comment,
        tags,
        updated_at
      )
    `)
    .eq("campaigns.business_id", business.id)
    .neq("status", "cancelled");

  if (normalizedCampaignId) {
    collaborationQuery = collaborationQuery.eq("campaign_id", normalizedCampaignId);
  }

  const { data: collaborationRows } = await collaborationQuery.order("selected_at", { ascending: false });
  const loweredQuery = normalizedQuery.toLocaleLowerCase("ko-KR");
  const allItems = ((collaborationRows ?? []) as BusinessCreatorCollaborationRow[])
    .map(mapBusinessCreatorReviewItem)
    .filter((item) => {
      if (normalizedCampaignId && item.campaignId !== normalizedCampaignId) return false;
      if (normalizedRehire === "yes" && item.review?.reworkIntent !== true) return false;
      if (normalizedRehire === "no" && item.review?.reworkIntent !== false) return false;
      if (!loweredQuery) return true;

      return [item.creatorNickname, item.creatorEmail, item.campaignTitle, item.creatorChannelSummary].some((value) =>
        value.toLocaleLowerCase("ko-KR").includes(loweredQuery)
      );
    })
    .sort((a, b) => {
      const aSortDate = a.submission?.updatedAt || a.selectedAt;
      const bSortDate = b.submission?.updatedAt || b.selectedAt;
      return getTimestamp(bSortDate) - getTimestamp(aSortDate);
    });

  const totalCount = allItems.length;
  const totalPages = Math.max(Math.ceil(totalCount / perPage), 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const creators = allItems.slice((currentPage - 1) * perPage, currentPage * perPage);

  return {
    business: businessSummary,
    campaigns: ((campaignRows ?? []) as { id: string; title: string | null; status: Campaign["status"] }[]).map((campaign) => ({
      id: campaign.id,
      title: campaign.title ?? "캠페인",
      status: campaign.status
    })),
    creators,
    totalCount,
    totalPages,
    currentPage,
    filters: {
      q: normalizedQuery,
      campaignId: normalizedCampaignId,
      rehire: normalizedRehire
    }
  };
}

// 관리자 페이지 쿼리들. 접근 제어는 app/admin/layout.tsx의 requireRole이 맡고,
// 여기서는 관리자라는 전제로 데이터만 가져온다.
export async function getAdminOverview(): Promise<AdminOverviewStats> {
  const supabase = await createSupabaseServerClient();
  await syncExpiredCampaigns(supabase);

  const [
    businessCount,
    creatorCount,
    recruitingCount,
    approvedSubmissionCount,
    totalSubmissionCount,
    pendingReviewCount,
    pendingSubmissionCount,
    pendingVerificationCount
  ] = await Promise.all([
    supabase.from("business_profiles").select("id", { count: "exact", head: true }),
    // 홈 지표와 같은 기준(가입자)으로 센다. 프로필을 아직 안 만든 회원은
    // 회원 관리 목록에서 따로 표시한다.
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "creator").eq("verification_status", "verified"),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "recruiting"),
    supabase.from("content_submissions").select("id", { count: "exact", head: true }).eq("review_status", "approved"),
    supabase.from("content_submissions").select("id", { count: "exact", head: true }),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).in("status", ["in_review", "revision_requested"]),
    supabase.from("content_submissions").select("id", { count: "exact", head: true }).eq("review_status", "submitted"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending")
  ]);

  return {
    businesses: businessCount.count ?? 0,
    verifiedCreators: creatorCount.count ?? 0,
    recruitingCampaigns: recruitingCount.count ?? 0,
    approvedSubmissions: approvedSubmissionCount.count ?? 0,
    totalSubmissions: totalSubmissionCount.count ?? 0,
    pendingReviewCampaigns: pendingReviewCount.count ?? 0,
    pendingSubmissions: pendingSubmissionCount.count ?? 0,
    pendingVerifications: pendingVerificationCount.count ?? 0
  };
}

export async function getAdminCampaigns(selectedCampaignId?: string): Promise<AdminCampaignsData> {
  const supabase = await createSupabaseServerClient();
  await syncExpiredCampaigns(supabase);

  const [campaignRows, applicationSummaryRows, collaborationSummaryRows] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*, business_profiles(business_name), campaign_applications(count), campaign_point_reservations(requested_headcount,reserved_points,billable_headcount,consumed_points,returned_points,status)")
      .neq("campaign_applications.status", "cancelled")
      .in("status", ["draft", "in_review", "revision_requested", "approved", "scheduled", "recruiting", "selecting", "in_progress", "submission_review", "completed", "cancelled", "failed"])
      .order("created_at", { ascending: false }),
    supabase.from("campaign_applications").select("id,campaign_id,status"),
    supabase.from("collaborations").select("id,campaign_id,status,content_submissions(id,review_status)")
  ]);
  const statsByCampaign = buildCampaignApplicationStats(
    (applicationSummaryRows.data ?? []) as ApplicationSummaryRow[],
    (collaborationSummaryRows.data ?? []) as CollaborationSummaryRow[]
  );
  const campaigns = ((campaignRows.data ?? []) as CampaignRow[]).map((campaign) => mapDashboardCampaign(campaign, statsByCampaign.get(campaign.id)));
  const selectedCampaign = resolveSelectedCampaign(campaigns, selectedCampaignId);
  const { data: selectedApplicationRows } = selectedCampaign
    ? await supabase
      .from("campaign_applications")
      .select(dashboardApplicationSelect)
      .eq("campaign_id", selectedCampaign.id)
      .in("status", ["submitted", "recommended", "selected", "rejected"])
      .order("applied_at", { ascending: false })
    : { data: [] };
  const selectedCampaignApplications = ((selectedApplicationRows ?? []) as DashboardApplicationRow[]).map(mapDashboardApplication);
  const selectedCampaignSubmissions = await getSelectedCampaignSubmissions(supabase, selectedCampaign);

  return { campaigns, selectedCampaign, selectedCampaignApplications, selectedCampaignSubmissions };
}

export async function getAdminRecentSubmissions(): Promise<AdminRecentSubmission[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("content_submissions")
    .select("id,content_url,preview_image_url,published_at,review_status,platform")
    .order("created_at", { ascending: false })
    .limit(10);

  return (data ?? []).map((submission) => ({
    id: submission.id,
    contentUrl: submission.content_url,
    previewImageUrl: submission.preview_image_url ?? "",
    publishedAt: submission.published_at ?? "",
    reviewStatus: submission.review_status,
    platform: submission.platform
  }));
}

export type AdminWallet = {
  businessId: string;
  businessName: string;
  availablePoints: number;
  reservedPoints: number;
  lifetimeCredited: number;
  lifetimeSpent: number;
};

export type AdminReservation = {
  campaignId: string;
  campaignTitle: string;
  campaignStatus: string;
  businessName: string;
  requestedHeadcount: number;
  billableHeadcount: number | null;
  reservedPoints: number;
  consumedPoints: number;
  returnedPoints: number;
  status: string;
  settlementReason: string;
  settledAt: string;
  // draft 캠페인에 살아 있는 예약. 사장 스스로는 풀 수 없어 관리자가 해제해야 한다.
  isStuck: boolean;
};

export type AdminPaymentOrder = {
  id: string;
  orderId: string;
  businessName: string;
  totalAmount: number;
  pointAmount: number;
  bonusPoints: number;
  refundedPoints: number;
  status: string;
  paidAt: string;
  failureMessage: string;
};

export type AdminRefundRequest = {
  id: string;
  businessName: string;
  orderId: string;
  refundPoints: number;
  refundAmount: number;
  status: string;
  failureMessage: string;
  createdAt: string;
  completedAt: string;
};

export type AdminPointsData = {
  wallets: AdminWallet[];
  reservations: AdminReservation[];
  orders: AdminPaymentOrder[];
  refunds: AdminRefundRequest[];
};

export async function getAdminPointsData(): Promise<AdminPointsData> {
  const supabase = await createSupabaseServerClient();
  // 정산은 크론 없이 페이지 로드에 얹혀 돈다. 관리자가 이 화면을 열면 밀린 모집
  // 마감 정산이 그 자리에서 실행되고, 결과가 아래 표에 바로 보인다.
  await syncExpiredCampaigns(supabase);

  const [walletRows, reservationRows, orderRows, refundRows] = await Promise.all([
    supabase
      .from("point_wallets")
      .select("business_id,available_points,reserved_points,lifetime_credited_points,lifetime_spent_points,business_profiles(business_name)")
      .order("available_points", { ascending: false }),
    supabase
      .from("campaign_point_reservations")
      .select("campaign_id,requested_headcount,billable_headcount,reserved_points,consumed_points,returned_points,status,settlement_reason,settled_at,campaigns(title,status),business_profiles(business_name)")
      .order("reserved_at", { ascending: false }),
    supabase
      .from("point_payment_orders")
      .select("id,order_id,total_amount,point_amount,bonus_points,refunded_points,status,paid_at,failure_message,business_profiles(business_name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("point_refund_requests")
      .select("id,refund_points,refund_amount,status,failure_message,created_at,completed_at,point_payment_orders(order_id),business_profiles(business_name)")
      .order("created_at", { ascending: false })
  ]);

  return {
    wallets: (walletRows.data ?? []).map((row) => {
      const business = asRelation(row.business_profiles) as { business_name?: string } | null;
      return {
        businessId: row.business_id,
        businessName: business?.business_name ?? "가게명 미등록",
        availablePoints: Number(row.available_points ?? 0),
        reservedPoints: Number(row.reserved_points ?? 0),
        lifetimeCredited: Number(row.lifetime_credited_points ?? 0),
        lifetimeSpent: Number(row.lifetime_spent_points ?? 0)
      };
    }),
    reservations: (reservationRows.data ?? []).map((row) => {
      const campaign = asRelation(row.campaigns) as { title?: string; status?: string } | null;
      const business = asRelation(row.business_profiles) as { business_name?: string } | null;
      return {
        campaignId: row.campaign_id,
        campaignTitle: campaign?.title ?? "캠페인",
        campaignStatus: campaign?.status ?? "",
        businessName: business?.business_name ?? "가게명 미등록",
        requestedHeadcount: row.requested_headcount,
        billableHeadcount: row.billable_headcount,
        reservedPoints: row.reserved_points,
        consumedPoints: row.consumed_points ?? 0,
        returnedPoints: row.returned_points ?? 0,
        status: row.status,
        settlementReason: row.settlement_reason ?? "",
        settledAt: row.settled_at ?? "",
        isStuck: campaign?.status === "draft" && row.status === "reserved"
      };
    }),
    orders: (orderRows.data ?? []).map((row) => {
      const business = asRelation(row.business_profiles) as { business_name?: string } | null;
      return {
        id: row.id,
        orderId: row.order_id,
        businessName: business?.business_name ?? "가게명 미등록",
        totalAmount: row.total_amount,
        pointAmount: row.point_amount,
        bonusPoints: row.bonus_points ?? 0,
        refundedPoints: row.refunded_points ?? 0,
        status: row.status,
        paidAt: row.paid_at ?? "",
        failureMessage: row.failure_message ?? ""
      };
    }),
    refunds: (refundRows.data ?? []).map((row) => {
      const order = asRelation(row.point_payment_orders) as { order_id?: string } | null;
      const business = asRelation(row.business_profiles) as { business_name?: string } | null;
      return {
        id: row.id,
        businessName: business?.business_name ?? "가게명 미등록",
        orderId: order?.order_id ?? "",
        refundPoints: row.refund_points,
        refundAmount: row.refund_amount,
        status: row.status,
        failureMessage: row.failure_message ?? "",
        createdAt: row.created_at,
        completedAt: row.completed_at ?? ""
      };
    })
  };
}

export type AdminMemberDetail = {
  id: string;
  nickname: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isAdmin: boolean;
  status: string;
  verificationStatus: string;
  marketingOptIn: boolean;
  createdAt: string;
  creator: {
    bio: string;
    avatarUrl: string;
    activityAreas: string[];
    interests: string[];
    contentTypes: string[];
    availableDays: string[];
    completionRate: number;
    deadlineRate: number;
    channels: { platform: string; channelName: string; channelUrl: string; followerCount: number }[];
    portfolios: { title: string; contentType: string; url: string }[];
    applicationCount: number;
    collaborationCount: number;
  } | null;
  business: {
    businessName: string;
    category: string;
    address: string;
    contact: string;
    businessHours: string;
    isPublic: boolean;
    campaignCount: number;
    availablePoints: number;
    reservedPoints: number;
  } | null;
};

export async function getAdminMemberDetail(userId: string): Promise<AdminMemberDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,nickname,name,email,phone,role,is_admin,status,verification_status,marketing_opt_in,created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  const [creatorRow, businessRow] = await Promise.all([
    supabase
      .from("creator_profiles")
      .select("id,bio,avatar_url,activity_areas,interests,content_types,available_days,completion_rate,deadline_rate,creator_channels(platform,channel_name,channel_url,follower_count),portfolios(title,content_type,url)")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("business_profiles")
      .select("id,business_name,category,address,address_detail,contact,business_hours,is_public")
      .eq("user_id", userId)
      .maybeSingle()
  ]);

  // 활동량은 카운트만 쓴다. 상세 목록까지 담으면 조회가 무거워진다.
  const [applicationCount, collaborationCount, campaignCount, wallet] = await Promise.all([
    creatorRow.data
      ? supabase.from("campaign_applications").select("id", { count: "exact", head: true }).eq("creator_id", creatorRow.data.id)
      : Promise.resolve({ count: 0 }),
    creatorRow.data
      ? supabase.from("collaborations").select("id", { count: "exact", head: true }).eq("creator_id", creatorRow.data.id)
      : Promise.resolve({ count: 0 }),
    businessRow.data
      ? supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("business_id", businessRow.data.id)
      : Promise.resolve({ count: 0 }),
    businessRow.data
      ? supabase.from("point_wallets").select("available_points,reserved_points").eq("business_id", businessRow.data.id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const creator = creatorRow.data;
  const business = businessRow.data;

  return {
    id: profile.id,
    nickname: profile.nickname ?? "",
    name: profile.name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    role: profile.role,
    isAdmin: Boolean(profile.is_admin),
    status: profile.status,
    verificationStatus: profile.verification_status,
    marketingOptIn: Boolean(profile.marketing_opt_in),
    createdAt: profile.created_at,
    creator: creator
      ? {
        bio: creator.bio ?? "",
        avatarUrl: creator.avatar_url ?? "",
        activityAreas: asStringArray(creator.activity_areas),
        interests: asStringArray(creator.interests),
        contentTypes: asStringArray(creator.content_types),
        availableDays: asStringArray(creator.available_days),
        completionRate: Number(creator.completion_rate ?? 0),
        deadlineRate: Number(creator.deadline_rate ?? 0),
        channels: (creator.creator_channels ?? []).map((channel) => ({
          platform: channel.platform ?? "",
          channelName: channel.channel_name ?? "",
          channelUrl: channel.channel_url ?? "",
          followerCount: Number(channel.follower_count ?? 0)
        })),
        portfolios: (creator.portfolios ?? []).map((item) => ({
          title: item.title ?? "",
          contentType: item.content_type ?? "",
          url: item.url ?? ""
        })),
        applicationCount: applicationCount.count ?? 0,
        collaborationCount: collaborationCount.count ?? 0
      }
      : null,
    business: business
      ? {
        businessName: business.business_name ?? "",
        category: business.category ?? "",
        address: [business.address, business.address_detail].filter(Boolean).join(" "),
        contact: business.contact ?? "",
        businessHours: getBusinessHoursText(business.business_hours as BusinessHoursValue, "summary"),
        isPublic: Boolean(business.is_public),
        campaignCount: campaignCount.count ?? 0,
        availablePoints: Number(wallet.data?.available_points ?? 0),
        reservedPoints: Number(wallet.data?.reserved_points ?? 0)
      }
      : null
  };
}

const ADMIN_MEMBER_PAGE_SIZE = 20;

export async function getAdminMembers(options: AdminMemberListOptions = {}): Promise<AdminMembersData> {
  const supabase = await createSupabaseServerClient();
  const roleFilter = ["business", "creator", "admin"].includes(options.role ?? "") ? options.role : "";
  const verificationFilter = ["pending", "verified", "rejected"].includes(options.verification ?? "") ? options.verification : "";
  const searchQuery = (options.searchQuery ?? "").trim();

  let query = supabase
    .from("profiles")
    .select("id,nickname,email,role,is_admin,status,verification_status,created_at,business_profiles(business_name),creator_profiles(id)", { count: "exact" })
    .order("created_at", { ascending: false });

  // '관리자'는 역할이 아니라 플래그다. 그 외 필터는 역할 그대로.
  if (roleFilter === "admin") query = query.eq("is_admin", true);
  else if (roleFilter) query = query.eq("role", roleFilter);
  if (verificationFilter) query = query.eq("verification_status", verificationFilter);
  if (searchQuery) {
    const escaped = searchQuery.replace(/[%_,]/g, "");
    if (escaped) query = query.or(`nickname.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const requestedPage = Math.max(options.page ?? 1, 1);
  const from = (requestedPage - 1) * ADMIN_MEMBER_PAGE_SIZE;
  const { data, count } = await query.range(from, from + ADMIN_MEMBER_PAGE_SIZE - 1);

  const totalCount = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / ADMIN_MEMBER_PAGE_SIZE), 1);

  return {
    members: (data ?? []).map((row) => {
      const business = asRelation(row.business_profiles) as { business_name?: string } | null;
      const creator = asRelation(row.creator_profiles) as { id?: string } | null;
      return {
        id: row.id,
        nickname: row.nickname ?? "",
        email: row.email ?? "",
        role: row.role,
        isAdmin: Boolean(row.is_admin),
        status: row.status,
        verificationStatus: row.verification_status,
        createdAt: row.created_at,
        businessName: business?.business_name ?? "",
        hasRoleProfile: row.role === "business" ? Boolean(business) : Boolean(creator)
      };
    }),
    totalCount,
    totalPages,
    currentPage: Math.min(requestedPage, totalPages)
  };
}

export async function getCreatorDashboard(): Promise<CreatorDashboardData> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentSupabaseUser(supabase);

  if (!user) {
    return { creator: null, applications: [], collaborations: [], submissions: [] };
  }

  const { data: profile } = await supabase.from("profiles").select("nickname,email").eq("id", user.id).maybeSingle();
  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("id,deadline_rate,avatar_url,activity_areas,interests,content_types")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!creator) {
    return { creator: null, applications: [], collaborations: [], submissions: [] };
  }

  const [applicationRows, collaborationRows, submissionRows] = await Promise.all([
    supabase
      .from("campaign_applications")
      .select("id,campaign_id,status,proposed_content_type,campaigns(title,cover_image_url,region,campaign_type,selection_date,benefit_type,benefit_value,status,recruit_end)")
      .eq("creator_id", creator.id)
      .order("applied_at", { ascending: false }),
    supabase
      .from("collaborations")
      .select("id,campaign_id,visit_date,submission_due,status,campaigns(title,cover_image_url,region,region_detail,campaign_type,benefit_type,benefit_value,business_profiles(business_name,address,address_detail,contact,business_hours)),content_submissions(id,review_status,content_url,updated_at)")
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("content_submissions")
      .select("id,review_status,collaborations!inner(creator_id)")
      .eq("collaborations.creator_id", creator.id)
  ]);

  return {
    creator: {
      id: creator.id,
      nickname: profile?.nickname ?? "크리에이터",
      email: profile?.email ?? user.email ?? "",
      avatarUrl: creator.avatar_url ?? "",
      activityAreas: asStringArray(creator.activity_areas),
      interests: asStringArray(creator.interests),
      contentTypes: asStringArray(creator.content_types),
      deadlineRate: Number(creator.deadline_rate ?? 0)
    },
    applications: (applicationRows.data ?? []).map((application) => {
      const campaign = Array.isArray(application.campaigns) ? application.campaigns[0] : application.campaigns;
      return {
        id: application.id,
        campaignId: application.campaign_id,
        campaignTitle: campaign?.title ?? "캠페인",
        campaignCoverImage: campaign?.cover_image_url ?? "https://storage.googleapis.com/uxpilot-auth.appspot.com/default-placeholder.png",
        campaignRegion: campaign?.region ?? "",
        campaignType: campaign?.campaign_type ?? "",
        selectionDate: campaign?.selection_date ?? "",
        benefitSummary: formatBenefitSummary(campaign?.benefit_type, campaign?.benefit_value),
        status: application.status,
        proposedContentType: application.proposed_content_type ?? "",
        // 모집이 열려 있는 동안만 스스로 취소할 수 있다. 마감되면 정산이 끝난 뒤다.
        canCancel:
          (application.status === "submitted" || application.status === "recommended") &&
          campaign?.status === "recruiting" &&
          Boolean(campaign?.recruit_end) &&
          String(campaign?.recruit_end) >= getKoreaTodayString()
      };
    }),
    collaborations: (collaborationRows.data ?? []).map((collaboration) => {
      const campaign = Array.isArray(collaboration.campaigns) ? collaboration.campaigns[0] : collaboration.campaigns;
      const submission = collaboration.content_submissions?.[0] ?? null;
      const store = asRelation(campaign?.business_profiles);
      return {
        id: collaboration.id,
        campaignId: collaboration.campaign_id,
        campaignTitle: campaign?.title ?? "캠페인",
        campaignCoverImage: campaign?.cover_image_url ?? "https://storage.googleapis.com/uxpilot-auth.appspot.com/default-placeholder.png",
        campaignRegion: campaign?.region ?? "",
        campaignType: campaign?.campaign_type ?? "",
        benefitSummary: formatBenefitSummary(campaign?.benefit_type, campaign?.benefit_value),
        visitDate: collaboration.visit_date ?? "미정",
        submissionDue: collaboration.submission_due ?? "미정",
        status: collaboration.status,
        hasSubmission: Boolean(submission),
        submissionReviewStatus: submission?.review_status ?? "",
        submissionContentUrl: submission?.content_url ?? "",
        submissionUpdatedAt: submission?.updated_at ?? "",
        store: {
          name: store?.business_name ?? "",
          address: [campaign?.region ?? store?.address ?? "", campaign?.region_detail ?? store?.address_detail ?? ""]
            .filter(Boolean)
            .join(" "),
          contact: store?.contact ?? "",
          businessHours: getBusinessHoursText(store?.business_hours as BusinessHoursValue, "summary")
        }
      };
    }),
    submissions: (submissionRows.data ?? []).map((submission) => ({
      id: submission.id,
      reviewStatus: submission.review_status
    }))
  };
}

export async function getCollaborationSubmissionDetail(id: string): Promise<CollaborationSubmissionDetail> {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: submissionRows }] = await Promise.all([
    supabase
      .from("collaborations")
      .select("id,submission_due,visit_date,status,campaigns(title,cover_image_url,region,region_detail,business_profiles(business_name,address,address_detail,contact,business_hours))")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("content_submissions")
      .select("id,platform,content_url,published_at,preview_image_url,disclosure_confirmed,review_status,admin_memo")
      .eq("collaboration_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
  ]);

  if (error || !data) return null;
  const campaign = Array.isArray(data.campaigns) ? data.campaigns[0] : data.campaigns;
  const submission = submissionRows?.[0] ?? null;

  const store = asRelation(campaign?.business_profiles);

  return {
    id: data.id,
    campaignTitle: campaign?.title ?? "캠페인",
    campaignCoverImage: campaign?.cover_image_url ?? "",
    submissionDue: data.submission_due ?? "미정",
    visitDate: data.visit_date ?? "",
    status: data.status,
    store: {
      name: store?.business_name ?? "",
      address: [campaign?.region ?? store?.address ?? "", campaign?.region_detail ?? store?.address_detail ?? ""]
        .filter(Boolean)
        .join(" "),
      contact: store?.contact ?? "",
      businessHours: getBusinessHoursText(store?.business_hours as BusinessHoursValue, "summary")
    },
    submission: submission
      ? {
        id: submission.id,
        platform: submission.platform ?? "",
        contentUrl: submission.content_url ?? "",
        publishedAt: submission.published_at ?? "",
        previewImageUrl: submission.preview_image_url ?? "",
        disclosureConfirmed: Boolean(submission.disclosure_confirmed),
        reviewStatus: submission.review_status ?? "",
        adminMemo: submission.admin_memo ?? ""
      }
      : null
  };
}
