import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { syncFacebookAccountByToken } from "@/app/lib/syncToken";

export async function POST(req: Request) {
  try {
    const { inviteId, accessToken } = await req.json();

    if (!inviteId || !accessToken) {
      return NextResponse.json({ success: false, error: "Missing inviteId or accessToken" }, { status: 400 });
    }

    // 1. Verify the invite link
    const invite = await db.inviteLink.findUnique({
      where: { id: inviteId },
      include: { user: true }
    });

    if (!invite) {
      return NextResponse.json({ success: false, error: "Invalid invite link" }, { status: 400 });
    }

    if (invite.isOneTime && invite.usedAt) {
      return NextResponse.json({ success: false, error: "This invite link has already been used" }, { status: 400 });
    }

    // 2. Synchronize using the token sync helper
    const fbProfileId = await syncFacebookAccountByToken(accessToken, invite.userId);

    // 3. Mark the invite link as used
    await db.inviteLink.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
        usedByFbId: fbProfileId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Submit token for invite error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to connect Facebook account" },
      { status: 500 }
    );
  }
}
