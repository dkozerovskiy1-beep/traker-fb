/**
 * Helper library for interacting with the Facebook Graph API.
 */

export interface FbProfile {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface FbAdAccountData {
  id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number; // 1 = ACTIVE, 2 = DISABLED, etc.
  amount_spent: string;
}

export interface FbPageData {
  id: string;
  name: string;
  access_token: string;
  avatarUrl?: string;
}

export interface FbCampaignInsight {
  date: string;
  campaignId: string;
  campaignName: string;
  adsetId?: string;
  adsetName?: string;
  adId?: string;
  adName?: string;
  spend: number;
  impressions: number;
  clicks: number;
  uniqueClicks: number;
  leads: number;
  conversions: number;
}

const FB_API_VERSION = "v21.0";

/**
 * Returns the Facebook OAuth URL where users grant permissions.
 */
export function getFacebookAuthUrl(state: string): string {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI || "");
  
  // Scopes requested based on competitor screenshots:
  // email, ads_read, ads_management, business_management, pages_show_list,
  // pages_read_engagement, pages_read_user_content, pages_manage_engagement, pages_manage_metadata
  const scopes = [
    "ads_read",
    "ads_management",
    "business_management",
    "pages_show_list",
    "pages_read_engagement",
    "pages_read_user_content",
    "pages_manage_engagement",
    "pages_manage_metadata"
  ].join(",");

  return `https://www.facebook.com/${FB_API_VERSION}/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code&auth_type=rerequest`;
}

/**
 * Exchanges the authorization code for a short-lived user access token.
 */
export async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || "";

  const url = `https://graph.facebook.com/${FB_API_VERSION}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to exchange code: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Exchanges a short-lived user access token for a long-lived user access token (lasts 60 days).
 */
export async function getLongLivedUserAccessToken(shortLivedToken: string): Promise<{ token: string; expiresIn?: number }> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  const url = `https://graph.facebook.com/${FB_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to extend access token: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return {
    token: data.access_token,
    expiresIn: data.expires_in // in seconds
  };
}

/**
 * Fetches the user's basic profile.
 */
export async function getFacebookUserProfile(accessToken: string): Promise<FbProfile> {
  const url = `https://graph.facebook.com/${FB_API_VERSION}/me?fields=id,name,picture.type(large)&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch user profile: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    avatarUrl: data.picture?.data?.url
  };
}

/**
 * Fetches all ad accounts managed by this user.
 */
export async function getManagedAdAccounts(accessToken: string): Promise<FbAdAccountData[]> {
  const url = `https://graph.facebook.com/${FB_API_VERSION}/me/adaccounts?fields=id,name,currency,timezone_name,account_status,amount_spent&limit=200&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch ad accounts: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.data || [];
}

/**
 * Fetches all pages managed by this user along with their page access tokens.
 */
export async function getManagedPages(accessToken: string): Promise<FbPageData[]> {
  const url = `https://graph.facebook.com/${FB_API_VERSION}/me/accounts?fields=id,name,access_token,picture.type(large)&limit=200&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch pages: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const pages = (data.data || []).map((page: any) => ({
    id: page.id,
    name: page.name,
    access_token: page.access_token,
    avatarUrl: page.picture?.data?.url
  }));

  return pages;
}

/**
 * Subscribes our app to receive webhooks for a Facebook Page.
 */
export async function subscribePageToWebhooks(pageId: string, pageAccessToken: string): Promise<boolean> {
  const url = `https://graph.facebook.com/${FB_API_VERSION}/${pageId}/subscribed_apps?subscribed_fields=feed,messages&access_token=${pageAccessToken}`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Webhook subscription failed for Page ${pageId}:`, err.error?.message);
    return false;
  }
  const data = await res.json();
  return data.success === true;
}

/**
 * Hides or deletes a comment on a Facebook Page post.
 */
export async function moderateFacebookComment(
  commentId: string,
  action: "HIDE" | "DELETE",
  pageAccessToken: string
): Promise<boolean> {
  const baseUrl = `https://graph.facebook.com/${FB_API_VERSION}/${commentId}`;
  let url = baseUrl;
  let method = "POST";

  if (action === "HIDE") {
    url = `${baseUrl}?is_hidden=true&access_token=${pageAccessToken}`;
  } else if (action === "DELETE") {
    url = `${baseUrl}?access_token=${pageAccessToken}`;
    method = "DELETE";
  }

  const res = await fetch(url, { method });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Failed to moderate comment ${commentId} with action ${action}:`, err.error?.message);
    return false;
  }
  const data = await res.json();
  return data.success === true;
}

/**
 * Fetches daily advertising insights (spend, clicks, leads) for a specific Ad Account.
 * Supports date range query.
 */
export async function getAdAccountInsights(
  adAccountId: string,
  accessToken: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<FbCampaignInsight[]> {
  const timeRange = JSON.stringify({ since: startDate, until: endDate });
  
  // Fields to pull details at ad level: campaign, adset, ad, spend, impressions, clicks, unique_clicks, actions
  const fields = "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,unique_clicks,actions";
  const url = `https://graph.facebook.com/${FB_API_VERSION}/${adAccountId}/insights?level=ad&fields=${fields}&time_increment=1&time_range=${encodeURIComponent(timeRange)}&limit=1000&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to fetch insights for ${adAccountId}: ${err.error?.message || res.statusText}`);
  }

  const responseData = await res.json();
  const rawInsights = responseData.data || [];

  return rawInsights.map((insight: any) => {
    // Parse actions to extract leads and other conversions
    let leads = 0;
    let conversions = 0;

    if (insight.actions && Array.isArray(insight.actions)) {
      for (const action of insight.actions) {
        // Facebook lead identifiers: 'lead', 'onsite_conversion.lead_grouped', etc.
        if (action.action_type === "lead" || action.action_type === "onsite_conversion.lead_grouped") {
          leads += parseInt(action.value || "0", 10);
        }
        // General conversions can include purchases, registrations, etc.
        if (action.action_type === "purchase" || action.action_type === "offsite_conversion.fb_pixel_purchase") {
          conversions += parseInt(action.value || "0", 10);
        }
      }
    }

    return {
      date: insight.date_start, // Format: YYYY-MM-DD
      campaignId: insight.campaign_id,
      campaignName: insight.campaign_name,
      adsetId: insight.adset_id,
      adsetName: insight.adset_name,
      adId: insight.ad_id,
      adName: insight.ad_name,
      spend: parseFloat(insight.spend || "0"),
      impressions: parseInt(insight.impressions || "0", 10),
      clicks: parseInt(insight.clicks || "0", 10),
      uniqueClicks: parseInt(insight.unique_clicks || "0", 10),
      leads,
      conversions
    };
  });
}

export interface FbCampaignData {
  id: string;
  name: string;
  status: string;
  effective_status: string;
}

export async function getAdAccountCampaigns(adAccountId: string, accessToken: string): Promise<FbCampaignData[]> {
  const url = `https://graph.facebook.com/${FB_API_VERSION}/${adAccountId}/campaigns?fields=id,name,status,effective_status&limit=1000&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Failed to fetch campaigns for ${adAccountId}:`, err.error?.message);
    return [];
  }
  const data = await res.json();
  return data.data || [];
}

export interface FbAdSetData {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  campaign_id: string;
}

export async function getAdAccountAdSets(adAccountId: string, accessToken: string): Promise<FbAdSetData[]> {
  const url = `https://graph.facebook.com/${FB_API_VERSION}/${adAccountId}/adsets?fields=id,name,status,effective_status,campaign{id}&limit=1000&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Failed to fetch adsets for ${adAccountId}:`, err.error?.message);
    return [];
  }
  const data = await res.json();
  return (data.data || []).map((adset: any) => ({
    id: adset.id,
    name: adset.name,
    status: adset.status,
    effective_status: adset.effective_status,
    campaign_id: adset.campaign?.id
  }));
}

export interface FbAdData {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  adset_id: string;
  rejection_reason?: string | null;
}

export async function getAdAccountAds(adAccountId: string, accessToken: string): Promise<FbAdData[]> {
  const url = `https://graph.facebook.com/${FB_API_VERSION}/${adAccountId}/ads?fields=id,name,status,effective_status,adset{id},recommendations&limit=1000&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Failed to fetch ads for ${adAccountId}:`, err.error?.message);
    return [];
  }
  const data = await res.json();
  return (data.data || []).map((ad: any) => {
    const rejectionReason = ad.recommendations && Array.isArray(ad.recommendations)
      ? ad.recommendations.map((r: any) => r.message).join("; ")
      : null;

    return {
      id: ad.id,
      name: ad.name,
      status: ad.status,
      effective_status: ad.effective_status,
      adset_id: ad.adset?.id,
      rejection_reason: rejectionReason
    };
  });
}

