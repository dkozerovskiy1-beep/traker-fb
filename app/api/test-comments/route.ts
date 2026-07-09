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
          select: { id: true, name: true, accessToken: true }
        }
      }
    });

    if (pages.length === 0) {
      return NextResponse.json({
        success: false,
        error: "У вашій базі даних немає підключених бізнес-сторінок."
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
        methods: {}
      };

      try {
        const userToken = page.socialAccount.accessToken;

        // Method A: Query /promotable_posts using Page Access Token
        const urlPagePromotable = `https://graph.facebook.com/v21.0/${page.id}/promotable_posts?fields=id,created_time,message&limit=3&access_token=${page.accessToken}`;
        const resPagePromotable = await fetch(urlPagePromotable);
        
        // Method B: Query /promotable_posts using User (Social Account) Access Token
        const urlUserPromotable = `https://graph.facebook.com/v21.0/${page.id}/promotable_posts?fields=id,created_time,message&limit=3&access_token=${userToken}`;
        const resUserPromotable = await fetch(urlUserPromotable);

        // Method C: Query /ads_posts using Page Access Token
        const urlPageAdsPosts = `https://graph.facebook.com/v21.0/${page.id}/ads_posts?fields=id,created_time,message&limit=3&access_token=${page.accessToken}`;
        const resPageAdsPosts = await fetch(urlPageAdsPosts);

        // Method D: Try regular timeline /posts just as comparison
        const urlPagePosts = `https://graph.facebook.com/v21.0/${page.id}/posts?fields=id,created_time,message&limit=3&access_token=${page.accessToken}`;
        const resPagePosts = await fetch(urlPagePosts);

        pageReport.methods = {
          pagePromotable: {
            status: resPagePromotable.status,
            ok: resPagePromotable.ok,
            data: await resPagePromotable.json().catch(() => ({}))
          },
          userPromotable: {
            status: resUserPromotable.status,
            ok: resUserPromotable.ok,
            data: await resUserPromotable.json().catch(() => ({}))
          },
          pageAdsPosts: {
            status: resPageAdsPosts.status,
            ok: resPageAdsPosts.ok,
            data: await resPageAdsPosts.json().catch(() => ({}))
          },
          pageTimelinePosts: {
            status: resPagePosts.status,
            ok: resPagePosts.ok,
            data: await resPagePosts.json().catch(() => ({}))
          }
        };
      } catch (e: any) {
        pageReport.error = e.message;
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
