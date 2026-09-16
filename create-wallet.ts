// create-wallet.ts
//
// Testnet onboarding/smoke-test script, whatever STELLAR_NETWORK says. It
// generates two throwaway keypairs, funds them via Friendbot, establishes
// USDC trustlines, and moves 5 USDC between them — on mainnet this would be
// real money, so it refuses to run there. There is no "wallet set"/"entity
// secret" concept to set up first the way Circle's onboarding needed:
// self-custodial Stellar wallets are just keypairs.

export {};

import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { horizonUrl, isMainnet, networkPassphrase, usdcAsset, friendbotUrl } from "@/lib/wallet/network";

async function fundWithFriendbot(publicKey: string): Promise<void> {
  const res = await fetch(`${friendbotUrl()}?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) {
    throw new Error(`Friendbot funding failed for ${publicKey}: HTTP ${res.status}`);
  }
}

async function establishTrustline(server: Horizon.Server, keypair: Keypair): Promise<void> {
  const account = await server.loadAccount(keypair.publicKey());
  const { code, issuer } = usdcAsset();

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(Operation.changeTrust({ asset: new Asset(code, issuer) }))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  await server.submitTransaction(tx);
}

async function printBalances(server: Horizon.Server, publicKey: string, label: string): Promise<void> {
  const account = await server.loadAccount(publicKey);
  console.log(`\n${label} balances:`);
  for (const b of account.balances) {
    const symbol = b.asset_type === "native" ? "XLM" : (b as { asset_code: string }).asset_code;
    console.log(`  ${symbol}: ${b.balance}`);
  }
}

async function main() {
  if (isMainnet()) {
    throw new Error(
      "create-wallet.ts is a testnet smoke test and refuses to run with STELLAR_NETWORK=PUBLIC.",
    );
  }

  const { code, issuer } = usdcAsset();
  const server = new Horizon.Server(horizonUrl());

  console.log("Generating source wallet...");
  const source = Keypair.random();
  console.log("Address:", source.publicKey());

  console.log("\nFunding via Friendbot...");
  await fundWithFriendbot(source.publicKey());

  console.log("\nEstablishing USDC trustline...");
  await establishTrustline(server, source);

  console.log(`\nBefore continuing, send test USDC from the faucet:`);
  console.log("  1. Go to https://faucet.circle.com");
  console.log('  2. Select "Stellar Testnet" network');
  console.log(`  3. Paste your wallet address: ${source.publicKey()}`);
  console.log('  4. Click "Send USDC"');

  const readline = await import("node:readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) =>
    rl.question("\nPress Enter once faucet tokens have been sent... ", () => {
      rl.close();
      resolve();
    }),
  );

  console.log("\nGenerating destination wallet...");
  const destination = Keypair.random();
  console.log("Address:", destination.publicKey());
  await fundWithFriendbot(destination.publicKey());
  await establishTrustline(server, destination);

  console.log("\nSending 5 USDC to destination wallet...");
  const sourceAccount = await server.loadAccount(source.publicKey());
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(
      Operation.payment({
        destination: destination.publicKey(),
        asset: new Asset(code, issuer),
        amount: "5",
      }),
    )
    .setTimeout(60)
    .build();
  tx.sign(source);

  const result = await server.submitTransaction(tx);
  console.log("Transaction hash:", result.hash);
  console.log(`Explorer: https://stellar.expert/explorer/testnet/tx/${result.hash}`);

  await printBalances(server, source.publicKey(), "Source wallet");
  await printBalances(server, destination.publicKey(), "Destination wallet");

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
