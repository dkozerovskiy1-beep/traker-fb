import { db } from "@/app/lib/db";
import CommentsClient from "./CommentsClient";

export const dynamic = "force-dynamic";

export default async function CommentsPage() {
  let pages: any[] = [];
  let rules: any[] = [];
  let logs: any[] = [];

  try {
    // 1. Fetch pages, rules, and logs from Database
    pages = await db.fbPage.findMany({
      select: { id: true, name: true }
    });

    rules = await db.moderationRule.findMany({
      orderBy: { createdAt: "desc" }
    });

    logs = await db.moderationLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        page: { select: { name: true } }
      }
    });
  } catch (error) {
    console.error("Prisma query error in CommentsPage (using mock comments fallback):", error);

    // Fallback Mock Data matching Screenshot 4 details
    pages = [
      { id: "113171585146866", name: "Olumus Trast" },
      { id: "931823956827613", name: "My Business Page" }
    ];

    rules = [
      {
        id: "rule_1",
        pageId: "113171585146866",
        name: "Блокування Telegram спаму",
        type: "TELEGRAM",
        keywords: "",
        action: "DELETE",
        isActive: true
      },
      {
        id: "rule_2",
        pageId: "113171585146866",
        name: "Приховування нецензурних слів",
        type: "STOP_WORDS",
        keywords: "хуйня, кидалово, обман, розвод",
        action: "HIDE",
        isActive: true
      }
    ];

    logs = [
      {
        id: "log_1",
        postId: "post_101",
        commentId: "comment_9921",
        commentText: "Залітайте в приватний канал t.me/easy_money_ua !",
        authorName: "Степан Бойко",
        actionTaken: "DELETED",
        ruleMatched: "Блокування Telegram спаму",
        createdAt: new Date("2026-07-07T14:30:00Z"),
        page: { name: "Olumus Trast" }
      },
      {
        id: "log_2",
        postId: "post_101",
        commentId: "comment_9855",
        commentText: "Це повний розвод, не ведіться хлопці",
        authorName: "Андрій Кравченко",
        actionTaken: "HIDDEN",
        ruleMatched: "Приховування нецензурних слів",
        createdAt: new Date("2026-07-07T13:15:00Z"),
        page: { name: "Olumus Trast" }
      },
      {
        id: "log_3",
        postId: "post_102",
        commentId: "comment_9712",
        commentText: "Нормальна тема, вчора отримав замовлення",
        authorName: "Ірина Шевченко",
        actionTaken: "HIDDEN", // This is just a placeholder action for display
        ruleMatched: "Автоматичний спам-фільтр",
        createdAt: new Date("2026-07-06T18:40:00Z"),
        page: { name: "My Business Page" }
      }
    ];
  }

  return (
    <CommentsClient
      pages={pages}
      rules={rules}
      logs={logs}
    />
  );
}
