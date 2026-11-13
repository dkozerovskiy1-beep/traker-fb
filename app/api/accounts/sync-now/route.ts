import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/app/lib/auth";
import { GET as runSync } from "@/app/api/cron/sync/route";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getLoggedInUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Delegate directly to the sync handler which supports user context
  return runSync(req);
}
