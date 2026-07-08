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

  // Date picker popover states
  const [customStart, setCustomStart] = useState(searchParams.get("customStartDate") || startDate);
  const [customEnd, setCustomEnd] = useState(searchParams.get("customEndDate") || endDate);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  // Base month index state for rendering the visual calendars
  const [baseMonth, setBaseMonth] = useState(() => {
    const initialDateStr = searchParams.get("customStartDate") || startDate;
    const d = new Date(initialDateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  });

  const handlePrevMonths = () => {
    setBaseMonth(new Date(baseMonth.getFullYear(), baseMonth.getMonth() - 1, 1));
  };

  const handleNextMonths = () => {
    setBaseMonth(new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 1));
  };

  const formatDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleDateClick = (dateStr: string) => {
    if (!customStart || (customStart && customEnd)) {
      setCustomStart(dateStr);
      setCustomEnd("");
    } else {
      const startT = new Date(customStart).getTime();
      const clickT = new Date(dateStr).getTime();
      if (clickT < startT) {
        setCustomStart(dateStr);
      } else {
        setCustomEnd(dateStr);
      }
    }
  };

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

    if (key === "period" && value !== "custom") {
      params.delete("customStartDate");
      params.delete("customEndDate");
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

  const formatDateStrUk = (dStr: string) => {
    if (!dStr) return "";
    const parts = dStr.split("-");
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dStr;
  };

  const getDateRangeLabel = () => {
    if (selectedPeriod === "today") return "Сьогодні";
    if (selectedPeriod === "yesterday") return "Вчора";
    if (selectedPeriod === "last7") return "Останні 7 днів";
    if (selectedPeriod === "last30") return "Останні 30 днів";
    if (selectedPeriod === "month") return "Цей місяць";
    if (selectedPeriod === "custom") {
      return `${formatDateStrUk(customStart)} - ${formatDateStrUk(customEnd)}`;
    }
    return "Вибір дат";
  };

  const renderMonthCalendar = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const monthNames = [
      "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
      "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
    ];

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const totalDays = new Date(year, month + 1, 0).getDate();

    const daysArray = [];
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push(new Date(year, month, i));
    }

    const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

    return (
      <div style={{ width: "220px" }}>
        <div style={{ display: "flex", justifyContent: "center", fontWeight: "700", color: "white", fontSize: "13px", marginBottom: "12px" }}>
          {monthNames[month]} {year}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", marginBottom: "8px" }}>
          {weekdays.map(d => (
            <span key={d} style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>{d}</span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {daysArray.map((dayDate, idx) => {
            if (!dayDate) return <div key={`empty-${idx}`} />;

            const dateStr = formatDateStr(dayDate);
            const isStart = customStart === dateStr;
            const isEnd = customEnd === dateStr;
            
            let isBetween = false;
            if (customStart && customEnd) {
              const dTime = dayDate.getTime();
              const startTime = new Date(customStart).getTime();
              const endTime = new Date(customEnd).getTime();
              isBetween = dTime > startTime && dTime < endTime;
            }

            const active = isStart || isEnd;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDateClick(dateStr)}
                style={{
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: active ? "700" : "500",
                  color: active ? "var(--bg-card)" : (isBetween ? "var(--color-accent)" : "#f1f5f9"),
                  backgroundColor: active 
                    ? "var(--color-accent)" 
                    : (isBetween ? "rgba(16, 185, 129, 0.15)" : "transparent"),
                  border: "none",
                  borderRadius: active ? "50%" : "4px",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
                onMouseEnter={(e) => {
                  if (!active && !isBetween) {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active && !isBetween) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {dayDate.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "8px" }}>
        <div>
          <h1>Панель аналітики</h1>
          <p className="subtitle">Показники ефективності реклами у Facebook</p>
        </div>
        
        {/* Unified Date Picker Popover */}
        <div style={{ position: "relative" }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "white",
              fontWeight: "600",
              cursor: "pointer",
              borderRadius: "var(--radius-sm)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{getDateRangeLabel()}</span>
            <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "4px" }}>{isDateDropdownOpen ? "▲" : "▼"}</span>
          </button>

          {isDateDropdownOpen && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 100,
              backgroundColor: "rgba(18, 18, 18, 0.98)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-color-glow)",
              boxShadow: "0 15px 40px rgba(0,0,0,0.8), 0 0 20px rgba(16, 185, 129, 0.08)",
              borderRadius: "10px",
              padding: "20px",
              display: "flex",
              gap: "20px",
              minWidth: "700px"
            }}>
              {/* Presets List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "160px", borderRight: "1px solid var(--border-color)", paddingRight: "16px" }}>
                <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px", letterSpacing: "0.5px" }}>Швидкі вибори</span>
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
                      type="button"
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        fontSize: "13px",
                        backgroundColor: active ? "rgba(16, 185, 129, 0.12)" : "transparent",
                        color: active ? "var(--color-accent)" : "var(--text-secondary)",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        fontWeight: active ? "600" : "500"
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = "white";
                          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = "var(--text-secondary)";
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                      onClick={() => {
                        updateFilters("period", p);
                        setIsDateDropdownOpen(false);
                      }}
                    >
                      {labelMap[p]}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Calendars */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                {/* Header with Prev/Next Controls */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px", marginBottom: "8px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "11px", minWidth: "auto" }}
                    onClick={handlePrevMonths}
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                    Вибір періоду
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "11px", minWidth: "auto" }}
                    onClick={handleNextMonths}
                  >
                    ▶
                  </button>
                </div>

                {/* Side by side calendars */}
                <div style={{ display: "flex", gap: "24px" }}>
                  {renderMonthCalendar(baseMonth)}
                  {renderMonthCalendar(new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 1))}
                </div>

                {/* Selected Dates Summary & Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    Період: <strong style={{ color: "white" }}>{customStart ? formatDateStrUk(customStart) : "—"}</strong> до <strong style={{ color: "white" }}>{customEnd ? formatDateStrUk(customEnd) : "—"}</strong>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => setIsDateDropdownOpen(false)}
                    >
                      Скасувати
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                      disabled={!customStart || !customEnd}
                      onClick={() => {
                        applyCustomDates();
                        setIsDateDropdownOpen(false);
                      }}
                    >
                      Оновити
                    </button>
                  </div>
                </div>
              </div>
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
