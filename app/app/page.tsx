"use client";

import { useState, useRef, useEffect, useId, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BrandMark } from "@/components/ui/brand-mark";
import { STOCKS, type StockItem } from "@/components/interactive/stock_selector_grid";
import { cn } from "@/lib/utils/cn";
import { generateAdvisoryPlan, AdvisoryHorizon, RiskProfile, AdvisoryPlan } from "@/src/agent/advisor";
import { NewsCatalyst } from "@/app/api/news/route";
import { Web3SigningModal } from "@/components/wallet/web3_signing_modal";
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
import { SITE } from "@/lib/data/site";
import {
  WalletConnectModal,
  WalletConnectIcon,
} from "@/components/wallet/wallet_connect_modal";

type Platform = "whatsapp" | "telegram" | "instagram" | "web" | "okx_wallet";
type Mode = "simple" | "advanced";

// Simple Vector SVG Logos for Social Platforms
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

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  reference?: string;
  type?: string;
  status?: "preview" | "confirmed" | "failed" | "frozen" | "unfrozen";
  explorerUrl?: string;
}

interface UserProfile {
  email: string;
  platform: Platform;
  handle: string;
  address: string;
  twoFactorMethod: "email" | "passkey";
  botStatus: string;
  portfolioValue: number;
  usdgBalance: number;
  holdings: {
    symbol: string;
    amount: number;
    valueUsd: number;
    color: string;
  }[];
  activeMandates: {
    id: string;
    rule: string;
    status: "Active" | "Executing" | "Paused";
    frequency: string;
  }[];
}

const DEFAULT_PROFILE: UserProfile = {
  email: "alex.trader@meirei.app",
  platform: "whatsapp",
  handle: "+1 (555) 392 1084",
  address: "0x7f17d6224e7d48606598732c3f511412b5c1e922",
  twoFactorMethod: "email",
  botStatus: "Active on WhatsApp & Web",
  portfolioValue: 4850.0,
  usdgBalance: 1455.0,
  holdings: [
    { symbol: "NVDAx", amount: 9.07, valueUsd: 1940.0, color: "#76B900" },
    { symbol: "USDG", amount: 1455.0, valueUsd: 1455.0, color: "#0052FF" },
    { symbol: "AAPLx", amount: 2.92, valueUsd: 970.0, color: "#111111" },
    { symbol: "TSLAx", amount: 1.17, valueUsd: 485.0, color: "#E82127" },
  ],
  activeMandates: [
    {
      id: "m-1",
      rule: "Short Term Momentum: 35% NVDAx, 25% TSLAx, 15% METAx, 25% USDG",
      status: "Active",
      frequency: "7 day rebalance",
    },
    {
      id: "m-2",
      rule: "Long Term Core: 70% mag7, 30% USDG, max 15%, band 3%",
      status: "Active",
      frequency: "Quarterly rebalance",
    },
  ],
};

const SAMPLE_LOGINS = [
  {
    platform: "whatsapp" as Platform,
    handle: "+1 (555) 392 1084",
    email: "alex.whatsapp@meirei.app",
    label: "WhatsApp Bot User",
    address: "0x7f17d6224e7d48606598732c3f511412b5c1e922",
  },
  {
    platform: "telegram" as Platform,
    handle: "@alex_trader",
    email: "alex.telegram@meirei.app",
    label: "Telegram Bot User",
    address: "0x98f2b3149c95d9e5b8d21a221f7c35a821e3309a",
  },
  {
    platform: "web" as Platform,
    handle: "Web Browser Session",
    email: "web.trader@meirei.app",
    label: "Web Terminal User",
    address: "0x514910771af9ca656af840dff83e8264ecf986ca",
  },
  {
    platform: "instagram" as Platform,
    handle: "@jordan.trades",
    email: "jordan.ig@meirei.app",
    label: "Instagram DM User",
    address: "0x3a4b91287c889f3014e7a25591d839218ab44012",
  },
];

export default function AppDashboardPage() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Transparent Connect Portal state inside /app
  const [connectChannel, setConnectChannel] = useState<Platform>("whatsapp");
  const [connectHandle, setConnectHandle] = useState<string>(DEFAULT_PROFILE.handle);
  const [connectAddress, setConnectAddress] = useState<string | null>(DEFAULT_PROFILE.address);
  const [connectWalletName, setConnectWalletName] = useState<string | null>("OKX Wallet");
  const [isWalletConnecting, setIsWalletConnecting] = useState<boolean>(false);
  const [isChannelLinking, setIsChannelLinking] = useState<boolean>(false);
  const [connectSuccess, setConnectSuccess] = useState<boolean>(false);
  const [connectInfoMsg, setConnectInfoMsg] = useState<string | null>(null);
  const [connectErrorMsg, setConnectErrorMsg] = useState<string | null>(null);
  const [showWalletConnectModal, setShowWalletConnectModal] = useState<boolean>(false);
  const [availableConnectWallets, setAvailableConnectWallets] = useState<WalletOption[]>([]);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [isAccountFrozen, setIsAccountFrozen] = useState<boolean>(false);

  // Conversational Chat Console State (Just like Telegram and WhatsApp)
  const INITIAL_CHAT_MESSAGE: ChatMessage = {
    id: "welcome-1",
    sender: "bot",
    text: "Welcome to Meirei on OKX X Layer Mainnet. You can chat here just like on WhatsApp or Telegram (@MeireiXLayerBot).\n\nSend 'stocks' for 24/7 equity price quotes, 'balance' to view your wallet holdings, or type any trade like 'Buy 100 USDG NVDAx'.",
    timestamp: "Just now",
  };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INITIAL_CHAT_MESSAGE]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatSending, setIsChatSending] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Voice dictation microphone handler for Web Platform
  const handleVoiceDictation = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your message.");
      return;
    }

    if (isListeningVoice) {
      setIsListeningVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListeningVoice(true);
      };

      recognition.onresult = (event: any) => {
        const speechText = event.results?.[0]?.[0]?.transcript;
        if (speechText) {
          setChatInput(speechText);
          handleSendChatMessage(speechText);
        }
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognition.start();
    } catch (e) {
      console.warn("[Voice Dictation] Speech recognition error:", e);
      setIsListeningVoice(false);
    }
  };

  // Theme state: light / dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("meirei_theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldBeDark = stored === "dark" || (!stored && prefersDark);
      setIsDarkMode(shouldBeDark);
      document.documentElement.classList.toggle("dark", shouldBeDark);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("meirei_theme", next ? "dark" : "light");
      }
      return next;
    });
  };

  // Trading mode state: strictly TWO MODES: "simple" | "advanced"
  const [mode, setMode] = useState<Mode>("simple");

  // Stock selection & chart state
  const [selectedStock, setSelectedStock] = useState<StockItem>(STOCKS[0]);
  const [timeframe, setTimeframe] = useState<string>("1D");
  const [chartType, setChartType] = useState<"line" | "candle">("candle");
  const [chartHoverIndex, setChartHoverIndex] = useState<number | null>(null);
  const [candleHoverIndex, setCandleHoverIndex] = useState<number | null>(null);

  // Mandate chat prompt state
  const [promptText, setPromptText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [mandateResult, setMandateResult] = useState<{
    reply: string;
    type?: string;
    hash?: string;
    statusTone?: string;
  } | null>(null);

  // Simple Mode: Price Comparison & Units Calculator State
  const [calcInvestmentUsdg, setCalcInvestmentUsdg] = useState<number>(250);
  const [promptAssistantCategory, setPromptAssistantCategory] = useState<"trades" | "questions" | "rules">("trades");
  const [web3ModalState, setWeb3ModalState] = useState<{
    isOpen: boolean;
    targetSymbol: string;
    fromAmountUsdg: number;
    estimatedUnits: number;
    spotPrice: number;
  }>({
    isOpen: false,
    targetSymbol: "NVDAx",
    fromAmountUsdg: 250,
    estimatedUnits: 1.168,
    spotPrice: 213.9,
  });

  // Live stock prices and real-time tick flashes (15-second auto-refresh)
  const [stockPrices, setStockPrices] = useState<Record<string, number>>({});
  const [priceFlashes, setPriceFlashes] = useState<Record<string, "up" | "down">>({});
  const prevPricesRef = useRef<Record<string, number>>({});

  // Poll real-time stock prices from X Layer every 15 seconds
  useEffect(() => {
    let isMounted = true;
    let flashTimer: ReturnType<typeof setTimeout> | null = null;

    async function fetchLivePrices() {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "stocks" }),
        });
        const data = await res.json();
        if (isMounted && Array.isArray(data.stocks)) {
          const updatedPrices: Record<string, number> = {};
          const flashes: Record<string, "up" | "down"> = {};

          data.stocks.forEach((item: { symbol: string; priceUsd: number }) => {
            if (item.symbol && typeof item.priceUsd === "number" && item.priceUsd > 0) {
              updatedPrices[item.symbol] = item.priceUsd;
              const prev = prevPricesRef.current[item.symbol];
              if (prev !== undefined && prev !== item.priceUsd) {
                flashes[item.symbol] = item.priceUsd > prev ? "up" : "down";
              }
            }
          });

          prevPricesRef.current = { ...prevPricesRef.current, ...updatedPrices };
          setStockPrices((prev) => ({ ...prev, ...updatedPrices }));

          if (Object.keys(flashes).length > 0) {
            setPriceFlashes(flashes);
            if (flashTimer) clearTimeout(flashTimer);
            flashTimer = setTimeout(() => {
              if (isMounted) setPriceFlashes({});
            }, 1500);
          }
        }
      } catch (err) {
        console.warn("[LivePrices] Failed to refresh prices:", err);
      }
    }

    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (flashTimer) clearTimeout(flashTimer);
    };
  }, []);

  const openWeb3Signer = (
    targetSymbol: string,
    fromAmountUsdg: number,
    estimatedUnits: number,
    spotPrice: number
  ) => {
    setWeb3ModalState({
      isOpen: true,
      targetSymbol,
      fromAmountUsdg,
      estimatedUnits,
      spotPrice,
    });
  };

  // Advisory Agent parameters (Advanced Mode)
  const [advisoryHorizon, setAdvisoryHorizon] = useState<AdvisoryHorizon>("short_term");
  const [advisoryRisk, setAdvisoryRisk] = useState<RiskProfile>("balanced");
  const [advisoryCapital, setAdvisoryCapital] = useState<number>(2500);

  // Computed live advisory plan
  const currentAdvisoryPlan: AdvisoryPlan = useMemo(() => {
    return generateAdvisoryPlan({
      horizon: advisoryHorizon,
      riskProfile: advisoryRisk,
      capitalUsd: profile.portfolioValue || advisoryCapital,
    });
  }, [advisoryHorizon, advisoryRisk, profile.portfolioValue, advisoryCapital]);

  // Market News Catalyst Feed state (Advanced Mode)
  const [newsList, setNewsList] = useState<NewsCatalyst[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);

  // OTP 2FA Security Challenge state
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otpChallengeId, setOtpChallengeId] = useState<string>("");
  const [otpInput, setOtpInput] = useState<string>("");
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [pendingActionPrompt, setPendingActionPrompt] = useState<string | null>(null);

  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const chartGradId = useId();

  // Load live news feed on mount
  useEffect(() => {
    async function loadNews() {
      try {
        const res = await fetch("/api/news");
        const data = await res.json();
        if (data.ok && Array.isArray(data.catalysts)) {
          setNewsList(data.catalysts);
        }
      } catch (err) {
        console.warn("[News] Failed to load catalysts:", err);
      } finally {
        setIsLoadingNews(false);
      }
    }
    loadNews();
  }, []);

  // Pre-populate mandate prompt or stock selection from bot deep links (Telegram / WhatsApp)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mandateParam = params.get("mandate");
      const actionParam = params.get("action");
      const symbolParam = params.get("symbol");
      const amountParam = params.get("amount");

      if (mandateParam && mandateParam.trim()) {
        setPromptText(mandateParam.trim());
      } else if (actionParam === "buy" && symbolParam) {
        const amtStr = amountParam ? `$${amountParam} in ` : "";
        setPromptText(`Buy ${amtStr}${symbolParam}`);
      } else if (actionParam === "buy") {
        setPromptText("Buy $250 in NVDAx");
      }

      if (symbolParam) {
        const match = STOCKS.find(
          (s) =>
            s.symbol.toLowerCase() === symbolParam.toLowerCase() ||
            s.symbol.toLowerCase().replace(/x$/, "") === symbolParam.toLowerCase().replace(/x$/, "") ||
            s.name.toLowerCase() === symbolParam.toLowerCase()
        );
        if (match) setSelectedStock(match);
      }
    }
  }, []);

  // Initialize available Web3 wallets
  useEffect(() => {
    setAvailableConnectWallets(getAvailableWallets());
  }, []);

  // Auto-scroll conversational chat to newest message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatSending]);

  // Connect Web3 wallet directly on OKX X Layer
  const handleConnectWalletType = async (type: WalletType = "okx") => {
    if (type === "walletconnect") {
      setShowWalletConnectModal(true);
      return;
    }
    setIsWalletConnecting(true);
    setConnectErrorMsg(null);
    setConnectInfoMsg(null);

    try {
      const provider = getSpecificProvider(type);
      if (!provider) {
        throw new Error(
          type === "okx"
            ? "OKX Wallet extension not detected. Please install OKX Wallet from okx.com/web3."
            : `${type} extension not detected. Please install it or use another wallet.`
        );
      }

      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No account authorized by wallet.");
      }

      const activeAddr = accounts[0].toLowerCase();
      setConnectAddress(activeAddr);

      const title =
        type === "okx"
          ? "OKX Wallet"
          : type === "metamask"
          ? "MetaMask"
          : type === "coinbase"
          ? "Coinbase Wallet"
          : type === "trust"
          ? "Trust Wallet"
          : "Web3 Injected";
      setConnectWalletName(title);

      // Switch to X Layer (Chain ID 196)
      try {
        const rawChainId: string = await provider.request({ method: "eth_chainId" });
        const chainId = parseInt(rawChainId, 16);
        if (chainId !== XLAYER_CHAIN_ID_DECIMAL) {
          try {
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: XLAYER_CHAIN_ID_HEX }],
            });
          } catch (switchErr: any) {
            if (switchErr?.code === 4902) {
              await provider.request({
                method: "wallet_addEthereumChain",
                params: [XLAYER_NETWORK_PARAMS],
              });
            }
          }
        }
      } catch {}

      setConnectInfoMsg(`Connected ${title} (${formatShortAddress(activeAddr)}) on OKX X Layer.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConnectErrorMsg(msg);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  // Confirm channel linkage to isolated database record
  const handleConfirmChannelLink = async () => {
    if (!connectAddress) {
      setConnectErrorMsg("Please connect your Web3 wallet or use WalletConnect first.");
      return;
    }
    const effectiveHandle = connectHandle.trim() || "+234 902 827 9382";

    setIsChannelLinking(true);
    setConnectErrorMsg(null);
    setConnectInfoMsg(null);

    try {
      const res = await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: connectChannel,
          handle: effectiveHandle,
          walletAddress: connectAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to persist channel linkage.");
      }

      setProfile((prev) => ({
        ...prev,
        platform: connectChannel,
        handle: effectiveHandle,
        address: connectAddress,
        botStatus: `Active on ${connectChannel.toUpperCase()} & Web`,
      }));

      setConnectSuccess(true);
      setConnectInfoMsg(
        `Wallet ${formatShortAddress(connectAddress)} successfully anchored to ${connectChannel.toUpperCase()} (${effectiveHandle}).`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConnectErrorMsg(msg);
    } finally {
      setIsChannelLinking(false);
    }
  };

  // Disconnect & Unlink wallet
  const handleDisconnectChannelWallet = async () => {
    setIsWalletConnecting(true);
    setConnectErrorMsg(null);
    setConnectInfoMsg(null);

    try {
      await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: connectChannel,
          handle: connectHandle.trim(),
          action: "unlink",
        }),
      }).catch(() => {});

      setConnectAddress(null);
      setConnectWalletName(null);
      setConnectSuccess(false);

      setProfile((prev) => ({
        ...prev,
        address: "0x0000000000000000000000000000000000000000",
        handle: "Disconnected",
        botStatus: "Unlinked",
      }));

      setConnectInfoMsg("Wallet disconnected and unlinked successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConnectErrorMsg(`Failed to disconnect: ${msg}`);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  // Conversational Chat message sender (just like Telegram and WhatsApp)
  const handleSendChatMessage = async (textOverride?: string) => {
    const query = (textOverride || chatInput).trim();
    if (!query || isChatSending) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: now,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          walletAddress: profile.address,
          platform: profile.platform,
          chatHandle: profile.handle,
          email: profile.email,
          otpToken: otpToken || undefined,
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        data.message ||
        data.error ||
        data.detail ||
        "Message received and processed on X Layer.";

      if (data.type === "freeze" || (data.status && typeof data.status === "string" && data.status.toLowerCase().includes("frozen"))) {
        setIsAccountFrozen(true);
      } else if (data.type === "unfreeze" || (data.status && typeof data.status === "string" && data.status.toLowerCase().includes("active"))) {
        setIsAccountFrozen(false);
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        reference: data.receipt?.reference || data.delivery?.txs?.[0]?.hash || undefined,
        type: data.type,
        status: data.status,
        explorerUrl: data.delivery?.txs?.[0]?.hash
          ? `https://www.oklink.com/xlayer/tx/${data.delivery.txs[0].hash}`
          : undefined,
      };

      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: `Error connecting to Meirei chat service: ${msg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Initiates OTP challenge before executing on-chain trades
  const requestOtpForAction = async (promptToExecute: string) => {
    setPendingActionPrompt(promptToExecute);
    setOtpError(null);
    setOtpInput("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          email: profile.email,
          identifier: profile.address,
          purpose: "trade_authorization",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setOtpChallengeId(data.challengeId);
        setOtpDevCode(data.devCode || null);
        setShowOtpModal(true);
      } else {
        setMandateResult({
          reply: data.error || "Failed to initialize 2FA OTP security challenge.",
          type: "error",
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMandateResult({
        reply: `Network error initiating OTP security challenge: ${msg}`,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verifies the 6-digit OTP code and executes the pending action with authorization token
  const handleVerifyOtp = async () => {
    if (!otpChallengeId || otpInput.trim().length !== 6) {
      setOtpError("Please enter the complete 6-digit security code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          challengeId: otpChallengeId,
          code: otpInput.trim(),
        }),
      });
      const data = await res.json();

      if (res.ok && data.ok && data.otpToken) {
        setOtpToken(data.otpToken);
        setShowOtpModal(false);
        const promptToRun = pendingActionPrompt;
        setPendingActionPrompt(null);
        if (promptToRun) {
          await executeTradeWithToken(promptToRun, data.otpToken);
        }
      } else {
        setOtpError(data.error || "Invalid 6-digit code. Please check and retry.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setOtpError(`Verification network error: ${msg}`);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Submit trade or mandate via live /api/chat
  const handleSendPrompt = async (textToSend?: string) => {
    const query = (textToSend || promptText).trim();
    if (!query || isSubmitting) return;

    // Check if query is an execution confirmation and whether OTP token is present
    const lower = query.toLowerCase();
    const isExecutionIntent =
      lower === "yes" ||
      lower === "confirm" ||
      lower.startsWith("confirm") ||
      lower.startsWith("execute");

    if (isExecutionIntent && !otpToken) {
      await requestOtpForAction(query);
      return;
    }

    await executeTradeWithToken(query, otpToken);
  };

  const executeTradeWithToken = async (query: string, token: string | null) => {
    setIsSubmitting(true);
    setMandateResult(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          walletAddress: profile.address,
          platform: profile.platform,
          chatHandle: profile.handle,
          email: profile.email,
          otpToken: token || undefined,
        }),
      });

      const data = await res.json();

      if (data.type === "otp_required" || data.otpRequired) {
        await requestOtpForAction(query);
        return;
      }

      if (res.ok) {
        const returnedHash =
          data.receipt?.reference ||
          data.delivery?.txs?.[0]?.hash ||
          undefined;

        setMandateResult({
          reply: data.reply || "Mandate processed on X Layer.",
          type: data.type,
          hash: returnedHash,
          statusTone: data.receipt?.statusTone || (data.status === "confirmed" ? "confirmed" : undefined),
        });
      } else {
        setMandateResult({
          reply: data.error || data.detail || "Failed to process mandate.",
          type: "error",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMandateResult({
        reply: `Network error reaching X Layer mandate service: ${msg}`,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chart coordinate calculations (Line mode)
  const points = selectedStock.chartPoints || [100, 102, 101, 103, 104, 103.5, 105];
  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = maxVal - minVal || 1;

  const width = 640;
  const height = 180;
  const padY = 16;
  const chartHeight = height - padY * 2;

  const coords = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - padY - ((p - minVal) / range) * chartHeight;
    return { x, y, val: p };
  });

  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  // Candlestick OHLC calculation
  interface CandleBar {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    isBullish: boolean;
  }

  const candleBars: CandleBar[] = useMemo(() => {
    const rawPoints = selectedStock.chartPoints && selectedStock.chartPoints.length >= 4
      ? selectedStock.chartPoints
      : [211.2, 211.8, 212.5, 212.1, 213.4, 212.9, 214.2, 215.1, 214.6, 216.5, 215.8, 213.9];

    const livePrice = stockPrices[selectedStock.symbol];
    const baseMult = livePrice && rawPoints[rawPoints.length - 1] > 0
      ? livePrice / rawPoints[rawPoints.length - 1]
      : 1;

    const timestamps = [
      "09:30", "09:55", "10:20", "10:45",
      "11:10", "11:35", "12:00", "12:25",
      "12:50", "01:15", "01:40", "02:05",
      "02:30", "02:55", "03:20", "03:45",
    ];

    const bars: CandleBar[] = [];
    const totalBars = timestamps.length;

    for (let i = 0; i < totalBars; i++) {
      const pointPos = (i / (totalBars - 1)) * (rawPoints.length - 1);
      const lowIdx = Math.floor(pointPos);
      const highIdx = Math.min(rawPoints.length - 1, Math.ceil(pointPos));
      const frac = pointPos - lowIdx;
      const baseVal = (rawPoints[lowIdx] * (1 - frac) + rawPoints[highIdx] * frac) * baseMult;

      const seed = ((i + 1) * 37 + selectedStock.symbol.charCodeAt(0) * 17) % 100;
      const variance = (seed / 100 - 0.48) * (baseVal * 0.008);
      const spread = Math.max(0.2, (seed % 15) * 0.001 * baseVal + 0.15);

      const open = Number((baseVal - variance).toFixed(2));
      const close = Number((baseVal + variance).toFixed(2));
      const high = Number((Math.max(open, close) + spread).toFixed(2));
      const low = Number((Math.min(open, close) - spread).toFixed(2));

      bars.push({
        time: timestamps[i],
        open,
        high,
        low,
        close,
        isBullish: close >= open,
      });
    }
    return bars;
  }, [selectedStock, stockPrices]);

  const candleMin = Math.min(...candleBars.map((b) => b.low));
  const candleMax = Math.max(...candleBars.map((b) => b.high));
  const candleRange = candleMax - candleMin || 1;

  const getFormattedPrice = (stock: StockItem): string => {
    const live = stockPrices[stock.symbol];
    if (typeof live === "number" && live > 0) {
      return `$${live.toFixed(2)}`;
    }
    return stock.price;
  };

  const currentDisplayPrice =
    chartType === "candle" && candleHoverIndex !== null && candleBars[candleHoverIndex]
      ? `$${candleBars[candleHoverIndex].close.toFixed(2)}`
      : chartHoverIndex !== null && coords[chartHoverIndex]
      ? `$${coords[chartHoverIndex].val.toFixed(2)}`
      : getFormattedPrice(selectedStock);

  // Numerical price helper for price comparison & units calculator (using live ticks if available)
  const getNumericPrice = (stock: StockItem): number => {
    const live = stockPrices[stock.symbol];
    if (typeof live === "number" && live > 0) {
      return live;
    }
    const cleaned = parseFloat(stock.price.replace(/[^0-9.]/g, ""));
    return isNaN(cleaned) || cleaned <= 0 ? 1.0 : cleaned;
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-[#0B0E14] text-ink-900 dark:text-zinc-100 transition-colors">
      {/* Top Application Header */}
      <header className="sticky inset-x-0 top-0 z-40 border-b border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-[#0B0E14] transition-colors">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="meirei - home">
              <BrandMark />
            </Link>
            <div className="hidden h-5 w-px bg-surface-200 dark:bg-zinc-800 sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs font-semibold text-ink-700 dark:text-zinc-300">
                OKX Chain (X Layer 196)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Cookies Trigger (hidden on small mobile to conserve space) */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("meirei:open-cookies"));
                }
              }}
              aria-label="Manage Cookies"
              title="Manage Cookies"
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-zinc-200 hover:border-accent-500 hover:text-accent-600 dark:hover:text-accent-400 transition-colors cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Cookies</span>
            </button>

            {/* Dark / Light Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
              title={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
              className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] text-ink-900 dark:text-white hover:bg-surface-200 dark:hover:bg-[#202736] transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18V4c4.41 0 8 3.59 8 8s-3.59 8-8 8z" />
              </svg>
            </button>

            {/* OTP 2FA Protection Status Pill */}
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <span>{otpToken ? "2FA OTP Verified" : "2FA Protected"}</span>
            </div>

            {/* Account Status & Identity Badge (Optimized for mobile) */}
            {isLoggedIn ? (
              <div className="flex items-center gap-1.5 sm:gap-2.5 rounded-full border border-ink-200 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-1 sm:p-1.5 sm:pr-3.5 shadow-xs">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-accent-500 text-[10px] sm:text-xs font-bold text-white shadow-xs uppercase shrink-0">
                  {profile.platform === "whatsapp" && "WA"}
                  {profile.platform === "telegram" && "TG"}
                  {profile.platform === "instagram" && "IG"}
                  {profile.platform === "web" && "WEB"}
                  {profile.platform === "okx_wallet" && "OKX"}
                </div>
                <div className="text-left max-w-[70px] sm:max-w-none">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-ink-900 dark:text-white truncate">{profile.handle}</span>
                    <span className="hidden sm:inline-block rounded bg-emerald-100 dark:bg-emerald-950/80 dark:border dark:border-emerald-800 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 dark:text-emerald-300">
                      Non-Custodial
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-ink-500 dark:text-zinc-400 hidden sm:block">
                    {profile.email} · {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="rounded p-1 text-xs text-ink-400 hover:text-accent-600 dark:hover:text-accent-400 cursor-pointer"
                  title="Switch identity or channel"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                    <path d="M12 10v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v2h1V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2h-1z" />
                    <path d="M10.146 5.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L12.293 9H6.5a.5.5 0 0 1 0-1h5.793l-2.147-2.146a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfile({
                      ...DEFAULT_PROFILE,
                      handle: "Disconnected",
                      email: "disconnected@meirei.app",
                      address: "0x0000000000000000000000000000000000000000",
                      holdings: [],
                      portfolioValue: 0,
                    });
                  }}
                  className="rounded p-1 text-xs text-ink-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer"
                  title="Disconnect wallet"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current stroke-2 fill-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="rounded-full bg-accent-500 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-600 cursor-pointer"
              >
                Connect
              </button>
            )}

            <Link
              href="/"
              className="rounded-full border border-ink-200 dark:border-zinc-700 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium text-ink-700 dark:text-zinc-300 transition-colors hover:bg-surface-100 dark:hover:bg-[#161B26] dark:hover:text-white"
            >
              Overview
            </Link>
          </div>
        </div>
      </header>

      {/* Main Terminal Container */}
      <main className="mx-auto max-w-[1440px] px-3.5 py-4 sm:px-8 sm:py-6">
        {/* Terminal Subheader & CONSOLIDATED TWO-MODE SWITCHER */}
        <div className="mb-6 flex flex-col justify-between gap-3.5 sm:gap-4 rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-3.5 sm:p-5 shadow-xs sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold tracking-tight text-ink-900 dark:text-white sm:text-2xl">
                Trading &amp; Mandate Terminal
              </h1>
              <span className="rounded-full bg-surface-100 dark:bg-[#161B26] border border-ink-200 dark:border-zinc-700 px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-ink-600 dark:text-zinc-300">
                OKX Chain (X Layer)
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-600 dark:text-zinc-400 sm:text-sm">
              Strictly non-custodial: No private keys stored. Authenticated via verified Email &amp; 2FA on X Layer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* EXACTLY TWO MODES SWITCHER: Simple Mode vs Advanced Mode */}
            <div className="flex items-center gap-1.5 rounded-xl border border-ink-200 dark:border-zinc-700 bg-surface-100 dark:bg-[#161B26] p-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMode("simple")}
                className={cn(
                  "flex-1 sm:flex-initial text-center rounded-lg px-3 sm:px-4 py-2 text-xs font-bold transition-all cursor-pointer",
                  mode === "simple"
                    ? "bg-accent-500 text-white shadow-sm"
                    : "text-ink-600 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white"
                )}
              >
                Simple Mode
              </button>
              <button
                type="button"
                onClick={() => setMode("advanced")}
                className={cn(
                  "flex-1 sm:flex-initial text-center rounded-lg px-3 sm:px-4 py-2 text-xs font-bold transition-all cursor-pointer",
                  mode === "advanced"
                    ? "bg-ink-900 dark:bg-white text-white dark:text-ink-950 shadow-sm"
                    : "text-ink-600 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white"
                )}
              >
                Advanced Mode
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Interactive Stage (Cols 1 to 8) */}
          <div className="space-y-6 lg:col-span-8">
            {/* ========================================================================= */}
            {/* MODE 1: SIMPLE MODE (Clean, Fast Trades, Questions & Unit Comparisons)    */}
            {/* ========================================================================= */}
            {mode === "simple" && (
              <>
                {/* Channel & Bot Connectivity Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-4 text-xs shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300 font-bold">
                      {profile.platform === "whatsapp" && "WA"}
                      {profile.platform === "telegram" && "TG"}
                      {profile.platform === "instagram" && "IG"}
                      {profile.platform === "web" && "WEB"}
                      {profile.platform === "okx_wallet" && "OKX"}
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900 dark:text-white">
                        {profile.handle} · <span className="text-ink-500 dark:text-zinc-400">{profile.email}</span>
                      </p>
                      <p className="text-[11px] text-ink-500 dark:text-zinc-400">
                        Bot Active across WhatsApp, Telegram &amp; Web. Access your account from any device.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Gas 100% Sponsored by OKX Paymaster
                    </span>
                  </div>
                </div>

                {/* 8 Stocks Horizontal Selector Tabs */}
                <div className="rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-ink-900 dark:text-white">
                        Allowlisted xStocks (8 Assets on X Layer)
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Live 15s Feed</span>
                      </span>
                    </div>
                    <span className="text-xs text-ink-500 dark:text-zinc-400">
                      Select asset to inspect spot chart or calculate units
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {STOCKS.map((stock) => {
                      const isSelected = stock.symbol === selectedStock.symbol;
                      return (
                        <button
                          key={stock.symbol}
                          type="button"
                          onClick={() => {
                            setSelectedStock(stock);
                            setChartHoverIndex(null);
                          }}
                          className={cn(
                            "group flex items-center justify-between rounded-xl border p-2.5 text-left transition-all cursor-pointer",
                            isSelected
                              ? "border-accent-500 bg-accent-50/50 dark:bg-accent-950/40 shadow-xs ring-1 ring-accent-500"
                              : "border-ink-200/80 dark:border-zinc-800 bg-surface-50 dark:bg-[#161B26] hover:border-ink-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-[#202736]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-lg shadow-xs shrink-0"
                              style={{ backgroundColor: stock.color }}
                            >
                              {stock.logo}
                            </div>
                            <div>
                              <p className="font-mono text-xs font-bold text-ink-900 dark:text-white">
                                {stock.symbol}
                              </p>
                              <p className="text-[10px] text-ink-500 dark:text-zinc-400">{stock.name}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p
                              className={cn(
                                "font-mono text-xs font-semibold transition-colors duration-300",
                                priceFlashes[stock.symbol] === "up" && "text-emerald-600 dark:text-emerald-400 font-bold",
                                priceFlashes[stock.symbol] === "down" && "text-rose-600 dark:text-rose-400 font-bold",
                                !priceFlashes[stock.symbol] && "text-ink-900 dark:text-white"
                              )}
                            >
                              {getFormattedPrice(stock)}
                            </p>
                            <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                              {stock.change24h}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Chart Canvas Card */}
                <div className="rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-3.5 sm:p-5 shadow-xs">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl shadow-xs shrink-0"
                        style={{ backgroundColor: selectedStock.color }}
                      >
                        {selectedStock.logo}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-display text-base sm:text-lg font-bold text-ink-900 dark:text-white">
                            {selectedStock.name} ({selectedStock.symbol})
                          </h2>
                          <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            X Layer Live
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
                            {currentDisplayPrice}
                          </span>
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {selectedStock.change24h} past 24h
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Controls: Chart Type Toggle (Line | Candles) & Timeframe Selector */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Chart Type Toggle */}
                      <div className="flex items-center gap-1 rounded-xl border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setChartType("line");
                            setCandleHoverIndex(null);
                          }}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                            chartType === "line"
                              ? "bg-white dark:bg-[#11141D] text-ink-900 dark:text-white shadow-xs"
                              : "text-ink-500 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white"
                          )}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 11l4-5 3 3 5-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>Line</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChartType("candle");
                            setChartHoverIndex(null);
                          }}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                            chartType === "candle"
                              ? "bg-white dark:bg-[#11141D] text-ink-900 dark:text-white shadow-xs"
                              : "text-ink-500 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white"
                          )}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="3" y="4" width="3" height="7" rx="0.5" />
                            <line x1="4.5" y1="2" x2="4.5" y2="4" stroke="currentColor" strokeWidth="1.5" />
                            <line x1="4.5" y1="11" x2="4.5" y2="14" stroke="currentColor" strokeWidth="1.5" />
                            <rect x="10" y="6" width="3" height="6" rx="0.5" />
                            <line x1="11.5" y1="3" x2="11.5" y2="6" stroke="currentColor" strokeWidth="1.5" />
                            <line x1="11.5" y1="12" x2="11.5" y2="15" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                          <span>Candles</span>
                        </button>
                      </div>

                      {/* Timeframe Selector */}
                      <div className="flex items-center gap-1 rounded-xl border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] p-1">
                        {["1D", "1W", "1M", "1Y", "ALL"].map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => setTimeframe(tf)}
                            className={cn(
                              "rounded-lg px-2 sm:px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                              timeframe === tf
                                ? "bg-white dark:bg-[#11141D] text-ink-900 dark:text-white shadow-xs"
                                : "text-ink-500 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white"
                            )}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Candlestick OHLC Telemetry Bar (active in Candle mode) */}
                  {chartType === "candle" && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-xl bg-surface-50 dark:bg-[#161B26] border border-ink-100 dark:border-zinc-800 p-2.5 text-xs font-mono">
                      {(() => {
                        const activeBar =
                          candleHoverIndex !== null && candleBars[candleHoverIndex]
                            ? candleBars[candleHoverIndex]
                            : candleBars[candleBars.length - 1];
                        const barChange = ((activeBar.close - activeBar.open) / activeBar.open) * 100;
                        return (
                          <>
                            <div className="flex items-center justify-between sm:justify-start sm:gap-1.5 text-ink-500 dark:text-zinc-400">
                              <span>Time:</span>
                              <span className="font-bold text-ink-900 dark:text-white">{activeBar.time} EST</span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-start sm:gap-1.5 text-ink-500 dark:text-zinc-400">
                              <span>Open:</span>
                              <span className="font-bold text-ink-900 dark:text-white">${activeBar.open.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-start sm:gap-1.5 text-ink-500 dark:text-zinc-400">
                              <span>High:</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">${activeBar.high.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-start sm:gap-1.5 text-ink-500 dark:text-zinc-400">
                              <span>Low:</span>
                              <span className="font-bold text-rose-600 dark:text-rose-400">${activeBar.low.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-start sm:gap-1.5 col-span-2 sm:col-span-1 text-ink-500 dark:text-zinc-400">
                              <span>Close:</span>
                              <span
                                className={cn(
                                  "font-bold",
                                  activeBar.isBullish ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                )}
                              >
                                ${activeBar.close.toFixed(2)} ({barChange >= 0 ? "+" : ""}{barChange.toFixed(2)}%)
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* SVG Chart Canvas */}
                  <div className="relative mt-4">
                    <svg
                      ref={chartSvgRef}
                      viewBox={`0 0 ${width} ${height}`}
                      className="w-full h-[180px] sm:h-[210px] overflow-visible select-none touch-none"
                      onMouseLeave={() => {
                        setChartHoverIndex(null);
                        setCandleHoverIndex(null);
                      }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clientX = e.clientX - rect.left;
                        const ratio = Math.max(0, Math.min(1, clientX / rect.width));
                        if (chartType === "candle") {
                          const idx = Math.min(candleBars.length - 1, Math.floor(ratio * candleBars.length));
                          setCandleHoverIndex(idx);
                        } else {
                          const idx = Math.round(ratio * (points.length - 1));
                          setChartHoverIndex(idx);
                        }
                      }}
                      onTouchMove={(e) => {
                        if (e.touches && e.touches[0]) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clientX = e.touches[0].clientX - rect.left;
                          const ratio = Math.max(0, Math.min(1, clientX / rect.width));
                          if (chartType === "candle") {
                            const idx = Math.min(candleBars.length - 1, Math.floor(ratio * candleBars.length));
                            setCandleHoverIndex(idx);
                          } else {
                            const idx = Math.round(ratio * (points.length - 1));
                            setChartHoverIndex(idx);
                          }
                        }
                      }}
                      onTouchEnd={() => {
                        setChartHoverIndex(null);
                        setCandleHoverIndex(null);
                      }}
                    >
                      <defs>
                        <linearGradient id={chartGradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5B3E" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#FF5B3E" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Subtle grid lines */}
                      <line x1="0" y1={padY} x2={width} y2={padY} stroke="currentColor" className="text-ink-200/60 dark:text-zinc-800" strokeDasharray="3 3" />
                      <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" className="text-ink-200/60 dark:text-zinc-800" strokeDasharray="3 3" />
                      <line x1="0" y1={height - padY} x2={width} y2={height - padY} stroke="currentColor" className="text-ink-200/60 dark:text-zinc-800" strokeDasharray="3 3" />

                      {/* LINE CHART MODE */}
                      {chartType === "line" && (
                        <>
                          <path d={areaD} fill={`url(#${chartGradId})`} />
                          <path d={pathD} fill="none" stroke="#FF5B3E" strokeWidth="2.5" strokeLinecap="round" />
                          {chartHoverIndex !== null && coords[chartHoverIndex] && (
                            <g>
                              <line
                                x1={coords[chartHoverIndex].x}
                                y1={0}
                                x2={coords[chartHoverIndex].x}
                                y2={height}
                                stroke="#FF5B3E"
                                strokeWidth="1"
                                strokeDasharray="2 2"
                              />
                              <circle
                                cx={coords[chartHoverIndex].x}
                                cy={coords[chartHoverIndex].y}
                                r="5"
                                fill="#FFFFFF"
                                stroke="#FF5B3E"
                                strokeWidth="2.5"
                              />
                            </g>
                          )}
                        </>
                      )}

                      {/* CANDLESTICK CHART MODE */}
                      {chartType === "candle" && (
                        <g>
                          {candleBars.map((bar, idx) => {
                            const numBars = candleBars.length;
                            const barSpacing = width / numBars;
                            const barW = Math.max(12, barSpacing * 0.62);
                            const cx = (idx + 0.5) * barSpacing;
                            const wickY1 = height - padY - ((bar.high - candleMin) / candleRange) * chartHeight;
                            const wickY2 = height - padY - ((bar.low - candleMin) / candleRange) * chartHeight;
                            const openY = height - padY - ((bar.open - candleMin) / candleRange) * chartHeight;
                            const closeY = height - padY - ((bar.close - candleMin) / candleRange) * chartHeight;
                            const bodyTop = Math.min(openY, closeY);
                            const bodyH = Math.max(3, Math.abs(openY - closeY));
                            const isHovered = candleHoverIndex === idx;
                            const candleColor = bar.isBullish ? "#10B981" : "#F43F5E";

                            return (
                              <g key={`candle-${idx}`} className="transition-opacity">
                                {isHovered && (
                                  <rect
                                    x={cx - barSpacing / 2}
                                    y={0}
                                    width={barSpacing}
                                    height={height}
                                    fill="currentColor"
                                    className="text-accent-500/10 dark:text-white/[0.05]"
                                  />
                                )}
                                {/* Wick line */}
                                <line
                                  x1={cx}
                                  y1={wickY1}
                                  x2={cx}
                                  y2={wickY2}
                                  stroke={candleColor}
                                  strokeWidth={isHovered ? "2.2" : "1.5"}
                                />
                                {/* Candle body */}
                                <rect
                                  x={cx - barW / 2}
                                  y={bodyTop}
                                  width={barW}
                                  height={bodyH}
                                  rx="1.5"
                                  fill={candleColor}
                                  stroke={candleColor}
                                  strokeWidth="1"
                                />
                              </g>
                            );
                          })}
                        </g>
                      )}
                    </svg>

                    <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-400 dark:text-zinc-500">
                      <span>09:30 AM EST</span>
                      <span>12:00 PM EST</span>
                      <span>04:00 PM EST</span>
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* LIVE CONVERSATIONAL CHAT CONSOLE (WhatsApp & Telegram Experience)        */}
                {/* ========================================================================= */}
                <div id="conversational-chat" className="scroll-mt-24 rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-3.5 sm:p-5 shadow-xs">
                  {/* Chat Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 dark:border-zinc-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-white shadow-xs">
                          <SimpleTelegramLogo className="h-4 w-4" />
                        </div>
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#11141D]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                            Meirei Conversational Chat
                          </h3>
                          <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                            Online · OKX X Layer
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-500 dark:text-zinc-400">
                          Chat naturally just like on WhatsApp or Telegram (
                          <a
                            href="https://t.me/MeireiXLayerBot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-600 dark:text-accent-400 hover:underline font-semibold"
                          >
                            @MeireiXLayerBot
                          </a>
                          )
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChatMessages([INITIAL_CHAT_MESSAGE])}
                        className="rounded-lg border border-ink-200 dark:border-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-ink-600 dark:text-zinc-400 hover:bg-surface-50 dark:hover:bg-[#161B26] hover:text-ink-900 dark:hover:text-white cursor-pointer transition-colors"
                      >
                        Clear Chat
                      </button>
                    </div>
                  </div>

                  {/* Security Freeze Alert Banner */}
                  {isAccountFrozen && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold uppercase tracking-wider block text-[10px]">
                          Account Security Hold Active
                        </span>
                        <span>
                          Execution is paused. Send &apos;/unfreeze [OTP]&apos; or click below to restore.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendChatMessage("/unfreeze")}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        Unfreeze
                      </button>
                    </div>
                  )}

                  {/* Chat Messages Log */}
                  <div className="mt-3.5 max-h-[340px] min-h-[220px] overflow-y-auto space-y-3 pr-1">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col text-xs",
                          msg.sender === "user" ? "items-end" : "items-start"
                        )}
                      >
                        <div className="flex items-end gap-2 max-w-[88%]">
                          {msg.sender === "bot" && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400 shrink-0 text-[10px] font-bold">
                              M
                            </div>
                          )}
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2.5 leading-relaxed shadow-xs whitespace-pre-wrap",
                              msg.sender === "user"
                                ? "bg-accent-500 text-white rounded-br-none"
                                : "bg-surface-100 dark:bg-[#161B26] text-ink-800 dark:text-zinc-200 border border-ink-200/60 dark:border-zinc-800 rounded-bl-none"
                            )}
                          >
                            {msg.text}

                            {msg.reference && (
                              <div className="mt-2 pt-1.5 border-t border-white/10 dark:border-zinc-700/60 font-mono text-[10px] opacity-80">
                                Reference: {msg.reference}
                              </div>
                            )}

                            {/* Bot Interactive Action Buttons */}
                            {msg.sender === "bot" && (
                              <div className="mt-2.5 pt-2 border-t border-ink-200/50 dark:border-zinc-800 flex flex-wrap items-center gap-1.5">
                                {(msg.type === "execution_prompt" ||
                                  msg.type === "rebalance" ||
                                  msg.text.includes("Confirm Order")) && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleSendChatMessage("CONFIRM")}
                                      disabled={isChatSending}
                                      className="rounded-md bg-accent-500 hover:bg-accent-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition-colors cursor-pointer"
                                    >
                                      Confirm Order
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSendChatMessage("CANCEL")}
                                      disabled={isChatSending}
                                      className="rounded-md border border-ink-200 dark:border-zinc-700 px-2.5 py-1 text-[10px] font-semibold text-ink-600 dark:text-zinc-400 hover:bg-surface-50 dark:hover:bg-[#161B26] transition-colors cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}

                                {msg.explorerUrl ? (
                                  <a
                                    href={msg.explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-md border border-accent-500/30 bg-accent-500/10 px-2.5 py-1 text-[10px] font-semibold text-accent-600 dark:text-accent-400 hover:underline transition-colors"
                                  >
                                    View on OKLink
                                  </a>
                                ) : msg.reference && msg.reference.startsWith("0x") ? (
                                  <a
                                    href={`https://www.oklink.com/xlayer/tx/${msg.reference}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-md border border-accent-500/30 bg-accent-500/10 px-2.5 py-1 text-[10px] font-semibold text-accent-600 dark:text-accent-400 hover:underline transition-colors"
                                  >
                                    View on OKLink
                                  </a>
                                ) : null}

                                {msg.type === "freeze" && (
                                  <button
                                    type="button"
                                    onClick={() => handleSendChatMessage("/unfreeze")}
                                    disabled={isChatSending}
                                    className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                                  >
                                    Request OTP to Unfreeze
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="mt-1 font-mono text-[9px] text-ink-400 dark:text-zinc-500 px-1">
                          {msg.timestamp}
                        </span>
                      </div>
                    ))}

                    {isChatSending && (
                      <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-zinc-400">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400 shrink-0 text-[10px] font-bold">
                          M
                        </div>
                        <div className="rounded-2xl rounded-bl-none border border-ink-200/60 dark:border-zinc-800 bg-surface-100 dark:bg-[#161B26] px-3.5 py-2">
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-bounce" />
                            <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-bounce [animation-delay:0.15s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-bounce [animation-delay:0.3s]" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Quick Suggestion Chips matching Telegram and WhatsApp commands */}
                  <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    <span className="text-[10px] uppercase font-bold text-ink-400 dark:text-zinc-500 tracking-wider shrink-0 mr-1">
                      Quick:
                    </span>
                    {[
                      "/stocks",
                      "/balance",
                      `Buy 250 USDG of ${selectedStock.symbol}`,
                      `Compare ${selectedStock.symbol} vs MSFTx`,
                      `Calculate $250 in ${selectedStock.symbol}`,
                      "/deposit",
                      "/freeze",
                      "/help",
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleSendChatMessage(chip)}
                        disabled={isChatSending}
                        className="rounded-full border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] px-3 py-1 font-medium text-ink-700 dark:text-zinc-300 hover:border-accent-500 hover:text-accent-600 dark:hover:text-accent-400 whitespace-nowrap cursor-pointer transition-colors shrink-0"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Chat Input Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChatMessage();
                    }}
                    className="mt-2.5 flex items-center gap-2"
                  >
                    <input
                      id="conversational-chat-input"
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Message Meirei... (e.g. '/stocks', '/balance', 'Buy 250 USDG NVDAx', '/help')"
                      disabled={isChatSending}
                      className="flex-1 rounded-xl border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] px-4 py-2.5 text-xs text-ink-900 dark:text-white outline-none focus:border-accent-500 focus:bg-white dark:focus:bg-[#11141D] transition-colors"
                    />

                    {/* Voice Dictation Microphone Button */}
                    <button
                      type="button"
                      onClick={handleVoiceDictation}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0",
                        isListeningVoice
                          ? "bg-red-500 text-white border-red-600 animate-pulse"
                          : "border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] text-ink-600 dark:text-zinc-300 hover:text-accent-500 hover:border-accent-500"
                      )}
                      title={isListeningVoice ? "Listening... Click to stop" : "Voice input (dictate message)"}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                      </svg>
                    </button>

                    <button
                      type="submit"
                      disabled={isChatSending || !chatInput.trim()}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500 text-white shadow-xs transition-all hover:bg-accent-600 disabled:opacity-50 cursor-pointer shrink-0"
                      title="Send Message"
                    >
                      <SimpleTelegramLogo className="h-4 w-4" />
                    </button>
                  </form>
                </div>

                {/* 1-Sentence Natural Language Investment Mandate Console */}
                <div className="rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3">
                    <div>
                      <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                        1-Sentence Investment Mandate Console
                      </h3>
                      <p className="text-xs text-ink-500 dark:text-zinc-400">
                        Enter any trade, price comparison, or mandate in natural language. Powered by OKX Onchain OS.
                      </p>
                    </div>
                    <span className="rounded bg-surface-100 dark:bg-[#161B26] border border-ink-200 dark:border-zinc-700 px-2 py-0.5 font-mono text-[10px] text-ink-600 dark:text-zinc-300">
                      A2A Mandate Engine
                    </span>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendPrompt();
                    }}
                    className="relative"
                  >
                    <textarea
                      rows={2}
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder={`e.g. "Buy 250 USDG of ${selectedStock.symbol}", "Compare ${selectedStock.symbol} vs MSFTx", or "60% mag7, 20% USDG"`}
                      className="w-full resize-none rounded-xl border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] p-3.5 text-sm text-ink-900 dark:text-white outline-none focus:border-accent-500 focus:bg-white dark:focus:bg-[#11141D] focus:ring-1 focus:ring-accent-500"
                    />

                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting || !promptText.trim()}
                        className="rounded-xl bg-accent-500 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-accent-600 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? "Routing on X Layer..." : "Submit Mandate"}
                      </button>
                    </div>
                  </form>

                  {/* Loading State Feedback */}
                  {isSubmitting && !mandateResult && (
                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] p-4 text-xs">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent shrink-0" />
                      <div>
                        <p className="font-semibold text-ink-900 dark:text-white">Routing mandate through OKX DEX on X Layer...</p>
                        <p className="text-[11px] text-ink-500 dark:text-zinc-400">Checking price impact, spending limits, and non-custodial 2FA authorization.</p>
                      </div>
                    </div>
                  )}

                  {/* Result & Execution Feedback */}
                  {mandateResult && (
                    <div
                      className={cn(
                        "mt-4 rounded-xl border p-4 text-xs leading-relaxed",
                        mandateResult.type === "error"
                          ? "border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200"
                          : mandateResult.statusTone === "confirmed"
                          ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200"
                          : "border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] text-ink-800 dark:text-zinc-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-semibold">{mandateResult.reply}</p>
                          {mandateResult.hash && (
                            <p className="font-mono text-[11px] text-ink-600 dark:text-zinc-400">
                              Reference / Hash:{" "}
                              <span className="font-bold text-ink-900 dark:text-white">
                                {mandateResult.hash}
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {mandateResult.type === "error" && (
                            <button
                              type="button"
                              onClick={() => handleSendPrompt()}
                              className="rounded-lg bg-ink-900 dark:bg-white px-3 py-1.5 font-bold text-white dark:text-ink-950 shadow-xs hover:bg-ink-800 cursor-pointer"
                            >
                              Retry
                            </button>
                          )}

                          {mandateResult.type === "mandate" && !mandateResult.statusTone && (
                            <button
                              type="button"
                              onClick={() => handleSendPrompt("confirm")}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                            >
                              Confirm Trade
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Categorized Question & Prompt Library (Under One-Sentence Mandate) */}
                <div className="rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-5 shadow-xs">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center pb-3">
                    <div>
                      <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                        Interactive Prompt &amp; Question Assistant
                      </h3>
                      <p className="text-xs text-ink-500 dark:text-zinc-400">
                        Click any question or trade instruction below to instantly populate and run.
                      </p>
                    </div>

                    <div className="flex items-center gap-1 rounded-xl border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] p-1">
                      {(["trades", "questions", "rules"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPromptAssistantCategory(cat)}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all cursor-pointer",
                            promptAssistantCategory === cat
                              ? "bg-white dark:bg-[#11141D] text-ink-900 dark:text-white shadow-xs"
                              : "text-ink-500 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white"
                          )}
                        >
                          {cat === "trades" && "Quick Trades"}
                          {cat === "questions" && "Price & Units"}
                          {cat === "rules" && "Portfolio Rules"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {promptAssistantCategory === "trades" && (
                      <>
                        {[
                          `Buy 250 USDG of ${selectedStock.symbol}`,
                          `Buy 100 USDG of AAPLx`,
                          `Sell 1 TSLAx`,
                          `Exit 50% ${selectedStock.symbol} into USDG`,
                        ].map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => {
                              setPromptText(prompt);
                              handleSendPrompt(prompt);
                            }}
                            className="flex items-center justify-between rounded-xl border border-ink-200 dark:border-zinc-800 bg-surface-50 dark:bg-[#161B26] p-3 text-left text-xs font-medium text-ink-800 dark:text-zinc-200 transition-colors hover:border-accent-500 hover:bg-accent-50/50 dark:hover:bg-accent-950/30 hover:text-accent-900 dark:hover:text-accent-300 cursor-pointer"
                          >
                            <span>{prompt}</span>
                            <span className="font-mono text-[10px] text-accent-600 dark:text-accent-400 font-bold shrink-0">Execute ↗</span>
                          </button>
                        ))}
                      </>
                    )}

                    {promptAssistantCategory === "questions" && (
                      <>
                        {[
                          `How many units of ${selectedStock.symbol} for 250 USDG?`,
                          `Compare ${selectedStock.symbol} vs MSFTx spot price`,
                          "What is my current USDG balance and holdings?",
                          "Show my active mandates running on X Layer",
                        ].map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => {
                              setPromptText(prompt);
                              handleSendPrompt(prompt);
                            }}
                            className="flex items-center justify-between rounded-xl border border-ink-200 dark:border-zinc-800 bg-surface-50 dark:bg-[#161B26] p-3 text-left text-xs font-medium text-ink-800 dark:text-zinc-200 transition-colors hover:border-accent-500 hover:bg-accent-50/50 dark:hover:bg-accent-950/30 hover:text-accent-900 dark:hover:text-accent-300 cursor-pointer"
                          >
                            <span>{prompt}</span>
                            <span className="font-mono text-[10px] text-ink-500 dark:text-zinc-400 shrink-0">Ask AI ?</span>
                          </button>
                        ))}
                      </>
                    )}

                    {promptAssistantCategory === "rules" && (
                      <>
                        {[
                          "60% mag7, 20% USDG, max 8% single asset",
                          "DCA 50 USDG into NVDAx and MSFTx weekly",
                          "Rebalance portfolio when any stock drifts by 3%",
                          "Harvest profit if NVDAx gains exceed 15%",
                        ].map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => {
                              setPromptText(prompt);
                              handleSendPrompt(prompt);
                            }}
                            className="flex items-center justify-between rounded-xl border border-ink-200 dark:border-zinc-800 bg-surface-50 dark:bg-[#161B26] p-3 text-left text-xs font-medium text-ink-800 dark:text-zinc-200 transition-colors hover:border-accent-500 hover:bg-accent-50/50 dark:hover:bg-accent-950/30 hover:text-accent-900 dark:hover:text-accent-300 cursor-pointer"
                          >
                            <span>{prompt}</span>
                            <span className="font-mono text-[10px] text-ink-500 dark:text-zinc-400 shrink-0">Deploy Rule ↗</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Price Comparison & Units Calculator (Breaks complexity into simplicity) */}
                <div className="rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-5 shadow-xs">
                  <div className="flex flex-col justify-between gap-3 border-b border-ink-100 dark:border-zinc-800 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400">
                          Interactive Calculator
                        </span>
                        <span className="rounded bg-emerald-100 dark:bg-emerald-950/80 dark:border dark:border-emerald-800 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 dark:text-emerald-300">
                          Zero Math Required
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-ink-900 dark:text-white sm:text-lg">
                        Price Comparison &amp; Units Calculator
                      </h3>
                      <p className="text-xs text-ink-500 dark:text-zinc-400">
                        See exactly how many units your USDG buys across every allowlisted stock on X Layer.
                      </p>
                    </div>

                    {/* Capital Preset Selectors */}
                    <div className="flex items-center gap-1.5">
                      {[100, 250, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCalcInvestmentUsdg(amt)}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                            calcInvestmentUsdg === amt
                              ? "bg-accent-500 text-white shadow-xs"
                              : "border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] text-ink-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-[#202736]"
                          )}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculator Comparison Table */}
                  <div className="mt-4 overflow-x-auto rounded-xl border border-ink-200 dark:border-zinc-800">
                    <table className="w-full min-w-[580px] text-left text-xs">
                      <thead className="border-b border-ink-200 dark:border-zinc-800 bg-surface-100 dark:bg-[#161B26] font-semibold text-ink-900 dark:text-white">
                        <tr>
                          <th className="p-3">Asset</th>
                          <th className="p-3">Spot Price</th>
                          <th className="p-3 font-mono">${calcInvestmentUsdg} USDG Buys</th>
                          <th className="p-3 text-right">Instant Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-200/60 dark:divide-zinc-800 bg-white dark:bg-[#11141D] text-ink-700 dark:text-zinc-300">
                        {STOCKS.map((stk) => {
                          const priceNum = getNumericPrice(stk);
                          const units = (calcInvestmentUsdg / priceNum).toFixed(3);

                          return (
                            <tr
                              key={stk.symbol}
                              className={cn(
                                "transition-colors hover:bg-surface-50 dark:hover:bg-[#161B26]",
                                stk.symbol === selectedStock.symbol ? "bg-accent-50/30 dark:bg-accent-950/20" : ""
                              )}
                            >
                              <td className="p-3 font-semibold text-ink-900 dark:text-white">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="flex h-6 w-6 items-center justify-center rounded shadow-xs shrink-0"
                                    style={{ backgroundColor: stk.color }}
                                  >
                                    {stk.logo}
                                  </div>
                                  <div>
                                    <span className="font-mono font-bold">{stk.symbol}</span>
                                    <span className="ml-1.5 text-[11px] text-ink-500 dark:text-zinc-400">({stk.name})</span>
                                  </div>
                                </div>
                              </td>
                              <td
                                className={cn(
                                  "p-3 font-mono font-semibold transition-colors duration-300",
                                  priceFlashes[stk.symbol] === "up" && "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold",
                                  priceFlashes[stk.symbol] === "down" && "text-rose-600 dark:text-rose-400 bg-rose-500/10 font-bold",
                                  !priceFlashes[stk.symbol] && "text-ink-900 dark:text-white"
                                )}
                              >
                                {getFormattedPrice(stk)}
                              </td>
                              <td className="p-3 font-mono font-bold text-accent-700 dark:text-accent-400 text-sm">
                                {units} units
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStock(stk);
                                      const actionText = `Buy ${calcInvestmentUsdg} USDG of ${stk.symbol}`;
                                      setPromptText(actionText);
                                      handleSendPrompt(actionText);
                                    }}
                                    className="rounded-lg bg-ink-900 dark:bg-white dark:text-ink-950 px-3 py-1 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-accent-500 hover:text-white cursor-pointer"
                                  >
                                    Quick Buy
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ========================================================================= */}
            {/* MODE 2: ADVANCED MODE (Unified AI Mandate Advisory & Market Catalysts)     */}
            {/* ========================================================================= */}
            {mode === "advanced" && (
              <div className="space-y-6">
                {/* 1. Institutional AI Mandate Advisory Studio */}
                <div className="rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-5 shadow-xs sm:p-6">
                  <div className="flex flex-col justify-between gap-3 border-b border-ink-100 dark:border-zinc-800 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400">
                        Institutional Advisory Studio
                      </span>
                      <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white sm:text-xl">
                        AI Trading Advisory Agent
                      </h2>
                    </div>

                    {/* Horizon Selector */}
                    <div className="flex items-center gap-1 rounded-xl border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] p-1">
                      <button
                        type="button"
                        onClick={() => setAdvisoryHorizon("short_term")}
                        className={cn(
                          "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                          advisoryHorizon === "short_term"
                            ? "bg-white dark:bg-[#11141D] text-ink-900 dark:text-white shadow-xs"
                            : "text-ink-500 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white"
                        )}
                      >
                        Short-Term Momentum
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdvisoryHorizon("long_term")}
                        className={cn(
                          "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                          advisoryHorizon === "long_term"
                            ? "bg-white dark:bg-[#11141D] text-ink-900 dark:text-white shadow-xs"
                            : "text-ink-500 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white"
                        )}
                      >
                        Long-Term Blue Chip DCA
                      </button>
                    </div>
                  </div>

                  {/* Risk Profile Selection Bar */}
                  <div className="mt-5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-zinc-400">
                      Select Investment Risk Profile
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2.5">
                      {(["conservative", "balanced", "aggressive"] as RiskProfile[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAdvisoryRisk(r)}
                          className={cn(
                            "rounded-xl border p-3 text-left transition-all cursor-pointer",
                            advisoryRisk === r
                              ? "border-accent-500 bg-accent-50/60 dark:bg-accent-950/40 ring-1 ring-accent-500"
                              : "border-ink-200 dark:border-zinc-800 bg-surface-50 dark:bg-[#161B26] hover:bg-white dark:hover:bg-[#202736]"
                          )}
                        >
                          <p className="font-display text-xs font-bold capitalize text-ink-900 dark:text-white">{r}</p>
                          <p className="mt-0.5 text-[10px] text-ink-500 dark:text-zinc-400">
                            {r === "conservative" && "Capital Preservation"}
                            {r === "balanced" && "Strategic Growth"}
                            {r === "aggressive" && "Alpha Acceleration"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Plan Breakdown Card */}
                  <div className="mt-5 rounded-2xl border border-ink-200 dark:border-zinc-800 bg-surface-50/60 dark:bg-[#161B26] p-4 sm:p-5">
                    <div className="flex flex-col justify-between gap-2 border-b border-ink-200/80 dark:border-zinc-800 pb-3.5 sm:flex-row sm:items-center">
                      <div>
                        <span className="rounded bg-accent-100 dark:bg-accent-950/70 border border-transparent dark:border-accent-800/40 px-2 py-0.5 text-[10px] font-bold text-accent-800 dark:text-accent-300 uppercase">
                          {currentAdvisoryPlan.horizonLabel}
                        </span>
                        <h3 className="mt-1 font-display text-base font-bold text-ink-900 dark:text-white">
                          {currentAdvisoryPlan.strategyName}
                        </h3>
                      </div>
                      <span className="rounded-full bg-surface-200 dark:bg-[#11141D] border border-transparent dark:border-zinc-800 px-3 py-1 font-mono text-xs font-semibold text-ink-800 dark:text-zinc-200">
                        {currentAdvisoryPlan.expectedVolatility}
                      </span>
                    </div>

                    {/* Rationale & Thesis */}
                    <div className="mt-3.5">
                      <p className="text-xs leading-relaxed text-ink-700 dark:text-zinc-300">
                        <strong className="text-ink-900 dark:text-white">AI Strategic Thesis: </strong>
                        {currentAdvisoryPlan.thesis}
                      </p>
                    </div>

                    {/* Target Allocation Weights List */}
                    <div className="mt-4 space-y-2.5">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-zinc-400">
                        Target Asset Weights &amp; Allocation Rationale
                      </h4>

                      <div className="space-y-2">
                        {currentAdvisoryPlan.allocations.map((alloc) => (
                          <div
                            key={alloc.symbol}
                            className="rounded-xl border border-ink-200/70 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-3 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-ink-900 dark:text-white">
                                  {alloc.symbol}
                                </span>
                                <span className="rounded bg-surface-100 dark:bg-[#161B26] border border-transparent dark:border-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-ink-600 dark:text-zinc-300">
                                  {alloc.role}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-accent-700 dark:text-accent-400">
                                {alloc.weightPercent}%
                              </span>
                            </div>

                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-[#161B26]">
                              <div
                                className="h-full bg-accent-500"
                                style={{ width: `${alloc.weightPercent}%` }}
                              />
                            </div>

                            <p className="mt-1.5 text-[11px] text-ink-500 dark:text-zinc-400 leading-normal">
                              {alloc.rationale}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operational Guardrails */}
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-200/80 dark:border-zinc-800 pt-3.5 text-xs">
                      <div>
                        <span className="text-ink-500 dark:text-zinc-400">Rebalance Interval:</span>
                        <p className="font-semibold text-ink-900 dark:text-white">
                          {currentAdvisoryPlan.rebalanceInterval}
                        </p>
                      </div>
                      <div>
                        <span className="text-ink-500 dark:text-zinc-400">Downside Safeguard:</span>
                        <p className="font-semibold text-ink-900 dark:text-white">
                          {currentAdvisoryPlan.downsideProtection}
                        </p>
                      </div>
                    </div>

                    {/* Deploy Mandate CTA */}
                    <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-xl bg-ink-900 dark:bg-[#0B0E14] border border-transparent dark:border-zinc-800 p-4 text-white sm:flex-row">
                      <div>
                        <p className="text-xs font-medium text-ink-300 dark:text-zinc-400">Executable Mandate Rule</p>
                        <p className="font-mono text-xs font-bold text-white">
                          {currentAdvisoryPlan.mandateRule}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPromptText(currentAdvisoryPlan.mandateRule);
                            setMode("simple");
                            handleSendPrompt(currentAdvisoryPlan.mandateRule);
                          }}
                          className="rounded-xl bg-ink-800 dark:bg-[#161B26] border border-transparent dark:border-zinc-700 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          Review in Console
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const firstAlloc = currentAdvisoryPlan.allocations[0];
                            const sym = firstAlloc?.symbol || "NVDAx";
                            const amt = (advisoryCapital * (firstAlloc?.weightPercent || 35)) / 100;
                            openWeb3Signer(sym, amt, amt / 213.9, 213.9);
                          }}
                          className="rounded-xl bg-accent-500 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          Sign in OKX Wallet
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Market Catalysts, News & Investor Sentiment Feed (Rendered Directly Beneath Advisory) */}
                <div className="rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-5 shadow-xs sm:p-6">
                  <div className="flex items-center justify-between border-b border-ink-100 dark:border-zinc-800 pb-4">
                    <div>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400">
                        Live Market Intelligence &amp; Investor Sentiment
                      </span>
                      <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white sm:text-xl">
                        Market Catalysts &amp; Investor Consensus
                      </h2>
                    </div>
                    <span className="rounded-full bg-surface-100 dark:bg-[#161B26] border border-transparent dark:border-zinc-800 px-3 py-1 text-xs font-medium text-ink-600 dark:text-zinc-300">
                      Live On-Chain Feed
                    </span>
                  </div>

                  {isLoadingNews ? (
                    <div className="py-12 text-center text-xs text-ink-500 dark:text-zinc-400">
                      Loading real-time market catalysts from X Layer onchain feed...
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {newsList.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-surface-50/50 dark:bg-[#161B26] p-4 transition-all hover:bg-white dark:hover:bg-[#1c2230] hover:shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-ink-900 dark:bg-[#0B0E14] border border-transparent dark:border-zinc-700 px-2 py-0.5 font-mono text-xs font-bold text-white">
                                {item.ticker}
                              </span>
                              <span className="text-xs font-semibold text-ink-600 dark:text-zinc-300">
                                {item.category}
                              </span>
                              <span className="text-ink-400 dark:text-zinc-600">·</span>
                              <span className="text-[11px] text-ink-400 dark:text-zinc-400">{item.timestamp}</span>
                            </div>

                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                                item.impact === "Bullish"
                                  ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-800/40"
                                  : item.impact === "Bearish"
                                  ? "bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border border-transparent dark:border-red-800/40"
                                  : "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-transparent dark:border-amber-800/40"
                              )}
                            >
                              {item.impact}
                            </span>
                          </div>

                          <h3 className="mt-2 font-display text-sm font-bold leading-snug text-ink-900 dark:text-white">
                            {item.headline}
                          </h3>
                          <p className="mt-1 text-xs text-ink-600 dark:text-zinc-300 leading-relaxed">
                            {item.summary}
                          </p>

                          {/* What Investors Think So Far & Market Effect */}
                          <div className="mt-3 space-y-2 rounded-xl border border-ink-200/70 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-3 text-xs">
                            <p className="text-ink-800 dark:text-zinc-200 leading-relaxed">
                              <strong className="text-ink-900 dark:text-white">What Investors Think So Far: </strong>
                              {item.impact === "Bullish"
                                ? "Institutional accumulation detected; retail sentiment strongly positive with surging call options activity."
                                : item.impact === "Bearish"
                                ? "Defensive rebalancing observed; traders hedging downside risk with automated stop loss triggers."
                                : "Balanced consolidation; market awaiting further macro economic and earnings guidance."}
                            </p>
                            <p className="text-ink-800 dark:text-zinc-200 leading-relaxed border-t border-ink-100 dark:border-zinc-800 pt-2">
                              <strong className="text-accent-600 dark:text-accent-400">Market Effect on X Layer: </strong>
                              {item.marketEffectAnalysis}
                            </p>
                          </div>

                          {/* Quick Trade Action */}
                          <div className="mt-3.5 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const stockMatch = STOCKS.find((s) => s.symbol === item.ticker);
                                if (stockMatch) setSelectedStock(stockMatch);
                                setPromptText(item.suggestedAction.tradePrompt);
                                setMode("simple");
                                handleSendPrompt(item.suggestedAction.tradePrompt);
                              }}
                              className="rounded-lg bg-ink-900 dark:bg-[#0B0E14] border border-transparent dark:border-zinc-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-accent-600 cursor-pointer"
                            >
                              Trade on Catalyst: {item.suggestedAction.label}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Portfolio Summary & Identity (Cols 9 to 12) */}
          <div className="space-y-6 lg:col-span-4">
            {/* Account Identity Box */}
            <div className="rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-ink-100 dark:border-zinc-800 pb-3">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-zinc-400">
                  Account Identity
                </span>
                <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 border border-transparent dark:border-emerald-800/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  Non-Custodial
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-600 dark:text-zinc-400">Universal Signature:</span>
                  <span className="font-semibold text-ink-900 dark:text-white">{profile.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600 dark:text-zinc-400">Connected Channel:</span>
                  <span className="font-semibold text-ink-900 dark:text-white capitalize">
                    {profile.platform} ({profile.handle})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600 dark:text-zinc-400">X Layer Smart Wallet:</span>
                  <span className="font-mono text-[11px] text-accent-700 dark:text-accent-400">
                    {profile.address.slice(0, 8)}...{profile.address.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600 dark:text-zinc-400">Security Gate:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">2FA OTP Protected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600 dark:text-zinc-400">Private Keys:</span>
                  <span className="font-semibold text-ink-700 dark:text-zinc-300">Never Stored in Database</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600 dark:text-zinc-400">Gas Sponsorship:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">100% Covered by OKX</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="w-full rounded-xl border border-ink-200 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] py-2 text-center text-xs font-semibold text-ink-800 dark:text-zinc-200 transition-colors hover:bg-surface-100 dark:hover:bg-[#202736] cursor-pointer"
                >
                  Manage Channels
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfile({
                      ...DEFAULT_PROFILE,
                      handle: "Disconnected",
                      email: "disconnected@meirei.app",
                      address: "0x0000000000000000000000000000000000000000",
                      holdings: [],
                      portfolioValue: 0,
                    });
                  }}
                  className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-2 text-center text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Live Portfolio Breakdown Card */}
            <div className="rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-ink-100 dark:border-zinc-800 pb-3">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-zinc-400">
                  Portfolio Value
                </span>
                <span className="font-mono text-xs text-ink-400 dark:text-zinc-500">Live USDG</span>
              </div>

              <div className="mt-3">
                <p className="font-mono text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
                  ${profile.portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                  +4.18% past 7 days across allowlisted equities
                </p>

                {/* Spending Cap Telemetry */}
                <div className="mt-3 flex items-center justify-between border-t border-ink-100 dark:border-zinc-800 pt-2 text-[11px] text-ink-500 dark:text-zinc-400">
                  <span>Daily Spending Cap:</span>
                  <span className="font-mono font-semibold text-ink-800 dark:text-zinc-200">$0.00 / $25,000 USDG</span>
                </div>
              </div>

              {profile.holdings.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-ink-200 dark:border-zinc-800 bg-surface-50 dark:bg-[#161B26] p-4 text-center">
                  <p className="text-xs font-semibold text-ink-800 dark:text-zinc-200">No active stock holdings</p>
                  <p className="mt-1 text-[11px] text-ink-500 dark:text-zinc-400 leading-relaxed">
                    This wallet currently holds no tokenized equities on X Layer (chain 196). Submit an investment mandate or a direct trade to begin.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPromptText("Buy 100 USDG of NVDAx");
                      setMode("simple");
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-900 dark:bg-white px-3.5 py-1.5 text-[11px] font-bold text-white dark:text-ink-900 shadow-xs hover:bg-ink-800 dark:hover:bg-zinc-200 cursor-pointer"
                  >
                    <span>Try Sample Trade</span>
                    <span>↗</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Progress Bar Breakdown */}
                  <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-[#161B26]">
                    {profile.holdings.map((h) => {
                      const pct = (h.valueUsd / (profile.portfolioValue || 1)) * 100;
                      return (
                        <div
                          key={h.symbol}
                          style={{ width: `${pct}%`, backgroundColor: h.color }}
                          title={`${h.symbol}: ${pct.toFixed(1)}%`}
                        />
                      );
                    })}
                  </div>

                  {/* Holdings List */}
                  <div className="mt-4 space-y-2 text-xs">
                    {profile.holdings.map((h) => (
                      <div
                        key={h.symbol}
                        className="flex items-center justify-between rounded-lg border border-ink-100 dark:border-zinc-800 bg-surface-50 dark:bg-[#161B26] px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: h.color }}
                          />
                          <span className="font-bold text-ink-900 dark:text-white">{h.symbol}</span>
                          <span className="text-[10px] text-ink-500 dark:text-zinc-400">
                            {h.amount.toFixed(2)} units
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-ink-900 dark:text-white">
                          ${h.valueUsd.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Active Mandates on Chain 196 */}
            <div className="rounded-2xl border border-ink-200/80 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-ink-100 dark:border-zinc-800 pb-3">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-zinc-400">
                  Active Mandates
                </span>
                <span className="rounded bg-accent-50 dark:bg-accent-950/60 border border-transparent dark:border-accent-800/40 px-2 py-0.5 text-[10px] font-bold text-accent-700 dark:text-accent-300">
                  {profile.activeMandates.length} Running
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5">
                {profile.activeMandates.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-ink-100 dark:border-zinc-800 bg-surface-50 dark:bg-[#161B26] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-900 dark:text-white">{m.status}</span>
                      <span className="font-mono text-[10px] text-ink-500 dark:text-zinc-400">{m.frequency}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-700 dark:text-zinc-300">
                      {m.rule}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Terminal Footer with Cookie Controls, Privacy, and System Status */}
      <footer className="mt-12 border-t border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-[#0B0E14] py-8 text-xs text-ink-600 dark:text-zinc-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <span className="font-display font-bold text-ink-900 dark:text-white">Meirei Terminal</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                OKX X Layer (Chain 196) Mainnet
              </span>
              <span>·</span>
              <span className="text-[11px] text-ink-500 dark:text-zinc-400">Author: IboTV</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
              <Link
                href="/cookies"
                className="text-ink-600 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white transition-colors"
              >
                Cookie Policy
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("meirei:open-cookies"));
                    window.dispatchEvent(new Event("open-cookie-banner"));
                  }
                }}
                className="text-accent-600 dark:text-accent-400 hover:underline cursor-pointer font-semibold"
              >
                Cookie Preferences
              </button>
              <Link
                href="/privacy"
                className="text-ink-600 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-ink-600 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/whitepaper"
                className="text-ink-600 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white transition-colors"
              >
                Whitepaper
              </Link>
              <Link
                href="/docs"
                className="text-ink-600 dark:text-zinc-400 hover:text-ink-900 dark:hover:text-white transition-colors"
              >
                Docs
              </Link>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-surface-200/60 dark:border-zinc-800/60 text-[11px] text-ink-400 dark:text-zinc-400 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p>Non-custodial algorithmic order routing. Smart contract execution via OKX Onchain OS.</p>
            <p className="font-mono text-[10px]">Zero Third-Party Advertising Trackers</p>
          </div>
        </div>
      </footer>

      {/* Transparent Non-Custodial Multi-Channel Connect Portal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-white/[0.12] bg-[#07090E]/90 p-6 shadow-2xl backdrop-blur-2xl text-white relative selection:bg-[#FF6B4E]/30"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-400">
                    OKX X Layer (Chain 196)
                  </span>
                  <h3 className="font-display text-lg font-bold text-white">
                    Connect &amp; Manage Wallet
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-white/[0.08] hover:text-white cursor-pointer transition-colors"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 stroke-current stroke-2 fill-none">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs text-gray-300">
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  Select your preferred social platform to interface with, then anchor your Web3
                  wallet for autonomous execution on OKX X Layer.
                </p>

                {/* 4 Social Platforms */}
                <div>
                  <label className="font-bold text-white uppercase text-[10px] tracking-wider mb-2 block">
                    Preferred Interface Platform
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      {
                        id: "whatsapp" as Platform,
                        name: "WhatsApp",
                        icon: SimpleWhatsAppLogo,
                        color: "text-emerald-400",
                        border: "border-emerald-500",
                        bg: "bg-emerald-500/10",
                        tagline: "Messaging Bot",
                      },
                      {
                        id: "telegram" as Platform,
                        name: "Telegram",
                        icon: SimpleTelegramLogo,
                        color: "text-sky-400",
                        border: "border-sky-500",
                        bg: "bg-sky-500/10",
                        tagline: "Direct Bot",
                      },
                      {
                        id: "instagram" as Platform,
                        name: "Instagram",
                        icon: SimpleInstagramLogo,
                        color: "text-pink-400",
                        border: "border-pink-500",
                        bg: "bg-pink-500/10",
                        tagline: "DM Assistant",
                      },
                      {
                        id: "web" as Platform,
                        name: "Web Platform",
                        icon: SimpleWebLogo,
                        color: "text-[#FF6B4E]",
                        border: "border-[#FF6B4E]",
                        bg: "bg-[#FF6B4E]/10",
                        tagline: "Browser Console",
                      },
                    ].map((p) => {
                      const isSelected = connectChannel === p.id;
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setConnectChannel(p.id);
                            if (p.id === "whatsapp" && (!connectHandle || connectHandle.includes("@"))) {
                              setConnectHandle("+234 902 827 9382");
                            } else if (p.id === "telegram" && (!connectHandle || connectHandle.includes("+"))) {
                              setConnectHandle("@MeireiXLayerBot");
                            } else if (p.id === "instagram" && (!connectHandle || connectHandle.includes("+"))) {
                              setConnectHandle("@meirei_investor");
                            } else if (p.id === "web" && (!connectHandle || connectHandle.includes("+"))) {
                              setConnectHandle("investor@meirei.app");
                            }
                          }}
                          className={cn(
                            "rounded-xl border p-2.5 text-center font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5",
                            isSelected
                              ? `${p.border} ${p.bg} ${p.color} shadow-lg shadow-black/40`
                              : "border-white/[0.08] bg-white/[0.02] text-gray-400 hover:bg-white/[0.05] hover:text-white"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[11px]">{p.name}</span>
                          <span className="text-[9px] text-gray-500 font-normal">{p.tagline}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {connectChannel === "web" ? (
                  <div className="rounded-2xl border border-[#FF6B4E]/30 bg-gradient-to-b from-[#FF6B4E]/15 to-[#FF6B4E]/5 p-5 space-y-3.5 shadow-lg shadow-[#FF6B4E]/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[#FF6B4E]/20 text-[#FF6B4E]">
                          <SimpleWebLogo className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Meirei Conversational Chat</h4>
                          <p className="text-[11px] text-gray-400 font-mono">Website Direct Access · Chain 196</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        Live Web3 Console
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed">
                      You are interacting directly on the website. Use the built-in Conversational Chat Console on this page to query real-time stock prices, inspect your smart wallet balance, or execute natural-language trades with 100% gas sponsorship.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setShowLoginModal(false);
                        const chatElem = document.getElementById("conversational-chat");
                        if (chatElem) {
                          chatElem.scrollIntoView({ behavior: "smooth" });
                        }
                        const chatInput = document.getElementById("conversational-chat-input");
                        if (chatInput) {
                          setTimeout(() => chatInput.focus(), 350);
                        }
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-[#FF6B4E] hover:bg-[#ff5533] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B4E]/25 transition-all cursor-pointer group"
                    >
                      <span>Open Meirei Conversational Chat</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Handle Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-white uppercase text-[10px] tracking-wider">
                          {connectChannel === "whatsapp" && "WhatsApp Phone Number"}
                          {connectChannel === "telegram" && "Telegram Handle or ID"}
                          {connectChannel === "instagram" && "Instagram Username"}
                        </label>
                        <span className="font-mono text-[10px] text-gray-400">
                          {connectChannel === "telegram" ? "@MeireiXLayerBot" : "Channel Identity"}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={connectHandle}
                        onChange={(e) => setConnectHandle(e.target.value)}
                        placeholder={
                          connectChannel === "whatsapp"
                            ? "+234 902 827 9382"
                            : connectChannel === "telegram"
                            ? "@MeireiXLayerBot or username"
                            : "@your_instagram"
                        }
                        className="w-full rounded-xl border border-white/[0.1] bg-black/60 p-3 text-xs font-mono text-white placeholder-gray-600 outline-none focus:border-[#FF6B4E] transition-colors"
                      />
                    </div>

                    {/* Wallet Status Box */}
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-[11px]">OKX X Layer Wallet:</span>
                        {connectAddress ? (
                          <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-semibold text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>{formatShortAddress(connectAddress)}</span>
                            <span className="text-gray-500 font-normal">({connectWalletName || "Connected"})</span>
                          </div>
                        ) : (
                          <span className="font-mono text-amber-400 text-[11px]">Not Connected</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Network:</span>
                        <span className="font-mono text-emerald-400">OKX X Layer (196)</span>
                      </div>
                    </div>

                    {/* Wallet Selection Buttons */}
                    {!connectAddress ? (
                      <div className="space-y-2">
                        <label className="font-bold text-white uppercase text-[10px] tracking-wider block">
                          Connect Web3 Wallet
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleConnectWalletType("okx")}
                            disabled={isWalletConnecting}
                            className="p-2.5 rounded-xl border border-[#FF6B4E]/30 bg-[#FF6B4E]/10 hover:bg-[#FF6B4E]/20 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <span>OKX Wallet</span>
                            <span className="text-[9px] bg-[#FF6B4E]/30 text-[#FF6B4E] font-bold px-1 py-0.2 rounded">TOP</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConnectWalletType("metamask")}
                            disabled={isWalletConnecting}
                            className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-gray-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            MetaMask
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setShowWalletConnectModal(true)}
                            className="p-2.5 rounded-xl border border-[#3B99FC]/30 bg-[#3B99FC]/10 hover:bg-[#3B99FC]/20 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <WalletConnectIcon className="w-4 h-4 text-[#3B99FC]" />
                            <span>WalletConnect</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConnectWalletType("injected")}
                            disabled={isWalletConnecting}
                            className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-gray-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            Browser Injected
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleConfirmChannelLink}
                          disabled={isChannelLinking}
                          className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 cursor-pointer transition-colors"
                        >
                          {isChannelLinking ? "Anchoring..." : `Anchor Wallet to ${connectChannel.toUpperCase()}`}
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnectChannelWallet}
                          disabled={isWalletConnecting}
                          className="py-3 px-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    )}

                    {/* Feedback messages */}
                    {connectInfoMsg && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs">
                        {connectInfoMsg}
                      </div>
                    )}
                    {connectErrorMsg && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs">
                        {connectErrorMsg}
                      </div>
                    )}
                  </>
                )}

                {/* External links */}
                <div className="border-t border-white/[0.08] pt-3 flex items-center justify-between text-[11px] text-gray-400">
                  <a
                    href="https://t.me/MeireiXLayerBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-sky-400 flex items-center gap-1.5 transition-colors"
                  >
                    <SimpleTelegramLogo className="w-3.5 h-3.5" />
                    <span>Telegram Bot (@MeireiXLayerBot)</span>
                  </a>
                  <Link href="/connect" className="text-[#FF6B4E] hover:underline">
                    Open Full Connect Page ↗
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2FA OTP Security Verification Modal */}
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-ink-200 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-6 shadow-2xl md:p-8"
            >
              <div className="flex items-center justify-between border-b border-ink-100 dark:border-zinc-800 pb-3.5">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400">
                    Two-Factor Authorization
                  </span>
                  <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">
                    Security Verification Required
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="rounded-full p-1.5 text-ink-400 dark:text-zinc-400 hover:bg-surface-100 dark:hover:bg-[#161B26] hover:text-ink-700 dark:hover:text-white cursor-pointer"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 stroke-current stroke-2 fill-none">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-ink-600 dark:text-zinc-300">
                <p>
                  Authorizing transaction on X Layer for identity:{" "}
                  <strong className="text-ink-900 dark:text-white">{profile.email}</strong>
                </p>
                <p className="font-mono text-[11px] text-ink-500 dark:text-zinc-400">
                  Smart Wallet: {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
                </p>
                <p>
                  Enter the 6-digit numeric security code sent to your verified email:
                </p>

                {/* Development helper banner */}
                {otpDevCode && (
                  <div className="rounded-xl border border-accent-200 dark:border-accent-800 bg-accent-50/60 dark:bg-accent-950/50 p-2.5 font-mono text-[11px] text-accent-900 dark:text-accent-300">
                    Development Sandbox OTP: <strong>{otpDevCode}</strong>
                  </div>
                )}

                {/* 6-digit input */}
                <div className="mt-4">
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full rounded-2xl border border-ink-300 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] py-3 text-center font-mono text-2xl font-bold tracking-widest text-ink-900 dark:text-white outline-none focus:border-accent-500 focus:bg-white dark:focus:bg-[#11141D] focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                {otpError && (
                  <p className="text-center font-semibold text-red-600 dark:text-red-400">{otpError}</p>
                )}

                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="flex-1 rounded-xl border border-ink-200 dark:border-zinc-700 py-2.5 text-center text-xs font-semibold text-ink-700 dark:text-zinc-300 hover:bg-surface-100 dark:hover:bg-[#161B26] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isVerifyingOtp || otpInput.trim().length !== 6}
                    onClick={handleVerifyOtp}
                    className="flex-1 rounded-xl bg-accent-500 py-2.5 text-center text-xs font-bold text-white shadow-md transition-all hover:bg-accent-600 disabled:opacity-50 cursor-pointer"
                  >
                    {isVerifyingOtp ? "Authorizing..." : "Verify & Authorize"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Non-Custodial Web3 & ERC-4337 Signing Bridge Modal */}
      <Web3SigningModal
        isOpen={web3ModalState.isOpen}
        onClose={() => setWeb3ModalState((prev) => ({ ...prev, isOpen: false }))}
        targetSymbol={web3ModalState.targetSymbol}
        fromAmountUsdg={web3ModalState.fromAmountUsdg}
        estimatedUnits={web3ModalState.estimatedUnits}
        spotPrice={web3ModalState.spotPrice}
        userAddress={profile.address}
        onSuccess={(res) => {
          if (res.txHash) {
            setMandateResult({
              reply: `Signed non-custodially on X Layer for ${web3ModalState.estimatedUnits.toFixed(4)} ${web3ModalState.targetSymbol}.`,
              type: "mandate",
              hash: res.txHash,
              statusTone: "confirmed",
            });
          }
        }}
      />

      {/* Universal WalletConnect Bridge Modal */}
      <WalletConnectModal
        isOpen={showWalletConnectModal}
        onClose={() => setShowWalletConnectModal(false)}
        onConnect={(address, walletName) => {
          setConnectAddress(address);
          setConnectWalletName(walletName);
          setConnectInfoMsg(`Connected ${walletName} (${formatShortAddress(address)}) on OKX X Layer.`);
          setShowWalletConnectModal(false);
        }}
      />
    </div>
  );
}
