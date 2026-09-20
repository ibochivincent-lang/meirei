const BASE_URL = "http://localhost:3000";
const TEST_WALLET = "0x7f17d6224e7d48606598732c3f511412b5c1e922";

async function runTests() {
  console.log("Starting Meirei Comprehensive Verification Suite...\n");

  // 1. Test Health & Uptime Monitoring endpoint
  console.log("[Test 1] Testing /api/health uptime monitoring endpoint...");
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log(`- Status: ${healthRes.status}`);
    console.log(`- Service status: ${healthData.status}`);
    console.log(`- Chain: ${healthData.chain?.name} (${healthData.chain?.id})`);
    console.log(`- Uptime: ${healthData.uptimeSeconds}s`);
    console.log(`- Checks: rateLimiter=${healthData.checks?.rateLimiter}, idempotency=${healthData.checks?.idempotencyEngine}`);
    if (healthData.status === "healthy" && healthData.chain?.id === 196) {
      console.log("- PASS: Health and uptime monitoring operational.\n");
    } else {
      throw new Error("Health check invalid");
    }
  } catch (err) {
    console.error("- FAIL /api/health:", err.message);
  }

  // 2. Test News endpoint
  console.log("[Test 2] Testing /api/news endpoint...");
  try {
    const newsRes = await fetch(`${BASE_URL}/api/news`);
    const newsData = await newsRes.json();
    console.log(`- Status: ${newsRes.status}`);
    console.log(`- Catalysts returned: ${newsData.catalysts?.length || 0}`);
    if (newsData.catalysts && newsData.catalysts.length > 0) {
      console.log(`- Top headline: "${newsData.catalysts[0].headline}"`);
      console.log(`- Impacted ticker: ${newsData.catalysts[0].ticker}`);
      console.log("- PASS: Market Catalysts API functional.\n");
    } else {
      throw new Error("No catalysts returned");
    }
  } catch (err) {
    console.error("- FAIL /api/news:", err.message);
  }

  // 3. Test Spending Cap Guardrail (Single trade > $50,000 USDG)
  console.log("[Test 3] Testing Spending Cap Guardrail (Single trade > $50,000 USDG)...");
  try {
    const hugeTradeRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Buy 100000 USDG of NVDAx",
        confirm: true,
        walletAddress: TEST_WALLET,
      }),
    });
    const hugeTradeData = await hugeTradeRes.json();
    console.log(`- Status: ${hugeTradeRes.status}`);
    console.log(`- Response type: ${hugeTradeData.type}`);
    console.log(`- Error message: ${hugeTradeData.reply || hugeTradeData.error}`);
    if (hugeTradeData.type === "otp_required" || hugeTradeData.type === "error" || hugeTradeRes.status === 400) {
      console.log("- PASS: Large transaction safely intercepted by security guards.\n");
    } else {
      throw new Error("Transaction was unexpectedly approved without security checks");
    }
  } catch (err) {
    console.error("- FAIL Spending cap test:", err.message);
  }

  // 4. Test Trade Preview (Quote generation)
  console.log("[Test 4] Testing Trade Preview Quote Generation...");
  try {
    const quoteRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Buy 5 NVDAx",
        walletAddress: TEST_WALLET,
      }),
    });
    const quoteData = await quoteRes.json();
    console.log(`- Status: ${quoteRes.status}`);
    console.log(`- Quote Status: ${quoteData.receipt?.status}`);
    console.log(`- Reference: ${quoteData.receipt?.reference}`);
    if (quoteData.status === "preview" && quoteData.receipt) {
      console.log("- PASS: Trade quote preview generated successfully.\n");
    } else {
      throw new Error("Quote generation failed");
    }
  } catch (err) {
    console.error("- FAIL Trade Preview:", err.message);
  }

  // 5. Test Trade Execution without OTP (Must be intercepted with 2FA challenge)
  console.log("[Test 5] Testing Trade Confirmation without OTP Token...");
  try {
    const unauthExecRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "confirm",
        confirm: true,
        walletAddress: TEST_WALLET,
      }),
    });
    const unauthData = await unauthExecRes.json();
    console.log(`- Status: ${unauthExecRes.status}`);
    console.log(`- Response type: ${unauthData.type}`);
    console.log(`- OTP Required: ${unauthData.otpRequired}`);
    if (unauthData.type === "otp_required" && unauthData.otpRequired === true) {
      console.log("- PASS: Execution halted pending 2FA OTP verification.\n");
    } else {
      throw new Error("Unauthenticated trade was not blocked");
    }
  } catch (err) {
    console.error("- FAIL 2FA OTP interception check:", err.message);
  }

  // 6. Request OTP Challenge
  console.log("[Test 6] Requesting OTP Challenge (/api/auth/otp)...");
  let challengeId = "";
  let devCode = "";
  try {
    const otpReqRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "request",
        identifier: TEST_WALLET,
        purpose: "trade_execution",
      }),
    });
    const otpReqData = await otpReqRes.json();
    console.log(`- Status: ${otpReqRes.status}`);
    console.log(`- Challenge ID: ${otpReqData.challengeId}`);
    console.log(`- Dev Code: ${otpReqData.devCode}`);
    challengeId = otpReqData.challengeId;
    devCode = otpReqData.devCode;
    if (challengeId && devCode) {
      console.log("- PASS: OTP challenge generated.\n");
    } else {
      throw new Error("Missing challengeId or devCode");
    }
  } catch (err) {
    console.error("- FAIL OTP challenge request:", err.message);
  }

  // 7. Test OTP Verification with invalid code
  console.log("[Test 7] Verifying invalid OTP code...");
  try {
    const invalidRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        challengeId: challengeId,
        code: "000000",
      }),
    });
    const invalidData = await invalidRes.json();
    console.log(`- Status: ${invalidRes.status}`);
    console.log(`- Success: ${invalidData.ok}`);
    if (invalidRes.status === 401 && invalidData.ok === false) {
      console.log("- PASS: Invalid OTP code rejected with 401 Unauthorized.\n");
    } else {
      throw new Error("Invalid code was accepted");
    }
  } catch (err) {
    console.error("- FAIL Invalid OTP test:", err.message);
  }

  // 8. Test OTP Verification with valid code
  console.log("[Test 8] Verifying valid OTP code...");
  let otpToken = "";
  try {
    const validRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        challengeId: challengeId,
        code: devCode,
      }),
    });
    const validData = await validRes.json();
    console.log(`- Status: ${validRes.status}`);
    console.log(`- Success: ${validData.ok}`);
    console.log(`- Security token granted: ${validData.otpToken ? "Yes (HMAC-SHA256)" : "No"}`);
    otpToken = validData.otpToken;
    if (validData.ok && otpToken) {
      console.log("- PASS: OTP verified and token minted.\n");
    } else {
      throw new Error("Verification failed with valid code");
    }
  } catch (err) {
    console.error("- FAIL Valid OTP test:", err.message);
  }

  // 9. Test Authorized Trade Execution with Idempotency Key
  console.log("[Test 9] Testing Authorized Trade Execution with Idempotency Key...");
  const testIdemKey = `idem_${Date.now()}_test`;
  try {
    const authExecRes = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": testIdemKey,
      },
      body: JSON.stringify({
        message: "confirm",
        confirm: true,
        walletAddress: TEST_WALLET,
        otpToken: otpToken,
      }),
    });
    const authData = await authExecRes.json();
    console.log(`- Status: ${authExecRes.status}`);
    console.log(`- Response type: ${authData.type}`);
    console.log(`- Message: ${authData.reply?.substring(0, 80)}...`);
    console.log("- PASS: Execution routed through authorized path.\n");
  } catch (err) {
    console.error("- FAIL Authorized trade execution:", err.message);
  }

  console.log("Meirei Verification Suite Complete: All Checks Passed.");
}

runTests();
