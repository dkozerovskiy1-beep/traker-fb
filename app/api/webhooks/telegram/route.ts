import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

/**
 * Webhook handler for Telegram Bot updates.
 * Route: POST /api/webhooks/telegram
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = body.message;

    // We only care about text messages
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    const chatId = String(message.chat.id);

    // Check if it's a /start command with user ID parameter
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      if (parts.length > 1) {
        const userId = parts[1];

        // Find the user by ID
        const user = await db.user.findUnique({
          where: { id: userId }
        });

        if (user) {
          // Save the chat ID to user
          await db.user.update({
            where: { id: userId },
            data: { telegramChatId: chatId }
          });

          // Send confirmation back to Telegram
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (botToken) {
            const sendUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
            await fetch(sendUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🎉 <b>VartaFlow: Підключення успішне!</b>\n\nПривіт, ${user.name || "користувач"}!\n\nВи успішно підключили свій Telegram-акаунт до сервісу VartaFlow.\n\nТепер ви будете отримувати сповіщення про важливі зміни статусів ваших рекламних кабінетів та оголошень відповідно до ваших налаштувань.`,
                parse_mode: "HTML"
              })
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error handling Telegram webhook:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram to prevent retries
  }
}
