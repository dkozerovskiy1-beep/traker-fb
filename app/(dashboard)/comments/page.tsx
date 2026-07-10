import { db } from "@/app/lib/db";
import { getLoggedInUser } from "@/app/lib/auth";
import CommentsClient from "./CommentsClient";

export const dynamic = "force-dynamic";

export default async function CommentsPage() {
  const user = await getLoggedInUser();
  if (!user) {
    return null;
  }

  let pages: any[] = [];
  let rules: any[] = [];
  let logs: any[] = [];
  let comments: any[] = [];

  try {
    // 1. Fetch pages, rules, logs, and comments from Database (filtered by logged-in user)
    pages = await db.fbPage.findMany({
      where: { socialAccount: { userId: user.id } },
      select: { id: true, name: true }
    });

    rules = await db.moderationRule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });

    logs = await db.moderationLog.findMany({
      where: { page: { socialAccount: { userId: user.id } } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        page: { select: { name: true } }
      }
    });

    // Fetch all recent comments (up to 200)
    comments = await db.fbComment.findMany({
      where: { page: { socialAccount: { userId: user.id } } },
      orderBy: { fbCreatedAt: "desc" },
      take: 200,
      include: {
        page: { select: { name: true } }
      }
    });
  } catch (error) {
    console.error("Prisma query error in CommentsPage:", error);
  }

  return (
    <CommentsClient
      pages={pages}
      rules={rules}
      logs={logs}
      comments={comments}
    />
  );
}
