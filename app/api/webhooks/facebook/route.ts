import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { moderateFacebookComment } from "@/app/lib/facebook";

// GET handler is used for Facebook Webhook verification
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.FB_WEBHOOK_VERIFY_TOKEN || "my_secure_webhook_verify_token";

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      console.log("Facebook webhook verified successfully!");
      return new Response(challenge, { status: 200 });
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }
  return new Response("Bad Request", { status: 400 });
}

// POST handler receives the webhook payload from Facebook
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Facebook Webhook received:", JSON.stringify(body, null, 2));

    // Make sure it's a page event
    if (body.object !== "page") {
      return NextResponse.json({ success: true, message: "Ignored non-page object" });
    }

    // Process all entries in the webhook payload
    for (const entry of body.entry || []) {
      const pageId = entry.id;

      // Fetch the page token from our DB to authorize Graph API requests
      const page = await db.fbPage.findUnique({
        where: { id: pageId },
        include: { socialAccount: true }
      });

      if (!page) {
        console.warn(`Page with ID ${pageId} not found in DB. Skipping webhook.`);
        continue;
      }

      for (const change of entry.changes || []) {
        // We only care about page feed changes related to comments
        if (change.field !== "feed") continue;

        const value = change.value;
        if (!value) continue;

        const item = value.item; // "comment" or "status" or "share"
        const verb = value.verb; // "add", "edited", "remove"

        if (item === "comment" && (verb === "add" || verb === "edited")) {
          const commentId = value.comment_id;
          const commentText = value.message || "";
          const postId = value.post_id;
          const authorName = value.sender_name || "Unknown User";
          const authorFbId = value.from?.id;

          // Don't moderate comments created by the page itself to prevent infinite loop
          if (authorFbId === pageId) continue;

          // Fetch active moderation rules for this Page OR global rules (pageId is null) owned by the page's owner user
          const activeRules = await db.moderationRule.findMany({
            where: {
              isActive: true,
              userId: page.socialAccount.userId,
              OR: [
                { pageId },
                { pageId: null }
              ]
            }
          });

          for (const rule of activeRules) {
            let matchesRule = false;

            if (rule.type === "STOP_WORDS") {
              const stopWords = rule.keywords.split(",").map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
              const lowerComment = commentText.toLowerCase();
              matchesRule = stopWords.some(word => lowerComment.includes(word));
            } else if (rule.type === "LINKS") {
              const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
              matchesRule = linkRegex.test(commentText);
            } else if (rule.type === "TELEGRAM") {
              // Matches telegram link formats or handles with "@"
              const tgRegex = /(t\.me|telegram\.me|@[\w_]{5,})/gi;
              matchesRule = tgRegex.test(commentText);
            } else if (rule.type === "HIDE_ALL") {
              matchesRule = true;
            }

            if (matchesRule) {
              console.log(`[MODERATION TRIGGERED] Comment "${commentText}" matches rule: ${rule.name}. Action: ${rule.action}`);

              // Call Facebook Graph API to hide or delete the comment
              const result = await moderateFacebookComment(commentId, rule.action as "HIDE" | "DELETE", page.accessToken);

              if (result.success) {
                // Log the moderation event in the DB
                await db.moderationLog.create({
                  data: {
                    pageId,
                    postId,
                    commentId,
                    commentText,
                    authorName,
                    actionTaken: rule.action === "HIDE" ? "HIDDEN" : "DELETED",
                    ruleMatched: rule.name
                  }
                });
                
                // Stop checking other rules once one matches and comment is moderated
                break;
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
