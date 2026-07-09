import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import {
  getAdAccountInsights,
  getManagedAdAccounts,
  getAdAccountCampaigns,
  getAdAccountAdSets,
  getAdAccountAds,
  getPageRecentComments,
  moderateFacebookComment
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

    // 2. Fetch all active Facebook Social Accounts with User preferences
    const activeSocialAccounts = await db.fbSocialAccount.findMany({
      where: { status: "ACTIVE" },
      include: { 
        adAccounts: true,
        user: true
      }
    });

    let syncedAccountsCount = 0;
    let syncedCampaignsCount = 0;
    let triggeredRulesCount = 0;
    const activeAdStoryIds: { storyId: string; pageId: string }[] = [];

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
          const user = (socialAccount as any).user;
          if (user && user.telegramChatId && user.alertOnBans) {
            await sendTelegramAlert(
              `⚠️ <b>[VartaFlow Alert] РЕКЛАМНИЙ КАБІНЕТ ЗАБАНЕНО</b>\n\n` +
              `• <b>Профіль:</b> ${socialAccount.name}\n` +
              `• <b>Кабінет:</b> ${fbAdAcc.name || fbAdAcc.id} (ID: <code>${fbAdAcc.id}</code>)\n` +
              `• <b>Статус:</b> DISABLED (Деактивовано)`,
              user.telegramChatId
            );
          }
        }

        // Track disabledAt date when transitioning to DISABLED
        const disabledAtValue = (oldAdAccount && oldAdAccount.status === "ACTIVE" && newStatus === "DISABLED")
          ? new Date()
          : (newStatus === "ACTIVE" ? null : (oldAdAccount as any)?.disabledAt || null);

        const adAccount = await db.fbAdAccount.upsert({
          where: { id: fbAdAcc.id },
          update: {
            name: fbAdAcc.name || `Ad Account ${fbAdAcc.id}`,
            currency: fbAdAcc.currency || "USD",
            timezoneName: fbAdAcc.timezone_name || "UTC",
            status: newStatus,
            ...(disabledAtValue !== undefined ? { disabledAt: disabledAtValue } : {})
          },
          create: {
            id: fbAdAcc.id,
            name: fbAdAcc.name || `Ad Account ${fbAdAcc.id}`,
            currency: fbAdAcc.currency || "USD",
            timezoneName: fbAdAcc.timezone_name || "UTC",
            status: newStatus,
            socialAccountId: socialAccount.id,
            ...(newStatus === "DISABLED" ? { disabledAt: new Date() } : {})
          }
        });

        // Try to sync insights even for disabled/banned accounts to capture the final day's spend.
        // If Meta API blocks it, the try/catch will handle it gracefully.

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
              const user = (socialAccount as any).user;
              if (user && user.telegramChatId && user.alertOnRejections) {
                await sendTelegramAlert(
                  `🚫 <b>[VartaFlow Alert] ОГОЛОШЕННЯ ВІДХИЛЕНО META</b>\n\n` +
                  `• <b>Профіль:</b> ${socialAccount.name}\n` +
                  `• <b>Кабінет:</b> ${adAccount.name} (ID: <code>${adAccount.id}</code>)\n` +
                  `• <b>Оголошення:</b> ${ad.name} (ID: <code>${ad.id}</code>)\n` +
                  `• <b>Статус:</b> DISAPPROVED (Відхилено)\n` +
                  `• <b>Причина:</b> ${ad.rejection_reason || "Причина не вказана"}`,
                  user.telegramChatId
                );
              }
            }

            if (oldAd && oldAd.effectiveStatus === "DISAPPROVED" && ad.effective_status === "ACTIVE") {
              const user = (socialAccount as any).user;
              if (user && user.telegramChatId && user.alertOnApprovals) {
                await sendTelegramAlert(
                  `✅ <b>[VartaFlow Alert] ОГОЛОШЕННЯ ПРОЙШЛО МОДЕРАЦІЮ</b>\n\n` +
                  `• <b>Профіль:</b> ${socialAccount.name}\n` +
                  `• <b>Кабінет:</b> ${adAccount.name} (ID: <code>${adAccount.id}</code>)\n` +
                  `• <b>Оголошення:</b> ${ad.name} (ID: <code>${ad.id}</code>)\n` +
                  `• <b>Статус:</b> ACTIVE (Активне)`,
                  user.telegramChatId
                );
              }
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

            // Collect active ad creative story IDs for comment tracking
            if (ad.status === "ACTIVE" && ad.creative?.effective_object_story_id) {
              const storyId = ad.creative.effective_object_story_id;
              const pageId = storyId.split("_")[0];
              if (!activeAdStoryIds.some(item => item.storyId === storyId)) {
                activeAdStoryIds.push({ storyId, pageId });
              }
            }
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
                adsetName: insight.adsetName,
                adName: insight.adName,
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
                adsetName: insight.adsetName,
                adId: insight.adId || "null",
                adName: insight.adName,
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

    // ═══════════════════════════════════════════════════════
    // PHASE 2: PROACTIVE COMMENT FETCHING & MODERATION (ADS STORY POSTS)
    // ═══════════════════════════════════════════════════════
    let syncedCommentsCount = 0;
    let moderatedCommentsCount = 0;

    for (const item of activeAdStoryIds) {
      // Find the page in DB to get the page access token
      const page = await db.fbPage.findUnique({
        where: { id: item.pageId },
        include: {
          socialAccount: {
            include: { user: true }
          }
        }
      });

      if (!page) continue; // Skip if we don't manage this page

      try {
        const commentsUrl = `https://graph.facebook.com/v21.0/${item.storyId}/comments?fields=id,message,from,created_time,is_hidden&limit=100&access_token=${page.accessToken}`;
        const commentsRes = await fetch(commentsUrl);
        if (!commentsRes.ok) continue;

        const commentsData = await commentsRes.json();
        const fbComments = commentsData.data || [];

        for (const fbComment of fbComments) {
          // Don't process comments from the page itself
          if (fbComment.from?.id === page.id) continue;

          // Upsert comment into DB
          await db.fbComment.upsert({
            where: { fbCommentId: fbComment.id },
            update: {
              message: fbComment.message,
              isHidden: fbComment.is_hidden,
              status: fbComment.is_hidden ? "HIDDEN" : "VISIBLE",
              updatedAt: new Date()
            },
            create: {
              fbCommentId: fbComment.id,
              pageId: page.id,
              postId: item.storyId,
              message: fbComment.message,
              authorName: fbComment.from?.name || "Невідомий",
              authorFbId: fbComment.from?.id,
              isHidden: fbComment.is_hidden,
              status: fbComment.is_hidden ? "HIDDEN" : "VISIBLE",
              fbCreatedAt: fbComment.created_time ? new Date(fbComment.created_time) : null
            }
          });
          syncedCommentsCount++;

          // Check if this comment already has a moderation log
          const existingLog = await db.moderationLog.findFirst({
            where: { commentId: fbComment.id }
          });
          if (existingLog) continue;

          // Apply moderation rules
          const activeRules = await db.moderationRule.findMany({
            where: {
              isActive: true,
              OR: [
                { pageId: page.id },
                { pageId: null }
              ]
            }
          });

          for (const rule of activeRules) {
            let matchesRule = false;
            const commentText = fbComment.message;

            if (rule.type === "STOP_WORDS") {
              const stopWords = rule.keywords.split(",").map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
              const lowerComment = commentText.toLowerCase();
              matchesRule = stopWords.some(word => lowerComment.includes(word));
            } else if (rule.type === "LINKS") {
              const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
              matchesRule = linkRegex.test(commentText);
            } else if (rule.type === "TELEGRAM") {
              const tgRegex = /(t\.me|telegram\.me|@[\w_]{5,})/gi;
              matchesRule = tgRegex.test(commentText);
            } else if (rule.type === "HIDE_ALL") {
              matchesRule = true;
            }

            if (matchesRule && !fbComment.is_hidden) {
              const success = await moderateFacebookComment(
                fbComment.id,
                rule.action as "HIDE" | "DELETE",
                page.accessToken
              );

              if (success) {
                await db.moderationLog.create({
                  data: {
                    pageId: page.id,
                    postId: item.storyId,
                    commentId: fbComment.id,
                    commentText: fbComment.message,
                    authorName: fbComment.from?.name || "Невідомий",
                    actionTaken: rule.action === "HIDE" ? "HIDDEN" : "DELETED",
                    ruleMatched: rule.name
                  }
                });

                // Send Telegram alert if user has alertOnComments enabled
                const user = page.socialAccount.user;
                if (user && user.telegramChatId && user.alertOnComments) {
                  await sendTelegramAlert(
                    `💬 <b>[VartaFlow Alert] КОМЕНТАР МОДЕРОВАНО</b>\n\n` +
                    `• <b>Сторінка:</b> ${page.name}\n` +
                    `• <b>Автор:</b> ${fbComment.from?.name || "Невідомий"}\n` +
                    `• <b>Коментар:</b> <i>"${fbComment.message}"</i>\n` +
                    `• <b>Дія:</b> ${rule.action === "HIDE" ? "ПРИХОВАНО" : "ВИДАЛЕНО"}\n` +
                    `• <b>Правило:</b> ${rule.name}`,
                    user.telegramChatId
                  );
                }

                // Update comment status in DB
                await db.fbComment.update({
                  where: { fbCommentId: fbComment.id },
                  data: {
                    status: rule.action === "HIDE" ? "HIDDEN" : "DELETED",
                    isHidden: true
                  }
                });

                moderatedCommentsCount++;
                break; // Stop after first matching rule
              }
            }
          }
        }
      } catch (pageError) {
        console.error(`Error fetching comments for story ${item.storyId}:`, pageError);
      }
    }

    return NextResponse.json({
      success: true,
      syncedAccounts: syncedAccountsCount,
      syncedCampaigns: syncedCampaignsCount,
      triggeredRules: triggeredRulesCount,
      syncedComments: syncedCommentsCount,
      moderatedComments: moderatedCommentsCount
    });
  } catch (error: any) {
    console.error("Cron sync error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
