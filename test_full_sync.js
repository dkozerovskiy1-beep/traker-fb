const { db } = require("./app/lib/db");
const {
  getAdAccountInsights,
  getManagedAdAccounts,
  getAdAccountCampaigns,
  getAdAccountAdSets,
  getAdAccountAds,
  getPageRecentComments,
  moderateFacebookComment
} = require("./app/lib/facebook");
const { sendTelegramAlert } = require("./app/lib/telegram");

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

async function main() {
  const daysToSync = 2;
  const today = new Date();
  const syncStartDate = new Date();
  syncStartDate.setDate(today.getDate() - (daysToSync - 1));

  const startDateStr = formatDate(syncStartDate);
  const endDateStr = formatDate(today);

  console.log("Fetching active social accounts...");
  const activeSocialAccounts = await db.fbSocialAccount.findMany({
    where: { status: "ACTIVE" },
    include: { 
      adAccounts: true,
      user: true
    }
  });
  console.log(`Found ${activeSocialAccounts.length} active social accounts.`);

  let syncedAccountsCount = 0;
  let syncedCampaignsCount = 0;
  let triggeredRulesCount = 0;
  const allStoryIdsRaw = [];

  // 1. Process ad accounts and collect active creative story IDs
  await Promise.all(
    activeSocialAccounts.map(async (socialAccount) => {
      let fbAdAccounts = [];
      try {
        fbAdAccounts = await getManagedAdAccounts(socialAccount.accessToken);
      } catch (err) {
        console.log(`[SKIP] Account ${socialAccount.name}: ${err.message}`);
        return;
      }

      await Promise.all(
        fbAdAccounts.map(async (fbAdAcc) => {
          const oldAdAccount = socialAccount.adAccounts.find(ad => ad.id === fbAdAcc.id);
          const newStatus = fbAdAcc.account_status === 1 ? "ACTIVE" : "DISABLED";
          const disabledAtValue = (oldAdAccount && oldAdAccount.status === "ACTIVE" && newStatus === "DISABLED")
            ? new Date()
            : (newStatus === "ACTIVE" ? null : oldAdAccount?.disabledAt || null);

          const adAccount = await db.fbAdAccount.upsert({
            where: { id: fbAdAcc.id },
            update: {
              name: fbAdAcc.name || `Ad Account ${fbAdAcc.id}`,
              currency: fbAdAcc.currency || "USD",
              timezoneName: fbAdAcc.timezone_name || "UTC",
              status: newStatus,
              disabledAt: disabledAtValue
            },
            create: {
              id: fbAdAcc.id,
              name: fbAdAcc.name || `Ad Account ${fbAdAcc.id}`,
              currency: fbAdAcc.currency || "USD",
              timezoneName: fbAdAcc.timezone_name || "UTC",
              status: newStatus,
              socialAccountId: socialAccount.id,
              disabledAt: newStatus === "DISABLED" ? new Date() : null
            }
          });

          try {
            const [fbCampaigns, fbAdSets, fbAds] = await Promise.all([
              getAdAccountCampaigns(adAccount.id, socialAccount.accessToken),
              getAdAccountAdSets(adAccount.id, socialAccount.accessToken),
              getAdAccountAds(adAccount.id, socialAccount.accessToken)
            ]);

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

            // Adsets
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

            // Prefetch existing ads
            const adIds = fbAds.map(ad => ad.id);
            const existingAds = await db.fbAd.findMany({
              where: { id: { in: adIds } }
            });

            for (const ad of fbAds) {
              // Collect active ad creative story IDs for comment tracking
              if (ad.status === "ACTIVE" && ad.creative?.effective_object_story_id) {
                const storyId = ad.creative.effective_object_story_id;
                const pageId = storyId.split("_")[0];
                allStoryIdsRaw.push({ storyId, pageId });
              }
            }

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

            const insights = await getAdAccountInsights(
              adAccount.id,
              socialAccount.accessToken,
              startDateStr,
              endDateStr
            );

            await Promise.all(
              insights.map(insight => {
                const dateObj = new Date(insight.date);
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
              })
            );
            syncedCampaignsCount += insights.length;
            syncedAccountsCount++;
          } catch (adAccError) {
            console.error(`Error syncing insights for ad account ${adAccount.id}:`, adAccError);
          }
        })
      );
    })
  );

  const activeAdStoryIdsMap = new Map();
  for (const item of allStoryIdsRaw) {
    activeAdStoryIdsMap.set(item.storyId, item.pageId);
  }
  const activeAdStoryIds = Array.from(activeAdStoryIdsMap.entries()).map(([storyId, pageId]) => ({ storyId, pageId }));

  // Phase 2: Comments
  console.log(`Processing comment moderation for ${activeAdStoryIds.length} stories...`);
  let syncedCommentsCount = 0;
  let moderatedCommentsCount = 0;

  await Promise.all(
    activeAdStoryIds.map(async (item) => {
      const page = await db.fbPage.findUnique({
        where: { id: item.pageId },
        include: {
          socialAccount: {
            include: { user: true }
          }
        }
      });

      if (!page) return;

      try {
        const commentsUrl = `https://graph.facebook.com/v21.0/${item.storyId}/comments?fields=id,message,from,created_time,is_hidden&limit=100&access_token=${page.accessToken}`;
        const commentsRes = await fetch(commentsUrl);
        if (!commentsRes.ok) return;

        const commentsData = await commentsRes.json();
        const fbComments = commentsData.data || [];

        for (const fbComment of fbComments) {
          if (fbComment.from?.id === page.id) continue;

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
        }
      } catch (pageError) {
        console.error(`Error fetching comments for story ${item.storyId}:`, pageError);
      }
    })
  );

  console.log({
    success: true,
    syncedAccountsCount,
    syncedCampaignsCount,
    triggeredRulesCount,
    syncedCommentsCount,
    moderatedCommentsCount
  });
}

main()
  .catch(e => console.error("FATAL ERROR:", e))
  .finally(() => db.$disconnect());
