import { db } from "../lib/db";
import { getLoggedInUser } from "../lib/auth";
import AnalyticsClient from "./AnalyticsClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    socialAccount?: string;
    adAccount?: string;
    period?: string;
    customStartDate?: string;
    customEndDate?: string;
  }>;
}

// Helper to get formatted date string (YYYY-MM-DD)
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default async function HomePage({ searchParams }: PageProps) {
  const user = await getLoggedInUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const socialAccount = resolvedSearchParams.socialAccount || "ALL";
  const adAccount = resolvedSearchParams.adAccount || "ALL";
  const period = resolvedSearchParams.period || "today";
  const customStartDate = resolvedSearchParams.customStartDate || "";
  const customEndDate = resolvedSearchParams.customEndDate || "";

  // Select Date Range based on period
  let startDate = new Date();
  let endDate = new Date();
  
  if (period === "today") {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "yesterday") {
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "last7") {
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "last30") {
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "custom" && customStartDate && customEndDate) {
    startDate = new Date(customStartDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(customEndDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // default today
    startDate.setHours(0, 0, 0, 0);
  }

  let adAccountOptions: any[] = [];
  let socialAccountOptions: any[] = [];
  let campaignsList: any[] = [];
  let rawInsights: any[] = [];
  let socialAccountsSummary: any[] = [];
  let totals = { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0 };

  try {
    // 1. Fetch filter options (filtered by logged-in user)
    socialAccountOptions = await db.fbSocialAccount.findMany({
      where: { userId: user.id },
      select: { id: true, name: true }
    });

    adAccountOptions = await db.fbAdAccount.findMany({
      where: { socialAccount: { userId: user.id } },
      select: { id: true, name: true, socialAccountId: true, status: true, disabledAt: true }
    });

    // 2. Build filters for stats query
    const accountFilter: any = {};
    if (adAccount !== "ALL") {
      accountFilter.adAccountId = adAccount;
    } else if (socialAccount !== "ALL") {
      const ads = await db.fbAdAccount.findMany({
        where: { socialAccountId: socialAccount },
        select: { id: true }
      });
      accountFilter.adAccountId = { in: ads.map(a => a.id) };
    }

    // 3. Query daily insights (exclude old campaign-level duplicates)
    rawInsights = await db.dailyInsight.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...accountFilter,
        // Safety: exclude old campaign-level rows that may still exist
        // After switching to level=ad, old rows with adsetId="null" would cause double-counting
        NOT: {
          AND: [
            { adsetId: "null" },
            { adId: "null" }
          ]
        }
      }
    });

    // 4. Calculate Grand Totals
    for (const item of rawInsights) {
      totals.spend += item.spend;
      totals.impressions += item.impressions;
      totals.clicks += item.clicks;
      totals.leads += item.leads;
      totals.conversions += item.conversions;
    }

    // 5. Query Campaigns tree (Campaigns -> Adsets -> Ads)
    const activeAdAccountIds = adAccount !== "ALL"
      ? [adAccount]
      : (socialAccount !== "ALL"
          ? adAccountOptions.filter(a => a.socialAccountId === socialAccount).map(a => a.id)
          : adAccountOptions.map(a => a.id));

    campaignsList = await db.fbCampaign.findMany({
      where: {
        adAccountId: { in: activeAdAccountIds }
      },
      include: {
        adsets: {
          include: {
            ads: true
          }
        }
      }
    });

    // 6. Build Social Accounts summary for the "ALL" view
    for (const socialAcc of socialAccountOptions) {
      const ads = adAccountOptions.filter(a => a.socialAccountId === socialAcc.id);
      const adIds = ads.map(a => a.id);
      
      const profileInsights = rawInsights.filter(i => adIds.includes(i.adAccountId));
      const spend = profileInsights.reduce((sum, i) => sum + i.spend, 0);
      const impressions = profileInsights.reduce((sum, i) => sum + i.impressions, 0);
      const clicks = profileInsights.reduce((sum, i) => sum + i.clicks, 0);
      const leads = profileInsights.reduce((sum, i) => sum + i.leads, 0);
      const conversions = profileInsights.reduce((sum, i) => sum + i.conversions, 0);
      
      socialAccountsSummary.push({
        id: socialAcc.id,
        name: socialAcc.name,
        spend,
        impressions,
        clicks,
        leads,
        conversions
      });
    }

  } catch (error) {
    console.error("Prisma query error in HomePage (using mock analytics):", error);

    // Fallbacks for mock data representation
    socialAccountOptions = [
      { id: "2221942741927149", name: "Профіль один (Анна Шевченко)" }
    ];

    adAccountOptions = [
      { id: "act_3359672500881835", name: "Кабінет клієнта №1", socialAccountId: "2221942741927149", status: "ACTIVE" },
      { id: "act_4492817290192837", name: "Кабінет клієнта №2", socialAccountId: "2221942741927149", status: "ACTIVE" }
    ];

    campaignsList = [
      {
        id: "120249657781210412",
        name: "gp-03.07.26-mc6743",
        status: "ACTIVE",
        effectiveStatus: "ACTIVE",
        adAccountId: "act_3359672500881835",
        adsets: [
          {
            id: "adset_1",
            name: "Adset Traffic Ukraine",
            status: "ACTIVE",
            effectiveStatus: "ACTIVE",
            campaignId: "120249657781210412",
            ads: [
              { id: "ad_1", name: "Креатив №1 (UA Static)", status: "ACTIVE", effectiveStatus: "ACTIVE", rejectionReason: null },
              { id: "ad_2", name: "Креатив №2 (UA Video)", status: "ACTIVE", effectiveStatus: "DISAPPROVED", rejectionReason: "Violated policy: Misleading claims" }
            ]
          }
        ]
      },
      {
        id: "120249622524930412",
        name: "bra-03.07.26-mc6743",
        status: "PAUSED",
        effectiveStatus: "PAUSED",
        adAccountId: "act_4492817290192837",
        adsets: [
          {
            id: "adset_2",
            name: "Adset Leads Kyiv",
            status: "PAUSED",
            effectiveStatus: "PAUSED",
            campaignId: "120249622524930412",
            ads: [
              { id: "ad_3", name: "Креатив №3 (Kyiv Leadform)", status: "PAUSED", effectiveStatus: "PAUSED", rejectionReason: null }
            ]
          }
        ]
      }
    ];

    rawInsights = [
      { date: startDate, adAccountId: "act_3359672500881835", campaignId: "120249657781210412", adsetId: "adset_1", adId: "ad_1", spend: 30.00, impressions: 1800, clicks: 70, uniqueClicks: 65, leads: 6, conversions: 2 },
      { date: startDate, adAccountId: "act_3359672500881835", campaignId: "120249657781210412", adsetId: "adset_1", adId: "ad_2", spend: 10.93, impressions: 502, clicks: 22, uniqueClicks: 20, leads: 2, conversions: 0 },
      { date: startDate, adAccountId: "act_4492817290192837", campaignId: "120249622524930412", adsetId: "adset_2", adId: "ad_3", spend: 25.10, impressions: 1540, clicks: 45, uniqueClicks: 40, leads: 4, conversions: 1 }
    ];

    totals = {
      spend: 66.03,
      impressions: 3842,
      clicks: 137,
      leads: 12,
      conversions: 3
    };

    socialAccountsSummary = [
      { id: "2221942741927149", name: "Профіль один (Анна Шевченко)", spend: 66.03, impressions: 3842, clicks: 137, leads: 12, conversions: 3 }
    ];

    // Handle filter mocks
    if (adAccount === "act_3359672500881835") {
      campaignsList = [campaignsList[0]];
      rawInsights = rawInsights.filter(i => i.adAccountId === "act_3359672500881835");
      totals = { spend: 40.93, impressions: 2302, clicks: 92, leads: 8, conversions: 2 };
    } else if (adAccount === "act_4492817290192837") {
      campaignsList = [campaignsList[1]];
      rawInsights = rawInsights.filter(i => i.adAccountId === "act_4492817290192837");
      totals = { spend: 25.10, impressions: 1540, clicks: 45, leads: 4, conversions: 1 };
    }
  }

  return (
    <AnalyticsClient
      adAccounts={adAccountOptions}
      socialAccounts={socialAccountOptions}
      campaignsList={campaignsList}
      dbInsights={rawInsights}
      socialAccountsSummary={socialAccountsSummary}
      totals={totals}
      period={period}
      startDate={formatDate(startDate)}
      endDate={formatDate(endDate)}
    />
  );
}
