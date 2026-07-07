import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "../../lib/db";
import { getFacebookAuthUrl } from "../../lib/facebook";
import styles from "./invite.module.css";

interface InvitePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const resolvedParams = await params;
  const inviteId = resolvedParams.id;

  // 1. Fetch the invite link details from the database
  const invite = await db.inviteLink.findUnique({
    where: { id: inviteId },
    include: { user: true }
  });

  // If invite doesn't exist, show custom invalid card or not found
  const isValid = invite && !(invite.isOneTime && invite.usedAt);
  const inviterName = invite?.user?.name || "Адміністратор";
  const inviterInitial = inviterName.charAt(0).toUpperCase();

  // 2. Generate Facebook OAuth authorization URL
  const fbLoginUrl = isValid ? getFacebookAuthUrl(inviteId) : "#";

  return (
    <div className={styles.container}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <span className={styles.logoText}>MetricFlow</span>
      </div>

      {isValid ? (
        <div className={styles.card}>
          <div className={styles.userInitial}>{inviterInitial}</div>
          <h1 className={styles.title}>{inviterName} запрошує вас підключитися</h1>
          <p className={styles.subtitle}>
            Підключіть Facebook акаунт для доступу до рекламних кабінетів
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
                <span className={styles.accessItemCheck}>Метрики рекламних кабінетів</span>
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
                <span className={styles.accessItemCross}>Без доступу до вашого особистого профілю</span>
              </div>
            </div>
          </div>

          <a href={fbLoginUrl} className={styles.fbButton}>
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>Підключити через Facebook</span>
          </a>

          <div className={styles.securityNote}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Захищено OAuth 2.0 — ми не бачимо ваш пароль</span>
          </div>
        </div>
      ) : (
        <div className={`${styles.card} ${styles.errorCard}`}>
          <div className={styles.errorIcon}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className={styles.errorTitle}>Запрошення недійсне</h2>
          <p className={styles.errorMessage}>
            Це посилання-запрошення вже було використано або його не існує в системі. Будь ласка, зверніться до адміністратора для створення нового посилання.
          </p>
          <Link href="/" className={`${styles.btn} styles.btn-secondary`}>
            На головну
          </Link>
        </div>
      )}

      <div className={styles.footerSupport}>
        Потрібна допомога? <span className={styles.supportLink}>Написати в підтримку</span>
      </div>
    </div>
  );
}
