import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// 배포 서버는 UTC로 돌아간다. 날짜를 찍을 때 시간대를 지정하지 않으면 한국 사용자에게
// 9시간 어긋난 시각이 보인다. 실제로 자정에 가입한 회원이 오후 3시로 표시된 적이 있다.
function collectFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, found);
    else if (/\.tsx?$/.test(entry)) found.push(full);
  }

  return found;
}

test("모든 날짜 포맷은 한국 시간대를 지정한다", () => {
  const offenders = [];

  for (const file of [...collectFiles("app"), ...collectFiles("lib")]) {
    const source = readFileSync(file, "utf8");
    let index = 0;

    while (true) {
      const start = source.indexOf("new Intl.DateTimeFormat(", index);
      if (start === -1) break;

      const close = source.indexOf("})", start);
      const block = source.slice(start, close);
      // 시각을 다루지 않고 날짜만 쓰는 경우도 서버 기준이면 하루가 밀린다.
      if (!block.includes("timeZone")) {
        offenders.push(`${file}:${source.slice(0, start).split("\n").length}`);
      }

      index = start + 1;
    }
  }

  assert.deepEqual(offenders, [], `시간대가 빠진 곳:\n${offenders.join("\n")}`);
});
