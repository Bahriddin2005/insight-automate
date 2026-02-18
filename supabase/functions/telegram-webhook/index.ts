import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_API = "https://api.telegram.org/bot";

serve(async (req) => {
  // Health / verification
  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, service: "telegram-webhook" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Optional: verify secret_token (set in setWebhook?secret_token=...)
  const secret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  const expectedSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (expectedSecret && secret !== expectedSecret) {
    return new Response("Forbidden", { status: 403 });
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

  try {
    const message = update.message ?? update.edited_message;
    const callback = update.callback_query;

    if (message) {
      const chatId = message.chat.id;
      const text = (message.text ?? "").trim();
      const username = message.from?.username;

      // Echo / start
      if (text === "/start") {
        await sendReply(botToken, chatId, "Bot ishlayapti. Webhook orqali update qabul qilinmoqda.");
      }
      // Add your OTP trigger logic here, e.g. detect command or keyword
      else if (text) {
        // Placeholder: log and optional reply
        console.log("Message:", { chatId, text, username });
        // await sendReply(botToken, chatId, "Qabul qilindi.");
      }
    }

    if (callback) {
      const chatId = callback.message?.chat?.id;
      const data = callback.data;
      if (chatId && data) {
        console.log("Callback:", { chatId, data });
        await answerCallbackQuery(botToken, callback.id);
      }
    }
  } catch (e) {
    console.error("telegram-webhook error:", e);
  }

  // Always return 200 so Telegram does not retry
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

async function sendReply(token: string | undefined, chatId: number, text: string) {
  if (!token) return;
  await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function answerCallbackQuery(token: string | undefined, callbackQueryId: string) {
  if (!token) return;
  await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}

// Telegram update payload types
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
    date: number;
  };
  edited_message?: TelegramUpdate["message"];
  callback_query?: {
    id: string;
    from: { id: number; username?: string };
    message?: { chat: { id: number } };
    data?: string;
  };
}
