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

interface CommentsClientProps {
  pages: PageOption[];
  rules: RuleItem[];
  logs: LogItem[];
}

export default function CommentsClient({ pages, rules, logs }: CommentsClientProps) {
  const router = useRouter();
  const [selectedPage, setSelectedPage] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Rule Form State
  const [ruleName, setRuleName] = useState("");
  const [rulePageId, setRulePageId] = useState("ALL");
  const [ruleType, setRuleType] = useState("STOP_WORDS");
  const [keywords, setKeywords] = useState("");
  const [action, setAction] = useState("HIDE");
  const [isLoading, setIsLoading] = useState(false);

  // Filter logs & rules based on page selection
  const filteredLogs = selectedPage === "ALL" 
    ? logs 
    : logs.filter(l => l.commentId.startsWith(selectedPage) || l.page.name === pages.find(p => p.id === selectedPage)?.name);

  const filteredRules = selectedPage === "ALL"
    ? rules
    : rules.filter(r => r.pageId === selectedPage || !r.pageId);

  // Stats calculation
  const totalModerated = filteredLogs.length;
  const totalHidden = filteredLogs.filter(l => l.actionTaken === "HIDDEN").length;
  const totalDeleted = filteredLogs.filter(l => l.actionTaken === "DELETED").length;

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName) return alert("Будь ласка, введіть назву правила");
    
    setIsLoading(true);
    try {
      // Inline API request or server action to create a rule
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

  return (
    <>
      {/* Title Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Модерація коментарів</h1>
          <p className="subtitle">Стрічка коментарів та автоматичне очищення спаму</p>
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
          <label className="form-label font-bold">Оберіть Бізнес-сторінку</label>
          <select
            className="form-input"
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            style={{ color: "white", cursor: "pointer" }}
          >
            <option value="ALL">Всі бізнес-сторінки ({pages.length})</option>
            {pages.map(p => (
              <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comment Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600" }}>Всього оброблено</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "white" }}>{totalModerated}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Автоматично перевірено</span>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600" }}>Приховано</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-warning)" }}>{totalHidden}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Коментарі приховано від публіки</span>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: "600" }}>Видалено</span>
          <span style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-error)" }}>{totalDeleted}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Спам-коментарі видалено назавжди</span>
        </div>
      </div>

      {/* Rules and Logs split layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", alignItems: "start" }}>
        
        {/* Active Rules List */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h2>Налаштовані правила</h2>
          {filteredRules.length === 0 ? (
            <div style={{ padding: "20px 0", color: "var(--text-muted)", fontSize: "14px", textAlign: "center" }}>
              Немає правил для обраної сторінки.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredRules.map((rule) => (
                <div key={rule.id} style={{ padding: "14px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <strong style={{ fontSize: "14px", color: "white" }}>{rule.name}</strong>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      style={{ color: "var(--color-error)", cursor: "pointer", fontSize: "12px" }}
                    >
                      Видалити
                    </button>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Сторінка: <span style={{ color: "white" }}>
                      {rule.pageId ? (pages.find(p => p.id === rule.pageId)?.name || "Невідома") : "Всі сторінки (Глобально)"}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Тригер: <span style={{ color: "white" }}>
                      {rule.type === "STOP_WORDS" && "Містить стоп-слова"}
                      {rule.type === "LINKS" && "Містить посилання"}
                      {rule.type === "TELEGRAM" && "Містить Telegram-посилання"}
                      {rule.type === "HIDE_ALL" && "Приховати всі коментарі"}
                    </span>
                  </div>
                  {rule.type === "STOP_WORDS" && (
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                      Слова: <span style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>{rule.keywords}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <span className={`badge ${rule.action === "HIDE" ? "badge-warning" : "badge-error"}`}>
                      Дія: {rule.action === "HIDE" ? "Приховати" : "Видалити"}
                    </span>
                    <span className="badge badge-success" style={{ fontSize: "9px" }}>Активне</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Moderation Logs */}
        <div className="card">
          <h2 style={{ marginBottom: "20px" }}>Історія модерації</h2>
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
              Лог модерації порожній.
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
          )}
        </div>

      </div>

      {/* Create Rule Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Створити правило модерації</h2>
              <button style={{ cursor: "pointer", fontSize: "20px" }} onClick={() => setIsModalOpen(false)}>×</button>
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
                  <option value="HIDE">Приховати (is_hidden = true)</option>
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
