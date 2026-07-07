"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface InviteLinkItem {
  id: string;
  description: string | null;
  isOneTime: boolean;
  createdAt: Date;
  usedAt: Date | null;
  usedByFbId: string | null;
}

interface FbSocialAccountItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: string;
  tokenExpiresAt: Date | null;
  adAccounts: { id: string; name: string; currency: string; status: string; spend: number }[];
  pages: { id: string; name: string }[];
}

interface AccountsClientProps {
  initialInviteLinks: InviteLinkItem[];
  socialAccounts: FbSocialAccountItem[];
}

export default function AccountsClient({ initialInviteLinks, socialAccounts }: AccountsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const successParam = searchParams.get("success");

  useEffect(() => {
    if (errorParam) {
      alert("Помилка підключення Facebook: " + decodeURIComponent(errorParam));
    }
    if (successParam) {
      alert("Facebook акаунт успішно підключено!");
    }
  }, [errorParam, successParam]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isOneTime, setIsOneTime] = useState(true);
  const [newInviteUrl, setNewInviteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/invite/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, isOneTime })
      });
      const data = await res.json();
      if (data.success) {
        setNewInviteUrl(data.inviteUrl);
        setDescription("");
        router.refresh(); // Refresh parent Server Component to fetch new links
      } else {
        alert("Помилка при створенні інвайту: " + data.error);
      }
    } catch (err: any) {
      alert("Сталася помилка: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Посилання скопійовано у буфер обміну!");
  };

  return (
    <>
      {/* Top Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Facebook Акаунти</h1>
          <p className="subtitle">Підключені соціальні профілі та рекламні кабінети</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setNewInviteUrl(""); setIsModalOpen(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Створити інвайт-посилання</span>
        </button>
      </div>

      {/* Connected Accounts Table */}
      <div className="card">
        <h2 style={{ marginBottom: "20px" }}>Підключені профілі</h2>
        {socialAccounts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
            Немає підключених акаунтів. Створіть посилання-запрошення вище та авторизуйте акаунт.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ім'я</th>
                  <th>Рекламні кабінети</th>
                  <th>Бізнес-сторінки</th>
                  <th>Загальні витрати</th>
                  <th>Токен</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {socialAccounts.map((acc) => {
                  const totalSpend = acc.adAccounts.reduce((sum, ad) => sum + ad.spend, 0);
                  const activeCabinets = acc.adAccounts.filter(ad => ad.status === "ACTIVE").length;

                  return (
                    <tr key={acc.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {acc.avatarUrl ? (
                            <img
                              src={acc.avatarUrl}
                              alt={acc.name}
                              style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--border-color)" }}
                            />
                          ) : (
                            <div style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              backgroundColor: "var(--border-color-glow)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "600",
                              color: "var(--color-accent)"
                            }}>
                              {acc.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: "600" }}>{acc.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>ID: {acc.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "13px" }}>
                          <strong>{activeCabinets}</strong> активних / {acc.adAccounts.length} всього
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                            {acc.adAccounts.slice(0, 2).map(ad => ad.name).join(", ")}
                            {acc.adAccounts.length > 2 && "..."}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "13px" }}>
                          <strong>{acc.pages.length}</strong> сторінок
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                            {acc.pages.slice(0, 2).map(p => p.name).join(", ")}
                            {acc.pages.length > 2 && "..."}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: "600" }}>${totalSpend.toFixed(2)}</span>
                      </td>
                      <td>
                        <span className={`badge ${acc.status === "ACTIVE" ? "badge-success" : "badge-error"}`}>
                          {acc.status === "ACTIVE" ? "Активний" : "Неактивний"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                            onClick={() => router.push(`/?socialAccount=${acc.id}`)}
                          >
                            Статистика
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Links History */}
      <div className="card">
        <h2 style={{ marginBottom: "20px" }}>Історія запрошень</h2>
        {initialInviteLinks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "14px" }}>
            Немає створених посилань.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Опис</th>
                  <th>Тип</th>
                  <th>Дата створення</th>
                  <th>Статус</th>
                  <th>Посилання</th>
                </tr>
              </thead>
              <tbody>
                {initialInviteLinks.map((link) => {
                  const inviteUrlString = typeof window !== "undefined" 
                    ? `${window.location.protocol}//${window.location.host}/invite/${link.id}`
                    : `/invite/${link.id}`;

                  const isUsed = !!link.usedAt;

                  return (
                    <tr key={link.id}>
                      <td>{link.description || "Без опису"}</td>
                      <td>{link.isOneTime ? "Одноразове" : "Багаторазове"}</td>
                      <td>{new Date(link.createdAt).toLocaleDateString("uk-UA")}</td>
                      <td>
                        {isUsed ? (
                          <span className="badge badge-success">Використано</span>
                        ) : (
                          <span className="badge badge-warning">Активне</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => copyToClipboard(inviteUrlString)}
                        >
                          Копіювати посилання
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invite Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Створити інвайт-посилання</h2>
              <button style={{ cursor: "pointer", fontSize: "20px" }} onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            {!newInviteUrl ? (
              <form onSubmit={handleCreateInvite} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                  Надішліть це посилання власнику Facebook акаунта. Він перейде за ним, авторизується — і його рекламні кабінети з'являться у вашому дашборді.
                </p>

                <div className="form-group">
                  <label className="form-label">Опис запрошення</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Наприклад: Кабінет клієнта ТОВ Ромашка"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                  <input
                    type="checkbox"
                    id="isOneTime"
                    checked={isOneTime}
                    onChange={(e) => setIsOneTime(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "var(--color-accent)" }}
                  />
                  <label htmlFor="isOneTime" style={{ fontSize: "14px", cursor: "pointer" }}>
                    Одноразове посилання (після використання стане недійсним)
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Скасувати
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? "Генерація..." : "Генерувати"}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                  Посилання успішно згенеровано! Скопіюйте його та надішліть власнику акаунта.
                </p>

                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    readOnly
                    value={newInviteUrl}
                    style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                  <button className="btn btn-secondary" onClick={() => copyToClipboard(newInviteUrl)}>
                    Копіювати
                  </button>
                  <button className="btn btn-primary" onClick={() => setIsModalOpen(false)}>
                    Готово
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
