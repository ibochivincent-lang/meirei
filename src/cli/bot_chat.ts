/**
 * Meirei Interactive CLI Bot Simulator
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Simulates real conversational bot interactions across Telegram and WhatsApp channels
 * with live on-chain X Layer quotes, mandate parsing, rebalance planning, and emergency circuit breakers.
 */

import * as readline from "node:readline";

const DEFAULT_SERVER = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface BotResponse {
  channel: string;
  sender: string;
  text: string;
  keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
}

async function sendToBot(channel: "telegram" | "whatsapp", text: string, serverUrl = DEFAULT_SERVER): Promise<BotResponse> {
  if (channel === "telegram") {
    const res = await fetch(`${serverUrl}/api/webhooks/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          chat: { id: 7770001 },
          from: { id: 7770001, username: "ibotv_investor" },
          text,
        },
      }),
    });

    const data = await res.json();
    return {
      channel: "Telegram",
      sender: "@ibotv_investor",
      text: data.text || JSON.stringify(data, null, 2),
      keyboard: data.reply_markup?.inline_keyboard,
    };
  } else {
    const res = await fetch(`${serverUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 019 6196",
        message: text,
      }),
    });

    const data = await res.json();
    return {
      channel: "WhatsApp",
      sender: "+1 (555) 019 6196",
      text: data.reply || JSON.stringify(data, null, 2),
    };
  }
}

function printDivider() {
  console.log("----------------------------------------------------------------------");
}

function renderBotOutput(response: BotResponse) {
  printDivider();
  console.log(`[MEIREI BOT | ${response.channel.toUpperCase()}]`);
  console.log(response.text);

  if (response.keyboard && response.keyboard.length > 0) {
    console.log("\n[Interactive Buttons]");
    response.keyboard.forEach((row, i) => {
      const rowLabels = row.map((btn) => `[${btn.text}${btn.url ? ` -> ${btn.url}` : ""}]`).join("  ");
      console.log(` Row ${i + 1}: ${rowLabels}`);
    });
  }
  printDivider();
}

async function startInteractiveRepl() {
  let activeChannel: "telegram" | "whatsapp" = "telegram";

  console.log("\n======================================================================");
  console.log("             PROJECT MEIREI | LIVE BOT SIMULATOR                     ");
  console.log("             Author: IboTV | Network: OKX X Layer (196)               ");
  console.log("======================================================================");
  console.log("Active Channel:", activeChannel.toUpperCase());
  console.log("Try typing:");
  console.log('  - "/stocks"               (Live market quotes)');
  console.log('  - "Price of NVDAx"        (Spot quote from X Layer)');
  console.log('  - "Compare NVDAx vs TSLAx"(Relative ratio)');
  console.log('  - "Calculate $500 NVDAx"  (Unit calculator)');
  console.log('  - "/balance"              (Holdings & total valuation)');
  console.log('  - "60% Mag7, 20% USDG"    (Mandate advisory plan)');
  console.log('  - "/freeze"               (Emergency circuit breaker)');
  console.log('  - "/channel wa"           (Switch to WhatsApp simulator)');
  console.log('  - "/channel tg"           (Switch to Telegram simulator)');
  console.log('  - "exit"                  (Quit simulator)');
  console.log("======================================================================\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = () => {
    rl.question(`[${activeChannel.toUpperCase()}] You > `, async (input) => {
      const clean = input.trim();
      if (!clean) {
        promptUser();
        return;
      }

      if (clean.toLowerCase() === "exit" || clean.toLowerCase() === "/exit") {
        console.log("\nExiting Meirei Bot Simulator. Bye!");
        rl.close();
        process.exit(0);
      }

      if (clean.toLowerCase() === "/channel wa" || clean.toLowerCase() === "channel wa") {
        activeChannel = "whatsapp";
        console.log("\n[Switched to WhatsApp Simulator Mode]\n");
        promptUser();
        return;
      }

      if (clean.toLowerCase() === "/channel tg" || clean.toLowerCase() === "channel tg") {
        activeChannel = "telegram";
        console.log("\n[Switched to Telegram Simulator Mode]\n");
        promptUser();
        return;
      }

      try {
        const res = await sendToBot(activeChannel, clean);
        renderBotOutput(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("\n[Error contacting bot server]:", msg);
        console.error("Ensure the local development server is running via `npm run dev`.\n");
      }

      promptUser();
    });
  };

  promptUser();
}

// Support one-shot command argument (e.g. tsx src/cli/bot_chat.ts "Price of NVDAx")
async function run() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const message = args.join(" ");
    const channel = process.env.BOT_CHANNEL === "whatsapp" ? "whatsapp" : "telegram";
    try {
      const res = await sendToBot(channel, message);
      renderBotOutput(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to run bot command:", msg);
      process.exit(1);
    }
    return;
  }

  await startInteractiveRepl();
}

run();
