import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/app/lib/auth";
import { executeSync } from "@/app/lib/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // 1. Authorize cron request or logged-in user manual sync
  const user = await getLoggedInUser().catch(() => null);
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // In production, we compare the Bearer token or URL ?secret query parameter with our CRON_SECRET if not logged in.
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret");

  if (process.env.NODE_ENV === "production" && cronSecret && !user) {
    const isHeaderAuth = authHeader === `Bearer ${cronSecret}`;
    const isQueryAuth = querySecret === cronSecret;
    
    if (!isHeaderAuth && !isQueryAuth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const daysParam = searchParams.get("days");
    const daysToSync = daysParam ? parseInt(daysParam) : 3;
    const skipComments = searchParams.get("skipComments") === "true";

    const result = await executeSync({
      daysToSync,
      skipComments,
      userId: user?.id
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const POST = GET;
