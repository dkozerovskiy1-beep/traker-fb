import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing invite link ID" }, { status: 400 });
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
