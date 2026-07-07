import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, pageId, type, keywords, action } = body;

    if (!name || !pageId || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (name, pageId, type)" },
        { status: 400 }
      );
    }

    const rule = await db.moderationRule.create({
      data: {
        name,
        pageId,
        type,
        keywords: keywords || "",
        action: action || "HIDE"
      }
    });

    return NextResponse.json({ success: true, rule });
  } catch (error: any) {
    console.error("Error creating moderation rule:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
