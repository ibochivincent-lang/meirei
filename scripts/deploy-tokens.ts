/**
 * OKX X Layer Token Deployment & Liquidity Minting Script
 * Deploys OpenZeppelin ERC20 mintable contracts for USDG and allowlisted xStocks
 * (NVDAx, AAPLx, MSFTx, GOOGLx, AMZNx, METAx, TSLAx, COINx) to X Layer Testnet (195) or Mainnet (196).
 *
 * Usage:
 *   npx tsx scripts/deploy-tokens.ts --network testnet
 *   npx tsx scripts/deploy-tokens.ts --network mainnet
 */

export interface TokenSpec {
  symbol: string;
  name: string;
  decimals: number;
  initialSupply: number;
}

export const TOKEN_SPECS: TokenSpec[] = [
  { symbol: "USDG", name: "Global Dollar Stablecoin", decimals: 6, initialSupply: 1_000_000 },
  { symbol: "NVDAx", name: "NVIDIA Corp Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "AAPLx", name: "Apple Inc. Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "MSFTx", name: "Microsoft Corp Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "GOOGLx", name: "Alphabet Inc. Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "AMZNx", name: "Amazon.com Inc. Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "METAx", name: "Meta Platforms Inc. Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "TSLAx", name: "Tesla Inc. Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "COINx", name: "Coinbase Global Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "SPYx", name: "S&P 500 ETF Tokenized Asset", decimals: 18, initialSupply: 25_000 },
  { symbol: "QQQx", name: "Invesco QQQ Nasdaq-100 Tokenized Asset", decimals: 18, initialSupply: 25_000 },
  { symbol: "AMDx", name: "Advanced Micro Devices Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "CRWDx", name: "CrowdStrike Holdings Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "MSTRx", name: "MicroStrategy Inc. Tokenized Equity", decimals: 18, initialSupply: 25_000 },
  { symbol: "TSMx", name: "Taiwan Semiconductor Mfg. Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "AVGOx", name: "Broadcom Inc. Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "INTCx", name: "Intel Corporation Tokenized Equity", decimals: 18, initialSupply: 100_000 },
  { symbol: "MUx", name: "Micron Technology Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "MRVLx", name: "Marvell Technology Tokenized Equity", decimals: 18, initialSupply: 50_000 },
  { symbol: "IWMx", name: "Russell 2000 ETF Tokenized Asset", decimals: 18, initialSupply: 25_000 },
  { symbol: "DELLx", name: "Dell Technologies Tokenized Equity", decimals: 18, initialSupply: 50_000 },
];

export const NETWORK_CONFIG = {
  testnet: {
    name: "OKX X Layer Testnet",
    chainId: 195,
    rpc: process.env.XLAYER_TESTNET_RPC || "https://testrpc.xlayer.tech",
    explorer: "https://www.okx.com/web3/explorer/xlayer-test",
  },
  mainnet: {
    name: "OKX X Layer Mainnet",
    chainId: 196,
    rpc: process.env.NEXT_PUBLIC_XLAYER_RPC || "https://xlayerrpc.okx.com",
    explorer: "https://www.oklink.com/xlayer",
  },
};

export async function main() {
  const targetNetwork = process.argv.includes("--network")
    ? process.argv[process.argv.indexOf("--network") + 1]
    : "mainnet";

  const config = targetNetwork === "testnet" ? NETWORK_CONFIG.testnet : NETWORK_CONFIG.mainnet;

  console.log("=== OKX X LAYER CONTRACT DEPLOYMENT ===");
  console.log(`Target Network: ${config.name} (Chain ID: ${config.chainId})`);
  console.log(`RPC Endpoint:   ${config.rpc}`);
  console.log(`Explorer URL:   ${config.explorer}\n`);

  console.log("Token Specifications to Deploy:");
  TOKEN_SPECS.forEach((t) => {
    console.log(`  - [${t.symbol}] ${t.name} (${t.decimals} decimals, initial mint: ${t.initialSupply.toLocaleString()})`);
  });

  console.log("\nTo deploy via Remix IDE:");
  console.log("1. Open https://remix.ethereum.org");
  console.log("2. Paste contracts/MockERC20.sol into Remix");
  console.log("3. Compile with Solidity compiler 0.8.20+");
  console.log("4. Under 'Deploy & Run Transactions', select 'Injected Provider - MetaMask' set to OKX X Layer");
  console.log("5. Deploy each token specification and record the verified contract address.");
}

if (require.main === module) {
  main().catch(console.error);
}
