/**
 * Telegram Webhook Configuration Tool
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Usage:
 *   npx tsx src/cli/set_webhook.ts https://your-deployment.vercel.app
 */

import { setTelegramWebhook, getTelegramWebhookInfo } from "../../lib/telegram/client";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("Error: TELEGRAM_BOT_TOKEN environment variable is required.");
    console.error("Set it via: export TELEGRAM_BOT_TOKEN=... or add to .env");
    process.exit(1);
  }

  let targetBaseUrl = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL;

  if (!targetBaseUrl) {
    console.error("Error: Target URL must be provided as an argument or in NEXT_PUBLIC_APP_URL.");
    console.error("Example: npx tsx src/cli/set_webhook.ts https://meirei.vercel.app");
    process.exit(1);
  }

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
      console.log("\nYour Telegram Bot is now live and routing to your Vercel deployment.");
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
