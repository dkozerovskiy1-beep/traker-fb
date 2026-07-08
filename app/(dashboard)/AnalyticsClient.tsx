"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface AdAccountOption {
  id: string;
  name: string;
  socialAccountId: string;
}

interface SocialAccountOption {
  id: string;
  name: string;
}

interface CampaignRow {
  campaignId: string;
  campaignName: string;
  status: string;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  conversions: number;
}

interface AnalyticsClientProps {
  adAccounts: AdAccountOption[];
  socialAccounts: SocialAccountOption[];
  campaigns: CampaignRow[];
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    conversions: number;
  };
}

export default function AnalyticsClient({
  adAccounts,
  socialAccounts,
  campaigns,
  totals
}: AnalyticsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State from URL
  const selectedSocial = searchParams.get("socialAccount") || "ALL";
  const selectedAdAccount = searchParams.get("adAccount") || "ALL";
  const selectedPeriod = searchParams.get("period") || "today";

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
    
    // Reset adAccount if socialAccount changes and the selected adAccount is not in the new socialAccount
    if (key === "socialAccount") {
      params.delete("adAccount");
    }

    router.push(`/?${params.toString()}`);
  };

  // Helper metric calculations
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpr = totals.leads > 0 ? totals.spend / totals.leads : 0;

  return (
    <>
      {/* Top Title & Filters Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1>Панель аналітики</h1>
          <p className="subtitle">Показники ефективності реклами у Facebook</p>
        </div>
        
        {/* Date Selector */}
        <div style={{ display: "flex", gap: "8px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "4px", borderRadius: "var(--radius-sm)" }}>
          {["today", "yesterday", "last7", "last30", "month"].map((p) => {
            const labelMap: Record<string, string> = {
              today: "Сьогодні",
              yesterday: "Вчора",
              last7: "7 днів",
              last30: "30 днів",
              month: "Цей місяць"
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
              <option key={sa.id} value={sa.id}>{sa.name} (ID: {sa.id})</option>
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
          >
            <option value="ALL">Всі рекламні кабінети</option>
            {filteredAdAccounts.map(ad => (
              <option key={ad.id} value={ad.id}>{ad.name} (ID: {ad.id})</option>
            ))}
          </select>
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

      {/* Campaigns Detailed Table */}
      <div className="card">
        <h2 style={{ marginBottom: "20px" }}>Ефективність Кампаній</h2>
        {campaigns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
            Немає статистики за обраний період.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Назва Кампанії</th>
                  <th>Статус</th>
                  <th>Покази</th>
                  <th>Кліки</th>
                  <th>Витрати</th>
                  <th>CTR</th>
                  <th>CPC</th>
                  <th>CPM</th>
                  <th>Рез-ти (Ліди)</th>
                  <th>CPR (CPL)</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const cCTR = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
                  const cCPC = c.clicks > 0 ? c.spend / c.clicks : 0;
                  const cCPM = c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0;
                  const cCPR = c.leads > 0 ? c.spend / c.leads : 0;

                  return (
                    <tr key={c.campaignId}>
                      <td>
                        <div>
                          <div style={{ fontWeight: "600" }}>{c.campaignName}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>ID: {c.campaignId}</div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${c.status === "ACTIVE" ? "badge-success" : "badge-error"}`}>
                          {c.status === "ACTIVE" ? "Активна" : "Пауза"}
                        </span>
                      </td>
                      <td>{c.impressions.toLocaleString()}</td>
                      <td>{c.clicks.toLocaleString()}</td>
                      <td>${c.spend.toFixed(2)}</td>
                      <td>{cCTR.toFixed(2)}%</td>
                      <td>${cCPC.toFixed(2)}</td>
                      <td>${cCPM.toFixed(2)}</td>
                      <td>
                        <strong style={{ color: "var(--color-success)" }}>{c.leads}</strong>
                      </td>
                      <td>
                        {c.leads > 0 ? `$${cCPR.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
