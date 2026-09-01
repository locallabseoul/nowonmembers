import assert from "node:assert/strict";
import test from "node:test";
import { preparePublicCouponBook, sortPublicCampaigns } from "../lib/public-list-order.ts";

function campaign(id, status, dates = {}, appliedCount = 0) {
  return {
    id,
    status,
    recruitStart: dates.recruitStart ?? "2026-08-01",
    recruitEnd: dates.recruitEnd ?? "2026-08-31",
    selectionDate: dates.selectionDate ?? "2026-09-02",
    submissionDue: dates.submissionDue ?? "2026-09-10",
    appliedCount
  };
}

test("캠페인은 선택한 정렬과 무관하게 진행 가능한 상태가 종료 상태보다 먼저다", () => {
  const items = [
    campaign("closed", "completed", { recruitStart: "2026-08-30", recruitEnd: "2026-08-31" }, 100),
    campaign("progress", "in_progress"),
    campaign("selecting", "selecting"),
    campaign("recruiting", "recruiting", {}, 1)
  ];

  for (const sort of ["deadline", "popular", "newest"]) {
    assert.deepEqual(sortPublicCampaigns(items, sort).map((item) => item.id), ["recruiting", "selecting", "progress", "closed"]);
  }
});

test("모집중 캠페인은 마감임박순, 종료 캠페인은 최근 마감순이다", () => {
  const items = [
    campaign("recruit-later", "recruiting", { recruitEnd: "2026-09-20" }),
    campaign("closed-old", "completed", { recruitEnd: "2026-07-01" }),
    campaign("recruit-soon", "recruiting", { recruitEnd: "2026-09-05" }),
    campaign("closed-new", "failed", { recruitEnd: "2026-08-20" })
  ];

  assert.deepEqual(sortPublicCampaigns(items).map((item) => item.id), ["recruit-soon", "recruit-later", "closed-new", "closed-old"]);
});

test("쿠폰북은 종료·소진 쿠폰을 숨기고 사용 가능한 순서로 정렬한다", () => {
  const items = [
    { id: "expired", displayStatus: "expired", startDate: "2026-07-01", endDate: "2026-07-31", createdAt: "2026-07-01" },
    { id: "scheduled", displayStatus: "scheduled", startDate: "2026-09-03", endDate: "2026-09-30", createdAt: "2026-08-30" },
    { id: "claim-later", displayStatus: "claiming", startDate: "2026-08-01", endDate: "2026-09-20", createdAt: "2026-08-01" },
    { id: "sold-out", displayStatus: "claim_closed", startDate: "2026-08-01", endDate: "2026-09-20", createdAt: "2026-08-01" },
    { id: "setup", displayStatus: "setup_pending", startDate: "2026-08-01", endDate: "2026-09-30", createdAt: "2026-08-31" },
    { id: "claim-soon", displayStatus: "claiming", startDate: "2026-08-01", endDate: "2026-09-05", createdAt: "2026-08-01" }
  ];

  const result = preparePublicCouponBook(items, (item) => item.displayStatus);
  assert.deepEqual(result.map((item) => item.id), ["claim-soon", "claim-later", "scheduled", "setup"]);
});
