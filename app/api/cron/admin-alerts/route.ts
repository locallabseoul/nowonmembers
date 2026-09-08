import { NextResponse } from "next/server";
import { runAdminAlertCycle } from "@/lib/admin-alerts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAdminAlertCycle();
    return NextResponse.json(result, { status: result.failures.length ? 502 : 200 });
  } catch (error) {
    console.error("Admin alert cycle failed", error);
    return NextResponse.json({ error: "Admin alert cycle failed" }, { status: 500 });
  }
}
