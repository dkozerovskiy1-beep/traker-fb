"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../../components/ToastProvider";

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

interface UserSettings {
  id: string;
  email: string;
  name: string | null;
  telegramChatId: string | null;
  alertOnBans: boolean;
  alertOnRejections: boolean;
  alertOnApprovals: boolean;
  alertOnComments: boolean;
}

interface AccountsClientProps {
  initialInviteLinks: InviteLinkItem[];
  socialAccounts: FbSocialAccountItem[];
  currentUser: UserSettings | null;
  botUsername: string;
}

export default function AccountsClient({
  initialInviteLinks,
  socialAccounts,
  currentUser,
  botUsername
}: AccountsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, confirm, prompt } = useToast();
  const errorParam = searchParams.get("error");
  const successParam = searchParams.get("success");

  // Notification toggles states
  const [telegramChatId, setTelegramChatId] = useState<string | null>(currentUser?.telegramChatId || null);
  const [alertOnBans, setAlertOnBans] = useState(currentUser?.alertOnBans ?? true);
  const [alertOnRejections, setAlertOnRejections] = useState(currentUser?.alertOnRejections ?? true);
  const [alertOnApprovals, setAlertOnApprovals] = useState(currentUser?.alertOnApprovals ?? false);
  const [alertOnComments, setAlertOnComments] = useState(currentUser?.alertOnComments ?? true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Invite states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isOneTime, setIsOneTime] = useState(true);
  const [newInviteUrl, setNewInviteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (errorParam) {
      toast.error("Помилка підключення Facebook: " + decodeURIComponent(errorParam));
    }
    if (successParam) {
      toast.success("Facebook акаунт успішно підключено!");
    }
  }, [errorParam, successParam, toast]);

  // Handle setting updates
  const handleToggleChange = async (key: string, value: boolean) => {
    if (!currentUser) return;

    // Local optimistic update
    if (key === "alertOnBans") setAlertOnBans(value);
    if (key === "alertOnRejections") setAlertOnRejections(value);
    if (key === "alertOnApprovals") setAlertOnApprovals(value);
    if (key === "alertOnComments") setAlertOnComments(value);

    try {
      await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  };

  const handleDisconnectTelegram = async () => {
    const confirmed = await confirm("Ви впевнені, що хочете вимкнути Telegram-сповіщення?", { title: "Telegram-сповіщення" });
    if (!confirmed) return;
    setIsUpdatingSettings(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnectTelegram: true })
      });
      const data = await res.json();
      if (data.success) {
        setTelegramChatId(null);
        toast.success("Telegram-сповіщення вимкнено!");
      }
    } catch (err) {
      console.error("Failed to disconnect Telegram:", err);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

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
        toast.success("Інвайт-посилання створено!");
        router.refresh();
      } else {
        toast.error("Помилка при створенні інвайту: " + data.error);
      }
    } catch (err: any) {
      toast.error("Сталася помилка: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Посилання скопійовано у буфер обміну!");
  };

  const handleDeleteInvite = async (id: string, name: string) => {
    const confirmed = await confirm(`Ви дійсно бажаєте видалити інвайт-посилання "${name || "Без опису"}"?`, { title: "Видалення інвайту" });
    if (!confirmed) return;
    try {
      const res = await fetch("/api/invite/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Інвайт-посилання успішно видалено!");
        router.refresh();
      } else {
        toast.error("Помилка видалення: " + data.error);
      }
    } catch (err: any) {
      toast.error("Сталася помилка: " + err.message);
    }
  };

  const handleDisconnectAccount = async (id: string, name: string) => {
    const confirmed = await confirm(`Ви дійсно хочете відключити та видалити Facebook-акаунт "${name}"? Це призведе до видалення всієї пов'язаної статистики та кабінетів.`, { title: "Відключення акаунта" });
    if (!confirmed) return;
    try {
      const res = await fetch("/api/accounts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Акаунт успішно видалено!");
        router.refresh();
      } else {
        toast.error("Помилка видалення: " + data.error);
      }
    } catch (err: any) {
      toast.error("Сталася помилка: " + err.message);
    }
  };

  const handleRenameAccount = async (id: string, currentName: string) => {
    const newName = await prompt("Введіть нове ім'я для акаунта:", { title: "Редагування імені", defaultValue: currentName });
    if (newName === null) return;
    if (!newName.trim()) return toast.error("Ім'я не може бути порожнім");

    try {
      const res = await fetch("/api/accounts/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: newName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Ім'я успішно оновлено!");
        router.refresh();
      } else {
        toast.error("Помилка при оновленні імені: " + data.error);
      }
    } catch (err: any) {
      toast.error("Сталася помилка: " + err.message);
    }
  };

  return (
    <>
      {/* Title Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Керування профілями</h1>
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
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <div style={{ fontWeight: "600" }}>{acc.name}</div>
                              <button
                                onClick={() => handleRenameAccount(acc.id, acc.name)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--text-muted)",
                                  cursor: "pointer",
                                  padding: "2px",
                                  display: "flex",
                                  alignItems: "center",
                                  transition: "color 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-emerald)"}
                                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                                title="Редагувати ім'я"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </button>
                            </div>
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
                          <button
                            className="btn btn-danger"
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                            onClick={() => handleDisconnectAccount(acc.id, acc.name)}
                          >
                            Видалити
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

      {/* NEW: Scalable & beautiful Telegram Alert Settings Section */}
      {currentUser && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h2>Налаштування Telegram-сповіщень</h2>
            <p className="subtitle">Отримуйте миттєві сповіщення про бани, відхилення або коментарі</p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            alignItems: "start",
            borderTop: "1px solid var(--border-color)",
            paddingTop: "20px"
          }}>
            {/* Left side: Toggles */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                Обирайте, які сповіщення отримувати:
              </span>

              {[
                { key: "alertOnBans", label: "🚫 Блокування рекламних кабінетів", state: alertOnBans },
                { key: "alertOnRejections", label: "❌ Відхилення оголошень (Disapproved)", state: alertOnRejections },
                { key: "alertOnApprovals", label: "✅ Успішне проходження модерації оголошеннями", state: alertOnApprovals },
                { key: "alertOnComments", label: "💬 Автоматична модерація спам-коментарів", state: alertOnComments }
              ].map(toggle => (
                <div key={toggle.key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="checkbox"
                    id={toggle.key}
                    checked={toggle.state}
                    disabled={!telegramChatId}
                    onChange={(e) => handleToggleChange(toggle.key, e.target.checked)}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "var(--color-accent)",
                      cursor: telegramChatId ? "pointer" : "not-allowed",
                      opacity: telegramChatId ? 1 : 0.4
                    }}
                  />
                  <label
                    htmlFor={toggle.key}
                    style={{
                      fontSize: "14px",
                      cursor: telegramChatId ? "pointer" : "not-allowed",
                      color: telegramChatId ? "white" : "var(--text-muted)",
                      fontWeight: "500"
                    }}
                  >
                    {toggle.label}
                  </label>
                </div>
              ))}
              {!telegramChatId && (
                <span style={{ fontSize: "12px", color: "var(--color-warning)" }}>
                  ⚠️ Спочатку підключіть ваш Telegram праворуч, щоб активувати вибір сповіщень.
                </span>
              )}
            </div>

            {/* Right side: Telegram Bot Linking status */}
            <div style={{
              backgroundColor: "rgba(8, 10, 16, 0.4)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center"
            }}>
              {telegramChatId ? (
                <>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", color: "white", marginBottom: "4px" }}>Telegram підключено!</h3>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      Бот буде надсилати сповіщення у ваш особистий чат (ID: <code>{telegramChatId}</code>)
                    </p>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: "6px 16px", fontSize: "12px" }}
                    disabled={isUpdatingSettings}
                    onClick={handleDisconnectTelegram}
                  >
                    Вимкнути сповіщення
                  </button>
                </>
              ) : (
                <>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" strokeWidth="2.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", color: "white", marginBottom: "4px" }}>Підписка на сповіщення</h3>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", maxWidth: "260px" }}>
                      Підключіть Telegram, щоб миттєво дізнаватися про проблеми чи бани кабінетів.
                    </p>
                  </div>
                  <a
                    href={`https://t.me/${botUsername}?start=${currentUser.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ textDecoration: "none", color: "#04060a" }}
                  >
                    🔗 Підключити Telegram
                  </a>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    Відкриє Telegram та прив'яже ваш акаунт автоматично
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                  <th>Дії</th>
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
                      <td>
                        <button
                          className="btn btn-danger"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => handleDeleteInvite(link.id, link.description || "")}
                        >
                          Видалити
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
