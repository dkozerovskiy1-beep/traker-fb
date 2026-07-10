"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface UserProfileProps {
  user: {
    name: string | null;
    email: string;
  } | null;
  role: string;
}

export default function UserProfile({ user, role }: UserProfileProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!confirm("Ви дійсно бажаєте вийти з системи?")) return;
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST"
      });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      } else {
        alert("Помилка виходу");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "Користувач";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div style={{
      padding: "20px",
      borderTop: "1px solid var(--border-color)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: "auto",
      width: "100%"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "700",
          color: "var(--color-emerald)",
          fontSize: "14px",
          flexShrink: 0
        }}>
          {initial}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "white", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {displayName}
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {role}
          </span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        title="Вийти з кабінету"
        style={{
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          padding: "6px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
          marginRight: "-6px"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#ef4444";
          e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}
