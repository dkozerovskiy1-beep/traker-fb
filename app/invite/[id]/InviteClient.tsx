"use client";

import { useState } from "react";
import styles from "./invite.module.css";

interface InviteClientProps {
  inviteId: string;
  inviterName: string;
  inviterInitial: string;
}

export default function InviteClient({ inviteId, inviterName, inviterInitial }: InviteClientProps) {
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/invite/submit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId,
          accessToken: token.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
      } else {
        alert("Помилка підключення: " + data.error);
      }
    } catch (err: any) {
      alert("Сталася помилка: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.card}>
        <div style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          color: "var(--color-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px auto"
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className={styles.title} style={{ color: "var(--color-accent)" }}>Акаунт успішно підключено!</h1>
        <p className={styles.subtitle} style={{ marginBottom: "20px" }}>
          Дякуємо! Ваші рекламні кабінети та сторінки успішно імпортовані у систему VartaFlow.
        </p>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
          Ви можете закрити цю вкладку. Адміністратор кабінету вже бачить вашу статистику.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.userInitial}>{inviterInitial}</div>
      <h1 className={styles.title}>{inviterName} запрошує вас підключитися</h1>
      <p className={styles.subtitle}>
        Надайте доступ до статистики ваших рекламних кабінетів за допомогою Access Token
      </p>

      <div className={styles.accessBox}>
        <div className={styles.accessTitle}>що буде доступно</div>
        <div className={styles.accessList}>
          <div className={styles.accessItem}>
            <div className={styles.iconWrapperSuccess}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className={styles.accessItemCheck}>Метрики рекламних кабінетів (витрати, кліки, покази)</span>
          </div>
          
          <div className={styles.accessItem}>
            <div className={styles.iconWrapperSuccess}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className={styles.accessItemCheck}>Назви кампаній та груп оголошень</span>
          </div>

          <div className={styles.accessItem}>
            <div className={styles.iconWrapperError}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <span className={styles.accessItemCross}>Без доступу до вашої особистої переписки</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", marginTop: "10px" }}>
        <div style={{ textAlign: "left" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Введіть Facebook Access Token
          </label>
          <textarea
            className="form-input"
            placeholder="Вставте ваш токен (починається на EAAB... або EAAC...)"
            rows={3}
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ 
              width: "100%", 
              backgroundColor: "rgba(255, 255, 255, 0.03)", 
              border: "1px solid var(--border-color)", 
              borderRadius: "8px", 
              padding: "12px", 
              color: "#ffffff", 
              fontFamily: "var(--font-mono)", 
              fontSize: "12px",
              resize: "vertical"
            }}
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting} 
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            backgroundColor: "var(--color-accent)",
            color: "#050505",
            border: "none",
            borderRadius: "8px",
            padding: "14px",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "15px",
            transition: "all 0.2s"
          }}
        >
          {isSubmitting ? "Підключення..." : "Підключити акаунт"}
        </button>
      </form>

      {/* Mini Accordion for Help Instructions */}
      <div style={{ 
        marginTop: "24px", 
        padding: "16px", 
        backgroundColor: "rgba(255, 255, 255, 0.02)", 
        border: "1px solid var(--border-color)", 
        borderRadius: "8px",
        textAlign: "left"
      }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Як знайти свій Access Token за 30 секунд:
        </h3>
        <ol style={{ paddingLeft: "18px", fontSize: "13px", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "8px", lineHeight: "1.5" }}>
          <li>
            Відкрийте ваш рекламний кабінет <strong>Facebook Ads Manager</strong>.
          </li>
          <li>
            Натисніть правою кнопкою миші у порожньому місці сторінки та оберіть <strong>«Переглянути код сторінки»</strong> (або натисніть комбінацію клавіш <kbd style={{ padding: "2px 4px", backgroundColor: "#333", borderRadius: "4px" }}>Ctrl+U</kbd> / <kbd style={{ padding: "2px 4px", backgroundColor: "#333", borderRadius: "4px" }}>Cmd+Option+U</kbd>).
          </li>
          <li>
            На сторінці з кодом натисніть пошук <kbd style={{ padding: "2px 4px", backgroundColor: "#333", borderRadius: "4px" }}>Ctrl+F</kbd> або <kbd style={{ padding: "2px 4px", backgroundColor: "#333", borderRadius: "4px" }}>Cmd+F</kbd> та знайдіть текст: <strong>EAAB</strong> (або <strong>EAAC</strong>).
          </li>
          <li>
            Скопіюйте цей довгий рядок символів (він виглядає як <code>EAABz...</code> або <code>EAACw...</code>) та вставте його в поле вище!
          </li>
        </ol>
      </div>
    </div>
  );
}
