import { NextResponse } from "next/server";

/**
 * Setup endpoint to register Telegram Bot Webhook with Telegram.
 * Call: GET /api/telegram/setup
 */
export async function GET(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json({ success: false, error: "TELEGRAM_BOT_TOKEN missing in Environment Variables" }, { status: 400 });
  }

  // Get host from request headers to build webhook url dynamically
  const host = req.headers.get("host") || "fb-tracker-ads.vercel.app";
  const protocol = host.includes("localhost") ? "http" : "https";
  const webhookUrl = `${protocol}://${host}/api/webhooks/telegram`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: "Telegram Webhook successfully set!",
        webhookUrl,
        telegramResponse: data
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "Failed to set Telegram Webhook",
        telegramResponse: data
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
