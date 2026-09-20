/**
 * Telegram Bot API Client
 * Author: IboTV
 * Platform: OKX X Layer (Chain ID 196)
 */

export class TelegramBlockedError extends Error {
  constructor(message = "Telegram bot was blocked by the user") {
    super(message);
    this.name = "TelegramBlockedError";
  }
}

interface TextArgs {
  to: string;
  body: string;
}

interface ImageArgs {
  to: string;
  imageUrl: string;
  caption?: string;
}

interface Choice {
  label: string;
  value: string;
}

interface ChoicesArgs extends TextArgs {
  choices: Choice[];
}

interface LinkArgs extends TextArgs {
  label: string;
  url: string;
}

function getToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

/**
 * Send text message via Telegram Bot API.
 * Supports both object signature ({ to, body }) and positional (chatId, text, options).
 */
export async function sendTelegramMessage(
  target: TextArgs | string | number,
  maybeBody?: string,
  options: { parse_mode?: string; reply_markup?: any } = {}
): Promise<string> {
  const token = getToken();
  const chatId = typeof target === "object" ? target.to : String(target);
  const text = typeof target === "object" ? target.body : maybeBody || "";
  const parseMode = options.parse_mode ?? "Markdown";

  if (!token) {
    console.warn("[Telegram Client] TELEGRAM_BOT_TOKEN not configured. Message simulated:", {
      chatId,
      snippet: text.slice(0, 60),
    });
    return `sim_tg_${Date.now()}`;
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      reply_markup: options.reply_markup,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    const desc = data.description || "Telegram API request failed";
    if (res.status === 403 || desc.toLowerCase().includes("blocked")) {
      throw new TelegramBlockedError(desc);
    }
    console.error("[Telegram Client] sendMessage failed:", desc);
    throw new Error(`Telegram sendMessage failed: ${desc}`);
  }

  return String(data.result?.message_id || Date.now());
}

/**
 * Send photo via Telegram Bot API.
 */
export async function sendTelegramImage({ to, imageUrl, caption }: ImageArgs): Promise<string> {
  const token = getToken();
  if (!token) {
    console.warn("[Telegram Client] TELEGRAM_BOT_TOKEN not set, image simulated for", to);
    return `sim_img_${Date.now()}`;
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendPhoto`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: to,
      photo: imageUrl,
      caption: caption || "",
      parse_mode: "Markdown",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    const desc = data.description || "Telegram sendPhoto failed";
    if (res.status === 403 || desc.toLowerCase().includes("blocked")) {
      throw new TelegramBlockedError(desc);
    }
    throw new Error(`Telegram sendPhoto failed: ${desc}`);
  }

  return String(data.result?.message_id || Date.now());
}

/**
 * Send message with interactive inline keyboard buttons.
 */
export async function sendTelegramChoices({ to, body, choices }: ChoicesArgs): Promise<string | null> {
  const inlineKeyboard = choices.map((c) => [
    {
      text: c.label,
      callback_data: c.value,
    },
  ]);

  try {
    return await sendTelegramMessage(to, body, {
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });
  } catch (err) {
    console.error("[Telegram Client] sendTelegramChoices failed:", err);
    return null;
  }
}

/**
 * Send message with an open-URL button (e.g. Sign in Web App / OKX Wallet).
 */
export async function sendTelegramLink({ to, body, label, url }: LinkArgs): Promise<string | null> {
  try {
    return await sendTelegramMessage(to, body, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: label,
              url,
            },
          ],
        ],
      },
    });
  } catch (err) {
    console.error("[Telegram Client] sendTelegramLink failed:", err);
    return null;
  }
}

/**
 * Configure Telegram webhook pointing to our server route.
 */
export async function setTelegramWebhook(
  webhookUrl: string,
  secretToken?: string
): Promise<{ ok: boolean; description?: string }> {
  const token = getToken();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN environment variable is not set.");
  }

  const endpoint = `https://api.telegram.org/bot${token}/setWebhook`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secretToken || undefined,
      allowed_updates: ["message", "edited_message", "callback_query"],
    }),
  });

  return await res.json();
}

/**
 * Query current Telegram webhook status.
 */
export async function getTelegramWebhookInfo(): Promise<any> {
  const token = getToken();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN environment variable is not set.");
  }

  const endpoint = `https://api.telegram.org/bot${token}/getWebhookInfo`;
  const res = await fetch(endpoint);
  return await res.json();
}
