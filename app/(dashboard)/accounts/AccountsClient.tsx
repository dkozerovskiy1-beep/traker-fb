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
  clientTag?: string | null;
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

interface TagModalState {
  isOpen: boolean;
  targetType: "social" | "adAccount";
  targetId: string;
  targetName: string;
  currentTag: string;
  inputTag: string;
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

  // Tag Modal State (with dropdown & existing tag chips)
  const [tagModal, setTagModal] = useState<TagModalState>({
    isOpen: false,
    targetType: "social",
    targetId: "",
    targetName: "",
    currentTag: "",
    inputTag: "",
    isSaving: false
  });

  // Invite states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isOneTime, setIsOneTime] = useState(true);
  const [newInviteUrl, setNewInviteUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Collect all unique existing tags across social accounts and ad accounts
  const existingTags = Array.from(
    new Set(
      [
        ...socialAccounts.map(s => s.clientTag?.trim()),
        ...socialAccounts.flatMap(s => s.adAccounts.map(a => a.clientTag?.trim()))
      ].filter((t): t is string => Boolean(t))
    )
  ).sort((a, b) => a.localeCompare(b));

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

  // Open Tag Edit Modal
  const openTagModal = (
    targetType: "social" | "adAccount",
    targetId: string,
    targetName: string,
    currentTag?: string | null
  ) => {
    setTagModal({
      isOpen: true,
      targetType,
      targetId,
      targetName,
      currentTag: currentTag || "",
      inputTag: currentTag || "",
      isSaving: false
    });
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setTagModal(prev => ({ ...prev, isSaving: true }));

    const endpoint = tagModal.targetType === "social" 
      ? "/api/accounts/update-social-tag" 
      : "/api/accounts/update-tag";

    const payload = tagModal.targetType === "social"
      ? { socialAccountId: tagModal.targetId, clientTag: tagModal.inputTag.trim() || null }
      : { adAccountId: tagModal.targetId, clientTag: tagModal.inputTag.trim() || null };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Тег проєкту успішно збережено!");
        setTagModal(prev => ({ ...prev, isOpen: false, isSaving: false }));
        router.refresh();
      } else {
        toast.error("Помилка збереження: " + data.error);
        setTagModal(prev => ({ ...prev, isSaving: false }));
      }
    } catch (err: any) {
      toast.error("Сталася помилка: " + err.message);
      setTagModal(prev => ({ ...prev, isSaving: false }));
    }
  };

  const handleClearTag = async () => {
    setTagModal(prev => ({ ...prev, isSaving: true, inputTag: "" }));

    const endpoint = tagModal.targetType === "social" 
      ? "/api/accounts/update-social-tag" 
      : "/api/accounts/update-tag";

    const payload = tagModal.targetType === "social"
      ? { socialAccountId: tagModal.targetId, clientTag: null }
      : { adAccountId: tagModal.targetId, clientTag: null };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Тег успішно видалено!");
        setTagModal(prev => ({ ...prev, isOpen: false, isSaving: false }));
        router.refresh();
      } else {
        toast.error("Помилка видалення: " + data.error);
        setTagModal(prev => ({ ...prev, isSaving: false }));
      }
    } catch (err: any) {
      toast.error("Сталася помилка: " + err.message);
      setTagModal(prev => ({ ...prev, isSaving: false }));
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

  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSendTestAlert = async () => {
    setIsSendingTest(true);
    try {
      const res = await fetch("/api/user/test-telegram", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Тестове сповіщення успішно надіслано в Telegram!");
      } else {
        toast.error("Помилка відправки: " + (data.error || "Невідома помилка"));
      }
    } catch (err: any) {
      toast.error("Помилка запиту: " + err.message);
    } finally {
      setIsSendingTest(false);
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

      {/* Checkpoint / Reauth Needed Alert Banner */}
      {(() => {
        const reauthNeeded = socialAccounts.filter(s => s.status === "NEEDS_REAUTH");
        if (reauthNeeded.length === 0) return null;
        return (
          <div style={{
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.45)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            marginTop: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0
              }}>
                ⚠️
              </div>
              <div>
                <div style={{ fontWeight: "700", color: "#f87171", fontSize: "15px", marginBottom: "3px" }}>
                  Увага! {reauthNeeded.length === 1 ? "Соц-профіль вилетів на чек у Facebook" : `${reauthNeeded.length} соц-профілі вилетіли на чек у Facebook`}
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Синхронізацію призупинено для: <strong style={{ color: "#fff" }}>{reauthNeeded.map(a => a.name).join(", ")}</strong>. Будь ласка, перевірте профіль у Facebook та підключіть через інвайт-посилання.
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary"
              style={{ backgroundColor: "#ef4444", borderColor: "#dc2626", color: "#fff", whiteSpace: "nowrap" }}
              onClick={() => {
                const first = reauthNeeded[0];
                setDescription(first?.clientTag || first?.name || "");
                setIsOneTime(false);
                setNewInviteUrl("");
                setIsModalOpen(true);
              }}
            >
              🔗 Створити інвайт для перепідключення
            </button>
          </div>
        );
      })()}

      {/* Connected Accounts Table */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "16px" }}>Підключені профілі</h2>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Всього профілів: {socialAccounts.length}
          </span>
        </div>

        {socialAccounts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
            Немає підключених акаунтів. Створіть посилання-запрошення вище та авторизуйте акаунт.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table table-compact">
              <thead>
                <tr>
                  <th style={{ minWidth: "220px" }}>Ім'я профілю</th>
                  <th style={{ minWidth: "150px" }}>Тег проєкту (CRM)</th>
                  <th>Рекламні кабінети</th>
                  <th>Бізнес-сторінки</th>
                  <th>Витрати</th>
                  <th>Статус</th>
                  <th style={{ textAlign: "right" }}>Дії</th>
                </tr>
              </thead>
              <tbody>
                {socialAccounts.map((acc) => {
                  const totalSpend = acc.adAccounts.reduce((sum, ad) => sum + ad.spend, 0);
                  const activeCabinets = acc.adAccounts.filter(ad => ad.status === "ACTIVE").length;
                  const isExpanded = !!expandedSocials[acc.id];
                  const isCheckpoint = acc.status === "NEEDS_REAUTH";

                  return (
                    <Fragment key={acc.id}>
                      <tr style={{ backgroundColor: isCheckpoint ? "rgba(239, 68, 68, 0.08)" : undefined }}>
                        {/* Profile Info */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {acc.avatarUrl ? (
                              <img
                                src={acc.avatarUrl}
                                alt={acc.name}
                                style={{ width: "34px", height: "34px", borderRadius: "50%", border: isCheckpoint ? "2px solid #ef4444" : "1px solid var(--border-color)", flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                backgroundColor: isCheckpoint ? "rgba(239, 68, 68, 0.2)" : "var(--border-color-glow)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "600",
                                color: isCheckpoint ? "#f87171" : "var(--color-accent)",
                                flexShrink: 0
                              }}>
                                {acc.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontWeight: "600", color: isCheckpoint ? "#fca5a5" : "var(--text-primary)" }}>{acc.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRenameAccount(acc.id, acc.name)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    padding: "2px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    transition: "color 0.2s"
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-emerald)"}
                                  onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                                  title="Редагувати ім'я профілю"
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                  </svg>
                                </button>
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "1px" }}>
                                ID: {acc.id}
                              </div>
                              {isCheckpoint && (
                                <div style={{ fontSize: "11px", color: "#f87171", fontWeight: "600", marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <span>⚠️ Сесію анульовано Meta (виліт на чек)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Project Tag */}
                        <td>
                          {acc.clientTag ? (
                            <button
                              type="button"
                              onClick={() => openTagModal("social", acc.id, acc.name, acc.clientTag)}
                              className="tag-pill tag-pill-active"
                              title="Натисніть для зміни або видалення тегу"
                            >
                              <span>🏷️ {acc.clientTag}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openTagModal("social", acc.id, acc.name, "")}
                              className="tag-pill tag-pill-empty"
                              title="Призначити спільний тег проєкту для цього соца"
                            >
                              <span>+ Тег проєкту</span>
                            </button>
                          )}
                        </td>

                        {/* Ad Accounts count & toggle */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                              <strong>{activeCabinets}</strong> / {acc.adAccounts.length} активних
                            </span>
                            <div>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  padding: "2px 8px",
                                  fontSize: "10px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  backgroundColor: isExpanded ? "rgba(59, 130, 246, 0.15)" : undefined,
                                  borderColor: isExpanded ? "var(--color-accent)" : undefined
                                }}
                                onClick={() => toggleExpandSocial(acc.id)}
                              >
                                <span>{isExpanded ? "▲ Згорнути" : `▼ Кабінети (${acc.adAccounts.length})`}</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Pages */}
                        <td>
                          <div style={{ fontSize: "12px" }}>
                            <strong>{acc.pages.length}</strong> стор.
                            {acc.pages.length > 0 && (
                              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", maxWidth: "140px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {acc.pages.map(p => p.name).join(", ")}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Spend */}
                        <td>
                          <span style={{ fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap" }}>
                            ${totalSpend.toFixed(2)}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          {isCheckpoint ? (
                            <span
                              className="badge"
                              style={{
                                backgroundColor: "rgba(239, 68, 68, 0.2)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.5)",
                                fontSize: "10px",
                                padding: "2px 8px",
                                fontWeight: "700",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                whiteSpace: "nowrap"
                              }}
                              title="Сесію Facebook анульовано. Пройдіть перевірку та підключіть профіль повторно"
                            >
                              ⚠️ Вилетів на чек
                            </span>
                          ) : (
                            <span className={`badge ${acc.status === "ACTIVE" ? "badge-success" : "badge-error"}`} style={{ fontSize: "10px", padding: "2px 6px" }}>
                              {acc.status === "ACTIVE" ? "Активний" : "Неактивний"}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            {isCheckpoint && (
                              <button
                                className="btn"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: "11px",
                                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                                  color: "#f87171",
                                  border: "1px solid rgba(239, 68, 68, 0.5)",
                                  fontWeight: "600"
                                }}
                                onClick={() => {
                                  setDescription(acc.clientTag || acc.name);
                                  setIsOneTime(false);
                                  setNewInviteUrl("");
                                  setIsModalOpen(true);
                                }}
                                title="Створити інвайт для повторного підключення"
                              >
                                🔗 Перепідключити
                              </button>
                            )}
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "4px 10px", fontSize: "11px" }}
                              onClick={() => router.push(`/?socialAccount=${acc.id}`)}
                            >
                              Статистика
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: "4px 10px", fontSize: "11px" }}
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
                          <td colSpan={7} style={{ backgroundColor: "rgba(8, 11, 20, 0.95)", padding: "14px 18px" }}>
                            <div style={{
                              border: "1px solid var(--border-color)",
                              borderRadius: "var(--radius-sm)",
                              padding: "14px",
                              backgroundColor: "rgba(4, 6, 10, 0.7)"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--color-accent)" }}>
                                  Рекламні кабінети профілю "{acc.name}" ({acc.adAccounts.length})
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                  💡 Кабінети автоматично спадкують тег профілю, якщо не вказано персональний
                                </span>
                              </div>

                              {acc.adAccounts.length === 0 ? (
                                <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "10px 0", textAlign: "center" }}>
                                  У цього профілю наразі немає доступних рекламних кабінетів у Meta.
                                </div>
                              ) : (
                                <table className="custom-table table-compact" style={{ fontSize: "12px", margin: 0 }}>
                                  <thead>
                                    <tr style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                                      <th>Кабінет (Назва та ID)</th>
                                      <th>Тег проєкту (CRM)</th>
                                      <th>Валюта</th>
                                      <th>Витрати</th>
                                      <th>Статус</th>
                                      <th style={{ textAlign: "right" }}>Дії</th>
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
                                            <button
                                              type="button"
                                              onClick={() => openTagModal("adAccount", ad.id, ad.name, ad.clientTag)}
                                              className="tag-pill tag-pill-active"
                                              title="Персональний тег для цього кабінету (натисніть щоб змінити)"
                                            >
                                              <span>🏷️ {ad.clientTag}</span>
                                              <span style={{ fontSize: "9px", color: "var(--color-emerald)", marginLeft: "2px" }}>(персональний)</span>
                                            </button>
                                          ) : acc.clientTag ? (
                                            <button
                                              type="button"
                                              onClick={() => openTagModal("adAccount", ad.id, ad.name, "")}
                                              className="tag-pill tag-pill-active"
                                              style={{ opacity: 0.85 }}
                                              title="Успадковано від профілю соца (натисніть щоб перевизначити)"
                                            >
                                              <span>🏷️ {acc.clientTag}</span>
                                              <span style={{ fontSize: "9px", color: "var(--text-muted)", marginLeft: "2px" }}>(з профілю)</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => openTagModal("adAccount", ad.id, ad.name, "")}
                                              className="tag-pill tag-pill-empty"
                                              title="Призначити персональний тег"
                                            >
                                              <span>+ Задати тег</span>
                                            </button>
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
                                        <td style={{ textAlign: "right" }}>
                                          <div style={{ display: "inline-flex", gap: "6px" }}>
                                            <button
                                              type="button"
                                              className="btn btn-secondary"
                                              style={{ padding: "3px 8px", fontSize: "11px" }}
                                              onClick={() => handleOpenReassignModal(ad, acc)}
                                              title="Перенести цей кабінет до іншого профілю"
                                            >
                                              ➡️ Перенести
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-secondary"
                                              style={{ padding: "3px 8px", fontSize: "11px" }}
                                              onClick={() => openTagModal("adAccount", ad.id, ad.name, ad.clientTag)}
                                              title="Вказати персональний CRM тег для цього кабінету"
                                            >
                                              🏷️ Тег
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
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modern Tag Picker Modal with Dropdown / Existing Tag Chips */}
      {tagModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "460px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "16px", margin: 0 }}>Тег проєкту (CRM)</h2>
              <button
                type="button"
                style={{ cursor: "pointer", fontSize: "20px", color: "var(--text-muted)" }}
                onClick={() => setTagModal(prev => ({ ...prev, isOpen: false }))}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveTag} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{
                padding: "10px 12px",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)"
              }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                  {tagModal.targetType === "social" ? "Профіль Facebook" : "Рекламний кабінет"}
                </div>
                <div style={{ fontWeight: "600", fontSize: "13px", marginTop: "2px", color: "var(--text-primary)" }}>
                  {tagModal.targetName}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  ID: {tagModal.targetId}
                </div>
              </div>

              {/* Dropdown & Quick Select from Existing Tags */}
              {existingTags.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Виберіть зі списку існуючих тегів:</label>
                  <select
                    className="form-input"
                    value={existingTags.includes(tagModal.inputTag.trim()) ? tagModal.inputTag.trim() : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setTagModal(prev => ({ ...prev, inputTag: e.target.value }));
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">-- Оберіть тег зі списку --</option>
                    {existingTags.map(t => (
                      <option key={t} value={t}>🏷️ {t}</option>
                    ))}
                  </select>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                    {existingTags.map(t => {
                      const isSelected = tagModal.inputTag.trim().toLowerCase() === t.toLowerCase();
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`tag-chip ${isSelected ? "active" : ""}`}
                          onClick={() => setTagModal(prev => ({ ...prev, inputTag: t }))}
                        >
                          <span>🏷️ {t}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Input for tag name */}
              <div className="form-group">
                <label className="form-label">
                  {existingTags.length > 0 ? "Або введіть новий тег вручну:" : "Введіть назву тегу проєкту:"}
                </label>
                <input
                  type="text"
                  list="existing-tags-datalist"
                  className="form-input"
                  placeholder="Наприклад: DUBAI"
                  value={tagModal.inputTag}
                  onChange={(e) => setTagModal(prev => ({ ...prev, inputTag: e.target.value }))}
                  autoFocus
                />
                <datalist id="existing-tags-datalist">
                  {existingTags.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {tagModal.targetType === "social"
                    ? "Усі рекламні кабінети цього профілю автоматично об'єднаються під цим тегом"
                    : "Цей тег матиме пріоритет над спільним тегом профілю"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                {tagModal.currentTag ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: "6px 12px", fontSize: "11px" }}
                    onClick={handleClearTag}
                    disabled={tagModal.isSaving}
                  >
                    🗑️ Видалити тег
                  </button>
                ) : <div />}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setTagModal(prev => ({ ...prev, isOpen: false }))}
                    disabled={tagModal.isSaving}
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={tagModal.isSaving}
                  >
                    {tagModal.isSaving ? "Збереження..." : "Зберегти тег"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Telegram Notifications Settings Card */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ fontSize: "16px", margin: 0 }}>Сповіщення в Telegram</h2>
              {telegramChatId ? (
                <span className="badge badge-success" style={{ fontSize: "11px", padding: "2px 8px" }}>
                  🟢 Підключено
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: "11px", padding: "2px 8px" }}>
                  ⚪️ Не підключено
                </span>
              )}
            </div>
            <p className="subtitle" style={{ marginTop: "4px", margin: 0 }}>
              Миттєві сповіщення про виліт соців на чек, бани кабінетів, відхилені оголошення та коментарі
            </p>
          </div>

          {telegramChatId && (
            <button
              className="btn btn-secondary"
              style={{ padding: "6px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
              onClick={handleSendTestAlert}
              disabled={isSendingTest}
            >
              <span>{isSendingTest ? "Відправка..." : "✈️ Надіслати тестове сповіщення"}</span>
            </button>
          )}
        </div>

        {telegramChatId ? (
          <div>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <div style={{ fontSize: "13px" }}>
                Бот підключено до чату: <code style={{ color: "var(--color-accent)", fontWeight: "600" }}>{telegramChatId}</code>
              </div>
              <button
                className="btn btn-danger"
                style={{ padding: "4px 10px", fontSize: "11px" }}
                onClick={handleDisconnectTelegram}
                disabled={isUpdatingSettings}
              >
                Вимкнути Telegram
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={alertOnBans}
                  onChange={(e) => handleToggleChange("alertOnBans", e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "var(--color-accent)" }}
                />
                <span style={{ fontSize: "13px" }}>🚨 <strong>Виліт соца на чек</strong> та бани кабінетів</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={alertOnRejections}
                  onChange={(e) => handleToggleChange("alertOnRejections", e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "var(--color-accent)" }}
                />
                <span style={{ fontSize: "13px" }}>🚫 <strong>Відхилені креативи</strong> Meta (Disapproved)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={alertOnApprovals}
                  onChange={(e) => handleToggleChange("alertOnApprovals", e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "var(--color-accent)" }}
                />
                <span style={{ fontSize: "13px" }}>✅ <strong>Схвалені креативи</strong> (Active після модерації)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={alertOnComments}
                  onChange={(e) => handleToggleChange("alertOnComments", e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "var(--color-accent)" }}
                />
                <span style={{ fontSize: "13px" }}>💬 <strong>Автомодерація коментарів</strong></span>
              </label>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
            <p style={{ fontSize: "13px", marginBottom: "14px" }}>
              Підключіть Telegram, щоб миттєво отримувати сповіщення, коли соц вилітає на чек або баняться оголошення.
            </p>
            {currentUser && (
              <a
                href={`https://t.me/${botUsername}?start=${currentUser.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
              >
                <span>✈️ Підключити Telegram бота (@{botUsername})</span>
              </a>
            )}
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
            <table className="custom-table table-compact">
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
                          style={{ padding: "4px 10px", fontSize: "11px" }}
                          onClick={() => copyToClipboard(inviteUrlString)}
                        >
                          Копіювати посилання
                        </button>
                      </td>
                      <td>
                        <button
                          className="btn btn-danger"
                          style={{ padding: "4px 10px", fontSize: "11px" }}
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
          <div className="modal-content" style={{ maxWidth: "460px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "16px", margin: 0 }}>Перенесення кабінету</h2>
              <button
                type="button"
                style={{ cursor: "pointer", fontSize: "20px", color: "var(--text-muted)" }}
                onClick={() => setReassignModal(prev => ({ ...prev, isOpen: false }))}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveReassign} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{
                padding: "10px 12px",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)"
              }}>
                <div style={{ fontWeight: "600", fontSize: "13px" }}>{reassignModal.adAccount.name}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  ID: <code>{reassignModal.adAccount.id}</code>
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-accent)", marginTop: "4px" }}>
                  Поточний клієнт: <strong>{reassignModal.currentSocialName}</strong>
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
                      {s.name} {s.clientTag ? `[Тег: ${s.clientTag}]` : ""} (ID: {s.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown & Quick Select from Existing Tags */}
              {existingTags.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Оберіть тег з існуючих (необов'язково):</label>
                  <select
                    className="form-input"
                    value={existingTags.includes(reassignModal.clientTag.trim()) ? reassignModal.clientTag.trim() : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setReassignModal(prev => ({ ...prev, clientTag: e.target.value }));
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">-- Оберіть існуючий тег --</option>
                    {existingTags.map(t => (
                      <option key={t} value={t}>🏷️ {t}</option>
                    ))}
                  </select>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                    {existingTags.map(t => {
                      const isSelected = reassignModal.clientTag.trim().toLowerCase() === t.toLowerCase();
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`tag-chip ${isSelected ? "active" : ""}`}
                          onClick={() => setReassignModal(prev => ({ ...prev, clientTag: t }))}
                        >
                          <span>🏷️ {t}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  {existingTags.length > 0 ? "Або введіть персональний тег вручну:" : "Персональний CRM Тег кабінету (необов'язково):"}
                </label>
                <input
                  type="text"
                  list="reassign-tags-datalist"
                  className="form-input"
                  placeholder="Залиште порожнім, щоб спадкувати тег профілю"
                  value={reassignModal.clientTag}
                  onChange={(e) => setReassignModal(prev => ({ ...prev, clientTag: e.target.value }))}
                />
                <datalist id="reassign-tags-datalist">
                  {existingTags.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Якщо вказано, перевизначає спільний тег профілю у вивантаженні API експорту на VPS
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
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
