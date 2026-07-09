import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getLoggedInUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint to test page comment retrieval via Ads Creatives.
 * Call: GET /api/test-comments
 */
export async function GET() {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch active social accounts to get their tokens
    const socialAccounts = await db.fbSocialAccount.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: {
        adAccounts: {
          where: { status: "ACTIVE" }
        },
        pages: true
      }
    });

    if (socialAccounts.length === 0) {
      return NextResponse.json({ success: false, error: "Немає підключених активних соц. акаунтів." });
    }

    const report: any[] = [];

    // 2. Iterate through ad accounts and fetch ads with their creatives
    for (const social of socialAccounts) {
      for (const adAcc of social.adAccounts) {
        const adAccReport: any = {
          adAccountName: adAcc.name,
          adAccountId: adAcc.id,
          socialProfile: social.name,
          adsChecked: 0,
          adsWithCreatives: [],
          errors: []
        };

        try {
          // Fetch ads with their creatives and effective_object_story_id
          const adsUrl = `https://graph.facebook.com/v21.0/${adAcc.id}/ads?fields=id,name,status,creative{id,effective_object_story_id}&limit=25&access_token=${social.accessToken}`;
          const adsRes = await fetch(adsUrl);

          if (!adsRes.ok) {
            const errData = await adsRes.json().catch(() => ({}));
            adAccReport.errors.push({
              step: "Fetch Ads with Creatives",
              status: adsRes.status,
              message: errData.error?.message || "Unknown error"
            });
          } else {
            const adsData = await adsRes.json();
            const ads = adsData.data || [];
            adAccReport.adsChecked = ads.length;

            for (const ad of ads) {
              const creative = ad.creative;
              const storyId = creative?.effective_object_story_id;

              if (storyId) {
                // Find matching page from database to get the page access token
                // effective_object_story_id starts with page ID (e.g. PAGEID_POSTID)
                const pageId = storyId.split("_")[0];
                const matchingPage = social.pages.find(p => p.id === pageId);

                const adInfo: any = {
                  adName: ad.name,
                  adStatus: ad.status,
                  creativeId: creative.id,
                  storyId: storyId,
                  pageId: pageId,
                  pageFoundInDb: !!matchingPage,
                  commentsChecked: 0,
                  commentsList: [],
                  commentError: null
                };

                // Fetch comments using the matching page token (or user token if page token not found)
                const tokenToUse = matchingPage?.accessToken || social.accessToken;
                const commentsUrl = `https://graph.facebook.com/v21.0/${storyId}/comments?fields=id,message,from,created_time,is_hidden&limit=15&access_token=${tokenToUse}`;
                
                try {
                  const commentsRes = await fetch(commentsUrl);
                  if (commentsRes.ok) {
                    const commentsData = await commentsRes.json();
                    const comments = commentsData.data || [];
                    adInfo.commentsChecked = comments.length;
                    adInfo.commentsList = comments.map((c: any) => ({
                      id: c.id,
                      message: c.message,
                      author: c.from?.name || "Невідомий",
                      is_hidden: c.is_hidden
                    }));
                  } else {
                    const err = await commentsRes.json().catch(() => ({}));
                    adInfo.commentError = err.error?.message || "Failed to fetch comments";
                  }
                } catch (commentErr: any) {
                  adInfo.commentError = commentErr.message;
                }

                adAccReport.adsWithCreatives.push(adInfo);
              }
            }
          }
        } catch (adErr: any) {
          adAccReport.errors.push({
            step: "Ad account sync catch",
            message: adErr.message
          });
        }

        report.push(adAccReport);
      }
    }

    return NextResponse.json({
      success: true,
      report
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
