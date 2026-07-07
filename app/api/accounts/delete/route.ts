import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing social account ID" }, { status: 400 });
    }

    // Delete the social account (cascades to ad accounts, pages, insights, rules, logs)
    await db.fbSocialAccount.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error disconnecting Facebook account:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to disconnect account" }, { status: 500 });
  }
}
