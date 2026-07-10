import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getLoggedInUser } from "@/app/lib/auth";
import { moderateFacebookComment } from "@/app/lib/facebook";

export async function POST(req: Request) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { fbCommentId, action } = await req.json();

    if (!fbCommentId || !action) {
      return NextResponse.json({ success: false, error: "Missing fbCommentId or action" }, { status: 400 });
    }

    if (action !== "HIDE" && action !== "DELETE") {
      return NextResponse.json({ success: false, error: "Invalid action. Must be HIDE or DELETE" }, { status: 400 });
    }

    // Find the comment in DB and verify user ownership of the Page
    const comment = await db.fbComment.findFirst({
      where: { 
        fbCommentId,
        page: { socialAccount: { userId: user.id } }
      },
      include: {
        page: { select: { id: true, name: true, accessToken: true } }
      }
    });

    if (!comment) {
      return NextResponse.json({ success: false, error: "Коментар не знайдено або у вас немає доступу" }, { status: 403 });
    }

    // Call Facebook API to moderate
    const result = await moderateFacebookComment(fbCommentId, action, comment.page.accessToken);

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error || "Failed to moderate comment via Facebook API" 
      }, { status: 500 });
    }

    // Update comment status in DB
    await db.fbComment.update({
      where: { fbCommentId },
      data: {
        status: action === "HIDE" ? "HIDDEN" : "DELETED",
        isHidden: true
      }
    });

    // Create moderation log
    await db.moderationLog.create({
      data: {
        pageId: comment.pageId,
        postId: comment.postId,
        commentId: fbCommentId,
        commentText: comment.message,
        authorName: comment.authorName,
        actionTaken: action === "HIDE" ? "HIDDEN" : "DELETED",
        ruleMatched: null // manual moderation
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Comment moderation error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
