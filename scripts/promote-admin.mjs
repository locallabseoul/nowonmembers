// 최초 관리자 계정을 만드는 스크립트. 가입은 business/creator만 허용되므로,
// 먼저 일반 가입을 마친 계정을 여기서 승격한다. 이후 관리자는 /admin/members
// 화면에서 승격하면 되고, 이 스크립트는 관리자가 아무도 없을 때만 필요하다.
//
// 사용법: npm run promote-admin -- user@example.com

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const email = process.argv[2]?.trim();

if (!email || !email.includes("@")) {
  console.error("사용법: npm run promote-admin -- user@example.com");
  process.exit(1);
}

let envText;
try {
  envText = readFileSync(".env.local", "utf8");
} catch {
  console.error(".env.local을 찾을 수 없습니다. 프로젝트 루트에서 실행해주세요.");
  process.exit(1);
}

const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()])
);

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(".env.local에 NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: profile, error } = await supabase
  .from("profiles")
  .select("id,email,nickname,role,status,is_admin")
  .eq("email", email)
  .maybeSingle();

if (error) {
  console.error("조회에 실패했습니다:", error.message);
  process.exit(1);
}

if (!profile) {
  console.error(`'${email}' 계정을 찾을 수 없습니다. 먼저 사이트에서 회원가입을 마쳐주세요.`);
  process.exit(1);
}

console.log(`대상: ${profile.nickname ?? "(닉네임 없음)"} <${profile.email}> — 역할 ${profile.role}, 상태 ${profile.status}, 관리자 ${profile.is_admin ? "예" : "아니오"}`);

if (profile.is_admin && profile.status === "active") {
  console.log("이미 활성 관리자입니다. 변경할 것이 없습니다.");
  process.exit(0);
}

// 역할은 그대로 둔다. 관리자는 크리에이터/가게 계정에 붙는 플래그다.
const { error: updateError } = await supabase
  .from("profiles")
  .update({ is_admin: true, status: "active", updated_at: new Date().toISOString() })
  .eq("id", profile.id);

if (updateError) {
  console.error("승격에 실패했습니다:", updateError.message);
  process.exit(1);
}

console.log(`완료: ${profile.email} 계정이 관리자가 되었습니다. 로그인 후 /admin에서 확인하세요.`);
