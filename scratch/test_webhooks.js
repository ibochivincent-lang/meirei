/**
 * Webhook Verification Script for WhatsApp & Telegram
 * Author: IboTV
 * Platform: OKX Chain / X Layer (Chain 196)
 */

async function runTests() {
  const baseUrl = "http://localhost:3000";
  console.log("Starting Webhook Verification Tests against", baseUrl);

  let passed = 0;
  let failed = 0;

  // Test 1: WhatsApp GET Webhook Handshake
  try {
    const url = `${baseUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=meirei_wa_verify_token&hub.challenge=challenge_12345`;
    const res = await fetch(url);
    const body = await res.text();
    if (res.status === 200 && body === "challenge_12345") {
      console.log("PASS: WhatsApp GET Verification Handshake");
      passed++;
    } else {
      console.error("FAIL: WhatsApp GET Verification Handshake:", res.status, body);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 1:", err.message);
    failed++;
  }

  // Test 2: WhatsApp POST Price Quote
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 392 1084",
        message: "Price of NVDAx",
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.reply.includes("NVDAx") && data.reply.includes("USDG")) {
      console.log("PASS: WhatsApp POST Price Quote ->", data.reply.split("\n")[0]);
      passed++;
    } else {
      console.error("FAIL: WhatsApp POST Price Quote:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 2:", err.message);
    failed++;
  }

  // Test 3: WhatsApp POST Price Comparison
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 392 1084",
        message: "Compare NVDAx vs MSFTx",
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.reply.includes("NVDAx") && data.reply.includes("MSFTx")) {
      console.log("PASS: WhatsApp POST Price Comparison");
      passed++;
    } else {
      console.error("FAIL: WhatsApp POST Price Comparison:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 3:", err.message);
    failed++;
  }

  // Test 4: WhatsApp POST Unit Calculator
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 392 1084",
        message: "How many units of AAPLx for 250 USDG?",
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.reply.includes("Estimated Units") && data.reply.includes("AAPLx")) {
      console.log("PASS: WhatsApp POST Unit Calculator");
      passed++;
    } else {
      console.error("FAIL: WhatsApp POST Unit Calculator:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 4:", err.message);
    failed++;
  }

  // Test 5: Telegram POST /start command
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          chat: { id: 987654321 },
          from: { id: 987654321, username: "alex_trader" },
          text: "/start",
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.method === "sendMessage" && data.text.includes("PROJECT MEIREI")) {
      console.log("PASS: Telegram POST /start command");
      passed++;
    } else {
      console.error("FAIL: Telegram POST /start:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 5:", err.message);
    failed++;
  }

  // Test 6: Telegram POST Price Quote
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          chat: { id: 987654321 },
          from: { id: 987654321, username: "alex_trader" },
          text: "Quote TSLAx",
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.method === "sendMessage" && data.text.includes("TSLAx")) {
      console.log("PASS: Telegram POST Price Quote");
      passed++;
    } else {
      console.error("FAIL: Telegram POST Price Quote:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 6:", err.message);
    failed++;
  }

  // Test 7: Telegram POST Unit Calculation
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          chat: { id: 987654321 },
          from: { id: 987654321, username: "alex_trader" },
          text: "Calculate $500 in METAx",
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.method === "sendMessage" && data.text.includes("METAx") && data.text.includes("Estimated Allocation")) {
      console.log("PASS: Telegram POST Unit Calculation");
      passed++;
    } else {
      console.error("FAIL: Telegram POST Unit Calculation:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 7:", err.message);
    failed++;
  }

  // Test 8: Telegram POST /stocks command
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          chat: { id: 987654321 },
          from: { id: 987654321, username: "alex_trader" },
          text: "/stocks",
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.method === "sendMessage" && data.text.includes("LIVE EQUITIES") && data.text.includes("NVDAx")) {
      console.log("PASS: Telegram POST /stocks command");
      passed++;
    } else {
      console.error("FAIL: Telegram POST /stocks:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 8:", err.message);
    failed++;
  }

  // Test 9: Telegram POST /freeze and /unfreeze
  try {
    const freezeRes = await fetch(`${baseUrl}/api/webhooks/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          chat: { id: 987654321 },
          from: { id: 987654321, username: "alex_trader" },
          text: "/freeze",
        },
      }),
    });
    const freezeData = await freezeRes.json();
    const codeMatch = freezeData.text?.match(/\/unfreeze\s+(\d{6})/);
    if (freezeRes.ok && freezeData.text?.includes("CIRCUIT BREAKER ACTIVATED") && codeMatch) {
      const code = codeMatch[1];
      console.log("PASS: Telegram POST /freeze -> code:", code);
      passed++;

      // Now test unfreeze
      const unfreezeRes = await fetch(`${baseUrl}/api/webhooks/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            chat: { id: 987654321 },
            from: { id: 987654321, username: "alex_trader" },
            text: `/unfreeze ${code}`,
          },
        }),
      });
      const unfreezeData = await unfreezeRes.json();
      if (unfreezeRes.ok && unfreezeData.text?.includes("CIRCUIT BREAKER LIFTED")) {
        console.log("PASS: Telegram POST /unfreeze with OTP code");
        passed++;
      } else {
        console.error("FAIL: Telegram POST /unfreeze:", unfreezeRes.status, unfreezeData);
        failed++;
      }
    } else {
      console.error("FAIL: Telegram POST /freeze:", freezeRes.status, freezeData);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 9:", err.message);
    failed++;
  }

  // Test 10: WhatsApp POST stocks
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 392 1084",
        message: "stocks",
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.reply.includes("LIVE EQUITIES") && data.reply.includes("NVDAx")) {
      console.log("PASS: WhatsApp POST stocks listing");
      passed++;
    } else {
      console.error("FAIL: WhatsApp POST stocks:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 10:", err.message);
    failed++;
  }

  // Test 11: WhatsApp POST freeze & unfreeze
  try {
    const freezeRes = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 392 1084",
        message: "freeze",
      }),
    });
    const freezeData = await freezeRes.json();
    const codeMatch = freezeData.reply?.match(/unfreeze\s+(\d{6})/);
    if (freezeRes.ok && freezeData.reply?.includes("CIRCUIT BREAKER ACTIVATED") && codeMatch) {
      const code = codeMatch[1];
      console.log("PASS: WhatsApp POST freeze -> code:", code);
      passed++;

      const unfreezeRes = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "+1 (555) 392 1084",
          message: `unfreeze ${code}`,
        }),
      });
      const unfreezeData = await unfreezeRes.json();
      if (unfreezeRes.ok && unfreezeData.reply?.includes("CIRCUIT BREAKER LIFTED")) {
        console.log("PASS: WhatsApp POST unfreeze with OTP code");
        passed++;
      } else {
        console.error("FAIL: WhatsApp POST unfreeze:", unfreezeRes.status, unfreezeData);
        failed++;
      }
    } else {
      console.error("FAIL: WhatsApp POST freeze:", freezeRes.status, freezeData);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 11:", err.message);
    failed++;
  }

  // Test 12: WhatsApp POST /about command
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 392 1084",
        message: "/about",
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.reply.includes("MEIREI") && data.reply.includes("What We Do")) {
      console.log("PASS: WhatsApp POST /about command");
      passed++;
    } else {
      console.error("FAIL: WhatsApp POST /about:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 12:", err.message);
    failed++;
  }

  // Test 13: Telegram POST /guide command
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          chat: { id: 987654321 },
          from: { id: 987654321, username: "alex_trader" },
          text: "/guide",
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.method === "sendMessage" && data.text.includes("PROJECT MEIREI") && data.text.includes("What We Do")) {
      console.log("PASS: Telegram POST /guide command");
      passed++;
    } else {
      console.error("FAIL: Telegram POST /guide:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 13:", err.message);
    failed++;
  }

  // Test 14: WhatsApp POST wrong/unhandled command fallback
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 392 1084",
        message: "wrong_command_click",
      }),
    });
    const data = await res.json();
    const reply = data.reply || "";
    const isInteractive =
      reply.includes("MEIREI | YOUR INTERACTIVE OKX X LAYER AGENT") &&
      reply.includes("Could not find this command") &&
      reply.includes("stocks") &&
      !reply.includes("ADVISORY ENGINE") &&
      !reply.includes("PROJECT MEIREI") &&
      !reply.includes("Author: IboTV") &&
      !reply.includes("Non-Custodial Engine");

    if (res.ok && data.ok && isInteractive) {
      console.log("PASS: WhatsApp POST wrong command interactive fallback");
      passed++;
    } else {
      console.error("FAIL: WhatsApp POST wrong command fallback:", res.status, reply);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 14:", err.message);
    failed++;
  }

  // Test 15: WhatsApp POST connect command
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 392 1084",
        message: "connect",
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.reply.includes("CONNECT OKX WALLET") && data.reply.includes("/connect?channel=whatsapp")) {
      console.log("PASS: WhatsApp POST connect command");
      passed++;
    } else {
      console.error("FAIL: WhatsApp POST connect command:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 15:", err.message);
    failed++;
  }

  // Test 16: POST /api/wallet/link
  try {
    const res = await fetch(`${baseUrl}/api/wallet/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "whatsapp",
        handle: "+1 (555) 392 1084",
        walletAddress: "0x7f17d6224e7d48606598732c3f511412b5c1e922",
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.walletAddress === "0x7f17d6224e7d48606598732c3f511412b5c1e922") {
      console.log("PASS: POST /api/wallet/link API");
      passed++;
    } else {
      console.error("FAIL: POST /api/wallet/link API:", res.status, data);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 16:", err.message);
    failed++;
  }

  // Test 17: WhatsApp POST reciprocal greeting "Good morning"
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 392 1084",
        message: "Good morning",
      }),
    });
    const data = await res.json();
    const reply = data.reply || "";
    if (res.ok && data.ok && reply.includes("Good morning!") && reply.includes("interactive OKX X Layer agent") && reply.includes("Yes")) {
      console.log("PASS: WhatsApp POST reciprocal greeting ('Good morning')");
      passed++;
    } else {
      console.error("FAIL: WhatsApp POST reciprocal greeting:", res.status, reply);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 17:", err.message);
    failed++;
  }

  // Test 18: WhatsApp POST affirmative response "Yes"
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 392 1084",
        message: "Yes",
      }),
    });
    const data = await res.json();
    const reply = data.reply || "";
    if (res.ok && data.ok && reply.includes("Okay! Here is what I can do") && reply.includes("stocks") && reply.includes("connect")) {
      console.log("PASS: WhatsApp POST affirmative response ('Yes')");
      passed++;
    } else {
      console.error("FAIL: WhatsApp POST affirmative response:", res.status, reply);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 18:", err.message);
    failed++;
  }

  // Test 19: Verify Canonical Domain in all outbound links
  try {
    const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+1 (555) 392 1084",
        message: "connect",
      }),
    });
    const data = await res.json();
    const reply = data.reply || "";
    if (res.ok && reply.includes("https://meirei-rho.vercel.app") && !reply.includes("https://meirei.vercel.app") && !reply.includes("http://localhost:3000")) {
      console.log("PASS: WhatsApp link points strictly to https://meirei-rho.vercel.app");
      passed++;
    } else {
      console.error("FAIL: WhatsApp canonical URL verification failed:", reply);
      failed++;
    }
  } catch (err) {
    console.error("ERROR in Test 19:", err.message);
    failed++;
  }

  console.log(`\n================================`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log(`================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
