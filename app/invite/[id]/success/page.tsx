import styles from "../invite.module.css";

export default function InviteSuccessPage() {
  return (
    <div className={styles.container}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon} style={{
          backgroundColor: "var(--color-emerald)",
          background: "var(--color-accent-gradient)",
          boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)"
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#04060a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "22px", height: "22px" }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <span className={styles.logoText}>VartaFlow</span>
      </div>

      <div className={styles.card} style={{ textAlign: "center" }}>
        <div style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          color: "var(--color-emerald)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
          boxShadow: "0 0 20px rgba(16, 185, 129, 0.1) inset"
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className={styles.title} style={{ color: "var(--color-emerald)", marginBottom: "16px" }}>
          Акаунт успішно підключено!
        </h1>
        
        <p className={styles.subtitle} style={{ marginBottom: "24px", fontSize: "15px", lineHeight: "1.6" }}>
          Дякуємо! Доступ до рекламних кабінетів та бізнес-сторінок надано успішно. Всі статистичні дані імпортовані у сервіс VartaFlow.
        </p>

        <div style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "12px",
          width: "100%"
        }}>
          Ви можете безпечно закрити цю вкладку браузера.
        </div>
      </div>
    </div>
  );
}
