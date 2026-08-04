// 홍보 개시 전 테스트 활동 데이터 초기화 (2026-08-05).
//
// 지우는 것: 캠페인·지원·협업·제출·리뷰·알림·로컬스토리·포인트 전체(지갑/로트/
//   원장/주문/환불/예약/배분), 캠페인·제출 이미지.
// 남기는 것: 계정 3개(프로필·채널·포트폴리오·아바타·가게 이미지), 공지 2건.
//
// 실행 전 반드시 백업이 있어야 한다:
//   nowonmembers-backup-2026-08-05.json (스크립트가 존재 여부를 확인한다)
//
// 사용법: node scripts/reset-test-data.mjs --yes

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

if (!process.argv.includes("--yes")) {
  console.error("이 스크립트는 테스트 데이터를 영구 삭제합니다. 실행하려면 --yes 를 붙여주세요.");
  process.exit(1);
}

const BACKUP_PATH = "/Volumes/DevSSD/StudioProjects/nowonmembers-backup-2026-08-05.json";
if (!existsSync(BACKUP_PATH)) {
  console.error(`백업 파일이 없습니다: ${BACKUP_PATH} — 먼저 백업을 만들어주세요.`);
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()])
);
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const NIL = "00000000-0000-0000-0000-000000000000";
// 외래키 의존 순서. 원장 → 배분 → 예약 → 로트 → 주문 → 지갑 순으로 풀어야
// on delete restrict 에 걸리지 않는다.
const wipeOrder = [
  ["notifications", "id"],
  ["reviews", "id"],
  ["content_submissions", "id"],
  ["collaborations", "id"],
  ["campaign_applications", "id"],
  ["point_ledger", "id"],
  ["campaign_point_allocations", "reservation_campaign_id"],
  ["campaign_point_reservations", "campaign_id"],
  ["point_refund_requests", "id"],
  ["point_lots", "id"],
  ["point_payment_orders", "id"],
  ["point_wallets", "business_id"],
  ["local_stories", "id"],
  ["campaigns", "id"]
];

for (const [table, pk] of wipeOrder) {
  const { error, count } = await svc.from(table).delete({ count: "exact" }).neq(pk, NIL);
  if (error) {
    console.error(`삭제 실패 ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`${table.padEnd(30)} ${count}행 삭제`);
}

// 협업 기록이 사라졌으니 크리에이터 지표도 0으로.
await svc.from("creator_profiles").update({ deadline_rate: 0, completion_rate: 0 }).neq("id", NIL);
console.log("creator_profiles 지표 초기화");

// 캠페인·제출 이미지만 삭제. 가게 커버·아바타는 계정과 함께 유지.
for (const bucket of ["campaign-images", "submission-images"]) {
  const { data: dirs } = await svc.storage.from(bucket).list("", { limit: 100 });
  let removed = 0;
  for (const dir of dirs ?? []) {
    const { data: files } = await svc.storage.from(bucket).list(dir.name, { limit: 1000 });
    const paths = (files ?? []).map((file) => `${dir.name}/${file.name}`);
    if (paths.length) {
      const { error } = await svc.storage.from(bucket).remove(paths);
      if (error) console.error(`  ${bucket}/${dir.name}: ${error.message}`);
      else removed += paths.length;
    }
  }
  console.log(`${bucket.padEnd(30)} 파일 ${removed}개 삭제`);
}

console.log("\n──── 남은 데이터");
const remainTables = ["profiles", "business_profiles", "creator_profiles", "creator_channels", "portfolios", "notices", "campaigns", "point_wallets", "point_ledger", "local_stories"];
for (const table of remainTables) {
  const { count } = await svc.from(table).select("*", { count: "exact", head: true });
  console.log(` ${table.padEnd(28)} ${count ?? 0}`);
}
console.log("\n완료. 지갑은 다음 방문 때 0P로 다시 생성됩니다. 필요하면 /admin/points 보정으로 지급하세요.");
