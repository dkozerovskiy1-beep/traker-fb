export async function sendTelegramAlert(message: string, customChatId?: string | null): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = customChatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram alerts are not configured. Missing token or chat ID.");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Telegram API error:", errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram alert:", error);
    return false;
  }
}
