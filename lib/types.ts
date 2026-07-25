export type UserRole = "business" | "creator" | "resident" | "admin";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type CampaignStatus =
  | "draft"
  | "in_review"
  | "revision_requested"
  | "approved"
  | "scheduled"
  | "recruiting"
  | "selecting"
  | "in_progress"
  | "submission_review"
  | "completed"
  | "cancelled"
  | "failed";
export type ApplicationStatus = "submitted" | "recommended" | "selected" | "rejected" | "cancelled";
export type CollaborationStatus =
  | "selected"
  | "visit_scheduled"
  | "visited"
  | "submitted"
  | "revision_requested"
  | "approved"
  | "completed"
  | "no_show"
  | "cancelled";
export type SubmissionStatus = "submitted" | "needs_revision" | "approved" | "rejected";
export type NoticeStatus = "draft" | "published";

export type BusinessProfile = {
  id: string;
  businessName: string;
  category: string;
  shortIntro: string;
  description: string;
  address: string;
  addressDetail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  district: string;
  contact: string;
  businessHours: string;
  websiteUrl?: string;
  socialUrls: string[];
  verificationStatus: VerificationStatus;
  coverImage: string;
};

export type CreatorProfile = {
  id: string;
  nickname: string;
  bio: string;
  activityAreas: string[];
  interests: string[];
  contentTypes: string[];
  availableDays: string[];
  verificationStatus: VerificationStatus;
  avatarUrl: string;
  completionRate: number;
  deadlineRate: number;
};

export type Campaign = {
  id: string;
  businessId: string;
  businessName?: string;
  businessCategory?: string;
  businessHours?: string;
  businessCoverImage?: string;
  businessAddress?: string;
  businessAddressDetail?: string | null;
  title: string;
  description: string;
  campaignType: "visit" | "shortform" | "interview";
  region: string;
  regionDetail?: string | null;
  latitude?: number;
  longitude?: number;
  category: string;
  recruitCount: number;
  appliedCount: number;
  recruitStart: string;
  recruitEnd: string;
  selectionDate: string;
  visitStart: string;
  visitEnd: string;
  submissionDue: string;
  benefitType: string;
  benefitValue: string;
  fee?: string;
  contentRequirements: string[];
  requiredKeywords: string[];
  usageRights: string;
  status: CampaignStatus;
  coverImage: string;
  referenceImages: string[];
  beginnerFriendly: boolean;
  operatorRecommended: boolean;
};

export type CampaignApplication = {
  id: string;
  campaignId: string;
  creatorId: string;
  message: string;
  availableDates: string;
  proposedContentType: string;
  status: ApplicationStatus;
  adminMemo?: string;
};

export type Collaboration = {
  id: string;
  campaignId: string;
  creatorId: string;
  visitDate: string;
  submissionDue: string;
  status: CollaborationStatus;
};

export type ContentSubmission = {
  id: string;
  collaborationId: string;
  platform: string;
  contentUrl: string;
  publishedAt: string;
  previewImage: string;
  disclosureConfirmed: boolean;
  reviewStatus: SubmissionStatus;
};

export type LocalStory = {
  id: string;
  title: string;
  summary: string;
  body: string;
  contentUrl?: string;
  coverImage: string;
  businessId: string;
  creatorId: string;
  campaignId: string;
  category: string;
  publishedAt: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  status: NoticeStatus;
  isPinned: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  isRead?: boolean;
};
