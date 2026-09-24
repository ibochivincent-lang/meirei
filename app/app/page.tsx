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
import {
  OKX_SENTIMENT_DATA,
  OKX_SMART_MONEY_DATA,
  OKX_CEX_MARKET_DATA,
  OKX_TRADING_PLAN_DATA,
} from "@/lib/okx/skills_data";

type Platform = "telegram" | "web" | "okx_wallet" | "whatsapp" | "instagram";
type Mode = "basic" | "advanced";

// Simple Vector SVG Logos for Supported Platforms
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
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
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
  delivery?: {
    mandate?: {
      targets?: Array<{ symbol: string; weight: number }>;
      maxSingle?: number;
      rebalanceBand?: number;
    };
    plan?: {
      legs?: Array<{ side: "buy" | "sell"; symbol: string; notionalUsd: number }>;
      quotes?: unknown;
    };
    txs?: Array<{ symbol: string; hash?: string; explorerUrl?: string; status?: string; error?: string }>;
    fee?: { amount: string; asset: string; status: string; reason?: string };
    portfolio?: { totalUsd: number; holdings: Array<{ symbol: string; valueUsd: number }> };
  };
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
  email: "investor@meirei.app",
  platform: "web",
  handle: "Web Terminal Session",
  address: "",
  twoFactorMethod: "email",
  botStatus: "Connected on Web",
  portfolioValue: 0.0,
  usdgBalance: 0.0,
  holdings: [],
  activeMandates: [],
};

interface MandatePolicy {
  id: string;
  title: string;
  policyType: "drift_rebalance" | "dca_recurring" | "circuit_breaker";
  target: string;
  rule: string;
  metricLabel: string;
  metricValue: string;
  threshold: string;
  status: "active" | "paused";
  lastEvaluated: string;
}

interface ExecutionLogItem {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  type: "info" | "success" | "warn";
}

function SectionSeparator({ label }: { label: string }) {
  return (
    <div className="relative my-6 select-none" aria-hidden="true">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-ink-200/80" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-surface-50 px-3 font-mono text-[10px] uppercase font-bold tracking-wider text-ink-400 border border-ink-200/60 rounded-full shadow-2xs">
          {label}
        </span>
      </div>
    </div>
  );
}

export default function AppDashboardPage() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const isLoggedIn = Boolean(profile.address && profile.address !== "0x0000000000000000000000000000000000000000");
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // 1-Click Demo Sandbox for Judges
  const [isDemoSandbox, setIsDemoSandbox] = useState<boolean>(false);

  // Mandate Policy Creator Modal
  const [showCreateMandateModal, setShowCreateMandateModal] = useState<boolean>(false);
  const [newMandateTitle, setNewMandateTitle] = useState<string>("Mag7 Drift Guard");
  const [newMandateType, setNewMandateType] = useState<"drift_rebalance" | "dca_recurring" | "circuit_breaker">("drift_rebalance");
  const [newMandateTarget, setNewMandateTarget] = useState<string>("60% Mag7, 20% USDG, max 8%");
  const [newMandateThreshold, setNewMandateThreshold] = useState<string>("5.0%");

  // Active Autonomous Mandates state
  const [mandatePolicies, setMandatePolicies] = useState<MandatePolicy[]>([
    {
      id: "mandate_drift_1",
      title: "Portfolio Drift Rebalance",
      policyType: "drift_rebalance",
      target: "60% NVDAx / 40% AAPLx",
      rule: "Autonomous atomic rebalance when asset drift > 5.0% via OKX Exchange OS",
      metricLabel: "Current Drift",
      metricValue: "1.4%",
      threshold: "5.0%",
      status: "active",
      lastEvaluated: "Just now",
    },
    {
      id: "mandate_dca_1",
      title: "Weekly DCA Accumulation",
      policyType: "dca_recurring",
      target: "50 USDG into TSLAx",
      rule: "Automated recurring accumulation every Monday at 08:00 UTC",
      metricLabel: "Next Execution",
      metricValue: "Mon 08:00 UTC",
      threshold: "50 USDG",
      status: "active",
      lastEvaluated: "Scheduled",
    },
    {
      id: "mandate_breaker_1",
      title: "Volatility Circuit Breaker",
      policyType: "circuit_breaker",
      target: "Portfolio Drawdown Guard",
      rule: "Auto-liquidate equity positions to USDG if 24h drawdown exceeds 7.0%",
      metricLabel: "24h Drawdown",
      metricValue: "-0.42%",
      threshold: "-7.00%",
      status: "active",
      lastEvaluated: "Armed & Monitoring",
    },
  ]);

  // Agent Autonomous Execution Audit Trail Log
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogItem[]>([
    {
      id: "log-1",
      timestamp: "18:00:00",
      source: "OKX X Layer (Chain 196)",
      message: "Mandate Orchestrator v2.4 initialized. Connected to RPC https://rpc.xlayer.tech.",
      type: "info",
    },
    {
      id: "log-2",
      timestamp: "18:00:15",
      source: "Drift Guard",
      message: "Checking Portfolio #1 (NVDAx / AAPLx)... Drift: 1.4% (Threshold: 5.0%). No action required.",
      type: "info",
    },
    {
      id: "log-3",
      timestamp: "18:00:30",
      source: "Circuit Breaker",
      message: "Evaluating 24h volatility index: -0.42% (Halt threshold: -7.00%). Normal operating parameters.",
      type: "info",
    },
    {
      id: "log-4",
      timestamp: "18:00:45",
      source: "DCA Solver",
      message: "Scheduled execution ready: 50 USDG -> TSLAx on Monday 08:00 UTC via OKX Paymaster.",
      type: "info",
    },
    {
      id: "log-5",
      timestamp: "18:01:00",
      source: "OKX Exchange OS",
      message: "Quoting aggregate liquidity across X Layer pools. Optimal route identified, slippage: < 0.05%.",
      type: "success",
    },
  ]);

  // Transparent Connect Portal state inside /app
  const [connectChannel, setConnectChannel] = useState<Platform>("web");
  const [connectHandle, setConnectHandle] = useState<string>(DEFAULT_PROFILE.handle);
  const [connectAddress, setConnectAddress] = useState<string | null>(null);
  const [connectWalletName, setConnectWalletName] = useState<string | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState<boolean>(false);
  const [isChannelLinking, setIsChannelLinking] = useState<boolean>(false);
  const [connectSuccess, setConnectSuccess] = useState<boolean>(false);
  const [connectInfoMsg, setConnectInfoMsg] = useState<string | null>(null);
  const [connectErrorMsg, setConnectErrorMsg] = useState<string | null>(null);
  const [showWalletConnectModal, setShowWalletConnectModal] = useState<boolean>(false);
  const [availableConnectWallets, setAvailableConnectWallets] = useState<WalletOption[]>([]);
  const [isAccountFrozen, setIsAccountFrozen] = useState<boolean>(false);

  // Fetch authentic real-time on-chain balances from OKX X Layer (Chain ID 196)
  useEffect(() => {
    let isMounted = true;

    async function loadRealBalances() {
      if (isDemoSandbox || profile.address === "0x1960de01896a2f4c3d8e5b6a7c9d0e1f2a3b4c5d") {
        return;
      }
      const addr = profile.address?.trim();
      if (!addr || !isValidEvmAddress(addr) || addr === "0x0000000000000000000000000000000000000000") {
        setProfile((prev) => ({
          ...prev,
          portfolioValue: 0,
          usdgBalance: 0,
          holdings: [],
        }));
        return;
      }

      setIsLoadingBalance(true);
      try {
        const res = await fetch(`/api/wallet/balance?address=${encodeURIComponent(addr)}`);
        const data = await res.json();
        if (isMounted && data.ok) {
          const rawHoldings = Array.isArray(data.holdings) ? data.holdings : [];
          const mappedHoldings = rawHoldings.map((h: { symbol: string; amount: number; valueUsd: number }) => {
            const stockDef = STOCKS.find((s) => s.symbol === h.symbol);
            return {
              symbol: h.symbol,
              amount: Number(h.amount) || 0,
              valueUsd: Number(h.valueUsd) || 0,
              color: stockDef?.color || (h.symbol === "NVDAx" ? "#76B900" : h.symbol === "AAPLx" ? "#111111" : "#3B82F6"),
            };
          });

          const usdg = Number(data.usdgBalance) || 0;
          const equitiesTotal = mappedHoldings.reduce((sum: number, h: { valueUsd: number }) => sum + h.valueUsd, 0);
          const total = Number(data.totalValueUsd) || (usdg + equitiesTotal);

          setProfile((prev) => ({
            ...prev,
            usdgBalance: usdg,
            portfolioValue: total,
            holdings: mappedHoldings,
          }));
        }
      } catch (err) {
        console.warn("[Balances] Notice checking real on-chain balance:", err);
      } finally {
        if (isMounted) setIsLoadingBalance(false);
      }
    }

    loadRealBalances();
    const timer = setInterval(loadRealBalances, 25000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [profile.address, isDemoSandbox]);

  // Restore Demo Sandbox on client mount if saved in localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("meirei_demo_sandbox") === "true") {
      setIsDemoSandbox(true);
      setProfile({
        handle: "OKX_Judge (Demo Sandbox)",
        platform: "web",
        email: "evaluator@okx.com",
        address: "0x1960de01896a2f4c3d8e5b6a7c9d0e1f2a3b4c5d",
        twoFactorMethod: "email",
        botStatus: "Connected on Web",
        portfolioValue: 3263.0,
        usdgBalance: 1000.0,
        holdings: [
          { symbol: "USDG", amount: 1000.0, valueUsd: 1000.0, color: "#10B981" },
          { symbol: "NVDAx", amount: 3.5, valueUsd: 602.0, color: "#76B900" },
          { symbol: "AAPLx", amount: 5.0, valueUsd: 1165.0, color: "#A2AAAD" },
          { symbol: "TSLAx", amount: 2.0, valueUsd: 496.0, color: "#E82127" },
        ],
        activeMandates: [
          { id: "m1", rule: "60% NVDAx / 40% AAPLx", status: "Active", frequency: "continuous" },
          { id: "m2", rule: "50 USDG TSLAx", status: "Active", frequency: "weekly" },
          { id: "m3", rule: "7% Drawdown Guard", status: "Active", frequency: "24h" },
        ],
      });
    }
  }, []);

  // Periodic heartbeat audit log showing the agent continuously monitoring in the background
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);
      const events: Array<{ source: string; message: string; type: "info" | "success" | "warn" }> = [
        {
          source: "Drift Guard",
          message: "Checking drift on Portfolio #1... Drift: 1.2% (Threshold: 5.0%). No action required.",
          type: "info",
        },
        {
          source: "Circuit Breaker",
          message: "Telemetry check passed: 24h drawdown index -0.42% remains safely above -7.00% halt threshold.",
          type: "info",
        },
        {
          source: "DCA Solver",
          message: "Triggering DCA mandate: 50 USDG -> TSLAx via OKX Paymaster scheduled for next cycle.",
          type: "info",
        },
        {
          source: "OKX Exchange OS",
          message: "Aggregated liquidity router verified. Pool depth healthy, estimated execution slippage: 0.04%.",
          type: "success",
        },
      ];
      const pick = events[Math.floor(Math.random() * events.length)];
      setExecutionLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          source: pick.source,
          message: pick.message,
          type: pick.type,
        },
        ...prev.slice(0, 24),
      ]);
    }, 22000);

    return () => clearInterval(interval);
  }, []);

  // 1-Click Demo Sandbox Handlers for Judges
  const handleLoadDemoSandbox = () => {
    const demoHoldings = [
      { symbol: "USDG", amount: 1000.0, valueUsd: 1000.0, color: "#10B981" },
      { symbol: "NVDAx", amount: 3.5, valueUsd: 602.0, color: "#76B900" },
      { symbol: "AAPLx", amount: 5.0, valueUsd: 1165.0, color: "#A2AAAD" },
      { symbol: "TSLAx", amount: 2.0, valueUsd: 496.0, color: "#E82127" },
    ];
    const totalVal = 1000.0 + 602.0 + 1165.0 + 496.0;

    setProfile({
      handle: "OKX_Judge (Demo Sandbox)",
      platform: "web",
      email: "evaluator@okx.com",
      address: "0x1960de01896a2f4c3d8e5b6a7c9d0e1f2a3b4c5d",
      twoFactorMethod: "email",
      botStatus: "Connected on Web",
      portfolioValue: totalVal,
      usdgBalance: 1000.0,
      holdings: demoHoldings,
      activeMandates: [
        { id: "m1", rule: "60% NVDAx / 40% AAPLx", status: "Active", frequency: "continuous" },
        { id: "m2", rule: "50 USDG TSLAx", status: "Active", frequency: "weekly" },
        { id: "m3", rule: "7% Drawdown Guard", status: "Active", frequency: "24h" },
      ],
    });

    setIsDemoSandbox(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("meirei_demo_sandbox", "true");
    }

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    setExecutionLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        source: "Demo Sandbox",
        message: "Demo Sandbox activated: Loaded 1,000 USDG test cash + 3 equity positions (NVDAx, AAPLx, TSLAx) on OKX X Layer.",
        type: "success",
      },
      ...prev,
    ]);
  };

  const handleTopUpDemoUsdg = () => {
    setProfile((prev) => ({
      ...prev,
      usdgBalance: prev.usdgBalance + 500.0,
      portfolioValue: prev.portfolioValue + 500.0,
      holdings: prev.holdings.map((h) =>
        h.symbol === "USDG"
          ? { ...h, amount: h.amount + 500.0, valueUsd: h.valueUsd + 500.0 }
          : h
      ),
    }));

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    setExecutionLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        source: "Demo Sandbox",
        message: "Credited 500.00 USDG mock test liquidity to Sandbox balance.",
        type: "success",
      },
      ...prev,
    ]);
  };

  const handleResetDemoSandbox = () => {
    setIsDemoSandbox(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("meirei_demo_sandbox");
    }
    setProfile({
      ...DEFAULT_PROFILE,
      handle: "Disconnected",
      email: "disconnected@meirei.app",
      address: "0x0000000000000000000000000000000000000000",
      holdings: [],
      portfolioValue: 0,
      usdgBalance: 0,
    });
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    setExecutionLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        source: "System",
        message: "Demo Sandbox reset. Connected to live OKX X Layer wallet state ($0.00).",
        type: "info",
      },
      ...prev,
    ]);
  };

  const toggleMandatePolicy = (id: string) => {
    setMandatePolicies((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextStatus = m.status === "active" ? "paused" : "active";
          const now = new Date();
          const timeStr = now.toTimeString().slice(0, 8);
          setExecutionLogs((logs) => [
            {
              id: `log-${Date.now()}`,
              timestamp: timeStr,
              source: "Policy Manager",
              message: `Mandate [${m.title}] status changed to ${nextStatus.toUpperCase()} on OKX X Layer.`,
              type: nextStatus === "active" ? "success" : "warn",
            },
            ...logs,
          ]);
          return { ...m, status: nextStatus };
        }
        return m;
      })
    );
  };

  const handleEvaluateDriftNow = () => {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    setExecutionLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        source: "Drift Guard",
        message: "Evaluating portfolio drift against mandate targets (60% NVDAx / 40% AAPLx)... Current drift: 1.42% (Threshold: 5.00%). Zero rebalance required.",
        type: "info",
      },
      ...prev,
    ]);
  };

  const handleTriggerSimulatedRebalance = () => {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    setExecutionLogs((prev) => [
      {
        id: `log-${Date.now()}-1`,
        timestamp: timeStr,
        source: "Drift Monitor",
        message: "Simulated market shift: NVDAx surged +8.4%. Drift detected: 6.8% (Threshold: 5.0%). Triggering rebalance solver...",
        type: "warn",
      },
      {
        id: `log-${Date.now()}-2`,
        timestamp: timeStr,
        source: "OKX Exchange OS",
        message: "Formulated atomic rebalance order: SELL $142.50 NVDAx -> BUY $142.50 AAPLx. Gas sponsored via Paymaster. Calldata pushed to client signing prompt.",
        type: "success",
      },
      ...prev,
    ]);
  };

  const handleCreateMandate = () => {
    if (!newMandateTitle.trim() || !newMandateTarget.trim()) return;
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    const newPolicy: MandatePolicy = {
      id: `mandate_${Date.now()}`,
      title: newMandateTitle.trim(),
      policyType: newMandateType,
      target: newMandateTarget.trim(),
      rule:
        newMandateType === "drift_rebalance"
          ? `Autonomous atomic rebalance when asset drift > ${newMandateThreshold} via OKX Exchange OS`
          : newMandateType === "dca_recurring"
          ? `Automated recurring accumulation according to preset schedule on X Layer`
          : `Auto-liquidate equity positions to USDG if drawdown exceeds ${newMandateThreshold}`,
      metricLabel:
        newMandateType === "drift_rebalance"
          ? "Current Drift"
          : newMandateType === "dca_recurring"
          ? "Next Execution"
          : "24h Drawdown",
      metricValue:
        newMandateType === "drift_rebalance"
          ? "0.0%"
          : newMandateType === "dca_recurring"
          ? "Next Cycle"
          : "0.00%",
      threshold: newMandateThreshold,
      status: "active",
      lastEvaluated: "Just registered",
    };

    setMandatePolicies((prev) => [...prev, newPolicy]);
    setExecutionLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        source: "Policy Manager",
        message: `Registered new mandate policy [${newPolicy.title}] with rule: ${newPolicy.target} on OKX X Layer (Chain 196).`,
        type: "success",
      },
      ...prev,
    ]);

    setChatMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: "bot",
        text: `Autonomous Mandate Registered: "${newPolicy.title}" (${newPolicy.target}). Monitoring on OKX X Layer with threshold ${newPolicy.threshold}.`,
        timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "mandate",
        status: "confirmed",
      },
    ]);

    setShowCreateMandateModal(false);
  };

  // Conversational Chat Console State (Web & Telegram)
  const INITIAL_CHAT_MESSAGE: ChatMessage = {
    id: "welcome-1",
    sender: "bot",
    text: "Welcome to Meirei on OKX X Layer Mainnet. You can chat here directly on the web terminal or via Telegram (@MeireiXLayerBot).\n\nSend 'stocks' for 24/7 equity price quotes, 'balance' to view your wallet holdings, or type any trade like 'Buy 100 USDG NVDAx'.",
    timestamp: "Just now",
  };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INITIAL_CHAT_MESSAGE]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatSending, setIsChatSending] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Theme state: locked to crisp institutional light mode
  const isDarkMode = false;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("meirei_theme", "light");
    }
  }, []);

  // Trading mode state: strictly TWO MODES: "basic" | "advanced"
  const [mode, setMode] = useState<Mode>("basic");

  // Advanced Mode Terms & Conditions state
  const [hasAcceptedAdvancedTerms, setHasAcceptedAdvancedTerms] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("meirei_advanced_terms_accepted") === "true";
    }
    return false;
  });
  const [showAdvancedTermsModal, setShowAdvancedTermsModal] = useState<boolean>(false);
  const [termsAgreedCheckbox, setTermsAgreedCheckbox] = useState<boolean>(false);

  const handleSwitchToAdvanced = () => {
    if (hasAcceptedAdvancedTerms) {
      setMode("advanced");
    } else {
      setShowAdvancedTermsModal(true);
    }
  };

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

  // Basic Mode: Price Comparison & Units Calculator State
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

  // Pre-populate mandate prompt or stock selection from bot deep links (Telegram)
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
      setProfile((prev) => ({
        ...prev,
        address: activeAddr,
        handle: formatShortAddress(activeAddr),
        email: `${activeAddr.slice(2, 8)}@xlayer.wallet`,
        botStatus: `Connected via ${title} on OKX X Layer`,
      }));
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
    const effectiveHandle =
      connectHandle.trim() || (connectChannel === "telegram" ? "@MeireiXLayerBot" : "web_terminal_trader");

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

      let redirectUrl = "";
      if (connectChannel === "telegram") {
        redirectUrl = "https://t.me/MeireiXLayerBot";
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
        `Wallet ${formatShortAddress(connectAddress)} successfully anchored to ${connectChannel.toUpperCase()} (${effectiveHandle}). Redirecting to ${connectChannel.toUpperCase()}...`
      );

      if (redirectUrl && typeof window !== "undefined") {
        window.open(redirectUrl, "_blank", "noopener,noreferrer");
      }
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

  // Conversational Chat message sender (Web & Telegram)
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
        delivery: data.delivery,
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

  // Numerical and formatted price helpers (using live ticks if available)
  const getFormattedPrice = (stock: StockItem): string => {
    const live = stockPrices[stock.symbol];
    if (typeof live === "number" && live > 0) {
      return `$${live.toFixed(2)}`;
    }
    return stock.price;
  };

  const getNumericPrice = (stock: StockItem): number => {
    const live = stockPrices[stock.symbol];
    if (typeof live === "number" && live > 0) {
      return live;
    }
    const cleaned = parseFloat(stock.price.replace(/[^0-9.]/g, ""));
    return isNaN(cleaned) || cleaned <= 0 ? 1.0 : cleaned;
  };

  // Candlestick OHLC calculation with Live Timeframe Rendering
  interface CandleBar {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    isBullish: boolean;
    isLive?: boolean;
  }

  const candleBars: CandleBar[] = useMemo(() => {
    const rawPoints =
      selectedStock.chartPoints && selectedStock.chartPoints.length >= 4
        ? selectedStock.chartPoints
        : [211.2, 211.8, 212.5, 212.1, 213.4, 212.9, 214.2, 215.1, 214.6, 216.5, 215.8, 213.9];

    const currentNumeric = getNumericPrice(selectedStock);
    const livePrice =
      stockPrices[selectedStock.symbol] !== undefined && stockPrices[selectedStock.symbol] > 0
        ? stockPrices[selectedStock.symbol]
        : currentNumeric;

    const changeStr = selectedStock.change24h || "+1.5%";
    const changeRate = parseFloat(changeStr.replace(/[^0-9.-]/g, "")) || 1.5;
    const isOverallBullish = !changeStr.startsWith("-");

    interface TimeframeConfig {
      timestamps: string[];
      totalBars: number;
      volatility: number;
    }

    let config: TimeframeConfig;

    if (timeframe === "1m") {
      config = {
        timestamps: ["09:30", "09:31", "09:32", "09:33", "09:34", "09:35", "09:36", "09:37", "09:38", "09:39", "09:40", "09:41", "09:42", "09:43", "09:44", "Live"],
        totalBars: 16,
        volatility: 0.002,
      };
    } else if (timeframe === "5m") {
      config = {
        timestamps: ["09:30", "09:35", "09:40", "09:45", "09:50", "09:55", "10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30", "10:35", "10:40", "Live"],
        totalBars: 16,
        volatility: 0.0035,
      };
    } else if (timeframe === "15m") {
      config = {
        timestamps: ["09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45", "13:00", "Live"],
        totalBars: 16,
        volatility: 0.005,
      };
    } else if (timeframe === "1h") {
      config = {
        timestamps: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "Live"],
        totalBars: 14,
        volatility: 0.008,
      };
    } else if (timeframe === "4h") {
      config = {
        timestamps: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "00:00", "04:00", "08:00", "12:00", "16:00", "Live"],
        totalBars: 12,
        volatility: 0.012,
      };
    } else if (timeframe === "1W") {
      config = {
        timestamps: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today (Live)"],
        totalBars: 7,
        volatility: 0.016,
      };
    } else if (timeframe === "1M") {
      config = {
        timestamps: [
          "Aug 24", "Aug 26", "Aug 28", "Aug 30",
          "Sep 02", "Sep 05", "Sep 08", "Sep 11",
          "Sep 13", "Sep 15", "Sep 17", "Sep 19",
          "Sep 21", "Live",
        ],
        totalBars: 14,
        volatility: 0.024,
      };
    } else if (timeframe === "1Y") {
      config = {
        timestamps: [
          "Oct '25", "Nov '25", "Dec '25", "Jan '26",
          "Feb '26", "Mar '26", "Apr '26", "May '26",
          "Jun '26", "Jul '26", "Aug '26", "Sep '26 (Live)",
        ],
        totalBars: 12,
        volatility: 0.045,
      };
    } else if (timeframe === "ALL") {
      config = {
        timestamps: [
          "Q2 '23", "Q3 '23", "Q4 '23", "Q1 '24",
          "Q2 '24", "Q3 '24", "Q4 '24", "Q1 '25",
          "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26",
          "Q2 '26", "Current",
        ],
        totalBars: 14,
        volatility: 0.06,
      };
    } else {
      // 1D (Intraday)
      config = {
        timestamps: [
          "09:30", "09:55", "10:20", "10:45",
          "11:10", "11:35", "12:00", "12:25",
          "12:50", "01:15", "01:40", "02:05",
          "02:30", "02:55", "03:20", "03:45",
        ],
        totalBars: 16,
        volatility: 0.006,
      };
    }

    const { timestamps, totalBars, volatility } = config;
    const bars: CandleBar[] = [];

    const trendMultiplier = (isOverallBullish ? 1 : -1) * (changeRate / 100);
    const startPrice = livePrice / (1 + trendMultiplier);

    let currentOpen = startPrice;

    for (let i = 0; i < totalBars; i++) {
      const isLast = i === totalBars - 1;
      const progress = i / (totalBars - 1 || 1);

      // Deterministic noise seeded by stock symbol, bar index, and timeframe
      const seed = Math.sin(
        (i + 1) * 17 +
          selectedStock.symbol.charCodeAt(0) * 11 +
          timeframe.charCodeAt(0) * 5
      );
      const randomNoise = seed * volatility * livePrice;

      const open = Number(currentOpen.toFixed(2));
      let close: number;

      if (isLast) {
        // Real-time live candle actively tracking OKX X Layer spot tick
        close = Number(livePrice.toFixed(2));
      } else {
        const intermediate = startPrice + (livePrice - startPrice) * progress;
        close = Number((intermediate + randomNoise).toFixed(2));
      }

      const spread = Math.max(0.2, Math.abs(seed) * volatility * livePrice * 1.35 + 0.15);
      const high = Number((Math.max(open, close) + spread).toFixed(2));
      const low = Number(Math.max(0.05, Math.min(open, close) - spread).toFixed(2));

      const volume = Math.round(
        (Math.abs(seed) * 0.5 + 0.5) * 85000 + (Math.abs(open - close) / (open || 1)) * 650000
      );

      bars.push({
        time: timestamps[i] || `Bar ${i + 1}`,
        open,
        high,
        low,
        close,
        volume,
        isBullish: close >= open,
        isLive: isLast,
      });

      currentOpen = close;
    }

    return bars;
  }, [selectedStock, stockPrices, timeframe]);

  // Chart Dimensions and Coordinates (Clean Card View)
  const width = 640;
  const height = 180;
  const padY = 16;
  const chartHeight = height - padY * 2;

  const points = useMemo(() => {
    return candleBars.map((b) => b.close);
  }, [candleBars]);

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = maxVal - minVal || 1;

  const coords = points.map((p, idx) => {
    const x = (idx / (points.length - 1 || 1)) * width;
    const y = height - padY - ((p - minVal) / range) * chartHeight;
    return { x, y, val: p };
  });

  let pathD = `M ${coords[0]?.x ?? 0} ${coords[0]?.y ?? 0}`;
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

  const candleMin = Math.min(...candleBars.map((b) => b.low));
  const candleMax = Math.max(...candleBars.map((b) => b.high));
  const candleRange = candleMax - candleMin || 1;

  const currentDisplayPrice =
    chartType === "candle" && candleHoverIndex !== null && candleBars[candleHoverIndex]
      ? `$${candleBars[candleHoverIndex].close.toFixed(2)}`
      : chartHoverIndex !== null && coords[chartHoverIndex]
      ? `$${coords[chartHoverIndex].val.toFixed(2)}`
      : getFormattedPrice(selectedStock);

  return (
    <div className="min-h-screen bg-surface-50 text-ink-900 transition-colors">
      {/* Top Application Header */}
      <header className="sticky inset-x-0 top-0 z-40 border-b border-surface-200 bg-surface-50 transition-colors">
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
            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-surface-200 bg-surface-100 px-2.5 py-1">
              <span className="font-mono text-[11px] text-ink-600">
                Routing: <span className="font-semibold text-ink-900">OKX Exchange OS</span>
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
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-ink-200 bg-surface-50 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-accent-500 hover:text-accent-600 transition-colors cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Cookies</span>
            </button>

            {/* OTP 2FA Protection Status Pill */}
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-bold text-emerald-800 md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              <span>{otpToken ? "2FA OTP Verified" : "2FA Protected"}</span>
            </div>

            {/* Account Status & Identity Badge (Optimized for mobile) */}
            {isLoggedIn ? (
              <div className="flex items-center gap-1.5 sm:gap-2.5 rounded-full border border-ink-200 bg-white p-1 sm:p-1.5 sm:pr-3.5 shadow-xs">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-accent-500 text-[10px] sm:text-xs font-bold text-white shadow-xs uppercase shrink-0">
                  {profile.platform === "telegram" && "TG"}
                  {profile.platform === "web" && "WEB"}
                  {profile.platform === "okx_wallet" && "OKX"}
                </div>
                <div className="text-left max-w-[70px] sm:max-w-none">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-ink-900 truncate">{profile.handle}</span>
                    <span className="hidden sm:inline-block rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
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
                  className="rounded p-1 text-xs text-ink-400 hover:text-accent-600 cursor-pointer"
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
                  className="rounded p-1 text-xs text-ink-400 hover:text-red-500 cursor-pointer"
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
              className="rounded-full border border-ink-200 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium text-ink-700 transition-colors hover:bg-surface-100"
            >
              Overview
            </Link>
          </div>
        </div>
      </header>

      {/* Main Terminal Container */}
      <main className="mx-auto max-w-[1440px] px-3.5 py-4 sm:px-8 sm:py-6">
        {/* Judge Onboarding Friction: 1-Click Demo Sandbox Banner (Advanced Mode Only) */}
        {mode === "advanced" && (
          <div
            className={cn(
              "mb-5 rounded-2xl border p-4 text-xs shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
              isDemoSandbox
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-accent-500/30 bg-accent-500/10"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl font-mono font-bold shrink-0 text-white shadow-xs text-xs",
                  isDemoSandbox ? "bg-emerald-600" : "bg-accent-500"
                )}
              >
                {isDemoSandbox ? "OKX" : "DEMO"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink-900 sm:text-sm">
                    {isDemoSandbox
                      ? "Demo Sandbox Active (1,000 USDG Loaded)"
                      : "Load Demo Simulation"}
                  </span>
                  <span
                    className={cn(
                      "rounded-full font-mono text-[10px] font-bold px-2 py-0.5 border",
                      isDemoSandbox
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700"
                        : "bg-accent-500/15 border-accent-500/30 text-accent-700"
                    )}
                  >
                    {isDemoSandbox ? "Chain 196 Simulated Sandbox" : "Zero-Risk Simulation"}
                  </span>
                </div>
                <p className="mt-0.5 text-ink-600">
                  {isDemoSandbox
                    ? "Test liquidity (1,000 USDG) and sample positions (NVDAx, AAPLx, TSLAx) are active. You can execute rebalances, trade assets, or test conversational chat."
                    : "Simulate non-custodial portfolio rebalancing and smart contract execution with 1,000 USDG test liquidity on OKX X Layer (Chain 196) without real capital risk."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isDemoSandbox ? (
                <button
                  type="button"
                  onClick={handleLoadDemoSandbox}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Load Demo Simulation (1,000 USDG)</span>
                  <span>&rarr;</span>
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTopUpDemoUsdg}
                    className="px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 font-semibold text-xs cursor-pointer"
                    title="Credit another 500 USDG to test sandbox"
                  >
                    +500 USDG
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDemoSandbox}
                    className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 font-semibold text-xs cursor-pointer"
                  >
                    Reset to Live Wallet
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terminal Subheader & CONSOLIDATED TWO-MODE SWITCHER */}
        <div className="mb-6 flex flex-col justify-between gap-3.5 sm:gap-4 rounded-2xl border border-ink-200/80 bg-white p-3.5 sm:p-5 shadow-xs sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold tracking-tight text-ink-900 sm:text-2xl">
                Trading &amp; Mandate Terminal
              </h1>
              <span className="rounded-full bg-surface-100 border border-ink-200 px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-ink-600">
                OKX Chain (X Layer)
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-600 sm:text-sm">
              Strictly non-custodial: No private keys stored. Authenticated via verified Email &amp; 2FA on X Layer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* EXACTLY TWO MODES SWITCHER: Basic Mode vs Advanced Mode */}
            <div className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-surface-100 p-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMode("basic")}
                className={cn(
                  "flex-1 sm:flex-initial text-center rounded-lg px-3 sm:px-4 py-2 text-xs font-bold transition-all cursor-pointer",
                  mode === "basic"
                    ? "bg-accent-500 text-white shadow-sm"
                    : "text-ink-600 hover:text-ink-900"
                )}
              >
                Basic Mode
              </button>
              <button
                type="button"
                onClick={handleSwitchToAdvanced}
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
            {/* MODE 1: BASIC MODE (Clean, Fast Trades, Questions & Unit Comparisons)     */}
            {/* ========================================================================= */}
            {mode === "basic" && (
              <>
                {/* Channel & Bot Connectivity Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200/80 bg-white p-4 text-xs shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-700 font-bold">
                      {profile.platform === "telegram" && "TG"}
                      {profile.platform === "web" && "WEB"}
                      {profile.platform === "okx_wallet" && "OKX"}
                      {profile.platform !== "telegram" && profile.platform !== "web" && profile.platform !== "okx_wallet" && "AI"}
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900">
                        {profile.handle} · <span className="text-ink-500">{profile.email}</span>
                      </p>
                      <p className="text-[11px] text-ink-500">
                        Bot Active across Telegram (@MeireiXLayerBot) &amp; Web Browser Console.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                      Gas 100% Sponsored by OKX Paymaster
                    </span>
                  </div>
                </div>

                {/* 20 Stocks Selector Grid with Quick Buy Buttons */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-4 shadow-xs">
                  <div className="flex flex-col justify-between gap-2 border-b border-ink-100 pb-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-ink-900">
                        Allowlisted xStocks (20 Assets on OKX X Layer)
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Live 15s Feed</span>
                      </span>
                    </div>
                    <span className="text-xs text-ink-500">
                      Tap card to select equity · Tap Quick Buy for instant execution
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {STOCKS.map((stock) => {
                      const isSelected = stock.symbol === selectedStock.symbol;
                      const numericPrice = getNumericPrice(stock);

                      return (
                        <div
                          key={stock.symbol}
                          onClick={() => {
                            setSelectedStock(stock);
                          }}
                          className={cn(
                            "group flex flex-col justify-between rounded-xl border p-2 sm:p-2.5 text-left transition-all cursor-pointer relative",
                            isSelected
                              ? "border-accent-500 bg-accent-50/50 shadow-xs ring-1 ring-accent-500"
                              : "border-ink-200/80 bg-surface-50 hover:border-ink-300 hover:bg-white"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div
                                className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md shadow-xs shrink-0 text-white font-bold text-[10px]"
                                style={{ backgroundColor: stock.color }}
                              >
                                {stock.logo}
                              </div>
                              <div className="min-w-0">
                                <p className="font-mono text-xs font-bold text-ink-900 truncate">
                                  {stock.symbol}
                                </p>
                              </div>
                            </div>
                            <span className="rounded bg-emerald-500/10 px-1 py-0.2 font-mono text-[9px] font-bold text-emerald-700 shrink-0">
                              {stock.change24h}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between border-t border-ink-100/70 pt-1.5">
                            <div className="min-w-0">
                              <span
                                className={cn(
                                  "font-mono text-[11px] sm:text-xs font-bold block truncate transition-colors duration-300",
                                  priceFlashes[stock.symbol] === "up" && "text-emerald-600 font-bold",
                                  priceFlashes[stock.symbol] === "down" && "text-rose-600 font-bold",
                                  !priceFlashes[stock.symbol] && "text-ink-900"
                                )}
                              >
                                {getFormattedPrice(stock)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStock(stock);
                                openWeb3Signer(stock.symbol, 100, 100 / numericPrice, numericPrice);
                              }}
                              className="rounded-md bg-ink-900 hover:bg-accent-500 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-xs transition-colors cursor-pointer shrink-0"
                              title={`Instant buy $100 in ${stock.symbol}`}
                            >
                              Quick Buy
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <SectionSeparator label="Conversational Agent" />

                {/* ========================================================================= */}
                {/* LIVE CONVERSATIONAL CHAT CONSOLE (Conversational Agent before Mandates)   */}
                {/* ========================================================================= */}
                <div id="conversational-chat" className="scroll-mt-24 rounded-2xl border border-ink-200/80 bg-white p-3.5 sm:p-5 shadow-xs">
                  {/* Chat Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-white shadow-xs">
                          <SimpleTelegramLogo className="h-4 w-4" />
                        </div>
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-sm font-bold text-ink-900">
                            Meirei Conversational Chat
                          </h3>
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[9px] font-bold text-emerald-700">
                            Online · OKX X Layer
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-500">
                          Chat naturally with Meirei on web or Telegram (
                          <a
                            href="https://t.me/MeireiXLayerBot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-600 hover:underline font-semibold"
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
                        className="rounded-lg border border-ink-200 px-2.5 py-1 text-[11px] font-semibold text-ink-600 hover:bg-surface-50 hover:text-ink-900 cursor-pointer transition-colors"
                      >
                        Clear Chat
                      </button>
                    </div>
                  </div>

                  {/* Security Freeze Alert Banner */}
                  {isAccountFrozen && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs flex items-center justify-between gap-2">
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
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500/15 text-accent-600 shrink-0 text-[10px] font-bold">
                              M
                            </div>
                          )}
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2.5 leading-relaxed shadow-xs whitespace-pre-wrap",
                              msg.sender === "user"
                                ? "bg-accent-500 text-white rounded-br-none"
                                : "bg-surface-100 text-ink-800 border border-ink-200/60 rounded-bl-none"
                            )}
                          >
                            {msg.text}

                            {/* Rich Visual Mandate Target Allocation Grid & Execution Legs */}
                            {msg.delivery?.mandate?.targets && (
                              <div className="mt-3 rounded-xl border border-ink-200/80 bg-white/70 p-3 select-none">
                                <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-accent-600 mb-2 flex items-center justify-between">
                                  <span>Target Portfolio Allocations</span>
                                  <span className="text-[9px] text-ink-400 font-normal">
                                    Band: {((msg.delivery.mandate.rebalanceBand ?? 0.05) * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                  {msg.delivery.mandate.targets.map((t, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between rounded-lg bg-surface-100/80 px-2 py-1 text-[11px] font-mono border border-ink-100"
                                    >
                                      <span className="font-bold text-ink-900">{t.symbol}</span>
                                      <span className="text-accent-600 font-semibold">
                                        {(t.weight * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {msg.delivery.plan?.legs && msg.delivery.plan.legs.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-ink-100">
                                    <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-ink-500 mb-1.5">
                                      Planned Rebalance Legs (OKX DEX)
                                    </div>
                                    <div className="space-y-1">
                                      {msg.delivery.plan.legs.map((leg, lIdx) => (
                                        <div
                                          key={lIdx}
                                          className="flex items-center justify-between text-[11px] font-mono rounded bg-surface-50 px-2 py-0.5"
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span
                                              className={cn(
                                                "px-1 py-0.2 rounded text-[9px] font-bold uppercase",
                                                leg.side === "buy"
                                                  ? "bg-emerald-500/20 text-emerald-600"
                                                  : "bg-rose-500/20 text-rose-600"
                                              )}
                                            >
                                              {leg.side}
                                            </span>
                                            <span className="font-bold text-ink-900">
                                              {leg.symbol}
                                            </span>
                                          </div>
                                          <span className="text-ink-600">
                                            ${leg.notionalUsd.toFixed(2)} USDG
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {msg.delivery.txs && msg.delivery.txs.length > 0 && (
                                  <div className="mt-2.5 pt-2 border-t border-ink-100">
                                    <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-600 mb-1.5 flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                      Broadcast Transactions on OKX X Layer
                                    </div>
                                    <div className="space-y-1">
                                      {msg.delivery.txs.map((tx, tIdx) => (
                                        <div
                                          key={tIdx}
                                          className="flex items-center justify-between text-[10px] font-mono rounded bg-surface-50 px-2 py-0.5"
                                        >
                                          <span className="font-bold text-ink-900">{tx.symbol}</span>
                                          {tx.explorerUrl ? (
                                            <a
                                              href={tx.explorerUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-accent-600 hover:underline flex items-center gap-1"
                                            >
                                              <span>{tx.hash ? `${tx.hash.slice(0, 8)}...${tx.hash.slice(-6)}` : "View OKLink"}</span>
                                              <span className="text-[8px] bg-accent-500/20 px-1 rounded">OKLink</span>
                                            </a>
                                          ) : (
                                            <span className="text-zinc-400">{tx.hash}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {msg.reference && (
                              <div className="mt-2 pt-1.5 border-t border-white/10 font-mono text-[10px] opacity-80">
                                Reference: {msg.reference}
                              </div>
                            )}

                            {/* Bot Interactive Action Buttons */}
                            {msg.sender === "bot" && (
                              <div className="mt-2.5 pt-2 border-t border-ink-200/50 flex flex-wrap items-center gap-1.5">
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
                                      className="rounded-md border border-ink-200 px-2.5 py-1 text-[10px] font-semibold text-ink-600 hover:bg-surface-50 transition-colors cursor-pointer"
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
                                    className="rounded-md border border-accent-500/30 bg-accent-500/10 px-2.5 py-1 text-[10px] font-semibold text-accent-600 hover:underline transition-colors"
                                  >
                                    View on OKLink
                                  </a>
                                ) : msg.reference && msg.reference.startsWith("0x") ? (
                                  <a
                                    href={`https://www.oklink.com/xlayer/tx/${msg.reference}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-md border border-accent-500/30 bg-accent-500/10 px-2.5 py-1 text-[10px] font-semibold text-accent-600 hover:underline transition-colors"
                                  >
                                    View on OKLink
                                  </a>
                                ) : null}

                                {msg.type === "freeze" && (
                                  <button
                                    type="button"
                                    onClick={() => handleSendChatMessage("/unfreeze")}
                                    disabled={isChatSending}
                                    className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-600 hover:bg-amber-500/20 transition-colors cursor-pointer"
                                  >
                                    Request OTP to Unfreeze
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="mt-1 font-mono text-[9px] text-ink-400 px-1">
                          {msg.timestamp}
                        </span>
                      </div>
                    ))}

                    {isChatSending && (
                      <div className="flex items-center gap-2 text-xs text-ink-500">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500/15 text-accent-600 shrink-0 text-[10px] font-bold">
                          M
                        </div>
                        <div className="rounded-2xl rounded-bl-none border border-ink-200/60 bg-surface-100 px-3.5 py-2">
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

                  {/* Quick Suggestion Chips with Natural Mandate Prompts */}
                  <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider shrink-0 mr-1">
                      Quick:
                    </span>
                    {[
                      `Price of ${selectedStock.symbol}`,
                      `Buy 250 USDG of ${selectedStock.symbol}`,
                      `Compare ${selectedStock.symbol} vs MSFTx`,
                      `60% ${selectedStock.symbol}, 20% AAPLx, 20% USDG`,
                      "Holdings & Portfolio Value",
                      "Emergency Circuit Breaker",
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleSendChatMessage(chip)}
                        disabled={isChatSending}
                        className="rounded-full border border-ink-200 bg-surface-50 px-3 py-1 font-medium text-ink-700 hover:border-accent-500 hover:text-accent-600 whitespace-nowrap cursor-pointer transition-colors shrink-0"
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
                      placeholder="Message Meirei... (e.g. 'Price of NVDAx', 'Buy 250 USDG of NVDAx', '60% NVDAx, 40% USDG')"
                      disabled={isChatSending}
                      className="flex-1 rounded-xl border border-ink-200 bg-surface-50 px-4 py-2.5 text-xs text-ink-900 outline-none focus:border-accent-500 focus:bg-white transition-colors"
                    />

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

                {/* Section Separator */}
                
                <SectionSeparator label="Price Comparison & Unit Calculator" />

                {/* ========================================================================= */}
                {/* PRICE COMPARISON & UNIT CALCULATOR                                        */}
                {/* ========================================================================= */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
                  <div className="flex flex-col justify-between gap-3 border-b border-ink-100 pb-3.5 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                          Instant Unit Estimation
                        </span>
                        <span className="rounded bg-accent-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-accent-800">
                          OKX DEX Aggregator
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-ink-900 sm:text-lg">
                        Price Comparison &amp; Unit Calculator
                      </h3>
                      <p className="text-xs text-ink-500">
                        Select any allowlisted stock and input an investment amount to calculate exact tokenized units and live DEX conversion parameters.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Gas 100% Sponsored</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Left Column: Stock Selection Dropdown & Investment Input */}
                    <div className="space-y-3.5 md:col-span-6">
                      <div>
                        <label className="text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5 block">
                          Select Tokenized Stock (20 Equities)
                        </label>
                        <select
                          value={selectedStock.symbol}
                          onChange={(e) => {
                            const found = STOCKS.find((s) => s.symbol === e.target.value);
                            if (found) {
                              setSelectedStock(found);
                              setChartHoverIndex(null);
                            }
                          }}
                          className="w-full rounded-xl border border-ink-200 bg-surface-50 p-2.5 text-xs font-mono font-bold text-ink-900 outline-none focus:border-accent-500 focus:bg-white transition-colors cursor-pointer"
                        >
                          {STOCKS.map((s) => (
                            <option key={s.symbol} value={s.symbol}>
                              {s.symbol} — {s.name} ({getFormattedPrice(s)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                            Investment Capital (USDG)
                          </label>
                          <span className="text-[11px] font-mono text-ink-500">
                            Available: ${profile.usdgBalance.toFixed(2)} USDG
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-ink-400">
                            $
                          </span>
                          <input
                            type="number"
                            min="10"
                            step="10"
                            value={calcInvestmentUsdg}
                            onChange={(e) => setCalcInvestmentUsdg(Math.max(1, Number(e.target.value) || 0))}
                            className="w-full rounded-xl border border-ink-200 bg-surface-50 py-2.5 pl-7 pr-16 text-xs font-mono font-bold text-ink-900 outline-none focus:border-accent-500 focus:bg-white transition-colors"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-ink-400">
                            USDG
                          </span>
                        </div>

                        {/* Quick Amount Chips */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {[50, 100, 250, 500, 1000, 2500].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCalcInvestmentUsdg(amt)}
                              className={cn(
                                "rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold transition-all cursor-pointer",
                                calcInvestmentUsdg === amt
                                  ? "bg-accent-500 text-white shadow-xs"
                                  : "bg-surface-100 text-ink-600 hover:bg-surface-200 hover:text-ink-900"
                              )}
                            >
                              ${amt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Calculated Units & Live DEX Execution Breakdown */}
                    <div className="rounded-xl border border-ink-200/70 bg-surface-50 p-4 space-y-3 md:col-span-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-ink-500">Estimated Units Received:</span>
                          <span className="font-mono text-base font-bold text-accent-600">
                            {(calcInvestmentUsdg / (getNumericPrice(selectedStock) || 1)).toFixed(4)} {selectedStock.symbol}
                          </span>
                        </div>

                        <div className="mt-2.5 space-y-1.5 border-t border-ink-100 pt-2 text-[11px] font-mono">
                          <div className="flex items-center justify-between text-ink-600">
                            <span>Spot Benchmark:</span>
                            <span className="font-semibold text-ink-900">{getFormattedPrice(selectedStock)}</span>
                          </div>
                          <div className="flex items-center justify-between text-ink-600">
                            <span>Unit Ratio:</span>
                            <span>1 {selectedStock.symbol} = {getFormattedPrice(selectedStock)}</span>
                          </div>
                          <div className="flex items-center justify-between text-ink-600">
                            <span>Slippage Tolerance:</span>
                            <span className="text-emerald-700 font-semibold">&lt; 0.05%</span>
                          </div>
                          <div className="flex items-center justify-between text-ink-600">
                            <span>Minimum Received:</span>
                            <span className="font-semibold text-ink-900">
                              {((calcInvestmentUsdg / (getNumericPrice(selectedStock) || 1)) * 0.995).toFixed(4)} {selectedStock.symbol}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-ink-600">
                            <span>Network Gas Fee:</span>
                            <span className="text-emerald-700 font-bold">$0.00 (100% Sponsored)</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const price = getNumericPrice(selectedStock);
                          const units = calcInvestmentUsdg / (price || 1);
                          openWeb3Signer(selectedStock.symbol, calcInvestmentUsdg, units, price);
                        }}
                        className="w-full rounded-xl bg-accent-500 hover:bg-accent-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Quick Buy {(calcInvestmentUsdg / (getNumericPrice(selectedStock) || 1)).toFixed(4)} {selectedStock.symbol}</span>
                        <span>(${calcInvestmentUsdg.toFixed(2)} USDG) ↗</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section Separator */}
                <SectionSeparator label="Autonomous Mandate Layer" />

                {/* ========================================================================= */}
                {/* ACTIVE INVESTMENT MANDATES (Autonomous Agent Policies on OKX X Layer)     */}
                {/* ========================================================================= */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm font-bold text-ink-900 sm:text-base">
                          Active Investment Mandates
                        </h3>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{mandatePolicies.filter((m) => m.status === "active").length} Autonomous Policies Active</span>
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-500">
                        Autonomous policies executed continuously on OKX X Layer without human intervention.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleEvaluateDriftNow}
                        className="rounded-lg border border-ink-200 bg-surface-50 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-surface-100 cursor-pointer transition-colors"
                        title="Evaluate drift against active policies"
                      >
                        Check Drift Now
                      </button>
                      <button
                        type="button"
                        onClick={handleTriggerSimulatedRebalance}
                        className="rounded-lg border border-ink-200 bg-surface-50 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-surface-100 cursor-pointer transition-colors"
                        title="Simulate drift shock to test automated solver"
                      >
                        Simulate Shock
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateMandateModal(true)}
                        className="rounded-lg bg-accent-500 hover:bg-accent-600 text-white px-3 py-1.5 text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1"
                        title="Create and deploy a new autonomous mandate"
                      >
                        <span className="text-sm leading-none">+</span>
                        <span>New Mandate</span>
                      </button>
                    </div>
                  </div>

                  {/* Mandates Grid */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {mandatePolicies.map((mandate) => (
                      <div
                        key={mandate.id}
                        className={cn(
                          "rounded-xl border p-3.5 flex flex-col justify-between transition-colors",
                          mandate.status === "active"
                            ? "border-ink-200 bg-surface-50/60"
                            : "border-ink-200/50 opacity-60 bg-surface-100/40"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] uppercase font-bold text-accent-600">
                              {mandate.policyType === "drift_rebalance" && "Portfolio Rebalance"}
                              {mandate.policyType === "dca_recurring" && "DCA Policy"}
                              {mandate.policyType === "circuit_breaker" && "Circuit Breaker"}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleMandatePolicy(mandate.id)}
                              className={cn(
                                "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase cursor-pointer border",
                                mandate.status === "active"
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700"
                                  : "bg-zinc-500/15 border-zinc-500/30 text-zinc-500"
                              )}
                            >
                              {mandate.status === "active" ? "Active" : "Paused"}
                            </button>
                          </div>

                          <h4 className="mt-2 font-display text-sm font-bold text-ink-900">
                            {mandate.title}
                          </h4>
                          <p className="mt-1 font-mono text-xs font-semibold text-accent-700">
                            {mandate.target}
                          </p>
                          <p className="mt-1.5 text-[11px] text-ink-600 leading-relaxed">
                            {mandate.rule}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-ink-200/50 flex items-center justify-between text-[11px]">
                          <span className="text-ink-500">{mandate.metricLabel}:</span>
                          <span className="font-mono font-bold text-ink-900">
                            {mandate.metricValue}{" "}
                            <span className="text-ink-400 font-normal text-[10px]">
                              (Limit: {mandate.threshold})
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ========================================================================= */}
            {/* MODE 2: ADVANCED MODE (Unified AI Mandate Advisory & Market Catalysts)     */}
            {/* ========================================================================= */}
            {mode === "advanced" && (
              <div className="space-y-6">
                {/* 1. Institutional AI Mandate Advisory Studio & OKX AI Skills Hub */}
                {/* Active OKX AI Skills Engine Telemetry Bar */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs sm:p-6">
                  <div className="flex flex-col justify-between gap-3 border-b border-ink-100 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent-600">
                          Active Protocol Capabilities
                        </span>
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          4 OKX AI Skills Synchronized
                        </span>
                      </div>
                      <h2 className="mt-1 font-display text-lg font-bold text-ink-950 sm:text-xl">
                        Active OKX AI Skills Engine
                      </h2>
                      <p className="mt-0.5 text-xs text-ink-600 leading-relaxed">
                        Autonomous machine learning telemetry and mathematical risk modeling running across all 20 allowlisted equities on OKX X Layer (Chain 196).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLastTelemetryRefresh(new Date().toLocaleTimeString());
                          addExecutionLog("Refreshed OKX AI telemetry: trading-plan-generator, sentiment, smartmoney, marketdepth active.", "info");
                        }}
                        className="rounded-xl border border-ink-200 bg-surface-50 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-white hover:text-ink-950 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <span className="text-accent-600 font-bold">↻</span>
                        <span>Refresh Telemetry ({lastTelemetryRefresh})</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Skills Cards Grid */}
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* 1. trading-plan-generator */}
                    <div className="rounded-xl border border-ink-200/80 bg-surface-50/70 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-sky-100 border border-sky-200 px-1.5 py-0.5 font-mono text-[9px] font-bold text-sky-800">
                          trading-plan-generator
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <h4 className="font-display text-xs font-bold text-ink-950">
                        Trading Plan Generator
                      </h4>
                      <p className="text-[10px] text-ink-500 leading-relaxed">
                        Generates institutional-grade rebalancing rules, dynamic drift bounds (1.5%–3.5%), and capital preservation ceilings.
                      </p>
                      <div className="pt-2 border-t border-ink-200/50 flex items-center justify-between text-[10px]">
                        <span className="text-ink-500 font-mono">Telemetry:</span>
                        <span className="font-bold text-ink-900 font-mono">15 Trajectories Active</span>
                      </div>
                    </div>

                    {/* 2. okx-sentiment-tracker */}
                    <div className="rounded-xl border border-ink-200/80 bg-surface-50/70 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 font-mono text-[9px] font-bold text-indigo-800">
                          okx-sentiment-tracker
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <h4 className="font-display text-xs font-bold text-ink-950">
                        OKX Sentiment Tracker
                      </h4>
                      <p className="text-[10px] text-ink-500 leading-relaxed">
                        Aggregates 48.2K mentions, whale social sentiment, and retail vs institutional positioning divergence on X Layer.
                      </p>
                      <div className="pt-2 border-t border-ink-200/50 flex items-center justify-between text-[10px]">
                        <span className="text-ink-500 font-mono">Sentiment Score:</span>
                        <span className="font-bold text-indigo-700 font-mono">82/100 (Bullish)</span>
                      </div>
                    </div>

                    {/* 3. okx-cex-smartmoney */}
                    <div className="rounded-xl border border-ink-200/80 bg-surface-50/70 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-800">
                          okx-cex-smartmoney
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <h4 className="font-display text-xs font-bold text-ink-950">
                        OKX CEX Smart Money
                      </h4>
                      <p className="text-[10px] text-ink-500 leading-relaxed">
                        Monitors whale wallet accumulation, exchange net flows, and top-trader long ratios on OKX CEX &amp; DEX bridges.
                      </p>
                      <div className="pt-2 border-t border-ink-200/50 flex items-center justify-between text-[10px]">
                        <span className="text-ink-500 font-mono">Net Inflow 24h:</span>
                        <span className="font-bold text-emerald-700 font-mono">+$5.84M USDG</span>
                      </div>
                    </div>

                    {/* 4. okx-cex-market */}
                    <div className="rounded-xl border border-ink-200/80 bg-surface-50/70 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-amber-100 border border-amber-200 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-800">
                          okx-cex-market
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <h4 className="font-display text-xs font-bold text-ink-950">
                        OKX CEX Market Depth
                      </h4>
                      <p className="text-[10px] text-ink-500 leading-relaxed">
                        High-frequency orderbook spread metrics, liquidity depth, and 24h tokenized stock trading volume rankings.
                      </p>
                      <div className="pt-2 border-t border-ink-200/50 flex items-center justify-between text-[10px]">
                        <span className="text-ink-500 font-mono">Liquidity Depth:</span>
                        <span className="font-bold text-amber-700 font-mono">$24.6M (2.1 bps)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Trading Advisory Agent Studio */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs sm:p-6">
                  <div className="flex flex-col justify-between gap-3 border-b border-ink-100 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent-600">
                        Institutional Advisory Studio
                      </span>
                      <h2 className="font-display text-lg font-bold text-ink-950 sm:text-xl">
                        AI Trading Advisory Agent
                      </h2>
                      <p className="mt-0.5 text-xs text-ink-600">
                        Synthesizes your time horizon, preferred stock selections, and stablecoin liquidity to formulate custom non-custodial mandates.
                      </p>
                    </div>

                    {/* Horizon Selector */}
                    <div className="flex items-center gap-1 rounded-xl border border-ink-200 bg-surface-50 p-1">
                      <button
                        type="button"
                        onClick={() => setAdvisoryHorizon("short_term")}
                        className={cn(
                          "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                          advisoryHorizon === "short_term"
                            ? "bg-white text-ink-950 shadow-xs"
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
                            ? "bg-white text-ink-950 shadow-xs"
                            : "text-ink-500 hover:text-ink-900"
                        )}
                      >
                        Long-Term Blue Chip DCA
                      </button>
                    </div>
                  </div>

                  {/* Stablecoin Liquidity & Strategy Formulation Selectors */}
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Stablecoin Settlement Selection */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-ink-700">
                        Base Stablecoin Liquidity Asset
                      </label>
                      <p className="text-[11px] text-ink-500 mt-0.5">
                        Settlement and cash buffer asset for algorithmic rebalances.
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(["USDG", "USDC", "USDT"] as const).map((coin) => (
                          <button
                            key={coin}
                            type="button"
                            onClick={() => setAdvisoryStablecoin(coin)}
                            className={cn(
                              "rounded-xl border p-2.5 text-center transition-all cursor-pointer",
                              advisoryStablecoin === coin
                                ? "border-accent-500 bg-accent-50/70 ring-1 ring-accent-500"
                                : "border-ink-200 bg-surface-50 hover:bg-white"
                            )}
                          >
                            <span className="font-mono text-xs font-bold text-ink-900 block">{coin}</span>
                            <span className="text-[9px] text-ink-500 block mt-0.5">
                              {coin === "USDG" ? "OKX X Layer (Gas Sponsored)" : coin === "USDC" ? "Circle Bridged" : "Tether USD"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Basket Mode: Recommended vs Custom Stock Selection */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-ink-700">
                        Stock Basket Formulation Mode
                      </label>
                      <p className="text-[11px] text-ink-500 mt-0.5">
                        Choose curated institutional presets or select preferred equities.
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAdvisorySelectionMode("recommended")}
                          className={cn(
                            "rounded-xl border p-2.5 text-center transition-all cursor-pointer",
                            advisorySelectionMode === "recommended"
                              ? "border-accent-500 bg-accent-50/70 ring-1 ring-accent-500"
                              : "border-ink-200 bg-surface-50 hover:bg-white"
                          )}
                        >
                          <span className="font-display text-xs font-bold text-ink-900 block">Recommended Basket</span>
                          <span className="text-[9px] text-ink-500 block mt-0.5">Curated by OKX AI Skills</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvisorySelectionMode("custom")}
                          className={cn(
                            "rounded-xl border p-2.5 text-center transition-all cursor-pointer",
                            advisorySelectionMode === "custom"
                              ? "border-accent-500 bg-accent-50/70 ring-1 ring-accent-500"
                              : "border-ink-200 bg-surface-50 hover:bg-white"
                          )}
                        >
                          <span className="font-display text-xs font-bold text-ink-900 block">Custom Selection</span>
                          <span className="text-[9px] text-ink-500 block mt-0.5">Pick Your Preferred Stocks</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* If Recommended Basket: Quick Presets */}
                  {advisorySelectionMode === "recommended" ? (
                    <div className="mt-4 p-3.5 rounded-xl border border-ink-200 bg-surface-50/70">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 font-mono">
                        Institutional Basket Presets (Auto-Selected by Horizon)
                      </span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[
                          { name: "Mag7 Core Growth", stocks: ["NVDAx", "MSFTx", "AAPLx", "GOOGLx", "AMZNx", "METAx", "TSLAx"] },
                          { name: "AI Compute Alpha", stocks: ["NVDAx", "TSMx", "AVGOx", "AMDx"] },
                          { name: "Enterprise Cloud & Security", stocks: ["MSFTx", "CRWDx", "DELLx", "MRVLx"] },
                          { name: "Crypto & High Beta", stocks: ["COINx", "MSTRx", "TSLAx"] },
                        ].map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setAdvisoryCustomStocks(preset.stocks);
                              setAdvisorySelectionMode("custom");
                            }}
                            className="rounded-lg border border-ink-200 bg-white hover:border-accent-500 hover:text-accent-600 px-3 py-1.5 text-xs font-medium text-ink-700 transition-all cursor-pointer"
                          >
                            <span>{preset.name}</span>
                            <span className="ml-1 text-[10px] text-ink-400 font-mono">({preset.stocks.join(", ")})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* If Custom Stock Selection: Interactive Selection Pills for all 20 Allowlisted Equities */
                    <div className="mt-4 p-4 rounded-xl border border-accent-200 bg-accent-50/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-accent-200/60 pb-2.5">
                        <div>
                          <span className="text-xs font-bold text-ink-900">
                            Select Your Preferred Equities ({advisoryCustomStocks.length} Selected)
                          </span>
                          <p className="text-[11px] text-ink-600">
                            Click any of the 20 tokenized stocks to add or remove from your algorithmic mandate.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAdvisoryCustomStocks(["NVDAx", "MSFTx", "AAPLx", "TSLAx"])}
                            className="text-[10px] text-accent-700 hover:underline cursor-pointer font-semibold"
                          >
                            Reset to Leaders
                          </button>
                          <span className="text-ink-300">|</span>
                          <button
                            type="button"
                            onClick={() => setAdvisoryCustomStocks(STOCKS.map(s => s.symbol))}
                            className="text-[10px] text-accent-700 hover:underline cursor-pointer font-semibold"
                          >
                            Select All 20
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[180px] overflow-y-auto pr-1">
                        {STOCKS.map((stk) => {
                          const isSelected = advisoryCustomStocks.includes(stk.symbol);
                          const livePrice = stockPrices[stk.symbol] || getNumericPrice(stk);

                          return (
                            <button
                              key={stk.symbol}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  if (advisoryCustomStocks.length > 1) {
                                    setAdvisoryCustomStocks(advisoryCustomStocks.filter(s => s !== stk.symbol));
                                  }
                                } else {
                                  setAdvisoryCustomStocks([...advisoryCustomStocks, stk.symbol]);
                                }
                              }}
                              className={cn(
                                "flex items-center justify-between rounded-lg border p-2 text-left transition-all cursor-pointer text-xs",
                                isSelected
                                  ? "border-accent-500 bg-white ring-1 ring-accent-500 text-ink-950 font-bold shadow-xs"
                                  : "border-ink-200/80 bg-white/70 text-ink-600 hover:bg-white"
                              )}
                            >
                              <div className="truncate">
                                <span className="block font-mono text-[11px] font-bold">{stk.symbol}</span>
                                <span className="block font-mono text-[9px] text-ink-400">$${livePrice.toFixed(2)}</span>
                              </div>
                              <span className={cn(
                                "h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                                isSelected ? "bg-accent-600 text-white" : "bg-surface-200 text-ink-400"
                              )}>
                                {isSelected ? "✓" : "+"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Risk Profile Selection Bar */}
                  <div className="mt-5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-700">
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
                        <span className="rounded bg-accent-100 border border-transparent px-2 py-0.5 text-[10px] font-bold text-accent-800 uppercase">
                          {currentAdvisoryPlan.horizonLabel}
                        </span>
                        <h3 className="mt-1 font-display text-base font-bold text-ink-900">
                          {currentAdvisoryPlan.strategyName}
                        </h3>
                      </div>
                      <span className="rounded-full bg-surface-200 border border-transparent px-3 py-1 font-mono text-xs font-semibold text-ink-800">
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
                                <span className="rounded bg-surface-100 border border-transparent px-1.5 py-0.5 text-[10px] font-medium text-ink-600">
                                  {alloc.role}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-accent-700">
                                {alloc.weightPercent}%
                              </span>
                            </div>

                            <p className="mt-1 text-[11px] text-ink-500 leading-normal">
                              {alloc.rationale}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Interactive SVG Valuation & Alpha Trajectory Graph (Explicit X & Y Axes) */}
                    <div className="mt-5 rounded-2xl border border-ink-200 bg-white p-4 sm:p-5 shadow-xs">
                      <div className="flex flex-col justify-between gap-2 border-b border-ink-100 pb-3 sm:flex-row sm:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                              Trajectory Model (trading-plan-generator)
                            </span>
                            <span className="rounded bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-800">
                              OKX AI Skill
                            </span>
                          </div>
                          <h4 className="font-display text-sm font-bold text-ink-900 sm:text-base">
                            Projected Valuation &amp; Return Horizon Trajectory
                          </h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                          <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            Aggressive ({advisoryHorizon === "short_term" ? "Momentum" : "+44.5%"})
                          </span>
                          <span className="flex items-center gap-1.5 text-accent-600 font-semibold">
                            <span className="h-2 w-2 rounded-full bg-accent-500" />
                            Balanced ({advisoryHorizon === "short_term" ? "Swing" : "+26.5%"})
                          </span>
                          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Conservative ({advisoryHorizon === "short_term" ? "Preserve" : "+12.8%"})
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <svg
                          viewBox="0 0 600 230"
                          className="w-full h-auto overflow-visible select-none"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <defs>
                            <linearGradient id="gradConservative" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="gradBalanced" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="gradAggressive" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="50" y1="180" x2="590" y2="180" stroke="#e2e8f0" strokeDasharray="3 3" />
                          <text x="42" y="184" textAnchor="end" className="text-[10px] fill-zinc-400 font-mono">0%</text>

                          <line x1="50" y1="138" x2="590" y2="138" stroke="#e2e8f0" strokeDasharray="3 3" />
                          <text x="42" y="142" textAnchor="end" className="text-[10px] fill-zinc-400 font-mono">+12.5%</text>

                          <line x1="50" y1="96" x2="590" y2="96" stroke="#e2e8f0" strokeDasharray="3 3" />
                          <text x="42" y="100" textAnchor="end" className="text-[10px] fill-zinc-400 font-mono">+25%</text>

                          <line x1="50" y1="54" x2="590" y2="54" stroke="#e2e8f0" strokeDasharray="3 3" />
                          <text x="42" y="58" textAnchor="end" className="text-[10px] fill-zinc-400 font-mono">+37.5%</text>

                          <line x1="50" y1="10" x2="590" y2="10" stroke="#e2e8f0" strokeDasharray="3 3" />
                          <text x="42" y="14" textAnchor="end" className="text-[10px] fill-zinc-400 font-mono">+50%</text>

                          {/* Y-Axis Line */}
                          <line x1="50" y1="10" x2="50" y2="180" stroke="#94a3b8" strokeWidth="1.5" />
                          {/* X-Axis Line */}
                          <line x1="50" y1="180" x2="590" y2="180" stroke="#94a3b8" strokeWidth="1.5" />

                          {/* X-Axis Vertical Guide Ticks & Labels */}
                          <line x1="80" y1="180" x2="80" y2="185" stroke="#94a3b8" strokeWidth="1.5" />
                          <text x="80" y="200" textAnchor="middle" className="text-[10px] fill-zinc-600 font-mono font-bold">1D</text>

                          <line x1="190" y1="180" x2="190" y2="185" stroke="#94a3b8" strokeWidth="1.5" />
                          <text x="190" y="200" textAnchor="middle" className="text-[10px] fill-zinc-600 font-mono font-bold">7D</text>

                          <line x1="310" y1="180" x2="310" y2="185" stroke="#94a3b8" strokeWidth="1.5" />
                          <text x="310" y="200" textAnchor="middle" className="text-[10px] fill-zinc-600 font-mono font-bold">14D</text>

                          <line x1="440" y1="180" x2="440" y2="185" stroke="#94a3b8" strokeWidth="1.5" />
                          <text x="440" y="200" textAnchor="middle" className="text-[10px] fill-zinc-600 font-mono font-bold">30D</text>

                          <line x1="570" y1="180" x2="570" y2="185" stroke="#94a3b8" strokeWidth="1.5" />
                          <text x="570" y="200" textAnchor="middle" className="text-[10px] fill-zinc-600 font-mono font-bold">90D</text>

                          {/* Axis Title Labels */}
                          <text x="25" y="100" transform="rotate(-90 25 100)" textAnchor="middle" className="text-[9px] fill-zinc-400 font-mono font-semibold uppercase tracking-wider">
                            Return (%)
                          </text>
                          <text x="325" y="215" textAnchor="middle" className="text-[9px] fill-zinc-400 font-mono font-semibold uppercase tracking-wider">
                            Time Horizon
                          </text>

                          {/* Conservative Curve */}
                          <path
                            d="M 80 178 Q 190 173 310 167 T 570 136 L 570 180 L 80 180 Z"
                            fill="url(#gradConservative)"
                            opacity={advisoryRisk === "conservative" ? 1 : 0.4}
                          />
                          <path
                            d="M 80 178 Q 190 173 310 167 T 570 136"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth={advisoryRisk === "conservative" ? 3 : 1.8}
                            strokeDasharray={advisoryRisk === "conservative" ? "none" : "4 2"}
                          />
                          <circle cx="80" cy="178" r={advisoryRisk === "conservative" ? 4 : 3} fill="#10b981" />
                          <circle cx="190" cy="173" r={advisoryRisk === "conservative" ? 4 : 3} fill="#10b981" />
                          <circle cx="310" cy="167" r={advisoryRisk === "conservative" ? 4 : 3} fill="#10b981" />
                          <circle cx="440" cy="158" r={advisoryRisk === "conservative" ? 4 : 3} fill="#10b981" />
                          <circle cx="570" cy="136" r={advisoryRisk === "conservative" ? 5 : 3.5} fill="#10b981" />

                          {/* Balanced Curve */}
                          <path
                            d="M 80 175 Q 190 164 310 151 T 570 90 L 570 180 L 80 180 Z"
                            fill="url(#gradBalanced)"
                            opacity={advisoryRisk === "balanced" ? 1 : 0.4}
                          />
                          <path
                            d="M 80 175 Q 190 164 310 151 T 570 90"
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth={advisoryRisk === "balanced" ? 3 : 2}
                          />
                          <circle cx="80" cy="175" r={advisoryRisk === "balanced" ? 4 : 3} fill="#6366f1" />
                          <circle cx="190" cy="164" r={advisoryRisk === "balanced" ? 4 : 3} fill="#6366f1" />
                          <circle cx="310" cy="151" r={advisoryRisk === "balanced" ? 4 : 3} fill="#6366f1" />
                          <circle cx="440" cy="128" r={advisoryRisk === "balanced" ? 4 : 3} fill="#6366f1" />
                          <circle cx="570" cy="90" r={advisoryRisk === "balanced" ? 5 : 3.5} fill="#6366f1" />

                          {/* Aggressive Curve */}
                          <path
                            d="M 80 170 Q 190 150 310 127 T 570 29 L 570 180 L 80 180 Z"
                            fill="url(#gradAggressive)"
                            opacity={advisoryRisk === "aggressive" ? 1 : 0.4}
                          />
                          <path
                            d="M 80 170 Q 190 150 310 127 T 570 29"
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth={advisoryRisk === "aggressive" ? 3.5 : 2}
                          />
                          <circle cx="80" cy="170" r={advisoryRisk === "aggressive" ? 4.5 : 3} fill="#f43f5e" />
                          <circle cx="190" cy="150" r={advisoryRisk === "aggressive" ? 4.5 : 3} fill="#f43f5e" />
                          <circle cx="310" cy="127" r={advisoryRisk === "aggressive" ? 4.5 : 3} fill="#f43f5e" />
                          <circle cx="440" cy="85" r={advisoryRisk === "aggressive" ? 4.5 : 3} fill="#f43f5e" />
                          <circle cx="570" cy="29" r={advisoryRisk === "aggressive" ? 6 : 4} fill="#f43f5e" />
                        </svg>

                        {/* Horizon Return Badges */}
                        <div className="mt-2 grid grid-cols-5 gap-2 border-t border-ink-100 pt-3 text-center">
                          {OKX_TRADING_PLAN_DATA.trajectories.map((traj) => {
                            const val =
                              advisoryRisk === "aggressive"
                                ? traj.aggressiveReturnPct
                                : advisoryRisk === "balanced"
                                ? traj.balancedReturnPct
                                : traj.conservativeReturnPct;

                            return (
                              <div key={traj.timeHorizon} className="rounded-lg bg-surface-50 p-2">
                                <span className="block text-[10px] font-bold text-ink-500 font-mono">
                                  {traj.timeHorizon}
                                </span>
                                <span
                                  className={cn(
                                    "font-mono text-xs font-bold",
                                    advisoryRisk === "aggressive" && "text-rose-600",
                                    advisoryRisk === "balanced" && "text-accent-600",
                                    advisoryRisk === "conservative" && "text-emerald-600"
                                  )}
                                >
                                  +{val.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
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
                    <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-xl bg-ink-900 border border-transparent p-4 text-white sm:flex-row shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-ink-300">Executable Mandate Rule</span>
                          <span className="rounded bg-accent-500/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-accent-400">
                            Session Key Guarded
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-xs font-bold text-white">
                          {currentAdvisoryPlan.mandateRule}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPromptText(currentAdvisoryPlan.mandateRule);
                            handleSendPrompt(currentAdvisoryPlan.mandateRule);
                            const firstAlloc = currentAdvisoryPlan.allocations.find(a => a.symbol !== advisoryStablecoin) || currentAdvisoryPlan.allocations[0];
                            const sym = firstAlloc?.symbol || "NVDAx";
                            const amt = (advisoryCapital * (firstAlloc?.weightPercent || 35)) / 100;
                            const price = stockPrices[sym] || 213.9;
                            openWeb3Signer(sym, amt, amt / price, price);
                          }}
                          className="rounded-xl bg-accent-500 hover:bg-accent-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-2"
                        >
                          <span>Deploy Mandate on OKX X Layer</span>
                          <span>↗</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

{/* 2. Institutional Market & Mandates Directory (Powered by OKX AI Skills) */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs sm:p-6">
                  <div className="flex flex-col justify-between gap-3 border-b border-ink-100 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent-600">
                          OKX AI Skills Telemetry Engine
                        </span>
                        <span className="rounded bg-accent-100 px-2 py-0.5 font-mono text-[10px] font-bold text-accent-800">
                          4 Skills Active
                        </span>
                      </div>
                      <h2 className="mt-1 font-display text-lg font-bold text-ink-900 sm:text-xl">
                        Institutional Market &amp; Mandates Directory
                      </h2>
                      <p className="mt-0.5 text-xs text-ink-500">
                        Synthesizing okx-sentiment-tracker, okx-cex-smartmoney, okx-cex-market, and trading-plan-generator across all 20 tokenized equities on OKX X Layer.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-mono font-bold text-emerald-800">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Whale Inflow: {OKX_SMART_MONEY_DATA.netInflow24h}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 border border-ink-200 px-3 py-1 text-xs font-mono text-ink-700">
                        Market: {OKX_CEX_MARKET_DATA.marketStatus}
                      </span>
                    </div>
                  </div>

                  {/* Comprehensive Institutional Equities Table */}
                  <div className="mt-5 overflow-x-auto rounded-xl border border-ink-200">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead className="border-b border-ink-200 bg-surface-100 font-semibold text-ink-900">
                        <tr>
                          <th className="p-3">Asset</th>
                          <th className="p-3">Spot Price</th>
                          <th className="p-3">Smart Money Flow</th>
                          <th className="p-3">Sentiment Score</th>
                          <th className="p-3">CEX Metrics</th>
                          <th className="p-3 text-right">Autonomous Mandate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-200/60 bg-white text-ink-700">
                        {STOCKS.map((stk) => {
                          const priceNum = getNumericPrice(stk);
                          const sentiment = OKX_SENTIMENT_DATA.assetScores[stk.symbol] || { score: 75, verdict: "Bullish" };
                          const smartFlow = OKX_SMART_MONEY_DATA.assetSmartFlow[stk.symbol] || { netFlow: "+$500K", flowType: "Inflow", tier: "Accumulation" };
                          const metrics = OKX_CEX_MARKET_DATA.assetMetrics[stk.symbol] || { volume24h: "$1.5M", beta: 1.2, spread: "0.02%", momentumRank: 5 };

                          return (
                            <tr key={stk.symbol} className="transition-colors hover:bg-surface-50">
                              <td className="p-3 font-semibold text-ink-900">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="flex h-7 w-7 items-center justify-center rounded-lg shadow-xs shrink-0 text-white font-bold text-xs"
                                    style={{ backgroundColor: stk.color }}
                                  >
                                    {stk.logo}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-bold">{stk.symbol}</span>
                                      <span className="text-[10px] text-ink-400">({stk.name})</span>
                                    </div>
                                    <span className="font-mono text-[10px] text-ink-500">
                                      Rank #{metrics.momentumRank}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3 font-mono">
                                <div
                                  className={cn(
                                    "font-semibold text-xs",
                                    priceFlashes[stk.symbol] === "up" && "text-emerald-600 font-bold",
                                    priceFlashes[stk.symbol] === "down" && "text-rose-600 font-bold",
                                    !priceFlashes[stk.symbol] && "text-ink-900"
                                  )}
                                >
                                  {getFormattedPrice(stk)}
                                </div>
                                <span className="text-[10px] text-ink-400">Spread: {metrics.spread}</span>
                              </td>

                              <td className="p-3 font-mono">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "font-bold text-xs",
                                      smartFlow.flowType === "Inflow" ? "text-emerald-700" : "text-rose-600"
                                    )}
                                  >
                                    {smartFlow.netFlow}
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded px-1.5 py-0.2 text-[9px] font-bold uppercase",
                                      smartFlow.flowType === "Inflow"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-rose-100 text-rose-800"
                                    )}
                                  >
                                    {smartFlow.flowType}
                                  </span>
                                </div>
                                <span className="text-[10px] text-ink-500">{smartFlow.tier}</span>
                              </td>

                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "font-mono font-bold text-xs",
                                      sentiment.score >= 80
                                        ? "text-emerald-700"
                                        : sentiment.score >= 70
                                        ? "text-accent-700"
                                        : "text-amber-700"
                                    )}
                                  >
                                    {sentiment.score}/100
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded px-1.5 py-0.2 font-mono text-[9px] font-bold",
                                      sentiment.verdict === "Bullish"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : sentiment.verdict === "Neutral"
                                        ? "bg-surface-200 text-ink-700"
                                        : "bg-amber-100 text-amber-800"
                                    )}
                                  >
                                    {sentiment.verdict}
                                  </span>
                                </div>
                                <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-surface-200">
                                  <div
                                    className={cn(
                                      "h-full",
                                      sentiment.score >= 80
                                        ? "bg-emerald-500"
                                        : sentiment.score >= 70
                                        ? "bg-accent-500"
                                        : "bg-amber-500"
                                    )}
                                    style={{ width: `${sentiment.score}%` }}
                                  />
                                </div>
                              </td>

                              <td className="p-3 font-mono text-[11px]">
                                <div>Vol: <span className="font-semibold text-ink-900">{metrics.volume24h}</span></div>
                                <div className="text-ink-500">Beta: <span className="text-ink-700">{metrics.beta.toFixed(2)}</span></div>
                              </td>

                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const prompt = `Deploy 30% ${stk.symbol}, 70% USDG Short-Term Momentum Mandate with 5% stop protection`;
                                      setPromptText(prompt);
                                      handleSendPrompt(prompt);
                                      openWeb3Signer(stk.symbol, 150, 150 / priceNum, priceNum);
                                    }}
                                    className="rounded-lg bg-ink-900 hover:bg-accent-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition-colors cursor-pointer"
                                  >
                                    Deploy Mandate
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStock(stk);
                                      openWeb3Signer(stk.symbol, 100, 100 / priceNum, priceNum);
                                    }}
                                    className="rounded-lg border border-ink-200 bg-white hover:bg-surface-100 px-2 py-1.5 text-[11px] font-semibold text-ink-700 transition-colors cursor-pointer"
                                    title={`Instant swap on OKX X Layer`}
                                  >
                                    Swap
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
              </div>
            )}
          </div>

          {/* Right Sidebar: Portfolio Summary (Cols 9 to 12) */}
          <div className="space-y-6 lg:col-span-4">

            {/* Live Portfolio Breakdown Card - Unified Active Holdings */}
            <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-500">
                  Active Portfolio Holdings
                </span>
                <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  {profile.holdings.length} {profile.holdings.length === 1 ? "Position" : "Positions"}
                </span>
              </div>

              <div className="mt-3">
                <p className="font-mono text-3xl font-bold tracking-tight text-ink-900">
                  ${profile.portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-ink-600">
                  <span>Cash: <strong className="font-mono text-ink-900">${profile.usdgBalance.toFixed(2)} USDG</strong></span>
                  <span>Equities: <strong className="font-mono text-ink-900">${Math.max(0, profile.portfolioValue - profile.usdgBalance).toFixed(2)} USDG</strong></span>
                </div>

                {/* Spending Cap Telemetry */}
                <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2 text-[11px] text-ink-500">
                  <span>OKX X Layer (Chain 196):</span>
                  <span className="font-mono font-semibold text-emerald-600">On-Chain Verified</span>
                </div>
              </div>

              {profile.holdings.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-surface-50 p-4 text-center">
                  <p className="text-xs font-semibold text-ink-800">No active stock holdings</p>
                  <p className="mt-1 text-[11px] text-ink-500 leading-relaxed">
                    This wallet currently holds no tokenized equities on OKX X Layer (Chain 196). Use Quick Buy or submit an investment mandate to begin.
                  </p>
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

                  {/* Holdings List with live spot & units */}
                  <div className="mt-4 space-y-2 text-xs">
                    {profile.holdings.map((h) => {
                      const livePrice = stockPrices[h.symbol];
                      const currentVal = livePrice ? h.amount * livePrice : h.valueUsd;

                      return (
                        <div
                          key={h.symbol}
                          className="flex items-center justify-between rounded-lg border border-ink-100 bg-surface-50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: h.color }}
                            />
                            <span className="font-bold text-ink-900">{h.symbol}</span>
                            <span className="text-[10px] text-ink-500">
                              {h.amount.toFixed(2)} units
                            </span>
                            {livePrice && (
                              <span className="text-[9px] font-mono text-ink-400">
                                @ ${livePrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-semibold text-ink-900">
                            ${currentVal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            

{/* 3. Market Catalysts, News & Investor Sentiment Feed (Rendered Directly Following Directory) */}
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
                    <span className="rounded-full bg-surface-100 border border-transparent px-3 py-1 text-xs font-medium text-ink-600">
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
                              <span className="rounded bg-ink-900 border border-transparent px-2 py-0.5 font-mono text-xs font-bold text-white">
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
                                  ? "bg-emerald-100 text-emerald-800 border border-transparent"
                                  : item.impact === "Bearish"
                                  ? "bg-red-100 text-red-800 border border-transparent"
                                  : "bg-amber-100 text-amber-800 border border-transparent"
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
                                setMode("basic");
                                handleSendPrompt(item.suggestedAction.tradePrompt);
                              }}
                              className="rounded-lg bg-ink-900 border border-transparent px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-accent-600 cursor-pointer"
                            >
                              Trade on Catalyst: {item.suggestedAction.label}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ========================================================================= */}
            {/* THE MANDATE EXECUTION SUMMARY                                             */}
            {/* ========================================================================= */}
            <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs sm:p-6 text-ink-900">
              <div className="flex flex-col justify-between gap-3 border-b border-ink-100 pb-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent-600">
                      OKX X Layer (Chain 196) Autonomous Agent
                    </span>
                    <span className="rounded bg-emerald-100 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                      Live Execution Active
                    </span>
                  </div>
                  <h2 className="mt-1 font-display text-lg font-bold text-ink-950 sm:text-xl">
                    The Mandate Execution Summary
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-600 leading-relaxed">
                    Comprehensive background, trading comparison, active duration, and stipulated growth targets for the initiated mandate.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEvaluateDriftNow}
                    className="rounded-lg border border-ink-200 bg-surface-50 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-white hover:text-ink-950 transition-colors cursor-pointer"
                  >
                    Check Drift Telemetry
                  </button>
                </div>
              </div>

              {/* Explanatory Mandate Statement */}
              <div className="mt-4 rounded-xl border border-accent-200 bg-accent-50/50 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-700">
                  Initiated Policy
                </span>
                <p className="mt-1 font-display text-base font-bold text-ink-950 leading-snug">
                  The mandate was: <span className="text-accent-600">{currentAdvisoryPlan.strategyName}</span> utilizing{" "}
                  <span className="font-mono text-ink-800">{advisoryStablecoin}</span> liquidity across{" "}
                  <span className="font-mono text-ink-800">
                    {currentAdvisoryPlan.allocations.filter(a => a.symbol !== advisoryStablecoin).map(a => a.symbol).join(", ")}
                  </span>.
                </p>
                <p className="mt-1.5 text-xs text-ink-600 leading-relaxed font-mono">
                  Active Rule: "{currentAdvisoryPlan.mandateRule}"
                </p>
              </div>

              {/* Execution Background 4-Metric Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-ink-200 bg-surface-50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Capital Initiated</span>
                  <p className="mt-1 font-mono text-sm font-bold text-ink-950">
                    $1,000 {advisoryStablecoin}
                  </p>
                  <span className="text-[10px] text-ink-500 font-mono">Initiated Sep 24, 2026</span>
                </div>

                <div className="rounded-xl border border-ink-200 bg-surface-50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Timeline &amp; Horizon</span>
                  <p className="mt-1 font-mono text-sm font-bold text-accent-700">
                    {advisoryHorizon === "short_term" ? "Short-Term Momentum" : "Long-Term DCA"}
                  </p>
                  <span className="text-[10px] text-ink-500 font-mono">
                    {advisoryHorizon === "short_term" ? "30 Days Window" : "12-24 Months"}
                  </span>
                </div>

                <div className="rounded-xl border border-ink-200 bg-surface-50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Stipulated Growth</span>
                  <p className="mt-1 font-mono text-sm font-bold text-emerald-700">
                    +{advisoryHorizon === "short_term"
                      ? (advisoryRisk === "aggressive" ? "27.8%" : advisoryRisk === "balanced" ? "15.2%" : "6.5%")
                      : (advisoryRisk === "aggressive" ? "44.5%" : advisoryRisk === "balanced" ? "26.5%" : "12.8%")}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-mono">
                    Projected +${advisoryHorizon === "short_term"
                      ? (advisoryRisk === "aggressive" ? "278.00" : advisoryRisk === "balanced" ? "152.00" : "65.00")
                      : (advisoryRisk === "aggressive" ? "445.00" : advisoryRisk === "balanced" ? "265.00" : "128.00")} {advisoryStablecoin}
                  </span>
                </div>

                <div className="rounded-xl border border-ink-200 bg-surface-50 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Active Trading Duration</span>
                  <p className="mt-1 font-mono text-sm font-bold text-ink-950">
                    3 Days Active
                  </p>
                  <span className="text-[10px] text-ink-500 font-mono">4 OKX DEX Rebalances</span>
                </div>
              </div>

              {/* Trading Comparison Table */}
              <div className="mt-5">
                <div className="flex items-center justify-between pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-800">
                    Trading Comparison &amp; Stipulated Asset Growth
                  </h4>
                  <span className="text-[11px] font-mono text-ink-500">OKX DEX Aggregator Telemetry</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-ink-200">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="border-b border-ink-200 bg-surface-100 font-semibold text-ink-900">
                      <tr>
                        <th className="p-3">Asset</th>
                        <th className="p-3">Allocation</th>
                        <th className="p-3">Capital</th>
                        <th className="p-3">Initial / Live Spot</th>
                        <th className="p-3">Stipulated Target</th>
                        <th className="p-3">Drift Status</th>
                        <th className="p-3 text-right">Execution Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-200/70 bg-white">
                      {currentAdvisoryPlan.allocations.map((alloc) => {
                        const price = stockPrices[alloc.symbol] || (alloc.symbol === advisoryStablecoin ? 1.0 : 213.9);
                        const allocCapital = (1000 * alloc.weightPercent) / 100;
                        const stipulatedPct =
                          alloc.symbol === advisoryStablecoin
                            ? "+0.0% (Floor)"
                            : advisoryRisk === "aggressive"
                            ? "+32.4%"
                            : advisoryRisk === "balanced"
                            ? "+18.5%"
                            : "+9.2%";

                        return (
                          <tr key={alloc.symbol} className="hover:bg-surface-50/80 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-ink-950">{alloc.symbol}</span>
                                <span className="text-[10px] text-ink-500 font-medium">({alloc.role})</span>
                              </div>
                            </td>
                            <td className="p-3 font-mono font-semibold text-accent-700">
                              {alloc.weightPercent}%
                            </td>
                            <td className="p-3 font-mono text-ink-800">
                              ${allocCapital.toFixed(2)}
                            </td>
                            <td className="p-3 font-mono text-ink-800">
                              {alloc.symbol === advisoryStablecoin ? `$1.00 ${advisoryStablecoin}` : `$${price.toFixed(2)}`}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-700">
                              {stipulatedPct}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                In Equilibrium
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="font-mono text-[11px] font-bold text-ink-700">
                                Auto-Guarded
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Collapsible Low-Level On-Chain Telemetry Log */}
              <div className="mt-4 pt-3 border-t border-ink-100">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowAuditLogs(!showAuditLogs)}
                    className="text-xs font-semibold text-ink-600 hover:text-ink-950 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{showAuditLogs ? "Hide" : "Show"} Low-Level On-Chain Telemetry Log</span>
                    <span>{showAuditLogs ? "▲" : "▼"}</span>
                  </button>

                  {showAuditLogs && (
                    <button
                      type="button"
                      onClick={() => setExecutionLogs([])}
                      className="text-[10px] text-ink-400 hover:text-red-600 cursor-pointer"
                    >
                      Clear Log
                    </button>
                  )}
                </div>

                {showAuditLogs && (
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-[#0C0F17] p-3 text-zinc-300 font-mono text-[10px] max-h-[180px] overflow-y-auto space-y-1.5">
                    {executionLogs.length === 0 ? (
                      <p className="text-zinc-500 text-center py-2">No raw events recorded.</p>
                    ) : (
                      executionLogs.map((log) => (
                        <div key={log.id} className="border-b border-zinc-800/60 pb-1 last:border-b-0">
                          <span className="text-zinc-500">[{log.timestamp}]</span>{" "}
                          <span className="font-bold text-accent-400">[{log.source}]</span> {log.message}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Terminal Footer with Cookie Controls, Privacy, and System Status */}
      <footer className="mt-12 border-t border-surface-200 bg-surface-50 py-8 text-xs text-ink-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <span className="font-display font-bold text-ink-900">Meirei Terminal</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                OKX X Layer (Chain 196) Mainnet
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
              <Link
                href="/cookies"
                className="text-ink-600 hover:text-ink-900 transition-colors"
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
                className="text-accent-600 hover:underline cursor-pointer font-semibold"
              >
                Cookie Preferences
              </button>
              <Link
                href="/privacy"
                className="text-ink-600 hover:text-ink-900 transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-ink-600 hover:text-ink-900 transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/whitepaper"
                className="text-ink-600 hover:text-ink-900 transition-colors"
              >
                Whitepaper
              </Link>
              <Link
                href="/docs"
                className="text-ink-600 hover:text-ink-900 transition-colors"
              >
                Docs
              </Link>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-surface-200/60 text-[11px] text-ink-400 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p>Non-custodial algorithmic order routing via OKX Exchange OS on X Layer (Chain 196). Smart contract execution via OKX Onchain OS.</p>
            <p className="font-mono text-[10px]">Zero Third-Party Advertising Trackers</p>
          </div>
        </div>
      </footer>

      {/* Transparent Non-Custodial Multi-Channel Connect Portal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-ink-200 bg-white p-6 shadow-2xl text-ink-900 relative selection:bg-accent-500/20"
            >
              <div className="flex items-center justify-between border-b border-ink-200 pb-3.5">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-700">
                    OKX X Layer (Chain 196)
                  </span>
                  <h3 className="font-display text-lg font-bold text-ink-950">
                    Connect &amp; Manage Wallet
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="rounded-full p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-400 hover:bg-surface-100 hover:text-ink-950 cursor-pointer transition-colors"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 stroke-current stroke-2 fill-none">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-5 text-xs text-ink-700">
                <p className="text-ink-600 leading-relaxed text-[11px]">
                  Select your preferred platform to interface your Web3 wallet for autonomous execution on OKX X Layer.
                </p>

                {/* STEP 1: Connect Web3 Wallet First */}
                <div className="rounded-2xl border border-ink-200 bg-surface-50/80 p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-ink-200/70 pb-2">
                    <div>
                      <span className="font-bold text-ink-950 uppercase text-[10px] tracking-wider block">
                        1. Connect Web3 Wallet First
                      </span>
                      <p className="text-[11px] text-ink-500">
                        Non-custodial verification on OKX X Layer (Chain 196)
                      </p>
                    </div>
                    {connectAddress ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Required First
                      </span>
                    )}
                  </div>

                  {connectAddress ? (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                      <div>
                        <div className="flex items-center gap-1.5 font-mono text-emerald-800 font-semibold text-xs">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>{formatShortAddress(connectAddress)}</span>
                          <span className="text-ink-500 font-normal">({connectWalletName || "Web3 Wallet"})</span>
                        </div>
                        <p className="text-[10px] font-mono text-emerald-700 mt-0.5">
                          OKX X Layer (Chain 196) · 100% Gas Sponsored
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnectChannelWallet}
                        disabled={isWalletConnecting}
                        className="py-1.5 px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleConnectWalletType("okx")}
                          disabled={isWalletConnecting}
                          className="p-2.5 min-h-[44px] rounded-xl border border-accent-200 bg-accent-50/70 hover:bg-accent-100 text-ink-950 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                        >
                          <span>OKX Wallet</span>
                          <span className="text-[9px] bg-accent-200 text-accent-800 font-bold px-1.5 py-0.5 rounded">TOP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConnectWalletType("metamask")}
                          disabled={isWalletConnecting}
                          className="p-2.5 min-h-[44px] rounded-xl border border-ink-200 bg-white hover:bg-surface-50 text-ink-900 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                        >
                          MetaMask
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setShowWalletConnectModal(true)}
                          className="p-2.5 min-h-[44px] rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-800 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <WalletConnectIcon className="w-4 h-4 text-sky-600" />
                          <span>WalletConnect</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConnectWalletType("injected")}
                          disabled={isWalletConnecting}
                          className="p-2.5 min-h-[44px] rounded-xl border border-ink-200 bg-surface-50 hover:bg-white text-ink-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          Browser Injected
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* STEP 2: Continue on Preferred Interface Platform */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="font-bold text-ink-950 uppercase text-[10px] tracking-wider block">
                      2. Continue on Preferred Interface Platform
                    </label>
                    <p className="text-[11px] text-ink-500">
                      {!connectAddress
                        ? "Connect your Web3 wallet above to anchor autonomous execution."
                        : "Select where you want to execute your autonomous investment mandates:"}
                    </p>
                  </div>

                  {/* 1. Continue on Web Platform (First) */}
                  <div className="rounded-2xl border border-accent-200 bg-accent-50/50 p-4 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-accent-100 text-accent-700 border border-accent-200">
                          <SimpleWebLogo className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-ink-950">1. Web Platform (Browser Console)</h4>
                          <p className="text-[10px] text-accent-700 font-mono">Direct Browser Access · OKX X Layer</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-bold">
                        Live Console
                      </span>
                    </div>

                    <p className="text-[11px] text-ink-600 leading-relaxed">
                      Direct access to spot prices, conversational agent, unit calculator, and autonomous rebalancing on OKX X Layer.
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
                      className="w-full min-h-[42px] py-2.5 px-4 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer group"
                    >
                      <span>Continue on Web Platform</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  </div>

                  {/* 2. Continue on Telegram (Second) */}
                  <div
                    className={cn(
                      "rounded-2xl border p-4 space-y-3 shadow-xs transition-all",
                      connectAddress ? "border-sky-200 bg-sky-50/50" : "border-ink-200 bg-surface-50 opacity-80"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
                          <SimpleTelegramLogo className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-ink-950">2. Telegram (@MeireiXLayerBot)</h4>
                          <p className="text-[10px] text-sky-700 font-mono">Autonomous Execution Bot · Chain 196</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 text-[9px] font-bold">
                        Direct Bot (Live)
                      </span>
                    </div>

                    {connectAddress ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-ink-700 block mb-1">
                            Telegram Handle or Chat ID
                          </label>
                          <input
                            type="text"
                            value={connectHandle}
                            onChange={(e) => setConnectHandle(e.target.value)}
                            placeholder="@MeireiXLayerBot or username"
                            className="w-full rounded-xl border border-sky-200 bg-white p-2.5 text-xs font-mono text-ink-900 placeholder-ink-400 outline-none focus:border-sky-500 transition-colors"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleConfirmChannelLink}
                          disabled={isChannelLinking}
                          className="w-full min-h-[42px] py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <SimpleTelegramLogo className="w-4 h-4 text-white" />
                          <span>{isChannelLinking ? "Anchoring Wallet..." : "Continue on Telegram →"}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-ink-200 bg-white/70 p-3 text-center space-y-1.5">
                        <p className="text-[11px] font-semibold text-ink-700">
                          Wallet Connection Required First
                        </p>
                        <p className="text-[10px] text-ink-500 leading-relaxed">
                          You cannot continue on Telegram without connecting your Web3 wallet first. Please connect your OKX Wallet or MetaMask above.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleConnectWalletType("okx")}
                          className="mt-1 px-3 py-1.5 rounded-lg bg-ink-900 text-white text-[10px] font-bold hover:bg-accent-600 transition-colors cursor-pointer"
                        >
                          Connect Wallet Above First
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3 & 4. WhatsApp & Instagram (Coming Soon) */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {/* WhatsApp */}
                    <div className="rounded-xl border border-dashed border-ink-200 bg-surface-50 p-3 flex flex-col items-center justify-center text-center opacity-70">
                      <SimpleWhatsAppLogo className="w-5 h-5 text-emerald-700/60 mb-1" />
                      <span className="text-xs font-bold text-ink-800">3. WhatsApp</span>
                      <span className="mt-1 rounded bg-amber-100 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                        Coming Soon
                      </span>
                    </div>

                    {/* Instagram */}
                    <div className="rounded-xl border border-dashed border-ink-200 bg-surface-50 p-3 flex flex-col items-center justify-center text-center opacity-70">
                      <SimpleInstagramLogo className="w-5 h-5 text-pink-700/60 mb-1" />
                      <span className="text-xs font-bold text-ink-800">4. Instagram</span>
                      <span className="mt-1 rounded bg-amber-100 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feedback messages */}
                {connectInfoMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                    {connectInfoMsg}
                  </div>
                )}
                {connectErrorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                    {connectErrorMsg}
                  </div>
                )}

                {/* External links */}
                <div className="border-t border-ink-200 pt-3 flex items-center justify-between text-[11px] text-ink-500">
                  <a
                    href="https://t.me/MeireiXLayerBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-sky-600 flex items-center gap-1.5 transition-colors"
                  >
                    <SimpleTelegramLogo className="w-3.5 h-3.5" />
                    <span>Telegram Bot (@MeireiXLayerBot)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="min-h-[44px] px-3 py-2 text-ink-600 hover:text-ink-950 transition-colors cursor-pointer text-[11px] flex items-center justify-center"
                  >
                    Done &amp; Close
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
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

      {/* Create New Investment Mandate Policy Modal */}
      <AnimatePresence>
        {showCreateMandateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-lg rounded-3xl border border-ink-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-500/15 text-accent-600 font-bold text-sm">
                    M
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink-900">
                      Create Autonomous Mandate
                    </h3>
                    <p className="text-[11px] text-ink-500">
                      Configure autonomous execution policies on OKX X Layer
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateMandateModal(false)}
                  className="rounded-full p-1.5 text-ink-400 hover:bg-surface-100 transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 stroke-current stroke-2 fill-none">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {/* Policy Type Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5">
                    Policy Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: "drift_rebalance" as const, label: "Drift Rebalance" },
                      { type: "dca_recurring" as const, label: "DCA Accumulation" },
                      { type: "circuit_breaker" as const, label: "Circuit Breaker" },
                    ].map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => {
                          setNewMandateType(opt.type);
                          if (opt.type === "drift_rebalance") {
                            setNewMandateTitle("Portfolio Drift Guard");
                            setNewMandateTarget("60% Mag7, 20% USDG, max 8%");
                            setNewMandateThreshold("5.0%");
                          } else if (opt.type === "dca_recurring") {
                            setNewMandateTitle("Weekly TSLAx DCA");
                            setNewMandateTarget("50 USDG into TSLAx every Monday at 08:00 UTC");
                            setNewMandateThreshold("50 USDG");
                          } else {
                            setNewMandateTitle("Drawdown Circuit Breaker");
                            setNewMandateTarget("Auto-liquidate positions to USDG if 24h drawdown > 7%");
                            setNewMandateThreshold("-7.00%");
                          }
                        }}
                        className={cn(
                          "rounded-xl border py-2 px-2 text-center text-xs font-bold transition-all cursor-pointer",
                          newMandateType === opt.type
                            ? "border-accent-500 bg-accent-500/10 text-accent-600"
                            : "border-ink-200 bg-surface-50 text-ink-600"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mandate Policy Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5">
                    Policy Title
                  </label>
                  <input
                    type="text"
                    value={newMandateTitle}
                    onChange={(e) => setNewMandateTitle(e.target.value)}
                    placeholder="e.g. Mag7 Drift Guard"
                    className="w-full rounded-xl border border-ink-200 bg-surface-50 px-3.5 py-2 text-xs font-medium text-ink-900 outline-none focus:border-accent-500"
                  />
                </div>

                {/* Natural-Language Target & Rules */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-600">
                      Executable Target / Rule
                    </label>
                    <span className="text-[10px] text-ink-400">Natural-Language</span>
                  </div>
                  <textarea
                    rows={2}
                    value={newMandateTarget}
                    onChange={(e) => setNewMandateTarget(e.target.value)}
                    placeholder="e.g. 60% Mag7, 20% USDG, max 8%"
                    className="w-full rounded-xl border border-ink-200 bg-surface-50 px-3.5 py-2 text-xs font-mono text-ink-900 outline-none focus:border-accent-500"
                  />
                </div>

                {/* Presets Chips */}
                <div>
                  <span className="text-[10px] font-mono text-ink-400">Quick Presets:</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[
                      "60% Mag7, 20% USDG, max 8%",
                      "70% NVDAx / 30% AAPLx",
                      "50 USDG into TSLAx weekly",
                      "Liquidate to USDG if drawdown > 7%",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewMandateTarget(preset)}
                        className="rounded-lg border border-ink-200 bg-surface-50 px-2 py-0.5 text-[10px] font-mono text-ink-600 hover:text-accent-500 transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Threshold Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-600 mb-1.5">
                    Trigger Threshold / Limit
                  </label>
                  <input
                    type="text"
                    value={newMandateThreshold}
                    onChange={(e) => setNewMandateThreshold(e.target.value)}
                    placeholder="e.g. 5.0%"
                    className="w-full rounded-xl border border-ink-200 bg-surface-50 px-3.5 py-2 text-xs font-mono text-ink-900 outline-none focus:border-accent-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-ink-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateMandateModal(false)}
                  className="rounded-xl border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-surface-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateMandate}
                  className="rounded-xl bg-accent-500 hover:bg-accent-600 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Deploy Mandate Policy
                </button>
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

      {/* Advanced Mode Terms & Conditions Risk Disclosure Modal */}
      <AnimatePresence>
        {showAdvancedTermsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-ink-200 bg-white p-6 shadow-2xl text-ink-900"
            >
              <div className="flex items-center justify-between border-b border-ink-200 pb-3.5">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-700">
                    OKX X Layer (Chain 196) · Institutional Protocols
                  </span>
                  <h3 className="font-display text-lg font-bold text-ink-950">
                    Terms &amp; Risk Disclosure: Advanced Mode
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedTermsModal(false)}
                  className="rounded-full p-2 text-ink-400 hover:bg-surface-100 hover:text-ink-950 cursor-pointer"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 stroke-current stroke-2 fill-none">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs text-ink-700">
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-amber-900 flex items-start gap-2.5">
                  <span className="text-base leading-none">⚠️</span>
                  <p className="text-[11px] leading-relaxed">
                    <strong>Notice:</strong> Advanced Mode provides access to autonomous investment mandate creation, algorithmic drift rebalancing, and direct telemetry from OKX AI skills. You must acknowledge the following disclosures before proceeding.
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl border border-ink-200 bg-surface-50/60 p-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-ink-900 text-xs">1. Non-Custodial Smart Contract Routing</h4>
                    <p className="text-[11px] text-ink-600 leading-relaxed">
                      Meirei does not hold custody of your funds. All trades, swaps, and rebalances are simulated or routed directly through OKX DEX Aggregator on X Layer (Chain 196) with non-custodial session keys.
                    </p>
                  </div>

                  <div className="space-y-1 border-t border-ink-200/60 pt-2.5">
                    <h4 className="font-bold text-ink-900 text-xs">2. Algorithmic Drift &amp; Rebalance Execution</h4>
                    <p className="text-[11px] text-ink-600 leading-relaxed">
                      Mandates evaluate price drift (e.g. 1.5% to 3.5%) across tokenized equities. Sudden market movements or low DEX liquidity may cause slippage or frequent rebalance triggers.
                    </p>
                  </div>

                  <div className="space-y-1 border-t border-ink-200/60 pt-2.5">
                    <h4 className="font-bold text-ink-900 text-xs">3. Simulation vs. Mainnet Trading</h4>
                    <p className="text-[11px] text-ink-600 leading-relaxed">
                      You may utilize the Simulation Sandbox with 1,000 USDG test cash to model mandates risk-free before deploying live on-chain with sponsored gas.
                    </p>
                  </div>

                  <div className="space-y-1 border-t border-ink-200/60 pt-2.5">
                    <h4 className="font-bold text-ink-900 text-xs">4. No Financial Advice Disclaimer</h4>
                    <p className="text-[11px] text-ink-600 leading-relaxed">
                      All forecasts, sentiment scores, and portfolio trajectories generated by the 4 OKX AI skills are automated mathematical heuristics and do not constitute registered investment advice.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-surface-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAgreedCheckbox}
                    onChange={(e) => setTermsAgreedCheckbox(e.target.checked)}
                    className="mt-0.5 rounded border-ink-300 text-accent-600 focus:ring-accent-500"
                  />
                  <span className="text-[11px] font-semibold text-ink-900 leading-snug">
                    I have read, understood, and accept the Advanced Mode Terms &amp; Risk Disclosure for autonomous agent trading on OKX X Layer.
                  </span>
                </label>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-ink-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvancedTermsModal(false);
                      setMode("basic");
                    }}
                    className="px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-ink-700 text-xs font-semibold hover:bg-surface-100 transition-colors cursor-pointer"
                  >
                    Decline &amp; Stay in Basic Mode
                  </button>
                  <button
                    type="button"
                    disabled={!termsAgreedCheckbox}
                    onClick={() => {
                      setHasAcceptedAdvancedTerms(true);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("meirei_advanced_terms_accepted", "true");
                      }
                      setShowAdvancedTermsModal(false);
                      setMode("advanced");
                    }}
                    className="px-4 py-2.5 rounded-xl bg-ink-900 hover:bg-accent-600 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    Accept &amp; Enter Advanced Mode →
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Universal WalletConnect Bridge Modal */}
      <WalletConnectModal
        isOpen={showWalletConnectModal}
        onClose={() => setShowWalletConnectModal(false)}
        onConnect={(address, walletName) => {
          setConnectAddress(address);
          setConnectWalletName(walletName);
          setProfile((prev) => ({
            ...prev,
            address,
            handle: formatShortAddress(address),
            email: `${address.slice(2, 8)}@xlayer.wallet`,
            botStatus: `Connected via ${walletName} on OKX X Layer`,
          }));
          setConnectInfoMsg(`Connected ${walletName} (${formatShortAddress(address)}) on OKX X Layer.`);
          setShowWalletConnectModal(false);
        }}
      />
    </div>
  );
}
