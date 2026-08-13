import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBusinessSlugError, normalizeBusinessSlug } from "@/lib/business-slug";

export async function GET(request: Request) {
  const slug = normalizeBusinessSlug(new URL(request.url).searchParams.get("slug") ?? "");
  const validationError = getBusinessSlugError(slug);
  if (validationError) return NextResponse.json({ available: false, error: validationError }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ available: false, error: "로그인이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase.rpc("is_business_slug_available", { target_slug: slug });
  if (error) return NextResponse.json({ available: false, error: "주소 중복 확인에 실패했습니다." }, { status: 500 });
  return NextResponse.json({ available: Boolean(data) });
}
