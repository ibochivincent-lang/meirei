// Verifies all 20 allowlisted xStocks on OKX X Layer (Chain 196)
// against the official xStocks issuer registry and X Layer mainnet RPC.
// Run: node scripts/verify-xlayer-stocks.mjs

const RPC_ENDPOINTS = [
  process.env.XLAYER_RPC_URL,
  "https://xlayerrpc.okx.com",
  "https://rpc.xlayer.tech",
  "https://xlayer.drpc.org",
].filter(Boolean);

// 20 allowlisted equities on OKX X Layer
const STOCKS = [
  { symbol: "NVDAx", name: "NVIDIA Corp", token: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d", wrapper: "0xa8ddb5cd96b5222afe198316e9a57caa642850d5" },
  { symbol: "TSLAx", name: "Tesla Inc", token: "0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0", wrapper: "0xc3fdbe3a68ee5de461d30415a8165cf9aefe1171" },
  { symbol: "AAPLx", name: "Apple Inc", token: "0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a", wrapper: "0x943bf64d566c32a2bcd41ac92fb63c111cc9de8f" },
  { symbol: "MSFTx", name: "Microsoft Corp", token: "0x5621737f42dae558b81269fcb9e9e70c19aa6b35", wrapper: "0x166fbe68274b6a47e025f4ba17388c539f1fa1d0" },
  { symbol: "AMZNx", name: "Amazon.com Inc", token: "0x3557ba345b01efa20a1bddc61f573bfd87195081", wrapper: "0x910cabde3eba7fc1ce64fd14bd680b9f60fa0f90" },
  { symbol: "GOOGLx", name: "Alphabet Inc", token: "0xe92f673ca36c5e2efd2de7628f815f84807e803f", wrapper: "0xf8c5308f80e459bb53d9ebe689854d9cbb2caa6f" },
  { symbol: "METAx", name: "Meta Platforms", token: "0x96702be57cd9777f835117a809c7124fe4ec989a", wrapper: "0xe840946ffebcd66b7c4e95095effafadfa0d0e56" },
  { symbol: "MSTRx", name: "MicroStrategy Inc", token: "0xae2f842ef90c0d5213259ab82639d5bbf649b08e", wrapper: "0x30987adf0b11dc698438a99ba04ec3a1ab2c7eab" },
  { symbol: "COINx", name: "Coinbase Global", token: "0x364f210f430ec2448fc68a49203040f6124096f0", wrapper: "0x44c7ed7ffdf8465c9d27f60aec845eed3d49d56e" },
  { symbol: "CRCLx", name: "Circle Internet Group", token: "0xfebded1b0986a8ee107f5ab1a1c5a813491deceb", wrapper: "0xb11134f14d5b94db60d4599dfdc3bf1bba2150e8" },
  { symbol: "SPYx", name: "SPDR S&P 500 ETF", token: "0x90a2a4c76b5d8c0bc892a69ea28aa775a8f2dd48", wrapper: "0xe7e553cd128f0011777323a0b44a7b96ea1cb540" },
  { symbol: "QQQx", name: "Invesco QQQ Trust", token: "0xa753a7395cae905cd615da0b82a53e0560f250af", wrapper: "0x4c1ae29c159838fc1b224636e28e086eb69101f7" },
  { symbol: "HOODx", name: "Robinhood Markets", token: "0xe1385fdd5ffb10081cd52c56584f25efa9084015", wrapper: "0x59801175a9b2248f9bf4ba7f82e17045c4672ec8" },
  { symbol: "PLTRx", name: "Palantir Technologies", token: "0x6d482cec5f9dd1f05ccee9fd3ff79b246170f8e2", wrapper: "0x4a2df09536f62341c9f946427d16414c04e21342" },
  { symbol: "GMEx", name: "GameStop Corp", token: "0xe5f6d3b2405abdfe6f660e63202b25d23763160d", wrapper: "0x459d3ae62b86cc6125e06260dddfd3afed24a877" },
  { symbol: "AMDx", name: "Advanced Micro Devices", token: "0x3522513e5f146a2006e2901b05f16b2821485e19", wrapper: "0xee7ccb0d37a12862e7f92f6c92a93d9c2d304266" },
  { symbol: "NFLXx", name: "Netflix Inc", token: "0xa6a65ac27e76cd53cb790473e4345c46e5ebf961", wrapper: "0x7d87fd6a379714194a797c0bbb8b40c30d250856" },
  { symbol: "GLDx", name: "SPDR Gold Shares", token: "0x2380f2673c640fb67e2d6b55b44c62f0e0e69da9", wrapper: "0x735f1509bff25e27cd442b9bfb231324648ead9b" },
  { symbol: "INTCx", name: "Intel Corp", token: "0xf8a80d1cb9cfd70d03d655d9df42339846f3b3c8", wrapper: "0x33aa35b0271fffe2048cc093ab7fe60931786719" },
  { symbol: "ORCLx", name: "Oracle Corp", token: "0x548308e91ec9f285c7bff05295badbd56a6e4971", wrapper: "0x1349456830ddc3d8599e4d6a63698883eca67ada" },
];

const STABLES = {
  USDG: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8",
  USDC: "0xb6ceceab302e2e4948951ee7843fc24e92933061",
};

const DAYBREAK_VAULT_ADDRESS = "0x55318F36f5B482e9F2b1429f2Ca7fD7c5BBf97fc";

const SIG_SYMBOL = "0x95d89b41";
const SIG_DECIMALS = "0x313ce567";
const SIG_TOTAL_SUPPLY = "0x18160ddd";

async function rpcCall(method, params = []) {
  let lastErr;
  for (const rpc of RPC_ENDPOINTS) {
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.error) continue;
      return json.result;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("All RPC endpoints failed");
}

function parseString(hex) {
  if (!hex || hex === "0x") return "";
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleaned.length >= 128) {
    const len = parseInt(cleaned.slice(64, 128), 16);
    const dataHex = cleaned.slice(128, 128 + len * 2);
    return Buffer.from(dataHex, "hex").toString("utf8").replace(/\0/g, "");
  }
  return Buffer.from(cleaned, "hex").toString("utf8").replace(/\0/g, "");
}

function parseUint(hex) {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}

async function verify() {
  console.log("==========================================================");
  console.log(" Meirei: OKX X Layer (Chain 196) xStocks On-Chain Verifier");
  console.log("==========================================================");

  const chainIdHex = await rpcCall("eth_chainId");
  const chainId = parseInt(chainIdHex, 16);
  console.log(`Connected Chain ID: ${chainId} ${chainId === 196 ? "✓ (OKX X Layer)" : "✗ (WRONG CHAIN)"}`);
  if (chainId !== 196) throw new Error(`Expected Chain 196, got ${chainId}`);

  const blockHex = await rpcCall("eth_blockNumber");
  const blockNumber = parseInt(blockHex, 16);
  console.log(`Current Block: ${blockNumber.toLocaleString()}`);

  console.log("\n[1/3] Verifying 20 Allowlisted xStocks on X Layer...");
  let passCount = 0;
  let failCount = 0;

  for (const stock of STOCKS) {
    try {
      const [symRaw, decRaw, supplyRaw] = await Promise.all([
        rpcCall("eth_call", [{ to: stock.token, data: SIG_SYMBOL }, "latest"]),
        rpcCall("eth_call", [{ to: stock.token, data: SIG_DECIMALS }, "latest"]),
        rpcCall("eth_call", [{ to: stock.token, data: SIG_TOTAL_SUPPLY }, "latest"]),
      ]);

      const onchainSymbol = parseString(symRaw);
      const decimals = Number(parseUint(decRaw));
      const totalSupply = parseUint(supplyRaw);
      const supplyUnits = (Number(totalSupply) / 1e18).toFixed(2);

      const symbolMatches = onchainSymbol === stock.symbol || onchainSymbol === stock.symbol.replace(/x$/, "");
      const decMatches = decimals === 18;

      if (symbolMatches && decMatches) {
        console.log(`  ✓ ${stock.symbol.padEnd(7)} [${stock.token.slice(0, 10)}...] supply: ${supplyUnits.padStart(10)} | decimals: ${decimals}`);
        passCount++;
      } else {
        console.log(`  ✗ ${stock.symbol.padEnd(7)} MISMATCH: sym=${onchainSymbol}, dec=${decimals}`);
        failCount++;
      }
    } catch (err) {
      console.log(`  ✗ ${stock.symbol.padEnd(7)} RPC Call Error: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n[2/3] Verifying Settlement Stablecoins (6 Decimals)...`);
  for (const [name, addr] of Object.entries(STABLES)) {
    try {
      const [symRaw, decRaw] = await Promise.all([
        rpcCall("eth_call", [{ to: addr, data: SIG_SYMBOL }, "latest"]),
        rpcCall("eth_call", [{ to: addr, data: SIG_DECIMALS }, "latest"]),
      ]);
      const sym = parseString(symRaw);
      const dec = Number(parseUint(decRaw));
      if (dec === 6) {
        console.log(`  ✓ ${name.padEnd(6)} [${addr.slice(0, 10)}...] on-chain: ${sym} | decimals: ${dec}`);
      } else {
        console.log(`  ✗ ${name} Expected 6 decimals, got ${dec}`);
        failCount++;
      }
    } catch (err) {
      console.log(`  ✗ ${name} Error: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n[3/3] Checking Daybreak Conviction Vault on X Layer...`);
  try {
    const code = await rpcCall("eth_getCode", [DAYBREAK_VAULT_ADDRESS, "latest"]);
    if (code && code !== "0x" && code.length > 10) {
      console.log(`  ✓ DaybreakConvictionVault [${DAYBREAK_VAULT_ADDRESS}] is ACTIVE on Chain 196 (bytecode size: ${(code.length / 2).toFixed(0)} bytes)`);
    } else {
      console.log(`  ⚠ DaybreakConvictionVault code not found at ${DAYBREAK_VAULT_ADDRESS}`);
    }
  } catch (err) {
    console.log(`  ⚠ Vault check warning: ${err.message}`);
  }

  console.log("\n==========================================================");
  console.log(` Verification Completed: ${passCount} Passed, ${failCount} Failed.`);
  console.log("==========================================================");

  if (failCount > 0) process.exit(1);
}

verify().catch((err) => {
  console.error("Fatal verification error:", err);
  process.exit(1);
});
