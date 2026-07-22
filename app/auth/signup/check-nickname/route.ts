import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createAnonSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("value")?.trim() ?? "";

  if (value.length < 2) {
    return NextResponse.json({
      available: false,
      message: "닉네임/상호는 2자 이상 입력해주세요."
    });
  }

  const supabase = createAnonSupabaseClient();
  const { data, error } = await supabase.rpc("is_signup_nickname_available", {
    target_nickname: value
  });

  if (error) {
    return NextResponse.json({
      available: false,
      message: "닉네임 중복 확인 중 오류가 발생했습니다."
    }, { status: 500 });
  }

  return NextResponse.json({
    available: Boolean(data),
    message: data ? "사용 가능한 닉네임입니다." : "이미 사용 중인 닉네임입니다."
  });
}
