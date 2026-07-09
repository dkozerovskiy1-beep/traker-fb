import { db } from "@/app/lib/db";
import CommentsClient from "./CommentsClient";

export const dynamic = "force-dynamic";

export default async function CommentsPage() {
  let pages: any[] = [];
  let rules: any[] = [];
  let logs: any[] = [];
  let comments: any[] = [];

  try {
    // 1. Fetch pages, rules, logs, and comments from Database
    pages = await db.fbPage.findMany({
      select: { id: true, name: true }
    });

    rules = await db.moderationRule.findMany({
      orderBy: { createdAt: "desc" }
    });

    logs = await db.moderationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        page: { select: { name: true } }
      }
    });

    // Fetch all recent comments (up to 200)
    comments = await db.fbComment.findMany({
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
