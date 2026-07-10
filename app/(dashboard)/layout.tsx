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
        <div style={{ display: "flex", alignItems: "center", padding: "28px 24px", borderBottom: "1px solid var(--border-color)" }}>
          <img 
            src="/vartaflow-gorizonr-logo.svg" 
            alt="VartaFlow" 
            style={{ 
              height: "26px", 
              width: "auto", 
              objectFit: "contain"
            }} 
          />
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
