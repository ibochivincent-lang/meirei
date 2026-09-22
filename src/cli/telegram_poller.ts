/**
 * Meirei Live Telegram Long-Polling Runner
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Allows running the live Telegram Bot locally or in background workers
 * without requiring public HTTPS webhook tunnels or ngrok.
 */

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env.local");
  } catch {}
  try {
    process.loadEnvFile(".env");
  } catch {}
}

import { sendTelegramMessage } from "../../lib/telegram/client";

const SERVER_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || undefined,
      }),
    });
  } catch (err) {
    // Ignore non-critical callback errors
  }
}

async function startPolling() {
  if (!TOKEN) {
    console.error("Error: TELEGRAM_BOT_TOKEN environment variable is not set.");
    console.error("Please add TELEGRAM_BOT_TOKEN=... to your .env file or environment.");
    console.error("To get a token, talk to @BotFather in Telegram and create a new bot.");
    process.exit(1);
  }

  console.log("======================================================================");
  console.log("             PROJECT MEIREI | LIVE TELEGRAM POLLER                    ");
  console.log("             Author: IboTV | Network: OKX X Layer (196)               ");
  console.log("======================================================================");
  console.log("Target Webhook Server:", SERVER_URL);
  console.log("Starting long-polling connection with Telegram Bot API...");

  // Delete any existing webhook so polling can receive updates
  try {
    const delRes = await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`);
    const delData = await delRes.json();
    console.log("Webhook reset for polling:", delData.description || "OK");
  } catch (delErr) {
    console.warn("Notice resetting webhook:", delErr);
  }

  let offset = 0;
  let running = true;

  const restoreProductionWebhook = async () => {
    try {
      console.log("\nRestoring Telegram production webhook...");
      const prodUrl = "https://meirei-rho.vercel.app/api/webhooks/telegram";
      const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: prodUrl,
          allowed_updates: ["message", "edited_message", "callback_query"],
        }),
      });
      const data = await res.json();
      console.log("Production webhook restored on exit:", data.description || "OK");
    } catch (err) {
      console.warn("Notice restoring webhook on exit:", err);
    }
  };

  process.on("SIGINT", async () => {
    console.log("\nStopping Telegram Poller. Goodbye!");
    running = false;
    await restoreProductionWebhook();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    running = false;
    await restoreProductionWebhook();
    process.exit(0);
  });

  while (running) {
    try {
      const url = `https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${offset}&timeout=25&allowed_updates=["message","edited_message","callback_query"]`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.ok) {
        console.error("Telegram getUpdates error:", data.description);
        await sleep(3000);
        continue;
      }

      const updates: any[] = data.result || [];
      for (const update of updates) {
        offset = update.update_id + 1;

        const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
        const text =
          update.message?.text ||
          update.callback_query?.data ||
          (update.message?.voice ? "[Voice Note]" : update.message?.audio ? "[Audio File]" : "");
        const from = update.message?.from?.username || update.callback_query?.from?.username || "user";

        console.log(`[Telegram Update #${update.update_id}] From @${from} (Chat ${chatId}): "${text}"`);

        // Forward update to the local Meirei webhook handler
        try {
          const webhookRes = await fetch(`${SERVER_URL}/api/webhooks/telegram`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(update),
          });

          const replyData = await webhookRes.json();

          // If the webhook returned a sendMessage payload and we didn't push out-of-band:
          if (replyData.method === "sendMessage" && replyData.text && chatId) {
            await sendTelegramMessage(chatId, replyData.text, {
              parse_mode: replyData.parse_mode,
              reply_markup: replyData.reply_markup,
            });
            console.log(`[Replied to @${from}]:`, replyData.text.split("\n")[0]);
          }

          if (update.callback_query) {
            await answerCallbackQuery(TOKEN, update.callback_query.id, "Action processed");
          }
        } catch (forwardErr: unknown) {
          const errMsg = forwardErr instanceof Error ? forwardErr.message : String(forwardErr);
          console.error("Failed to process update via handler:", errMsg);
        }
      }
    } catch (pollErr: unknown) {
      const errMsg = pollErr instanceof Error ? pollErr.message : String(pollErr);
      console.warn("Polling network blip:", errMsg);
      await sleep(2000);
    }
  }
}

startPolling();
