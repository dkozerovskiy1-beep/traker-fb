import { db } from "@/app/lib/db";
import AccountsClient from "./AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  let inviteLinks: any[] = [];
  let socialAccounts: any[] = [];

  try {
    // Try to load data from PostgreSQL
    inviteLinks = await db.inviteLink.findMany({
      orderBy: { createdAt: "desc" }
    });

    socialAccounts = await db.fbSocialAccount.findMany({
      include: {
        adAccounts: true,
        pages: true
      }
    });
  } catch (error) {
    console.error("Prisma query failed on AccountsPage (database might not be initialized yet):", error);
    
    // Default fallback mock data to show Dmytro the UI and design even before deploying PostgreSQL!
    inviteLinks = [
      {
        id: "0b2928d3-282b-41bf-876a-e5f73c569a9b",
        description: "Кабінет клієнта ТОВ Ромашка",
        isOneTime: true,
        createdAt: new Date("2026-07-07T12:00:00Z"),
        usedAt: new Date("2026-07-07T13:45:00Z"),
        usedByFbId: "2221942741927149"
      },
      {
        id: "a75fb2c8-fb1c-4b51-b844-315f60b4a4cb",
        description: "Мій додатковий соц акаунт (Harold)",
        isOneTime: false,
        createdAt: new Date("2026-07-06T10:00:00Z"),
        usedAt: null,
        usedByFbId: null
      }
    ];

    socialAccounts = [
      {
        id: "2221942741927149",
        name: "Harold Fotso",
        avatarUrl: null, // Initial will render
        status: "ACTIVE",
        tokenExpiresAt: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000), // 50 days left
        adAccounts: [
          { id: "act_3359672500881835", name: "MC7595 (Personal)", currency: "USD", status: "ACTIVE", spend: 278.93 },
          { id: "act_4492817290192837", name: "Business Cabinet 2", currency: "EUR", status: "ACTIVE", spend: 540.20 }
        ],
        pages: [
          { id: "113171585146866", name: "Olumus Trast" },
          { id: "931823956827613", name: "My Business Page" }
        ]
      }
    ];
  }

  return (
    <AccountsClient
      initialInviteLinks={inviteLinks}
      socialAccounts={socialAccounts}
    />
  );
}
