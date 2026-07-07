import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MetricFlow - FB Ads Tracker",
  description: "Повноцінний трекер та автоматизація реклами Facebook",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="app-container">
          {/* Sidebar Navigation */}
          <aside className="sidebar">
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "24px", borderBottom: "1px solid var(--border-color)" }}>
              <div style={{
                width: "36px",
                height: "36px",
                background: "var(--color-accent-gradient)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(99, 102, 241, 0.3)"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "white" }}>
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <span style={{ fontSize: "18px", fontWeight: "700", color: "white", letterSpacing: "-0.5px" }}>MetricFlow</span>
            </div>

            {/* Navigation links */}
            <nav style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link href="/" className="nav-item" style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "14px",
                fontWeight: "500",
                color: "var(--text-primary)",
                transition: "background-color var(--transition-fast)"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
                <span>Аналітика реклами</span>
              </Link>

              <Link href="/accounts" className="nav-item" style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "14px",
                fontWeight: "500",
                color: "var(--text-primary)",
                transition: "background-color var(--transition-fast)"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>FB Акаунти</span>
              </Link>

              <Link href="/comments" className="nav-item" style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                fontSize: "14px",
                fontWeight: "500",
                color: "var(--text-primary)",
                transition: "background-color var(--transition-fast)"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Модерація коментарів</span>
              </Link>
            </nav>

            {/* Bottom user card */}
            <div style={{
              padding: "20px 16px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "var(--border-color-glow)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                color: "var(--color-accent)",
                fontSize: "14px"
              }}>
                Д
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "white" }}>Дмитро</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>Власник</span>
              </div>
            </div>
          </aside>

          {/* Main content area */}
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

