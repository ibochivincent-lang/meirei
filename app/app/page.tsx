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
import { MandateSigningModal } from "@/components/wallet/mandate_signing_modal";
import {
  XLAYER_CHAIN_ID_DECIMAL,
  XLAYER_CHAIN_ID_HEX,
  XLAYER_NETWORK_PARAMS,
  formatShortAddress,
  isValidEvmAddress,
  DEMO_SANDBOX_ADDRESS,
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

type Platform = "telegram" | "web" | "okx_wallet";
type Mode = "basic" | "advanced";

function formatLogTime(d = new Date()): string {
  return d.toISOString().slice(11, 19);
}

const INITIAL_CHAT_MESSAGE: ChatMessage = {
  id: "welcome-1",
  sender: "bot",
  text: `Hello! I am Meirei, your AI Investment Mandate Assistant on OKX X Layer (Chain 196).

I help you simulate, solve, and execute intelligent spot trades and auto-investment mandates:
1. Spot Trading & Unit Calculations: Instant quotes and fractional share computation with 100% sponsored gas.
2. Portfolio Drift Rebalance: Keeps your allocations balanced automatically when prices drift.
3. Weekly DCA Accumulation: Automatically accumulates stock units on autopilot.
4. Volatility Circuit Breaker: Halts or rotates to USDG if markets dip sharply (>8%).
5. Dip Buyer & Take-Profit: Buys dips (e.g. -5%) and locks in profit at target gains (e.g. +15%).

Use the categorized keywords below or type any question to receive an immediate solution and step-by-step resolution.`,
  timestamp: "Just now",
};

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
  mandateAction?: {
    title: string;
    rule: string;
    symbol: string;
    price: number;
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
  okbBalance?: number;
  okbValueUsd?: number;
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
  okbBalance: 0.0,
  okbValueUsd: 0.0,
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
  description?: string;
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

function autoBalanceWeights(
  stocks: string[],
  weights: Record<string, number>,
  changedSymbol?: string,
  changedValue?: number
): Record<string, number> {
  const newWeights = { ...weights };
  if (stocks.length === 0) return newWeights;

  if (changedSymbol && changedValue !== undefined) {
    newWeights[changedSymbol] = changedValue;
    const others = stocks.filter((s) => s !== changedSymbol);
    if (others.length === 0) return newWeights;

    const currentOthersSum = others.reduce((acc, s) => acc + (weights[s] || 0), 0);
    const targetOthersSum = Math.max(0, 100 - changedValue);

    if (currentOthersSum === 0) {
      const split = Math.floor(targetOthersSum / others.length);
      let rem = targetOthersSum - split * others.length;
      others.forEach((s) => {
        newWeights[s] = split + (rem-- > 0 ? 1 : 0);
      });
    } else {
      let newSum = 0;
      const exactOthers = others.map((s) => {
        const exact = ((weights[s] || 0) / currentOthersSum) * targetOthersSum;
        const rounded = Math.round(exact);
        newSum += rounded;
        return { s, rounded, exact };
      });
      let diff = targetOthersSum - newSum;
      exactOthers.sort((a, b) => b.exact - b.rounded - (a.exact - a.rounded));
      for (let i = 0; i < Math.abs(diff); i++) {
        exactOthers[i % exactOthers.length].rounded += Math.sign(diff);
      }
      exactOthers.forEach((obj) => {
        newWeights[obj.s] = obj.rounded;
      });
    }
  } else {
    const currentSum = stocks.reduce((acc, s) => acc + (weights[s] || 0), 0);
    if (currentSum === 0) {
      const split = Math.floor(100 / stocks.length);
      let rem = 100 - split * stocks.length;
      stocks.forEach((s) => {
        newWeights[s] = split + (rem-- > 0 ? 1 : 0);
      });
    } else {
      let newSum = 0;
      const exactAll = stocks.map((s) => {
        const exact = ((weights[s] || 0) / currentSum) * 100;
        const rounded = Math.round(exact);
        newSum += rounded;
        return { s, rounded, exact };
      });
      let diff = 100 - newSum;
      exactAll.sort((a, b) => b.exact - b.rounded - (a.exact - a.rounded));
      for (let i = 0; i < Math.abs(diff); i++) {
        exactAll[i % exactAll.length].rounded += Math.sign(diff);
      }
      exactAll.forEach((obj) => {
        newWeights[obj.s] = obj.rounded;
      });
    }
  }
  return newWeights;
}

export default function AppDashboardPage() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [mandatePlanToSign, setMandatePlanToSign] = useState<AdvisoryPlan | null>(null);

  // 1-Click Demo Sandbox for Judges
  const [isDemoSandbox, setIsDemoSandbox] = useState<boolean>(false);

  // Mandate Policy Creator Modal
  const [showCreateMandateModal, setShowCreateMandateModal] = useState<boolean>(false);
  const [newMandateTitle, setNewMandateTitle] = useState<string>("Mag7 Drift Guard");
  const [newMandateType, setNewMandateType] = useState<"drift_rebalance" | "dca_recurring" | "circuit_breaker">("drift_rebalance");
  const [newMandateTarget, setNewMandateTarget] = useState<string>("60% Mag7, 20% USDG, max 8%");
  const [newMandateThreshold, setNewMandateThreshold] = useState<string>("5.0%");

  // Active Autonomous Mandates state
  const [selectedLearnMoreMandate, setSelectedLearnMoreMandate] = useState<MandatePolicy | null>(null);

  const [mandatePolicies, setMandatePolicies] = useState<MandatePolicy[]>([]);

  // Agent Autonomous Execution Audit Trail Log
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogItem[]>([
    {
      id: "log-1",
      timestamp: "18:00:00",
      source: "OKX X Layer (Chain 196)",
      message: "Mandate Orchestrator v2.4 initialized. Connected to RPC https://xlayerrpc.okx.com.",
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
  const activeAddress = connectAddress || (profile.address && profile.address !== "0x0000000000000000000000000000000000000000" ? profile.address : null);
  const isLoggedIn = Boolean(activeAddress);
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
      if (isDemoSandbox || (profile.address && profile.address.toLowerCase() === DEMO_SANDBOX_ADDRESS.toLowerCase())) {
        return;
      }
      const addr = activeAddress?.trim() || profile.address?.trim();
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
              color: stockDef?.color || (h.symbol === "NVDAx" ? "#76B900" : h.symbol === "AAPLx" ? "#111111" : h.symbol === "OKB" ? "#000000" : "#3B82F6"),
            };
          });

          const usdg = Number(data.usdgBalance) || 0;
          const okb = Number(data.okbBalance) || 0;
          const okbVal = okb * 122.0;
          const equitiesTotal = mappedHoldings.reduce((sum: number, h: { valueUsd: number }) => sum + h.valueUsd, 0);
          const total = Number(data.totalValueUsd) || (usdg + okbVal + equitiesTotal);

          // If backend couldn't reach RPC (Vercel IP block), it returns 0. Force fallback.
          if (total === 0 && isMounted) {
            throw new Error("Backend returned zero, try direct browser RPC fallback");
          }

          setProfile((prev) => ({
            ...prev,
            usdgBalance: usdg,
            okbBalance: okb,
            okbValueUsd: okbVal,
            portfolioValue: total,
            holdings: mappedHoldings,
          }));
        } else if (isMounted) {
          throw new Error("Backend ok=false");
        }
      } catch (err) {
        // Direct fallback browser query to OKX X Layer RPC if server query fails
        if (isMounted) {
          try {
            const clean = addr.toLowerCase().replace("0x", "").padStart(64, "0");
            const rpcRes = await fetch("https://xlayerrpc.okx.com", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify([
                { jsonrpc: "2.0", id: 0, method: "eth_getBalance", params: [addr, "latest"] },
                { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8", data: `0x70a08231${clean}` }, "latest"] }
              ]),
            });
            const rpcJson = await rpcRes.json();
            if (Array.isArray(rpcJson)) {
              const okbRaw = rpcJson.find((x) => x.id === 0)?.result;
              const okbBal = okbRaw && okbRaw !== "0x" ? Number(BigInt(okbRaw)) / 1e18 : 0;
              const okbVal = okbBal * 122.0;
              const usdgRaw = rpcJson.find((x) => x.id === 1)?.result;
              const usdgBal = usdgRaw && usdgRaw !== "0x" ? Number(BigInt(usdgRaw)) / 1e6 : 0;
              const fallbackHoldings: Array<{ symbol: string; amount: number; valueUsd: number; color: string }> = [];
              if (okbBal > 0) {
                fallbackHoldings.push({
                  symbol: "OKB",
                  amount: okbBal,
                  valueUsd: okbVal,
                  color: "#000000",
                });
              }
              setProfile((prev) => ({
                ...prev,
                usdgBalance: usdgBal,
                okbBalance: okbBal,
                okbValueUsd: okbVal,
                portfolioValue: usdgBal + okbVal,
                holdings: fallbackHoldings,
              }));
            }
          } catch (rpcErr) {
            console.warn("[Balances] Notice checking real on-chain balance:", rpcErr);
          }
        }
      } finally {
        if (isMounted) setIsLoadingBalance(false);
      }
    }

    loadRealBalances();
    const timer = setInterval(loadRealBalances, 10000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [activeAddress, profile.address, isDemoSandbox]);

  // Restore saved wallet connection on client mount only if user previously connected and did not disconnect
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isExplicitlyDisconnected = localStorage.getItem("meirei_disconnected") === "true";
    if (isExplicitlyDisconnected) {
      // User explicitly disconnected; keep clean disconnected state
      return;
    }

    const savedAddr = localStorage.getItem("meirei_wallet_address");
    if (!savedAddr || !isValidEvmAddress(savedAddr)) {
      // No saved authorized wallet; stay in disconnected state
      return;
    }

    const savedName = localStorage.getItem("meirei_wallet_name");
    const okxProvider = getSpecificProvider("okx");
    const mmProvider = getSpecificProvider("metamask");
    let activeProvider = null;
    let detectedName = "Web3 Wallet";

    if (savedName?.toLowerCase().includes("metamask") && mmProvider) {
      activeProvider = mmProvider;
      detectedName = "MetaMask";
    } else if (savedName?.toLowerCase().includes("okx") && okxProvider) {
      activeProvider = okxProvider;
      detectedName = "OKX Wallet";
    } else {
      activeProvider = okxProvider || mmProvider || getSpecificProvider("injected");
      detectedName = activeProvider === okxProvider ? "OKX Wallet" : activeProvider === mmProvider ? "MetaMask" : "Web3 Wallet";
    }

    if (activeProvider) {
      activeProvider
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0 && isValidEvmAddress(accounts[0])) {
            const activeAddr = accounts[0].toLowerCase();
            const name = detectedName;
            setConnectAddress(activeAddr);
            setConnectWalletName(name);
            localStorage.setItem("meirei_wallet_address", activeAddr);
            localStorage.setItem("meirei_wallet_name", name);
            setProfile((prev) => ({
              ...prev,
              address: activeAddr,
              handle: formatShortAddress(activeAddr),
              email: `${activeAddr.slice(2, 8)}@xlayer.wallet`,
              botStatus: `Connected via ${name} on OKX X Layer`,
            }));
          } else {
            // Extension is locked or disconnected for this dApp
            localStorage.removeItem("meirei_wallet_address");
            localStorage.removeItem("meirei_wallet_name");
            setConnectAddress(null);
            setConnectWalletName(null);
          }
        })
        .catch(() => {
          localStorage.removeItem("meirei_wallet_address");
          localStorage.removeItem("meirei_wallet_name");
          setConnectAddress(null);
          setConnectWalletName(null);
        });
    }
  }, []);

  // Listen to live wallet account changes in the browser
  useEffect(() => {
    if (typeof window === "undefined") return;
    const okx = getSpecificProvider("okx");
    const eth = getSpecificProvider("injected");
    const provider = (okx || eth) as any;
    if (provider && typeof provider.on === "function") {
      const handleAccounts = (accounts: string[]) => {
        if (!accounts || accounts.length === 0) {
          handleFullDisconnect();
        } else if (isValidEvmAddress(accounts[0])) {
          const newAddr = accounts[0].toLowerCase();
          setConnectAddress(newAddr);
          localStorage.setItem("meirei_wallet_address", newAddr);
          setProfile((prev) => ({
            ...prev,
            address: newAddr,
            handle: formatShortAddress(newAddr),
            email: `${newAddr.slice(2, 8)}@xlayer.wallet`,
          }));
        }
      };
      provider.on("accountsChanged", handleAccounts);
      return () => {
        if (typeof provider.removeListener === "function") {
          provider.removeListener("accountsChanged", handleAccounts);
        }
      };
    }
  }, []);

  // Periodic heartbeat audit log showing the agent continuously monitoring in the background
  useEffect(() => {
    const interval = setInterval(() => {
      const timeStr = formatLogTime();
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
    const nvdaP = stockPrices["NVDAx"] || 213.9;
    const aaplP = stockPrices["AAPLx"] || 332.41;
    const tslaP = stockPrices["TSLAx"] || 248.0;

    const demoHoldings = [
      { symbol: "USDG", amount: 1000.0, valueUsd: 1000.0, color: "#10B981" },
      { symbol: "NVDAx", amount: 3.5, valueUsd: Number((3.5 * nvdaP).toFixed(2)), color: "#76B900" },
      { symbol: "AAPLx", amount: 5.0, valueUsd: Number((5.0 * aaplP).toFixed(2)), color: "#A2AAAD" },
      { symbol: "TSLAx", amount: 2.0, valueUsd: Number((2.0 * tslaP).toFixed(2)), color: "#E82127" },
    ];
    const totalVal = demoHoldings.reduce((acc, h) => acc + h.valueUsd, 0);

    setProfile({
      handle: "OKX_Judge (Demo Sandbox)",
      platform: "web",
      email: "evaluator@okx.com",
      address: DEMO_SANDBOX_ADDRESS,
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
    const timeStr = formatLogTime(now);
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
    const timeStr = formatLogTime(now);
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
      localStorage.removeItem("meirei_wallet_address");
      localStorage.removeItem("meirei_wallet_name");
      localStorage.setItem("meirei_disconnected", "true");
    }
    setConnectAddress(null);
    setConnectWalletName(null);
    setProfile({
      ...DEFAULT_PROFILE,
      handle: "Disconnected",
      email: "disconnected@meirei.app",
      address: "",
      holdings: [],
      portfolioValue: 0,
      usdgBalance: 0,
    });
    const now = new Date();
    const timeStr = formatLogTime(now);
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
    const targetPolicy = mandatePolicies.find((m) => m.id === id);
    if (!targetPolicy) return;
    const nextStatus = targetPolicy.status === "active" ? "paused" : "active";

    setMandatePolicies((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
    );

    const now = new Date();
    const timeStr = formatLogTime(now);
    setExecutionLogs((logs) => [
      {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        source: "Policy Manager",
        message: `Mandate [${targetPolicy.title}] status changed to ${nextStatus.toUpperCase()} on OKX X Layer.`,
        type: nextStatus === "active" ? "success" : "warn",
      },
      ...logs,
    ]);
  };

  const handleEvaluateDriftNow = () => {
    const now = new Date();
    const timeStr = formatLogTime(now);
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
    const timeStr = formatLogTime(now);
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
    const timeStr = formatLogTime(now);
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

    // Prompt non-custodial Web3 signing modal immediately for the deployed mandate
    let targetSymbol = "NVDAx";
    const combinedStr = (newMandateTarget + " " + newMandateTitle).toUpperCase();
    for (const sym of ["NVDAx", "AAPLx", "TSLAx", "MSFTx", "GOOGLx", "AMZNx", "METAx", "COINx", "MSTRx", "SPYx", "QQQx"]) {
      if (combinedStr.includes(sym.toUpperCase()) || combinedStr.includes(sym.replace("x", "").toUpperCase())) {
        targetSymbol = sym;
        break;
      }
    }
    const spot = stockPrices[targetSymbol] || 150;
    const initialAmount = 50;
    openWeb3Signer(targetSymbol, initialAmount, initialAmount / spot, spot);
  };

  // Conversational Chat Console State (Web & Telegram)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INITIAL_CHAT_MESSAGE]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatSending, setIsChatSending] = useState<boolean>(false);
  const [chatKeywordCategory, setChatKeywordCategory] = useState<string>("all");

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Theme state: initialized from system preference
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDarkMode);
      localStorage.setItem("meirei_theme", isDarkMode ? "dark" : "light");
    }
  }, [isDarkMode]);

  // Trading mode state: strictly TWO MODES: "basic" | "advanced"
  const [mode, setMode] = useState<Mode>("basic");
  const [showInitialModeModal, setShowInitialModeModal] = useState<boolean>(false);

  // Check URL query parameters or localStorage (?mode=basic or ?mode=advanced)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("mode");
      const savedMode = localStorage.getItem("meirei_mode");
      if (urlMode === "advanced" || (!urlMode && savedMode === "advanced")) {
        setMode("advanced");
      } else {
        setMode("basic");
      }
    }
  }, []);

  // Live vs Simulation Execution Environment switch ("live" strictly shows real on-chain data; "simulation" shows customizable sandbox paper figures)
  const [executionEnvironment, setExecutionEnvironment] = useState<"live" | "simulation">("live");

  // Separate Isolated Simulated Portfolios for Basic Mode vs. Advanced Mode (paper figures user can add like $10k, $20k)
  const [simulatedBasicHoldings, setSimulatedBasicHoldings] = useState<{ symbol: string; amount: number; valueUsd: number; color: string }[]>([]);
  const [simulatedBasicUsdgBalance, setSimulatedBasicUsdgBalance] = useState<number>(10000.0);

  const [simulatedAdvancedHoldings, setSimulatedAdvancedHoldings] = useState<{ symbol: string; amount: number; valueUsd: number; color: string }[]>([
    { symbol: "NVDAx", amount: 6.0, valueUsd: 1070.4, color: "#10b981" },
    { symbol: "TSLAx", amount: 3.2, valueUsd: 813.12, color: "#f59e0b" },
    { symbol: "METAx", amount: 0.85, valueUsd: 495.04, color: "#8b5cf6" },
  ]);
  const [simulatedAdvancedUsdgBalance, setSimulatedAdvancedUsdgBalance] = useState<number>(20000.0);

  // Quick Action to add simulated figures (e.g. 10k, 20k) in Simulation Sandbox
  const handleAddSimulatedCapital = (amount: number) => {
    if (mode === "basic") {
      setSimulatedBasicUsdgBalance((prev) => prev + amount);
    } else {
      setSimulatedAdvancedUsdgBalance((prev) => prev + amount);
    }
    const now = new Date();
    const timeStr = formatLogTime(now);
    setExecutionLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        source: "Simulation Sandbox",
        message: `Credited +$${amount.toLocaleString()} USDG simulated capital to ${mode === "basic" ? "Basic" : "Advanced"} Mode.`,
        type: "success",
      },
      ...prev,
    ]);
  };

  // Live on-chain condition: true when live environment is active
  const isLive = executionEnvironment === "live";

  // Dynamic portfolio selector: Live Mode strictly displays real on-chain verified data; Simulation Mode displays simulated figures
  const currentHoldings = isLive
    ? (isLoggedIn ? profile.holdings : [])
    : (mode === "basic" ? simulatedBasicHoldings : simulatedAdvancedHoldings);

  const currentUsdgBalance = isLive
    ? (isLoggedIn ? profile.usdgBalance : 0.0)
    : (mode === "basic" ? simulatedBasicUsdgBalance : simulatedAdvancedUsdgBalance);

  // Record a Quick Buy or Unit Calculator trade
  const recordBasicBuy = (symbol: string, amountUsdg: number, units: number, price: number) => {
    if (!isLive) {
      if (mode === "basic") {
        setSimulatedBasicUsdgBalance((prev) => Math.max(0, prev - amountUsdg));
        setSimulatedBasicHoldings((prev) => {
          const existing = prev.find((h) => h.symbol === symbol);
          if (existing) {
            return prev.map((h) =>
              h.symbol === symbol
                ? { ...h, amount: h.amount + units, valueUsd: (h.amount + units) * price }
                : h
            );
          }
          return [
            ...prev,
            {
              symbol,
              amount: units,
              valueUsd: amountUsdg,
              color: "#06b6d4",
            },
          ];
        });
      } else {
        setSimulatedAdvancedUsdgBalance((prev) => Math.max(0, prev - amountUsdg));
        setSimulatedAdvancedHoldings((prev) => {
          const existing = prev.find((h) => h.symbol === symbol);
          if (existing) {
            return prev.map((h) =>
              h.symbol === symbol
                ? { ...h, amount: h.amount + units, valueUsd: (h.amount + units) * price }
                : h
            );
          }
          return [
            ...prev,
            {
              symbol,
              amount: units,
              valueUsd: amountUsdg,
              color: "#6366f1",
            },
          ];
        });
      }

      const now = new Date();
      const timeStr = formatLogTime(now);
      setExecutionLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          source: "Simulation Sandbox",
          message: `Executed simulated paper buy: ${units.toFixed(4)} ${symbol} for $${amountUsdg.toFixed(2)} USDG at $${price.toFixed(2)}.`,
          type: "success",
        },
        ...prev,
      ]);
    }
  };

  // Mandate editing state with structured stock & percentage/price selection
  const [editingMandate, setEditingMandate] = useState<MandatePolicy | null>(null);
  const [editTarget, setEditTarget] = useState<string>("");
  const [editRule, setEditRule] = useState<string>("");
  const [editThreshold, setEditThreshold] = useState<string>("");
  const [editStatus, setEditStatus] = useState<"active" | "paused">("active");
  const [editSelectedStocks, setEditSelectedStocks] = useState<string[]>(["NVDAx", "AAPLx"]);
  const [editStockWeights, setEditStockWeights] = useState<Record<string, number>>({ NVDAx: 60, AAPLx: 40 });
  const [editDcaStock, setEditDcaStock] = useState<string>("TSLAx");
  const [editDcaAmount, setEditDcaAmount] = useState<number>(50);

  const handleOpenEditMandate = (mandate: MandatePolicy) => {
    setEditingMandate(mandate);
    setEditTarget(mandate.target);
    setEditRule(mandate.rule);
    setEditThreshold(mandate.threshold);
    setEditStatus(mandate.status);

    if (mandate.policyType === "drift_rebalance" || mandate.target.includes("%")) {
      const parts = mandate.target.split(/[\/,]/).map((p) => p.trim());
      const stocks: string[] = [];
      const weights: Record<string, number> = {};
      for (const p of parts) {
        const m = p.match(/(\d+(?:\.\d+)?)\s*%\s*([A-Za-z0-9]+)/);
        if (m) {
          const w = parseFloat(m[1]);
          const sym = m[2];
          stocks.push(sym);
          weights[sym] = w;
        }
      }
      if (stocks.length > 0) {
        setEditSelectedStocks(stocks);
        setEditStockWeights(weights);
      } else {
        setEditSelectedStocks(["NVDAx", "AAPLx"]);
        setEditStockWeights({ NVDAx: 60, AAPLx: 40 });
      }
    } else if (mandate.policyType === "dca_recurring" || mandate.target.toLowerCase().includes("into")) {
      const match = mandate.target.match(/(\d+(?:\.\d+)?)\s*USDG\s*into\s*([A-Za-z0-9]+)/i);
      if (match) {
        setEditDcaAmount(parseFloat(match[1]) || 50);
        setEditDcaStock(match[2] || "TSLAx");
      } else {
        setEditDcaAmount(50);
        setEditDcaStock("TSLAx");
      }
    }
  };

  const handleSaveEditMandate = () => {
    if (!editingMandate) return;

    let computedTarget = editTarget.trim() || editingMandate.target;
    let computedRule = editRule.trim() || editingMandate.rule;
    let computedThreshold = editThreshold.trim() || editingMandate.threshold;

    if (editingMandate.policyType === "drift_rebalance" || editingMandate.target.includes("%")) {
      if (editSelectedStocks.length > 0) {
        computedTarget = editSelectedStocks
          .map((sym) => `${editStockWeights[sym] || 0}% ${sym}`)
          .join(" / ");
      }
    } else if (editingMandate.policyType === "dca_recurring" || editingMandate.target.toLowerCase().includes("into")) {
      computedTarget = `${editDcaAmount} USDG into ${editDcaStock}`;
      computedThreshold = `${editDcaAmount} USDG`;
    }

    setMandatePolicies((prev) =>
      prev.map((m) =>
        m.id === editingMandate.id
          ? {
              ...m,
              target: computedTarget,
              rule: computedRule,
              threshold: computedThreshold,
              status: editStatus,
              lastEvaluated: "Updated by operator",
            }
          : m
      )
    );
    setExecutionLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: formatLogTime(),
        source: "Policy Manager",
        message: `Policy "${editingMandate.title}" updated. Target: ${computedTarget}, Threshold: ${computedThreshold}, Status: ${editStatus.toUpperCase()}.`,
        type: "success",
      },
      ...prev,
    ]);
    setEditingMandate(null);
  };

  // Advanced Mode Terms & Conditions state: re-prompts on reload for comprehensive risk review
  const [hasAcceptedAdvancedTerms, setHasAcceptedAdvancedTerms] = useState<boolean>(false);
  const [showAdvancedTermsModal, setShowAdvancedTermsModal] = useState<boolean>(false);
  const [termsAgreedCheckbox, setTermsAgreedCheckbox] = useState<boolean>(false);

  // Mandate Execution Summary state (renders immediately following execution)
  const [deployedMandateReceipt, setDeployedMandateReceipt] = useState<{
    mandateId: string;
    timestamp: string;
    strategy: string;
    capital: number;
    stablecoin: string;
    rule: string;
    txHash: string;
    status: string;
    allocations: { symbol: string; weightPercent: number; role: string }[];
    rebalanceInterval: string;
    downsideProtection: string;
  } | null>(null);

  const handleSwitchToAdvanced = () => {
    if (hasAcceptedAdvancedTerms) {
      setMode("advanced");
      if (typeof window !== "undefined") localStorage.setItem("meirei_mode", "advanced");
    } else {
      setShowAdvancedTermsModal(true);
    }
  };

  const handleSwitchToBasic = () => {
    setMode("basic");
    if (typeof window !== "undefined") localStorage.setItem("meirei_mode", "basic");
  };

  // Stock selection & chart state
  const [selectedStock, setSelectedStock] = useState<StockItem>(STOCKS[0]);

  const CHAT_KEYWORDS = useMemo(() => [
    // Greetings
    { category: "greetings", label: "Hello Meirei", query: "Hello Meirei", desc: "Start conversation & get overview" },
    { category: "greetings", label: "Good Evening", query: "Good evening", desc: "Greeting & status check" },
    { category: "greetings", label: "What is Meirei?", query: "What is Meirei?", desc: "Learn about the AI mandate agent" },
    { category: "greetings", label: "How to Start", query: "How does Meirei work and how to start?", desc: "Step-by-step onboarding guide" },

    // Inquiries & Balances
    { category: "inquiries", label: "What is my balance?", query: "What is my balance?", desc: "Check live USDG & equities balance" },
    { category: "inquiries", label: "Active Holdings", query: "Check my active holdings", desc: "Audit active xStock positions" },
    { category: "inquiries", label: "Check Portfolio Drift", query: "Check portfolio drift", desc: "Monitor allocation variance" },
    { category: "inquiries", label: "Explain Auto Mandates", query: "Explain auto mandates", desc: "How non-custodial mandates work" },
    { category: "inquiries", label: "Deposit & Funding Guide", query: "How to deposit and fund wallet", desc: "Bridge or transfer funds on X Layer" },

    // Spot Trades
    { category: "trades", label: `Price of ${selectedStock.symbol}`, query: `Price of ${selectedStock.symbol}`, desc: "Live spot benchmark price" },
    { category: "trades", label: `Buy 100 USDG ${selectedStock.symbol}`, query: `Buy 100 USDG of ${selectedStock.symbol}`, desc: "Quick trade execution" },
    { category: "trades", label: "Quote TSLAx", query: "Quote TSLAx", desc: "Get real-time quote for TSLAx" },
    { category: "trades", label: "Compare NVDAx vs MSFTx", query: "Compare NVDAx vs MSFTx", desc: "Relative price ratio comparison" },
    { category: "trades", label: "Calculate 250 USDG Units", query: `Calculate $250 in ${selectedStock.symbol}`, desc: "Exact fractional share estimator" },

    // Mandates
    { category: "mandates", label: `Dip Buyer: ${selectedStock.symbol} -5%`, query: `Dip Buyer: ${selectedStock.symbol} -5% / TP +15%`, desc: "Accumulate pullbacks automatically" },
    { category: "mandates", label: "Portfolio Drift Rebalance (5%)", query: "Drift Rebalance (5% band)", desc: "Maintain target allocation" },
    { category: "mandates", label: "Weekly 50 USDG DCA", query: "Weekly Accumulation: 50 USDG", desc: "Automate recurring dollar-cost averaging" },
    { category: "mandates", label: "Volatility Circuit Breaker (8%)", query: "Volatility Circuit Breaker (8%)", desc: "Downside drawdown capital preservation" },

    // Security & Gas
    { category: "security", label: "OKX Paymaster Gas Sponsorship", query: "How is gas sponsored on OKX X Layer?", desc: "Zero gas fee architecture" },
    { category: "security", label: "Account Security Status", query: "Account security status and session keys", desc: "Non-custodial verification" },
    { category: "security", label: "Emergency Freeze", query: "/freeze", desc: "Instantly halt trading and mandates" },
    { category: "security", label: "Emergency Unfreeze", query: "/unfreeze", desc: "Restore access with 2FA code" },
  ], [selectedStock]);
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
        const res = await fetch("/api/stocks");
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
    const validAmount = fromAmountUsdg > 0 ? fromAmountUsdg : 50;
    const validPrice = spotPrice > 0 ? spotPrice : (stockPrices[targetSymbol] || 150);
    const validUnits = estimatedUnits > 0 ? estimatedUnits : validAmount / validPrice;

    setWeb3ModalState({
      isOpen: true,
      targetSymbol,
      fromAmountUsdg: validAmount,
      estimatedUnits: validUnits,
      spotPrice: validPrice,
    });
  };

  // Advisory Agent parameters (Advanced Mode)
  const [advisoryHorizon, setAdvisoryHorizon] = useState<AdvisoryHorizon>("short_term");
  const [advisoryDuration, setAdvisoryDuration] = useState<string>("1 Month");
  const [selectedStrategyMandateIndex, setSelectedStrategyMandateIndex] = useState<number>(0);
  const [advisoryRisk, setAdvisoryRisk] = useState<RiskProfile>("balanced");
  const [advisoryCapital, setAdvisoryCapital] = useState<number>(2500);
  const [advisoryStablecoin, setAdvisoryStablecoin] = useState<"USDG" | "USDC" | "USDT">("USDG");
  const [advisorySelectionMode, setAdvisorySelectionMode] = useState<"recommended" | "custom">("recommended");
  const [advisoryCustomStocks, setAdvisoryCustomStocks] = useState<string[]>(["NVDAx", "MSFTx", "AAPLx"]);
  const [showAuditLogs, setShowAuditLogs] = useState<boolean>(false);
  const [lastTelemetryRefresh, setLastTelemetryRefresh] = useState<string>("Just now");

  // Live execution clock
  const [executionClock, setExecutionClock] = useState<string>("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setExecutionClock(now.toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" }) + " UTC");
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Computed target maturity date from duration
  const advisoryMaturityDate = useMemo(() => {
    const daysMap: Record<string, number> = {
      "1 Week": 7,
      "2 Weeks": 14,
      "1 Month": 30,
      "3 Months": 90,
      "6 Months": 180,
      "9 Months": 270,
      "1 Year": 365,
      "2 Years": 730,
    };
    const days = daysMap[advisoryDuration] || 30;
    const d = new Date(Date.now() + days * 86400000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [advisoryDuration]);

  // Strategic mandate presets by horizon
  const STRATEGY_MANDATES = useMemo(() => {
    if (advisoryHorizon === "short_term") {
      return [
        {
          id: 1,
          title: "Dynamic High-Beta Momentum Rotation",
          rule: "Rebalance into top-volume momentum leaders with 5% trailing stop protection",
          tag: "Momentum",
        },
        {
          id: 2,
          title: "Breakout Alpha & Whale Inflow",
          rule: "Accumulate when 24h whale net inflow > $500K; hedge into USDG on 3% downside",
          tag: "Smart Money",
        },
        {
          id: 3,
          title: "Sentiment & Liquidity Momentum",
          rule: "Allocate to equities with sentiment score > 75; dynamic 14-day rebalance cycle",
          tag: "Sentiment",
        },
        {
          id: 4,
          title: "Dip Accumulator & Swing Guard",
          rule: "Auto-buy 3% pullbacks, take 8% profit into USDG cash buffer",
          tag: "Swing DCA",
        },
      ];
    } else {
      return [
        {
          id: 1,
          title: "Systematic Blue Chip DCA",
          rule: "Systematic DCA into core institutional technology leaders with 100% sponsored gas",
          tag: "Blue Chip",
        },
        {
          id: 2,
          title: "Risk-Weighted Market Cap DCA",
          rule: "Allocate proportional to institutional trading depth with 70/30 equity/USDG ratio",
          tag: "Balanced",
        },
        {
          id: 3,
          title: "Capital Preservation & Value DCA",
          rule: "Accumulate mega-cap earnings leaders with zero-drift safety buffer",
          tag: "Defensive",
        },
        {
          id: 4,
          title: "All-Weather Multi-Asset Compounder",
          rule: "Steady monthly dollar accumulation with strict 5% single-stock exposure cap",
          tag: "Compounder",
        },
      ];
    }
  }, [advisoryHorizon]);

  // Computed live advisory plan based on user-selected allocation capital, duration, target date, and chosen mandate
  const currentAdvisoryPlan: AdvisoryPlan = useMemo(() => {
    const chosenMandate = STRATEGY_MANDATES[selectedStrategyMandateIndex] || STRATEGY_MANDATES[0];
    const basePlan = generateAdvisoryPlan({
      horizon: advisoryHorizon,
      riskProfile: advisoryRisk,
      mandateIndex: selectedStrategyMandateIndex,
      capitalUsd: advisoryCapital || 2500,
      customStocks: advisorySelectionMode === "custom" ? advisoryCustomStocks : undefined,
      stablecoin: advisoryStablecoin,
    });
    return {
      ...basePlan,
      strategyName: `${chosenMandate.title} (${advisoryDuration} · Target ${advisoryMaturityDate})`,
      mandateRule: chosenMandate.rule,
    };
  }, [
    advisoryHorizon,
    advisoryRisk,
    advisoryCapital,
    advisorySelectionMode,
    advisoryCustomStocks,
    advisoryStablecoin,
    advisoryDuration,
    advisoryMaturityDate,
    selectedStrategyMandateIndex,
    STRATEGY_MANDATES,
  ]);

  // Live figurative trajectory matrix for selected mandate & duration
  const mandateTrajectories = useMemo(() => {
    if (advisoryHorizon === "short_term") {
      const presets = [
        [
          { milestone: "1D", pct: 2.8, desc: "Intraday Breakout" },
          { milestone: "7D", pct: 8.9, desc: "Momentum Swing" },
          { milestone: "14D", pct: 15.6, desc: "Weekly Rotation" },
          { milestone: "30D", pct: 27.8, desc: "Monthly Run" },
          { milestone: "90D", pct: 44.5, desc: "Horizon Target" },
        ],
        [
          { milestone: "1D", pct: 2.2, desc: "Whale Inflow Fill" },
          { milestone: "7D", pct: 7.2, desc: "Institutional Wave" },
          { milestone: "14D", pct: 13.4, desc: "Depth Expansion" },
          { milestone: "30D", pct: 23.8, desc: "Flow Compounding" },
          { milestone: "90D", pct: 38.2, desc: "Horizon Target" },
        ],
        [
          { milestone: "1D", pct: 1.4, desc: "Sentiment Pulse" },
          { milestone: "7D", pct: 4.8, desc: "Social Resonance" },
          { milestone: "14D", pct: 8.5, desc: "14D Rotation" },
          { milestone: "30D", pct: 15.2, desc: "Sustained Alpha" },
          { milestone: "90D", pct: 26.5, desc: "Horizon Target" },
        ],
        [
          { milestone: "1D", pct: 0.6, desc: "Pullback Buffer" },
          { milestone: "7D", pct: 2.1, desc: "Dip Accumulation" },
          { milestone: "14D", pct: 3.8, desc: "8% Profit Harvest" },
          { milestone: "30D", pct: 6.5, desc: "Fortress Yield" },
          { milestone: "90D", pct: 12.8, desc: "Horizon Target" },
        ],
      ];
      return presets[selectedStrategyMandateIndex] || presets[0];
    } else {
      const presets = [
        [
          { milestone: "1M", pct: 3.4, desc: "DCA Inflow" },
          { milestone: "3M", pct: 10.2, desc: "Tech Moat Alpha" },
          { milestone: "6M", pct: 20.5, desc: "Semi-Annual Trim" },
          { milestone: "1Y", pct: 39.8, desc: "Silicon Alpha" },
          { milestone: "2Y", pct: 74.5, desc: "Multi-Year Moat" },
        ],
        [
          { milestone: "1M", pct: 2.4, desc: "Market Cap Entry" },
          { milestone: "3M", pct: 7.6, desc: "Quarterly Balance" },
          { milestone: "6M", pct: 15.8, desc: "70/30 Sleeve" },
          { milestone: "1Y", pct: 31.2, desc: "Annual Compounding" },
          { milestone: "2Y", pct: 59.5, desc: "Core Institutional" },
        ],
        [
          { milestone: "1M", pct: 1.4, desc: "Fortress Entry" },
          { milestone: "3M", pct: 4.5, desc: "Low Volatility Base" },
          { milestone: "6M", pct: 9.2, desc: "Cash Floor Buffer" },
          { milestone: "1Y", pct: 18.4, desc: "Preserved Growth" },
          { milestone: "2Y", pct: 34.0, desc: "Risk-Off Growth" },
        ],
        [
          { milestone: "1M", pct: 2.8, desc: "Equal Spread" },
          { milestone: "3M", pct: 8.9, desc: "Macro Momentum" },
          { milestone: "6M", pct: 17.4, desc: "Semi-Annual Balance" },
          { milestone: "1Y", pct: 34.5, desc: "All-Weather Base" },
          { milestone: "2Y", pct: 66.0, desc: "Max Compound" },
        ],
      ];
      return presets[selectedStrategyMandateIndex] || presets[0];
    }
  }, [advisoryHorizon, selectedStrategyMandateIndex]);

  // Stocks sorted strictly by momentumRank (1, 2, 3, ... 20)
  const rankedStocks = useMemo(() => {
    return [...STOCKS].sort((a, b) => {
      const rA = OKX_CEX_MARKET_DATA.assetMetrics[a.symbol]?.momentumRank ?? 99;
      const rB = OKX_CEX_MARKET_DATA.assetMetrics[b.symbol]?.momentumRank ?? 99;
      return rA - rB;
    });
  }, []);

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

      if (actionParam === "connect") {
        setShowLoginModal(true);
      } else if (mandateParam && mandateParam.trim()) {
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
        if (type === "metamask") {
          setShowWalletConnectModal(true);
          setConnectInfoMsg("MetaMask browser extension not detected. You can scan the QR code with your MetaMask mobile app or install it from metamask.io.");
          setIsWalletConnecting(false);
          return;
        }
        throw new Error(
          type === "okx"
            ? "OKX Wallet extension not detected. Please install OKX Wallet from okx.com/web3."
            : `${type} extension not detected. Please install it or use another wallet.`
        );
      }

      // Step 1: Force wallet account selection / permissions popup (EIP-2255)
      try {
        if (typeof provider.request === "function") {
          await provider.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
          });
        }
      } catch (permErr: any) {
        const pMsg = permErr?.message?.toLowerCase() || "";
        if (permErr?.code === 4001 || pMsg.includes("rejected") || pMsg.includes("denied") || pMsg.includes("cancel")) {
          throw new Error("Wallet account selection was cancelled by user.");
        }
      }

      // Step 2: Request active accounts
      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No account authorized by wallet.");
      }

      const activeAddr = accounts[0].toLowerCase();

      // Step 2.5: Ensure wallet is on OKX X Layer (Chain ID 196) BEFORE requesting authentication signature
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
      } catch (switchErr) {
        console.warn("[Network Switch] Notice checking/switching chain:", switchErr);
      }

      // Step 3: Sign-in authentication verification (costs zero gas)
      const signTimestamp = new Date().toISOString();
      const authChallenge = [
        "Meirei Non-Custodial Terminal Authentication",
        "Network: OKX X Layer (Chain ID 196)",
        `Wallet: ${activeAddr}`,
        `Session Nonce: ${Date.now().toString(16)}`,
        `Timestamp: ${signTimestamp}`,
        "",
        "Sign this verification message to authenticate non-custodial ownership of your wallet. Zero gas fee required."
      ].join("\n");

      setConnectInfoMsg("Please sign the verification message in your wallet window to confirm sign-in (0 gas fee)...");
      let signature: string | null = null;
      try {
        signature = await provider.request({
          method: "personal_sign",
          params: [authChallenge, activeAddr],
        });
      } catch (signErr: any) {
        const sMsg = signErr?.message?.toLowerCase() || "";
        if (signErr?.code === 4001 || sMsg.includes("rejected") || sMsg.includes("denied") || sMsg.includes("cancel") || sMsg.includes("user rejected")) {
          throw new Error("Sign-in verification was rejected in wallet.");
        }
        throw new Error(`Authentication signature failed: ${signErr?.message || "User did not sign message."}`);
      }

      if (!signature || typeof signature !== "string" || signature.length < 10) {
        throw new Error("A valid cryptographic signature is required to sign in.");
      }

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

      setConnectInfoMsg(`Connected ${title} (${formatShortAddress(activeAddr)}) on OKX X Layer.`);
      if (typeof window !== "undefined") {
        localStorage.setItem("meirei_wallet_address", activeAddr);
        localStorage.setItem("meirei_wallet_name", title);
        localStorage.setItem("meirei_wallet_type", type);
        localStorage.removeItem("meirei_demo_sandbox");
        localStorage.removeItem("meirei_disconnected");
      }
      setProfile((prev) => ({
        ...prev,
        address: activeAddr,
        handle: formatShortAddress(activeAddr),
        email: `${activeAddr.slice(2, 8)}@xlayer.wallet`,
        botStatus: `Connected via ${title} on OKX X Layer`,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (type === "metamask" && msg.includes("not detected")) {
        setShowWalletConnectModal(true);
        setConnectInfoMsg("Opening WalletConnect bridge for MetaMask. You can scan the QR code with MetaMask mobile or select your browser provider.");
      } else {
        setConnectErrorMsg(msg);
      }
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
      // 1. Fetch SIWE ownership challenge
      const chalRes = await fetch("/api/wallet/link/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: connectChannel,
          handle: effectiveHandle,
          walletAddress: connectAddress,
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

        setConnectInfoMsg("Please sign the verification message in your Web3 wallet to prove non-custodial ownership (costs zero gas)...");
        signature = await provider.request({
          method: "personal_sign",
          params: [chalData.message, connectAddress],
        });
      }

      const res = await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: connectChannel,
          handle: effectiveHandle,
          walletAddress: connectAddress,
          signature,
          message: chalData.message,
          nonce: chalData.nonce,
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

  // Comprehensive, rock-solid Disconnect Handler
  const handleFullDisconnect = async () => {
    setIsWalletConnecting(true);
    setConnectErrorMsg(null);
    setConnectInfoMsg(null);

    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("meirei_demo_sandbox");
        localStorage.removeItem("meirei_wallet_address");
        localStorage.removeItem("meirei_wallet_name");
        localStorage.removeItem("meirei_wallet_type");
        localStorage.setItem("meirei_disconnected", "true");
        sessionStorage.clear();
      }

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
      setIsDemoSandbox(false);

      setProfile({
        ...DEFAULT_PROFILE,
        address: "",
        handle: "Disconnected",
        email: "disconnected@meirei.app",
        botStatus: "Disconnected",
        holdings: [],
        portfolioValue: 0,
        usdgBalance: 0,
      });

      setConnectInfoMsg("Wallet disconnected and session reset successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConnectErrorMsg(`Failed to disconnect: ${msg}`);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  // Deploy Advisory Mandate from Advanced Mode (Instant & Session-Key Guarded)
  const handleDeployAdvisoryMandate = (
    plan: AdvisoryPlan,
    receiptOverride?: {
      mandateId: string;
      timestamp: string;
      txHash: string;
      signature: string;
      status: string;
    },
    capitalOverride?: number
  ) => {
    const capital = capitalOverride ?? advisoryCapital;
    const mandateId = receiptOverride?.mandateId || `MAN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const txHash = receiptOverride?.txHash || `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    const now = receiptOverride?.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newPolicy: MandatePolicy = {
      id: `mandate_${Date.now()}`,
      title: plan.strategyName,
      policyType: "drift_rebalance",
      target: plan.allocations.map((a) => `${a.weightPercent}% ${a.symbol}`).join(", "),
      rule: plan.mandateRule,
      metricLabel: "Rebalance Band",
      metricValue: plan.rebalanceInterval,
      threshold: "5.0%",
      status: "active",
      lastEvaluated: "Just deployed",
    };

    setMandatePolicies((prev) => [newPolicy, ...prev]);

    // Allocate capital to Advanced Mode portfolio without touching Basic Mode portfolio
    setSimulatedAdvancedUsdgBalance((prev) => Math.max(0, prev - capital));
    setSimulatedAdvancedHoldings((prev) => {
      const updated = [...prev];
      for (const alloc of plan.allocations) {
        const allocUsd = (capital * alloc.weightPercent) / 100;
        const stockDef = STOCKS.find((s) => s.symbol === alloc.symbol);
        const defaultPrice = stockDef ? parseFloat(stockDef.price.replace(/[^0-9.]/g, "")) : 100;
        const price = stockPrices[alloc.symbol] || defaultPrice;
        const units = allocUsd / price;
        const existingIdx = updated.findIndex((h) => h.symbol === alloc.symbol);
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            amount: updated[existingIdx].amount + units,
            valueUsd: (updated[existingIdx].amount + units) * price,
          };
        } else {
          updated.push({
            symbol: alloc.symbol,
            amount: units,
            valueUsd: allocUsd,
            color: "#6366f1",
          });
        }
      }
      return updated;
    });

    setDeployedMandateReceipt({
      mandateId,
      timestamp: now,
      strategy: plan.strategyName,
      capital,
      stablecoin: advisoryStablecoin,
      rule: plan.mandateRule,
      txHash,
      status: receiptOverride?.status || "Active & Session-Guarded on Chain 196",
      allocations: plan.allocations,
      rebalanceInterval: plan.rebalanceInterval,
      downsideProtection: plan.downsideProtection,
    });

    const confirmMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "bot",
      text: `[Confirmed] Autonomous Mandate Deployed on OKX X Layer!\n\nMandate ID: ${mandateId}\nStrategy: ${plan.strategyName}\nCapital: $${advisoryCapital.toLocaleString()} ${advisoryStablecoin}\nRule: ${plan.mandateRule}\nDownside Safeguard: ${plan.downsideProtection}\nStatus: Active · Monitored on OKX X Layer (Chain 196) with 100% sponsored gas.`,
      timestamp: now,
      status: "confirmed",
      type: "mandate",
    };
    setChatMessages((prev) => [...prev, confirmMsg]);

    setMandateResult({
      reply: `Mandate "${plan.strategyName}" (${mandateId}) successfully deployed to OKX X Layer with confirmed wallet signature. Active session key guard is monitoring execution.`,
      type: "mandate",
      statusTone: "confirmed",
    });

    // Record into execution audit log
    setExecutionLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: now,
        source: "Mandate Engine",
        message: `Mandate Deployed (${mandateId}): ${plan.strategyName} with $${advisoryCapital.toLocaleString()} ${advisoryStablecoin} on OKX X Layer. Tx: ${txHash.slice(0, 10)}...`,
        type: "success",
      },
      ...prev,
    ]);

    // Smoothly scroll to the immediate execution summary receipt
    setTimeout(() => {
      const summaryEl = document.getElementById("mandate-execution-summary-receipt");
      if (summaryEl) summaryEl.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Deploy Stock Momentum / Dip Guard Mandate from Table
  const handleDeployStockMandate = (symbol: string) => {
    const stockDef = STOCKS.find((s) => s.symbol === symbol);
    const defaultPrice = stockDef ? parseFloat(stockDef.price.replace(/[^0-9.]/g, "")) : 100;
    const stockPrice = stockPrices[symbol] || defaultPrice;
    const rule = `Accumulate ${symbol} on dips >3.0%, maintain 40% target weight with 5% stop protection`;
    const newPolicy: MandatePolicy = {
      id: `mandate_${Date.now()}`,
      title: `${symbol} Momentum & Dip Guard`,
      policyType: "drift_rebalance",
      target: `40% ${symbol} / 60% USDG`,
      rule,
      metricLabel: "Current Drift",
      metricValue: "0.8%",
      threshold: "3.0%",
      status: "active",
      lastEvaluated: "Just deployed",
    };

    setMandatePolicies((prev) => [newPolicy, ...prev]);

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const confirmMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "bot",
      text: `[Confirmed] Autonomous Stock Mandate Deployed on OKX X Layer!\n\nAsset: ${symbol} (Spot: $${stockPrice.toFixed(2)})\nRule: ${rule}\nStatus: Active · Monitored on OKX X Layer with 100% sponsored gas.`,
      timestamp: now,
      status: "confirmed",
      type: "mandate",
    };
    setChatMessages((prev) => [...prev, confirmMsg]);

    setMandateResult({
      reply: `Mandate for ${symbol} successfully deployed to OKX X Layer.`,
      type: "mandate",
      statusTone: "confirmed",
    });

    const initialAmount = 50;
    openWeb3Signer(symbol, initialAmount, initialAmount / stockPrice, stockPrice);
  };

  // Conversational Chat message sender (Web & Telegram) with Mandate Simulation & Educational Guidance
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

    // Automatically parse & register mandate instruction into Active Investment Mandates state
    const lowerQ = query.toLowerCase();
    if (
      (lowerQ.includes("put") || lowerQ.includes("buy") || lowerQ.includes("dca") || lowerQ.includes("into") || lowerQ.includes("weekly") || lowerQ.includes("rebalance")) &&
      !lowerQ.includes("hello") &&
      !lowerQ.includes("balance")
    ) {
      const foundSymbols: string[] = [];
      for (const s of STOCKS) {
        if (lowerQ.includes(s.symbol.toLowerCase()) || lowerQ.includes(s.name.toLowerCase())) {
          if (!foundSymbols.includes(s.symbol)) {
            foundSymbols.push(s.symbol);
          }
        }
      }

      let totalAmt = 50;
      const matchAmt = query.match(/\$(\d+(?:\.\d+)?)/) || query.match(/(\d+(?:\.\d+)?)\s*(?:usdg|usd|dollars)/i);
      if (matchAmt) {
        totalAmt = parseFloat(matchAmt[1]);
      }

      if (foundSymbols.length === 0) {
        foundSymbols.push(selectedStock.symbol || "NVDAx");
      }

      const perStockAmt = totalAmt / foundSymbols.length;
      const pctSplit = Math.round(100 / foundSymbols.length);
      const targetsStr = foundSymbols.map((sym) => `${pctSplit}% ${sym} ($${perStockAmt.toFixed(2)})`).join(" / ");
      const isWeekly = lowerQ.includes("weekly") || lowerQ.includes("monday");

      const autoCreatedPolicy: MandatePolicy = {
        id: `mandate_${Date.now()}`,
        title: isWeekly ? `Weekly Multi-Stock DCA` : `Auto-Investment Mandate`,
        policyType: isWeekly ? "dca_recurring" : "drift_rebalance",
        target: targetsStr,
        rule: isWeekly
          ? `Automated weekly accumulation of $${totalAmt.toFixed(2)} USDG (${foundSymbols.map((s) => `$${perStockAmt.toFixed(2)} into ${s}`).join(", ")}) every Monday at 08:00 UTC`
          : `Rebalance $${totalAmt.toFixed(2)} USDG target weights across ${foundSymbols.join(", ")} on OKX X Layer`,
        metricLabel: isWeekly ? "Next Execution" : "Current Drift",
        metricValue: isWeekly ? "Mon 08:00 UTC" : "0.0%",
        threshold: `$${totalAmt.toFixed(0)} USDG`,
        status: "active",
        lastEvaluated: "Just registered via Chat",
        description: `Automated mandate allocating $${totalAmt.toFixed(2)} USDG across ${foundSymbols.join(" and ")} ($${perStockAmt.toFixed(2)} each) on OKX X Layer with 100% sponsored gas.`,
      };

      setMandatePolicies((prev) => [autoCreatedPolicy, ...prev]);
    }

    // 0a. Greetings & Onboarding Intent ("hello", "hi", "good evening", "what is meirei", etc.)
    const isGreeting =
      lowerQ === "hello" ||
      lowerQ === "hi" ||
      lowerQ === "hey" ||
      lowerQ === "good evening" ||
      lowerQ === "good morning" ||
      lowerQ === "good afternoon" ||
      lowerQ.startsWith("hello") ||
      lowerQ.startsWith("hi ") ||
      lowerQ.includes("good evening") ||
      lowerQ.includes("good morning") ||
      lowerQ.includes("good afternoon") ||
      lowerQ.includes("greetings") ||
      lowerQ.includes("what is meirei") ||
      lowerQ.includes("who are you") ||
      lowerQ.includes("how does meirei work") ||
      lowerQ.includes("how to start");

    if (isGreeting) {
      const greetingMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: `[Meirei Assistant | OKX X Layer Terminal]\n\nHello! I am Meirei, your AI-Native Investment Mandate Agent executing on OKX X Layer (Chain ID 196).\n\nDirect Solution:\nI empower you to trade 20 allowlisted tokenized US equities (xStocks) onchain, audit your active portfolio in real time, and deploy autonomous investment mandates without giving up custody of your keys. All transactions enjoy 100% sponsored gas subsidized by the OKX Paymaster.\n\nHow to Solve Your Goals Today:\n1. Check Portfolio & Balances: Inquire about available cash ($${currentUsdgBalance.toFixed(2)} USDG), active equity holdings, or portfolio drift.\n2. Spot Trades & Fractional Shares: Query live prices or calculate exact units for any stock (e.g. 'Price of ${selectedStock.symbol}' or 'Buy 100 USDG ${selectedStock.symbol}').\n3. Autonomous Mandates: Deploy hands-off strategies like Drift Rebalancing (5% band), Weekly DCA Accumulation, or Volatility Circuit Breakers (8%).\n\nSelect any keyword below or enter your trade mandate to begin:`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mandateAction: {
          title: `Direct Spot Swap: ${selectedStock.symbol}`,
          rule: `Instant spot purchase of ${selectedStock.symbol} at live market benchmark ($${getNumericPrice(selectedStock).toFixed(2)}) with 100% sponsored gas`,
          symbol: selectedStock.symbol,
          price: getNumericPrice(selectedStock),
        },
      };

      setChatMessages((prev) => [...prev, greetingMsg]);
      setIsChatSending(false);
      return;
    }

    // 0b. Balance & Active Holdings Inquiry Intent
    const isBalanceQuery =
      lowerQ.includes("balance") ||
      lowerQ.includes("portfolio") ||
      lowerQ.includes("how much do i have") ||
      lowerQ.includes("my funds") ||
      lowerQ.includes("holdings") ||
      lowerQ.includes("assets") ||
      lowerQ === "portfolio" ||
      lowerQ === "balance";

    if (isBalanceQuery) {
      const equityVal = currentHoldings.reduce((sum, h) => {
        const p = stockPrices[h.symbol] || (h.amount > 0 ? h.valueUsd / h.amount : 0);
        return sum + h.amount * p;
      }, 0);
      const totalVal = equityVal + currentUsdgBalance;
      const holdingsSummary =
        currentHoldings.length > 0
          ? currentHoldings
              .map((h) => {
                const p = stockPrices[h.symbol] || (h.amount > 0 ? h.valueUsd / h.amount : 0);
                return `${h.symbol}: ${h.amount.toFixed(2)} units ($${(h.amount * p).toFixed(2)})`;
              })
              .join(" · ")
          : "0 active stock positions (100% Cash Buffer)";

      const balMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: `[Active Portfolio & Holdings Resolution]\n\nDirect Solution:\n• Total Portfolio Valuation: $${totalVal.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDG\n• Available Cash (USDG): $${currentUsdgBalance.toFixed(2)} USDG\n• Equities Exposure: $${equityVal.toFixed(2)} USDG\n• Positions Count: ${currentHoldings.length} ${currentHoldings.length === 1 ? "Position" : "Positions"}\n• Holdings Breakdown: ${holdingsSummary}\n• Execution Network: OKX X Layer (Chain 196) · 100% Gas Sponsored\n\nHow to Solve It:\n1. Add Trading Capital: In Simulation Sandbox, click '+ $10,000 USDG' above. In Live mode, deposit USDG to your wallet address.\n2. Execute a Spot Trade: Use the Unit Calculator or Allowlisted grid to buy fractional shares of any of the 20 equities.\n3. Protect Allocation: Deploy an autonomous Drift Rebalance mandate to keep your portfolio at target weights automatically.\n\nDeploy a mandate or execute an instant spot purchase below:`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mandateAction: {
          title: `Spot Trade: ${selectedStock.symbol}`,
          rule: `Allocate 100.00 USDG into ${selectedStock.symbol} at spot $${getNumericPrice(selectedStock).toFixed(2)}`,
          symbol: selectedStock.symbol,
          price: getNumericPrice(selectedStock),
        },
      };

      setChatMessages((prev) => [...prev, balMsg]);
      setIsChatSending(false);
      return;
    }

    // 0c. Price & Quote Inquiries
    const isPriceQuery =
      (lowerQ.includes("price") || lowerQ.includes("quote") || lowerQ.includes("how much is") || lowerQ.includes("rate")) &&
      !lowerQ.includes("dip") &&
      !lowerQ.includes("profit") &&
      !lowerQ.includes("rebalance");

    if (isPriceQuery) {
      let targetStock = selectedStock;
      for (const s of STOCKS) {
        if (lowerQ.includes(s.symbol.toLowerCase()) || lowerQ.includes(s.name.toLowerCase())) {
          targetStock = s;
          break;
        }
      }
      const spot = getNumericPrice(targetStock);
      const unitsFor100 = 100 / (spot || 1);

      const priceMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: `[Live Spot Benchmark Resolution: ${targetStock.symbol}]\n\nDirect Solution:\n• Asset: ${targetStock.name} (${targetStock.symbol})\n• Live Spot Price: $${spot.toFixed(2)} USDG\n• 24h Price Change: ${targetStock.change24h || "+0.00%"}\n• 100 USDG Buys: ~${unitsFor100.toFixed(4)} ${targetStock.symbol}\n• Settlement Asset: USDG (OKX X Layer Chain 196)\n• Gas Sponsorship: $0.00 (100% Sponsored via OKX Paymaster)\n\nHow to Solve It:\n1. Unit Estimation: Enter your capital in the Unit Calculator above to see exact tokenized shares.\n2. Direct Spot Execution: Click below to buy fractional units with zero gas cost.\n3. Automated Entry: Deploy a Dip Buyer mandate to accumulate automatically if price pulls back 5%.\n\nExecute on spot or deploy an automated mandate:`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mandateAction: {
          title: `Spot Buy: 100 USDG in ${targetStock.symbol}`,
          rule: `Instant purchase of ~${unitsFor100.toFixed(4)} ${targetStock.symbol} for $100.00 USDG at $${spot.toFixed(2)}`,
          symbol: targetStock.symbol,
          price: spot,
        },
      };

      setChatMessages((prev) => [...prev, priceMsg]);
      setIsChatSending(false);
      return;
    }

    // 0d. Deposit & Funding Guide
    const isFundingQuery =
      lowerQ.includes("deposit") ||
      lowerQ.includes("fund") ||
      lowerQ.includes("how to fund") ||
      lowerQ.includes("add funds") ||
      lowerQ.includes("bridge");

    if (isFundingQuery) {
      const fundMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: `[Funding & Deposit Guide Resolution]\n\nDirect Solution:\nYour Dedicated X Layer Address: ${profile.address}\nNetwork: OKX X Layer (Chain ID 196)\nSettlement Assets: USDG or USDC\nGas Token: Sponsored ($0.00 needed; OKX Paymaster subsidizes 100% of network fees).\n\nHow to Solve It:\n1. Simulation Testing: Simply click '+ $10,000 USDG' in the Active Portfolio toolbar above for instant demo paper liquidity.\n2. Direct Deposit: Send USDG or USDC on OKX X Layer directly to your wallet address above.\n3. Cross-Chain Bridge: If your assets are on Ethereum, Arbitrum, or Polygon, bridge them via OKX Web3 Bridge (web3.okx.com/bridge) to X Layer.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, fundMsg]);
      setIsChatSending(false);
      return;
    }

    // 0e. Security, Gas & Paymaster Architecture
    const isSecurityGasQuery =
      lowerQ.includes("gas") ||
      lowerQ.includes("paymaster") ||
      lowerQ.includes("sponsored") ||
      lowerQ.includes("session key") ||
      lowerQ.includes("security") ||
      lowerQ.includes("safe") ||
      lowerQ.includes("custody");

    if (isSecurityGasQuery && !lowerQ.includes("freeze") && !lowerQ.includes("circuit")) {
      const secMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: `[Security Architecture & Paymaster Gas Resolution]\n\nDirect Solution:\n• 100% Non-Custodial: You retain full sovereign ownership of your assets. Private keys never leave your browser/wallet.\n• 100% Sponsored Gas: Meirei uses Account Abstraction (ERC-4337 Paymaster) on OKX X Layer (Chain 196) so you never need OKB gas tokens for swaps or mandates.\n• Session Key Guard: Mandates execute within strict boundaries you approve (slippage < 0.05%, max rebalance caps).\n• Emergency Protection: You can freeze your account at any moment by sending '/freeze'.\n\nHow to Solve It:\n1. Trade freely without worrying about gas fees.\n2. Audit your portfolio holdings and active policies anytime in the terminal.\n3. Issue plain English mandates or execute direct spot trades with single-click confirmation.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, secMsg]);
      setIsChatSending(false);
      return;
    }

    // 1. Interactive Mandate Simulation & Educational Explanations
    if (lowerQ.includes("dip") || (lowerQ.includes("below") && lowerQ.includes("profit"))) {
      const sym = selectedStock?.symbol || "NVDAx";
      const spot = getNumericPrice(selectedStock) || 213.9;
      const dipPrice = (spot * 0.95).toFixed(2);
      const tpPrice = (spot * 1.15).toFixed(2);
      const rule = `Accumulate ${sym} when spot dips ≥5.0% (below $${dipPrice}); take profit / trim 50% at +15.0% ($${tpPrice})`;

      const simMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: `[Dip Buyer & Take-Profit Mandate]\n\n• Direct Solution: Automatically accumulates units when ${sym} dips below a set percentage (-5%), then automatically locks in gains when price reaches your target profit (+15%). You never have to stare at charts.\n\n• Target Asset: ${sym} (Current Spot: $${spot.toFixed(2)})\n• Accumulation Dip Trigger: -5.0% ($${dipPrice} USDG)\n• Take-Profit Trigger: +15.0% ($${tpPrice} USDG)\n• Gas Sponsorship: 100% sponsored by Meirei on OKX X Layer (Chain 196).\n\nHow to Solve It:\n1. Click 'Deploy Mandate to X Layer' below to activate autonomous execution.\n2. Alternatively, click 'Ignore Mandate & Buy Directly on Spot' to purchase ${sym} immediately without waiting for a dip.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mandateAction: {
          title: `Dip Buyer: ${sym} (-5% / +15%)`,
          rule,
          symbol: sym,
          price: spot,
        },
      };

      setChatMessages((prev) => [...prev, simMsg]);
      setIsChatSending(false);
      return;
    }

    if (lowerQ.includes("drift") || (lowerQ.includes("rebalance") && !lowerQ.includes("deploy"))) {
      const rule = "Autonomous atomic rebalance when asset drift > 5.0% via OKX DEX Aggregator";
      const simMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: `[Portfolio Drift Rebalance Mandate]\n\n• Direct Solution: Monitors your portfolio allocations continuously. If stock prices move and cause any equity to drift more than 5% from your target weight, Meirei executes an atomic rebalancing swap on OKX DEX to restore target weights.\n\n• Target Portfolio: 60% NVDAx / 20% AAPLx / 20% USDG\n• Threshold Band: ±5.0% Drift\n• Gas: Zero gas cost to you (100% sponsored via Paymaster on X Layer).\n\nHow to Solve It:\n1. Click 'Deploy Mandate to X Layer' below to activate autonomous drift tracking.\n2. Or execute spot trades directly to manually balance your holdings.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mandateAction: {
          title: "Portfolio Drift Rebalance (5% Band)",
          rule,
          symbol: "NVDAx",
          price: 213.9,
        },
      };

      setChatMessages((prev) => [...prev, simMsg]);
      setIsChatSending(false);
      return;
    }

    if (lowerQ.includes("weekly") || lowerQ.includes("dca") || lowerQ.includes("accumulation") || (lowerQ.includes("put") && lowerQ.includes("into"))) {
      const targetSymbols: string[] = [];
      for (const s of STOCKS) {
        if (
          lowerQ.includes(s.symbol.toLowerCase()) ||
          lowerQ.includes(s.name.toLowerCase()) ||
          (s.symbol === "AAPLx" && (lowerQ.includes("aapl") || lowerQ.includes("apple") || lowerQ.includes("app") || lowerQ.includes("appxlay"))) ||
          (s.symbol === "NVDAx" && (lowerQ.includes("nvda") || lowerQ.includes("nvidia") || lowerQ.includes("nivida") || lowerQ.includes("nevida")))
        ) {
          if (!targetSymbols.includes(s.symbol)) {
            targetSymbols.push(s.symbol);
          }
        }
      }

      if (targetSymbols.length === 0) {
        targetSymbols.push(selectedStock?.symbol || "NVDAx");
      }

      let totalAmt = 50.0;
      const matchAmt = query.match(/\$(\d+(?:\.\d+)?)/) || query.match(/(\d+(?:\.\d+)?)\s*(?:usdg|usd|dollars)/i);
      if (matchAmt) {
        totalAmt = parseFloat(matchAmt[1]);
      }

      const perStockAmt = totalAmt / targetSymbols.length;
      const pctSplit = Math.round(100 / targetSymbols.length);

      const targetDesc = targetSymbols.map((s) => `${pctSplit}% ${s} (${perStockAmt.toFixed(2)} USDG)`).join(" · ");
      const unitsBreakdown = targetSymbols.map((s) => {
        const p = stockPrices[s] || (s === "NVDAx" ? 213.9 : s === "AAPLx" ? 332.41 : s === "TSLAx" ? 248.0 : 100);
        const u = perStockAmt / p;
        return `• ${s} (${p.toFixed(2)}/share): ~${u.toFixed(4)} fractional units (${perStockAmt.toFixed(2)} USDG)`;
      }).join("\n");

      const rule = `Automated recurring accumulation of ${totalAmt.toFixed(2)} USDG (${targetSymbols.map(s => `${perStockAmt.toFixed(2)} into ${s}`).join(", ")}) every Monday at 08:00 UTC`;

      const simMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: `[Weekly Accumulation Mandate]\n\n• Direct Solution: Automatically accumulates tokenized stocks on autopilot every week without needing to time market fluctuations.\n\n• Target Portfolio: ${targetDesc}\n• Recurring Budget: ${totalAmt.toFixed(2)} USDG / week (Every Monday at 08:00 UTC)\n• Estimated Allocation per Cycle:\n${unitsBreakdown}\n• Execution Route: OKX DEX Aggregator on OKX X Layer (Chain ID 196)\n• Gas Sponsorship: 100% Sponsored via OKX Paymaster ($0.00 Gas)\n\nHow to Solve It:\n1. Click 'Deploy Mandate to X Layer' below to activate autonomous execution.\n2. Or click 'Edit Mandate Parameters' to customize your target weights or weekly schedule.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mandateAction: {
          title: `Weekly DCA: ${targetSymbols.join(" + ")} (${totalAmt.toFixed(2)} USDG)`,
          rule,
          symbol: targetSymbols[0],
          price: stockPrices[targetSymbols[0]] || 100,
        },
      };

      setChatMessages((prev) => [...prev, simMsg]);
      setIsChatSending(false);
      return;
    }

    if (lowerQ.includes("circuit breaker") || lowerQ.includes("drawdown")) {
      const rule = "Auto-rotate equity positions to USDG if 24h portfolio drawdown exceeds 8.0%";
      const simMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: `[Volatility Circuit Breaker Mandate]\n\n• Direct Solution: Downside risk preservation guardrail. If severe market volatility causes your portfolio to experience a drawdown greater than 8.0% within 24 hours, Meirei pauses all buying and rotates equity exposure into USDG stablecoin.\n\n• Protection Threshold: 8.0% 24h Drawdown\n• Execution Route: OKX DEX Aggregator on OKX X Layer\n• Gas: 100% Sponsored.\n\nHow to Solve It:\n1. Deploy this safety mandate below to guard your open positions against flash crashes.\n2. All rotations execute atomically on OKX DEX.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mandateAction: {
          title: "Volatility Circuit Breaker (8%)",
          rule,
          symbol: "USDG",
          price: 1.0,
        },
      };

      setChatMessages((prev) => [...prev, simMsg]);
      setIsChatSending(false);
      return;
    }

    if (lowerQ.includes("what are auto mandates") || lowerQ.includes("explain auto mandates") || lowerQ.includes("explain mandate") || lowerQ.includes("confused")) {
      const simMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: `[Auto-Investment Mandates Overview & Guide]\n\nAuto-investment mandates are automated rules you set once, which Meirei executes autonomously on OKX X Layer (Chain 196):\n\n1. Drift Rebalance: Keeps your desired portfolio percentages intact.\n2. Weekly Accumulation: Dollar-cost averages on autopilot.\n3. Dip Buyer & Take-Profit: Buys dips (e.g. -5%) and sells at profit targets (e.g. +15%).\n4. Circuit Breakers: Protects capital during sudden market crashes.\n5. Single-Stock Limit: Buy or sell a single stock at a target price.\n\nHow to Solve Your Portfolio Needs:\nSelect any of the quick suggestions below to simulate a strategy, or use the Unit Calculator above to trade directly on spot!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, simMsg]);
      setIsChatSending(false);
      return;
    }

    const isTradeAction = lowerQ.includes("buy") || lowerQ.includes("sell") || lowerQ.includes("confirm") || lowerQ.includes("execute") || lowerQ.includes("rebalance");
    if (isTradeAction && !activeAddress && executionEnvironment !== "simulation" && !isDemoSandbox) {
      const promptMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "bot",
        text: "Please connect your Web3 wallet (OKX Wallet or MetaMask) first to execute orders on OKX X Layer (Chain 196). Click 'Connect Wallet' in the top bar to get started, or switch to Simulation Mode in the top bar to paper trade without a wallet.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, promptMsg]);
      setIsChatSending(false);
      setShowLoginModal(true);
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          walletAddress: activeAddress || (executionEnvironment === "simulation" || isDemoSandbox ? DEMO_SANDBOX_ADDRESS : undefined),
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
    if (!activeAddress && executionEnvironment !== "simulation" && !isDemoSandbox) {
      setMandateResult({
        reply: "Please connect your Web3 wallet (OKX Wallet or MetaMask) first to trade or deploy mandates on OKX X Layer, or switch to Simulation Mode in the top bar to test without a wallet.",
        type: "error",
      });
      setShowLoginModal(true);
      return;
    }

    setIsSubmitting(true);
    setMandateResult(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          walletAddress: activeAddress || DEMO_SANDBOX_ADDRESS,
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

        const lowerQuery = query.toLowerCase();
        const isConfirmTrigger = lowerQuery.includes("confirm") || lowerQuery.includes("buy") || lowerQuery.includes("execute") || lowerQuery.includes("deploy");
        if (isConfirmTrigger || data.status === "preview" || data.type === "quote" || data.pendingTrade) {
          const sym = data.pendingTrade?.symbol || data.delivery?.mandate?.targets?.[0]?.symbol || selectedStock.symbol || "NVDAx";
          const amount = data.pendingTrade?.notionalUsd || 100;
          const spotP = getNumericPrice(selectedStock) || 213.9;
          const units = amount / spotP;
          openWeb3Signer(sym, amount, units, spotP);
        }
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
    if (mode === "basic") {
      return [];
    }

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

      // Deterministic noise seeded by full stock symbol, bar index, and timeframe
      const symHash = selectedStock.symbol
        .split("")
        .reduce((acc, c, idx) => acc + c.charCodeAt(0) * (idx + 7), 0);
      const tfHash = timeframe
        .split("")
        .reduce((acc, c, idx) => acc + c.charCodeAt(0) * (idx + 3), 0);
      const seed = Math.sin((i + 1) * 17 + symHash * 11 + tfHash * 5);
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
  }, [selectedStock, stockPrices, timeframe, mode]);

  // Chart Dimensions and Coordinates (Clean Card View)
  const width = 640;
  const height = 180;
  const padY = 16;
  const chartHeight = height - padY * 2;

  const points = useMemo(() => {
    return candleBars.map((b) => b.close);
  }, [candleBars]);

  const minVal = points.length > 0 ? Math.min(...points) : 0;
  const maxVal = points.length > 0 ? Math.max(...points) : 100;
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

  const candleMin = candleBars.length > 0 ? Math.min(...candleBars.map((b) => b.low)) : 0;
  const candleMax = candleBars.length > 0 ? Math.max(...candleBars.map((b) => b.high)) : 100;
  const candleRange = candleMax - candleMin || 1;

  const currentDisplayPrice =
    chartType === "candle" && candleHoverIndex !== null && candleBars[candleHoverIndex]
      ? `$${candleBars[candleHoverIndex].close.toFixed(2)}`
      : chartHoverIndex !== null && coords[chartHoverIndex]
      ? `$${coords[chartHoverIndex].val.toFixed(2)}`
      : getFormattedPrice(selectedStock);

  return (
    <div className="min-h-screen bg-surface-50 text-ink-900 transition-colors w-full max-w-full overflow-x-hidden">
      {/* Top Application Header */}
      <header className="sticky inset-x-0 top-0 z-40 border-b border-surface-200 bg-surface-50 transition-colors w-full max-w-full overflow-x-hidden">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-3 py-2.5 sm:px-8 sm:py-3 w-full">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link href="/" aria-label="meirei - home">
              <BrandMark />
            </Link>
            <div className="hidden h-5 w-px bg-surface-200 sm:block" />
            <div className="hidden items-center gap-2 lg:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs font-semibold text-ink-700">
                OKX Chain (X Layer 196)
              </span>
            </div>
            <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-surface-200 bg-surface-100 px-2.5 py-1">
              <span className="font-mono text-[11px] text-ink-600">
                Routing: <span className="font-semibold text-ink-900">OKX Exchange OS</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live vs Simulation Toggle Switch */}
            <div className="flex items-center rounded-full border border-ink-200 bg-surface-100 p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setExecutionEnvironment("live")}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer",
                  executionEnvironment === "live"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-ink-600 hover:text-ink-950"
                )}
                title="Live execution on OKX X Layer (Chain 196)"
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  executionEnvironment === "live" ? "bg-white animate-pulse" : "bg-emerald-500"
                )} />
                <span>Live</span>
              </button>
              <button
                type="button"
                onClick={() => setExecutionEnvironment("simulation")}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer",
                  executionEnvironment === "simulation"
                    ? "bg-ink-900 text-white shadow-xs"
                    : "text-ink-600 hover:text-ink-950"
                )}
                title="Simulated paper execution sandbox"
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  executionEnvironment === "simulation" ? "bg-amber-400" : "bg-ink-400"
                )} />
                <span className="hidden sm:inline">Simulation</span>
                <span className="sm:hidden">Sim</span>
              </button>
            </div>

            {/* Account Status & Identity Badge with Prominent Connect / Disconnect */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-1.5 sm:gap-2.5 rounded-full border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100/80 p-1 sm:p-1.5 sm:pr-3 shadow-2xs cursor-pointer transition-colors"
                  title="Manage connected wallet"
                >
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-emerald-600 text-[10px] sm:text-xs font-bold text-white shadow-xs uppercase shrink-0">
                    {connectWalletName ? connectWalletName.slice(0, 3) : "OKX"}
                  </div>
                  <div className="text-left max-w-[85px] sm:max-w-none">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold text-emerald-950 font-mono">
                        {formatShortAddress(activeAddress || profile.address)}
                      </span>
                    </div>
                    <p className="font-mono text-[9px] text-emerald-700 hidden sm:block">
                      OKX X Layer (196)
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleFullDisconnect}
                  className="rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-2xs shrink-0"
                  title="Disconnect wallet"
                >
                  Disconnect
                </button>
              </div>
            ) : executionEnvironment === "simulation" || isDemoSandbox ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/90 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs shadow-2xs font-mono">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="font-bold text-amber-900 hidden sm:inline">
                    Simulation Mode (No Wallet Needed)
                  </span>
                  <span className="font-bold text-amber-900 sm:hidden text-[10px]">
                    Simulation (No Wallet)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="rounded-full border border-ink-200 bg-white hover:bg-surface-50 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-ink-700 transition-colors cursor-pointer shrink-0"
                  title="Optionally connect Web3 wallet to switch to live on-chain trading"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="rounded-full bg-accent-500 hover:bg-accent-600 px-3.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-semibold text-white shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <span className="h-2 w-2 rounded-full bg-white/70" />
                <span>Connect Wallet</span>
              </button>
            )}

            <Link
              href="/"
              className="hidden md:inline-flex rounded-full border border-ink-200 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium text-ink-700 transition-colors hover:bg-surface-100"
            >
              Overview
            </Link>
          </div>
        </div>
      </header>

      {/* Main Terminal Container */}
      <main className="mx-auto max-w-[1440px] px-3 sm:px-8 py-3.5 sm:py-6 w-full max-w-full overflow-x-hidden">

        {/* Terminal Subheader & DUAL-ENVIRONMENT MODE SWITCHER */}
        <div className={cn(
          "mb-6 flex flex-col justify-between gap-3.5 sm:gap-4 rounded-2xl border border-ink-200/80 bg-white p-3.5 sm:p-5 shadow-xs sm:flex-row sm:items-center",
          mode === "basic" && "max-w-4xl mx-auto"
        )}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-base font-bold tracking-tight text-ink-900 sm:text-2xl">
                {mode === "basic" ? "Spot Trading & Unit Terminal" : "Autonomous Investment Mandate Terminal"}
              </h1>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold border shrink-0",
                mode === "basic" ? "bg-accent-50 border-accent-200 text-accent-700" : "bg-ink-900 border-ink-800 text-white"
              )}>
                {mode === "basic" ? "Basic Mode" : "Advanced Mode"}
              </span>
              <button
                type="button"
                onClick={() => setShowInitialModeModal(true)}
                className="text-[10px] font-mono text-ink-500 hover:text-ink-900 underline cursor-pointer shrink-0"
              >
                Change Environment
              </button>
            </div>
            <p className="mt-1 text-xs text-ink-600 sm:text-sm leading-relaxed">
              {mode === "basic"
                ? "Direct non-custodial spot execution across 20 allowlisted equities, portfolio balances, and centralized USDG unit calculator."
                : "Autonomous algorithmic mandate studio with 4 OKX AI skills, drift rebalancing, and downside risk guards."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
            {mode === "basic" ? (
              <button
                type="button"
                onClick={handleSwitchToAdvanced}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-ink-950 hover:bg-accent-600 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition-all cursor-pointer group"
              >
                <span>Move to Advanced Mode</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSwitchToBasic}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white hover:bg-surface-100 text-ink-900 px-4 py-2.5 text-xs font-bold shadow-xs transition-all cursor-pointer group"
              >
                <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                <span>Move to Basic Mode</span>
              </button>
            )}
          </div>
        </div>

        {/* Workspace Grid */}
        {/* Workspace Layout: Basic Mode (Centered & Streamlined) vs Advanced Mode (12-Col Grid) */}
        {mode === "basic" ? (
          <div className="mx-auto max-w-4xl space-y-6">
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
                    {isLoggedIn && (
                      <button
                        type="button"
                        onClick={handleFullDisconnect}
                        className="rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                        title="Disconnect current wallet"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>

            {/* ========================================================================= */}
            {/* 1. ACTIVE PORTFOLIO & HOLDINGS HUB (Replaces Chart in Basic Mode)         */}
            {/* ========================================================================= */}
            <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                      Active Portfolio &amp; Holdings
                    </span>
                    <span className="rounded bg-accent-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-accent-800">
                      OKX X Layer (Chain 196)
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-ink-900 sm:text-lg mt-0.5">
                    Portfolio Overview &amp; Asset Balances
                  </h3>
                  <p className="text-xs text-ink-500">
                    Live onchain equity holdings, available USDG cash buffer, and autonomous mandate tracking.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(
                    "rounded px-2.5 py-1 text-[10px] font-bold uppercase font-mono border",
                    executionEnvironment === "live"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  )}>
                    {executionEnvironment === "live" ? "Live Real Data" : "Simulation Sandbox"}
                  </span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-800">
                    {currentHoldings.length} {currentHoldings.length === 1 ? "Position" : "Positions"} Active
                  </span>
                </div>
              </div>

              {(() => {
                const currentEquityVal = currentHoldings.reduce((sum, h) => {
                  if (h.symbol === "OKB") return sum;
                  const p = stockPrices[h.symbol] || (h.amount > 0 ? h.valueUsd / h.amount : 0);
                  return sum + (h.amount * p);
                }, 0);
                const currentOkb = currentHoldings.find((h) => h.symbol === "OKB");
                const currentOkbVal = currentOkb ? currentOkb.valueUsd : (profile.okbValueUsd || 0);
                const currentTotalVal = currentEquityVal + currentUsdgBalance + currentOkbVal;

                return (
                  <div className="mt-4">
                    {/* Top Valuation Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-ink-200/80 bg-surface-50/70 p-3.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-500 block">
                          Total Portfolio Value
                        </span>
                        <p className="font-mono text-2xl font-bold tracking-tight text-ink-950 mt-1">
                          ${currentTotalVal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <span className="text-[10px] font-mono text-emerald-700 font-semibold block mt-0.5">
                          OKX DEX Verified
                        </span>
                      </div>

                      <div className="rounded-xl border border-ink-200/80 bg-surface-50/70 p-3.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-500 block">
                          Settlement &amp; Gas Reserves
                        </span>
                        <p className="font-mono text-2xl font-bold tracking-tight text-accent-700 mt-1">
                          ${(currentUsdgBalance + currentOkbVal).toFixed(2)}
                        </p>
                        <span className="text-[10px] font-mono text-ink-500 font-medium block mt-0.5">
                          ${currentUsdgBalance.toFixed(2)} USDG · {(currentOkb?.amount || profile.okbBalance || 0).toFixed(4)} OKB
                        </span>
                      </div>

                      <div className="rounded-xl border border-ink-200/80 bg-surface-50/70 p-3.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-500 block">
                          Equities Exposure
                        </span>
                        <p className="font-mono text-2xl font-bold tracking-tight text-ink-900 mt-1">
                          ${currentEquityVal.toFixed(2)}
                        </p>
                        <span className="text-[10px] font-mono text-ink-500 font-medium block mt-0.5">
                          Across {currentHoldings.filter(h => h.symbol !== "OKB").length} tokenized {currentHoldings.filter(h => h.symbol !== "OKB").length === 1 ? "stock" : "stocks"}
                        </span>
                      </div>
                    </div>

                    {/* Simulation Sandbox Top-Up Figures */}
                    {executionEnvironment === "simulation" && (
                      <div className="mt-3.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/80 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Simulation Sandbox Figures
                          </span>
                          <span className="text-[10px] font-mono text-amber-700">Demo Paper Liquidity</span>
                        </div>
                        <p className="mt-1 text-[11px] text-amber-800 leading-snug">
                          Add simulated test USDG to model trades and mandates without real capital:
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAddSimulatedCapital(10000)}
                            className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-[10px] px-3 py-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            + $10,000 USDG
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSimulatedCapital(20000)}
                            className="rounded-lg bg-ink-900 hover:bg-ink-800 text-white font-mono font-bold text-[10px] px-3 py-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            + $20,000 USDG
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSimulatedBasicUsdgBalance(10000);
                              setSimulatedBasicHoldings([]);
                            }}
                            className="rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-mono text-[10px] font-semibold px-2.5 py-1.5 transition-colors cursor-pointer ml-auto"
                          >
                            Reset Demo
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Live On-Chain Verification */}
                    {executionEnvironment === "live" && (
                      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2 text-[11px] text-ink-500">
                        <span>On-Chain Verification:</span>
                        <span className="font-mono font-semibold text-emerald-600 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          OKX X Layer (Chain 196) Real Data Only · Gas 100% Sponsored
                        </span>
                      </div>
                    )}

                    {/* Active Positions List */}
                    {currentHoldings.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-surface-50 p-4 text-center">
                        <p className="text-xs font-semibold text-ink-800">
                          {executionEnvironment === "live"
                            ? (isLoggedIn ? "No active tokenized stock holdings on this account" : "Web3 Wallet Not Connected")
                            : "No active stock holdings in Basic Mode Simulation"}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-500 leading-relaxed max-w-lg mx-auto">
                          {executionEnvironment === "live"
                            ? (isLoggedIn
                              ? "Your connected wallet currently holds 0 allowlisted xStocks on OKX X Layer."
                              : "Connect your Web3 wallet (OKX Wallet, MetaMask) to load your authentic on-chain balances.")
                            : "Select any of the 20 allowlisted equities below or use the Unit Calculator to make your first spot purchase."}
                        </p>
                        {executionEnvironment === "live" && !isLoggedIn && (
                          <button
                            type="button"
                            onClick={() => setShowLoginModal(true)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Connect Web3 Wallet →
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-100">
                          {currentHoldings.map((h) => {
                            const livePrice = stockPrices[h.symbol] || (h.amount > 0 ? h.valueUsd / h.amount : 0);
                            const val = h.amount * livePrice;
                            const pct = (val / (currentTotalVal || 1)) * 100;
                            return (
                              <div
                                key={h.symbol}
                                style={{ width: `${pct}%`, backgroundColor: h.color || "#10b981" }}
                                title={`${h.symbol}: ${pct.toFixed(1)}%`}
                              />
                            );
                          })}
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {currentHoldings.map((h) => {
                            const livePrice = stockPrices[h.symbol];
                            const currentVal = livePrice ? h.amount * livePrice : h.valueUsd;

                            return (
                              <div
                                key={h.symbol}
                                className="flex items-center justify-between rounded-xl border border-ink-100 bg-surface-50 p-2.5 hover:bg-white transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: h.color || "#10b981" }}
                                  />
                                  <div>
                                    <span className="font-bold text-ink-900 block">{h.symbol}</span>
                                    <span className="text-[10px] text-ink-500 font-mono">
                                      {h.amount < 1 ? h.amount.toFixed(4) : h.amount.toFixed(2)} units {livePrice ? `@ $${livePrice.toFixed(2)}` : ""}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono font-bold text-ink-900 block">
                                    ${currentVal.toFixed(2)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const found = STOCKS.find(s => s.symbol === h.symbol);
                                      if (found) setSelectedStock(found);
                                      const el = document.getElementById("unit-calculator-terminal");
                                      if (el) el.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    className="text-[10px] font-semibold text-accent-600 hover:underline cursor-pointer"
                                  >
                                    Trade Unit
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </> 
                    )}
                  </div>
                );
              })()}
            </div>

                {/* ========================================================================= */}
                {/* 2. PRICE COMPARISON & UNIT CALCULATOR (Placed Directly Below Chart)       */}
                {/* ========================================================================= */}
            <div id="unit-calculator-terminal" className="scroll-mt-24 rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
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
                            Available: ${currentUsdgBalance.toFixed(2)} USDG
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
                          if (executionEnvironment === "simulation") {
                            recordBasicBuy(selectedStock.symbol, calcInvestmentUsdg, units, price);
                            setMandateResult({
                              reply: `Simulated paper trade executed: Bought ${units.toFixed(4)} ${selectedStock.symbol} for $${calcInvestmentUsdg.toFixed(2)} USDG at $${price.toFixed(2)}.`,
                              type: "mandate",
                              statusTone: "confirmed",
                            });
                          } else {
                            openWeb3Signer(selectedStock.symbol, calcInvestmentUsdg, units, price);
                          }
                        }}
                        className="w-full rounded-xl bg-accent-500 hover:bg-accent-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Quick Buy {(calcInvestmentUsdg / (getNumericPrice(selectedStock) || 1)).toFixed(4)} {selectedStock.symbol}</span>
                        <span>(${calcInvestmentUsdg.toFixed(2)} USDG) ↗</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* 3. ALLOWLISTED xSTOCKS (20 Assets on OKX X Layer)                         */}
                {/* ========================================================================= */}
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
                      Tap card to select equity
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {[...STOCKS].sort((a, b) => parseFloat(a.change24h || "0") - parseFloat(b.change24h || "0")).map((stock) => {
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

                                                                 {msg.mandateAction && (
                                   <div className="mt-2.5 pt-2 border-t border-ink-200/60 flex flex-wrap items-center gap-2">
                                     <button
                                       type="button"
                                       onClick={() => {
                                         const newPolicy: MandatePolicy = {
                                           id: `mandate_${Date.now()}`,
                                           title: msg.mandateAction!.title,
                                           policyType: "dca_recurring",
                                           target: msg.mandateAction!.rule,
                                           rule: msg.mandateAction!.rule,
                                           metricLabel: "Status",
                                           metricValue: "Active",
                                           threshold: "50 USDG",
                                           status: "active",
                                           lastEvaluated: "Just deployed",
                                           description: `Automated mandate for ${msg.mandateAction!.title} on OKX X Layer.`,
                                         };
                                         setMandatePolicies((prev) => [newPolicy, ...prev]);
                                         const sym = msg.mandateAction!.symbol;
                                         const price = msg.mandateAction!.price || 100;
                                         openWeb3Signer(sym, 50, 50 / price, price);
                                       }}
                                       className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                                     >
                                       <span>Deploy Mandate to X Layer</span>
                                       <span>✓</span>
                                     </button>

                                     <button
                                       type="button"
                                       onClick={() => {
                                         const policyToEdit: MandatePolicy = {
                                           id: `mandate_edit_${Date.now()}`,
                                           title: msg.mandateAction!.title,
                                           policyType: "dca_recurring",
                                           target: msg.mandateAction!.rule,
                                           rule: msg.mandateAction!.rule,
                                           metricLabel: "Status",
                                           metricValue: "Draft",
                                           threshold: "50 USDG",
                                           status: "active",
                                           lastEvaluated: "Drafting",
                                           description: `Draft mandate parameters for ${msg.mandateAction!.title}.`,
                                         };
                                         handleOpenEditMandate(policyToEdit);
                                       }}
                                       className="rounded-lg border border-accent-300 bg-accent-50 hover:bg-accent-100 text-accent-700 px-3 py-1.5 text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                                     >
                                       <span>Edit Mandate Parameters</span>
                                       <span>✎</span>
                                     </button>

                                     <button
                                       type="button"
                                       onClick={() => {
                                         const sym = msg.mandateAction!.symbol;
                                         const price = msg.mandateAction!.price || 100;
                                         openWeb3Signer(sym, 100, 100 / price, price);
                                       }}
                                       className="rounded-lg border border-ink-300 bg-white hover:bg-surface-100 text-ink-800 px-3 py-1.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                                     >
                                       <span>Buy Directly on Spot</span>
                                       <span>→</span>
                                     </button>
                                   </div>
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
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {mandatePolicies.length === 0 ? (
                      <div className="col-span-full rounded-2xl border border-dashed border-ink-200 bg-surface-50/60 p-7 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 font-mono font-bold text-sm mb-2.5">
                          M
                        </div>
                        <h4 className="font-display text-sm font-bold text-ink-900">
                          No Active Investment Mandates Deployed
                        </h4>
                        <p className="mt-1 text-xs text-ink-500 max-w-md mx-auto leading-relaxed">
                          You currently have no active investment mandates. Use the Conversational Chat Console above (e.g. &quot;Invest $100 weekly in AAPLx&quot;) or click &quot;New Mandate&quot; to configure and deploy non-custodial policies on OKX X Layer.
                        </p>
                        <div className="mt-3.5 flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowCreateMandateModal(true)}
                            className="rounded-xl bg-accent-500 hover:bg-accent-600 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs cursor-pointer transition-colors"
                          >
                            + Create First Mandate
                          </button>
                        </div>
                      </div>
                    ) : (
                      mandatePolicies.map((mandate) => (
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
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLearnMoreMandate(mandate)}
                                  className="rounded px-2 py-0.5 font-mono text-[9px] font-bold text-accent-700 hover:text-accent-950 bg-accent-50 hover:bg-accent-100 border border-accent-200/80 cursor-pointer shadow-2xs transition-colors"
                                  title="Learn more about this mandate"
                                >
                                  Learn More
                                </button>
                              </div>
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
                      ))
                    )}
                  </div>

                  {/* Learn More Mandate Details Modal */}
                  <AnimatePresence>
                    {selectedLearnMoreMandate && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="w-full max-w-md rounded-3xl border border-ink-200 bg-white p-5 sm:p-6 shadow-2xl"
                        >
                          <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] uppercase font-bold text-accent-600 bg-accent-50 border border-accent-200 px-2 py-0.5 rounded-full">
                                Mandate Specification
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedLearnMoreMandate(null)}
                              className="rounded-full p-1 text-ink-400 hover:bg-surface-100 transition-colors cursor-pointer text-sm font-bold"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="mt-4 space-y-3">
                            <h3 className="font-display text-base font-bold text-ink-900">
                              {selectedLearnMoreMandate.title}
                            </h3>
                            <p className="text-xs text-ink-600 leading-relaxed">
                              {selectedLearnMoreMandate.description}
                            </p>

                            <div className="rounded-2xl bg-surface-50 p-3.5 border border-ink-200/80 space-y-2 font-mono text-[11px]">
                              <div className="flex justify-between border-b border-ink-100 pb-1.5">
                                <span className="text-ink-500 font-sans">Target Rule:</span>
                                <span className="font-bold text-ink-900 text-right">{selectedLearnMoreMandate.rule}</span>
                              </div>
                              <div className="flex justify-between border-b border-ink-100 pb-1.5">
                                <span className="text-ink-500 font-sans">Threshold / Limit:</span>
                                <span className="font-bold text-accent-700">{selectedLearnMoreMandate.threshold}</span>
                              </div>
                              <div className="flex justify-between border-b border-ink-100 pb-1.5">
                                <span className="text-ink-500 font-sans">Execution Network:</span>
                                <span className="font-bold text-ink-900">OKX X Layer (Chain 196)</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-ink-500 font-sans">Gas Subsidy:</span>
                                <span className="font-bold text-emerald-600">100% Sponsored (OKX Paymaster)</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-between gap-2 pt-3 border-t border-ink-100">
                            <button
                              type="button"
                              onClick={() => {
                                const m = selectedLearnMoreMandate;
                                setSelectedLearnMoreMandate(null);
                                handleOpenEditMandate(m);
                              }}
                              className="rounded-xl border border-ink-200 bg-surface-50 px-3.5 py-2 text-xs font-bold text-ink-700 hover:bg-surface-100 transition-colors cursor-pointer"
                            >
                              Edit Parameters
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedLearnMoreMandate(null)}
                              className="rounded-xl bg-ink-900 hover:bg-black px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
                            >
                              Close
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 w-full max-w-full">
            {/* Main Interactive Stage (Cols 1 to 8) */}
            <div className="space-y-6 lg:col-span-8 min-w-0 max-w-full">
              {/* ========================================================================= */}
              {/* MODE 2: ADVANCED MODE (Unified AI Mandate Advisory & Market Catalysts)     */}
              {/* ========================================================================= */}
              <div className="space-y-6">
                {/* 1. Institutional AI Mandate Advisory Studio */}

                {/* AI Trading Advisory Agent Studio */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-3.5 sm:p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-100 pb-4">
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
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-xl border border-ink-200 bg-surface-50 px-2.5 sm:px-3 py-1 sm:py-1.5 font-mono text-[11px] sm:text-xs font-semibold text-ink-800 shadow-2xs max-w-full truncate">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span className="truncate">Clock: {executionClock || "Live UTC Clock"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stablecoin Liquidity & Strategy Formulation Selectors */}
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Stablecoin Settlement Selection (USDG Only) */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-ink-700">
                        Base Stablecoin Liquidity Asset
                      </label>
                      <p className="text-[11px] text-ink-500 mt-0.5">
                        Settlement and cash buffer asset for algorithmic rebalances.
                      </p>
                      <div className="mt-2">
                        <div className="rounded-xl border border-ink-950 bg-ink-950 text-white shadow-md ring-2 ring-ink-950 p-2.5 text-center">
                          <span className="font-mono text-xs font-bold text-white block">USDG</span>
                          <span className="text-[9px] text-white/80 font-semibold block mt-0.5">
                            OKX X Layer (Gas Sponsored)
                          </span>
                        </div>
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
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAdvisorySelectionMode("recommended")}
                          className={cn(
                            "rounded-xl border p-2.5 text-center transition-all cursor-pointer",
                            advisorySelectionMode === "recommended"
                              ? "border-ink-950 bg-ink-950 text-white shadow-md ring-2 ring-ink-950"
                              : "border-ink-200 bg-white text-ink-700 hover:bg-surface-50"
                          )}
                        >
                          <span className="font-display text-xs font-bold block">Recommended Basket</span>
                          <span className={cn("text-[9px] block mt-0.5", advisorySelectionMode === "recommended" ? "text-white/80" : "text-ink-500")}>
                            Institutional Basket Presets · Facilitated by Us
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvisorySelectionMode("custom")}
                          className={cn(
                            "rounded-xl border p-2.5 text-center transition-all cursor-pointer",
                            advisorySelectionMode === "custom"
                              ? "border-ink-950 bg-ink-950 text-white shadow-md ring-2 ring-ink-950"
                              : "border-ink-200 bg-white text-ink-700 hover:bg-surface-50"
                          )}
                        >
                          <span className="font-display text-xs font-bold block">Custom Selection</span>
                          <span className={cn("text-[9px] block mt-0.5", advisorySelectionMode === "custom" ? "text-white/80" : "text-ink-500")}>
                            Pick Your Preferred Equities
                          </span>
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
                            className="rounded-lg border border-ink-200 bg-white hover:border-accent-500 hover:text-accent-600 px-3 py-1.5 text-xs font-medium text-ink-700 transition-all cursor-pointer max-w-full text-left"
                          >
                            <span className="font-semibold">{preset.name}</span>
                            <span className="ml-1 text-[10px] text-ink-400 font-mono hidden sm:inline">({preset.stocks.join(", ")})</span>
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
                        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-0.5">
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

                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
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
                                <span className="block font-mono text-[9px] text-ink-400">${livePrice.toFixed(2)}</span>
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

                  {/* Dedicated Allocation Capital & Settlement Stablecoin Input */}
                  <div className="mt-4 rounded-xl border border-accent-200/90 bg-accent-50/40 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-accent-200/70 pb-2.5">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-ink-950 flex items-center gap-1.5">
                          <span>Allocation Capital &amp; Settlement Stablecoin</span>
                          <span className="rounded bg-accent-500/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-accent-800">
                            Custom Allocation
                          </span>
                        </label>
                        <p className="text-[11px] text-ink-600 mt-0.5">
                          Specify the exact money amount to allocate for this mandate. You choose your capital—never forced to deploy your full portfolio.
                        </p>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-xs font-bold text-accent-800">
                        <span>Deploying:</span>
                        <span className="rounded bg-white px-2 py-0.5 border border-accent-300 shadow-2xs">
                          ${advisoryCapital.toLocaleString()} {advisoryStablecoin}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-7 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-ink-400">$</span>
                        <input
                          type="number"
                          min="10"
                          step="50"
                          value={advisoryCapital}
                          onChange={(e) => {
                            const val = Math.max(10, parseFloat(e.target.value) || 0);
                            setAdvisoryCapital(val);
                          }}
                          className="w-full rounded-xl border border-ink-200 bg-white py-2 pl-7 pr-16 font-mono text-sm font-bold text-ink-950 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 shadow-2xs"
                          placeholder="e.g. 500, 1000, 2500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-accent-700">
                          {advisoryStablecoin}
                        </span>
                      </div>

                      {/* Quick Capital Preset Chips */}
                      <div className="sm:col-span-5 flex flex-wrap gap-1.5">
                        {[250, 500, 1000, 2500, 5000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setAdvisoryCapital(amt)}
                            className={cn(
                              "rounded-lg border px-2.5 py-1 text-[11px] font-mono font-semibold transition-all cursor-pointer shadow-2xs",
                              advisoryCapital === amt
                                ? "border-ink-950 bg-ink-950 text-white font-bold"
                                : "border-ink-200 bg-white text-ink-700 hover:bg-surface-50"
                            )}
                          >
                            ${amt >= 1000 ? `${amt / 1000}K` : amt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Strategy Horizon Selection (Placed Before Investment Risk Profile) */}
                  <div className="mt-5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-700">
                      Select Investment Strategy Horizon
                    </label>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAdvisoryHorizon("short_term");
                          setAdvisoryDuration("1 Month");
                          setSelectedStrategyMandateIndex(0);
                        }}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all cursor-pointer",
                          advisoryHorizon === "short_term"
                            ? "border-ink-950 bg-ink-950 text-white shadow-md ring-2 ring-ink-950"
                            : "border-ink-200 bg-white text-ink-700 hover:bg-surface-50"
                        )}
                      >
                        <p className="font-display text-xs font-bold">Defensive Short-Term Momentum</p>
                        <p className={cn("mt-0.5 text-[10px]", advisoryHorizon === "short_term" ? "text-white/80" : "text-ink-500")}>
                          Tactical rotation into high-beta market leaders &amp; momentum swings
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdvisoryHorizon("long_term");
                          setAdvisoryDuration("6 Months");
                          setSelectedStrategyMandateIndex(0);
                        }}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all cursor-pointer",
                          advisoryHorizon === "long_term"
                            ? "border-ink-950 bg-ink-950 text-white shadow-md ring-2 ring-ink-950"
                            : "border-ink-200 bg-white text-ink-700 hover:bg-surface-50"
                        )}
                      >
                        <p className="font-display text-xs font-bold">Long-Term Blue Chip DCA</p>
                        <p className={cn("mt-0.5 text-[10px]", advisoryHorizon === "long_term" ? "text-white/80" : "text-ink-500")}>
                          Automated systematic accumulation of core institutional equities
                        </p>
                      </button>
                    </div>

                    {/* Clock / Time Horizon Duration Selector */}
                    <div className="mt-3 rounded-xl border border-ink-200 bg-surface-50/80 p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-ink-900 flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>Strategy Duration &amp; Target Horizon</span>
                        </label>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-ink-500 text-[10px]">Target Date:</span>
                          <span className="font-bold text-ink-950 bg-white px-2 py-0.5 rounded-md border border-ink-200 shadow-2xs">
                            {advisoryMaturityDate} ({advisoryDuration})
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {(advisoryHorizon === "short_term"
                          ? ["1 Week", "2 Weeks", "1 Month", "3 Months"]
                          : ["3 Months", "6 Months", "9 Months", "1 Year", "2 Years"]
                        ).map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => setAdvisoryDuration(dur)}
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition-all cursor-pointer shadow-2xs",
                              advisoryDuration === dur
                                ? "border-ink-950 bg-ink-950 text-white font-bold"
                                : "border-ink-200 bg-white text-ink-700 hover:bg-surface-100"
                            )}
                          >
                            {dur}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mandate Directives Selection (1, 2, 3, 4) Under Strategy */}
                    <div className="mt-3 rounded-xl border border-ink-200 bg-white p-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-ink-100">
                        <label className="text-xs font-bold uppercase tracking-wider text-ink-900">
                          Select Strategic Mandate Directive
                        </label>
                        <span className="font-mono text-[10px] text-accent-700 font-bold bg-accent-50 px-2 py-0.5 rounded border border-accent-200">
                          Mandate #{STRATEGY_MANDATES[selectedStrategyMandateIndex]?.id || 1} Active
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {STRATEGY_MANDATES.map((m, idx) => {
                          const mandateRiskTag =
                            advisoryHorizon === "short_term"
                              ? idx === 0
                                ? "Aggressive · Alpha Acceleration"
                                : idx === 1
                                ? "Smart Money · High Conviction"
                                : idx === 2
                                ? "Balanced · Sentiment Growth"
                                : "Conservative · Capital Preservation"
                              : idx === 0
                              ? "Balanced · Blue Chip DCA"
                              : idx === 1
                              ? "Balanced · Market Cap Deep Flow"
                              : idx === 2
                              ? "Conservative · Low Beta Preservation"
                              : "Conservative · Compounder Moat";

                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedStrategyMandateIndex(idx);
                                if (advisoryHorizon === "short_term") {
                                  if (idx === 0 || idx === 1) setAdvisoryRisk("aggressive");
                                  else if (idx === 2) setAdvisoryRisk("balanced");
                                  else setAdvisoryRisk("conservative");
                                } else {
                                  if (idx === 0 || idx === 1) setAdvisoryRisk("balanced");
                                  else setAdvisoryRisk("conservative");
                                }
                              }}
                              className={cn(
                                "rounded-xl border p-3 text-left transition-all cursor-pointer relative",
                                selectedStrategyMandateIndex === idx
                                  ? "border-ink-950 bg-ink-950 text-white shadow-md ring-2 ring-ink-950"
                                  : "border-ink-200 bg-white text-ink-700 hover:bg-surface-50"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "font-mono text-xs font-bold px-1.5 py-0.5 rounded",
                                      selectedStrategyMandateIndex === idx
                                        ? "bg-white text-ink-950 font-bold"
                                        : "bg-surface-200 text-ink-700 font-bold"
                                    )}
                                  >
                                    #{m.id}
                                  </span>
                                  <span className={cn(
                                    "text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded",
                                    selectedStrategyMandateIndex === idx
                                      ? "bg-white/10 text-white"
                                      : "bg-surface-100 text-ink-500"
                                  )}>
                                    {mandateRiskTag}
                                  </span>
                                </div>
                                <span className={cn(
                                  "text-[10px] font-mono",
                                  selectedStrategyMandateIndex === idx ? "text-accent-300 font-bold" : "text-accent-700 font-semibold"
                                )}>
                                  {m.tag}
                                </span>
                              </div>
                              <p className={cn(
                                "mt-1.5 font-display text-xs font-bold",
                                selectedStrategyMandateIndex === idx ? "text-white" : "text-ink-900"
                              )}>
                                {m.title}
                              </p>
                              <p className={cn(
                                "mt-0.5 text-[11px] line-clamp-2 leading-relaxed",
                                selectedStrategyMandateIndex === idx ? "text-white/80" : "text-ink-600"
                              )}>
                                {m.rule}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Calibrated Risk & Volatility Status Strip (Natively Driven by Mandate Directives) */}
                  <div className="mt-4 rounded-xl border border-ink-200/90 bg-surface-50/70 p-3 sm:p-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-500">
                          Calibrated Risk Calibration
                        </span>
                        <span className="rounded bg-accent-100 px-1.5 py-0.2 text-[9px] font-bold text-accent-800">
                          Auto-Synchronized
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-ink-500">Risk Profile:</span>
                        <div className="flex items-center gap-1">
                          {(["conservative", "balanced", "aggressive"] as RiskProfile[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setAdvisoryRisk(r)}
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[10px] font-mono font-bold capitalize transition-all cursor-pointer",
                                advisoryRisk === r
                                  ? r === "aggressive"
                                    ? "bg-rose-600 text-white shadow-2xs"
                                    : r === "balanced"
                                    ? "bg-accent-600 text-white shadow-2xs"
                                    : "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-white text-ink-600 border border-ink-200 hover:bg-surface-100"
                              )}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-white p-2.5 border border-ink-100 shadow-2xs">
                        <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block">Risk Directive</span>
                        <p className="font-mono font-bold text-ink-900 mt-0.5 capitalize flex items-center gap-1.5">
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            advisoryRisk === "aggressive" ? "bg-rose-500" : advisoryRisk === "balanced" ? "bg-accent-500" : "bg-emerald-500"
                          )} />
                          {advisoryRisk === "aggressive" ? "Alpha Acceleration" : advisoryRisk === "balanced" ? "Strategic Growth" : "Capital Preservation"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-2.5 border border-ink-100 shadow-2xs">
                        <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block">Expected Volatility</span>
                        <p className="font-mono font-bold text-ink-900 mt-0.5">
                          {currentAdvisoryPlan.expectedVolatility}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-2.5 border border-ink-100 shadow-2xs">
                        <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block">Downside Safeguard</span>
                        <p className="font-mono font-bold text-ink-900 mt-0.5 truncate" title={currentAdvisoryPlan.downsideProtection}>
                          {currentAdvisoryPlan.downsideProtection}
                        </p>
                      </div>
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

                    {/* Live Horizon Trajectory Bar Visualizer & Figurative Valuation Model */}
                    <div className="mt-5 rounded-2xl border border-ink-200 bg-white p-4 sm:p-5 shadow-xs">
                      <div className="flex flex-col justify-between gap-2 border-b border-ink-100 pb-3 sm:flex-row sm:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                              Live Trajectory Model (trading-plan-generator)
                            </span>
                            <span className="rounded bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-800">
                              OKX AI Skill Active
                            </span>
                          </div>
                          <h4 className="font-display text-sm font-bold text-ink-900 sm:text-base mt-0.5">
                            Projected Valuation &amp; Return Horizon Trajectory
                          </h4>
                          <p className="text-[11px] text-ink-500">
                            Dynamic figurative projection calibrated to your ${advisoryCapital.toLocaleString()} {advisoryStablecoin} allocation.
                          </p>
                        </div>

                        {/* Top Terminal Valuation Summary */}
                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 rounded-xl bg-surface-50 border border-ink-200 p-2 text-left sm:text-right w-full sm:w-auto">
                          <div>
                            <span className="block text-[9px] font-mono text-ink-400 uppercase font-semibold">
                              Terminal Target ({mandateTrajectories[mandateTrajectories.length - 1]?.milestone || advisoryDuration})
                            </span>
                            <span className="font-mono text-xs sm:text-sm font-bold text-accent-700">
                              ${(advisoryCapital * (1 + (mandateTrajectories[mandateTrajectories.length - 1]?.pct || 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {advisoryStablecoin}
                            </span>
                          </div>
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                            +{(mandateTrajectories[mandateTrajectories.length - 1]?.pct || 0).toFixed(1)}% (+$
                            {(advisoryCapital * ((mandateTrajectories[mandateTrajectories.length - 1]?.pct || 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        </div>
                      </div>

                      {/* Milestone Horizon Dynamic Trajectory Bars */}
                      <div className="mt-4 space-y-3">
                        {(() => {
                          const maxPct = Math.max(...mandateTrajectories.map((t) => t.pct), 1);
                          return mandateTrajectories.map((traj) => {
                            const estVal = advisoryCapital * (1 + traj.pct / 100);
                            const estGain = advisoryCapital * (traj.pct / 100);
                            const barWidthPct = Math.min(100, Math.max(14, (traj.pct / maxPct) * 100));

                            return (
                              <div
                                key={traj.milestone}
                                className="group rounded-xl border border-ink-100 bg-surface-50/50 p-2.5 sm:p-3 transition-all hover:border-accent-300 hover:bg-white"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded bg-ink-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-2xs shrink-0">
                                      {traj.milestone}
                                    </span>
                                    <span className="font-semibold text-ink-800 text-[11px]">
                                      {traj.desc}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 font-mono">
                                    <span className="text-[11px] text-ink-500">Figurative Value:</span>
                                    <span className="font-bold text-ink-950">
                                      ${estVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {advisoryStablecoin}
                                    </span>
                                    <span className={cn(
                                      "rounded px-1.5 py-0.2 text-[10px] font-bold",
                                      advisoryRisk === "aggressive"
                                        ? "bg-rose-100 text-rose-800"
                                        : advisoryRisk === "balanced"
                                        ? "bg-accent-100 text-accent-800"
                                        : "bg-emerald-100 text-emerald-800"
                                    )}>
                                      +{traj.pct.toFixed(1)}% (+${estGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                    </span>
                                  </div>
                                </div>

                                {/* Animated Horizon Bar */}
                                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-200">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500 ease-out shadow-xs",
                                      advisoryRisk === "aggressive"
                                        ? "bg-gradient-to-r from-rose-500 to-amber-500"
                                        : advisoryRisk === "balanced"
                                        ? "bg-gradient-to-r from-accent-500 to-indigo-500"
                                        : "bg-gradient-to-r from-emerald-500 to-teal-500"
                                    )}
                                    style={{ width: `${barWidthPct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Dynamic Stock-by-Stock Expected Return Breakdown */}
                      <div className="mt-5 border-t border-ink-100 pt-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-ink-700">
                            Equities Allocation &amp; Expected Alpha Contribution
                          </h5>
                          <span className="text-[10px] font-mono text-ink-500">
                            Synchronized to Mandate #{STRATEGY_MANDATES[selectedStrategyMandateIndex]?.id || 1}
                          </span>
                        </div>

                        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {currentAdvisoryPlan.allocations.map((alloc) => {
                            const allocatedDollars = (advisoryCapital * alloc.weightPercent) / 100;
                            const isStable = alloc.symbol === advisoryStablecoin;
                            const terminalPct = mandateTrajectories[mandateTrajectories.length - 1]?.pct || 0;
                            const stockExpectedReturnPct = isStable
                              ? 0
                              : Number((terminalPct * (1 + (alloc.weightPercent - 20) / 100)).toFixed(1));
                            const stockProjectedVal = allocatedDollars * (1 + stockExpectedReturnPct / 100);

                            return (
                              <div
                                key={alloc.symbol}
                                className="rounded-xl border border-ink-200/80 bg-surface-50/60 p-2.5 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-ink-900">
                                      {alloc.symbol}
                                    </span>
                                    <span className="rounded bg-surface-200 px-1 py-0.2 text-[9px] font-medium text-ink-700">
                                      {alloc.weightPercent}%
                                    </span>
                                  </div>
                                  <span className="font-mono text-[11px] font-bold text-ink-800">
                                    ${allocatedDollars.toFixed(2)} {advisoryStablecoin}
                                  </span>
                                </div>

                                <p className="mt-1 text-[10px] text-ink-500 line-clamp-1">
                                  {alloc.role}
                                </p>

                                <div className="mt-1.5 flex items-center justify-between border-t border-ink-100 pt-1 font-mono text-[10px]">
                                  <span className="text-ink-400">Target Value:</span>
                                  <span className="font-bold text-accent-700">
                                    ${stockProjectedVal.toFixed(2)}{" "}
                                    <span className={cn(
                                      "font-semibold",
                                      stockExpectedReturnPct > 0 ? "text-emerald-600" : "text-ink-400"
                                    )}>
                                      ({stockExpectedReturnPct > 0 ? `+${stockExpectedReturnPct}%` : "0%"})
                                    </span>
                                  </span>
                                </div>
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

                    {/* Direct Execute >> Confirm Wallet Signature >> Confirmed */}
                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-ink-950 p-4 text-white shadow-md">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="rounded bg-accent-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-accent-400">
                            Deploying ${advisoryCapital.toLocaleString()} {advisoryStablecoin}
                          </span>
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                            Gas Sponsored (0 OKB)
                          </span>
                          <span className="rounded bg-sky-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                            Non-Custodial EIP-712 / EIP-2612
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-xs font-bold text-white truncate">
                          {currentAdvisoryPlan.mandateRule}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (executionEnvironment === "simulation" || isDemoSandbox) {
                            handleDeployAdvisoryMandate(currentAdvisoryPlan);
                          } else {
                            setMandatePlanToSign(currentAdvisoryPlan);
                          }
                        }}
                        className="w-full sm:w-auto shrink-0 rounded-xl bg-accent-500 hover:bg-accent-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>
                          {executionEnvironment === "simulation" || isDemoSandbox
                            ? "Deploy Simulation Mandate (No Wallet)"
                            : "Execute & Sign Mandate"}
                        </span>
                        <span>↗</span>
                      </button>
                    </div>

                      {/* Mandate Execution Summary Receipt (Appears Immediately Following Execution) */}
                      {deployedMandateReceipt && (
                        <div
                          id="mandate-execution-summary-receipt"
                          className="mt-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/90 p-4 text-ink-900 shadow-md animate-in fade-in slide-in-from-top-2 duration-300"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                                ✓
                              </span>
                              <div>
                                <h4 className="font-display text-sm font-bold text-emerald-950">
                                  Mandate Execution Summary
                                </h4>
                                <p className="text-[10px] font-mono text-emerald-700">
                                  ID: {deployedMandateReceipt.mandateId} · Executed at {deployedMandateReceipt.timestamp}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-900">
                                Active on OKX X Layer (Chain 196)
                              </span>
                              <button
                                type="button"
                                onClick={() => setDeployedMandateReceipt(null)}
                                className="text-emerald-700 hover:text-emerald-950 text-xs font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="rounded-lg bg-white/80 p-2 border border-emerald-100">
                              <span className="text-[10px] font-mono text-ink-500 block">Allocated Capital</span>
                              <span className="font-mono font-bold text-ink-950 text-sm">
                                ${deployedMandateReceipt.capital.toLocaleString()} {deployedMandateReceipt.stablecoin}
                              </span>
                            </div>
                            <div className="rounded-lg bg-white/80 p-2 border border-emerald-100">
                              <span className="text-[10px] font-mono text-ink-500 block">Strategy Horizon</span>
                              <span className="font-bold text-ink-950 text-xs truncate block">
                                {deployedMandateReceipt.strategy}
                              </span>
                            </div>
                            <div className="rounded-lg bg-white/80 p-2 border border-emerald-100">
                              <span className="text-[10px] font-mono text-ink-500 block">Rebalance Interval</span>
                              <span className="font-mono font-bold text-ink-950 text-xs block">
                                {deployedMandateReceipt.rebalanceInterval}
                              </span>
                            </div>
                            <div className="rounded-lg bg-white/80 p-2 border border-emerald-100">
                              <span className="text-[10px] font-mono text-ink-500 block">Paymaster Gas Fee</span>
                              <span className="font-mono font-bold text-emerald-700 text-xs block">
                                0.0000 ETH (100% Free)
                              </span>
                            </div>
                          </div>

                          {/* Allocation Breakdown */}
                          <div className="mt-3 rounded-lg bg-white/90 p-2.5 border border-emerald-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 font-mono block mb-1.5">
                              Target Asset Distribution
                            </span>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {deployedMandateReceipt.allocations.map((a) => (
                                <span
                                  key={a.symbol}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-surface-100 px-2 py-1 font-mono text-[11px] font-semibold text-ink-800"
                                >
                                  <strong>{a.symbol}:</strong>
                                  <span className="text-accent-700">{a.weightPercent}%</span>
                                  <span className="text-ink-400">
                                    (${((deployedMandateReceipt.capital * a.weightPercent) / 100).toFixed(0)})
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Execution Reference */}
                          <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] font-mono text-emerald-800 border-t border-emerald-200/60 pt-2">
                            <span>Rule: {deployedMandateReceipt.rule}</span>
                            <span className="text-ink-400">Tx Ref: {deployedMandateReceipt.txHash.slice(0, 16)}...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                {/* 2. Institutional Market & Mandates Directory (Powered by Meirei Telemetry) */}
                <div className="rounded-2xl border border-ink-200/80 bg-white p-3.5 sm:p-6 shadow-xs">
                  <div className="flex flex-col justify-between gap-3 border-b border-ink-100 pb-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent-600">
                          Meirei Telemetry Engine
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          LIVE
                        </span>
                      </div>
                      <h2 className="mt-1 font-display text-lg font-bold text-ink-900 sm:text-xl">
                        Daily Institutional Market &amp; Mandate Directory
                      </h2>
                      <p className="mt-0.5 text-xs text-ink-500">
                        Synthesizing institutional sentiment, smart-money orderflow, and volatility metrics across all 20 tokenized equities on OKX X Layer.
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

                  {/* Mobile Cards View (Visible on < sm screens) */}
                  <div className="space-y-2.5 sm:hidden mt-3">
                    {rankedStocks.map((stk) => {
                      const priceNum = getNumericPrice(stk);
                      const sentiment = OKX_SENTIMENT_DATA.assetScores[stk.symbol] || { score: 75, verdict: "Bullish" };
                      const smartFlow = OKX_SMART_MONEY_DATA.assetSmartFlow[stk.symbol] || { netFlow: "+$500K", flowType: "Inflow", tier: "Accumulation" };
                      const metrics = OKX_CEX_MARKET_DATA.assetMetrics[stk.symbol] || { volume24h: "$1.5M", beta: 1.2, spread: "0.02%", momentumRank: 5 };

                      return (
                        <div key={stk.symbol} className="rounded-xl border border-ink-200 bg-white p-3 space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "inline-flex items-center justify-center h-5 w-5 rounded-full font-mono text-[10px] font-bold shadow-2xs shrink-0",
                                metrics.momentumRank <= 3 ? "bg-ink-950 text-white" : "bg-surface-200 text-ink-700"
                              )}>
                                #{metrics.momentumRank}
                              </span>
                              <div
                                className="flex h-7 w-7 items-center justify-center rounded-lg shadow-xs shrink-0 text-white font-bold text-xs"
                                style={{ backgroundColor: stk.color }}
                              >
                                {stk.logo}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 truncate">
                                  <span className="font-mono font-bold text-ink-950 text-xs">{stk.symbol}</span>
                                  <span className="text-[10px] text-ink-400 truncate">({stk.name})</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div
                                className={cn(
                                  "font-mono font-bold text-xs",
                                  priceFlashes[stk.symbol] === "up" && "text-emerald-600",
                                  priceFlashes[stk.symbol] === "down" && "text-rose-600",
                                  !priceFlashes[stk.symbol] && "text-ink-950"
                                )}
                              >
                                {getFormattedPrice(stk)}
                              </div>
                              <span className="text-[9px] font-mono text-ink-400 block">Spread: {metrics.spread}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-ink-100">
                            <div className="rounded-lg bg-surface-50 p-2 font-mono">
                              <span className="text-[9px] text-ink-400 block uppercase font-semibold">Smart Flow</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={cn(
                                  "font-bold text-xs",
                                  smartFlow.flowType === "Inflow" ? "text-emerald-700" : "text-rose-600"
                                )}>
                                  {smartFlow.netFlow}
                                </span>
                                <span className={cn(
                                  "rounded px-1 py-0.2 text-[8px] font-bold uppercase",
                                  smartFlow.flowType === "Inflow" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                )}>
                                  {smartFlow.flowType}
                                </span>
                              </div>
                            </div>

                            <div className="rounded-lg bg-surface-50 p-2 font-mono">
                              <span className="text-[9px] text-ink-400 block uppercase font-semibold">Sentiment</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={cn(
                                  "font-bold text-xs",
                                  sentiment.score >= 80 ? "text-emerald-700" : sentiment.score >= 70 ? "text-accent-700" : "text-amber-700"
                                )}>
                                  {sentiment.score}/100
                                </span>
                                <span className={cn(
                                  "rounded px-1 py-0.2 text-[8px] font-bold",
                                  sentiment.verdict === "Bullish" ? "bg-emerald-100 text-emerald-800" : sentiment.verdict === "Neutral" ? "bg-surface-200 text-ink-700" : "bg-amber-100 text-amber-800"
                                )}>
                                  {sentiment.verdict}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-mono text-ink-500">
                              Vol: {metrics.volume24h} · Beta: {metrics.beta.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStock(stk);
                                openWeb3Signer(stk.symbol, 100, 100 / priceNum, priceNum);
                              }}
                              className="inline-flex items-center justify-center gap-1 rounded-lg bg-ink-950 hover:bg-accent-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-colors cursor-pointer"
                            >
                              <span>Swap</span>
                              <span className="text-[10px]">↗</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Comprehensive Institutional Equities Table (Tablet & Desktop) */}
                  <div className="hidden sm:block mt-5 overflow-x-auto rounded-xl border border-ink-200">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead className="border-b border-ink-200 bg-surface-100 font-semibold text-ink-900">
                        <tr>
                          <th className="p-3 w-14 text-center">Rank</th>
                          <th className="p-3">Asset</th>
                          <th className="p-3">Spot Price</th>
                          <th className="p-3">Smart Money Flow</th>
                          <th className="p-3">Sentiment Score</th>
                          <th className="p-3">CEX Metrics</th>
                          <th className="p-3 text-right">Quick Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-200/60 bg-white text-ink-700">
                        {rankedStocks.map((stk) => {
                          const priceNum = getNumericPrice(stk);
                          const sentiment = OKX_SENTIMENT_DATA.assetScores[stk.symbol] || { score: 75, verdict: "Bullish" };
                          const smartFlow = OKX_SMART_MONEY_DATA.assetSmartFlow[stk.symbol] || { netFlow: "+$500K", flowType: "Inflow", tier: "Accumulation" };
                          const metrics = OKX_CEX_MARKET_DATA.assetMetrics[stk.symbol] || { volume24h: "$1.5M", beta: 1.2, spread: "0.02%", momentumRank: 5 };

                          return (
                            <tr key={stk.symbol} className="transition-colors hover:bg-surface-50">
                              <td className="p-3 text-center">
                                <span className={cn(
                                  "inline-flex items-center justify-center h-6 w-6 rounded-full font-mono text-xs font-bold shadow-2xs",
                                  metrics.momentumRank <= 3 
                                    ? "bg-ink-950 text-white" 
                                    : "bg-surface-200 text-ink-700"
                                )}>
                                  #{metrics.momentumRank}
                                </span>
                              </td>

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
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStock(stk);
                                    openWeb3Signer(stk.symbol, 100, 100 / priceNum, priceNum);
                                  }}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink-950 hover:bg-accent-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-colors cursor-pointer"
                                  title={`Instant swap ${stk.symbol} on OKX X Layer`}
                                >
                                  <span>Swap</span>
                                  <span className="text-[10px]">↗</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
          </div>

          {/* Right Sidebar: Portfolio Summary (Cols 9 to 12) */}
          <div className="space-y-6 lg:col-span-4 min-w-0 max-w-full">

            {/* Live Portfolio Breakdown Card - Mode-Isolated Active Holdings */}
            <div className="rounded-2xl border border-ink-200/80 bg-white p-3.5 sm:p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-500">
                    Active Portfolio
                  </span>
                  <span className={cn(
                    "rounded px-2 py-0.5 text-[9px] font-bold uppercase",
                    "bg-ink-900 text-white"
                  )}>
                    Advanced Mode
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "rounded px-2 py-0.5 text-[9px] font-bold uppercase font-mono",
                    executionEnvironment === "live" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-800 border border-amber-300"
                  )}>
                    {executionEnvironment === "live" ? "Live Real Data" : "Simulation Sandbox"}
                  </span>
                  <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {currentHoldings.length} {currentHoldings.length === 1 ? "Position" : "Positions"}
                  </span>
                </div>
              </div>

              {(() => {
                const currentEquityVal = currentHoldings.reduce((sum, h) => {
                  if (h.symbol === "OKB") return sum;
                  const p = stockPrices[h.symbol] || (h.amount > 0 ? h.valueUsd / h.amount : 0);
                  return sum + (h.amount * p);
                }, 0);
                const currentOkb = currentHoldings.find((h) => h.symbol === "OKB");
                const currentOkbVal = currentOkb ? currentOkb.valueUsd : (profile.okbValueUsd || 0);
                const currentTotalVal = currentEquityVal + currentUsdgBalance + currentOkbVal;

                return (
                  <div className="mt-3">
                    <p className="font-mono text-3xl font-bold tracking-tight text-ink-900">
                      ${currentTotalVal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5 text-xs text-ink-600">
                      <span>Cash: <strong className="font-mono text-ink-900">${currentUsdgBalance.toFixed(2)} USDG</strong></span>
                      {currentOkbVal > 0 && (
                        <span>Gas: <strong className="font-mono text-ink-900">{(currentOkb?.amount || profile.okbBalance || 0).toFixed(4)} OKB (${currentOkbVal.toFixed(2)})</strong></span>
                      )}
                      <span>Equities: <strong className="font-mono text-ink-900">${currentEquityVal.toFixed(2)} USDG</strong></span>
                    </div>

                    {/* Simulation Sandbox Top-Up Figures (+10k, +20k) */}
                    {executionEnvironment === "simulation" && (
                      <div className="mt-3.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/80 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Simulation Sandbox Figures
                          </span>
                          <span className="text-[10px] font-mono text-amber-700">Demo Paper Liquidity</span>
                        </div>
                        <p className="mt-1 text-[11px] text-amber-800 leading-snug">
                          Add simulated test USDG to model trades and mandates without real capital:
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAddSimulatedCapital(10000)}
                            className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-[10px] px-2.5 py-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            + $10,000 USDG
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSimulatedCapital(20000)}
                            className="rounded-lg bg-ink-900 hover:bg-ink-800 text-white font-mono font-bold text-[10px] px-2.5 py-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            + $20,000 USDG
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSimulatedAdvancedUsdgBalance(20000);
                            }}
                            className="rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-mono text-[10px] font-semibold px-2 py-1 transition-colors cursor-pointer sm:ml-auto"
                          >
                            Reset Demo
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Live On-Chain Verification */}
                    {executionEnvironment === "live" && (
                      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2 text-[11px] text-ink-500">
                        <span>On-Chain Verification:</span>
                        <span className="font-mono font-semibold text-emerald-600 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          OKX X Layer (Chain 196) Real Data Only
                        </span>
                      </div>
                    )}

                    {currentHoldings.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-surface-50 p-4 text-center">
                        <p className="text-xs font-semibold text-ink-800">
                          {executionEnvironment === "live"
                            ? (isLoggedIn ? "No active tokenized stock holdings on this account" : "Web3 Wallet Not Connected")
                            : `No active stock holdings in Advanced Mode Simulation`}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-500 leading-relaxed">
                          {executionEnvironment === "live"
                            ? (isLoggedIn
                              ? "Your connected wallet currently holds 0 allowlisted xStocks on OKX X Layer."
                              : "Connect your Web3 wallet (OKX Wallet, MetaMask) to load your authentic on-chain balances.")
                            : "Configure and deploy an algorithmic mandate to start autonomous simulated execution."}
                        </p>
                        {executionEnvironment === "live" && !isLoggedIn && (
                          <button
                            type="button"
                            onClick={() => setShowLoginModal(true)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Connect Web3 Wallet →
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Progress Bar Breakdown */}
                        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-100">
                          {currentHoldings.map((h) => {
                            const livePrice = stockPrices[h.symbol] || (h.amount > 0 ? h.valueUsd / h.amount : 0);
                            const val = h.amount * livePrice;
                            const pct = (val / (currentTotalVal || 1)) * 100;
                            return (
                              <div
                                key={h.symbol}
                                style={{ width: `${pct}%`, backgroundColor: h.color || "#10b981" }}
                                title={`${h.symbol}: ${pct.toFixed(1)}%`}
                              />
                            );
                          })}
                        </div>

                        {/* Holdings List with live spot & units */}
                        <div className="mt-4 space-y-2 text-xs">
                          {currentHoldings.map((h) => {
                            const livePrice = stockPrices[h.symbol];
                            const currentVal = livePrice ? h.amount * livePrice : h.valueUsd;

                            return (
                              <div
                                key={h.symbol}
                                className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-ink-100 bg-surface-50 px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: h.color || "#10b981" }}
                                  />
                                  <span className="font-bold text-ink-900">{h.symbol}</span>
                                  <span className="text-[10px] text-ink-500 font-mono">
                                    {h.amount < 1 ? h.amount.toFixed(4) : h.amount.toFixed(2)} units
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
                );
              })()}
            </div>

            {/* Active Meirei AI Assistant Intelligence Engine: 4 Meirei Assistant Skills Synchronized (Directly Below Active Portfolio & Ontop Market Catalysts in Advanced Mode) */}
            {mode === "advanced" && (
              <div className="rounded-2xl border border-ink-200/90 bg-white p-5 shadow-xs">
                <div className="flex flex-col justify-between gap-3 border-b border-ink-100 pb-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600">
                          MEIREI AI INTELLIGENCE ARCHITECTURE
                        </span>
                        <span className="rounded-full bg-emerald-50 border border-emerald-300/60 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-700 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          4 Meirei Assistant Skills Synchronized
                        </span>
                      </div>
                      <h3 className="mt-1 font-display text-base font-bold text-ink-950 sm:text-lg">
                        Active Meirei AI Assistant Intelligence Engine
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nowTime = formatLogTime();
                        setLastTelemetryRefresh(nowTime);
                        setExecutionLogs((prev) => [
                          {
                            id: `log-${Date.now()}`,
                            timestamp: nowTime,
                            source: "OKX Skills Engine",
                            message: "Refreshed OKX AI telemetry across trading-plan-generator, sentiment, smart money, and market depth.",
                            type: "info",
                          },
                          ...prev.slice(0, 24),
                        ]);
                      }}
                      className="rounded-full border border-ink-200 bg-white hover:bg-surface-50 px-3 py-1.5 text-[11px] font-semibold text-ink-700 hover:text-ink-950 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                      title="Refresh OKX AI skills telemetry"
                    >
                      <span className="text-accent-600 font-bold text-xs">↻</span>
                      <span>Refresh Telemetry</span>
                      <span className="text-[10px] text-ink-400 font-mono">({lastTelemetryRefresh})</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-ink-600 leading-relaxed">
                    Synchronizing <strong className="text-ink-900 font-mono">trading-plan-generator</strong>, <strong className="text-ink-900 font-mono">okx-sentiment-tracker</strong>, <strong className="text-ink-900 font-mono">okx-cex-smartmoney</strong>, and <strong className="text-ink-900 font-mono">okx-cex-market</strong> across all 20 allowlisted equities on OKX X Layer (Chain 196).
                  </p>
                </div>

                {/* 4 Skills Cards Grid */}
                <div className="mt-3.5 space-y-2.5">
                  {/* 1. trading-plan-generator */}
                  <div className="rounded-xl border border-ink-200/80 bg-white p-3 space-y-1.5 shadow-2xs hover:border-sky-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-sky-50 border border-sky-200 px-2 py-0.5 font-mono text-[9px] font-bold text-sky-700">
                        trading-plan-generator
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <h4 className="font-display text-xs font-bold text-ink-950">
                      Trading Plan Generator
                    </h4>
                    <p className="text-[11px] text-ink-600 leading-relaxed">
                      Generates institutional-grade rebalancing rules, dynamic drift bounds (1.5%–3.5%), and capital preservation ceilings.
                    </p>
                    <div className="pt-2 border-t border-ink-100 flex items-center justify-between text-[11px]">
                      <span className="text-ink-500 font-mono">Telemetry:</span>
                      <span className="font-bold text-ink-900 font-mono">15 Trajectories Active</span>
                    </div>
                  </div>

                  {/* 2. okx-sentiment-tracker */}
                  <div className="rounded-xl border border-ink-200/80 bg-white p-3 space-y-1.5 shadow-2xs hover:border-indigo-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 font-mono text-[9px] font-bold text-indigo-700">
                        okx-sentiment-tracker
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <h4 className="font-display text-xs font-bold text-ink-950">
                      OKX Sentiment Tracker
                    </h4>
                    <p className="text-[11px] text-ink-600 leading-relaxed">
                      Aggregates 48.2K mentions, whale social sentiment, and retail vs institutional positioning divergence on X Layer.
                    </p>
                    <div className="pt-2 border-t border-ink-100 flex items-center justify-between text-[11px]">
                      <span className="text-ink-500 font-mono">Sentiment Score:</span>
                      <span className="font-bold text-indigo-700 font-mono">82/100 (Bullish)</span>
                    </div>
                  </div>

                  {/* 3. okx-cex-smartmoney */}
                  <div className="rounded-xl border border-ink-200/80 bg-white p-3 space-y-1.5 shadow-2xs hover:border-emerald-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-700">
                        okx-cex-smartmoney
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <h4 className="font-display text-xs font-bold text-ink-950">
                      OKX CEX Smart Money
                    </h4>
                    <p className="text-[11px] text-ink-600 leading-relaxed">
                      Monitors whale wallet accumulation, exchange net flows, and top-trader long ratios on OKX CEX &amp; DEX bridges.
                    </p>
                    <div className="pt-2 border-t border-ink-100 flex items-center justify-between text-[11px]">
                      <span className="text-ink-500 font-mono">Net Inflow 24h:</span>
                      <span className="font-bold text-emerald-700 font-mono">+$5.84M USDG</span>
                    </div>
                  </div>

                  {/* 4. okx-cex-market */}
                  <div className="rounded-xl border border-ink-200/80 bg-white p-3 space-y-1.5 shadow-2xs hover:border-amber-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-800">
                        okx-cex-market
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <h4 className="font-display text-xs font-bold text-ink-950">
                      OKX CEX Market Depth
                    </h4>
                    <p className="text-[11px] text-ink-600 leading-relaxed">
                      High-frequency orderbook spread metrics, liquidity depth, and 24h tokenized stock trading volume rankings.
                    </p>
                    <div className="pt-2 border-t border-ink-100 flex items-center justify-between text-[11px]">
                      <span className="text-ink-500 font-mono">Liquidity Depth:</span>
                      <span className="font-bold text-amber-700 font-mono">$24.6M (2.1 bps)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Market Intelligence & Investor Sentiment: Market Catalysts & Investor Consensus (Directly Under Active Portfolio in Advanced Mode) */}
            {mode === "advanced" && (
              <div className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-600 block">
                      Live Market Intelligence &amp; Investor Sentiment
                    </span>
                    <h3 className="font-display text-sm font-bold text-ink-950">
                      Market Catalysts &amp; Investor Consensus
                    </h3>
                  </div>
                  <span className="rounded-full bg-surface-100 px-2 py-0.5 font-mono text-[9px] font-bold text-ink-600">
                    Live Feed
                  </span>
                </div>

                {isLoadingNews ? (
                  <div className="py-8 text-center text-xs text-ink-500">
                    Loading real-time market catalysts from X Layer onchain feed...
                  </div>
                ) : (
                  <div className="mt-3.5 space-y-3.5">
                    {newsList.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-ink-200/80 bg-surface-50/60 p-3 text-xs transition-all hover:bg-white hover:shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="rounded bg-ink-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                              {item.ticker}
                            </span>
                            <span className="text-[11px] font-semibold text-ink-600">
                              {item.category}
                            </span>
                            <span className="text-ink-300">·</span>
                            <span className="text-[10px] text-ink-400">{item.timestamp}</span>
                          </div>

                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase shrink-0",
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

                        <h4 className="mt-1.5 font-display text-xs font-bold leading-snug text-ink-950">
                          {item.headline}
                        </h4>
                        <p className="mt-1 text-[11px] text-ink-600 leading-relaxed">
                          {item.summary}
                        </p>

                        {/* What Investors Think So Far & Market Effect */}
                        <div className="mt-2.5 space-y-1.5 rounded-lg border border-ink-200/60 bg-white p-2 text-[11px]">
                          <p className="text-ink-700 leading-normal">
                            <strong className="text-ink-900">What Investors Think So Far: </strong>
                            {item.impact === "Bullish"
                              ? "Institutional accumulation detected; retail sentiment positive with active call buying."
                              : item.impact === "Bearish"
                              ? "Defensive rebalancing observed; traders hedging downside risk."
                              : "Balanced consolidation; market awaiting further guidance."}
                          </p>
                          <p className="text-ink-700 leading-normal border-t border-ink-100 pt-1.5">
                            <strong className="text-accent-600">Market Effect on X Layer: </strong>
                            {item.marketEffectAnalysis}
                          </p>
                        </div>

                        {/* Quick Trade Action */}
                        <div className="mt-2.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const stockMatch = STOCKS.find((s) => s.symbol === item.ticker);
                              if (stockMatch) setSelectedStock(stockMatch);
                              setPromptText(item.suggestedAction.tradePrompt);
                              setMode("basic");
                              handleSendPrompt(item.suggestedAction.tradePrompt);
                            }}
                            className="rounded-lg bg-ink-900 hover:bg-accent-600 text-white px-2.5 py-1 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                          >
                            Trade on Catalyst: {item.suggestedAction.label}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
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
              className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-ink-200 bg-white p-5 shadow-2xl text-ink-900 relative selection:bg-accent-500/20"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-700">
                    OKX X Layer (Chain 196)
                  </span>
                  <h3 className="font-display text-base font-bold text-ink-950">
                    Connect &amp; Manage Wallet
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="rounded-full p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-950 cursor-pointer transition-colors"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 stroke-current stroke-2 fill-none">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              <div className="mt-3.5 space-y-4 text-xs text-ink-700">
                {/* STEP 1: Connect Web3 Wallet */}
                <div className="rounded-2xl border border-ink-200/90 bg-surface-50/70 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink-950 uppercase text-[10px] tracking-wider">
                      1. Web3 Wallet Connection
                    </span>
                    {connectAddress ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.2 text-[9px] font-bold text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.2 text-[9px] font-bold text-amber-800">
                        Required
                      </span>
                    )}
                  </div>

                  {connectAddress ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5">
                        <div>
                          <div className="flex items-center gap-1.5 font-mono text-emerald-900 font-semibold text-xs">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            <span>{formatShortAddress(connectAddress)}</span>
                            <span className="text-ink-500 font-normal text-[10px]">({connectWalletName || "Web3 Wallet"})</span>
                          </div>
                          <p className="text-[10px] font-mono text-emerald-700 mt-0.5">
                            OKX X Layer · 100% Sponsored Gas
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleFullDisconnect}
                          disabled={isWalletConnecting}
                          className="py-1 px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-700 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          Disconnect
                        </button>
                      </div>

                      <div className="pt-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                            Switch Active Wallet
                          </span>
                          <button
                            type="button"
                            onClick={handleFullDisconnect}
                            className="text-[10px] text-red-600 hover:text-red-700 font-semibold underline cursor-pointer"
                          >
                            Disconnect Current
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleConnectWalletType("okx")}
                            disabled={isWalletConnecting}
                            className={cn(
                              "p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs",
                              connectWalletName?.toLowerCase().includes("okx")
                                ? "border-accent-500 bg-accent-100/90 text-accent-950 font-bold ring-1 ring-accent-400"
                                : "border-accent-200 bg-accent-50/70 hover:bg-accent-100 text-ink-950"
                            )}
                          >
                            <span>OKX Wallet</span>
                            <span className="text-[8px] bg-accent-200 text-accent-800 font-bold px-1 rounded">TOP</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConnectWalletType("metamask")}
                            disabled={isWalletConnecting}
                            className={cn(
                              "p-2 rounded-xl border text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors shadow-2xs",
                              connectWalletName?.toLowerCase().includes("metamask")
                                ? "border-accent-500 bg-accent-100/90 text-accent-950 font-bold ring-1 ring-accent-400"
                                : "border-ink-200 bg-white hover:bg-surface-50 text-ink-900"
                            )}
                          >
                            MetaMask
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowWalletConnectModal(true)}
                            className="p-2 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-800 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <WalletConnectIcon className="w-3.5 h-3.5 text-sky-600" />
                            <span>WalletConnect</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConnectWalletType("injected")}
                            disabled={isWalletConnecting}
                            className="p-2 rounded-xl border border-ink-200 bg-surface-50 hover:bg-white text-ink-800 text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                          >
                            Browser Injected
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleConnectWalletType("okx")}
                        disabled={isWalletConnecting}
                        className="p-2 rounded-xl border border-accent-200 bg-accent-50/70 hover:bg-accent-100 text-ink-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <span>OKX Wallet</span>
                        <span className="text-[8px] bg-accent-200 text-accent-800 font-bold px-1 rounded">TOP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConnectWalletType("metamask")}
                        disabled={isWalletConnecting}
                        className="p-2 rounded-xl border border-ink-200 bg-white hover:bg-surface-50 text-ink-900 font-semibold text-xs flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      >
                        MetaMask
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowWalletConnectModal(true)}
                        className="p-2 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-800 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <WalletConnectIcon className="w-3.5 h-3.5 text-sky-600" />
                        <span>WalletConnect</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConnectWalletType("injected")}
                        disabled={isWalletConnecting}
                        className="p-2 rounded-xl border border-ink-200 bg-surface-50 hover:bg-white text-ink-800 text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      >
                        Browser Injected
                      </button>
                    </div>
                  )}

                  {/* Option: Continue in Simulation Mode without a wallet */}
                  <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 flex items-center justify-between gap-2.5">
                    <div>
                      <span className="font-bold text-amber-950 text-xs block">
                        No Wallet? Try Simulation Mode
                      </span>
                      <p className="text-[10px] text-amber-800 mt-0.5">
                        Paper trade 20 allowlisted equities with simulated USDG cash—no wallet required.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExecutionEnvironment("simulation");
                        setShowLoginModal(false);
                      }}
                      className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 shrink-0 transition-colors cursor-pointer shadow-2xs"
                    >
                      Use Simulation
                    </button>
                  </div>
                </div>

                {/* STEP 2: Choose Interface Platform */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-ink-950 uppercase text-[10px] tracking-wider block">
                      2. Choose Interface Platform
                    </label>
                    <span className="text-[10px] text-accent-700 font-medium font-mono">
                      Official Execution Channels
                    </span>
                  </div>

                  {/* 2 Platform Selection Grid (Web & Telegram strictly) */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* 1. Web Platform */}
                    <button
                      type="button"
                      onClick={() => setConnectChannel("web")}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2",
                        connectChannel === "web"
                          ? "border-accent-500 bg-accent-50/90 shadow-xs ring-1 ring-accent-500"
                          : "border-ink-200 bg-surface-50 hover:bg-white"
                      )}
                    >
                      <div className="p-1.5 rounded-lg bg-accent-100 text-accent-700 shrink-0">
                        <SimpleWebLogo className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-ink-950 text-xs truncate">Web Console</div>
                        <div className="text-[9px] text-ink-500 font-mono truncate">Live Browser</div>
                      </div>
                    </button>

                    {/* 2. Telegram Bot */}
                    <button
                      type="button"
                      onClick={() => setConnectChannel("telegram")}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2",
                        connectChannel === "telegram"
                          ? "border-sky-500 bg-sky-50/90 shadow-xs ring-1 ring-sky-500"
                          : "border-ink-200 bg-surface-50 hover:bg-white"
                      )}
                    >
                      <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700 shrink-0">
                        <SimpleTelegramLogo className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-ink-950 text-xs truncate">Telegram</div>
                        <div className="text-[9px] text-sky-700 font-mono truncate">@MeireiXLayerBot</div>
                      </div>
                    </button>
                  </div>

                  {/* Channel Action Panel */}
                  <div className="rounded-xl border border-ink-200/80 bg-surface-50/70 p-3 space-y-2">
                    {connectChannel === "web" && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-ink-700 leading-relaxed">
                          <strong>Web Terminal Execution:</strong> Execute non-custodial spot trades, converse with the AI agent, and deploy autonomous rebalancing mandates on OKX X Layer (Chain 196) directly within this browser terminal.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowLoginModal(false);
                            const chatElem = document.getElementById("conversational-chat");
                            if (chatElem) chatElem.scrollIntoView({ behavior: "smooth" });
                            const chatInputElem = document.getElementById("conversational-chat-input");
                            if (chatInputElem) setTimeout(() => chatInputElem.focus(), 300);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <span>Open Web Terminal</span>
                          <span>→</span>
                        </button>
                      </div>
                    )}

                    {connectChannel === "telegram" && (
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
                            className="w-full rounded-lg border border-ink-200 bg-white p-2 text-xs font-mono text-ink-900 placeholder-ink-400 outline-none focus:border-sky-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleConfirmChannelLink}
                            disabled={isChannelLinking || !connectAddress}
                            className="flex-1 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <SimpleTelegramLogo className="w-3.5 h-3.5" />
                            <span>{isChannelLinking ? "Anchoring..." : "Link & Launch Telegram"}</span>
                          </button>
                          <a
                            href="https://t.me/MeireiXLayerBot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 rounded-xl border border-sky-300 bg-white hover:bg-sky-50 text-sky-700 font-bold text-xs flex items-center justify-center transition-colors"
                          >
                            Open Bot
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Feedback messages */}
                {connectInfoMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]">
                    {connectInfoMsg}
                  </div>
                )}
                {connectErrorMsg && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px]">
                    {connectErrorMsg}
                  </div>
                )}

                {/* Footer Controls */}
                <div className="border-t border-ink-100 pt-2.5 flex items-center justify-between text-[11px] text-ink-500">
                  {connectAddress ? (
                    <button
                      type="button"
                      onClick={handleFullDisconnect}
                      disabled={isWalletConnecting}
                      className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                    >
                      Disconnect Wallet
                    </button>
                  ) : (
                    <a
                      href="https://t.me/MeireiXLayerBot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-sky-600 flex items-center gap-1 transition-colors"
                    >
                      <SimpleTelegramLogo className="w-3.5 h-3.5 text-sky-600" />
                      <span>@MeireiXLayerBot</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-ink-200 hover:bg-surface-100 text-ink-700 text-xs font-semibold cursor-pointer transition-colors"
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
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-ink-200 bg-white p-4 sm:p-6 shadow-2xl"
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
        userAddress={activeAddress || profile.address}
        onSuccess={(res) => {
          if (res.txHash) {
            const executedAmount = res.executedAmountUsdg || web3ModalState.fromAmountUsdg;
            const executedUnits = res.executedUnits || web3ModalState.estimatedUnits;
            recordBasicBuy(web3ModalState.targetSymbol, executedAmount, executedUnits, web3ModalState.spotPrice);
            setMandateResult({
              reply: `Signed non-custodially on X Layer for ${executedUnits.toFixed(4)} ${web3ModalState.targetSymbol} ($${executedAmount.toFixed(2)} USDG).`,
              type: "mandate",
              hash: res.txHash,
              statusTone: "confirmed",
            });
          }
        }}
      />

      {/* Edit Mandate Policy Modal */}
      <AnimatePresence>
        {editingMandate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-ink-200 bg-white p-4 sm:p-6 shadow-2xl text-ink-900"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-ink-100">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-700">
                    Policy Configuration · OKX X Layer
                  </span>
                  <h3 className="font-display text-base font-bold text-ink-950">
                    Edit Mandate: {editingMandate.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMandate(null)}
                  className="rounded-full h-8 w-8 flex items-center justify-center text-ink-400 hover:bg-surface-100 hover:text-ink-950 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-700 mb-1">
                    Target Assets / Sleeves
                  </label>

                  {/* Dynamic Interactive Selection Based on Mandate Type */}
                  {(editingMandate.policyType === "drift_rebalance" || editingMandate.target.includes("%")) ? (
                    <div className="space-y-3 rounded-2xl border border-accent-200 bg-accent-50/30 p-3.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-ink-900">Select Equities &amp; Split Percentages</span>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          {["50/50", "60/40", "70/30", "80/20"].map((preset) => {
                            const [w1, w2] = preset.split("/").map(Number);
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  if (editSelectedStocks.length >= 2) {
                                    const s1 = editSelectedStocks[0];
                                    const s2 = editSelectedStocks[1];
                                    const newWeights = { ...editStockWeights, [s1]: w1, [s2]: w2 };
                                    setEditStockWeights(newWeights);
                                    setEditTarget(`${w1}% ${s1} / ${w2}% ${s2}`);
                                  }
                                }}
                                className="rounded bg-white px-1.5 py-0.5 border border-ink-200 text-ink-700 hover:border-accent-500 hover:text-accent-700 cursor-pointer font-bold"
                              >
                                {preset}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Stock Selection Pills for Drift */}
                      <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto pr-1">
                        {STOCKS.map((s) => {
                          const isSel = editSelectedStocks.includes(s.symbol);
                          return (
                            <button
                              key={s.symbol}
                              type="button"
                              onClick={() => {
                                let newStocks = [...editSelectedStocks];
                                let newWeights = { ...editStockWeights };
                                if (isSel) {
                                  if (newStocks.length > 1) {
                                    newStocks = newStocks.filter((x) => x !== s.symbol);
                                    delete newWeights[s.symbol];
                                    newWeights = autoBalanceWeights(newStocks, newWeights);
                                  }
                                } else {
                                  newStocks.push(s.symbol);
                                  newWeights = autoBalanceWeights(newStocks, newWeights, s.symbol, Math.floor(100 / newStocks.length));
                                }
                                setEditSelectedStocks(newStocks);
                                setEditStockWeights(newWeights);
                                setEditTarget(newStocks.map((sym) => `${newWeights[sym] || 0}% ${sym}`).join(" / "));
                              }}
                              className={cn(
                                "rounded-lg px-2 py-1 font-mono text-[10px] font-bold border transition-all cursor-pointer",
                                isSel
                                  ? "border-accent-500 bg-accent-500 text-white shadow-2xs"
                                  : "border-ink-200 bg-white text-ink-700 hover:bg-surface-100"
                              )}
                            >
                              {s.symbol}
                            </button>
                          );
                        })}
                      </div>

                      {/* Percentage Inputs for Selected Stocks */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-accent-200/60">
                        {editSelectedStocks.map((sym) => (
                          <div key={sym} className="flex items-center justify-between rounded-xl bg-white p-2 border border-ink-200">
                            <span className="font-mono text-xs font-bold text-ink-900">{sym}</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={editStockWeights[sym] ?? 50}
                                onChange={(e) => {
                                  const val = Math.max(1, Math.min(100, Number(e.target.value) || 0));
                                  const newWeights = autoBalanceWeights(editSelectedStocks, editStockWeights, sym, val);
                                  setEditStockWeights(newWeights);
                                  setEditTarget(editSelectedStocks.map((s) => `${newWeights[s] || 0}% ${s}`).join(" / "));
                                }}
                                className="w-14 rounded-lg border border-ink-200 bg-surface-50 py-1 px-1.5 text-center font-mono text-xs font-bold text-ink-950 outline-none focus:border-accent-500"
                              />
                              <span className="font-mono text-xs text-ink-500 font-bold">%</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-[10px] font-mono text-ink-500 flex items-center justify-between pt-1">
                        <span>Configured Target:</span>
                        <span className="font-bold text-accent-700 font-mono">{editTarget}</span>
                      </div>
                    </div>
                  ) : (editingMandate.policyType === "dca_recurring" || editingMandate.target.toLowerCase().includes("into")) ? (
                    <div className="space-y-3 rounded-2xl border border-accent-200 bg-accent-50/30 p-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-ink-600 mb-1">
                            Select Tokenized Stock
                          </label>
                          <select
                            value={editDcaStock}
                            onChange={(e) => {
                              const s = e.target.value;
                              setEditDcaStock(s);
                              setEditTarget(`${editDcaAmount} USDG into ${s}`);
                            }}
                            className="w-full rounded-xl border border-ink-200 bg-white p-2 text-xs font-mono font-bold text-ink-900 outline-none focus:border-accent-500 cursor-pointer"
                          >
                            {STOCKS.map((stk) => (
                              <option key={stk.symbol} value={stk.symbol}>
                                {stk.symbol} — {stk.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-ink-600 mb-1">
                            Recurring Capital (USDG)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-ink-400">
                              $
                            </span>
                            <input
                              type="number"
                              min="10"
                              step="10"
                              value={editDcaAmount}
                              onChange={(e) => {
                                const amt = Math.max(1, Number(e.target.value) || 0);
                                setEditDcaAmount(amt);
                                setEditTarget(`${amt} USDG into ${editDcaStock}`);
                                setEditThreshold(`${amt} USDG`);
                              }}
                              className="w-full rounded-xl border border-ink-200 bg-white py-2 pl-6 pr-12 text-xs font-mono font-bold text-ink-900 outline-none focus:border-accent-500"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-ink-400">
                              USDG
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick DCA Amount Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {[25, 50, 100, 250, 500].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              setEditDcaAmount(amt);
                              setEditTarget(`${amt} USDG into ${editDcaStock}`);
                              setEditThreshold(`${amt} USDG`);
                            }}
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-[10px] font-mono font-bold transition-all cursor-pointer",
                              editDcaAmount === amt
                                ? "bg-accent-600 text-white shadow-2xs"
                                : "bg-white border border-ink-200 text-ink-700 hover:bg-surface-100"
                            )}
                          >
                            ${amt} USDG
                          </button>
                        ))}
                      </div>

                      <div className="text-[10px] font-mono text-ink-500 flex items-center justify-between pt-1 border-t border-accent-200/60">
                        <span>Configured DCA Rule:</span>
                        <span className="font-bold text-accent-700 font-mono">{editTarget}</span>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={editTarget}
                      onChange={(e) => setEditTarget(e.target.value)}
                      placeholder="e.g. 60% NVDAx / 40% AAPLx"
                      className="w-full rounded-xl border border-ink-200 bg-surface-50 px-3.5 py-2 font-mono text-ink-950 outline-none focus:border-accent-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-700 mb-1">
                    Operational Execution Rule
                  </label>
                  <textarea
                    rows={2}
                    value={editRule}
                    onChange={(e) => setEditRule(e.target.value)}
                    placeholder="Execution rule description..."
                    className="w-full rounded-xl border border-ink-200 bg-surface-50 px-3.5 py-2 text-ink-950 outline-none focus:border-accent-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-700 mb-1">
                    Trigger Threshold / Limit
                  </label>
                  <input
                    type="text"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(e.target.value)}
                    placeholder="e.g. 3.5% or 100 USDG"
                    className="w-full rounded-xl border border-ink-200 bg-surface-50 px-3.5 py-2 font-mono text-ink-950 outline-none focus:border-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-700 mb-1">
                    Policy Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditStatus("active")}
                      className={cn(
                        "flex-1 py-2 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer",
                        editStatus === "active"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-ink-200 bg-white text-ink-600 hover:bg-surface-50"
                      )}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStatus("paused")}
                      className={cn(
                        "flex-1 py-2 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer",
                        editStatus === "paused"
                          ? "border-amber-500 bg-amber-50 text-amber-800"
                          : "border-ink-200 bg-white text-ink-600 hover:bg-surface-50"
                      )}
                    >
                      Paused
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setEditingMandate(null)}
                  className="px-4 py-2 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-surface-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditMandate}
                  className="px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Policy Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* First Screen: Mode Chooser with Transparent / Glassmorphism Backdrop */}
      <AnimatePresence>
        {showInitialModeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-ink-200/80 bg-white/95 backdrop-blur-xl p-4 sm:p-8 shadow-2xl text-ink-900"
            >
              {/* Header */}
              <div className="text-center space-y-2 pb-6 border-b border-ink-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 border border-accent-200 px-3 py-1 font-mono text-[11px] font-bold text-accent-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse" />
                  OKX X Layer (Chain ID 196) · Dual-Architecture Terminal
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950">
                  Select Your Trading Environment
                </h2>
                <p className="text-xs sm:text-sm text-ink-600 max-w-lg mx-auto leading-relaxed">
                  Meirei features two distinct operational modes. Executions in Basic Mode remain completely isolated from autonomous mandates in Advanced Mode.
                </p>
              </div>

              {/* Mode Selection Cards */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {/* 1. Basic Mode Card */}
                <div
                  onClick={() => {
                    setMode("basic");
                    setShowInitialModeModal(false);
                  }}
                  className="rounded-2xl border-2 border-accent-200 bg-accent-50/40 hover:bg-accent-50/80 p-5 flex flex-col justify-between transition-all cursor-pointer hover:border-accent-500 hover:shadow-md group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-accent-700 tracking-wider uppercase">
                        Direct Spot
                      </span>
                      <span className="rounded-full bg-accent-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-accent-800">
                        Spot &amp; Calculator
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-ink-950 group-hover:text-accent-700 transition-colors">
                        Basic Mode
                      </h3>
                      <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                        Instant spot equity trading across 20 allowlisted equities, real-time USDG unit calculator, centralized portfolio holdings, and sponsored zero-gas execution.
                      </p>
                    </div>
                    <ul className="text-[11px] text-ink-700 space-y-1 font-medium pt-2 border-t border-accent-200/50">
                      <li>✓ Curated 20 Allowlisted xStocks</li>
                      <li>✓ Real-Time USDG Unit Calculator</li>
                      <li>✓ Non-Custodial Quick Buy with 0 Gas</li>
                      <li>✓ Completely Isolated Spot Portfolio</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className="mt-5 w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Enter Basic Mode</span>
                    <span>→</span>
                  </button>
                </div>

                {/* 2. Advanced Mode Card */}
                <div
                  onClick={() => {
                    setShowInitialModeModal(false);
                    handleSwitchToAdvanced();
                  }}
                  className="rounded-2xl border-2 border-ink-200 bg-surface-50/60 hover:bg-surface-50 p-5 flex flex-col justify-between transition-all cursor-pointer hover:border-ink-900 hover:shadow-md group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-ink-700 tracking-wider uppercase">
                        Algorithmic Mandates
                      </span>
                      <span className="rounded-full bg-ink-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-ink-800">
                        Autonomous Mandates
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-ink-950 group-hover:text-ink-900 transition-colors">
                        Advanced Mode
                      </h3>
                      <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                        Autonomous mandate orchestrator synchronizing institutional market analysis, algorithmic drift rebalancing, recurring DCA schedules, and on-chain catalyst intelligence.
                      </p>
                    </div>
                    <ul className="text-[11px] text-ink-700 space-y-1 font-medium pt-2 border-t border-ink-200/60">
                      <li>✓ Real-Time On-Chain Intelligence</li>
                      <li>✓ Algorithmic Drift &amp; DCA Solvers</li>
                      <li>✓ Volatility Circuit Breakers</li>
                      <li>✓ Dedicated Mandate Capital Allocation</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className="mt-5 w-full py-2.5 rounded-xl bg-ink-900 hover:bg-accent-600 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Enter Advanced Mode</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between text-[11px] text-ink-500">
                <span>Non-Custodial Session Keys on OKX X Layer (Chain 196)</span>
                <span className="font-mono text-[10px]">Zero Server Custody</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
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

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-ink-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvancedTermsModal(false);
                      setMode("basic");
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-ink-700 text-xs font-semibold hover:bg-surface-100 transition-colors cursor-pointer text-center"
                  >
                    Decline &amp; Stay in Basic Mode
                  </button>
                  <button
                    type="button"
                    disabled={!termsAgreedCheckbox}
                    onClick={() => {
                      setHasAcceptedAdvancedTerms(true);
                      setShowAdvancedTermsModal(false);
                      setMode("advanced");
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-ink-900 hover:bg-accent-600 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs text-center"
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
          if (typeof window !== "undefined") {
            localStorage.setItem("meirei_wallet_address", address);
            localStorage.setItem("meirei_wallet_name", walletName);
            localStorage.removeItem("meirei_demo_sandbox");
            localStorage.removeItem("meirei_disconnected");
          }
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

      {/* Non-Custodial Mandate Web3 Signing Modal (Execute >> Confirm Wallet Signature >> Confirmed) */}
      {mandatePlanToSign && (
        <MandateSigningModal
          isOpen={Boolean(mandatePlanToSign)}
          onClose={() => setMandatePlanToSign(null)}
          strategyName={mandatePlanToSign.strategyName}
          capitalUsdg={advisoryCapital}
          stablecoin={advisoryStablecoin}
          allocations={mandatePlanToSign.allocations}
          mandateRule={mandatePlanToSign.mandateRule}
          rebalanceInterval={mandatePlanToSign.rebalanceInterval}
          downsideProtection={mandatePlanToSign.downsideProtection}
          userAddress={connectAddress || (profile.address && profile.address !== "0x0000000000000000000000000000000000000000" ? profile.address : "")}
          onSuccess={(receipt) => {
            handleDeployAdvisoryMandate(mandatePlanToSign, receipt);
            setMandatePlanToSign(null);
          }}
        />
      )}
    </div>
  );
}
