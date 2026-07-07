import { NextResponse } from "next/server";
import { syncFacebookAccountByToken } from "@/app/lib/syncToken";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ success: false, error: "Access token is required" }, { status: 400 });
    }

    // For simplicity, we find the first admin user in the system to attach the social account to.
    const user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ success: false, error: "No user found in database to link the account" }, { status: 400 });
    }

    // Synchronize the profile, ad accounts, and pages using the helper
    const fbProfileId = await syncFacebookAccountByToken(accessToken, user.id);

    return NextResponse.json({ success: true, fbProfileId });
  } catch (error: any) {
    console.error("Connect via token error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to connect Facebook account via token" },
      { status: 500 }
    );
  }
}
