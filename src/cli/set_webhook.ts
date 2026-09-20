/**
 * Telegram Webhook Configuration Tool
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Usage:
 *   npm run bot:webhook <URL> [BOT_TOKEN]
 *   npm run bot:webhook https://meirei.vercel.app 123456789:ABCdefGhIJK...
 */

import { setTelegramWebhook, getTelegramWebhookInfo } from "../../lib/telegram/client";

async function main() {
  const arg1 = process.argv[2]?.trim();
  const arg2 = process.argv[3]?.trim();

  let targetBaseUrl = "";
  let token = process.env.TELEGRAM_BOT_TOKEN || "";

  // Helper to test if string is a Telegram Bot token format (e.g. 123456:ABC-DEF...)
  const isBotToken = (val?: string) => Boolean(val && /^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(val));
  const isUrl = (val?: string) => Boolean(val && /^https?:\/\//i.test(val));

  if (isUrl(arg1)) {
    targetBaseUrl = arg1!;
    if (arg2) token = arg2;
  } else if (isBotToken(arg1)) {
    token = arg1!;
    if (isUrl(arg2)) targetBaseUrl = arg2!;
  } else if (arg1) {
    targetBaseUrl = arg1;
    if (arg2) token = arg2;
  }

  if (!targetBaseUrl) {
    targetBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  }

  // Detect literal placeholder in URL
  if (targetBaseUrl.includes("<") || targetBaseUrl.includes("your-vercel-domain")) {
    console.error("\n[Meirei Notice] Please replace '<your-vercel-domain>' with your actual deployment URL.");
    console.error("Example: npm run bot:webhook https://meirei.vercel.app");
    process.exit(1);
  }

  if (!targetBaseUrl) {
    console.error("\n[Meirei Notice] Deployment URL is required.");
    console.error("Usage:");
    console.error("  npm run bot:webhook <URL> [BOT_TOKEN]");
    console.error("  npm run bot:webhook https://meirei.vercel.app 123456789:ABCdefGhIJK...");
    process.exit(1);
  }

  if (!token) {
    console.error("\n[Meirei Notice] Telegram Bot Token is required.");
    console.error("You can provide it directly on the command line:");
    console.error(`  npm run bot:webhook ${targetBaseUrl} <YOUR_BOT_TOKEN>`);
    console.error("\nOr set it in your environment or .env.local file:");
    console.error("  TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJK...");
    console.error("\nTo get a free bot token, open Telegram and send /newbot to @BotFather.");
    process.exit(1);
  }

  // Set in environment for client functions
  process.env.TELEGRAM_BOT_TOKEN = token;

  targetBaseUrl = targetBaseUrl.replace(/\/+$/, "");
  const fullWebhookUrl = targetBaseUrl.endsWith("/api/webhooks/telegram")
    ? targetBaseUrl
    : `${targetBaseUrl}/api/webhooks/telegram`;

  console.log("======================================================================");
  console.log("             PROJECT MEIREI | TELEGRAM WEBHOOK BINDING                ");
  console.log("             Author: IboTV | Network: OKX X Layer (196)               ");
  console.log("======================================================================");
  console.log("Target Webhook URL:", fullWebhookUrl);
  console.log("Connecting to Telegram Bot API...");

  try {
    const result = await setTelegramWebhook(fullWebhookUrl);
    if (result.ok) {
      console.log("\nSuccess: Telegram webhook successfully configured!");
      console.log("Status Message:", result.description || "Webhook set");

      console.log("\nVerifying current Webhook Info...");
      const info = await getTelegramWebhookInfo();
      console.log(JSON.stringify(info, null, 2));
      console.log("\nYour Telegram Bot is live and routing directly on OKX X Layer.");
    } else {
      console.error("\nFailed to configure webhook:", result.description);
      process.exit(1);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\nNetwork or API error:", msg);
    process.exit(1);
  }
}

main();
