import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getLoggedInUser } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { description, isOneTime } = body;

    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const invite = await db.inviteLink.create({
      data: {
        description: description || "Client Invite",
        isOneTime: isOneTime !== false, // default to true
        userId: user.id
      }
    });

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const inviteUrl = `${protocol}://${host}/invite/${invite.id}`;

    return NextResponse.json({
      success: true,
      inviteId: invite.id,
      inviteUrl,
      description: invite.description,
      isOneTime: invite.isOneTime
    });
  } catch (error: any) {
    console.error("Error creating invite link:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
