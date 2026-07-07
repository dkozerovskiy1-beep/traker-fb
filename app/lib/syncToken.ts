import { db } from "./db";
import {
  getFacebookUserProfile,
  getManagedAdAccounts,
  getManagedPages,
  subscribePageToWebhooks
} from "./facebook";

/**
 * Synchronizes a Facebook social account and all its child ad accounts and pages
 * using a directly provided Access Token.
 */
export async function syncFacebookAccountByToken(accessToken: string, userId: string): Promise<string> {
  // 1. Get Facebook User Profile details
  const fbProfile = await getFacebookUserProfile(accessToken);

  // 2. Save/Update Facebook Social Account
  // Since we are using manual token input (usually permanent EAAB tokens or 60-day tokens),
  // we don't strictly set a short expiration. We can set tokenExpiresAt to null (never expires)
  // or a date far in the future, as system user/EAAB tokens are permanent until password change.
  const fbSocialAccount = await db.fbSocialAccount.upsert({
    where: { id: fbProfile.id },
    update: {
      name: fbProfile.name,
      avatarUrl: fbProfile.avatarUrl,
      accessToken: accessToken,
      tokenExpiresAt: null, // EAAB tokens are permanent unless password changes
      status: "ACTIVE",
      updatedAt: new Date()
    },
    create: {
      id: fbProfile.id,
      name: fbProfile.name,
      avatarUrl: fbProfile.avatarUrl,
      accessToken: accessToken,
      tokenExpiresAt: null,
      status: "ACTIVE",
      userId: userId
    }
  });

  // 3. Fetch and sync Ad Accounts
  try {
    const adAccountsData = await getManagedAdAccounts(accessToken);
    for (const adAccount of adAccountsData) {
      const status = adAccount.account_status === 1 ? "ACTIVE" : "DISABLED";
      
      await db.fbAdAccount.upsert({
        where: { id: adAccount.id },
        update: {
          name: adAccount.name || `Ad Account ${adAccount.id}`,
          currency: adAccount.currency || "USD",
          timezoneName: adAccount.timezone_name || "UTC",
          status,
          spend: adAccount.amount_spent ? parseFloat(adAccount.amount_spent) / 100 : 0
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
  } catch (adError) {
    console.error(`Error syncing ad accounts for token of ${fbProfile.name}:`, adError);
  }

  // 4. Fetch and sync Pages, and subscribe them to Webhooks
  try {
    const pagesData = await getManagedPages(accessToken);
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
  } catch (pageError) {
    console.error(`Error syncing pages for token of ${fbProfile.name}:`, pageError);
  }

  return fbProfile.id;
}
