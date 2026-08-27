import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BusinessProduct = {
  id: string;
  businessId: string;
  name: string;
  shortDescription: string;
  price: number;
  imageUrl: string;
  imagePath: string;
  linkUrl: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProductRow = {
  id: string;
  business_id: string;
  name: string;
  short_description: string;
  price: number;
  image_url: string;
  image_path: string;
  link_url: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

const productSelect = "id,business_id,name,short_description,price,image_url,image_path,link_url,is_visible,created_at,updated_at";

function mapProduct(row: ProductRow): BusinessProduct {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    shortDescription: row.short_description,
    price: Number(row.price),
    imageUrl: row.image_url,
    imagePath: row.image_path,
    linkUrl: row.link_url,
    isVisible: Boolean(row.is_visible),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function formatProductPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

export async function getPublicProductsByBusinessId(businessId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("business_products")
    .select(productSelect)
    .eq("business_id", businessId)
    .eq("is_visible", true)
    .order("created_at", { ascending: false });
  return ((data ?? []) as ProductRow[]).map(mapProduct);
}

export async function getBusinessProducts(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: business } = await supabase.from("business_profiles").select("id").eq("user_id", userId).maybeSingle();
  if (!business) return [];
  const { data } = await supabase
    .from("business_products")
    .select(productSelect)
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });
  return ((data ?? []) as ProductRow[]).map(mapProduct);
}

export async function getBusinessProduct(userId: string, productId: string) {
  const products = await getBusinessProducts(userId);
  return products.find((product) => product.id === productId) ?? null;
}
