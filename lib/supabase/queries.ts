import { campaigns as fallbackCampaigns, stories as fallbackStories, getBusiness as getFallbackBusiness, getCampaign as getFallbackCampaign, getCreator as getFallbackCreator } from "@/lib/data";
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

export type BusinessDashboardData = {
  business: {
    id: string;
    businessName: string;
    category: string;
    shortIntro: string;
    verificationStatus: string;
    isPublic: boolean;
  } | null;
  campaigns: Campaign[];
  recommendedApplications: {
    id: string;
    message: string;
    proposedContentType: string;
    adminMemo: string;
    status: string;
  }[];
};

export type AdminDashboardData = {
  stats: {
    businesses: number;
    verifiedCreators: number;
    recruitingCampaigns: number;
    approvedSubmissions: number;
    totalSubmissions: number;
  };
  campaigns: Campaign[];
  applications: {
    id: string;
    campaignTitle: string;
    message: string;
    proposedContentType: string;
    status: string;
    adminMemo: string;
  }[];
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

export async function getPublicCampaigns(): Promise<Campaign[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, business_profiles(business_name), campaign_applications(count)")
    .in("status", ["recruiting", "selecting", "completed"])
    .order("recruit_end", { ascending: true });

  if (error || !data?.length) return fallbackCampaigns;
  return (data as CampaignRow[]).map(mapCampaign);
}

export async function getPublicCampaign(id: string): Promise<Campaign | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, business_profiles(business_name), campaign_applications(count)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return getFallbackCampaign(id);
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

export async function getBusinessDashboard(): Promise<BusinessDashboardData> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return { business: null, campaigns: [], recommendedApplications: [] };
  }

  const { data: business } = await supabase
    .from("business_profiles")
    .select("id,business_name,category,short_intro,verification_status,is_public")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) {
    return { business: null, campaigns: [], recommendedApplications: [] };
  }

  const { data: campaignRows } = await supabase
    .from("campaigns")
    .select("*, business_profiles(business_name), campaign_applications(count)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const campaignIds = (campaignRows ?? []).map((campaign) => campaign.id);
  const { data: applicationRows } = campaignIds.length
    ? await supabase
      .from("campaign_applications")
      .select("id,message,proposed_content_type,status,admin_memo")
      .in("campaign_id", campaignIds)
      .eq("status", "recommended")
    : { data: [] };

  return {
    business: {
      id: business.id,
      businessName: business.business_name,
      category: business.category,
      shortIntro: business.short_intro ?? "",
      verificationStatus: business.verification_status,
      isPublic: business.is_public
    },
    campaigns: ((campaignRows ?? []) as CampaignRow[]).map(mapCampaign),
    recommendedApplications: (applicationRows ?? []).map((application) => ({
      id: application.id,
      message: application.message ?? "",
      proposedContentType: application.proposed_content_type ?? "",
      adminMemo: application.admin_memo ?? "",
      status: application.status
    }))
  };
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return {
      stats: { businesses: 0, verifiedCreators: 0, recruitingCampaigns: 0, approvedSubmissions: 0, totalSubmissions: 0 },
      campaigns: [],
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
    applicationRows,
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
      .in("status", ["in_review", "revision_requested", "recruiting", "selecting"])
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_applications")
      .select("id,message,proposed_content_type,status,admin_memo,campaigns(title)")
      .in("status", ["submitted", "recommended", "selected"])
      .order("applied_at", { ascending: false }),
    supabase
      .from("content_submissions")
      .select("id,content_url,review_status,platform")
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  return {
    stats: {
      businesses: businessCount.count ?? 0,
      verifiedCreators: creatorCount.count ?? 0,
      recruitingCampaigns: recruitingCount.count ?? 0,
      approvedSubmissions: approvedSubmissionCount.count ?? 0,
      totalSubmissions: totalSubmissionCount.count ?? 0
    },
    campaigns: ((campaignRows.data ?? []) as CampaignRow[]).map(mapCampaign),
    applications: (applicationRows.data ?? []).map((application) => {
      const campaign = Array.isArray(application.campaigns) ? application.campaigns[0] : application.campaigns;
      return {
        id: application.id,
        campaignTitle: campaign?.title ?? "캠페인",
        message: application.message ?? "",
        proposedContentType: application.proposed_content_type ?? "",
        status: application.status,
        adminMemo: application.admin_memo ?? ""
      };
    }),
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
