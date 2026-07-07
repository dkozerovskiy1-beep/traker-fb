import { notFound } from "next/navigation";
import { db } from "../../lib/db";
import styles from "./invite.module.css";
import InviteClient from "./InviteClient";

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

  if (!invite) {
    return notFound();
  }

  // Check validity
  const isValid = !(invite.isOneTime && invite.usedAt);
  const inviterName = invite.user?.name || "Адміністратор";
  const inviterInitial = inviterName.charAt(0).toUpperCase();

  return (
    <div className={styles.container}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <span className={styles.logoText}>VartaFlow</span>
      </div>

      {isValid ? (
        <InviteClient
          inviteId={inviteId}
          inviterName={inviterName}
          inviterInitial={inviterInitial}
        />
      ) : (
        <div className={`${styles.card} ${styles.errorCard}`}>
          <div className={styles.errorIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className={styles.title}>Запрошення недійсне</h1>
          <p className={styles.subtitle}>
            Це посилання-запрошення вже було використано або термін його дії закінчився.
          </p>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "12px" }}>
            Будь ласка, зверніться до адміністратора VartaFlow для отримання нового посилання.
          </p>
        </div>
      )}
    </div>
  );
}
