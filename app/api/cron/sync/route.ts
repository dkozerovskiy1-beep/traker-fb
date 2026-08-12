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
import {
  getKyivDateString,
  getKyivTodayStr,
  parseKyivDateToUTC,
  roundCurrency
} from "@/app/lib/dates";

export async function GET(req: Request) {
  // 1. Authorize cron request
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // In production, we compare the Bearer token or URL ?secret query parameter with our CRON_SECRET.
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret");

  if (process.env.NODE_ENV === "production" && cronSecret) {
    const isHeaderAuth = authHeader === `Bearer ${cronSecret}`;
    const isQueryAuth = querySecret === cronSecret;
    
    if (!isHeaderAuth && !isQueryAuth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Limit sync range (default: last 3 days in GMT+3 timezone)
    // Syncing 3 days (today, yesterday, day before) guarantees catching late-night finalized Meta spend.
    const daysParam = searchParams.get("days");
    const daysToSync = daysParam ? parseInt(daysParam) : 3;

    const endDateStr = getKyivTodayStr();
    const syncStartDate = new Date();
    syncStartDate.setTime(syncStartDate.getTime() - (daysToSync - 1) * 24 * 60 * 60 * 1000);
    const startDateStr = getKyivDateString(syncStartDate);

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
    const allStoryIdsRaw: { storyId: string; pageId: string }[] = [];

    // Parallelize processing of all active social accounts
    await Promise.all(
      activeSocialAccounts.map(async (socialAccount) => {
        let fbAdAccounts: any[] = [];
        try {
          fbAdAccounts = await getManagedAdAccounts(socialAccount.accessToken);
        } catch (err) {
          console.error(`Failed to fetch latest ad accounts for socialAccount ${socialAccount.id}:`, err);
          // If the access token is invalid, expired, or revoked, subsequent Graph API calls for its 
          // campaigns, adsets, ads, and insights will also fail. To prevent dozens of hanging HTTP 
          // requests that cause Vercel timeouts, we skip this social account entirely.
          return;
        }

        // Parallelize processing of all managed ad accounts for this social account
        await Promise.all(
          fbAdAccounts.map(async (fbAdAcc) => {
            const oldAdAccount = socialAccount.adAccounts.find(ad => ad.id === fbAdAcc.id);
            // account_status: 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, 100 = PENDING_CLOSURE, 101 = CLOSED
            const isMetaDisabled = fbAdAcc.account_status === 2 || fbAdAcc.account_status === 100 || fbAdAcc.account_status === 101;
            const newStatus = isMetaDisabled ? "DISABLED" : "ACTIVE";

            if (oldAdAccount && oldAdAccount.status === "ACTIVE" && newStatus === "DISABLED") {
              const user = (socialAccount as any).user;
              if (user && user.telegramChatId && user.alertOnBans) {
                await sendTelegramAlert(
                  `⚠️ <b>[VartaFlow Alert] РЕКЛАМНИЙ КАБІНЕТ ЗАБАНЕНО</b>\n\n` +
                  `• <b>Профіль:</b> ${socialAccount.name}\n` +
                  `• <b>Кабінет:</b> ${fbAdAcc.name || fbAdAcc.id} (ID: <code>${fbAdAcc.id}</code>)\n` +
                  `• <b>Статус:</b> DISABLED (Деактивовано)`,
                  user.telegramChatId
                ).catch(e => console.error("Failed to send telegram ban alert:", e));
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

            // SMART OPTIMIZATION TO PREVENT META GRAPH API 400 ERRORS & RATE LIMIT REJECTIONS:
            // If the account was ALREADY disabled on previous sync AND was synced at least once after being disabled,
            // or if it has zero spent lifetime and is disabled, WE SKIP querying campaigns/ads/insights!
            // This guarantees Meta Graph API is queried ONCE when an account gets banned to catch final spend, then skipped.
            const isAlreadySyncedDisabled =
              newStatus === "DISABLED" &&
              oldAdAccount &&
              oldAdAccount.status === "DISABLED" &&
              oldAdAccount.lastSyncedAt != null &&
              (oldAdAccount.disabledAt == null || oldAdAccount.lastSyncedAt >= oldAdAccount.disabledAt);

            const isZeroSpendDisabled = newStatus === "DISABLED" && parseFloat(fbAdAcc.amount_spent || "0") === 0;

            if (isAlreadySyncedDisabled || isZeroSpendDisabled) {
              await db.fbAdAccount.update({
                where: { id: adAccount.id },
                data: { lastSyncedAt: new Date() }
              }).catch(() => {});
              return; // Stop processing this disabled account to save API calls
            }

            try {
              const [fbCampaigns, fbAdSets, fbAds, insights] = await Promise.all([
                getAdAccountCampaigns(adAccount.id, socialAccount.accessToken),
                getAdAccountAdSets(adAccount.id, socialAccount.accessToken),
                getAdAccountAds(adAccount.id, socialAccount.accessToken),
                getAdAccountInsights(adAccount.id, socialAccount.accessToken, startDateStr, endDateStr)
              ]);

              // Ensure fallback dummy campaign exists to avoid foreign key constraint errors
              await db.fbCampaign.upsert({
                where: { id: "unknown" },
                update: { adAccountId: adAccount.id, updatedAt: new Date() },
                create: { id: "unknown", name: "Невідома кампанія", adAccountId: adAccount.id }
              }).catch(() => {});

              // Parallelize campaign updates
              await Promise.all(
                fbCampaigns.map(camp =>
                  db.fbCampaign.upsert({
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
                  })
                )
              );

              // Find missing campaigns that adsets might reference and upsert them first
              const missingCampaignIds = Array.from(new Set(
                fbAdSets
                  .filter(adset => adset.campaign_id && !fbCampaigns.some(c => c.id === adset.campaign_id))
                  .map(adset => adset.campaign_id)
              ));

              if (missingCampaignIds.length > 0) {
                await Promise.all(
                  missingCampaignIds.map(campId =>
                    db.fbCampaign.upsert({
                      where: { id: campId },
                      update: { updatedAt: new Date() },
                      create: {
                        id: campId,
                        name: `Campaign ${campId}`,
                        adAccountId: adAccount.id
                      }
                    })
                  )
                );
              }

              // Ensure fallback dummy adset exists to avoid foreign key constraint errors
              await db.fbAdSet.upsert({
                where: { id: "unknown" },
                update: { updatedAt: new Date() },
                create: { id: "unknown", name: "Невідома група оголошень", campaignId: "unknown" }
              }).catch(() => {});

              // Parallelize adsets updates
              await Promise.all(
                fbAdSets.map(adset =>
                  db.fbAdSet.upsert({
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
                      campaignId: adset.campaign_id || "unknown"
                    }
                  })
                )
              );

              // Find missing adsets that ads might reference and upsert them first
              const missingAdSetIds = Array.from(new Set(
                fbAds
                  .filter(ad => ad.adset_id && !fbAdSets.some(a => a.id === ad.adset_id))
                  .map(ad => ad.adset_id)
              ));

              if (missingAdSetIds.length > 0) {
                await Promise.all(
                  missingAdSetIds.map(adsetId => {
                    const parentCampId = fbAdSets.find(s => s.id === adsetId)?.campaign_id || "unknown";
                    return db.fbAdSet.upsert({
                      where: { id: adsetId },
                      update: { updatedAt: new Date() },
                      create: {
                        id: adsetId,
                        name: `Adset ${adsetId}`,
                        campaignId: parentCampId
                      }
                    });
                  })
                );
              }

              // Pre-fetch existing ads to avoid loop-internal findUnique queries
              const adIds = fbAds.map(ad => ad.id);
              const existingAds = await db.fbAd.findMany({
                where: { id: { in: adIds } }
              });

              // Process and collect Telegram alerts
              const telegramAlertPromises: Promise<any>[] = [];
              const user = (socialAccount as any).user;

              for (const ad of fbAds) {
                const oldAd = existingAds.find(a => a.id === ad.id);

                if (user && user.telegramChatId) {
                  // Determine if the ad was created recently (last 24 hours) to notify on first sync
                  const createdTime = ad.created_time ? new Date(ad.created_time) : new Date();
                  const isRecentAd = (Date.now() - createdTime.getTime()) < 24 * 60 * 60 * 1000;

                  // 1. Alert on Rejections (Disapproved ads)
                  let shouldAlertRejection = false;
                  if (ad.effective_status === "DISAPPROVED" && user.alertOnRejections) {
                    if (oldAd) {
                      // Alert if status changed to DISAPPROVED
                      shouldAlertRejection = oldAd.effectiveStatus !== "DISAPPROVED";
                    } else {
                      // New ad found, alert only if it was created recently to avoid spamming old history
                      shouldAlertRejection = isRecentAd;
                    }
                  }

                  if (shouldAlertRejection) {
                    telegramAlertPromises.push(
                      sendTelegramAlert(
                        `🚫 <b>[VartaFlow Alert] ОГОЛОШЕННЯ ВІДХИЛЕНО META</b>\n\n` +
                        `• <b>Профіль:</b> ${socialAccount.name}\n` +
                        `• <b>Кабінет:</b> ${adAccount.name} (ID: <code>${adAccount.id}</code>)\n` +
                        `• <b>Оголошення:</b> ${ad.name} (ID: <code>${ad.id}</code>)\n` +
                        `• <b>Статус:</b> DISAPPROVED (Відхилено)\n` +
                        `• <b>Причина:</b> ${ad.rejection_reason || "Причина не вказана"}`,
                        user.telegramChatId
                      ).catch(err => console.error("Failed to send telegram alert:", err))
                    );
                  }

                  // 2. Alert on Approvals (Active ads)
                  let shouldAlertApproval = false;
                  if (ad.effective_status === "ACTIVE" && user.alertOnApprovals) {
                    if (oldAd) {
                      // Alert if it transitioned to ACTIVE from a moderation state or disapproval
                      const wasPendingOrDisapproved = 
                        oldAd.effectiveStatus === "PENDING_REVIEW" || 
                        oldAd.effectiveStatus === "IN_PROCESS" || 
                        oldAd.effectiveStatus === "DISAPPROVED";
                      shouldAlertApproval = wasPendingOrDisapproved;
                    } else {
                      // New ad found, alert only if it was created recently to avoid spamming old history
                      shouldAlertApproval = isRecentAd;
                    }
                  }

                  if (shouldAlertApproval) {
                    telegramAlertPromises.push(
                      sendTelegramAlert(
                        `✅ <b>[VartaFlow Alert] ОГОЛОШЕННЯ ПРОЙШЛО МОДЕРАЦІЮ</b>\n\n` +
                        `• <b>Профіль:</b> ${socialAccount.name}\n` +
                        `• <b>Кабінет:</b> ${adAccount.name} (ID: <code>${adAccount.id}</code>)\n` +
                        `• <b>Оголошення:</b> ${ad.name} (ID: <code>${ad.id}</code>)\n` +
                        `• <b>Статус:</b> ACTIVE (Активне)`,
                        user.telegramChatId
                      ).catch(err => console.error("Failed to send telegram alert:", err))
                    );
                  }
                }

                // Collect active ad creative story IDs for comment tracking
                if (ad.status === "ACTIVE" && ad.creative?.effective_object_story_id) {
                  const storyId = ad.creative.effective_object_story_id;
                  const pageId = storyId.split("_")[0];
                  allStoryIdsRaw.push({ storyId, pageId });
                }
              }

              // Trigger Telegram alerts in parallel
              if (telegramAlertPromises.length > 0) {
                await Promise.all(telegramAlertPromises);
              }

              // Parallelize ads updates
              await Promise.all(
                fbAds.map(ad =>
                  db.fbAd.upsert({
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
                      adsetId: ad.adset_id || "unknown"
                    }
                  })
                )
              );
              // Filter out empty zero-activity insight rows to save DB writes
              const activeInsights = insights.filter(i => i.spend > 0 || i.impressions > 0 || i.clicks > 0 || i.leads > 0);

              // Parallelize daily insights upserts
              await Promise.all(
                activeInsights.map(insight => {
                  const dateObj = parseKyivDateToUTC(insight.date);
                  const spendVal = roundCurrency(insight.spend);
                  const ctrVal = insight.impressions > 0 ? roundCurrency((insight.clicks / insight.impressions) * 100) : 0;
                  const cpcVal = insight.clicks > 0 ? roundCurrency(spendVal / insight.clicks) : 0;
                  const cpmVal = insight.impressions > 0 ? roundCurrency((spendVal / insight.impressions) * 1000) : 0;

                  return db.dailyInsight.upsert({
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
                      spend: spendVal,
                      impressions: insight.impressions,
                      clicks: insight.clicks,
                      uniqueClicks: insight.uniqueClicks,
                      leads: insight.leads,
                      conversions: insight.conversions,
                      ctr: ctrVal,
                      cpc: cpcVal,
                      cpm: cpmVal,
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
                      spend: spendVal,
                      impressions: insight.impressions,
                      clicks: insight.clicks,
                      uniqueClicks: insight.uniqueClicks,
                      leads: insight.leads,
                      conversions: insight.conversions,
                      ctr: ctrVal,
                      cpc: cpcVal,
                      cpm: cpmVal
                    }
                  });
                })
              );
              syncedCampaignsCount += insights.length;

              // 5. Evaluate Automation Rules for this Ad Account
              const rules = await db.automationRule.findMany({
                where: { adAccountId: adAccount.id, isActive: true }
              });

              if (rules.length > 0) {
                const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
                const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

                // Fetch today's insights once per ad account
                const allInsightsForToday = await db.dailyInsight.findMany({
                  where: {
                    adAccountId: adAccount.id,
                    date: { gte: todayStart, lte: todayEnd }
                  }
                });

                for (const rule of rules) {
                  const insightsForToday = rule.targetId === "ALL" 
                    ? allInsightsForToday 
                    : allInsightsForToday.filter(i => i.campaignId === rule.targetId);

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
              }

              // Update last synced date on Ad Account
              await db.fbAdAccount.update({
                where: { id: adAccount.id },
                data: { lastSyncedAt: new Date() }
              });

              syncedAccountsCount++;
            } catch (adAccError: any) {
              console.error(`Error syncing insights for ad account ${adAccount.id}:`, adAccError?.message || adAccError);
              // Do NOT mark ad account as DISABLED on transient API error! Just update lastSyncedAt.
              await db.fbAdAccount.update({
                where: { id: adAccount.id },
                data: { lastSyncedAt: new Date() }
              }).catch(() => {});
            }
          })
        );
      })
    );

    // Deduplicate collected story IDs
    const activeAdStoryIdsMap = new Map<string, string>();
    for (const item of allStoryIdsRaw) {
      activeAdStoryIdsMap.set(item.storyId, item.pageId);
    }
    const activeAdStoryIds = Array.from(activeAdStoryIdsMap.entries()).map(([storyId, pageId]) => ({ storyId, pageId }));

    // ═══════════════════════════════════════════════════════
    // PHASE 2: PROACTIVE COMMENT FETCHING & MODERATION (ADS STORY POSTS)
    // ═══════════════════════════════════════════════════════
    let syncedCommentsCount = 0;
    let moderatedCommentsCount = 0;

    const skipComments = searchParams.get("skipComments") === "true";

    if (!skipComments) {
      await Promise.all(
        activeAdStoryIds.map(async (item) => {
        // Find the page in DB to get the page access token
        const page = await db.fbPage.findUnique({
          where: { id: item.pageId },
          include: {
            socialAccount: {
              include: { user: true }
            }
          }
        });

        if (!page) return; // Skip if we don't manage this page

        try {
          const commentsUrl = `https://graph.facebook.com/v21.0/${item.storyId}/comments?fields=id,message,from,created_time,is_hidden&limit=100&access_token=${page.accessToken}`;
          const commentsRes = await fetch(commentsUrl);
          if (!commentsRes.ok) return;

          const commentsData = await commentsRes.json();
          const fbComments = commentsData.data || [];

          // Pre-fetch active moderation rules for this page once
          const activeRules = await db.moderationRule.findMany({
            where: {
              isActive: true,
              userId: page.socialAccount.userId,
              OR: [
                { pageId: page.id },
                { pageId: null }
              ]
            }
          });

          // Parallelize comment upserts and moderation processing
          await Promise.all(
            fbComments.map(async (fbComment: any) => {
              // Don't process comments from the page itself
              if (fbComment.from?.id === page.id) return;

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

              if (activeRules.length === 0) return;

              // Safety limit: only auto-moderate comments created within the last 24 hours
              if (fbComment.created_time) {
                const commentTime = new Date(fbComment.created_time).getTime();
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                if (commentTime < oneDayAgo) return;
              }

              // Check if this comment already has a moderation log
              const existingLog = await db.moderationLog.findFirst({
                where: { commentId: fbComment.id }
              });
              if (existingLog) return;

              for (const rule of activeRules) {
                let matchesRule = false;
                const commentText = fbComment.message || "";

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
                  const result = await moderateFacebookComment(
                    fbComment.id,
                    rule.action as "HIDE" | "DELETE",
                    page.accessToken
                  );

                  if (result.success) {
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
                      ).catch(e => console.error("Failed to send telegram moderation alert:", e));
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
            })
          );
        } catch (pageError) {
          console.error(`Error fetching comments for story ${item.storyId}:`, pageError);
        }
      })
    );
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
