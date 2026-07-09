import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getLoggedInUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint to test page comment retrieval.
 * Call: GET /api/test-comments
 */
export async function GET() {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch all business pages stored in the DB
    const pages = await db.fbPage.findMany({
      include: {
        socialAccount: {
          select: { name: true }
        }
      }
    });

    if (pages.length === 0) {
      return NextResponse.json({
        success: false,
        error: "У вашій базі даних немає підключених бізнес-сторінок. Спочатку підключіть хоча б один Facebook-акаунт, який володіє сторінками."
      });
    }

    const report: any[] = [];

    // 2. Test fetching for each page
    for (const page of pages) {
      const pageReport: any = {
        pageName: page.name,
        pageId: page.id,
        socialProfile: page.socialAccount.name,
        hasAccessToken: !!page.accessToken,
        postsFound: 0,
        commentsFound: 0,
        errors: []
      };

      try {
        // Fetch promotable posts (includes unpublished ad dark posts)
        const postsUrl = `https://graph.facebook.com/v21.0/${page.id}/promotable_posts?fields=id,created_time,message&limit=15&access_token=${page.accessToken}`;
        const postsRes = await fetch(postsUrl);
        
        if (!postsRes.ok) {
          const errData = await postsRes.json().catch(() => ({}));
          pageReport.errors.push({
            step: "Fetch Posts",
            status: postsRes.status,
            message: errData.error?.message || "Unknown error"
          });
        } else {
          const postsData = await postsRes.json();
          const posts = postsData.data || [];
          pageReport.postsFound = posts.length;
          pageReport.recentPosts = posts.map((p: any) => ({
            id: p.id,
            message: p.message || "[Без тексту]",
            created_time: p.created_time
          }));

          // Fetch comments for the first post to test
          if (posts.length > 0) {
            const testPostId = posts[0].id;
            const commentsUrl = `https://graph.facebook.com/v21.0/${testPostId}/comments?fields=id,message,from,created_time,is_hidden&limit=10&access_token=${page.accessToken}`;
            const commentsRes = await fetch(commentsUrl);

            if (!commentsRes.ok) {
              const errData = await commentsRes.json().catch(() => ({}));
              pageReport.errors.push({
                step: `Fetch Comments for post ${testPostId}`,
                status: commentsRes.status,
                message: errData.error?.message || "Unknown error"
              });
            } else {
              const commentsData = await commentsRes.json();
              const comments = commentsData.data || [];
              pageReport.commentsFound = comments.length;
              pageReport.testCommentsSample = comments.map((c: any) => ({
                id: c.id,
                message: c.message,
                from: c.from?.name || "Unknown",
                is_hidden: c.is_hidden
              }));
            }
          }
        }
      } catch (e: any) {
        pageReport.errors.push({
          step: "System Exception",
          message: e.message
        });
      }

      report.push(pageReport);
    }

    return NextResponse.json({
      success: true,
      pagesCount: pages.length,
      report
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
