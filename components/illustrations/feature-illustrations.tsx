"use client";

import { motion } from "framer-motion";
import { PhoneFrame } from "@/components/ui/phone-frame";
import { ChatScreen, StaticBubble, ReceiptCard } from "@/components/ui/chat-mockup";

/**
 * SendIllustration — shows a stock trade with quote and confirmation card.
 */
export function SendIllustration() {
  return (
    <div className="relative mx-auto w-fit">
      <PhoneFrame>
        <ChatScreen>
          <StaticBubble side="out" time="11:02">
            buy 250 USDG of AAPLx
          </StaticBubble>
          <StaticBubble side="in" time="11:02">
            Quote via OKX DEX: 250 USDG  ~0.752 AAPLx on X Layer. Price impact: 0.08%. Reply yes to confirm.
          </StaticBubble>
          <StaticBubble side="out" time="11:03">
            yes
          </StaticBubble>
          <div className="flex justify-start">
            <ReceiptCard
              status="Trade Executed"
              statusTone="confirmed"
              amount="+ 0.752 AAPLx"
              detail="Swapped 250 USDG on X Layer"
              reference="tx_4P7M2N"
              time="11:03"
            />
          </div>
        </ChatScreen>
      </PhoneFrame>
    </div>
  );
}

/**
 * BalanceIllustration — Everyday messaging interface (Telegram/WhatsApp/IG) with live mandate & portfolio updates.
 */
export function BalanceIllustration() {
  const stockTokens = [
    { symbol: "NVDAx", color: "border-[#76B900]/40 text-[#76B900] bg-[#76B900]/10" },
    { symbol: "AAPLx", color: "border-ink-900/30 text-ink-900 bg-ink-900/5" },
    { symbol: "MSFTx", color: "border-[#00A4EF]/40 text-[#00A4EF] bg-[#00A4EF]/10" },
    { symbol: "METAx", color: "border-[#0668E1]/40 text-[#0668E1] bg-[#0668E1]/10" },
    { symbol: "TSLAx", color: "border-[#E82127]/40 text-[#E82127] bg-[#E82127]/10" },
    { symbol: "AMZNx", color: "border-[#FF9900]/40 text-[#FF9900] bg-[#FF9900]/10" },
    { symbol: "GOOGLx", color: "border-[#34A853]/40 text-[#34A853] bg-[#34A853]/10" },
    { symbol: "COINx", color: "border-[#0052FF]/40 text-[#0052FF] bg-[#0052FF]/10" },
  ];

  return (
    <div className="relative mx-auto w-fit">
      <PhoneFrame>
        {/* Everyday Messaging Screen (Telegram/WhatsApp/IG) */}
        <div className="flex h-full flex-col bg-white text-ink-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-100 bg-white px-3 py-3 pt-12">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full p-[1.5px] bg-gradient-to-tr from-[#2AABEE] via-[#229ED9] to-[#0088CC]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white font-display text-xs font-bold text-accent-500">
                  命令
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold leading-none text-ink-900">Meirei Mandate Bot</p>
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-[#0095F6]">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <p className="mt-0.5 text-[9px] text-ink-400">Everyday App Connected · OKX X Layer</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ● Live Mandate Active
            </div>
          </div>

          {/* Message Area */}
          <div className="flex flex-1 flex-col gap-3 bg-[#FAFAFA] p-3 text-[13px] overflow-y-auto">
            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-gradient-to-r from-accent-600 to-accent-500 px-3.5 py-2 text-[12px] font-medium text-white shadow-xs">
                what is happening with my portfolio and mandate?
              </div>
            </div>

            {/* Meirei Agent Response */}
            <div className="flex flex-col items-start gap-1">
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-white p-3 text-ink-900 shadow-xs border border-ink-100/80">
                <div className="flex items-center justify-between border-b border-ink-100 pb-1.5">
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
                    Portfolio & Mandate Status
                  </p>
                  <span className="font-mono text-[9px] font-bold text-accent-700 bg-accent-50 px-1.5 py-0.2 rounded">
                    Chain 196
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <p className="font-sans text-2xl font-bold tabular-nums text-ink-900">
                    $12,450.00 <span className="text-xs font-mono font-semibold text-ink-500">USDG</span>
                  </p>
                  <span className="font-mono text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    +8.4% 30D
                  </span>
                </div>

                {/* Mandate & Latest Happening Notification */}
                <div className="mt-2.5 rounded-xl border border-accent-200/80 bg-accent-50/40 p-2 text-left">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-ink-900">Mandate #1: Dynamic Momentum</span>
                    <span className="text-accent-700 font-mono font-semibold">Active 24/7</span>
                  </div>
                  <p className="mt-1 text-[10px] text-ink-600 leading-snug">
                    <strong className="text-ink-800">Latest Happening:</strong> Trimmed NVDAx swing high (+1.8%) into USDG liquidity buffer. All positions balanced within 2% drift tolerance.
                  </p>
                </div>

                {/* Active stock symbols */}
                <p className="mt-2.5 text-[9px] uppercase font-semibold tracking-wider text-ink-400">
                  Active Tokenized Equities Sleeve
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {stockTokens.map((token, i) => (
                    <motion.span
                      key={token.symbol}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold ${token.color}`}
                    >
                      {token.symbol}
                    </motion.span>
                  ))}
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-ink-100 pt-1.5 text-[9px] text-ink-400">
                  <span>Everyday App · Telegram / WhatsApp Sync</span>
                  <span className="font-semibold text-emerald-600">● Auto-Updates On</span>
                </div>
              </div>
              <span className="ml-1 text-[9px] text-ink-400">Meirei Agent · Just now</span>
            </div>
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}

/**
 * ReceiveIllustration — Single-sentence rebalance with latest news & autonomous AI trading agent.
 */
export function ReceiveIllustration() {
  const metrics = [
    { label: "AAPLx Sleeve", weight: "20.0%", value: "$2,490.00", drift: "-0.2%", color: "bg-ink-900" },
    { label: "NVDAx Sleeve", weight: "20.0%", value: "$2,490.00", drift: "+0.4%", color: "bg-[#76B900]" },
    { label: "MSFTx Sleeve", weight: "20.0%", value: "$2,490.00", drift: "-0.1%", color: "bg-[#00A4EF]" },
    { label: "METAx Sleeve", weight: "20.0%", value: "$2,490.00", drift: "+0.1%", color: "bg-[#0668E1]" },
    { label: "USDG Cash", weight: "20.0%", value: "$2,490.00", drift: "0.0%", color: "bg-accent-500" },
  ];

  return (
    <div className="relative mx-auto w-fit">
      <PhoneFrame>
        <div className="flex h-full flex-col bg-surface-50">
          <ChatScreen>
            <StaticBubble side="out" time="09:21">
              rebalance 20% each into mag7 and usdg
            </StaticBubble>

            {/* Rich Autonomous AI Trading & Rebalance Card */}
            <div className="rounded-2xl border border-ink-200/80 bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-ink-100 pb-2">
                <div>
                  <span className="font-display text-xs font-bold text-ink-900 block">
                    Autonomous AI Trading Agent
                  </span>
                  <span className="text-[9px] font-mono text-ink-400">
                    OKX X Layer (Chain 196) · Sponsored Gas
                  </span>
                </div>
                <span className="rounded bg-accent-50 px-1.5 py-0.5 text-[9px] font-bold text-accent-700">
                  AI Active
                </span>
              </div>

              {/* Latest Market News Banner */}
              <div className="mt-2.5 rounded-lg border border-sky-200 bg-sky-50/70 p-2 text-left">
                <span className="font-mono text-[9px] font-bold text-sky-800 uppercase flex items-center gap-1">
                  Latest Market News Intelligence
                </span>
                <p className="mt-0.5 text-[10px] text-sky-900 leading-snug">
                  NVDA compute shipments accelerate; Mag7 sentiment score surges to 86/100. Autonomous rebalance solver activated.
                </p>
              </div>

              {/* Allocation Progress Bar */}
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-surface-200">
                <div className="w-[20%] bg-ink-900" />
                <div className="w-[20%] bg-[#76B900]" />
                <div className="w-[20%] bg-[#00A4EF]" />
                <div className="w-[20%] bg-[#0668E1]" />
                <div className="w-[20%] bg-accent-500" />
              </div>

              {/* Asset metric rows */}
              <div className="mt-2.5 space-y-1.5">
                {metrics.map((m) => (
                  <div key={m.label} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${m.color}`} />
                      <span className="text-ink-700 font-medium">{m.label}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-ink-900 font-semibold">{m.weight}</span>
                      <span className="text-ink-400 text-[9px]">{m.drift}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Execution telemetry */}
              <div className="mt-2.5 border-t border-ink-100 pt-2 flex justify-between text-[10px] text-ink-500">
                <span>Finality: ~0.8s (Instant)</span>
                <span className="text-accent-600 font-semibold">OKX DEX Aggregator</span>
              </div>
            </div>

            <StaticBubble side="in" time="09:22">
              Autonomous AI Rebalance complete! 4 stock legs settled on X Layer with zero excess drift.
            </StaticBubble>
          </ChatScreen>
        </div>
      </PhoneFrame>
    </div>
  );
}

/**
 * ContextIllustration — Multilingual natural language mandate comprehension (Understands every word in different languages).
 */
export function ContextIllustration() {
  const multilingualExamples = [
    { lang: "English", cmd: "buy 250 USDG of NVDAx", desc: "Instant tokenized equity swap via OKX DEX" },
    { lang: "Español", cmd: "rebalancear 20% en mag7 y usdg", desc: "Rebalanceo automático en X Layer" },
    { lang: "中文", cmd: "查询我的投资组合余额与指令", desc: "实时多资产持仓与自律指令审计" },
    { lang: "日本語", cmd: "最新ニュースと株式リバランス", desc: "自律型AI取引エージェントの実行" },
  ];

  return (
    <div className="relative mx-auto w-fit">
      <PhoneFrame>
        <div className="flex h-full flex-col bg-surface-50 p-3 pt-12 overflow-y-auto">
          {/* Header */}
          <div className="rounded-xl bg-ink-900 p-3 text-white">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold">Talk Naturally</span>
              <span className="rounded bg-accent-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-accent-300">
                Multilingual AI
              </span>
            </div>
            <p className="mt-1 text-[11px] text-surface-200">
              We understand you in any form of way. Meirei understands every word you say in different languages.
            </p>
          </div>

          {/* Section 1: Connect in One Tap */}
          <div className="mt-3 rounded-xl border border-ink-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">
                1
              </span>
              <p className="font-display text-xs font-bold text-ink-900">Connect in One Tap</p>
            </div>
            <p className="mt-1 text-[11px] text-ink-500">
              Start on Telegram, WhatsApp, or Web. Connect instantly with non-custodial signing and zero crypto friction.
            </p>
          </div>

          {/* Section 2: Multilingual Prompts (Understands Any Language) */}
          <div className="mt-3 rounded-xl border border-ink-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">
                  2
                </span>
                <p className="font-display text-xs font-bold text-ink-900">Understands Different Languages</p>
              </div>
              <span className="text-[9px] font-mono text-accent-700 bg-accent-50 px-1.5 py-0.2 rounded font-semibold">
                Global NLP
              </span>
            </div>

            <div className="mt-2 space-y-1.5">
              {multilingualExamples.map((ex) => (
                <div key={ex.cmd} className="rounded-lg bg-surface-50 p-2 text-left border border-ink-100">
                  <div className="flex items-center justify-between text-[9px] text-ink-400 font-semibold mb-0.5">
                    <span>{ex.lang}</span>
                    <span className="text-emerald-600 font-mono">100% Parsed</span>
                  </div>
                  <p className="font-mono text-[10px] font-semibold text-accent-700">"{ex.cmd}"</p>
                  <p className="text-[9px] text-ink-500 mt-0.5">{ex.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Expanding to More Languages */}
          <div className="mt-2.5 rounded-lg border border-accent-200 bg-accent-50/50 p-2 text-center">
            <p className="text-[10px] font-semibold text-ink-800">
              Adding French, German, Korean &amp; Arabic soon!
            </p>
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}
