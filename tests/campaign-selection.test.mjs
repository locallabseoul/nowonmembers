import assert from "node:assert/strict";
import test from "node:test";
import { addDaysToDate, getCampaignSelectionPeriod, isCampaignSelectionOverdue } from "../lib/campaign-lifecycle.ts";

// 선정 기간은 컬럼이 없다. 모집 마감 다음 날부터 선정 발표일까지로 계산해서 쓴다.
// 이 계산이 어긋나면 크리에이터에게 약속한 발표일과 운영자가 보는 마감이 달라진다.

test("선정 기간은 모집 마감 다음 날부터 발표일까지다", () => {
  const period = getCampaignSelectionPeriod(
    { status: "selecting", recruitEnd: "2026-08-18", selectionDate: "2026-08-20" },
    "2026-08-19"
  );

  assert.equal(period.start, "2026-08-19");
  assert.equal(period.end, "2026-08-20");
  assert.equal(period.label, "D-1");
  assert.equal(period.overdueDays, 0);
});

test("기존 캠페인의 발표일이 비어 있으면 지연으로 간주하지 않는다", () => {
  const period = getCampaignSelectionPeriod(
    { status: "selecting", recruitEnd: "2026-08-18", selectionDate: "" },
    "2026-08-23"
  );

  assert.equal(period.start, "");
  assert.equal(period.end, "");
  assert.equal(period.label, "발표일 미정");
  assert.equal(period.overdueDays, 0);
});

test("발표일이 지나면 지연 일수를 센다", () => {
  const period = getCampaignSelectionPeriod(
    { status: "selecting", recruitEnd: "2026-08-18", selectionDate: "2026-08-20" },
    "2026-08-23"
  );

  assert.equal(period.overdueDays, 3);
  assert.equal(period.label, "선정 지연 3일");
});

test("선정중이 아니면 발표일이 지나도 지연으로 보지 않는다", () => {
  const past = { recruitEnd: "2026-08-18", selectionDate: "2026-08-20" };

  assert.equal(isCampaignSelectionOverdue({ ...past, status: "selecting" }, "2026-08-23"), true);
  assert.equal(isCampaignSelectionOverdue({ ...past, status: "in_progress" }, "2026-08-23"), false);
  assert.equal(isCampaignSelectionOverdue({ ...past, status: "recruiting" }, "2026-08-23"), false);
});

test("날짜가 없으면 발표일 미정으로 둔다", () => {
  const period = getCampaignSelectionPeriod({ status: "selecting", recruitEnd: "", selectionDate: "" }, "2026-08-23");

  assert.equal(period.label, "발표일 미정");
  assert.equal(period.remainingDays, null);
  assert.equal(period.overdueDays, 0);
});

test("날짜 더하기는 한국 시간대 기준으로 월을 넘긴다", () => {
  assert.equal(addDaysToDate("2026-08-31", 1), "2026-09-01");
  assert.equal(addDaysToDate("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysToDate("", 1), "");
});
