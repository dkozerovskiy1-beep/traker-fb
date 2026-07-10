import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getLoggedInUser } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, pageId, type, keywords, action } = body;

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (name, type)" },
        { status: 400 }
      );
    }

    // Verify if page belongs to user if pageId is specified
    const targetPageId = pageId && pageId !== "ALL" ? pageId : null;
    if (targetPageId) {
      const page = await db.fbPage.findFirst({
        where: {
          id: targetPageId,
          socialAccount: { userId: user.id }
        }
      });

      if (!page) {
        return NextResponse.json(
          { success: false, error: "Сторінка не знайдена або не належить вашому акаунту" },
          { status: 403 }
        );
      }
    }

    const rule = await db.moderationRule.create({
      data: {
        name,
        pageId: targetPageId,
        userId: user.id,
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
