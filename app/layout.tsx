import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SidebarNav from "./components/SidebarNav";
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
  title: "VartaFlow - FB Ads Tracker",
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
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "28px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <div style={{
                width: "36px",
                height: "36px",
                background: "var(--color-accent-gradient)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#04060a" }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <span style={{ fontSize: "19px", fontWeight: "800", color: "white", letterSpacing: "-0.6px" }}>VartaFlow</span>
            </div>

            {/* Navigation links */}
            <SidebarNav />

            {/* Bottom user card */}
            <div style={{
              padding: "20px 24px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
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

