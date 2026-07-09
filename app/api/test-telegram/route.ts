import { NextResponse } from "next/server";
import { sendTelegramAlert } from "@/app/lib/telegram";

/**
 * Test endpoint to verify Telegram bot integration.
 * Call: GET /api/test-telegram
 * DELETE THIS FILE after confirming it works!
 */
export async function GET() {
  const now = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });

  const success = await sendTelegramAlert(
    `✅ <b>[VartaFlow] Тестове повідомлення</b>\n\n` +
    `Telegram-бот працює коректно!\n` +
    `Час: ${now}\n\n` +
    `Ви будете отримувати сповіщення про:\n` +
    `• 🚫 Бани рекламних кабінетів\n` +
    `• ❌ Відхилені оголошення\n` +
    `• ✅ Затверджені оголошення`
  );

  if (success) {
    return NextResponse.json({
      success: true,
      message: "Тестове повідомлення надіслано в Telegram! Перевірте бот."
    });
  } else {
    return NextResponse.json({
      success: false,
      error: "Не вдалося надіслати повідомлення. Перевірте TELEGRAM_BOT_TOKEN та TELEGRAM_CHAT_ID в Vercel Environment Variables."
    }, { status: 500 });
  }
}
