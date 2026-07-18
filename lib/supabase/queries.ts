import { stories as fallbackStories, getBusiness as getFallbackBusiness, getCreator as getFallbackCreator } from "@/lib/data";
import type { Campaign, LocalStory } from "@/lib/types";
import { createSupabaseServerClient } from "./server";

type CampaignRow = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  campaign_type: string;
  region: string;
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
  business_profiles?: { business_name: string | null } | null;
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

export type BusinessDashboardData = {
  business: {
    id: string;
    businessName: string;
    category: string;
    shortIntro: string;
    description: string;
    address: string;
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
  } | null;
  campaigns: DashboardCampaign[];
  selectedCampaign: DashboardCampaign | null;
  selectedCampaignApplications: DashboardApplication[];
  recommendedApplications: DashboardApplication[];
};

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
  applications: DashboardApplication[];
  submissions: {
    id: string;
    contentUrl: string;
    reviewStatus: string;
    platform: string;
  }[];
  isAdmin: boolean;
};

export type CreatorDashboardData = {
  creator: {
    id: string;
    nickname: string;
    deadlineRate: number;
  } | null;
  applications: {
    id: string;
    campaignTitle: string;
    status: string;
    proposedContentType: string;
  }[];
  collaborations: {
    id: string;
    campaignTitle: string;
    campaignCoverImage: string;
    visitDate: string;
    submissionDue: string;
    status: string;
    hasSubmission: boolean;
  }[];
  submissions: {
    id: string;
    reviewStatus: string;
  }[];
};

export type CollaborationSubmissionDetail = {
  id: string;
  campaignTitle: string;
  submissionDue: string;
  status: string;
} | null;

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
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

function buildCampaignApplicationStats(applications: ApplicationSummaryRow[], collaborations: CollaborationSummaryRow[]) {
  const stats = new Map<string, CampaignApplicationStats>();

  applications.forEach((application) => {
    if (application.status === "cancelled") return;

    const current = stats.get(application.campaign_id) ?? { applicationCount: 0, recommendedCount: 0, selectedCount: 0 };
    current.applicationCount += 1;
    if (application.status === "recommended") current.recommendedCount += 1;
    stats.set(application.campaign_id, current);
  });

  collaborations.forEach((collaboration) => {
    if (collaboration.status === "cancelled") return;

    const current = stats.get(collaboration.campaign_id) ?? { applicationCount: 0, recommendedCount: 0, selectedCount: 0 };
    current.selectedCount += 1;
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
    selectedCount: stats?.selectedCount ?? 0
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

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_profiles?.business_name ?? undefined,
    title: row.title,
    description: row.description ?? "",
    campaignType: row.campaign_type === "shortform" ? "shortform" : row.campaign_type === "interview" ? "interview" : "visit",
    region: row.region,
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
    contentRequirements: asStringArray(row.content_requirements),
    usageRights: row.usage_rights ?? "",
    status: row.status,
    coverImage: row.cover_image_url ?? "https://storage.googleapis.com/uxpilot-auth.appspot.com/default-placeholder.png",
    referenceImages: Array.isArray(row.reference_image_urls) ? row.reference_image_urls.filter(Boolean) : [],
    beginnerFriendly: row.beginner_friendly,
    operatorRecommended: row.operator_recommended
  };
}

function mapStory(row: StoryRow): LocalStory {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? "",
    body: row.body ?? "",
    coverImage: row.cover_image_url ?? "https://storage.googleapis.com/uxpilot-auth.appspot.com/default-placeholder.png",
    businessId: row.business_id ?? "",
    creatorId: row.creator_id ?? "",
    campaignId: row.campaign_id ?? "",
    category: row.category ?? "로컬 스토리",
    publishedAt: row.published_at ?? ""
  };
}

async function syncExpiredCampaigns(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  await supabase.rpc("sync_expired_campaigns");
}

export async function getPublicCampaigns(): Promise<Campaign[]> {
  const supabase = await createSupabaseServerClient();
  await syncExpiredCampaigns(supabase);
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, business_profiles(business_name), campaign_applications(count)")
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
    .select("*, business_profiles(business_name), campaign_applications(count)")
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

export function getDisplayBusiness(id: string) {
  return getFallbackBusiness(id) ?? { businessName: "노원멤버스 파트너" };
}

export function getDisplayCreator(id: string) {
  return getFallbackCreator(id) ?? { nickname: "노원 크리에이터" };
}

export async function getBusinessDashboard(selectedCampaignId?: string): Promise<BusinessDashboardData> {
  const supabase = await createSupabaseServerClient();
  await syncExpiredCampaigns(supabase);
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return { business: null, campaigns: [], selectedCampaign: null, selectedCampaignApplications: [], recommendedApplications: [] };
  }

  const { data: business } = await supabase
    .from("business_profiles")
    .select("id,business_name,category,short_intro,description,address,district,contact,business_hours,website_url,social_urls,verification_status,is_public,cover_image_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) {
    return { business: null, campaigns: [], selectedCampaign: null, selectedCampaignApplications: [], recommendedApplications: [] };
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
      supabase.from("collaborations").select("id,campaign_id,status").in("campaign_id", campaignIds)
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

  return {
    business: {
      id: business.id,
      businessName: business.business_name,
      category: business.category,
      shortIntro: business.short_intro ?? "",
      description: business.description ?? "",
      address: business.address ?? "",
      district: business.district ?? "",
      contact: business.contact ?? "",
      businessHours: getBusinessHoursText(business.business_hours as BusinessHoursValue, "summary"),
      businessHoursPreset: getBusinessHoursText(business.business_hours as BusinessHoursValue, "preset"),
      businessHoursNote: getBusinessHoursText(business.business_hours as BusinessHoursValue, "note"),
      websiteUrl: business.website_url ?? "",
      socialUrls: Array.isArray(business.social_urls) ? business.social_urls.filter(Boolean) : [],
      verificationStatus: business.verification_status,
      isPublic: business.is_public,
      coverImage: business.cover_image_url ?? ""
    },
    campaigns,
    selectedCampaign,
    selectedCampaignApplications,
    recommendedApplications: selectedCampaignApplications.filter((application) => application.status === "recommended")
  };
}

export async function getAdminDashboard(selectedCampaignId?: string): Promise<AdminDashboardData> {
  const supabase = await createSupabaseServerClient();
  await syncExpiredCampaigns(supabase);
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return {
      stats: { businesses: 0, verifiedCreators: 0, recruitingCampaigns: 0, approvedSubmissions: 0, totalSubmissions: 0 },
      campaigns: [],
      selectedCampaign: null,
      selectedCampaignApplications: [],
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
    supabase.from("collaborations").select("id,campaign_id,status"),
    supabase
      .from("content_submissions")
      .select("id,content_url,review_status,platform")
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
    applications: selectedCampaignApplications,
    submissions: (submissionRows.data ?? []).map((submission) => ({
      id: submission.id,
      contentUrl: submission.content_url,
      reviewStatus: submission.review_status,
      platform: submission.platform
    })),
    isAdmin
  };
}

export async function getCreatorDashboard(): Promise<CreatorDashboardData> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return { creator: null, applications: [], collaborations: [], submissions: [] };
  }

  const { data: profile } = await supabase.from("profiles").select("nickname").eq("id", user.id).maybeSingle();
  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("id,deadline_rate")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!creator) {
    return { creator: null, applications: [], collaborations: [], submissions: [] };
  }

  const [applicationRows, collaborationRows, submissionRows] = await Promise.all([
    supabase
      .from("campaign_applications")
      .select("id,status,proposed_content_type,campaigns(title)")
      .eq("creator_id", creator.id)
      .order("applied_at", { ascending: false }),
    supabase
      .from("collaborations")
      .select("id,visit_date,submission_due,status,campaigns(title,cover_image_url),content_submissions(id)")
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
      deadlineRate: Number(creator.deadline_rate ?? 0)
    },
    applications: (applicationRows.data ?? []).map((application) => {
      const campaign = Array.isArray(application.campaigns) ? application.campaigns[0] : application.campaigns;
      return {
        id: application.id,
        campaignTitle: campaign?.title ?? "캠페인",
        status: application.status,
        proposedContentType: application.proposed_content_type ?? ""
      };
    }),
    collaborations: (collaborationRows.data ?? []).map((collaboration) => {
      const campaign = Array.isArray(collaboration.campaigns) ? collaboration.campaigns[0] : collaboration.campaigns;
      return {
        id: collaboration.id,
        campaignTitle: campaign?.title ?? "캠페인",
        campaignCoverImage: campaign?.cover_image_url ?? "https://storage.googleapis.com/uxpilot-auth.appspot.com/default-placeholder.png",
        visitDate: collaboration.visit_date ?? "미정",
        submissionDue: collaboration.submission_due ?? "미정",
        status: collaboration.status,
        hasSubmission: Boolean(collaboration.content_submissions?.length)
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
  const { data, error } = await supabase
    .from("collaborations")
    .select("id,submission_due,status,campaigns(title)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const campaign = Array.isArray(data.campaigns) ? data.campaigns[0] : data.campaigns;

  return {
    id: data.id,
    campaignTitle: campaign?.title ?? "캠페인",
    submissionDue: data.submission_due ?? "미정",
    status: data.status
  };
}
