"use client";

/**
 * Meirei Multi-Wallet Connection & Channel Linkage Portal
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Provides non-custodial multi-wallet selection (OKX Wallet, MetaMask, Coinbase, Trust, Injected)
 * and multi-channel linkage with platform selector for WhatsApp, Telegram, Instagram, and Web.
 */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { SITE } from "@/lib/data/site";
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

export type SocialPlatform = "whatsapp" | "telegram" | "instagram" | "web";

// Simple Vector SVG Logos
function SimpleWhatsAppLogo({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path
        d="M9.5 9a.5.5 0 0 0-.5.5v.1c.1 1.2.7 2.6 1.8 3.7s2.5 1.7 3.7 1.8h.1a.5.5 0 0 0 .5-.5v-1.2a.5.5 0 0 0-.3-.5l-1.5-.6a.5.5 0 0 0-.6.2l-.5.7a6.2 6.2 0 0 1-2.2-2.2l.7-.5a.5.5 0 0 0 .2-.6l-.6-1.5a.5.5 0 0 0-.5-.3H9.5z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

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

function SimpleInstagramLogo({ className = "w-5 h-5" }: { className?: string }) {
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
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
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
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp",
    tagline: "Conversational Bot",
    badge: "Official Chat",
    handleLabel: "WhatsApp Phone Number",
    handlePlaceholder: "+234 902 827 9382 (with country code)",
    defaultHandle: "+234 902 827 9382",
    helperText: "Enter your WhatsApp phone number including your international country code.",
    themeColor: "#25D366",
    activeBorder: "border-emerald-500",
    activeBg: "bg-emerald-500/10",
    activeGlow: "shadow-emerald-500/20",
    activeBadge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    logo: SimpleWhatsAppLogo,
    returnCtaText: "Return to WhatsApp Chat",
    getReturnUrl: (handle: string) => {
      const digits = handle.replace(/[^0-9]/g, "");
      return digits ? `https://wa.me/${digits}` : SITE.whatsappLink;
    },
    nextSteps: [
      "1. Return to your WhatsApp conversation with Meirei.",
      "2. Send 'balance' to view real-time OKX X Layer assets.",
      "3. Send 'stocks' or 'buy 50 USDG AAPLx' to execute rebalance mandates.",
      "4. Send 'disconnect' anytime in WhatsApp to unlink your wallet.",
    ],
  },
  telegram: {
    id: "telegram",
    name: "Telegram",
    tagline: "Bot & Community",
    badge: "Direct Bot",
    handleLabel: "Telegram Handle or Chat ID",
    handlePlaceholder: "@username or numeric Chat ID",
    defaultHandle: "@meirei_trader",
    helperText: "Enter your Telegram handle with leading @ or your numeric Telegram user ID.",
    themeColor: "#24A1DE",
    activeBorder: "border-sky-500",
    activeBg: "bg-sky-500/10",
    activeGlow: "shadow-sky-500/20",
    activeBadge: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    logo: SimpleTelegramLogo,
    returnCtaText: "Open Telegram Bot",
    getReturnUrl: () => {
      return SITE.telegramLink || "https://t.me/meirei_agent_bot";
    },
    nextSteps: [
      "1. Open the Meirei Telegram bot chat.",
      "2. Send /start or 'balance' to inspect your synchronized wallet balance.",
      "3. Execute tokenized stock mandates by sending natural language instructions.",
      "4. Use /help to see all supported commands anytime.",
    ],
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    tagline: "Direct Message",
    badge: "DM Assistant",
    handleLabel: "Instagram Handle",
    handlePlaceholder: "@your_instagram",
    defaultHandle: "@meirei_investor",
    helperText: "Enter your Instagram username handle to link with Meirei DM assistant.",
    themeColor: "#E1306C",
    activeBorder: "border-pink-500",
    activeBg: "bg-pink-500/10",
    activeGlow: "shadow-pink-500/20",
    activeBadge: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    logo: SimpleInstagramLogo,
    returnCtaText: "Open Instagram DM",
    getReturnUrl: (handle: string) => {
      const clean = handle.trim().replace(/^@/, "");
      return clean ? `https://instagram.com/${clean}` : (SITE.instagramLink || "https://instagram.com/meirei.agent");
    },
    nextSteps: [
      "1. Open Instagram Direct Messages.",
      "2. Send 'balance' to Meirei to verify your on-chain portfolio.",
      "3. Send your investment goals to execute tokenized stock trades.",
      "4. Direct message 'disconnect' anytime to remove the linkage.",
    ],
  },
  web: {
    id: "web",
    name: "Web Platform",
    tagline: "Browser Terminal",
    badge: "Web3 Console",
    handleLabel: "Account Email or Handle",
    handlePlaceholder: "investor@meirei.app or handle",
    defaultHandle: "investor@meirei.app",
    helperText: "Enter your email or identifier for direct browser terminal execution.",
    themeColor: "#FF6B4E",
    activeBorder: "border-[#FF6B4E]",
    activeBg: "bg-[#FF6B4E]/10",
    activeGlow: "shadow-[#FF6B4E]/20",
    activeBadge: "bg-[#FF6B4E]/20 text-[#FF6B4E] border-[#FF6B4E]/30",
    logo: SimpleWebLogo,
    returnCtaText: "Launch Web Terminal",
    getReturnUrl: () => "/app",
    nextSteps: [
      "1. Launch the Meirei Web Terminal directly in your browser.",
      "2. View real-time tokenized equity pricing (AAPLx, NVDAx, MSFTx, GOOGLx).",
      "3. Execute mandates with live on-chain simulation and instant confirmation.",
      "4. Enjoy zero-gas sponsorship with non-custodial smart accounts.",
    ],
  },
};

function ConnectWalletContent() {
  const searchParams = useSearchParams();

  // Initial channel and handle resolution
  const initialChannelParam = (searchParams.get("channel") || "").toLowerCase() as SocialPlatform;
  const initialChannel: SocialPlatform = ["whatsapp", "telegram", "instagram", "web"].includes(
    initialChannelParam
  )
    ? initialChannelParam
    : "whatsapp";

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

  // Modal & Manual Link State
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
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
            "No Web3 wallet extension found. Please install a compatible Web3 wallet or enter your address manually."
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

  const handleManualLink = () => {
    const addr = manualAddress.trim().toLowerCase();
    if (!isValidEvmAddress(addr)) {
      setErrorMessage("Please enter a valid 42-character 0x EVM wallet address.");
      return;
    }

    setConnectedAddress(addr);
    setActiveWalletName("Manual Address");
    setShowManualInput(false);
    setShowWalletModal(false);
    setInfoMessage(`Configured address ${formatShortAddress(addr)} for OKX X Layer.`);
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

      setConnectedAddress(null);
      setCurrentChainId(null);
      setActiveWalletName(null);
      setLinkSuccess(false);
      setInfoMessage(`Wallet unlinked successfully from ${activeConfig.name}. Your channel has reverted to default sandbox address.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to disconnect: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkToChannel = async () => {
    if (!connectedAddress) {
      setErrorMessage("Please connect or enter a wallet address first.");
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
      const res = await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: selectedChannel,
          handle: effectiveHandle,
          walletAddress: connectedAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to persist wallet linkage.");
      }

      setLinkSuccess(true);
      setInfoMessage(
        `Wallet ${formatShortAddress(connectedAddress)} successfully anchored to your ${activeConfig.name} account.`
      );
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
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col items-center justify-center p-4 selection:bg-[#FF6B4E]/30 selection:text-white relative">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="transition hover:opacity-90">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-400 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            OKX X Layer (196)
          </div>
        </div>

        {/* Main Connect Card */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 backdrop-blur-xl shadow-2xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Connect & Manage Wallet
            </h1>
            <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
              Select your preferred social platform to interface with, then anchor your Web3
              wallet for autonomous execution on OKX X Layer.
            </p>
          </div>

          {/* Social Media Platform Selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Preferred Interface Platform
              </label>
              <span className="text-[11px] text-gray-500 font-mono">Select to switch</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(Object.keys(PLATFORM_CONFIGS) as SocialPlatform[]).map((platformId) => {
                const conf = PLATFORM_CONFIGS[platformId];
                const isSelected = selectedChannel === platformId;
                const LogoComponent = conf.logo;

                return (
                  <button
                    key={platformId}
                    type="button"
                    onClick={() => handleSelectPlatform(platformId)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2.5 cursor-pointer relative group ${
                      isSelected
                        ? `${conf.activeBg} ${conf.activeBorder} shadow-lg ${conf.activeGlow}`
                        : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`p-2 rounded-lg transition ${
                          isSelected
                            ? conf.activeBadge
                            : "bg-white/[0.04] text-gray-400 group-hover:text-white"
                        }`}
                      >
                        <LogoComponent className="w-4 h-4" />
                      </div>
                      {isSelected ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-white/10" />
                      )}
                    </div>

                    <div>
                      <div
                        className={`text-xs font-bold transition ${
                          isSelected ? "text-white" : "text-gray-300 group-hover:text-white"
                        }`}
                      >
                        {conf.name}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">
                        {conf.tagline}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Identifier Input */}
          <div className="mb-6 p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300">
                {activeConfig.handleLabel}
              </label>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                <ActiveLogo className="w-3.5 h-3.5 text-gray-400" />
                <span>{activeConfig.name}</span>
              </div>
            </div>

            <input
              type="text"
              value={channelHandle}
              onChange={(e) => setChannelHandle(e.target.value)}
              placeholder={activeConfig.handlePlaceholder}
              className="w-full py-2.5 px-3 rounded-lg bg-black/60 border border-white/[0.1] text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B4E] transition"
            />

            <p className="text-[11px] text-gray-500 leading-relaxed">
              {activeConfig.helperText}
            </p>
          </div>

          {infoMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 leading-relaxed flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300 leading-relaxed flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {linkSuccess ? (
            <div className="space-y-4">
              {/* Linked Confirmation Banner */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${activeConfig.activeBadge} border`}>
                    <ActiveLogo className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Wallet Successfully Linked to {activeConfig.name}
                    </div>
                    <div className="text-xs text-emerald-400/90 font-mono mt-0.5">
                      {effectiveHandle}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-300 leading-relaxed pt-1">
                  Your address{" "}
                  <span className="font-mono font-bold text-white">
                    {formatShortAddress(connectedAddress || "")}
                  </span>{" "}
                  ({activeWalletName || "Web3 Wallet"}) is now securely anchored to your{" "}
                  <span className="text-white font-medium">{activeConfig.name}</span> account on OKX X Layer.
                </div>
              </div>

              {/* Dynamic Next Steps */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-gray-300 space-y-2">
                <div className="font-semibold text-white flex items-center justify-between">
                  <span>Next Steps for {activeConfig.name}:</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Status: Ready</span>
                </div>
                {activeConfig.nextSteps.map((step, idx) => (
                  <p key={idx} className="text-gray-400 leading-relaxed">
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
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm text-center transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  <ActiveLogo className="w-4 h-4 text-white" />
                  <span>{activeConfig.returnCtaText}</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDisconnectWallet}
                    className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium text-center transition border border-red-500/25 cursor-pointer"
                  >
                    Disconnect & Unlink
                  </button>

                  <Link
                    href="/app"
                    className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-medium text-xs text-center transition border border-white/[0.08]"
                  >
                    Open Web Terminal
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account State Overview Card */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Target Channel:</span>
                  <div className="flex items-center gap-1.5 font-semibold text-white">
                    <ActiveLogo className="w-3.5 h-3.5" />
                    <span>{activeConfig.name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Account Handle:</span>
                  <span className="font-mono text-gray-200">{effectiveHandle}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Target Network:</span>
                  <span className="font-mono text-emerald-400">OKX X Layer (Chain 196)</span>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-white/[0.06] pt-3">
                  <span className="text-gray-400">Wallet Status:</span>
                  {connectedAddress ? (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-mono text-xs text-emerald-400 font-medium">
                        {activeWalletName || "Connected"} ({formatShortAddress(connectedAddress)})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-mono text-xs text-amber-400">Not Connected</span>
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
                    className="w-full py-3.5 px-4 rounded-xl bg-[#FF6B4E] hover:bg-[#FF5B3E] disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-[#FF6B4E]/25 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Connect Wallet</span>
                    <span className="text-xs opacity-80 font-normal">
                      (OKX, MetaMask, Coinbase...)
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(
                        typeof window !== "undefined"
                          ? window.location.href
                          : "https://meirei-rho.vercel.app/connect"
                      )}`}
                      className="py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 text-xs font-medium text-center transition border border-white/[0.06]"
                    >
                      Open in OKX App
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowManualInput(!showManualInput)}
                      className="py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 text-xs font-medium text-center transition border border-white/[0.06] cursor-pointer"
                    >
                      {showManualInput ? "Hide Manual" : "Paste Address"}
                    </button>
                  </div>

                  {/* Manual Address Input Tray */}
                  {showManualInput && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
                      <div className="text-[11px] text-gray-400">
                        Paste any public 0x EVM wallet address on OKX X Layer:
                      </div>
                      <input
                        type="text"
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        placeholder="0x7f17d6224e7d48606598732c3f511412b5c1e922"
                        className="w-full py-2 px-3 rounded-lg bg-black/60 border border-white/[0.1] text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B4E]"
                      />
                      <button
                        type="button"
                        onClick={handleManualLink}
                        className="w-full py-2 px-3 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-medium transition cursor-pointer"
                      >
                        Set Address
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleLinkToChannel}
                    disabled={isLinking}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
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
                      className="py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 text-xs font-medium text-center transition border border-white/[0.06] cursor-pointer"
                    >
                      Switch Wallet
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectWallet}
                      disabled={isLoading}
                      className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium text-center transition border border-red-500/25 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Security Note */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              100% Non-Custodial. Your private keys never leave your device. Every user
              channel has a separate, isolated database record on OKX X Layer Mainnet.
            </p>
          </div>
        </div>

        {/* Multi-Wallet Selection Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#0D1017] border border-white/[0.1] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">Select Web3 Wallet</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Choose your wallet on OKX X Layer</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWalletModal(false)}
                  className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
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
                    className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      wallet.id === "okx"
                        ? "bg-[#FF6B4E]/10 border-[#FF6B4E]/30 hover:bg-[#FF6B4E]/20"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          wallet.id === "okx"
                            ? "bg-[#FF6B4E] text-white"
                            : "bg-white/[0.08] text-gray-200"
                        }`}
                      >
                        {wallet.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-white">{wallet.name}</span>
                          {wallet.id === "okx" && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#FF6B4E]/20 text-[#FF6B4E]">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">{wallet.description}</div>
                      </div>
                    </div>
                    <div>
                      {wallet.isInstalled ? (
                        <span className="text-[11px] font-medium text-emerald-400 font-mono">
                          Ready
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-500 font-mono">
                          Select
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Mobile Deep Link */}
              <div className="pt-2 border-t border-white/[0.06]">
                <a
                  href={`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(
                    typeof window !== "undefined"
                      ? window.location.href
                      : "https://meirei-rho.vercel.app/connect"
                  )}`}
                  className="w-full block py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-center text-xs font-medium text-gray-300 transition"
                >
                  Open in OKX Mobile App
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Helper Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Project Meirei | Author: IboTV | OKX X Layer Mainnet
        </div>
      </div>
    </div>
  );
}

export default function ConnectWalletPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090E] text-white flex items-center justify-center">
          <div className="font-mono text-xs text-gray-400">Loading connection portal...</div>
        </div>
      }
    >
      <ConnectWalletContent />
    </Suspense>
  );
}
