import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/app/lib/auth";
import { GET as runSync } from "@/app/api/cron/sync/route";

export async function POST(req: Request) {
  const user = await getLoggedInUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Delegate directly to the sync handler which supports user context
  return runSync(req);
}
