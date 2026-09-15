"use client";

import React, { useState, useEffect, Fragment } from "react";
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

interface FbAdAccountItem {
  id: string;
  name: string;
  clientTag?: string | null;
  currency: string;
  status: string;
  spend: number;
}

interface FbSocialAccountItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: string;
  tokenExpiresAt: Date | null;
  adAccounts: FbAdAccountItem[];
  pages: { id: string; name: string }[];
}

interface UserSettings {
  id: string;
  email: string;
  name: string | null;
  telegramChatId: string | null;
  exportApiKey?: string | null;
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

interface ReassignModalState {
  isOpen: boolean;
  adAccount: FbAdAccountItem | null;
  currentSocialId: string;
  currentSocialName: string;
  targetSocialId: string;
  clientTag: string;
  isSaving: boolean;
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
  const [exportApiKey, setExportApiKey] = useState<string | null>(currentUser?.exportApiKey || null);
  const [isGeneratingExportKey, setIsGeneratingExportKey] = useState(false);
  const [isExportCardExpanded, setIsExportCardExpanded] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Expanded ad accounts rows state
  const [expandedSocials, setExpandedSocials] = useState<Record<string, boolean>>({});

  // Reassign Ad Account Modal State
  const [reassignModal, setReassignModal] = useState<ReassignModalState>({
    isOpen: false,
    adAccount: null,
    currentSocialId: "",
    currentSocialName: "",
    targetSocialId: "",
    clientTag: "",
    isSaving: false
  });

  // Invite states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isOneTime, setIsOneTime] = useState(true);
  const [newInviteUrl, setNewInviteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const toggleExpandSocial = (socialId: string) => {
    setExpandedSocials(prev => ({
      ...prev,
      [socialId]: !prev[socialId]
    }));
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/accounts/sync-now", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Синхронізація успішна! Оновлено ${data.syncedAccounts || 0} кабінетів.`);
        router.refresh();
      } else {
        toast.error("Помилка синхронізації: " + (data.error || "Невідома помилка"));
      }
    } catch (err: any) {
      toast.error("Помилка запиту: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenReassignModal = (adAccount: FbAdAccountItem, social: FbSocialAccountItem) => {
    setReassignModal({
      isOpen: true,
      adAccount,
      currentSocialId: social.id,
      currentSocialName: social.name,
      targetSocialId: social.id,
      clientTag: adAccount.clientTag || "",
      isSaving: false
    });
  };

  const handleSaveReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModal.adAccount) return;

    setReassignModal(prev => ({ ...prev, isSaving: true }));
    try {
      const res = await fetch("/api/accounts/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId: reassignModal.adAccount.id,
          targetSocialAccountId: reassignModal.targetSocialId,
          clientTag: reassignModal.clientTag
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Рекламний кабінет успішно перенесено!");
        setReassignModal(prev => ({ ...prev, isOpen: false, isSaving: false }));
        router.refresh();
      } else {
        toast.error("Помилка перенесення: " + data.error);
        setReassignModal(prev => ({ ...prev, isSaving: false }));
      }
    } catch (err: any) {
      toast.error("Сталася помилка: " + err.message);
      setReassignModal(prev => ({ ...prev, isSaving: false }));
    }
  };

  const handleGenerateExportKey = async () => {
    if (exportApiKey) {
      const confirmed = await confirm(
        "Ви дійсно хочете створити новий API ключ? Старий ключ стане недійсним і перестане працювати на вашому VPS сервері!",
        { title: "Перегенерація API Ключа" }
      );
      if (!confirmed) return;
    }

    setIsGeneratingExportKey(true);
    try {
      const res = await fetch("/api/user/export-key", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setExportApiKey(data.apiKey);
        toast.success("API Ключ експорту успішно згенеровано!");
      } else {
        toast.error("Помилка генерації ключа: " + data.error);
      }
    } catch (err: any) {
      toast.error("Сталася помилка: " + err.message);
    } finally {
      setIsGeneratingExportKey(false);
    }
  };

  const handleEditClientTag = async (adAccountId: string, currentTag?: string | null) => {
    const newTag = await prompt("Введіть тег/ID клієнта для цього рекламного кабінету (наприклад: PROFFIT #1):", {
      title: "Прив'язка до клієнта CRM",
      defaultValue: currentTag || ""
    });
    if (newTag === null) return;

    try {
      const res = await fetch("/api/accounts/update-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adAccountId, clientTag: newTag.trim() })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Тег клієнта успішно збережено!");
        router.refresh();
      } else {
        toast.error("Помилка збереження: " + data.error);
      }
    } catch (err: any) {
      toast.error("Сталася помилка: " + err.message);
    }
  };

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1>Керування профілями</h1>
          <p className="subtitle">Підключені соціальні профілі, клієнти та рекламні кабінети</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="btn btn-secondary"
            onClick={handleSyncNow}
            disabled={isSyncing}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            title="Запустити примусову синхронізацію всіх кабінетів з Facebook API"
          >
            <span className={isSyncing ? "spin-animation" : ""} style={{ fontSize: "15px" }}>🔄</span>
            <span>{isSyncing ? "Синхронізація..." : "Синхронізувати зараз"}</span>
          </button>
          <button className="btn btn-primary" onClick={() => { setNewInviteUrl(""); setIsModalOpen(true); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Створити інвайт-посилання</span>
          </button>
        </div>
      </div>

      {/* Connected Accounts Table */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0 }}>Підключені профілі</h2>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Всього профілів: {socialAccounts.length}
          </span>
        </div>

        {socialAccounts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
            Немає підключених акаунтів. Створіть посилання-запрошення вище та авторизуйте акаунт.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ім'я клієнта / Профілю</th>
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
                  const isExpanded = !!expandedSocials[acc.id];

                  return (
                    <React.Fragment key={acc.id}>
                      <tr>
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
                            <div style={{ marginTop: "6px" }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  padding: "3px 10px",
                                  fontSize: "11px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  backgroundColor: isExpanded ? "rgba(59, 130, 246, 0.15)" : undefined,
                                  borderColor: isExpanded ? "var(--color-accent)" : undefined
                                }}
                                onClick={() => toggleExpandSocial(acc.id)}
                              >
                                <span>{isExpanded ? "▲ Сховати кабінети" : `▼ Кабінети (${acc.adAccounts.length})`}</span>
                              </button>
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

                      {/* Expanded Ad Accounts Table Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ backgroundColor: "rgba(12, 16, 27, 0.95)", padding: "16px 20px" }}>
                            <div style={{
                              border: "1px solid var(--border-color)",
                              borderRadius: "var(--radius-md)",
                              padding: "16px",
                              backgroundColor: "rgba(4, 6, 10, 0.6)"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--color-accent)" }}>
                                  Рекламні кабінети клієнта "{acc.name}" ({acc.adAccounts.length})
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                  💡 Ви можете перенести кабінет до іншого клієнта або змінити його CRM тег
                                </span>
                              </div>

                              {acc.adAccounts.length === 0 ? (
                                <div style={{ fontSize: "13px", color: "var(--text-muted)", padding: "12px 0", textAlign: "center" }}>
                                  У цього профілю наразі немає доступних рекламних кабінетів у Meta.
                                </div>
                              ) : (
                                <table className="custom-table" style={{ fontSize: "12px", margin: 0 }}>
                                  <thead>
                                    <tr style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                                      <th>Кабінет (Назва та ID)</th>
                                      <th>CRM Тег клієнта</th>
                                      <th>Валюта</th>
                                      <th>Витрати</th>
                                      <th>Статус</th>
                                      <th>Дії</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {acc.adAccounts.map(ad => (
                                      <tr key={ad.id}>
                                        <td>
                                          <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{ad.name}</div>
                                          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                                            <code>{ad.id}</code>
                                          </div>
                                        </td>
                                        <td>
                                          {ad.clientTag ? (
                                            <span className="badge badge-info" style={{ fontSize: "11px", padding: "2px 8px" }}>
                                              {ad.clientTag}
                                            </span>
                                          ) : (
                                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                              За замовчуванням ({acc.name})
                                            </span>
                                          )}
                                        </td>
                                        <td>
                                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>{ad.currency}</span>
                                        </td>
                                        <td>
                                          <span style={{ fontWeight: "600" }}>${ad.spend.toFixed(2)}</span>
                                        </td>
                                        <td>
                                          <span className={`badge ${ad.status === "ACTIVE" ? "badge-success" : "badge-error"}`} style={{ fontSize: "10px", padding: "2px 6px" }}>
                                            {ad.status === "ACTIVE" ? "Активний" : "Деактивовано"}
                                          </span>
                                        </td>
                                        <td>
                                          <div style={{ display: "flex", gap: "6px" }}>
                                            <button
                                              type="button"
                                              className="btn btn-secondary"
                                              style={{ padding: "4px 8px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                                              onClick={() => handleOpenReassignModal(ad, acc)}
                                              title="Перенести цей кабінет до іншого профілю або змінити прив'язку"
                                            >
                                              <span>➡️ Перенести</span>
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-secondary"
                                              style={{ padding: "4px 8px", fontSize: "11px" }}
                                              onClick={() => handleEditClientTag(ad.id, ad.clientTag)}
                                              title="Вказати тег клієнта для експорту API"
                                            >
                                              🏷️ CRM Тег
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collapsible Export REST API Key Card */}
      <div className="card">
        <div 
          style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            cursor: "pointer",
            userSelect: "none"
          }}
          onClick={() => setIsExportCardExpanded(!isExportCardExpanded)}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ fontSize: "16px", margin: 0 }}>API Експорту для зовнішнього дашборду (VPS)</h2>
              {exportApiKey ? (
                <span className="badge badge-success" style={{ fontSize: "11px", padding: "2px 8px" }}>
                  🟢 Ключ активовано
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: "11px", padding: "2px 8px" }}>
                  ⚪️ Не налаштовано
                </span>
              )}
            </div>
            <p className="subtitle" style={{ marginTop: "4px", margin: 0 }}>
              Налаштування секретного ключа для відгрузки витрат на ваш VPS серваку
            </p>
          </div>

          <button
            className="btn btn-secondary"
            style={{ padding: "6px 14px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExportCardExpanded(!isExportCardExpanded);
            }}
          >
            <span>{isExportCardExpanded ? "▲ Згорнути" : "▼ Розгорнути налаштування"}</span>
          </button>
        </div>

        {isExportCardExpanded && (
          <div style={{ borderTop: "1px solid var(--border-color)", marginTop: "16px", paddingTop: "16px" }}>
            {exportApiKey ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label className="form-label" style={{ margin: 0 }}>Ваш секретний API Ключ експорту:</label>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "11px", color: "var(--color-warning)" }}
                      onClick={handleGenerateExportKey}
                      disabled={isGeneratingExportKey}
                    >
                      {isGeneratingExportKey ? "Генерація..." : "🔄 Перегенерувати новий ключ"}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="text"
                      className="form-input"
                      readOnly
                      value={exportApiKey}
                      style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-emerald)", fontWeight: "600" }}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => copyToClipboard(exportApiKey)}
                    >
                      Копіювати
                    </button>
                  </div>
                </div>

                <div style={{
                  backgroundColor: "rgba(8, 10, 16, 0.5)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "16px"
                }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
                    Приклад запиту з вашого сервера (cURL / Python / Node.js):
                  </span>
                  <code style={{ fontSize: "12px", color: "#a5b4fc", display: "block", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                    GET {typeof window !== "undefined" ? window.location.origin : "https://varta-flow.app"}/api/v1/export/insights?key={exportApiKey}&date_from=2026-07-30&date_to=2026-07-31
                  </code>
                </div>
              </div>
            ) : (
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                  API ключ ще не згенеровано. Натисніть кнопку нижче, щоб створити секретний ключ для підключення вашого VPS сервера.
                </span>
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateExportKey}
                  disabled={isGeneratingExportKey}
                >
                  {isGeneratingExportKey ? "Генерація..." : "🔑 Створити API Ключ"}
                </button>
              </div>
            )}
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

      {/* Reassign Ad Account Modal */}
      {reassignModal.isOpen && reassignModal.adAccount && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Перенесення кабінету</h2>
              <button
                style={{ cursor: "pointer", fontSize: "20px" }}
                onClick={() => setReassignModal(prev => ({ ...prev, isOpen: false }))}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveReassign} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                  Перепризначення рекламного кабінету та всієї його аналітики іншому клієнту:
                </p>
                <div style={{
                  padding: "12px 14px",
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)"
                }}>
                  <div style={{ fontWeight: "600", fontSize: "14px" }}>{reassignModal.adAccount.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                    ID: <code>{reassignModal.adAccount.id}</code>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--color-accent)", marginTop: "4px" }}>
                    Поточний клієнт: <strong>{reassignModal.currentSocialName}</strong>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Перенести до клієнта / профілю:</label>
                <select
                  className="form-input"
                  value={reassignModal.targetSocialId}
                  onChange={(e) => setReassignModal(prev => ({ ...prev, targetSocialId: e.target.value }))}
                  style={{ cursor: "pointer" }}
                >
                  {socialAccounts.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (ID: {s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">CRM Тег клієнта (необов'язково):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Наприклад: DUBAI або PROFFIT #1"
                  value={reassignModal.clientTag}
                  onChange={(e) => setReassignModal(prev => ({ ...prev, clientTag: e.target.value }))}
                />
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Використовується для групування у вивантаженні API експорту на VPS
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setReassignModal(prev => ({ ...prev, isOpen: false }))}
                  disabled={reassignModal.isSaving}
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={reassignModal.isSaving}
                >
                  {reassignModal.isSaving ? "Збереження..." : "Зберегти перенесення"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
