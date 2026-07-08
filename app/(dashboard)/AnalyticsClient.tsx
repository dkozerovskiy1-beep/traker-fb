"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface AdAccountOption {
  id: string;
  name: string;
  socialAccountId: string;
  status: string;
}

interface SocialAccountOption {
  id: string;
  name: string;
}

interface FbAd {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  rejectionReason: string | null;
}

interface FbAdSet {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  ads: FbAd[];
}

interface FbCampaign {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  adAccountId: string;
  adsets: FbAdSet[];
}

interface InsightItem {
  date: any;
  adAccountId: string;
  campaignId: string;
  adsetId: string;
  adId: string;
  spend: number;
  impressions: number;
  clicks: number;
  uniqueClicks: number;
  leads: number;
  conversions: number;
}

interface SocialAccountSummaryItem {
  id: string;
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
}

interface AnalyticsClientProps {
  adAccounts: AdAccountOption[];
  socialAccounts: SocialAccountOption[];
  campaignsList: FbCampaign[];
  dbInsights: InsightItem[];
  socialAccountsSummary: SocialAccountSummaryItem[];
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    conversions: number;
  };
  period: string;
  startDate: string;
  endDate: string;
}

export default function AnalyticsClient({
  adAccounts,
  socialAccounts,
  campaignsList,
  dbInsights,
  socialAccountsSummary,
  totals,
  period,
  startDate,
  endDate
}: AnalyticsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State from URL
  const selectedSocial = searchParams.get("socialAccount") || "ALL";
  const selectedAdAccount = searchParams.get("adAccount") || "ALL";
  const selectedPeriod = searchParams.get("period") || "today";

  // Custom date picker states
  const [customStart, setCustomStart] = useState(searchParams.get("customStartDate") || startDate);
  const [customEnd, setCustomEnd] = useState(searchParams.get("customEndDate") || endDate);
  const [showDatePicker, setShowDatePicker] = useState(selectedPeriod === "custom");

  // Expand/Collapse state for Campaigns and AdSets
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [expandedAdSets, setExpandedAdSets] = useState<Record<string, boolean>>({});

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAdSet = (id: string) => {
    setExpandedAdSets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter Ad Accounts based on selected Social Account
  const filteredAdAccounts = selectedSocial === "ALL"
    ? adAccounts
    : adAccounts.filter(ad => ad.socialAccountId === selectedSocial);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    
    // Reset adAccount if socialAccount changes
    if (key === "socialAccount") {
      params.delete("adAccount");
    }

    if (key === "period") {
      if (value === "custom") {
        setShowDatePicker(true);
        params.set("customStartDate", customStart);
        params.set("customEndDate", customEnd);
      } else {
        setShowDatePicker(false);
        params.delete("customStartDate");
        params.delete("customEndDate");
      }
    }

    router.push(`/?${params.toString()}`);
  };

  const applyCustomDates = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set("customStartDate", customStart);
    params.set("customEndDate", customEnd);
    router.push(`/?${params.toString()}`);
  };

  // Helper metric calculations
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpr = totals.leads > 0 ? totals.spend / totals.leads : 0;

  // Helper function to sum insights for a specific target filter
  const getSummedMetrics = (filterFn: (i: InsightItem) => boolean) => {
    const matched = dbInsights.filter(filterFn);
    const spend = matched.reduce((sum, i) => sum + i.spend, 0);
    const impressions = matched.reduce((sum, i) => sum + i.impressions, 0);
    const clicks = matched.reduce((sum, i) => sum + i.clicks, 0);
    const leads = matched.reduce((sum, i) => sum + i.leads, 0);
    
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const cpl = leads > 0 ? spend / leads : 0;

    return { spend, impressions, clicks, leads, ctr, cpc, cpm, cpl };
  };

  return (
    <>
      {/* Top Title & Filters Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1>Панель аналітики</h1>
          <p className="subtitle">Показники ефективності реклами у Facebook</p>
        </div>
        
        {/* Date Selector & Picker */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
          <div style={{ display: "flex", gap: "8px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "4px", borderRadius: "var(--radius-sm)" }}>
            {["today", "yesterday", "last7", "last30", "month", "custom"].map((p) => {
              const labelMap: Record<string, string> = {
                today: "Сьогодні",
                yesterday: "Вчора",
                last7: "7 днів",
                last30: "30 днів",
                month: "Цей місяць",
                custom: "Кастомний"
              };
              const active = selectedPeriod === p;
              return (
                <button
                  key={p}
                  className="btn"
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    backgroundColor: active ? "var(--bg-input)" : "transparent",
                    color: active ? "var(--color-accent)" : "var(--text-secondary)",
                    border: "none",
                    boxShadow: "none"
                  }}
                  onClick={() => updateFilters("period", p)}
                >
                  {labelMap[p]}
                </button>
              );
            })}
          </div>

          {showDatePicker && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "var(--radius-sm)" }}>
              <input
                type="date"
                className="form-input"
                style={{ padding: "5px", fontSize: "12px", width: "130px", color: "white" }}
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>до</span>
              <input
                type="date"
                className="form-input"
                style={{ padding: "5px", fontSize: "12px", width: "130px", color: "white" }}
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
              <button
                className="btn btn-primary"
                style={{ padding: "6px 12px", fontSize: "12px" }}
                onClick={applyCustomDates}
              >
                Застосувати
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selectors Row */}
      <div className="card" style={{ display: "flex", gap: "16px", padding: "16px", flexWrap: "wrap" }}>
        {/* Social Account Selector */}
        <div className="form-group" style={{ flex: 1, minWidth: "200px" }}>
          <label className="form-label">Соціальний акаунт</label>
          <select
            className="form-input"
            value={selectedSocial}
            onChange={(e) => updateFilters("socialAccount", e.target.value)}
            style={{ color: "white", cursor: "pointer" }}
          >
            <option value="ALL">Всі соц. акаунти</option>
            {socialAccounts.map(sa => (
              <option key={sa.id} value={sa.id}>{sa.name}</option>
            ))}
          </select>
        </div>

        {/* Ad Account Selector */}
        <div className="form-group" style={{ flex: 1, minWidth: "200px" }}>
          <label className="form-label">Рекламний кабінет</label>
          <select
            className="form-input"
            value={selectedAdAccount}
            onChange={(e) => updateFilters("adAccount", e.target.value)}
            style={{ color: "white", cursor: "pointer" }}
            disabled={selectedSocial === "ALL"}
          >
            <option value="ALL">Всі рекламні кабінети ({filteredAdAccounts.length})</option>
            {filteredAdAccounts.map(ad => (
              <option key={ad.id} value={ad.id}>{ad.name} {ad.status !== "ACTIVE" ? `(${ad.status})` : ""}</option>
            ))}
          </select>
          {selectedSocial === "ALL" && (
            <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              Оберіть конкретний соціальний акаунт, щоб відфільтрувати кабінети
            </span>
          )}
        </div>
      </div>

      {/* High-Level Metric Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
        {/* Spend */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600", letterSpacing: "0.5px" }}>Витрати</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "white" }}>${totals.spend.toFixed(2)}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Повний бюджет</span>
        </div>

        {/* Impressions */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600", letterSpacing: "0.5px" }}>Покази</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "white" }}>{totals.impressions.toLocaleString()}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Загальна видимість</span>
        </div>

        {/* Clicks */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600", letterSpacing: "0.5px" }}>Кліки</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "white" }}>{totals.clicks.toLocaleString()}</span>
          <span style={{ fontSize: "11px", color: "var(--text-success)" }}>CTR: {ctr.toFixed(2)}%</span>
        </div>

        {/* Leads */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600", letterSpacing: "0.5px" }}>Результати (Ліди)</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-success)" }}>{totals.leads} Leads</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>CPL: ${cpr.toFixed(2)}</span>
        </div>

        {/* CPM */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600", letterSpacing: "0.5px" }}>CPM</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "white" }}>${cpm.toFixed(2)}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>CPC: ${cpc.toFixed(2)}</span>
        </div>
      </div>

      {/* Main Table Segment */}
      <div className="card">
        {selectedSocial === "ALL" ? (
          /* LEVEL 1: SOCIAL PROFILES OVERVIEW */
          <>
            <h2 style={{ marginBottom: "20px" }}>Зведення по соціальних акаунтах</h2>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Соціальний акаунт</th>
                    <th>Витрати</th>
                    <th>Покази</th>
                    <th>Кліки</th>
                    <th>CTR</th>
                    <th>CPC</th>
                    <th>CPM</th>
                    <th>Результати (Ліди)</th>
                    <th>CPR (CPL)</th>
                    <th>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {socialAccountsSummary.map((sa) => {
                    const saCTR = sa.impressions > 0 ? (sa.clicks / sa.impressions) * 100 : 0;
                    const saCPC = sa.clicks > 0 ? sa.spend / sa.clicks : 0;
                    const saCPM = sa.impressions > 0 ? (sa.spend / sa.impressions) * 1000 : 0;
                    const saCPL = sa.leads > 0 ? sa.spend / sa.leads : 0;

                    return (
                      <tr key={sa.id}>
                        <td>
                          <strong style={{ color: "white", fontSize: "14px" }}>{sa.name}</strong>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>ID: {sa.id}</div>
                        </td>
                        <td>${sa.spend.toFixed(2)}</td>
                        <td>{sa.impressions.toLocaleString()}</td>
                        <td>{sa.clicks.toLocaleString()}</td>
                        <td>{saCTR.toFixed(2)}%</td>
                        <td>${saCPC.toFixed(2)}</td>
                        <td>${saCPM.toFixed(2)}</td>
                        <td>
                          <strong style={{ color: "var(--color-success)" }}>{sa.leads}</strong>
                        </td>
                        <td>{sa.leads > 0 ? `$${saCPL.toFixed(2)}` : "—"}</td>
                        <td>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                            onClick={() => updateFilters("socialAccount", sa.id)}
                          >
                            Детальніше
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* LEVEL 2 & 3: CAMPAIGNS -> ADSETS -> ADS HIERARCHICAL DRILL DOWN */
          <>
            <h2 style={{ marginBottom: "20px" }}>Ієрархія рекламних кампаній</h2>
            {campaignsList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
                Немає завантажених кампаній для цього акаунта. Переконайтеся, що синхронізація (крон) успішно завершилася.
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: "35%" }}>Назва об'єкта</th>
                      <th style={{ width: "12%" }}>Статус</th>
                      <th>Витрати</th>
                      <th>Покази</th>
                      <th>Кліки</th>
                      <th>CTR</th>
                      <th>CPC</th>
                      <th>CPM</th>
                      <th>Ліди</th>
                      <th>CPL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignsList.map((campaign) => {
                      const cMetrics = getSummedMetrics((i) => i.campaignId === campaign.id);
                      const isCampExpanded = !!expandedCampaigns[campaign.id];

                      return (
                        <tr key={campaign.id} style={{ borderLeft: "3px solid var(--color-emerald)" }}>
                          {/* CAMPAIGN ROW */}
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <button
                                onClick={() => toggleCampaign(campaign.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--text-secondary)",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  padding: "4px"
                                }}
                              >
                                {isCampExpanded ? "▼" : "▶"}
                              </button>
                              <div>
                                <span style={{ fontWeight: "700", color: "white" }}>📁 Кампанія: {campaign.name}</span>
                                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>ID: {campaign.id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${campaign.effectiveStatus === "ACTIVE" ? "badge-success" : "badge-error"}`} style={{ fontSize: "10px", padding: "3px 6px" }}>
                              {campaign.effectiveStatus === "ACTIVE" ? "Активна" : "Пауза"}
                            </span>
                          </td>
                          <td style={{ fontWeight: "600" }}>${cMetrics.spend.toFixed(2)}</td>
                          <td>{cMetrics.impressions.toLocaleString()}</td>
                          <td>{cMetrics.clicks.toLocaleString()}</td>
                          <td>{cMetrics.ctr.toFixed(2)}%</td>
                          <td>${cMetrics.cpc.toFixed(2)}</td>
                          <td>${cMetrics.cpm.toFixed(2)}</td>
                          <td>
                            <strong style={{ color: "var(--color-success)" }}>{cMetrics.leads}</strong>
                          </td>
                          <td>{cMetrics.leads > 0 ? `$${cMetrics.cpl.toFixed(2)}` : "—"}</td>
                        </tr>
                      );
                    })}

                    {/* ADSET & ADS ROWS (Drawn recursively if expanded) */}
                    {campaignsList.flatMap((campaign) => {
                      const isCampExpanded = !!expandedCampaigns[campaign.id];
                      if (!isCampExpanded) return [];

                      return campaign.adsets.flatMap((adset) => {
                        const sMetrics = getSummedMetrics((i) => i.adsetId === adset.id);
                        const isAdsetExpanded = !!expandedAdSets[adset.id];

                        const adsetRow = (
                          <tr key={adset.id} style={{ backgroundColor: "rgba(255, 255, 255, 0.015)", borderLeft: "3px solid #818cf8" }}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "24px" }}>
                                <button
                                  onClick={() => toggleAdSet(adset.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-secondary)",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    padding: "2px"
                                  }}
                                >
                                  {isAdsetExpanded ? "▼" : "▶"}
                                </button>
                                <div>
                                  <span style={{ fontWeight: "600", color: "#e0e7ff" }}>↳ 📦 Група: {adset.name}</span>
                                  <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>ID: {adset.id}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${adset.effectiveStatus === "ACTIVE" ? "badge-success" : "badge-error"}`} style={{ fontSize: "9px", padding: "2px 5px", opacity: 0.85 }}>
                                {adset.effectiveStatus === "ACTIVE" ? "Активна" : "Пауза"}
                              </span>
                            </td>
                            <td>${sMetrics.spend.toFixed(2)}</td>
                            <td>{sMetrics.impressions.toLocaleString()}</td>
                            <td>{sMetrics.clicks.toLocaleString()}</td>
                            <td>{sMetrics.ctr.toFixed(2)}%</td>
                            <td>${sMetrics.cpc.toFixed(2)}</td>
                            <td>${sMetrics.cpm.toFixed(2)}</td>
                            <td>
                              <strong style={{ color: "var(--color-success)" }}>{sMetrics.leads}</strong>
                            </td>
                            <td>{sMetrics.leads > 0 ? `$${sMetrics.cpl.toFixed(2)}` : "—"}</td>
                          </tr>
                        );

                        if (!isAdsetExpanded) return [adsetRow];

                        const adRows = adset.ads.map((ad) => {
                          const aMetrics = getSummedMetrics((i) => i.adId === ad.id);
                          const isRejected = ad.effectiveStatus === "DISAPPROVED";

                          return (
                            <tr key={ad.id} style={{ backgroundColor: "rgba(255, 255, 255, 0.03)", borderLeft: "3px solid #cbd5e1" }}>
                              <td>
                                <div style={{ paddingLeft: "52px" }}>
                                  <div style={{ color: "#f1f5f9" }}>↳ ↳ 🖼️ Оголошення: {ad.name}</div>
                                  <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>ID: {ad.id}</div>
                                  {isRejected && ad.rejectionReason && (
                                    <div style={{ fontSize: "10px", color: "#f87171", marginTop: "4px", backgroundColor: "rgba(248, 113, 113, 0.05)", borderLeft: "2px solid #ef4444", padding: "4px 8px" }}>
                                      🚫 Причина відхилення: {ad.rejectionReason}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${
                                  ad.effectiveStatus === "ACTIVE" ? "badge-success" : 
                                  isRejected ? "badge-error" : "badge-secondary"
                                }`} style={{ fontSize: "9px", padding: "2px 5px", textTransform: "capitalize" }}>
                                  {ad.effectiveStatus === "ACTIVE" ? "Активне" : 
                                   isRejected ? "Відхилено" : "Пауза"}
                                </span>
                              </td>
                              <td>${aMetrics.spend.toFixed(2)}</td>
                              <td>{aMetrics.impressions.toLocaleString()}</td>
                              <td>{aMetrics.clicks.toLocaleString()}</td>
                              <td>{aMetrics.ctr.toFixed(2)}%</td>
                              <td>${aMetrics.cpc.toFixed(2)}</td>
                              <td>${aMetrics.cpm.toFixed(2)}</td>
                              <td>
                                <strong style={{ color: "var(--color-success)" }}>{aMetrics.leads}</strong>
                              </td>
                              <td>{aMetrics.leads > 0 ? `$${aMetrics.cpl.toFixed(2)}` : "—"}</td>
                            </tr>
                          );
                        });

                        return [adsetRow, ...adRows];
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
