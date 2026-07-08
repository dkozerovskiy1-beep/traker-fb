import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import {
  getAdAccountInsights,
  getManagedAdAccounts,
  getAdAccountCampaigns,
  getAdAccountAdSets,
  getAdAccountAds
} from "@/app/lib/facebook";
import { sendTelegramAlert } from "@/app/lib/telegram";

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
      let fbAdAccounts: any[] = [];
      try {
        fbAdAccounts = await getManagedAdAccounts(socialAccount.accessToken);
      } catch (err) {
        console.error(`Failed to fetch latest ad accounts for socialAccount ${socialAccount.id}:`, err);
        fbAdAccounts = socialAccount.adAccounts.map(ad => ({
          id: ad.id,
          name: ad.name,
          currency: ad.currency,
          timezone_name: ad.timezoneName,
          account_status: ad.status === "ACTIVE" ? 1 : 2,
          amount_spent: 0
        }));
      }

      for (const fbAdAcc of fbAdAccounts) {
        const oldAdAccount = socialAccount.adAccounts.find(ad => ad.id === fbAdAcc.id);
        const newStatus = fbAdAcc.account_status === 1 ? "ACTIVE" : "DISABLED";

        if (oldAdAccount && oldAdAccount.status === "ACTIVE" && newStatus === "DISABLED") {
          await sendTelegramAlert(
            `⚠️ <b>[VartaFlow Alert] РЕКЛАМНИЙ КАБІНЕТ ЗАБАНЕНО</b>\n\n` +
            `• <b>Профіль:</b> ${socialAccount.name}\n` +
            `• <b>Кабінет:</b> ${fbAdAcc.name || fbAdAcc.id} (ID: <code>${fbAdAcc.id}</code>)\n` +
            `• <b>Статус:</b> DISABLED (Деактивовано)`
          );
        }

        const adAccount = await db.fbAdAccount.upsert({
          where: { id: fbAdAcc.id },
          update: {
            name: fbAdAcc.name || `Ad Account ${fbAdAcc.id}`,
            currency: fbAdAcc.currency || "USD",
            timezoneName: fbAdAcc.timezone_name || "UTC",
            status: newStatus
          },
          create: {
            id: fbAdAcc.id,
            name: fbAdAcc.name || `Ad Account ${fbAdAcc.id}`,
            currency: fbAdAcc.currency || "USD",
            timezoneName: fbAdAcc.timezone_name || "UTC",
            status: newStatus,
            socialAccountId: socialAccount.id
          }
        });

        if (adAccount.status !== "ACTIVE") continue;

        try {
          const [fbCampaigns, fbAdSets, fbAds] = await Promise.all([
            getAdAccountCampaigns(adAccount.id, socialAccount.accessToken),
            getAdAccountAdSets(adAccount.id, socialAccount.accessToken),
            getAdAccountAds(adAccount.id, socialAccount.accessToken)
          ]);

          for (const camp of fbCampaigns) {
            await db.fbCampaign.upsert({
              where: { id: camp.id },
              update: {
                name: camp.name,
                status: camp.status,
                effectiveStatus: camp.effective_status,
                updatedAt: new Date()
              },
              create: {
                id: camp.id,
                name: camp.name,
                status: camp.status,
                effectiveStatus: camp.effective_status,
                adAccountId: adAccount.id
              }
            });
          }

          for (const adset of fbAdSets) {
            const campExists = fbCampaigns.some(c => c.id === adset.campaign_id);
            if (!campExists && adset.campaign_id) {
              await db.fbCampaign.upsert({
                where: { id: adset.campaign_id },
                update: { updatedAt: new Date() },
                create: {
                  id: adset.campaign_id,
                  name: `Campaign ${adset.campaign_id}`,
                  adAccountId: adAccount.id
                }
              });
            }

            await db.fbAdSet.upsert({
              where: { id: adset.id },
              update: {
                name: adset.name,
                status: adset.status,
                effectiveStatus: adset.effective_status,
                updatedAt: new Date()
              },
              create: {
                id: adset.id,
                name: adset.name,
                status: adset.status,
                effectiveStatus: adset.effective_status,
                campaignId: adset.campaign_id
              }
            });
          }

          for (const ad of fbAds) {
            const adsetExists = fbAdSets.some(a => a.id === ad.adset_id);
            if (!adsetExists && ad.adset_id) {
              await db.fbAdSet.upsert({
                where: { id: ad.adset_id },
                update: { updatedAt: new Date() },
                create: {
                  id: ad.adset_id,
                  name: `Adset ${ad.adset_id}`,
                  campaignId: fbAdSets.find(s => s.id === ad.adset_id)?.campaign_id || "unknown"
                }
              });
            }

            const oldAd = await db.fbAd.findUnique({
              where: { id: ad.id }
            });

            if (oldAd && oldAd.effectiveStatus !== "DISAPPROVED" && ad.effective_status === "DISAPPROVED") {
              await sendTelegramAlert(
                `🚫 <b>[VartaFlow Alert] ОГОЛОШЕННЯ ВІДХИЛЕНО META</b>\n\n` +
                `• <b>Профіль:</b> ${socialAccount.name}\n` +
                `• <b>Кабінет:</b> ${adAccount.name} (ID: <code>${adAccount.id}</code>)\n` +
                `• <b>Оголошення:</b> ${ad.name} (ID: <code>${ad.id}</code>)\n` +
                `• <b>Статус:</b> DISAPPROVED (Відхилено)\n` +
                `• <b>Причина:</b> ${ad.rejection_reason || "Причина не вказана"}`
              );
            }

            if (oldAd && oldAd.effectiveStatus === "DISAPPROVED" && ad.effective_status === "ACTIVE") {
              await sendTelegramAlert(
                `✅ <b>[VartaFlow Alert] ОГОЛОШЕННЯ ПРОЙШЛО МОДЕРАЦІЮ</b>\n\n` +
                `• <b>Профіль:</b> ${socialAccount.name}\n` +
                `• <b>Кабінет:</b> ${adAccount.name} (ID: <code>${adAccount.id}</code>)\n` +
                `• <b>Оголошення:</b> ${ad.name} (ID: <code>${ad.id}</code>)\n` +
                `• <b>Статус:</b> ACTIVE (Активне)`
              );
            }

            await db.fbAd.upsert({
              where: { id: ad.id },
              update: {
                name: ad.name,
                status: ad.status,
                effectiveStatus: ad.effective_status,
                rejectionReason: ad.rejection_reason,
                updatedAt: new Date()
              },
              create: {
                id: ad.id,
                name: ad.name,
                status: ad.status,
                effectiveStatus: ad.effective_status,
                rejectionReason: ad.rejection_reason,
                adsetId: ad.adset_id
              }
            });
          }

          const insights = await getAdAccountInsights(
            adAccount.id,
            socialAccount.accessToken,
            startDateStr,
            endDateStr
          );

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
