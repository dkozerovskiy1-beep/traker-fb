/**
 * Helper library for interacting with the Facebook Graph API.
 */

import { roundCurrency } from "@/app/lib/dates";

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
  country: string;
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
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = `https://graph.facebook.com/${FB_API_VERSION}/${commentId}`;
  
  try {
    let res: Response;

    if (action === "HIDE") {
      // HIDE uses POST with body parameters
      const bodyParams = new URLSearchParams();
      bodyParams.append("is_hidden", "true");
      bodyParams.append("access_token", pageAccessToken);

      res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: bodyParams.toString()
      });
    } else {
      // DELETE action (deletes comment)
      const deleteUrl = `${baseUrl}?access_token=${pageAccessToken}`;
      res = await fetch(deleteUrl, {
        method: "DELETE"
      });
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`Failed to moderate comment ${commentId} with action ${action}:`, data.error?.message);
      return { success: false, error: data.error?.message || `HTTP ${res.status}` };
    }

    return { success: data.success === true, error: data.success ? undefined : "Facebook did not confirm success" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

const KNOWN_GEO_CODES = new Set([
  "UA", "KZ", "DE", "PL", "CZ", "US", "GB", "CA", "AU", "AT", "CH", "IT", "ES", "FR", "PT",
  "NL", "BE", "SE", "NO", "FI", "DK", "IE", "GR", "HU", "SK", "BG", "RO", "HR", "RS", "SI",
  "LT", "LV", "EE", "CY", "MT", "MD", "AZ", "UZ", "KG", "TJ", "TM", "GE", "AM", "TR", "AE",
  "SA", "QA", "KW", "BH", "OM", "IL", "EG", "ZA", "NG", "KE", "MA", "BR", "MX", "AR", "CO",
  "CL", "PE", "EC", "TH", "VN", "ID", "PH", "MY", "SG", "IN", "NZ", "JP", "KR", "TW", "HK"
]);

// Non-geo prefixes/tags that should never be matched as countries:
// "GP" (Google Play / Group), "MC" (Micro/Campaign), "AD" (Ad), "DP", "FB", "TG", "BM", "AB", "PR", "CR"
const IGNORED_PREFIXES = new Set(["GP", "MC", "AD", "DP", "FB", "TG", "BM", "AB", "PR", "CR", "CBO", "ABO"]);

/**
 * Helper to normalize country code or extract from adset/campaign names if not detected.
 */
export function extractCountryCode(
  rawCountry?: string | null,
  adsetName?: string | null,
  campaignName?: string | null
): string {
  if (rawCountry && rawCountry.trim() && rawCountry.toUpperCase() !== "UNKNOWN" && rawCountry.toUpperCase() !== "ALL") {
    return rawCountry.trim().toUpperCase();
  }

  // Look for 2-letter ISO country codes in adsetName or campaignName (e.g. "[DE]", "de -", "DE_", "kz-", etc.)
  const namesToCheck = [adsetName, campaignName].filter(Boolean) as string[];
  for (const name of namesToCheck) {
    // 1. Bracketed codes e.g. [DE], (KZ), [PL]
    const bracketMatch = name.match(/[\[\(]([a-zA-Z]{2})[\]\)]/);
    if (bracketMatch && bracketMatch[1]) {
      const code = bracketMatch[1].toUpperCase();
      if (KNOWN_GEO_CODES.has(code)) return code;
    }
    // 2. Prefix codes e.g. "de -", "KZ -", "pl_", "DE/", "kz:" (exclude ignored non-geo prefixes like gp-, mc-)
    const prefixMatch = name.match(/^([a-zA-Z]{2})[\s_\-\/:]/);
    if (prefixMatch && prefixMatch[1]) {
      const code = prefixMatch[1].toUpperCase();
      if (KNOWN_GEO_CODES.has(code) && !IGNORED_PREFIXES.has(code)) {
        return code;
      }
    }
    // 3. Slash or hyphen separated tokens e.g. "gp-de/cz/pl-..." or "- de -"
    const tokens = name.split(/[\s_\-\/:\[\]\(\)]+/);
    for (const token of tokens) {
      const upper = token.toUpperCase();
      if (upper.length === 2 && KNOWN_GEO_CODES.has(upper) && !IGNORED_PREFIXES.has(upper)) {
        return upper;
      }
    }
  }

  return "ALL";
}

/**
 * Fetches daily advertising insights (spend, clicks, leads) for a specific Ad Account with Country Breakdown.
 * Supports date range query and handles pagination across all pages.
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
  let url: string | null = `https://graph.facebook.com/${FB_API_VERSION}/${adAccountId}/insights?level=ad&fields=${fields}&breakdowns=country&time_increment=1&time_range=${encodeURIComponent(timeRange)}&limit=1000&access_token=${accessToken}`;

  const allRawInsights: any[] = [];
  let isBreakdownQuery = true;

  try {
    while (url) {
      const res: Response = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // If breakdowns query fails for any reason, fallback seamlessly to standard query
        if (isBreakdownQuery && (res.status === 400 || err.error?.code === 100)) {
          console.warn(`Breakdowns=country query unsupported for ${adAccountId}, falling back to standard insight query:`, err.error?.message);
          isBreakdownQuery = false;
          url = `https://graph.facebook.com/${FB_API_VERSION}/${adAccountId}/insights?level=ad&fields=${fields}&time_increment=1&time_range=${encodeURIComponent(timeRange)}&limit=1000&access_token=${accessToken}`;
          allRawInsights.length = 0;
          continue;
        }
        throw new Error(`Failed to fetch insights for ${adAccountId}: ${err.error?.message || res.statusText}`);
      }

      const responseData: any = await res.json();
      const rawInsights = responseData.data || [];
      allRawInsights.push(...rawInsights);

      // Follow paging.next if available
      url = responseData.paging?.next || null;
    }
  } catch (error: any) {
    if (isBreakdownQuery && allRawInsights.length === 0) {
      // Retry once without breakdown if an unexpected error occurred
      try {
        let fallbackUrl: string | null = `https://graph.facebook.com/${FB_API_VERSION}/${adAccountId}/insights?level=ad&fields=${fields}&time_increment=1&time_range=${encodeURIComponent(timeRange)}&limit=1000&access_token=${accessToken}`;
        while (fallbackUrl) {
          const res: Response = await fetch(fallbackUrl);
          if (!res.ok) break;
          const data: any = await res.json();
          allRawInsights.push(...(data.data || []));
          fallbackUrl = data.paging?.next || null;
        }
      } catch (fallbackErr) {
        console.error("Fallback insight query also failed:", fallbackErr);
        throw error;
      }
    } else {
      throw error;
    }
  }

  return allRawInsights.map((insight: any) => {
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

    const country = extractCountryCode(insight.country, insight.adset_name, insight.campaign_name);

    return {
      date: insight.date_start, // Format: YYYY-MM-DD
      campaignId: insight.campaign_id,
      campaignName: insight.campaign_name,
      adsetId: insight.adset_id,
      adsetName: insight.adset_name,
      adId: insight.ad_id,
      adName: insight.ad_name,
      country,
      spend: roundCurrency(parseFloat(insight.spend || "0")),
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
  const filter = JSON.stringify([{ field: "effective_status", operator: "IN", value: ["ACTIVE", "PAUSED", "PENDING_REVIEW", "DISAPPROVED", "IN_PROCESS", "WITH_ERRORS", "CAMPAIGN_PAUSED", "ADSET_PAUSED"] }]);
  const url = `https://graph.facebook.com/${FB_API_VERSION}/${adAccountId}/campaigns?fields=id,name,status,effective_status&limit=1000&filtering=${encodeURIComponent(filter)}&access_token=${accessToken}`;
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
  targetCountry?: string | null;
}

export async function getAdAccountAdSets(adAccountId: string, accessToken: string): Promise<FbAdSetData[]> {
  const filter = JSON.stringify([{ field: "effective_status", operator: "IN", value: ["ACTIVE", "PAUSED", "PENDING_REVIEW", "DISAPPROVED", "IN_PROCESS", "WITH_ERRORS", "CAMPAIGN_PAUSED", "ADSET_PAUSED"] }]);
  const url = `https://graph.facebook.com/${FB_API_VERSION}/${adAccountId}/adsets?fields=id,name,status,effective_status,campaign{id},targeting&limit=1000&filtering=${encodeURIComponent(filter)}&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Failed to fetch adsets for ${adAccountId}:`, err.error?.message);
    return [];
  }
  const data = await res.json();
  return (data.data || []).map((adset: any) => {
    let targetCountry: string | null = null;
    const countries = adset.targeting?.geo_locations?.countries;
    if (Array.isArray(countries) && countries.length === 1 && typeof countries[0] === "string") {
      targetCountry = countries[0].toUpperCase();
    }
    return {
      id: adset.id,
      name: adset.name,
      status: adset.status,
      effective_status: adset.effective_status,
      campaign_id: adset.campaign?.id,
      targetCountry
    };
  });
}

export interface FbAdData {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  adset_id: string;
  rejection_reason?: string | null;
  creative?: { id: string; effective_object_story_id?: string | null } | null;
  created_time?: string;
}

export async function getAdAccountAds(adAccountId: string, accessToken: string): Promise<FbAdData[]> {
  const filter = JSON.stringify([{ field: "effective_status", operator: "IN", value: ["ACTIVE", "PAUSED", "PENDING_REVIEW", "DISAPPROVED", "IN_PROCESS", "WITH_ERRORS", "CAMPAIGN_PAUSED", "ADSET_PAUSED"] }]);
  const url = `https://graph.facebook.com/${FB_API_VERSION}/${adAccountId}/ads?fields=id,name,status,effective_status,adset{id},recommendations,creative{id,effective_object_story_id},created_time&limit=1000&filtering=${encodeURIComponent(filter)}&access_token=${accessToken}`;
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
      rejection_reason: rejectionReason,
      creative: ad.creative ? {
        id: ad.creative.id,
        effective_object_story_id: ad.creative.effective_object_story_id
      } : null,
      created_time: ad.created_time
    };
  });
}

export interface FbCommentData {
  id: string;
  message: string;
  from?: { id: string; name: string };
  created_time: string;
  is_hidden: boolean;
  postId: string;
}

/**
 * Fetches recent comments from all posts on a Facebook Page.
 * Goes through the page's recent feed posts and collects their comments.
 */
export async function getPageRecentComments(pageId: string, pageAccessToken: string): Promise<FbCommentData[]> {
  const allComments: FbCommentData[] = [];

  try {
    // Fetch recent posts (last 25 posts)
    const postsUrl = `https://graph.facebook.com/${FB_API_VERSION}/${pageId}/posts?fields=id&limit=25&access_token=${pageAccessToken}`;
    const postsRes = await fetch(postsUrl);
    if (!postsRes.ok) {
      const err = await postsRes.json().catch(() => ({}));
      console.error(`Failed to fetch posts for page ${pageId}:`, err.error?.message);
      return [];
    }

    const postsData = await postsRes.json();
    const posts = postsData.data || [];

    // For each post, fetch its comments
    for (const post of posts) {
      try {
        const commentsUrl = `https://graph.facebook.com/${FB_API_VERSION}/${post.id}/comments?fields=id,message,from,created_time,is_hidden&limit=100&access_token=${pageAccessToken}`;
        const commentsRes = await fetch(commentsUrl);
        if (!commentsRes.ok) continue;

        const commentsData = await commentsRes.json();
        const comments = commentsData.data || [];

        for (const comment of comments) {
          allComments.push({
            id: comment.id,
            message: comment.message || "",
            from: comment.from,
            created_time: comment.created_time,
            is_hidden: comment.is_hidden || false,
            postId: post.id
          });
        }
      } catch {
        // Skip individual post errors
      }
    }
  } catch (err) {
    console.error(`Error fetching comments for page ${pageId}:`, err);
  }

  return allComments;
}
