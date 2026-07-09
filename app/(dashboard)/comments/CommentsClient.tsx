"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PageOption {
  id: string;
  name: string;
}

interface RuleItem {
  id: string;
  pageId: string;
  name: string;
  type: string;
  keywords: string;
  action: string;
  isActive: boolean;
}

interface LogItem {
  id: string;
  postId: string;
  commentId: string;
  commentText: string;
  authorName: string | null;
  actionTaken: string;
  ruleMatched: string | null;
  createdAt: Date;
  page: { name: string };
}

interface CommentItem {
  id: string;
  fbCommentId: string;
  pageId: string;
  postId: string;
  message: string;
  authorName: string | null;
  isHidden: boolean;
  status: string;
  fbCreatedAt: Date | null;
  page: { name: string };
}

interface CommentsClientProps {
  pages: PageOption[];
  rules: RuleItem[];
  logs: LogItem[];
  comments: CommentItem[];
}

export default function CommentsClient({ pages, rules, logs, comments }: CommentsClientProps) {
  const router = useRouter();
  const [selectedPage, setSelectedPage] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "logs" | "rules">("comments");
  
  // New Rule Form State
  const [ruleName, setRuleName] = useState("");
  const [rulePageId, setRulePageId] = useState("ALL");
  const [ruleType, setRuleType] = useState("STOP_WORDS");
  const [keywords, setKeywords] = useState("");
  const [action, setAction] = useState("HIDE");
  const [isLoading, setIsLoading] = useState(false);
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  // Filter data based on page selection
  const filteredLogs = selectedPage === "ALL" 
    ? logs 
    : logs.filter(l => {
        const pageName = pages.find(p => p.id === selectedPage)?.name;
        return l.page.name === pageName;
      });

  const filteredComments = selectedPage === "ALL"
    ? comments
    : comments.filter(c => c.pageId === selectedPage);

  const filteredRules = selectedPage === "ALL"
    ? rules
    : rules.filter(r => r.pageId === selectedPage || !r.pageId);

  // Stats calculation
  const totalComments = filteredComments.length;
  const visibleComments = filteredComments.filter(c => c.status === "VISIBLE").length;
  const hiddenComments = filteredComments.filter(c => c.status === "HIDDEN").length;
  const totalModerated = filteredLogs.length;

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName) return alert("Будь ласка, введіть назву правила");
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/rules/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleName,
          pageId: rulePageId,
          type: ruleType,
          keywords,
          action
        })
      });

      const data = await res.json();
      if (data.success) {
        setRuleName("");
        setKeywords("");
        setIsModalOpen(false);
        router.refresh();
      } else {
        alert("Помилка створення правила: " + data.error);
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Ви впевнені, що хочете видалити це правило?")) return;

    try {
      const res = await fetch(`/api/rules/delete?id=${ruleId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert("Помилка видалення: " + data.error);
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    }
  };

  const handleModerateComment = async (fbCommentId: string, actionType: "HIDE" | "DELETE") => {
    setModeratingId(fbCommentId);
    try {
      // We call the webhook endpoint to moderate
      const res = await fetch("/api/comments/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fbCommentId, action: actionType })
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert("Помилка модерації: " + (data.error || "Невідома помилка"));
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    } finally {
      setModeratingId(null);
    }
  };

  const formatCommentDate = (date: Date | null) => {
    if (!date) return "—";
    const d = new Date(date);
    return d.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const tabs = [
    { key: "comments" as const, label: "Всі коментарі", count: totalComments },
    { key: "logs" as const, label: "Історія модерації", count: totalModerated },
    { key: "rules" as const, label: "Правила", count: filteredRules.length }
  ];

  return (
    <>
      {/* Title Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Модерація коментарів</h1>
          <p className="subtitle">Перегляд, модерація та автоматичне очищення коментарів</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Додати правило</span>
        </button>
      </div>

      {/* Page Filter Selector */}
      <div className="card" style={{ display: "flex", gap: "16px", padding: "16px" }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Бізнес-сторінка</label>
          <select
            className="form-input"
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            style={{ color: "white", cursor: "pointer" }}
          >
            <option value="ALL">Всі бізнес-сторінки ({pages.length})</option>
            {pages.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comment Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600" }}>Всього коментарів</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "white" }}>{totalComments}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Завантажено з Facebook</span>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600" }}>Видимі</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-success)" }}>{visibleComments}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Публічні коментарі</span>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600" }}>Приховано</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-warning)" }}>{hiddenComments}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Приховані від публіки</span>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600" }}>Автомодерація</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-error)" }}>{totalModerated}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Оброблено правилами</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--border-color)", marginBottom: "20px" }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: "600",
                color: activeTab === tab.key ? "var(--color-accent)" : "var(--text-secondary)",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.key ? "2px solid var(--color-accent)" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {tab.label}
              <span style={{
                background: activeTab === tab.key ? "rgba(16, 185, 129, 0.12)" : "rgba(100, 116, 139, 0.1)",
                color: activeTab === tab.key ? "var(--color-accent)" : "var(--text-muted)",
                borderRadius: "10px",
                padding: "1px 7px",
                fontSize: "11px",
                fontWeight: "700"
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* TAB: All Comments */}
        {activeTab === "comments" && (
          filteredComments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
              Коментарі ще не завантажені. Вони з'являться після наступної синхронізації (крон).
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Час</th>
                    <th>Сторінка</th>
                    <th>Автор</th>
                    <th style={{ width: "35%" }}>Коментар</th>
                    <th>Статус</th>
                    <th>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComments.map((comment) => (
                    <tr key={comment.id}>
                      <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                        {formatCommentDate(comment.fbCreatedAt)}
                      </td>
                      <td>
                        <span style={{ fontWeight: "600", fontSize: "13px" }}>{comment.page.name}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: "13px" }}>{comment.authorName || "Анонім"}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: "13px", lineHeight: "1.4" }} title={comment.message}>
                          {comment.message.length > 120 ? comment.message.substring(0, 120) + "..." : comment.message}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          comment.status === "VISIBLE" ? "badge-success" :
                          comment.status === "HIDDEN" ? "badge-warning" : "badge-error"
                        }`}>
                          {comment.status === "VISIBLE" ? "Видимий" :
                           comment.status === "HIDDEN" ? "Прихований" : "Видалений"}
                        </span>
                      </td>
                      <td>
                        {comment.status === "VISIBLE" && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              disabled={moderatingId === comment.fbCommentId}
                              onClick={() => handleModerateComment(comment.fbCommentId, "HIDE")}
                            >
                              {moderatingId === comment.fbCommentId ? "..." : "Приховати"}
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              disabled={moderatingId === comment.fbCommentId}
                              onClick={() => handleModerateComment(comment.fbCommentId, "DELETE")}
                            >
                              {moderatingId === comment.fbCommentId ? "..." : "Видалити"}
                            </button>
                          </div>
                        )}
                        {comment.status !== "VISIBLE" && (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Оброблено</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB: Moderation History */}
        {activeTab === "logs" && (
          filteredLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
              Лог модерації порожній. Коментарі будуть з'являтись тут після автоматичної або ручної модерації.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Час</th>
                    <th>Сторінка</th>
                    <th>Автор</th>
                    <th>Коментар</th>
                    <th>Дія</th>
                    <th>Правило</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                        {new Date(log.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                          {new Date(log.createdAt).toLocaleDateString("uk-UA")}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: "600", fontSize: "13px" }}>{log.page.name}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: "13px" }}>{log.authorName || "Анонім"}</span>
                      </td>
                      <td>
                        <div style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", fontSize: "13px" }} title={log.commentText}>
                          {log.commentText}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${log.actionTaken === "HIDDEN" ? "badge-warning" : "badge-error"}`}>
                          {log.actionTaken === "HIDDEN" ? "Приховано" : "Видалено"}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {log.ruleMatched || "Вручну"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB: Rules */}
        {activeTab === "rules" && (
          filteredRules.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
              Немає правил модерації. Натисніть «Додати правило» щоб створити.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
              {filteredRules.map((rule) => (
                <div key={rule.id} style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <strong style={{ fontSize: "14px", color: "white" }}>{rule.name}</strong>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      style={{ color: "var(--color-error)", cursor: "pointer", fontSize: "12px", background: "none", border: "none" }}
                    >
                      Видалити
                    </button>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Сторінка: <span style={{ color: "white" }}>
                      {rule.pageId ? (pages.find(p => p.id === rule.pageId)?.name || "Невідома") : "Всі сторінки"}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Тригер: <span style={{ color: "white" }}>
                      {rule.type === "STOP_WORDS" && "Стоп-слова"}
                      {rule.type === "LINKS" && "Посилання"}
                      {rule.type === "TELEGRAM" && "Telegram-посилання"}
                      {rule.type === "HIDE_ALL" && "Всі коментарі"}
                    </span>
                  </div>
                  {rule.type === "STOP_WORDS" && (
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                      Слова: <span style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>{rule.keywords}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <span className={`badge ${rule.action === "HIDE" ? "badge-warning" : "badge-error"}`}>
                      {rule.action === "HIDE" ? "Приховати" : "Видалити"}
                    </span>
                    <span className="badge badge-success" style={{ fontSize: "9px" }}>Активне</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Create Rule Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Створити правило модерації</h2>
              <button style={{ cursor: "pointer", fontSize: "20px", background: "none", border: "none", color: "white" }} onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleCreateRule} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Назва правила</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Наприклад: Очищення лінків від ботів"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Сторінка Facebook</label>
                <select
                  className="form-input"
                  value={rulePageId}
                  onChange={(e) => setRulePageId(e.target.value)}
                  style={{ color: "white", cursor: "pointer" }}
                >
                  <option value="ALL">Всі сторінки (Масово)</option>
                  {pages.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Тип тригера</label>
                <select
                  className="form-input"
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value)}
                  style={{ color: "white", cursor: "pointer" }}
                >
                  <option value="STOP_WORDS">Містить Стоп-слова</option>
                  <option value="LINKS">Містить будь-яке посилання (URL)</option>
                  <option value="TELEGRAM">Посилання на Telegram / юзернейм (@)</option>
                  <option value="HIDE_ALL">Приховувати абсолютно всі коментарі</option>
                </select>
              </div>

              {ruleType === "STOP_WORDS" && (
                <div className="form-group">
                  <label className="form-label">Стоп-слова (через кому)</label>
                  <textarea
                    className="form-input"
                    placeholder="купити, ціна, спам, безкоштовно"
                    rows={3}
                    style={{ resize: "vertical" }}
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Дія над коментарем</label>
                <select
                  className="form-input"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  style={{ color: "white", cursor: "pointer" }}
                >
                  <option value="HIDE">Приховати</option>
                  <option value="DELETE">Видалити повністю</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Скасувати
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
