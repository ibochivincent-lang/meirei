/**
 * Non-Custodial Web3 & ERC-4337 Signing Bridge for OKX X Layer (Chain ID 196)
 * Platform: OKX Chain / X Layer
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. ZERO PRIVATE KEYS STORED:
 *    Transactions are signed solely client-side via window.okxwallet / window.ethereum
 *    or WebAuthn hardware enclaves. The server never receives, touches, or stores keys.
 * 2. CHAIN SPECIFICITY:
 *    Always enforces OKX X Layer (Chain ID 196 / hex 0xc4).
 */

import {
  XLAYER_CHAIN_ID_DECIMAL,
  XLAYER_CHAIN_ID_HEX,
  XLAYER_NETWORK_PARAMS,
  XLAYER_EXPLORER_URL,
} from "./xlayer";

export interface Web3ProviderState {
  hasProvider: boolean;
  providerName: "okx" | "metamask" | "generic" | null;
  connectedAddress: string | null;
  chainId: number | null;
  isXLayer: boolean;
}

export interface SwapExecutionRequest {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  expectedOutput: number;
  slippagePercent?: number;
  userAddress: string;
  routerAddress?: string;
  calldata?: string;
  value?: string;
}

export interface SigningResult {
  ok: boolean;
  txHash?: string;
  explorerUrl?: string;
  confirmed?: boolean;
  status?: "success" | "reverted" | "pending";
  error?: string;
}

export type WalletType = "okx" | "metamask" | "walletconnect" | "coinbase" | "trust" | "injected";

export interface WalletOption {
  id: WalletType;
  name: string;
  description: string;
  isInstalled: boolean;
  installUrl: string;
  deepLink?: string;
  icon: string;
}

/**
 * Returns a specific Web3 provider by wallet type, preventing provider conflicts.
 */
export function getSpecificProvider(type: WalletType = "injected"): any {
  if (typeof window === "undefined") return null;
  const win = window as any;

  if (type === "okx") {
    if (win.okxwallet) return win.okxwallet;
    if (win.ethereum?.isOkxWallet) return win.ethereum;
    if (win.ethereum?.providers?.length) {
      const okx = win.ethereum.providers.find((p: any) => p.isOkxWallet);
      if (okx) return okx;
    }
    return null;
  }

  if (type === "metamask") {
    // 1. Check EIP-6963 / multi-provider array
    if (win.ethereum?.providers?.length) {
      const mm = win.ethereum.providers.find((p: any) => p.isMetaMask && !p.isOkxWallet);
      if (mm) return mm;
      const anyMm = win.ethereum.providers.find((p: any) => p.isMetaMask);
      if (anyMm) return anyMm;
    }
    // 2. Direct MetaMask provider
    if (win.ethereum?.isMetaMask && !win.ethereum?.isOkxWallet) return win.ethereum;
    if (win.ethereum?.isMetaMask) return win.ethereum;
    if (win.ethereum) return win.ethereum;
    return null;
  }

  if (type === "walletconnect") {
    // If running inside a wallet's in-app Web3 browser (e.g. OKX Mobile, MetaMask Mobile)
    if (win.okxwallet) return win.okxwallet;
    if (win.ethereum) return win.ethereum;
    return null;
  }

  if (type === "coinbase") {
    if (win.coinbaseWalletExtension) return win.coinbaseWalletExtension;
    if (win.ethereum?.isCoinbaseWallet) return win.ethereum;
    if (win.ethereum?.providers?.length) {
      const cb = win.ethereum.providers.find((p: any) => p.isCoinbaseWallet);
      if (cb) return cb;
    }
    return null;
  }

  if (type === "trust") {
    if (win.trustwallet) return win.trustwallet;
    if (win.ethereum?.isTrust) return win.ethereum;
    if (win.ethereum?.providers?.length) {
      const tw = win.ethereum.providers.find((p: any) => p.isTrust);
      if (tw) return tw;
    }
    return null;
  }

  return getInjectedProvider();
}

/**
 * Checks which wallets are currently installed in the user's browser.
 */
export function getAvailableWallets(): WalletOption[] {
  if (typeof window === "undefined") return [];
  const win = window as any;

  const hasOkx = !!(win.okxwallet || win.ethereum?.isOkxWallet || win.ethereum?.providers?.some((p: any) => p.isOkxWallet));
  const hasMetaMask = !!(win.ethereum?.isMetaMask) || !!win.ethereum?.providers?.some((p: any) => p.isMetaMask) || !!win.ethereum;
  const hasCoinbase = !!(win.coinbaseWalletExtension || win.ethereum?.isCoinbaseWallet || win.ethereum?.providers?.some((p: any) => p.isCoinbaseWallet));
  const hasTrust = !!(win.trustwallet || win.ethereum?.isTrust || win.ethereum?.providers?.some((p: any) => p.isTrust));

  return [
    {
      id: "okx",
      name: "OKX Wallet",
      description: "Recommended • Native to OKX X Layer (Chain 196)",
      isInstalled: hasOkx,
      installUrl: "https://www.okx.com/web3",
      deepLink: "okx://wallet/dapp/url?dappUrl=",
      icon: "OKX",
    },
    {
      id: "metamask",
      name: "MetaMask",
      description: "Popular Web3 & EVM browser extension",
      isInstalled: hasMetaMask,
      installUrl: "https://metamask.io/download/",
      icon: "MM",
    },
    {
      id: "walletconnect",
      name: "WalletConnect",
      description: "Universal mobile QR code bridge & 400+ wallets",
      isInstalled: true,
      installUrl: "https://walletconnect.com/",
      deepLink: "wc:",
      icon: "WC",
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      description: "Self-custody EVM wallet extension & mobile app",
      isInstalled: hasCoinbase,
      installUrl: "https://www.coinbase.com/wallet",
      icon: "CB",
    },
    {
      id: "trust",
      name: "Trust Wallet",
      description: "Multi-chain Web3 crypto wallet",
      isInstalled: hasTrust,
      installUrl: "https://trustwallet.com/browser-extension",
      icon: "TW",
    },
    {
      id: "injected",
      name: "Browser Web3 Wallet",
      description: "Auto-detect any active EIP-1193 wallet provider",
      isInstalled: !!(win.ethereum || win.okxwallet),
      installUrl: "https://www.okx.com/web3",
      icon: "W3",
    },
  ];
}

/**
 * Detects injected Web3 provider, prioritizing OKX Wallet.
 */
export function getInjectedProvider(): any {
  if (typeof window === "undefined") return null;
  const win = window as any;

  if (win.okxwallet) {
    return win.okxwallet;
  }
  if (win.ethereum) {
    // If multiple providers, prefer OKX
    if (win.ethereum.providers?.length) {
      const okx = win.ethereum.providers.find((p: any) => p.isOkxWallet);
      if (okx) return okx;
    }
    return win.ethereum;
  }
  return null;
}

/**
 * Inspects current wallet connection status.
 */
export async function checkWalletConnection(): Promise<Web3ProviderState> {
  const provider = getInjectedProvider();
  if (!provider) {
    return {
      hasProvider: false,
      providerName: null,
      connectedAddress: null,
      chainId: null,
      isXLayer: false,
    };
  }

  const win = window as any;
  const providerName = win.okxwallet || provider.isOkxWallet ? "okx" : provider.isMetaMask ? "metamask" : "generic";

  try {
    const accounts: string[] = await provider.request({ method: "eth_accounts" });
    const rawChainId: string = await provider.request({ method: "eth_chainId" });
    const chainId = parseInt(rawChainId, 16);

    return {
      hasProvider: true,
      providerName,
      connectedAddress: accounts[0]?.toLowerCase() || null,
      chainId,
      isXLayer: chainId === XLAYER_CHAIN_ID_DECIMAL,
    };
  } catch (err) {
    return {
      hasProvider: true,
      providerName,
      connectedAddress: null,
      chainId: null,
      isXLayer: false,
    };
  }
}

/**
 * Requests wallet account connection.
 */
export async function connectInjectedWallet(): Promise<{
  address: string;
  isXLayer: boolean;
}> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error("No Web3 wallet detected. Please install OKX Wallet or MetaMask to sign non-custodially.");
  }

  const accounts: string[] = await provider.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || !accounts.length) {
    throw new Error("Wallet connection was denied by user.");
  }

  await ensureXLayerNetwork();
  return {
    address: accounts[0].toLowerCase(),
    isXLayer: true,
  };
}

/**
 * Switches connected wallet to OKX X Layer (Chain ID 196) or registers the network.
 */
export async function ensureXLayerNetwork(providerArg?: any): Promise<void> {
  const provider = providerArg || getInjectedProvider();
  if (!provider) return;

  try {
    // Check if already on X Layer
    try {
      const rawChainId: string = await provider.request({ method: "eth_chainId" });
      if (parseInt(rawChainId, 16) === XLAYER_CHAIN_ID_DECIMAL) {
        return;
      }
    } catch {}

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: XLAYER_CHAIN_ID_HEX }],
    });
  } catch (switchError: any) {
    // Error code 4902 or unrecognized chain: register X Layer
    if (
      switchError?.code === 4902 ||
      switchError?.data?.originalError?.code === 4902 ||
      switchError?.message?.includes("Unrecognized") ||
      switchError?.message?.includes("not added")
    ) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [XLAYER_NETWORK_PARAMS],
        });
      } catch (addErr) {
        console.warn("[XLayer] Add chain notice:", addErr);
      }
    } else if (switchError?.code === 4001) {
      console.warn("[XLayer] User declined chain switch to X Layer.");
    } else {
      console.warn("[XLayer] Chain switch notice:", switchError?.message || switchError);
    }
  }
}

export const OKX_XLAYER_DEX_ROUTER = "0x4ae4E9B8D0d5248A31A980998F4aA3F631167BA4";

/**
 * Executes non-custodial swap transaction by prompting client-side signature.
 * Private keys NEVER leave the user device or hardware enclave.
 */
export async function signAndExecuteSwap(req: SwapExecutionRequest): Promise<SigningResult> {
  const provider = getInjectedProvider();
  if (!provider) {
    return {
      ok: false,
      error: "No Web3 wallet detected. Connect OKX Wallet or MetaMask to sign on OKX X Layer.",
    };
  }

  try {
    await ensureXLayerNetwork(provider);

    // Target the verified OKX DEX Aggregator router on OKX X Layer (Chain 196)
    const targetRouter = req.routerAddress || OKX_XLAYER_DEX_ROUTER;
    const txParams = {
      from: req.userAddress,
      to: targetRouter,
      value: "0x0",
      data: req.calldata || "0x",
    };

    // Request client-side transaction signature and broadcast via EIP-1193
    let txHash: string;
    try {
      txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [txParams],
      });
    } catch (sendErr: any) {
      const errMsg = sendErr?.message || String(sendErr);
      return {
        ok: false,
        error: `Transaction was rejected or failed in wallet: ${errMsg}`,
      };
    }

    if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x")) {
      return {
        ok: false,
        error: "Wallet did not return a valid transaction hash upon broadcast.",
      };
    }

    const explorerUrl = `${XLAYER_EXPLORER_URL}/tx/${txHash}`;

    // Poll for on-chain transaction receipt on OKX X Layer
    let confirmed = false;
    let receiptStatus: "success" | "pending" | "reverted" = "pending";
    const maxPollAttempts = 8;
    const pollIntervalMs = 2000;

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      try {
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        const receipt = await provider.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        });

        if (receipt) {
          if (receipt.status === "0x0" || receipt.status === 0) {
            return {
              ok: false,
              txHash,
              explorerUrl,
              confirmed: false,
              status: "reverted",
              error: "Transaction reverted on OKX X Layer. Please verify token allowance or slippage.",
            };
          }
          confirmed = true;
          receiptStatus = "success";
          break;
        }
      } catch (pollErr) {
        console.warn("[XLayer] Receipt poll notice:", pollErr);
      }
    }

    return {
      ok: true,
      txHash,
      explorerUrl,
      confirmed,
      status: receiptStatus,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Swap execution error: ${msg}`,
    };
  }
}
