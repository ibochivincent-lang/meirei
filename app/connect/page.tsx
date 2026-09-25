"use client";

/**
 * Meirei Multi-Wallet Connection & Channel Linkage Portal
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Provides non-custodial multi-wallet selection (OKX Wallet, MetaMask, Coinbase, Trust, Injected)
 * and multi-channel linkage with platform selector for Telegram and Web.
 */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { SITE } from "@/lib/data/site";
import { cn } from "@/lib/utils/cn";
import {
  XLAYER_CHAIN_ID_DECIMAL,
  XLAYER_CHAIN_ID_HEX,
  XLAYER_NETWORK_PARAMS,
  formatShortAddress,
  isValidEvmAddress,
} from "@/lib/wallet/xlayer";
import {
  getSpecificProvider,
  getAvailableWallets,
  WalletType,
  WalletOption,
} from "@/lib/wallet/xlayer_signer";
import {
  WalletConnectModal,
  WalletConnectIcon,
} from "@/components/wallet/wallet_connect_modal";

export type SocialPlatform = "telegram" | "web";

function SimpleTelegramLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-11 13" />
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function SimpleWebLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="m7 8 2 2-2 2" />
      <line x1="11" y1="12" x2="15" y2="12" />
    </svg>
  );
}

interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  tagline: string;
  badge: string;
  handleLabel: string;
  handlePlaceholder: string;
  defaultHandle: string;
  helperText: string;
  themeColor: string;
  activeBorder: string;
  activeBg: string;
  activeGlow: string;
  activeBadge: string;
  logo: React.FC<{ className?: string }>;
  returnCtaText: string;
  getReturnUrl: (handle: string) => string;
  nextSteps: string[];
}

const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  telegram: {
    id: "telegram",
    name: "Telegram Bot",
    tagline: "Live Bot & Execution",
    badge: "Direct Telegram Bot",
    handleLabel: "Telegram Handle or Chat ID",
    handlePlaceholder: "@username or numeric Chat ID",
    defaultHandle: "@meirei_trader",
    helperText: "Enter your Telegram handle with leading @ or your numeric Telegram user ID to link your wallet.",
    themeColor: "#24A1DE",
    activeBorder: "border-sky-500",
    activeBg: "bg-sky-500/10",
    activeGlow: "shadow-sky-500/20",
    activeBadge: "bg-sky-500/20 text-sky-700 border-sky-500/30",
    logo: SimpleTelegramLogo,
    returnCtaText: "Open Telegram Bot",
    getReturnUrl: () => {
      return SITE.telegramLink || "https://t.me/MeireiXLayerBot";
    },
    nextSteps: [
      "1. Open the Meirei Telegram bot chat (@MeireiXLayerBot).",
      "2. Send /start or 'balance' to inspect your synchronized wallet balance.",
      "3. Execute tokenized stock mandates by sending natural language instructions.",
      "4. Use /help to see all supported commands anytime.",
    ],
  },
  web: {
    id: "web",
    name: "Web Browser Console",
    tagline: "Direct Web Terminal",
    badge: "Connect Wallet & Trade",
    handleLabel: "Web Session Identity",
    handlePlaceholder: "Direct browser chat session",
    defaultHandle: "web_terminal_trader",
    helperText: "Connect your non-custodial wallet (OKX Wallet, MetaMask, etc.) on OKX X Layer to execute mandates with zero gas.",
    themeColor: "#FF6B4E",
    activeBorder: "border-accent-500",
    activeBg: "bg-accent-500/10",
    activeGlow: "shadow-accent-500/20",
    activeBadge: "bg-accent-500/20 text-accent-700 border-accent-500/30",
    logo: SimpleWebLogo,
    returnCtaText: "Launch Web Terminal",
    getReturnUrl: () => "/app",
    nextSteps: [
      "1. Connect your OKX Wallet or Web3 provider on Chain 196.",
      "2. Explore real-time OKX X Layer allowlisted equities and live spot prices.",
      "3. Configure autonomous investment mandates or deploy direct rebalance swaps.",
      "4. Enjoy 100% sponsored gas on all non-custodial executions.",
    ],
  },
};

function ConnectWalletContent() {
  const searchParams = useSearchParams();

  // Initial channel and handle resolution
  const initialChannelParam = (searchParams.get("channel") || "").toLowerCase() as SocialPlatform;
  const initialChannel: SocialPlatform = ["telegram", "web"].includes(
    initialChannelParam
  )
    ? initialChannelParam
    : "telegram";

  const rawHandleParam = searchParams.get("handle") || "";

  const [selectedChannel, setSelectedChannel] = useState<SocialPlatform>(initialChannel);
  const [channelHandle, setChannelHandle] = useState<string>(
    rawHandleParam.trim() || PLATFORM_CONFIGS[initialChannel].defaultHandle
  );

  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [activeWalletName, setActiveWalletName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showWalletConnectModal, setShowWalletConnectModal] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletOption[]>([]);

  const activeConfig = PLATFORM_CONFIGS[selectedChannel];

  // Sync available Web3 wallets and detect existing connection
  useEffect(() => {
    setAvailableWallets(getAvailableWallets());

    const okxProvider = getSpecificProvider("okx");
    const mmProvider = getSpecificProvider("metamask");
    const activeProvider = okxProvider || mmProvider || getSpecificProvider("injected");

    if (activeProvider) {
      activeProvider
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setConnectedAddress(accounts[0].toLowerCase());
            const name = okxProvider ? "OKX Wallet" : mmProvider ? "MetaMask" : "Web3 Wallet";
            setActiveWalletName(name);
          }
        })
        .catch(() => {});

      activeProvider
        .request({ method: "eth_chainId" })
        .then((rawId: string) => {
          const id = parseInt(rawId, 16);
          setCurrentChainId(id);
        })
        .catch(() => {});
    }
  }, []);

  // Switch preferred platform and sync URL state
  const handleSelectPlatform = (platform: SocialPlatform) => {
    if (platform === selectedChannel) return;
    setSelectedChannel(platform);
    setErrorMessage(null);
    setInfoMessage(null);
    setLinkSuccess(false);

    // If current handle is empty or matches another platform's default, switch to platform's default
    const isOtherDefault = Object.values(PLATFORM_CONFIGS).some(
      (c) => c.defaultHandle.toLowerCase() === channelHandle.trim().toLowerCase()
    );
    if (!channelHandle.trim() || isOtherDefault) {
      setChannelHandle(PLATFORM_CONFIGS[platform].defaultHandle);
    }

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("channel", platform);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleConnectWallet = async (type: WalletType = "okx") => {
    if (type === "walletconnect") {
      setShowWalletConnectModal(true);
      setShowWalletModal(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const provider = getSpecificProvider(type);
      if (!provider) {
        if (type === "okx") {
          throw new Error(
            "OKX Wallet extension not detected. Please install OKX Wallet from okx.com/web3 or tap 'Open in OKX Mobile App' below."
          );
        } else if (type === "metamask") {
          throw new Error(
            "MetaMask extension not detected in your browser. Please install MetaMask from metamask.io or choose another wallet."
          );
        } else if (type === "coinbase") {
          throw new Error(
            "Coinbase Wallet extension not detected. Please install Coinbase Wallet or choose another wallet."
          );
        } else if (type === "trust") {
          throw new Error(
            "Trust Wallet extension not detected. Please install Trust Wallet or choose another wallet."
          );
        } else {
          throw new Error(
            "No Web3 wallet extension found. Please install a compatible Web3 wallet or connect with WalletConnect."
          );
        }
      }

      // 1. Request accounts
      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No account authorized by wallet.");
      }

      const activeAddr = accounts[0].toLowerCase();
      setConnectedAddress(activeAddr);

      const walletTitle =
        type === "okx"
          ? "OKX Wallet"
          : type === "metamask"
          ? "MetaMask"
          : type === "coinbase"
          ? "Coinbase Wallet"
          : type === "trust"
          ? "Trust Wallet"
          : "Web3 Injected";
      setActiveWalletName(walletTitle);
      setShowWalletModal(false);

      // 2. Switch to OKX X Layer (Chain ID 196)
      const rawChainId: string = await provider.request({ method: "eth_chainId" });
      let chainId = parseInt(rawChainId, 16);

      if (chainId !== XLAYER_CHAIN_ID_DECIMAL) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: XLAYER_CHAIN_ID_HEX }],
          });
          chainId = XLAYER_CHAIN_ID_DECIMAL;
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [XLAYER_NETWORK_PARAMS],
            });
            chainId = XLAYER_CHAIN_ID_DECIMAL;
          } else {
            console.warn("[Wallet Connect] Switch warning:", switchErr?.message);
          }
        }
      }

      setCurrentChainId(chainId);
      setInfoMessage(`Connected ${walletTitle} (${formatShortAddress(activeAddr)}) on OKX X Layer.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectWallet = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const effectiveHandle = channelHandle.trim() || activeConfig.defaultHandle;
      await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: selectedChannel,
          handle: effectiveHandle,
          action: "unlink",
        }),
      }).catch(() => {});

      if (typeof window !== "undefined") {
        localStorage.removeItem("meirei_wallet_address");
        localStorage.removeItem("meirei_wallet_name");
        localStorage.removeItem("meirei_demo_sandbox");
        localStorage.setItem("meirei_disconnected", "true");
      }

      setConnectedAddress(null);
      setCurrentChainId(null);
      setActiveWalletName(null);
      setLinkSuccess(false);
      setInfoMessage(`Wallet disconnected and unlinked successfully from ${activeConfig.name}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to disconnect: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkToChannel = async () => {
    if (!connectedAddress) {
      setErrorMessage("Please connect a wallet first.");
      return;
    }

    const effectiveHandle = channelHandle.trim() || activeConfig.defaultHandle;
    if (!effectiveHandle) {
      setErrorMessage(`Please enter your ${activeConfig.handleLabel}.`);
      return;
    }

    setIsLinking(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      // 1. Fetch SIWE ownership challenge
      const chalRes = await fetch("/api/wallet/link/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: selectedChannel,
          handle: effectiveHandle,
          walletAddress: connectedAddress,
        }),
      });
      const chalData = await chalRes.json();
      if (!chalRes.ok || !chalData.message) {
        throw new Error(chalData.error || "Failed to generate ownership challenge.");
      }

      // 2. Request client-side signature
      const okx = getSpecificProvider("okx");
      const mm = getSpecificProvider("metamask");
      const provider = okx || mm || getSpecificProvider("injected");
      let signature: string | undefined = undefined;

      if (provider) {
        setInfoMessage("Please sign the verification message in your Web3 wallet to prove non-custodial ownership (costs zero gas)...");
        signature = await provider.request({
          method: "personal_sign",
          params: [chalData.message, connectedAddress],
        });
      }

      const res = await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: selectedChannel,
          handle: effectiveHandle,
          walletAddress: connectedAddress,
          signature,
          message: chalData.message,
          nonce: chalData.nonce,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to persist wallet linkage.");
      }

      setLinkSuccess(true);
      setInfoMessage(
        `Wallet ${formatShortAddress(connectedAddress)} successfully anchored to your ${activeConfig.name} account. Redirecting to ${activeConfig.name}...`
      );

      const targetUrl = activeConfig.getReturnUrl(effectiveHandle);
      if (targetUrl && typeof window !== "undefined") {
        if (selectedChannel === "web") {
          window.location.href = targetUrl;
        } else {
          window.open(targetUrl, "_blank", "noopener,noreferrer");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLinking(false);
    }
  };

  const effectiveHandle = channelHandle.trim() || activeConfig.defaultHandle;
  const returnUrl = activeConfig.getReturnUrl(effectiveHandle);
  const ActiveLogo = activeConfig.logo;

  return (
    <div className="min-h-screen bg-surface-50 text-ink-900 flex flex-col items-center justify-center p-4 selection:bg-accent-500/20 selection:text-ink-950 relative">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="transition hover:opacity-90">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-ink-200 text-[11px] text-ink-700 font-mono shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            OKX X Layer (196)
          </div>
        </div>

        {/* Main Connect Card */}
        <div className="rounded-2xl bg-white border border-ink-200 p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-ink-950">
              Connect & Manage Wallet
            </h1>
            <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">
              Select your preferred social platform to interface with, then anchor your Web3
              wallet for autonomous execution on OKX X Layer.
            </p>
          </div>

          {/* Social Media Platform Selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold text-ink-700 uppercase tracking-wider">
                Preferred Interface Platform
              </label>
              <span className="text-[11px] text-ink-400 font-mono">Select to switch</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(PLATFORM_CONFIGS) as SocialPlatform[]).map((platformId) => {
                const conf = PLATFORM_CONFIGS[platformId];
                const isSelected = selectedChannel === platformId;
                const LogoComponent = conf.logo;

                return (
                  <button
                    key={platformId}
                    type="button"
                    onClick={() => handleSelectPlatform(platformId)}
                    className={`p-3 min-h-[44px] rounded-xl border text-left transition flex flex-col justify-between gap-2.5 cursor-pointer relative group ${
                      isSelected
                        ? `${conf.activeBg} ${conf.activeBorder} shadow-xs ring-1 ring-ink-300`
                        : "bg-surface-50 border-ink-200 hover:bg-white hover:border-ink-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`p-2 rounded-lg transition ${
                          isSelected
                            ? conf.activeBadge
                            : "bg-surface-100 text-ink-600 group-hover:text-ink-900 border border-ink-200/60"
                        }`}
                      >
                        <LogoComponent className="w-4 h-4" />
                      </div>
                      {isSelected ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-ink-200" />
                      )}
                    </div>

                    <div>
                      <div
                        className={`text-xs font-bold transition ${
                          isSelected ? "text-ink-950" : "text-ink-700 group-hover:text-ink-950"
                        }`}
                      >
                        {conf.name}
                      </div>
                      <div className="text-[10px] text-ink-500 truncate mt-0.5">
                        {conf.tagline}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Identifier Input OR Direct Web Chat Routing */}
          {selectedChannel === "web" ? (
            <div className="mb-6 p-5 rounded-2xl bg-accent-50/50 border border-accent-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent-100 text-accent-700 border border-accent-200">
                    <SimpleWebLogo className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink-950">Meirei Conversational Chat</h3>
                    <p className="text-[11px] text-accent-700 font-mono">Direct Browser Access · OKX X Layer</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                  Active Web3 Session
                </span>
              </div>

              <p className="text-xs text-ink-700 leading-relaxed">
                You are accessing Meirei directly on the website. Launch the conversational chat to query real-time stock prices, inspect your non-custodial smart wallet balance, or execute natural-language portfolio rebalancing mandates with 100% gas sponsorship.
              </p>

              <div className="pt-1">
                <Link
                  href="/app#conversational-chat"
                  className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer group"
                >
                  <span>Open Meirei Conversational Chat on Website</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-surface-50 border border-ink-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink-700">
                  {activeConfig.handleLabel}
                </label>
                <div className="flex items-center gap-1.5 text-[10px] text-ink-500 font-mono">
                  <ActiveLogo className="w-3.5 h-3.5 text-ink-600" />
                  <span>{activeConfig.name}</span>
                </div>
              </div>

              <input
                type="text"
                value={channelHandle}
                onChange={(e) => setChannelHandle(e.target.value)}
                placeholder={activeConfig.handlePlaceholder}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-lg bg-white border border-ink-200 text-xs font-mono text-ink-900 placeholder-ink-400 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition shadow-xs"
              />

              <p className="text-[11px] text-ink-500 leading-relaxed">
                {activeConfig.helperText}
              </p>
            </div>
          )}

          {infoMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {linkSuccess ? (
            <div className="space-y-4">
              {/* Linked Confirmation Banner */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${activeConfig.activeBadge} border`}>
                    <ActiveLogo className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ink-950">
                      Wallet Successfully Linked to {activeConfig.name}
                    </div>
                    <div className="text-xs text-emerald-700 font-mono mt-0.5">
                      {effectiveHandle}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-ink-700 leading-relaxed pt-1">
                  Your address{" "}
                  <span className="font-mono font-bold text-ink-950">
                    {formatShortAddress(connectedAddress || "")}
                  </span>{" "}
                  ({activeWalletName || "Web3 Wallet"}) is now securely anchored to your{" "}
                  <span className="text-ink-950 font-medium">{activeConfig.name}</span> account on OKX X Layer.
                </div>
              </div>

              {/* Dynamic Next Steps */}
              <div className="p-3.5 rounded-xl bg-surface-50 border border-ink-200 text-xs text-ink-700 space-y-2">
                <div className="font-semibold text-ink-950 flex items-center justify-between">
                  <span>Next Steps for {activeConfig.name}:</span>
                  <span className="text-[10px] text-emerald-700 font-mono">Status: Ready</span>
                </div>
                {activeConfig.nextSteps.map((step, idx) => (
                  <p key={idx} className="text-ink-600 leading-relaxed">
                    {step}
                  </p>
                ))}
              </div>

              {/* Dynamic Action Buttons */}
              <div className="pt-2 flex flex-col gap-2.5">
                <a
                  href={returnUrl}
                  target={selectedChannel === "web" ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  className={cn(
                    "w-full min-h-[44px] py-3 px-4 rounded-xl text-white font-semibold text-sm text-center transition shadow-xs flex items-center justify-center gap-2",
                    selectedChannel === "telegram" && "bg-sky-600 hover:bg-sky-700",
                    selectedChannel === "web" && "bg-accent-600 hover:bg-accent-700"
                  )}
                >
                  <ActiveLogo className="w-4 h-4 text-white" />
                  <span>{activeConfig.returnCtaText}</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDisconnectWallet}
                    className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium text-center transition border border-red-200 cursor-pointer"
                  >
                    Disconnect & Unlink
                  </button>

                  <Link
                    href="/app"
                    className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-surface-50 hover:bg-surface-100 text-ink-800 font-medium text-xs text-center transition border border-ink-200 flex items-center justify-center"
                  >
                    Open Web Terminal
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account State Overview Card */}
              <div className="p-4 rounded-xl bg-surface-50 border border-ink-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-600">Target Channel:</span>
                  <div className="flex items-center gap-1.5 font-semibold text-ink-950">
                    <ActiveLogo className="w-3.5 h-3.5" />
                    <span>{activeConfig.name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-600">Account Handle:</span>
                  <span className="font-mono text-ink-800">{effectiveHandle}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-600">Target Network:</span>
                  <span className="font-mono text-emerald-700 font-semibold">OKX X Layer (Chain 196)</span>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-ink-200 pt-3">
                  <span className="text-ink-600">Wallet Status:</span>
                  {connectedAddress ? (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-mono text-xs text-emerald-700 font-medium">
                        {activeWalletName || "Connected"} ({formatShortAddress(connectedAddress)})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-mono text-xs text-amber-700 font-medium">Not Connected</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {!connectedAddress ? (
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWalletModal(true)}
                    disabled={isLoading}
                    className="w-full min-h-[44px] py-3.5 px-4 rounded-xl bg-ink-900 hover:bg-ink-800 disabled:opacity-50 text-white font-semibold text-sm transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Connect Wallet</span>
                    <span className="text-xs opacity-80 font-normal">
                      (OKX, MetaMask, Coinbase...)
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWalletConnectModal(true)}
                      className="min-h-[44px] py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold text-center transition border border-sky-200 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <WalletConnectIcon className="w-3.5 h-3.5" />
                      <span>WalletConnect</span>
                    </button>
                    <a
                      href={`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(
                        typeof window !== "undefined"
                          ? window.location.href
                          : "https://meirei.tella.cash/connect"
                      )}`}
                      className="min-h-[44px] py-2.5 px-3 rounded-xl bg-surface-50 hover:bg-surface-100 text-ink-700 text-xs font-medium text-center transition border border-ink-200 flex items-center justify-center gap-1.5"
                    >
                      <span>Open in OKX App</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleLinkToChannel}
                    disabled={isLinking}
                    className={cn(
                      "w-full min-h-[44px] py-3.5 px-4 rounded-xl disabled:opacity-50 text-white font-semibold text-sm transition shadow-xs cursor-pointer flex items-center justify-center gap-2",
                      selectedChannel === "telegram" && "bg-sky-600 hover:bg-sky-700",
                      selectedChannel === "web" && "bg-accent-600 hover:bg-accent-700"
                    )}
                  >
                    <ActiveLogo className="w-4 h-4 text-white" />
                    <span>
                      {isLinking
                        ? "Anchoring Linkage..."
                        : `Confirm Linkage to ${activeConfig.name}`}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWalletModal(true)}
                      disabled={isLoading}
                      className="min-h-[44px] py-2.5 px-3 rounded-xl bg-surface-50 hover:bg-surface-100 text-ink-700 text-xs font-medium text-center transition border border-ink-200 cursor-pointer"
                    >
                      Switch Wallet
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectWallet}
                      disabled={isLoading}
                      className="min-h-[44px] py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium text-center transition border border-red-200 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Security Note */}
          <div className="mt-6 pt-4 border-t border-ink-200 text-center">
            <p className="text-[11px] text-ink-500 leading-relaxed">
              100% Non-Custodial. Your private keys never leave your device. Every user
              channel has a separate, isolated database record on OKX X Layer Mainnet.
            </p>
          </div>
        </div>

        {/* Multi-Wallet Selection Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white border border-ink-200 p-6 shadow-2xl space-y-4 text-ink-900">
              <div className="flex items-center justify-between border-b border-ink-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-ink-950">Select Web3 Wallet</h3>
                  <p className="text-xs text-ink-500 mt-0.5">Choose your wallet on OKX X Layer</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWalletModal(false)}
                  className="h-8 w-8 min-h-[32px] rounded-full bg-surface-100 hover:bg-surface-200 text-ink-600 hover:text-ink-950 flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Wallet Options List */}
              <div className="space-y-2 pt-1">
                {availableWallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => handleConnectWallet(wallet.id)}
                    disabled={isLoading}
                    className={`w-full min-h-[44px] p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      wallet.id === "okx"
                        ? "bg-accent-50/60 border-accent-300 hover:bg-accent-50"
                        : wallet.id === "walletconnect"
                        ? "bg-sky-50/60 border-sky-300 hover:bg-sky-50"
                        : "bg-surface-50 border-ink-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          wallet.id === "okx"
                            ? "bg-accent-600 text-white"
                            : wallet.id === "walletconnect"
                            ? "bg-sky-600 text-white"
                            : "bg-surface-200 text-ink-700"
                        }`}
                      >
                        {wallet.id === "walletconnect" ? (
                          <WalletConnectIcon className="w-5 h-5 text-white" />
                        ) : (
                          wallet.icon
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-ink-950">{wallet.name}</span>
                          {wallet.id === "okx" && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-accent-100 text-accent-700 border border-accent-200">
                              RECOMMENDED
                            </span>
                          )}
                          {wallet.id === "walletconnect" && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-sky-100 text-sky-700 border border-sky-200">
                              UNIVERSAL
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-ink-500">{wallet.description}</div>
                      </div>
                    </div>
                    <div>
                      {wallet.isInstalled ? (
                        <span className="text-[11px] font-medium text-emerald-700 font-mono">
                          Ready
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-ink-400 font-mono">
                          Select
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Mobile Deep Link */}
              <div className="pt-2 border-t border-ink-200">
                <a
                  href={`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(
                    typeof window !== "undefined"
                      ? window.location.href
                      : "https://meirei.tella.cash/connect"
                  )}`}
                  className="w-full min-h-[44px] flex items-center justify-center py-2.5 px-3 rounded-xl bg-surface-50 hover:bg-surface-100 text-center text-xs font-medium text-ink-700 transition border border-ink-200"
                >
                  Open in OKX Mobile App
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated WalletConnect Modal */}
        <WalletConnectModal
          isOpen={showWalletConnectModal}
          onClose={() => setShowWalletConnectModal(false)}
          onConnect={(address, walletName) => {
            setConnectedAddress(address);
            setActiveWalletName(walletName);
            setInfoMessage(`Connected ${walletName} (${formatShortAddress(address)}) on OKX X Layer.`);
          }}
        />

        {/* Bottom Helper Footer */}
        <div className="mt-6 text-center text-xs text-ink-500">
          Project Meirei · OKX X Layer Mainnet (Chain ID 196)
        </div>
      </div>
    </div>
  );
}

export default function ConnectWalletPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-50 text-ink-900 flex items-center justify-center">
          <div className="font-mono text-xs text-ink-500">Loading connection portal...</div>
        </div>
      }
    >
      <ConnectWalletContent />
    </Suspense>
  );
}
