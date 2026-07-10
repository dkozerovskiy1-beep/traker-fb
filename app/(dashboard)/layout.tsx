import SidebarNav from "../components/SidebarNav";
import UserProfile from "../components/UserProfile";
import { getLoggedInUser } from "../lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getLoggedInUser();
  const adminEmail = process.env.ADMIN_EMAIL || "admin@tracker.com";
  const role = user?.email === adminEmail ? "Власник" : "Користувач";

  return (
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
        <UserProfile user={user} role={role} />
      </aside>

      {/* Main content area */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
