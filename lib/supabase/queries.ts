import { stories as fallbackStories, getBusiness as getFallbackBusiness, getCreator as getFallbackCreator } from "@/lib/data";
import { normalizeKoreanAuthPhone } from "@/lib/auth/phone";
import type { Campaign, LocalStory } from "@/lib/types";
import { createSupabaseServerClient } from "./server";

type CampaignRow = {
  id: string;
  business_id: string;
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
  business_profiles?: {
    business_name?: string | null;
    category?: string | null;
    business_hours?: unknown;
    cover_image_url?: string | null;
    address?: string | null;
    address_detail?: string | null;
  } | null;
  campaign_applications?: { count: number }[];
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

export type DashboardCampaign = Campaign & CampaignApplicationStats;

export type DashboardApplication = {
  id: string;
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
  campaigns: DashboardCampaign[];
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

export type AdminDashboardData = {
  stats: {
    businesses: number;
    verifiedCreators: number;
    recruitingCampaigns: number;
    approvedSubmissions: number;
    totalSubmissions: number;
  };
  campaigns: DashboardCampaign[];
  selectedCampaign: DashboardCampaign | null;
  selectedCampaignApplications: DashboardApplication[];
  selectedCampaignSubmissions: DashboardSubmission[];
  applications: DashboardApplication[];
  submissions: {
    id: string;
    contentUrl: string;
    previewImageUrl: string;
    publishedAt: string;
    reviewStatus: string;
    platform: string;
  }[];
  isAdmin: boolean;
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

function getBusinessHoursText(value: BusinessHoursValue, key: "summary" | "preset" | "note") {
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

function mapDashboardApplication(row: DashboardApplicationRow): DashboardApplication {
  const campaign = asRelation(row.campaigns);
  const creator = asRelation(row.creator_profiles);
  const profile = asRelation(creator?.profiles);

  return {
    id: row.id,
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

  return {
    ...campaign,
    applicationCount: stats?.applicationCount ?? campaign.appliedCount,
    recommendedCount: stats?.recommendedCount ?? 0,
    selectedCount: stats?.selectedCount ?? 0,
    submissionCount: stats?.submissionCount ?? 0,
    pendingSubmissionCount: stats?.pendingSubmissionCount ?? 0,
    pendingReviewCount: stats?.pendingReviewCount ?? 0,
    revisionRequestedCount: stats?.revisionRequestedCount ?? 0,
    approvedSubmissionCount: stats?.approvedSubmissionCount ?? 0
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
    appliedCount: row.campaign_applications?.[0]?.count ?? 0,
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
    publishedAt: row.published_at ?? ""
  };
}

function extractStoryContentUrl(body: string) {
  return body.match(/(?:^|\n)\s*콘텐츠 URL:\s*(https?:\/\/\S+)/)?.[1] ?? "";
}

function removeStoryContentUrlLine(body: string) {
  return body.replace(/(?:^|\n)\s*콘텐츠 URL:\s*https?:\/\/\S+\s*$/m, "").trim();
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
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return undefined;
  return mapCampaign(data as CampaignRow);
}

export async function getPublicStories(): Promise<LocalStory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("local_stories")
    .select("*")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error || !data?.length) return fallbackStories;
  return (data as StoryRow[]).map(mapStory);
}

export async function getPublicStory(id: string): Promise<LocalStory | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("local_stories").select("*").eq("id", id).maybeSingle();

  if (error || !data) return fallbackStories.find((story) => story.id === id);
  return mapStory(data as StoryRow);
}

export async function getPublicHomeStats() {
  const supabase = await createSupabaseServerClient();
  const [campaignCount, creatorCount, businessCount] = await Promise.all([
    supabase.from("campaigns").select("id", { count: "exact", head: true }),
    supabase.from("creator_profiles").select("id", { count: "exact", head: true }),
    supabase.from("business_profiles").select("id", { count: "exact", head: true })
  ]);

  return {
    campaigns: campaignCount.count ?? 0,
    creators: creatorCount.count ?? 0,
    businesses: businessCount.count ?? 0
  };
}

export function getDisplayBusiness(id: string) {
  return getFallbackBusiness(id) ?? { businessName: "노원멤버스 파트너" };
}

export function getDisplayCreator(id: string) {
  return getFallbackCreator(id) ?? { nickname: "노원 크리에이터" };
}

export async function getBusinessDashboard(selectedCampaignId?: string): Promise<BusinessDashboardData> {
  const supabase = await createSupabaseServerClient();
  await syncExpiredCampaigns(supabase);
  const user = await getCurrentSupabaseUser(supabase);

  if (!user) {
    return { business: null, businessProfileDefaults: null, campaigns: [], selectedCampaign: null, selectedCampaignApplications: [], selectedCampaignSubmissions: [], recommendedApplications: [] };
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
    return { business: null, businessProfileDefaults, campaigns: [], selectedCampaign: null, selectedCampaignApplications: [], selectedCampaignSubmissions: [], recommendedApplications: [] };
  }

  const { data: campaignRows } = await supabase
    .from("campaigns")
    .select("*, business_profiles(business_name), campaign_applications(count)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const campaignIds = ((campaignRows ?? []) as CampaignRow[]).map((campaign) => campaign.id);
  const [applicationSummaryRows, collaborationSummaryRows] = campaignIds.length
    ? await Promise.all([
      supabase.from("campaign_applications").select("id,campaign_id,status").in("campaign_id", campaignIds),
      supabase.from("collaborations").select("id,campaign_id,status,content_submissions(id,review_status)").in("campaign_id", campaignIds)
    ])
    : [{ data: [] }, { data: [] }];
  const stats = buildCampaignApplicationStats(
    (applicationSummaryRows.data ?? []) as ApplicationSummaryRow[],
    (collaborationSummaryRows.data ?? []) as CollaborationSummaryRow[]
  );
  const campaigns = ((campaignRows ?? []) as CampaignRow[]).map((campaign) => mapDashboardCampaign(campaign, stats.get(campaign.id)));
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

export async function getAdminDashboard(selectedCampaignId?: string): Promise<AdminDashboardData> {
  const supabase = await createSupabaseServerClient();
  await syncExpiredCampaigns(supabase);
  const user = await getCurrentSupabaseUser(supabase);

  if (!user) {
    return {
      stats: { businesses: 0, verifiedCreators: 0, recruitingCampaigns: 0, approvedSubmissions: 0, totalSubmissions: 0 },
      campaigns: [],
      selectedCampaign: null,
      selectedCampaignApplications: [],
      selectedCampaignSubmissions: [],
      applications: [],
      submissions: [],
      isAdmin: false
    };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === "admin";
  if (!isAdmin) {
    return {
      stats: { businesses: 0, verifiedCreators: 0, recruitingCampaigns: 0, approvedSubmissions: 0, totalSubmissions: 0 },
      campaigns: [],
      selectedCampaign: null,
      selectedCampaignApplications: [],
      selectedCampaignSubmissions: [],
      applications: [],
      submissions: [],
      isAdmin: false
    };
  }

  const [
    businessCount,
    creatorCount,
    recruitingCount,
    approvedSubmissionCount,
    totalSubmissionCount,
    campaignRows,
    applicationSummaryRows,
    collaborationSummaryRows,
    submissionRows
  ] = await Promise.all([
    supabase.from("business_profiles").select("id", { count: "exact", head: true }),
    supabase.from("creator_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "recruiting"),
    supabase.from("content_submissions").select("id", { count: "exact", head: true }).eq("review_status", "approved"),
    supabase.from("content_submissions").select("id", { count: "exact", head: true }),
    supabase
      .from("campaigns")
      .select("*, business_profiles(business_name), campaign_applications(count)")
      .in("status", ["draft", "in_review", "revision_requested", "approved", "scheduled", "recruiting", "selecting", "in_progress", "submission_review", "completed", "cancelled", "failed"])
      .order("created_at", { ascending: false }),
    supabase.from("campaign_applications").select("id,campaign_id,status"),
    supabase.from("collaborations").select("id,campaign_id,status,content_submissions(id,review_status)"),
    supabase
      .from("content_submissions")
      .select("id,content_url,preview_image_url,published_at,review_status,platform")
      .order("created_at", { ascending: false })
      .limit(10)
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

  return {
    stats: {
      businesses: businessCount.count ?? 0,
      verifiedCreators: creatorCount.count ?? 0,
      recruitingCampaigns: recruitingCount.count ?? 0,
      approvedSubmissions: approvedSubmissionCount.count ?? 0,
      totalSubmissions: totalSubmissionCount.count ?? 0
    },
    campaigns,
    selectedCampaign,
    selectedCampaignApplications,
    selectedCampaignSubmissions,
    applications: selectedCampaignApplications,
    submissions: (submissionRows.data ?? []).map((submission) => ({
      id: submission.id,
      contentUrl: submission.content_url,
      previewImageUrl: submission.preview_image_url ?? "",
      publishedAt: submission.published_at ?? "",
      reviewStatus: submission.review_status,
      platform: submission.platform
    })),
    isAdmin
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
      .select("id,campaign_id,status,proposed_content_type,campaigns(title,cover_image_url,region,campaign_type,selection_date,benefit_type,benefit_value)")
      .eq("creator_id", creator.id)
      .order("applied_at", { ascending: false }),
    supabase
      .from("collaborations")
      .select("id,campaign_id,visit_date,submission_due,status,campaigns(title,cover_image_url,region,campaign_type,benefit_type,benefit_value),content_submissions(id,review_status,content_url,updated_at)")
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
        proposedContentType: application.proposed_content_type ?? ""
      };
    }),
    collaborations: (collaborationRows.data ?? []).map((collaboration) => {
      const campaign = Array.isArray(collaboration.campaigns) ? collaboration.campaigns[0] : collaboration.campaigns;
      const submission = collaboration.content_submissions?.[0] ?? null;
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
        submissionUpdatedAt: submission?.updated_at ?? ""
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
      .select("id,submission_due,status,campaigns(title,cover_image_url)")
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

  return {
    id: data.id,
    campaignTitle: campaign?.title ?? "캠페인",
    campaignCoverImage: campaign?.cover_image_url ?? "",
    submissionDue: data.submission_due ?? "미정",
    status: data.status,
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
