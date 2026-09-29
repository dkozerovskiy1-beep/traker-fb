import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import {
  getKyivTodayStr,
  parseKyivDateToUTC,
  roundCurrency
} from "@/app/lib/dates";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. Authorize via API Key (via query param `key` or Bearer header)
    const apiKeyHeader = req.headers.get("authorization")?.replace("Bearer ", "").trim();
    const apiKeyQuery = searchParams.get("key")?.trim();
    const apiKey = apiKeyQuery || apiKeyHeader;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing API Key. Provide ?key=YOUR_API_KEY or Authorization header." },
        { status: 401 }
      );
    }

    // Find user by exportApiKey
    const user = await db.user.findUnique({
      where: { exportApiKey: apiKey },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid API Key." },
        { status: 401 }
      );
    }

    // 2. Parse Date Parameters in GMT+3 timezone
    const todayStr = getKyivTodayStr();
    const dateParam = searchParams.get("date");
    const dateFromParam = searchParams.get("date_from");
    const dateToParam = searchParams.get("date_to");
    const clientIdParam = searchParams.get("client_id")?.trim();

    let startDateStr = dateFromParam || dateParam || todayStr;
    let endDateStr = dateToParam || dateParam || todayStr;

    const startDate = parseKyivDateToUTC(startDateStr);
    const endDate = parseKyivDateToUTC(endDateStr);
    endDate.setUTCHours(23, 59, 59, 999);

    // 3. Fetch all social accounts and ad accounts belonging to this user
    const socialAccounts = await db.fbSocialAccount.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        clientTag: true,
        adAccounts: {
          select: {
            id: true,
            name: true,
            clientTag: true,
            currency: true,
            status: true
          }
        }
      }
    });

    // Map of adAccountId -> clientTag (Cascade: AdAccount Tag -> SocialAccount Tag -> SocialAccount Name -> AdAccount Name/ID)
    const adAccountMap = new Map<string, { name: string; clientTag: string; currency: string; status: string }>();

    for (const socialAcc of socialAccounts) {
      for (const acc of socialAcc.adAccounts) {
        // Priority: 1. AdAccount custom clientTag -> 2. SocialAccount clientTag -> 3. SocialAccount name -> 4. AdAccount name/id
        const clientTag = acc.clientTag?.trim() || socialAcc.clientTag?.trim() || socialAcc.name || acc.name || acc.id;
        adAccountMap.set(acc.id, {
          name: acc.name,
          clientTag,
          currency: acc.currency || "USD",
          status: acc.status
        });
      }
    }

    const targetAdAccountIds = Array.from(adAccountMap.keys());

    if (targetAdAccountIds.length === 0) {
      return NextResponse.json({
        success: true,
        period: { from: startDateStr, to: endDateStr },
        total_clients: 0,
        clients: []
      });
    }

    // 4. Fetch Insights for target ad accounts within date range
    const insights = await db.dailyInsight.findMany({
      where: {
        adAccountId: { in: targetAdAccountIds },
        date: { gte: startDate, lte: endDate }
      }
    });

    // 5. Aggregate insights by clientTag and country
    interface ClientAggregate {
      client_id: string;
      client_tag: string;
      country: string | null;
      currency: string;
      spend: number;
      impressions: number;
      clicks: number;
      unique_clicks: number;
      fb_leads: number;
      conversions: number;
      ad_accounts_count: number;
    }

    const clientAggregates = new Map<string, ClientAggregate>();

    // Accumulate metrics from insights
    for (const item of insights) {
      const accInfo = adAccountMap.get(item.adAccountId);
      if (!accInfo) continue;

      const baseTag = accInfo.clientTag;
      const rawCountry = item.country?.trim();
      const countryCode = rawCountry && rawCountry !== "ALL" && rawCountry !== "UNKNOWN"
        ? rawCountry.toUpperCase()
        : null;

      const fullClientId = countryCode ? `${baseTag} - ${countryCode}` : baseTag;

      // Filter by client_id parameter if supplied (supports matching full ID or base tag)
      if (clientIdParam) {
        const matchesFull = fullClientId.toLowerCase() === clientIdParam.toLowerCase();
        const matchesBase = baseTag.toLowerCase() === clientIdParam.toLowerCase();
        if (!matchesFull && !matchesBase) {
          continue;
        }
      }

      let agg = clientAggregates.get(fullClientId);
      if (!agg) {
        agg = {
          client_id: fullClientId,
          client_tag: baseTag,
          country: countryCode,
          currency: "USD",
          spend: 0,
          impressions: 0,
          clicks: 0,
          unique_clicks: 0,
          fb_leads: 0,
          conversions: 0,
          ad_accounts_count: 1
        };
        clientAggregates.set(fullClientId, agg);
      }

      agg.spend += item.spend;
      agg.impressions += item.impressions;
      agg.clicks += item.clicks;
      agg.unique_clicks += item.uniqueClicks;
      agg.fb_leads += item.leads;
      agg.conversions += item.conversions;
    }

    // Ensure all active client tags appear even if they had 0 spend in this period
    for (const socialAcc of socialAccounts) {
      for (const acc of socialAcc.adAccounts) {
        const baseTag = acc.clientTag?.trim() || socialAcc.clientTag?.trim() || socialAcc.name || acc.name || acc.id;

        if (clientIdParam && baseTag.toLowerCase() !== clientIdParam.toLowerCase()) {
          // Check if any geo-specific entry for this baseTag exists in clientAggregates
          const hasGeoEntry = Array.from(clientAggregates.values()).some(
            a => a.client_tag.toLowerCase() === baseTag.toLowerCase()
          );
          if (!hasGeoEntry) continue;
        }

        // If no insights were recorded for this baseTag at all, add a default 0-spend entry
        const hasAnyEntry = Array.from(clientAggregates.values()).some(
          a => a.client_tag.toLowerCase() === baseTag.toLowerCase()
        );

        if (!hasAnyEntry) {
          clientAggregates.set(baseTag, {
            client_id: baseTag,
            client_tag: baseTag,
            country: null,
            currency: "USD",
            spend: 0,
            impressions: 0,
            clicks: 0,
            unique_clicks: 0,
            fb_leads: 0,
            conversions: 0,
            ad_accounts_count: 1
          });
        }
      }
    }

    // Format output with calculated ratios and exact cent rounding
    const clientList = Array.from(clientAggregates.values()).map(agg => {
      const spend = roundCurrency(agg.spend);
      const impressions = agg.impressions;
      const clicks = agg.clicks;
      const uniqueClicks = agg.unique_clicks;
      const fbLeads = agg.fb_leads;

      const ctr = impressions > 0 ? roundCurrency((clicks / impressions) * 100) : 0;
      const cpc = clicks > 0 ? roundCurrency(spend / clicks) : 0;
      const cpm = impressions > 0 ? roundCurrency((spend / impressions) * 1000) : 0;
      const fbCpl = fbLeads > 0 ? roundCurrency(spend / fbLeads) : 0;

      return {
        client_id: agg.client_id,
        client_tag: agg.client_tag,
        country: agg.country,
        currency: "USD",
        spend,
        impressions,
        clicks,
        unique_clicks: uniqueClicks,
        fb_leads: fbLeads,
        ctr,
        cpc,
        cpm,
        fb_cpl: fbCpl
      };
    });

    return NextResponse.json({
      success: true,
      period: { from: startDateStr, to: endDateStr },
      total_clients: clientList.length,
      clients: clientList
    });
  } catch (error: any) {
    console.error("Export API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
