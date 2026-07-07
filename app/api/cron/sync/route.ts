import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getAdAccountInsights } from "@/app/lib/facebook";

// Helper to get formatted date string (YYYY-MM-DD)
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function GET(req: Request) {
  // 1. Authorize cron request
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // In production, we compare the Bearer token with our CRON_SECRET.
  // For local testing, we can bypass this if CRON_SECRET is not set.
  if (process.env.NODE_ENV === "production" && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const startDateStr = formatDate(thirtyDaysAgo);
    const endDateStr = formatDate(today);

    // 2. Fetch all active Facebook Social Accounts
    const activeSocialAccounts = await db.fbSocialAccount.findMany({
      where: { status: "ACTIVE" },
      include: { adAccounts: true }
    });

    let syncedAccountsCount = 0;
    let syncedCampaignsCount = 0;
    let triggeredRulesCount = 0;

    for (const socialAccount of activeSocialAccounts) {
      for (const adAccount of socialAccount.adAccounts) {
        if (adAccount.status !== "ACTIVE") continue;

        try {
          // 3. Fetch insights from FB Graph API for the last 30 days
          const insights = await getAdAccountInsights(
            adAccount.id,
            socialAccount.accessToken,
            startDateStr,
            endDateStr
          );

          // 4. Save insights to database (Upsert)
          for (const insight of insights) {
            const dateObj = new Date(insight.date);

            await db.dailyInsight.upsert({
              where: {
                date_adAccountId_campaignId_adsetId_adId: {
                  date: dateObj,
                  adAccountId: adAccount.id,
                  campaignId: insight.campaignId,
                  adsetId: insight.adsetId || "null",
                  adId: insight.adId || "null"
                }
              },
              update: {
                campaignName: insight.campaignName,
                spend: insight.spend,
                impressions: insight.impressions,
                clicks: insight.clicks,
                uniqueClicks: insight.uniqueClicks,
                leads: insight.leads,
                conversions: insight.conversions,
                ctr: insight.impressions > 0 ? (insight.clicks / insight.impressions) * 100 : 0,
                cpc: insight.clicks > 0 ? insight.spend / insight.clicks : 0,
                cpm: insight.impressions > 0 ? (insight.spend / insight.impressions) * 1000 : 0,
                updatedAt: new Date()
              },
              create: {
                date: dateObj,
                adAccountId: adAccount.id,
                campaignId: insight.campaignId,
                campaignName: insight.campaignName,
                adsetId: insight.adsetId || "null",
                adId: insight.adId || "null",
                spend: insight.spend,
                impressions: insight.impressions,
                clicks: insight.clicks,
                uniqueClicks: insight.uniqueClicks,
                leads: insight.leads,
                conversions: insight.conversions,
                ctr: insight.impressions > 0 ? (insight.clicks / insight.impressions) * 100 : 0,
                cpc: insight.clicks > 0 ? insight.spend / insight.clicks : 0,
                cpm: insight.impressions > 0 ? (insight.spend / insight.impressions) * 1000 : 0
              }
            });
            syncedCampaignsCount++;
          }

          // 5. Evaluate Automation Rules for this Ad Account
          const rules = await db.automationRule.findMany({
            where: { adAccountId: adAccount.id, isActive: true }
          });

          for (const rule of rules) {
            // Check metric: today's statistics
            const todayStart = new Date(today.setHours(0, 0, 0, 0));
            const todayEnd = new Date(today.setHours(23, 59, 59, 999));

            // Sum metrics for today for the target (e.g. specific Campaign, or overall Ad Account)
            const queryTargetFilter = rule.targetId === "ALL" 
              ? {} 
              : { campaignId: rule.targetId };

            const insightsForToday = await db.dailyInsight.findMany({
              where: {
                adAccountId: adAccount.id,
                date: { gte: todayStart, lte: todayEnd },
                ...queryTargetFilter
              }
            });

            // Calculate aggregated metric values
            let totalSpend = 0;
            let totalLeads = 0;

            for (const item of insightsForToday) {
              totalSpend += item.spend;
              totalLeads += item.leads;
            }

            const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

            // Determine if the rule triggers
            let isTriggered = false;

            if (rule.triggerMetric === "SPEND") {
              if (rule.triggerOperator === "GREATER_THAN" && totalSpend > rule.triggerValue) {
                isTriggered = true;
              } else if (rule.triggerOperator === "LESS_THAN" && totalSpend < rule.triggerValue) {
                isTriggered = true;
              }
            } else if (rule.triggerMetric === "CPL") {
              if (totalLeads > 0) { // Only evaluate CPL if we actually have leads
                if (rule.triggerOperator === "GREATER_THAN" && cpl > rule.triggerValue) {
                  isTriggered = true;
                } else if (rule.triggerOperator === "LESS_THAN" && cpl < rule.triggerValue) {
                  isTriggered = true;
                }
              }
            }

            // Execute action if triggered
            if (isTriggered) {
              // Pause campaign action
              if (rule.action === "PAUSE") {
                const targetCampaignIds = rule.targetId === "ALL" 
                  ? Array.from(new Set(insightsForToday.map(i => i.campaignId)))
                  : [rule.targetId];

                for (const campaignId of targetCampaignIds) {
                  // Pause campaign via Facebook Graph API
                  // POST https://graph.facebook.com/v21.0/{campaign_id}?status=PAUSED&access_token={token}
                  const pauseUrl = `https://graph.facebook.com/v21.0/${campaignId}?status=PAUSED&access_token=${socialAccount.accessToken}`;
                  const pauseRes = await fetch(pauseUrl, { method: "POST" });
                  
                  if (pauseRes.ok) {
                    console.log(`[RULE TRIGGERED] Successfully paused campaign ${campaignId} due to rule: ${rule.name}`);
                  } else {
                    const err = await pauseRes.json().catch(() => ({}));
                    console.error(`[RULE ERROR] Failed to pause campaign ${campaignId}:`, err.error?.message);
                  }
                }
                triggeredRulesCount++;
              }
            }
          }

          // Update last synced date on Ad Account
          await db.fbAdAccount.update({
            where: { id: adAccount.id },
            data: { lastSyncedAt: new Date() }
          });

          syncedAccountsCount++;
        } catch (adAccError) {
          console.error(`Error syncing insights for ad account ${adAccount.id}:`, adAccError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      syncedAccounts: syncedAccountsCount,
      syncedCampaigns: syncedCampaignsCount,
      triggeredRules: triggeredRulesCount
    });
  } catch (error: any) {
    console.error("Cron sync error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
