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

type Platform = "whatsapp" | "telegram" | "instagram" | "web" | "okx_wallet";
type Mode = "simple" | "advanced";

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
  const [loginEmail, setLoginEmail] = useState<string>(DEFAULT_PROFILE.email);
  const [loginPlatform, setLoginPlatform] = useState<Platform>("whatsapp");
  const [loginHandle, setLoginHandle] = useState<string>(DEFAULT_PROFILE.handle);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

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

  // Stock selection state
  const [selectedStock, setSelectedStock] = useState<StockItem>(STOCKS[0]);
  const [timeframe, setTimeframe] = useState<string>("1D");
  const [chartHoverIndex, setChartHoverIndex] = useState<number | null>(null);

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

  // Handle account login or switching with verified Email identity
  const handleConnectProfile = (platform: Platform, handleVal: string, emailVal: string, walletVal?: string) => {
    setIsConnecting(true);
    setTimeout(() => {
      const cleanEmail = emailVal.trim() || "alex.trader@meirei.app";
      const cleanHandle = handleVal.trim() || "+1 (555) 392 1084";
      let addr = walletVal || profile.address;

      if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        addr = "0x7f17d6224e7d48606598732c3f511412b5c1e922";
      }

      setProfile((prev) => ({
        ...prev,
        email: cleanEmail,
        platform,
        handle: cleanHandle,
        address: addr,
        botStatus: `Active on ${platform.toUpperCase()} & Web`,
      }));

      setIsLoggedIn(true);
      setShowLoginModal(false);
      setIsConnecting(false);
    }, 250);
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

  // Chart coordinate calculations
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

  const currentDisplayPrice =
    chartHoverIndex !== null ? `$${coords[chartHoverIndex].val.toFixed(2)}` : selectedStock.price;

  // Numerical price helper for price comparison & units calculator
  const getNumericPrice = (stock: StockItem): number => {
    const cleaned = parseFloat(stock.price.replace(/[^0-9.]/g, ""));
    return isNaN(cleaned) || cleaned <= 0 ? 1.0 : cleaned;
  };

  return (
    <div className="min-h-screen bg-surface-50 text-ink-900 transition-colors">
      {/* Top Application Header */}
      <header className="sticky inset-x-0 top-0 z-40 border-b border-surface-200/80 bg-surface-50/90 backdrop-blur-md transition-colors">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="meirei - home">
              <BrandMark />
            </Link>
            <div className="hidden h-5 w-px bg-surface-200 sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs font-semibold text-ink-700">
                OKX Chain (X Layer 196)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark / Light Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
              title={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
              className="grid h-8 w-8 place-items-center rounded-full border border-ink-200 bg-surface-50 text-ink-900 hover:bg-surface-200 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18V4c4.41 0 8 3.59 8 8s-3.59 8-8 8z" />
              </svg>
            </button>

            {/* OTP 2FA Protection Status Pill */}
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-bold text-emerald-800 md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              <span>{otpToken ? "2FA OTP Verified" : "2FA Protected"}</span>
            </div>

            {/* Account Status & Identity Badge */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2.5 rounded-full border border-ink-200 bg-white p-1.5 pr-4 shadow-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white shadow-xs uppercase">
                  {profile.platform === "whatsapp" && "WA"}
                  {profile.platform === "telegram" && "TG"}
                  {profile.platform === "instagram" && "IG"}
                  {profile.platform === "web" && "WEB"}
                  {profile.platform === "okx_wallet" && "OKX"}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-ink-900">{profile.handle}</span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                      Non-Custodial
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-ink-500 hidden sm:block">
                    {profile.email} · {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="ml-2 rounded p-1 text-xs text-ink-400 hover:text-accent-600 cursor-pointer"
                  title="Switch identity or channel"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                    <path d="M12 10v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v2h1V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2h-1z" />
                    <path d="M10.146 5.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L12.293 9H6.5a.5.5 0 0 1 0-1h5.793l-2.147-2.146a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="rounded-full bg-accent-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-600 cursor-pointer"
              >
                Connect Identity
              </button>
            )}

            <Link
              href="/"
              className="rounded-full border border-ink-200 px-3.5 py-2 text-xs font-medium text-ink-700 transition-colors hover:bg-surface-100"
            >
              Overview
            </Link>
          </div>
        </div>
      </header>

      {/* Main Terminal Container */}
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8">
        {/* Terminal Subheader & CONSOLIDATED TWO-MODE SWITCHER */}
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-ink-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
                Trading &amp; Mandate Terminal
              </h1>
              <span className="rounded-full bg-surface-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink-600">
                OKX Chain (X Layer)
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-600 sm:text-sm">
              Strictly non-custodial: No private keys stored. Authenticated via verified Email &amp; 2FA on X Layer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Connect OKX Wallet Non-Custodial Trigger */}
            <button
              type="button"
              onClick={() => {
                const p = getNumericPrice(selectedStock);
                openWeb3Signer(selectedStock.symbol, 250, 250 / p, p);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 px-3 py-2 text-xs font-bold text-ink-900 dark:text-ink-100 hover:border-accent-500 hover:text-accent-600 transition-colors shadow-xs cursor-pointer w-full sm:w-auto"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>OKX Wallet Signer</span>
            </button>

            {/* EXACTLY TWO MODES SWITCHER: Simple Mode vs Advanced Mode */}
            <div className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-surface-100 p-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMode("simple")}
                className={cn(
                  "flex-1 sm:flex-initial text-center rounded-lg px-3 sm:px-4 py-2 text-xs font-bold transition-all cursor-pointer",
                  mode === "simple"
                    ? "bg-accent-500 text-white shadow-sm"
                    : "text-ink-600 hover:text-ink-900"
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
                    ? "bg-ink-900 text-white shadow-sm"
                    : "text-ink-600 hover:text-ink-900"
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
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200/80 bg-white p-4 text-xs shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-700 font-bold">
                      {profile.platform === "whatsapp" && "WA"}
                      {profile.platform === "telegram" && "TG"}
                      {profile.platform === "instagram" && "IG"}
                      {profile.platform === "web" && "WEB"}
                      {profile.platform === "okx_wallet" && "OKX"}
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900">
                        {profile.handle} · <span className="text-ink-500">{profile.email}</span>
                      </p>
                      <p className="text-[11px] text-ink-500">
                        Bot Active across WhatsApp, Telegram &amp; Web. Access your account from any device.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                      Gas 100% Sponsored by OKX Paymaster
                    </span>
                  </div>
                </div>

                {/* 8 Stocks Horizontal Selector Tabs */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3">
                    <span className="font-display text-sm font-bold text-ink-900">
                      Allowlisted xStocks (8 Assets on X Layer)
                    </span>
                    <span className="text-xs text-ink-500">
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
                              ? "border-accent-500 bg-accent-50/50 shadow-xs ring-1 ring-accent-500"
                              : "border-ink-200/80 bg-surface-50 hover:border-ink-300 hover:bg-white"
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
                              <p className="font-mono text-xs font-bold text-ink-900">
                                {stock.symbol}
                              </p>
                              <p className="text-[10px] text-ink-500">{stock.name}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-mono text-xs font-semibold text-ink-900">
                              {stock.price}
                            </p>
                            <p className="text-[10px] font-medium text-emerald-700">
                              {stock.change24h}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Chart Canvas Card */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl shadow-xs shrink-0"
                        style={{ backgroundColor: selectedStock.color }}
                      >
                        {selectedStock.logo}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-display text-lg font-bold text-ink-900">
                            {selectedStock.name} ({selectedStock.symbol})
                          </h2>
                          <span className="rounded bg-surface-100 px-2 py-0.5 text-[10px] font-bold text-ink-600">
                            {selectedStock.isLive ? "X Layer Live" : "Planned Asset"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="font-mono text-2xl font-bold tracking-tight text-ink-900">
                            {currentDisplayPrice}
                          </span>
                          <span className="text-xs font-semibold text-emerald-700">
                            {selectedStock.change24h} past 24h
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeframe Selector */}
                    <div className="flex items-center gap-1 rounded-xl border border-ink-200 bg-surface-50 p-1">
                      {["1D", "1W", "1M", "1Y", "ALL"].map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => setTimeframe(tf)}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                            timeframe === tf
                              ? "bg-white text-ink-900 shadow-xs"
                              : "text-ink-500 hover:text-ink-900"
                          )}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SVG Chart Canvas */}
                  <div className="relative mt-4">
                    <svg
                      ref={chartSvgRef}
                      viewBox={`0 0 ${width} ${height}`}
                      className="w-full h-[180px] overflow-visible select-none"
                      onMouseLeave={() => setChartHoverIndex(null)}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clientX = e.clientX - rect.left;
                        const ratio = Math.max(0, Math.min(1, clientX / rect.width));
                        const idx = Math.round(ratio * (points.length - 1));
                        setChartHoverIndex(idx);
                      }}
                    >
                      <defs>
                        <linearGradient id={chartGradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5B3E" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#FF5B3E" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Subtle grid lines */}
                      <line x1="0" y1={padY} x2={width} y2={padY} stroke="#E5E5DF" strokeDasharray="3 3" />
                      <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#E5E5DF" strokeDasharray="3 3" />
                      <line x1="0" y1={height - padY} x2={width} y2={height - padY} stroke="#E5E5DF" strokeDasharray="3 3" />

                      {/* Area Fill */}
                      <path d={areaD} fill={`url(#${chartGradId})`} />

                      {/* Stroke Line */}
                      <path d={pathD} fill="none" stroke="#FF5B3E" strokeWidth="2.5" strokeLinecap="round" />

                      {/* Hover Indicator Crosshair */}
                      {chartHoverIndex !== null && (
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
                    </svg>

                    <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-400">
                      <span>09:30 AM EST</span>
                      <span>12:00 PM EST</span>
                      <span>04:00 PM EST</span>
                    </div>
                  </div>
                </div>

                {/* 1-Sentence Natural Language Investment Mandate Console */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3">
                    <div>
                      <h3 className="font-display text-sm font-bold text-ink-900">
                        1-Sentence Investment Mandate Console
                      </h3>
                      <p className="text-xs text-ink-500">
                        Enter any trade, price comparison, or mandate in natural language. Powered by OKX Onchain OS.
                      </p>
                    </div>
                    <span className="rounded bg-surface-100 px-2 py-0.5 font-mono text-[10px] text-ink-600">
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
                      className="w-full resize-none rounded-xl border border-ink-200 bg-surface-50 p-3.5 text-sm text-ink-900 outline-none focus:border-accent-500 focus:bg-white focus:ring-1 focus:ring-accent-500"
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
                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-ink-200 bg-surface-50 p-4 text-xs">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent shrink-0" />
                      <div>
                        <p className="font-semibold text-ink-900">Routing mandate through OKX DEX on X Layer...</p>
                        <p className="text-[11px] text-ink-500">Checking price impact, spending limits, and non-custodial 2FA authorization.</p>
                      </div>
                    </div>
                  )}

                  {/* Result & Execution Feedback */}
                  {mandateResult && (
                    <div
                      className={cn(
                        "mt-4 rounded-xl border p-4 text-xs leading-relaxed",
                        mandateResult.type === "error"
                          ? "border-red-200 bg-red-50 text-red-900"
                          : mandateResult.statusTone === "confirmed"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                          : "border-ink-200 bg-surface-50 text-ink-800"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-semibold">{mandateResult.reply}</p>
                          {mandateResult.hash && (
                            <p className="font-mono text-[11px] text-ink-600">
                              Reference / Hash:{" "}
                              <span className="font-bold text-ink-900">
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
                              className="rounded-lg bg-ink-900 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-ink-800 cursor-pointer"
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
                <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center pb-3">
                    <div>
                      <h3 className="font-display text-sm font-bold text-ink-900">
                        Interactive Prompt &amp; Question Assistant
                      </h3>
                      <p className="text-xs text-ink-500">
                        Click any question or trade instruction below to instantly populate and run.
                      </p>
                    </div>

                    <div className="flex items-center gap-1 rounded-xl border border-ink-200 bg-surface-50 p-1">
                      {(["trades", "questions", "rules"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPromptAssistantCategory(cat)}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all cursor-pointer",
                            promptAssistantCategory === cat
                              ? "bg-white text-ink-900 shadow-xs"
                              : "text-ink-500 hover:text-ink-900"
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
                            className="flex items-center justify-between rounded-xl border border-ink-200 bg-surface-50 p-3 text-left text-xs font-medium text-ink-800 transition-colors hover:border-accent-500 hover:bg-accent-50/50 hover:text-accent-900 cursor-pointer"
                          >
                            <span>{prompt}</span>
                            <span className="font-mono text-[10px] text-accent-600 font-bold shrink-0">Execute ↗</span>
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
                            className="flex items-center justify-between rounded-xl border border-ink-200 bg-surface-50 p-3 text-left text-xs font-medium text-ink-800 transition-colors hover:border-accent-500 hover:bg-accent-50/50 hover:text-accent-900 cursor-pointer"
                          >
                            <span>{prompt}</span>
                            <span className="font-mono text-[10px] text-ink-500 shrink-0">Ask AI ?</span>
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
                            className="flex items-center justify-between rounded-xl border border-ink-200 bg-surface-50 p-3 text-left text-xs font-medium text-ink-800 transition-colors hover:border-accent-500 hover:bg-accent-50/50 hover:text-accent-900 cursor-pointer"
                          >
                            <span>{prompt}</span>
                            <span className="font-mono text-[10px] text-ink-500 shrink-0">Deploy Rule ↗</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Price Comparison & Units Calculator (Breaks complexity into simplicity) */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
                  <div className="flex flex-col justify-between gap-3 border-b border-ink-100 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                          Interactive Calculator
                        </span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                          Zero Math Required
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-ink-900 sm:text-lg">
                        Price Comparison &amp; Units Calculator
                      </h3>
                      <p className="text-xs text-ink-500">
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
                              : "border border-ink-200 bg-surface-50 text-ink-700 hover:bg-white"
                          )}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculator Comparison Table */}
                  <div className="mt-4 overflow-x-auto rounded-xl border border-ink-200">
                    <table className="w-full min-w-[580px] text-left text-xs">
                      <thead className="border-b border-ink-200 bg-surface-100 font-semibold text-ink-900">
                        <tr>
                          <th className="p-3">Asset</th>
                          <th className="p-3">Spot Price</th>
                          <th className="p-3 font-mono">${calcInvestmentUsdg} USDG Buys</th>
                          <th className="p-3 text-right">Instant Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-200/60 bg-white text-ink-700">
                        {STOCKS.map((stk) => {
                          const priceNum = getNumericPrice(stk);
                          const units = (calcInvestmentUsdg / priceNum).toFixed(3);

                          return (
                            <tr
                              key={stk.symbol}
                              className={cn(
                                "transition-colors hover:bg-surface-50",
                                stk.symbol === selectedStock.symbol ? "bg-accent-50/30" : ""
                              )}
                            >
                              <td className="p-3 font-semibold text-ink-900">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="flex h-6 w-6 items-center justify-center rounded shadow-xs shrink-0"
                                    style={{ backgroundColor: stk.color }}
                                  >
                                    {stk.logo}
                                  </div>
                                  <div>
                                    <span className="font-mono font-bold">{stk.symbol}</span>
                                    <span className="ml-1.5 text-[11px] text-ink-500">({stk.name})</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-mono font-semibold text-ink-900">
                                {stk.price}
                              </td>
                              <td className="p-3 font-mono font-bold text-accent-700 text-sm">
                                {units} units
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStock(stk);
                                      const actionText = `Buy ${calcInvestmentUsdg} USDG of ${stk.symbol}`;
                                      setPromptText(actionText);
                                      handleSendPrompt(actionText);
                                    }}
                                    className="rounded-lg bg-ink-900 dark:bg-ink-100 dark:text-ink-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-accent-500 hover:text-white cursor-pointer"
                                  >
                                    Quick Buy
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStock(stk);
                                      openWeb3Signer(stk.symbol, calcInvestmentUsdg, parseFloat(units), priceNum);
                                    }}
                                    className="rounded-lg border border-accent-500 bg-accent-50 dark:bg-accent-950/40 px-2.5 py-1 text-[11px] font-bold text-accent-700 dark:text-accent-300 shadow-xs transition-colors hover:bg-accent-500 hover:text-white cursor-pointer"
                                  >
                                    Sign in Wallet
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
                <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs sm:p-6">
                  <div className="flex flex-col justify-between gap-3 border-b border-ink-100 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent-600">
                        Institutional Advisory Studio
                      </span>
                      <h2 className="font-display text-lg font-bold text-ink-900 sm:text-xl">
                        AI Trading Advisory Agent
                      </h2>
                    </div>

                    {/* Horizon Selector */}
                    <div className="flex items-center gap-1 rounded-xl border border-ink-200 bg-surface-50 p-1">
                      <button
                        type="button"
                        onClick={() => setAdvisoryHorizon("short_term")}
                        className={cn(
                          "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                          advisoryHorizon === "short_term"
                            ? "bg-white text-ink-900 shadow-xs"
                            : "text-ink-500 hover:text-ink-900"
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
                            ? "bg-white text-ink-900 shadow-xs"
                            : "text-ink-500 hover:text-ink-900"
                        )}
                      >
                        Long-Term Blue Chip DCA
                      </button>
                    </div>
                  </div>

                  {/* Risk Profile Selection Bar */}
                  <div className="mt-5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-600">
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
                              ? "border-accent-500 bg-accent-50/60 ring-1 ring-accent-500"
                              : "border-ink-200 bg-surface-50 hover:bg-white"
                          )}
                        >
                          <p className="font-display text-xs font-bold capitalize text-ink-900">{r}</p>
                          <p className="mt-0.5 text-[10px] text-ink-500">
                            {r === "conservative" && "Capital Preservation"}
                            {r === "balanced" && "Strategic Growth"}
                            {r === "aggressive" && "Alpha Acceleration"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Plan Breakdown Card */}
                  <div className="mt-5 rounded-2xl border border-ink-200 bg-surface-50/60 p-4 sm:p-5">
                    <div className="flex flex-col justify-between gap-2 border-b border-ink-200/80 pb-3.5 sm:flex-row sm:items-center">
                      <div>
                        <span className="rounded bg-accent-100 px-2 py-0.5 text-[10px] font-bold text-accent-800 uppercase">
                          {currentAdvisoryPlan.horizonLabel}
                        </span>
                        <h3 className="mt-1 font-display text-base font-bold text-ink-900">
                          {currentAdvisoryPlan.strategyName}
                        </h3>
                      </div>
                      <span className="rounded-full bg-surface-200 px-3 py-1 font-mono text-xs font-semibold text-ink-800">
                        {currentAdvisoryPlan.expectedVolatility}
                      </span>
                    </div>

                    {/* Rationale & Thesis */}
                    <div className="mt-3.5">
                      <p className="text-xs leading-relaxed text-ink-700">
                        <strong className="text-ink-900">AI Strategic Thesis: </strong>
                        {currentAdvisoryPlan.thesis}
                      </p>
                    </div>

                    {/* Target Allocation Weights List */}
                    <div className="mt-4 space-y-2.5">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                        Target Asset Weights &amp; Allocation Rationale
                      </h4>

                      <div className="space-y-2">
                        {currentAdvisoryPlan.allocations.map((alloc) => (
                          <div
                            key={alloc.symbol}
                            className="rounded-xl border border-ink-200/70 bg-white p-3 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-ink-900">
                                  {alloc.symbol}
                                </span>
                                <span className="rounded bg-surface-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-600">
                                  {alloc.role}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-accent-700">
                                {alloc.weightPercent}%
                              </span>
                            </div>

                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
                              <div
                                className="h-full bg-accent-500"
                                style={{ width: `${alloc.weightPercent}%` }}
                              />
                            </div>

                            <p className="mt-1.5 text-[11px] text-ink-500 leading-normal">
                              {alloc.rationale}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operational Guardrails */}
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-200/80 pt-3.5 text-xs">
                      <div>
                        <span className="text-ink-500">Rebalance Interval:</span>
                        <p className="font-semibold text-ink-900">
                          {currentAdvisoryPlan.rebalanceInterval}
                        </p>
                      </div>
                      <div>
                        <span className="text-ink-500">Downside Safeguard:</span>
                        <p className="font-semibold text-ink-900">
                          {currentAdvisoryPlan.downsideProtection}
                        </p>
                      </div>
                    </div>

                    {/* Deploy Mandate CTA */}
                    <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-xl bg-ink-900 p-4 text-white sm:flex-row">
                      <div>
                        <p className="text-xs font-medium text-ink-300">Executable Mandate Rule</p>
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
                          className="rounded-xl bg-ink-800 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
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
                <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs sm:p-6">
                  <div className="flex items-center justify-between border-b border-ink-100 pb-4">
                    <div>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent-600">
                        Live Market Intelligence &amp; Investor Sentiment
                      </span>
                      <h2 className="font-display text-lg font-bold text-ink-900 sm:text-xl">
                        Market Catalysts &amp; Investor Consensus
                      </h2>
                    </div>
                    <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-ink-600">
                      Live On-Chain Feed
                    </span>
                  </div>

                  {isLoadingNews ? (
                    <div className="py-12 text-center text-xs text-ink-500">
                      Loading real-time market catalysts from X Layer onchain feed...
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {newsList.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-ink-200/80 bg-surface-50/50 p-4 transition-all hover:bg-white hover:shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-ink-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
                                {item.ticker}
                              </span>
                              <span className="text-xs font-semibold text-ink-600">
                                {item.category}
                              </span>
                              <span className="text-ink-400">·</span>
                              <span className="text-[11px] text-ink-400">{item.timestamp}</span>
                            </div>

                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                                item.impact === "Bullish"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.impact === "Bearish"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              )}
                            >
                              {item.impact}
                            </span>
                          </div>

                          <h3 className="mt-2 font-display text-sm font-bold leading-snug text-ink-900">
                            {item.headline}
                          </h3>
                          <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                            {item.summary}
                          </p>

                          {/* What Investors Think So Far & Market Effect */}
                          <div className="mt-3 space-y-2 rounded-xl border border-ink-200/70 bg-white p-3 text-xs">
                            <p className="text-ink-800 leading-relaxed">
                              <strong className="text-ink-900">What Investors Think So Far: </strong>
                              {item.impact === "Bullish"
                                ? "Institutional accumulation detected; retail sentiment strongly positive with surging call options activity."
                                : item.impact === "Bearish"
                                ? "Defensive rebalancing observed; traders hedging downside risk with automated stop loss triggers."
                                : "Balanced consolidation; market awaiting further macro economic and earnings guidance."}
                            </p>
                            <p className="text-ink-800 leading-relaxed border-t border-ink-100 pt-2">
                              <strong className="text-accent-600">Market Effect on X Layer: </strong>
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
                              className="rounded-lg bg-ink-900 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-accent-600 cursor-pointer"
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
            {/* Account & Identity Box */}
            <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-500">
                  Account Identity
                </span>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Non-Custodial
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-600">Universal Signature:</span>
                  <span className="font-semibold text-ink-900">{profile.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600">Connected Channel:</span>
                  <span className="font-semibold text-ink-900 capitalize">
                    {profile.platform} ({profile.handle})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600">X Layer Smart Wallet:</span>
                  <span className="font-mono text-[11px] text-accent-700">
                    {profile.address.slice(0, 8)}...{profile.address.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600">Security Gate:</span>
                  <span className="font-semibold text-emerald-700">2FA OTP Protected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600">Private Keys:</span>
                  <span className="font-semibold text-ink-700">Never Stored in Database</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600">Gas Sponsorship:</span>
                  <span className="font-semibold text-emerald-700">100% Covered by OKX</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="mt-4 w-full rounded-xl border border-ink-200 bg-surface-50 py-2 text-center text-xs font-semibold text-ink-800 transition-colors hover:bg-surface-100 cursor-pointer"
              >
                Switch Profile or Channel
              </button>
            </div>

            {/* Live Portfolio Breakdown Card */}
            <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-500">
                  Portfolio Value
                </span>
                <span className="font-mono text-xs text-ink-400">Live USDG</span>
              </div>

              <div className="mt-3">
                <p className="font-mono text-3xl font-bold tracking-tight text-ink-900">
                  ${profile.portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-0.5 text-xs text-emerald-700">
                  +4.18% past 7 days across allowlisted equities
                </p>

                {/* Spending Cap Telemetry */}
                <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2 text-[11px] text-ink-500">
                  <span>Daily Spending Cap:</span>
                  <span className="font-mono font-semibold text-ink-800">$0.00 / $25,000 USDG</span>
                </div>
              </div>

              {profile.holdings.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-surface-50 p-4 text-center">
                  <p className="text-xs font-semibold text-ink-800">No active stock holdings</p>
                  <p className="mt-1 text-[11px] text-ink-500 leading-relaxed">
                    This wallet currently holds no tokenized equities on X Layer (chain 196). Submit an investment mandate or a direct trade to begin.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPromptText("Buy 100 USDG of NVDAx");
                      setMode("simple");
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-ink-800 cursor-pointer"
                  >
                    <span>Try Sample Trade</span>
                    <span>↗</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Progress Bar Breakdown */}
                  <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-100">
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
                        className="flex items-center justify-between rounded-lg border border-ink-100 bg-surface-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: h.color }}
                          />
                          <span className="font-bold text-ink-900">{h.symbol}</span>
                          <span className="text-[10px] text-ink-500">
                            {h.amount.toFixed(2)} units
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-ink-900">
                          ${h.valueUsd.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Active Mandates on Chain 196 */}
            <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-500">
                  Active Mandates
                </span>
                <span className="rounded bg-accent-50 px-2 py-0.5 text-[10px] font-bold text-accent-700">
                  {profile.activeMandates.length} Running
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5">
                {profile.activeMandates.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-ink-100 bg-surface-50 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-900">{m.status}</span>
                      <span className="font-mono text-[10px] text-ink-500">{m.frequency}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-700">
                      {m.rule}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Account Login & Multi-Channel Channel Linkage Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-ink-200 bg-white p-6 shadow-2xl md:p-8"
            >
              <div className="flex items-center justify-between border-b border-ink-100 pb-3.5">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                    Non-Custodial Account Access
                  </span>
                  <h3 className="font-display text-lg font-bold text-ink-900">
                    Universal Identity &amp; Channel Link
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="rounded-full p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-700 cursor-pointer"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 stroke-current stroke-2 fill-none">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs text-ink-700">
                <div className="rounded-xl border border-ink-200 bg-surface-50 p-3 leading-relaxed">
                  <p className="font-semibold text-ink-900">Zero Private Key Storage Guarantee:</p>
                  <p className="mt-1 text-ink-600">
                    Your email is your universal signature anchor across WhatsApp, Telegram, and Web.
                    Signing keys reside exclusively in your OKX Layer smart wallet or Passkey.
                  </p>
                </div>

                {/* Email input */}
                <div>
                  <label className="font-bold text-ink-900 uppercase text-[10px] tracking-wider">
                    Verified Email Address (Identity Anchor)
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-xl border border-ink-300 bg-surface-50 p-3 text-xs text-ink-900 outline-none focus:border-accent-500 focus:bg-white"
                  />
                </div>

                {/* Channel selection */}
                <div>
                  <label className="font-bold text-ink-900 uppercase text-[10px] tracking-wider">
                    Messaging Channel Platform
                  </label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {(["whatsapp", "telegram", "web"] as Platform[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setLoginPlatform(p)}
                        className={cn(
                          "rounded-xl border p-2 text-center font-bold capitalize transition-all cursor-pointer",
                          loginPlatform === p
                            ? "border-accent-500 bg-accent-50 text-accent-700"
                            : "border-ink-200 bg-surface-50 text-ink-600 hover:bg-white"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Handle input */}
                <div>
                  <label className="font-bold text-ink-900 uppercase text-[10px] tracking-wider">
                    Channel Identifier (Phone Number / Bot Handle)
                  </label>
                  <input
                    type="text"
                    value={loginHandle}
                    onChange={(e) => setLoginHandle(e.target.value)}
                    placeholder="+1 (555) 392 1084 or @username"
                    className="mt-1.5 w-full rounded-xl border border-ink-300 bg-surface-50 p-3 text-xs text-ink-900 outline-none focus:border-accent-500 focus:bg-white"
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <p className="text-[11px] text-ink-500">Or pick a demo profile:</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {SAMPLE_LOGINS.map((s) => (
                      <button
                        key={s.email}
                        type="button"
                        onClick={() => handleConnectProfile(s.platform, s.handle, s.email, s.address)}
                        className="rounded-lg border border-ink-200 bg-surface-50 px-2.5 py-1 text-[11px] font-medium text-ink-700 hover:border-accent-500 hover:bg-accent-50 cursor-pointer"
                      >
                        {s.label} ({s.platform})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="flex-1 rounded-xl border border-ink-200 py-2.5 text-center text-xs font-semibold text-ink-700 hover:bg-surface-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isConnecting || !loginEmail.trim()}
                    onClick={() => handleConnectProfile(loginPlatform, loginHandle, loginEmail)}
                    className="flex-1 rounded-xl bg-accent-500 py-2.5 text-center text-xs font-bold text-white shadow-md transition-all hover:bg-accent-600 disabled:opacity-50 cursor-pointer"
                  >
                    {isConnecting ? "Connecting..." : "Link & Access"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2FA OTP Security Verification Modal */}
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-ink-200 bg-white p-6 shadow-2xl md:p-8"
            >
              <div className="flex items-center justify-between border-b border-ink-100 pb-3.5">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                    Two-Factor Authorization
                  </span>
                  <h3 className="font-display text-lg font-bold text-ink-900">
                    Security Verification Required
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="rounded-full p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-700 cursor-pointer"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 stroke-current stroke-2 fill-none">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-ink-600">
                <p>
                  Authorizing transaction on X Layer for identity:{" "}
                  <strong className="text-ink-900">{profile.email}</strong>
                </p>
                <p className="font-mono text-[11px] text-ink-500">
                  Smart Wallet: {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
                </p>
                <p>
                  Enter the 6-digit numeric security code sent to your verified email:
                </p>

                {/* Development helper banner */}
                {otpDevCode && (
                  <div className="rounded-xl border border-accent-200 bg-accent-50/60 p-2.5 font-mono text-[11px] text-accent-900">
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
                    className="w-full rounded-2xl border border-ink-300 bg-surface-50 py-3 text-center font-mono text-2xl font-bold tracking-widest text-ink-900 outline-none focus:border-accent-500 focus:bg-white focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                {otpError && (
                  <p className="text-center font-semibold text-red-600">{otpError}</p>
                )}

                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="flex-1 rounded-xl border border-ink-200 py-2.5 text-center text-xs font-semibold text-ink-700 hover:bg-surface-100 cursor-pointer"
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
    </div>
  );
}
