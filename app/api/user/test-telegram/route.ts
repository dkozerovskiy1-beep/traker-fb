import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/app/lib/auth";
import { sendTelegramAlert } from "@/app/lib/telegram";

export async function POST(req: Request) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!user.telegramChatId) {
      return NextResponse.json({ success: false, error: "Telegram chat ID not configured" }, { status: 400 });
    }

    const testMessage =
      `🔔 <b>[VartaFlow Test] ТЕСТОВЕ СПОВІЩЕННЯ</b>\n\n` +
      `• <b>Користувач:</b> ${user.name || user.email}\n` +
      `• <b>Статус бота:</b> Активний та готовий до роботи ✅\n` +
      `• <b>Сповіщення:</b> Ви будете отримувати сповіщення при вильоті соців на чек, банах кабінетів та відхиленні креативів.`;

    const sent = await sendTelegramAlert(testMessage, user.telegramChatId);

    if (sent) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Не вдалося надіслати повідомлення через Telegram API" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Test telegram alert error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
  }
}
