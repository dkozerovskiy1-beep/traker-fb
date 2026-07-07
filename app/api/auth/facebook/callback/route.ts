import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import {
  exchangeCodeForAccessToken,
  getLongLivedUserAccessToken,
  getFacebookUserProfile,
  getManagedAdAccounts,
  getManagedPages,
  subscribePageToWebhooks
} from "@/app/lib/facebook";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // state represents the inviteLinkId

  if (!code || !state) {
    return NextResponse.json(
      { success: false, error: "Missing authorization code or state (invite ID)" },
      { status: 400 }
    );
  }

  try {
    // 1. Verify the invite link from state
    const invite = await db.inviteLink.findUnique({
      where: { id: state },
      include: { user: true }
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: "Invalid invite link" },
        { status: 400 }
      );
    }

    if (invite.isOneTime && invite.usedAt) {
      return NextResponse.json(
        { success: false, error: "This invite link has already been used" },
        { status: 400 }
      );
    }

    // 2. Exchange code for short-lived token, then extend to long-lived (60 days)
    const shortLivedToken = await exchangeCodeForAccessToken(code);
    const { token: longLivedToken, expiresIn } = await getLongLivedUserAccessToken(shortLivedToken);

    // Calculate expiry date
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    // 3. Get Facebook User Profile details
    const fbProfile = await getFacebookUserProfile(longLivedToken);

    // 4. Save/Update Facebook Social Account
    const fbSocialAccount = await db.fbSocialAccount.upsert({
      where: { id: fbProfile.id },
      update: {
        name: fbProfile.name,
        avatarUrl: fbProfile.avatarUrl,
        accessToken: longLivedToken,
        tokenExpiresAt,
        status: "ACTIVE",
        updatedAt: new Date()
      },
      create: {
        id: fbProfile.id,
        name: fbProfile.name,
        avatarUrl: fbProfile.avatarUrl,
        accessToken: longLivedToken,
        tokenExpiresAt,
        status: "ACTIVE",
        userId: invite.userId
      }
    });

    // 5. Mark invite link as used
    await db.inviteLink.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
        usedByFbId: fbProfile.id
      }
    });

    // 6. Fetch and sync Ad Accounts
    const adAccountsData = await getManagedAdAccounts(longLivedToken);
    for (const adAccount of adAccountsData) {
      // account_status: 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, etc.
      const status = adAccount.account_status === 1 ? "ACTIVE" : "DISABLED";
      
      await db.fbAdAccount.upsert({
        where: { id: adAccount.id },
        update: {
          name: adAccount.name || `Ad Account ${adAccount.id}`,
          currency: adAccount.currency || "USD",
          timezoneName: adAccount.timezone_name || "UTC",
          status,
          spend: adAccount.amount_spent ? parseFloat(adAccount.amount_spent) / 100 : 0 // FB returns amount_spent in cents
        },
        create: {
          id: adAccount.id,
          name: adAccount.name || `Ad Account ${adAccount.id}`,
          currency: adAccount.currency || "USD",
          timezoneName: adAccount.timezone_name || "UTC",
          status,
          spend: adAccount.amount_spent ? parseFloat(adAccount.amount_spent) / 100 : 0,
          socialAccountId: fbSocialAccount.id
        }
      });
    }

    // 7. Fetch and sync Pages, and subscribe them to Webhooks
    const pagesData = await getManagedPages(longLivedToken);
    for (const page of pagesData) {
      await db.fbPage.upsert({
        where: { id: page.id },
        update: {
          name: page.name,
          avatarUrl: page.avatarUrl,
          accessToken: page.access_token,
          updatedAt: new Date()
        },
        create: {
          id: page.id,
          name: page.name,
          avatarUrl: page.avatarUrl,
          accessToken: page.access_token,
          socialAccountId: fbSocialAccount.id
        }
      });

      // Subscribe page to webhooks for comments real-time moderation
      await subscribePageToWebhooks(page.id, page.access_token).catch((err) => {
        console.error(`Webhook subscription error for page ${page.id}:`, err);
      });
    }

    // 8. Redirect back to dashboard accounts list with success parameter
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    return NextResponse.redirect(`${protocol}://${host}/accounts?success=true`);
  } catch (error: any) {
    console.error("Facebook OAuth callback error:", error);
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    return NextResponse.redirect(
      `${protocol}://${host}/accounts?error=${encodeURIComponent(error.message || "Failed to authorize Facebook account")}`
    );
  }
}
