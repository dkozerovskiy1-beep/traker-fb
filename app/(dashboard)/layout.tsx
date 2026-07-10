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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "28px 24px", borderBottom: "1px solid var(--border-color)" }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              width: "32px", 
              height: "32px", 
              objectFit: "contain",
              borderRadius: "8px"
            }} 
          />
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <span style={{ fontSize: "19px", fontWeight: "800", color: "white", letterSpacing: "-0.6px" }}>Varta</span>
            <img 
              src="/flow.png" 
              alt="Flow" 
              style={{ 
                height: "16px", 
                width: "auto", 
                objectFit: "contain",
                marginTop: "2px"
              }} 
            />
          </div>
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
