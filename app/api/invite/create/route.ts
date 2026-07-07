import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { description, isOneTime } = body;

    // For simplicity, we assign the link to the first user in the DB.
    // If no users exist, we create a default admin user first.
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: {
          email: process.env.ADMIN_EMAIL || "admin@tracker.com",
          password: process.env.ADMIN_PASSWORD || "admin",
          name: "Admin"
        }
      });
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
