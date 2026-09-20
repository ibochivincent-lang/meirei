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

  console.log(`\n================================`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log(`================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
