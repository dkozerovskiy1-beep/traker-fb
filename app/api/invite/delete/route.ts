import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getLoggedInUser } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing invite link ID" }, { status: 400 });
    }

    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the invite link to check ownership
    const invite = await db.inviteLink.findUnique({
      where: { id }
    });

    if (!invite) {
      return NextResponse.json({ success: false, error: "Invite link not found" }, { status: 404 });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@tracker.com";
    if (invite.userId !== user.id && user.email !== adminEmail) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Delete the invite link from DB
    await db.inviteLink.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting invite link:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to delete invite link" }, { status: 500 });
  }
}
