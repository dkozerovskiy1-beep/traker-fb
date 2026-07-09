import { db } from "@/app/lib/db";
import { getLoggedInUser } from "@/app/lib/auth";
import AccountsClient from "./AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  let inviteLinks: any[] = [];
  let socialAccounts: any[] = [];
  let user: any = null;

  try {
    user = await getLoggedInUser();

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
  }

  let botUsername = "varta_flow_bot";
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          botUsername = data.result.username;
        }
      }
    } catch (err) {
      console.error("Failed to get Telegram Bot username:", err);
    }
  }

  return (
    <AccountsClient
      initialInviteLinks={inviteLinks}
      socialAccounts={socialAccounts}
      currentUser={user}
      botUsername={botUsername}
    />
  );
}
