import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MinihomeLink = {
  id: string;
  businessId: string;
  title: string;
  url: string;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type MinihomeLinkRow = {
  id: string;
  business_id: string;
  title: string;
  url: string;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const minihomeLinkSelect = "id,business_id,title,url,is_visible,sort_order,created_at,updated_at";

function mapMinihomeLink(row: MinihomeLinkRow): MinihomeLink {
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    url: row.url,
    isVisible: row.is_visible,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getPublicMinihomeLinks(businessId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("business_minihome_links")
    .select(minihomeLinkSelect)
    .eq("business_id", businessId)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return ((data ?? []) as MinihomeLinkRow[]).map(mapMinihomeLink);
}

export async function getBusinessMinihomeLinks(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: business } = await supabase.from("business_profiles").select("id").eq("user_id", userId).maybeSingle();
  if (!business) return [];
  const { data } = await supabase
    .from("business_minihome_links")
    .select(minihomeLinkSelect)
    .eq("business_id", business.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return ((data ?? []) as MinihomeLinkRow[]).map(mapMinihomeLink);
}
