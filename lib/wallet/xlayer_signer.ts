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
import { keccak256, stringToBytes } from "viem";

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
  mandateText?: string;
  mandateId?: number;
  walletType?: WalletType;
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

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

// In-memory registry of EIP-6963 announced providers
const eip6963Providers = new Map<string, EIP6963ProviderDetail>();

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (event: any) => {
    if (event?.detail?.info?.rdns && event?.detail?.provider) {
      eip6963Providers.set(event.detail.info.rdns, event.detail);
    }
  });
  try {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  } catch {}
}

/**
 * Returns a specific Web3 provider by wallet type, preventing provider conflicts.
 */
export function getSpecificProvider(type: WalletType = "injected"): any {
  if (typeof window === "undefined") return null;
  const win = window as any;

  if (typeof win.dispatchEvent === "function") {
    try {
      win.dispatchEvent(new Event("eip6963:requestProvider"));
    } catch {}
  }

  if (type === "okx") {
    // 1. EIP-6963 registration
    const okxEip = eip6963Providers.get("com.okex.wallet");
    if (okxEip?.provider) return okxEip.provider;

    // 2. Direct OKX wallet namespace
    if (win.okxwallet) return win.okxwallet;

    // 3. Multi-provider array under window.ethereum
    if (win.ethereum?.providers?.length) {
      const okx = win.ethereum.providers.find((p: any) => p.isOkxWallet);
      if (okx) return okx;
    }

    // 4. Injected ethereum with isOkxWallet flag
    if (win.ethereum?.isOkxWallet) return win.ethereum;
    return null;
  }

  if (type === "metamask") {
    // 1. Check EIP-6963 for MetaMask RDNS
    const mmEip = eip6963Providers.get("io.metamask") || eip6963Providers.get("io.metamask.flask");
    if (mmEip?.provider) return mmEip.provider;

    // 2. Check multi-provider array under window.ethereum
    // Strictly ensure provider is MetaMask AND NOT OKX / Coinbase / Trust
    if (win.ethereum?.providers?.length) {
      const mm = win.ethereum.providers.find(
        (p: any) => p.isMetaMask && !p.isOkxWallet && !p.isCoinbaseWallet && !p.isTrust
      );
      if (mm) return mm;
    }

    // 3. Direct window.ethereum ONLY IF it is pure MetaMask and NOT OKX Wallet
    if (
      win.ethereum?.isMetaMask &&
      !win.ethereum?.isOkxWallet &&
      !win.ethereum?.isCoinbaseWallet &&
      !win.ethereum?.isTrust
    ) {
      return win.ethereum;
    }

    // Do NOT return win.ethereum if it is OKX Wallet or unknown!
    return null;
  }

  if (type === "coinbase") {
    const cbEip = eip6963Providers.get("com.coinbase.wallet");
    if (cbEip?.provider) return cbEip.provider;

    if (win.coinbaseWalletExtension) return win.coinbaseWalletExtension;
    if (win.ethereum?.providers?.length) {
      const cb = win.ethereum.providers.find((p: any) => p.isCoinbaseWallet);
      if (cb) return cb;
    }
    if (win.ethereum?.isCoinbaseWallet) return win.ethereum;
    return null;
  }

  if (type === "trust") {
    const twEip = eip6963Providers.get("com.trustwallet.app");
    if (twEip?.provider) return twEip.provider;

    if (win.trustwallet) return win.trustwallet;
    if (win.ethereum?.providers?.length) {
      const tw = win.ethereum.providers.find((p: any) => p.isTrust);
      if (tw) return tw;
    }
    if (win.ethereum?.isTrust) return win.ethereum;
    return null;
  }

  if (type === "walletconnect") {
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

  if (typeof win.dispatchEvent === "function") {
    try {
      win.dispatchEvent(new Event("eip6963:requestProvider"));
    } catch {}
  }

  const hasOkx = !!(
    eip6963Providers.has("com.okex.wallet") ||
    win.okxwallet ||
    win.ethereum?.isOkxWallet ||
    win.ethereum?.providers?.some((p: any) => p.isOkxWallet)
  );

  const hasMetaMask = !!(
    eip6963Providers.has("io.metamask") ||
    eip6963Providers.has("io.metamask.flask") ||
    (win.ethereum?.isMetaMask && !win.ethereum?.isOkxWallet && !win.ethereum?.isCoinbaseWallet && !win.ethereum?.isTrust) ||
    win.ethereum?.providers?.some((p: any) => p.isMetaMask && !p.isOkxWallet && !p.isCoinbaseWallet && !p.isTrust)
  );

  const hasCoinbase = !!(
    eip6963Providers.has("com.coinbase.wallet") ||
    win.coinbaseWalletExtension ||
    win.ethereum?.isCoinbaseWallet ||
    win.ethereum?.providers?.some((p: any) => p.isCoinbaseWallet)
  );

  const hasTrust = !!(
    eip6963Providers.has("com.trustwallet.app") ||
    win.trustwallet ||
    win.ethereum?.isTrust ||
    win.ethereum?.providers?.some((p: any) => p.isTrust)
  );

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
      isInstalled: !!(win.ethereum || win.okxwallet || eip6963Providers.size > 0),
      installUrl: "https://www.okx.com/web3",
      icon: "W3",
    },
  ];
}

/**
 * Detects injected Web3 provider, prioritizing OKX Wallet.
 */
export function getInjectedProvider(preferredType?: WalletType): any {
  if (typeof window === "undefined") return null;
  const win = window as any;

  // 1. If an explicit wallet type was provided, use that specific provider
  if (preferredType && preferredType !== "injected" && preferredType !== "walletconnect") {
    const specific = getSpecificProvider(preferredType);
    if (specific) return specific;
  }

  // 2. Check saved wallet type from current authenticated session
  try {
    const savedType = localStorage.getItem("meirei_wallet_type") as WalletType | null;
    if (savedType && savedType !== "injected" && savedType !== "walletconnect") {
      const specific = getSpecificProvider(savedType);
      if (specific) return specific;
    }
  } catch {}

  // 3. Fallback: check EIP-6963 announced providers
  const okxEip = eip6963Providers.get("com.okex.wallet");
  if (okxEip?.provider) return okxEip.provider;

  const mmEip = eip6963Providers.get("io.metamask") || eip6963Providers.get("io.metamask.flask");
  if (mmEip?.provider) return mmEip.provider;

  if (win.okxwallet) return win.okxwallet;

  if (win.ethereum) {
    // If multiple providers, prefer provider matching saved session
    if (win.ethereum.providers?.length) {
      return win.ethereum.providers[0];
    }
    return win.ethereum;
  }
  return null;
}

/**
 * Inspects current wallet connection status.
 */
export async function checkWalletConnection(preferredType?: WalletType): Promise<Web3ProviderState> {
  const provider = getInjectedProvider(preferredType);
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
  const providerName = provider === win.okxwallet || provider.isOkxWallet ? "okx" : provider.isMetaMask ? "metamask" : "generic";

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
export async function connectInjectedWallet(type?: WalletType): Promise<{
  address: string;
  isXLayer: boolean;
}> {
  const provider = getInjectedProvider(type);
  if (!provider) {
    throw new Error(
      type === "metamask"
        ? "MetaMask extension not detected. Please install MetaMask from metamask.io or use WalletConnect."
        : type === "okx"
        ? "OKX Wallet extension not detected. Please install OKX Wallet from okx.com/web3."
        : "No Web3 wallet detected. Please install OKX Wallet or MetaMask to sign non-custodially."
    );
  }

  const accounts: string[] = await provider.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || !accounts.length) {
    throw new Error("Wallet connection was denied by user.");
  }

  await ensureXLayerNetwork(provider);
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

export const OKX_XLAYER_DEX_ROUTER = "0x7c5bee2a8091c3ef39072f64f18fac913060aeaf";
export const QUICKSWAP_XLAYER_ROUTER = "0x4B9f4d2435Ef65559567e5DbFC1BbB37abC43B57";
export const MANDATE_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_MANDATE_REGISTRY_ADDRESS || "0x5E7095cC40303b12A1047E0BF2D39CF797379012";
export const USDG_TOKEN_ADDRESS = "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8";

/** On-chain token addresses for every tradable xStock on X Layer (chain 196). */
export const XSTOCK_ADDRESSES: Record<string, string> = {
  AAPLx: "0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a",
  MSFTx: "0x5621737f42dae558b81269fcb9e9e70c19aa6b35",
  NVDAx: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d",
  GOOGLx: "0xe92f673ca36c5e2efd2de7628f815f84807e803f",
  AMZNx: "0x3557ba345b01efa20a1bddc61f573bfd87195081",
  METAx: "0x96702be57cd9777f835117a809c7124fe4ec989a",
  TSLAx: "0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0",
  COINx: "0x1d5338302f3dd78f7aa9580bc53c4d445ec6ba25",
  SPYx: "0x42f7461c360980ff62c3e1db6aa5229c15d48721",
  QQQx: "0x71c50b69107cc6ea56795f54070a7f1a8c9e5033",
  AMDx: "0x89e13b8602b9ff9b867cfae4f8d55d71fa8430e2",
  CRWDx: "0x3a4b69c5819772bf258b3506c74ad64a787965df",
  MSTRx: "0x7b58c9320b92f72bc97e79391ab1a457492c13fa",
  TSMx: "0x2a946b5d92e8c614efabcf6e1598da4c4e7926b1",
  AVGOx: "0x6f31b87a912852643a6d71ec9103cba7e48df528",
  INTCx: "0x18c4b726ae0d4f5b2f67ea9a36729a571c8901eb",
  MUx: "0x91d3e74a812b704c356da7fe63098514ef1a52fc",
  MRVLx: "0x48e1c67d301ba593fa88d5e4905cf71286b24a35",
  IWMx: "0x3c71a54b9d0263f1ec78b4a8e0380c5984cf7632",
  DELLx: "0x83e5fa62d908e234bc5719ab4c5770df594e9b7a",
  USDC: "0xb6ceceab302e2e4948951ee7843fc24e92933061",
};

export interface DexSwapQuote {
  routerAddress: string;
  calldata: string;
  value: string;
  toAmount: string;
  minToAmount: string;
  priceImpact: string;
}

/**
 * Fetches a live DEX swap quote from the OKX DEX Aggregator via the internal
 * /api/dex/swap proxy route. Returns the router address and calldata needed
 * for the user to sign a real on-chain swap — no server custody of funds.
 *
 * @param fromTokenAddress - ERC-20 address of the token being sold (e.g. USDG)
 * @param toTokenAddress   - ERC-20 address of the token being bought (e.g. METAx)
 * @param amountInSmallestUnit - Amount in smallest denomination (e.g. 100 USDG = "100000000" for 6 decimals)
 * @param userWalletAddress - The wallet that will sign and send the transaction
 */
export async function fetchDexSwapCalldata(
  fromTokenAddress: string,
  toTokenAddress: string,
  amountInSmallestUnit: string,
  userWalletAddress: string
): Promise<DexSwapQuote> {
  const params = new URLSearchParams({
    fromToken: fromTokenAddress,
    toToken: toTokenAddress,
    amount: amountInSmallestUnit,
    userWallet: userWalletAddress,
    slippage: "1",
  });

  const res = await fetch(`/api/dex/swap?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || !json.ok) {
    throw new Error(json.error || `DEX quote failed with status ${res.status}`);
  }

  return {
    routerAddress: json.routerAddress,
    calldata: json.calldata,
    value: json.value || "0x0",
    toAmount: json.toAmount || "0",
    minToAmount: json.minToAmount || "0",
    priceImpact: json.priceImpact || "0",
  };
}

/**
 * Executes non-custodial swap or mandate registration transaction on OKX X Layer (Chain 196).
 * Pre-checks gas and token balances, requests ERC-20 approval when needed,
 * commits mandates on-chain to MandateRegistry, and strictly verifies transaction receipt.
 * Private keys NEVER leave the user device or hardware enclave.
 */
export async function signAndExecuteSwap(req: SwapExecutionRequest): Promise<SigningResult> {
  const provider = getInjectedProvider(req.walletType);
  if (!provider) {
    return {
      ok: false,
      error: "No Web3 wallet detected. Connect OKX Wallet or MetaMask to sign on OKX X Layer.",
    };
  }

  try {
    await ensureXLayerNetwork(provider);

    const userAddr = req.userAddress.toLowerCase();
    const paddedUser = userAddr.replace(/^0x/i, "").padStart(64, "0");

    // 1. Pre-flight Check: Native OKB Gas Balance
    try {
      const rawGasBal: string = await provider.request({
        method: "eth_getBalance",
        params: [userAddr, "latest"],
      });
      const okbBal = Number(BigInt(rawGasBal || "0x0")) / 1e18;
      if (okbBal < 0.0001) {
        return {
          ok: false,
          error: `Insufficient OKB for transaction gas fees on X Layer (balance: ${okbBal.toFixed(4)} OKB). Please fund your wallet with at least 0.001 OKB.`,
        };
      }
    } catch (gasErr: unknown) {
      console.warn("[XLayer] Gas balance check notice:", gasErr);
    }

    // 2. Pre-flight Check: USDG Capital Balance
    try {
      const rawUsdgBal: string = await provider.request({
        method: "eth_call",
        params: [
          {
            to: USDG_TOKEN_ADDRESS,
            data: `0x70a08231${paddedUser}`,
          },
          "latest",
        ],
      });
      const usdgBal = Number(BigInt(rawUsdgBal || "0x0")) / 1e6;
      if (usdgBal < req.fromAmount) {
        return {
          ok: false,
          error: `Insufficient USDG balance on X Layer. Your wallet has $${usdgBal.toFixed(2)} USDG, but this swap requires $${req.fromAmount.toFixed(2)} USDG.`,
        };
      }
    } catch (balErr: unknown) {
      console.warn("[XLayer] USDG balance check notice:", balErr);
    }

    // 3. Determine Target Contract & Encode Calldata
    let targetContract = req.routerAddress;
    let txData = req.calldata;

    if (targetContract && targetContract.toLowerCase() !== MANDATE_REGISTRY_ADDRESS.toLowerCase()) {
      // Swapping via DEX Router (e.g. OKX DEX or QuickSwap)
      // Check and prompt ERC-20 approval if allowance is insufficient
      try {
        const paddedSpender = targetContract.replace(/^0x/i, "").padStart(64, "0").toLowerCase();
        const rawAllowance: string = await provider.request({
          method: "eth_call",
          params: [
            {
              to: USDG_TOKEN_ADDRESS,
              data: `0xdd62ed3e${paddedUser}${paddedSpender}`,
            },
            "latest",
          ],
        });
        const currentAllowance = BigInt(rawAllowance || "0x0");
        const requiredUnits = BigInt(Math.floor(req.fromAmount * 1e6));

        if (currentAllowance < requiredUnits) {
          const approveTxHash: string = await provider.request({
            method: "eth_sendTransaction",
            params: [
              {
                from: userAddr,
                to: USDG_TOKEN_ADDRESS,
                data: `0x095ea7b3${paddedSpender}ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`,
              },
            ],
          });

          if (!approveTxHash) {
            return {
              ok: false,
              error: "USDG approval transaction was rejected in wallet.",
            };
          }

          // Await approval confirmation
          let approved = false;
          for (let i = 0; i < 8; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            const receipt = await provider.request({
              method: "eth_getTransactionReceipt",
              params: [approveTxHash],
            });
            if (receipt && (receipt.status === "0x1" || receipt.status === 1)) {
              approved = true;
              break;
            }
          }

          if (!approved) {
            return {
              ok: false,
              error: "USDG token approval was not confirmed on X Layer. Cannot proceed with swap.",
            };
          }
        }
      } catch (appErr: unknown) {
        const msg = appErr instanceof Error ? appErr.message : String(appErr);
        return {
          ok: false,
          error: `Token approval failed: ${msg}`,
        };
      }
    } else {
      // Default Non-Custodial Path: Commit mandate on-chain to MandateRegistry (0x5E7095cC40303b12A1047E0BF2D39CF797379012)
      targetContract = MANDATE_REGISTRY_ADDRESS;
      if (!txData || txData === "0x") {
        const directive =
          req.mandateText ||
          `Meirei Mandate #${req.mandateId || 1}: Deploy ${req.toSymbol} with $${req.fromAmount} USDG capital on X Layer`;
        const commitmentHash = keccak256(stringToBytes(directive));
        // Selector 0x69c519c4 for setMandate(bytes32)
        txData = `0x69c519c4${commitmentHash.slice(2)}`;
      }
    }

    // 4. Request Client-Side Transaction Signature and Broadcast
    const txParams = {
      from: userAddr,
      to: targetContract,
      value: req.value || "0x0",
      data: txData,
    };

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

    // 5. Poll for On-Chain Transaction Receipt on OKX X Layer
    let confirmed = false;
    const maxPollAttempts = 10;
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
              error: "Transaction reverted on OKX X Layer. Please verify token allowance or gas.",
            };
          }
          if (receipt.status === "0x1" || receipt.status === 1) {
            confirmed = true;
            break;
          }
        }
      } catch (pollErr) {
        console.warn("[XLayer] Receipt poll notice:", pollErr);
      }
    }

    if (!confirmed) {
      return {
        ok: false,
        txHash,
        explorerUrl,
        confirmed: false,
        status: "pending",
        error: `Transaction was broadcast (${txHash.slice(0, 10)}...), but confirmation timed out on X Layer. View status on explorer: ${explorerUrl}`,
      };
    }

    return {
      ok: true,
      txHash,
      explorerUrl,
      confirmed: true,
      status: "success",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Swap execution error: ${msg}`,
    };
  }
}
