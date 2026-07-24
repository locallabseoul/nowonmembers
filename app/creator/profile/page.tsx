import { requireRole } from "@/lib/auth/guards";
import { normalizeKoreanAuthPhone } from "@/lib/auth/phone";
import { CreatorProfileWizard, type CreatorProfileInitialData } from "./creator-profile-wizard";

type Relation<T> = T | T[] | null | undefined;

type CreatorChannelRow = {
  platform: string | null;
  channel_name: string | null;
  channel_url: string | null;
  follower_count: number | null;
  average_views: number | null;
};

type PortfolioRow = {
  title: string | null;
  url: string | null;
};

type CreatorProfileRow = {
  id: string;
  activity_areas: string[] | null;
  interests: string[] | null;
  content_types: string[] | null;
  available_days: string[] | null;
  bio: string | null;
  avatar_url: string | null;
  creator_channels?: CreatorChannelRow[] | null;
  portfolios?: PortfolioRow[] | null;
};

function asRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? value[0] : value ?? null;
}

function asStringArray(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function getSafeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "";
  }

  return next;
}

export default async function CreatorProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const { error, message, next } = await searchParams;
  const safeNext = getSafeNext(next);
  const { supabase, user } = await requireRole("creator", "/creator/profile");
  const [{ data: profile }, { data: creator }] = await Promise.all([
    supabase.from("profiles").select("nickname,email,name,phone").eq("id", user.id).maybeSingle(),
    supabase
      .from("creator_profiles")
      .select(`
        id,
        activity_areas,
        interests,
        content_types,
        available_days,
        bio,
        avatar_url,
        creator_channels(platform,channel_name,channel_url,follower_count,average_views),
        portfolios(title,url)
      `)
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  const creatorProfile = creator as CreatorProfileRow | null;
  const channel = asRelation(creatorProfile?.creator_channels);
  const portfolio = asRelation(creatorProfile?.portfolios);
  const initialProfile: CreatorProfileInitialData = {
    id: creatorProfile?.id,
    nickname: profile?.nickname ?? user.email?.split("@")[0] ?? "",
    email: profile?.email ?? user.email ?? "",
    name: profile?.name ?? "",
    phone: profile?.phone ?? "",
    verification: {
      emailVerified: Boolean(user.email_confirmed_at),
      phoneVerified: Boolean(
        user.phone_confirmed_at
        && normalizeKoreanAuthPhone(user.phone) === normalizeKoreanAuthPhone(profile?.phone)
      )
    },
    activityAreas: asStringArray(creatorProfile?.activity_areas),
    interests: asStringArray(creatorProfile?.interests),
    contentTypes: asStringArray(creatorProfile?.content_types),
    availableDays: asStringArray(creatorProfile?.available_days),
    bio: creatorProfile?.bio ?? "",
    avatarUrl: creatorProfile?.avatar_url ?? "",
    channelPlatform: channel?.platform ?? "",
    channelName: channel?.channel_name ?? "",
    channelUrl: channel?.channel_url ?? "",
    followerCount: channel?.follower_count ? String(channel.follower_count) : "",
    averageViews: channel?.average_views ? String(channel.average_views) : "",
    portfolioTitle: portfolio?.title ?? "",
    portfolioUrl: portfolio?.url ?? ""
  };

  return (
    <main className="bg-[#F8F9FA]">
      <CreatorProfileWizard error={error} message={message} next={safeNext} initialProfile={initialProfile} />
    </main>
  );
}
