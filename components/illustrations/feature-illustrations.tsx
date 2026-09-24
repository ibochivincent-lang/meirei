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
 * BalanceIllustration — Instagram DM interface with combined animated stock symbols.
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
        {/* Instagram DM Theme Screen */}
        <div className="flex h-full flex-col bg-white text-ink-900">
          {/* Instagram DM Header */}
          <div className="flex items-center justify-between border-b border-ink-100 bg-white px-3 py-3 pt-12">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full p-[1.5px] bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white font-display text-xs font-bold text-accent-500">
                  命令
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold leading-none text-ink-900">meirei.agent</p>
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-[#0095F6]">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <p className="mt-0.5 text-[9px] text-ink-400">Active now · OKX X Layer</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-ink-600">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
          </div>

          {/* Instagram Message Area */}
          <div className="flex flex-1 flex-col gap-3 bg-[#FAFAFA] p-3 text-[13px]">
            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] px-3.5 py-2 text-[12px] font-medium text-white shadow-xs">
                what is my balance?
              </div>
            </div>

            {/* Meirei Agent Response */}
            <div className="flex flex-col items-start gap-1">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white p-3 text-ink-900 shadow-xs border border-ink-100/80">
                <p className="text-[10px] uppercase font-semibold tracking-wider text-ink-400">
                  X Layer Portfolio Balance
                </p>
                <p className="mt-1 font-sans text-2xl font-bold tabular-nums text-ink-900">
                  $12,450.00 USDG
                </p>

                {/* Animated Converging Stock Symbols Cluster with Transparent Background */}
                <p className="mt-3 text-[10px] uppercase font-semibold tracking-wider text-ink-400">
                  Active xStocks Combined
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {stockTokens.map((token, i) => (
                    <motion.span
                      key={token.symbol}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${token.color}`}
                    >
                      {token.symbol}
                    </motion.span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2 text-[10px] text-ink-400">
                  <span>Chain: X Layer (196)</span>
                  <span className="font-semibold text-emerald-600">● 7 of 7 Live</span>
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
 * ReceiveIllustration — Stock metrics dashboard card instead of plain blank white.
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

            {/* Rich Stock Metrics Card */}
            <div className="rounded-2xl border border-ink-200/80 bg-white p-3.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-ink-100 pb-2">
                <span className="font-display text-xs font-bold text-ink-900">
                  Mandate Rebalance Metrics
                </span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                  Optimal
                </span>
              </div>

              {/* Allocation Progress Bar */}
              <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-surface-200">
                <div className="w-[20%] bg-ink-900" />
                <div className="w-[20%] bg-[#76B900]" />
                <div className="w-[20%] bg-[#00A4EF]" />
                <div className="w-[20%] bg-[#0668E1]" />
                <div className="w-[20%] bg-accent-500" />
              </div>

              {/* Asset metric rows */}
              <div className="mt-3 space-y-1.5">
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
              <div className="mt-3 border-t border-ink-100 pt-2 flex justify-between text-[10px] text-ink-500">
                <span>Finality: ~3.8s</span>
                <span className="text-accent-600 font-semibold">OKX DEX Aggregator</span>
              </div>
            </div>

            <StaticBubble side="in" time="09:22">
              Rebalance executed. 4 stock legs settled on X Layer with zero excess drift.
            </StaticBubble>
          </ChatScreen>
        </div>
      </PhoneFrame>
    </div>
  );
}

/**
 * ContextIllustration — Step 1: Connect, Step 2: Key Prompts you can ask Meirei.
 */
export function ContextIllustration() {
  const keywords = [
    { cmd: "Price of <stock>", desc: "Live X Layer spot prices" },
    { cmd: "Buy <amount> of <stock>", desc: "Sub second swap execution" },
    { cmd: "How much is my balance?", desc: "Real time holdings audit" },
    { cmd: "60% mag7, 20% USDG", desc: "Automated mandate rebalance" },
    { cmd: "Set max single 8%", desc: "Cap aware downside protection" },
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
                AI Native
              </span>
            </div>
            <p className="mt-1 text-[11px] text-surface-200">Meirei parses any sentence into on chain actions.</p>
          </div>

          {/* Number 1: Connect */}
          <div className="mt-3 rounded-xl border border-ink-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">
                1
              </span>
              <p className="font-display text-xs font-bold text-ink-900">Connect in One Tap</p>
            </div>
            <p className="mt-1 text-[11px] text-ink-500">
              Start on WhatsApp, Telegram, or Instagram. Your account connects instantly with zero passkeys or seed phrases.
            </p>
          </div>

          {/* Number 2: Key Words you can ask Meirei */}
          <div className="mt-3 rounded-xl border border-ink-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">
                2
              </span>
              <p className="font-display text-xs font-bold text-ink-900">Key Words & Prompts to Ask</p>
            </div>

            <div className="mt-2 space-y-1.5">
              {keywords.map((k) => (
                <div key={k.cmd} className="rounded-lg bg-surface-50 p-1.5 text-left border border-ink-100">
                  <p className="font-mono text-[10px] font-semibold text-accent-700">{k.cmd}</p>
                  <p className="text-[9px] text-ink-500">{k.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}
