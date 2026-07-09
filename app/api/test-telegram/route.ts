import { NextResponse } from "next/server";
import { sendTelegramAlert } from "@/app/lib/telegram";

/**
 * Test endpoint to verify Telegram bot integration.
 * Call: GET /api/test-telegram
 * DELETE THIS FILE after confirming it works!
 */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json({
      success: false,
      error: "Змінні оточення відсутні.",
      details: {
        hasToken: !!token,
        hasChatId: !!chatId,
        message: "Переконайтеся, що TELEGRAM_BOT_TOKEN та TELEGRAM_CHAT_ID додані в Vercel Settings -> Environment Variables, і після цього був зроблений новий Deploy проекту."
      }
    }, { status: 400 });
  }

  const now = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ <b>[VartaFlow] Тестове повідомлення</b>\n\nБот налаштований правильно!\nЧас: ${now}`,
        parse_mode: "HTML"
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({
        success: false,
        error: "Telegram API повернув помилку",
        statusCode: res.status,
        details: errorText
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Тестове повідомлення надіслано в Telegram!"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: "Виникла виключна ситуація (exception)",
      details: error.message
    }, { status: 500 });
  }
}
