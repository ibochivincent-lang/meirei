"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ChatHeader, AnimatedBubble, ReceiptCard, type Channel } from "@/components/ui/chat-mockup";
import { cn } from "@/lib/utils/cn";

type Turn =
  | { kind: "bubble"; side: "in" | "out"; text: string; time: string }
  | { kind: "typing"; side: "in" | "out" }
  | {
      kind: "receipt";
      status: string;
      statusTone: "confirmed" | "new";
      amount: string;
      detail: string;
      reference: string;
      time: string;
    };

/**
 * Two scripts, one per channel — the hero phone alternates between them on
 * a loop so the product reads as genuinely dual-channel rather than
 * WhatsApp with Telegram bolted on as an afterthought.
 */
const SCRIPTS: Record<Channel, { turn: Turn; displayMs: number }[]> = {
  whatsapp: [
    {
      turn: { kind: "bubble", side: "out", text: "buy 500 USDG of AAPLx", time: "9:14" },
      displayMs: 1400,
    },
    { turn: { kind: "typing", side: "in" }, displayMs: 900 },
    {
      turn: {
        kind: "bubble",
        side: "in",
        text: "You want to buy 500 USDG of AAPLx on X Layer. The current price is ~223.50 USDG. Reply yes to confirm.",
        time: "9:14",
      },
      displayMs: 2400,
    },
    {
      turn: { kind: "bubble", side: "out", text: "yes", time: "9:14" },
      displayMs: 1100,
    },
    { turn: { kind: "typing", side: "in" }, displayMs: 700 },
    {
      turn: {
        kind: "receipt",
        status: "Trade Executed",
        statusTone: "confirmed",
        amount: "+ 2.23 AAPLx",
        detail: "Swapped 500 USDG",
        reference: "tx_8K2L9F",
        time: "9:14",
      },
      displayMs: 3500,
    },
  ],
  telegram: [
    {
      turn: {
        kind: "receipt",
        status: "Trade Executed",
        statusTone: "new",
        amount: "+ 10.00 NVDAx",
        detail: "Swapped 1,200 USDG",
        reference: "tx_3M9XQP",
        time: "16:20",
      },
      displayMs: 2200,
    },
    { turn: { kind: "typing", side: "in" }, displayMs: 700 },
    {
      turn: {
        kind: "bubble",
        side: "in",
        text: "Your trade is complete. Your portfolio is now $3,450.20 and is actively managed by Meirei.",
        time: "16:20",
      },
      displayMs: 3500,
    },
  ],
  instagram: [
    {
      turn: { kind: "bubble", side: "out", text: "Price of NVDAx", time: "14:40" },
      displayMs: 1400,
    },
    { turn: { kind: "typing", side: "in" }, displayMs: 700 },
    {
      turn: {
        kind: "bubble",
        side: "in",
        text: "1 NVDAx = $213.90 USDG on X Layer (chain 196). Live execution via OKX DEX Aggregator.",
        time: "14:40",
      },
      displayMs: 3000,
    },
    {
      turn: {
        kind: "receipt",
        status: "Live Quote Ready",
        statusTone: "confirmed",
        amount: "$213.90 USDG",
        detail: "1 NVDAx on X Layer",
        reference: "tx_NVDA21",
        time: "14:40",
      },
      displayMs: 3500,
    },
  ],
};

const LOOP_GAP_MS = 1200; // pause after the last turn before switching channels

/**
 * LiveChatThread
 *
 * Auto-plays a scripted conversation on a loop, alternating between
 * WhatsApp, Telegram, and Instagram scripts each time around.
 */
export function LiveChatThread() {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [visibleTurns, setVisibleTurns] = useState<Turn[]>([]);

  useEffect(() => {
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let activeChannel: Channel = "whatsapp";

    function runScript() {
      if (cancelled) return;
      setChannel(activeChannel);
      setVisibleTurns([]);

      const script = SCRIPTS[activeChannel];
      let cumulativeDelay = 200;
      script.forEach(({ turn, displayMs }, idx) => {
        const t = setTimeout(() => {
          if (cancelled) return;
          setVisibleTurns((prev) => {
            const last = prev[prev.length - 1];
            if (
              last?.kind === "typing" &&
              turn.kind === "bubble" &&
              last.side === turn.side
            ) {
              return [...prev.slice(0, -1), turn];
            }
            if (
              last?.kind === "typing" &&
              turn.kind === "receipt"
            ) {
              return [...prev.slice(0, -1), turn];
            }
            return [...prev, turn];
          });

          if (idx === script.length - 1) {
            const restart = setTimeout(() => {
              activeChannel =
                activeChannel === "whatsapp"
                  ? "telegram"
                  : activeChannel === "telegram"
                  ? "instagram"
                  : "whatsapp";
              runScript();
            }, displayMs + LOOP_GAP_MS);
            timeouts.push(restart);
          }
        }, cumulativeDelay);
        timeouts.push(t);
        cumulativeDelay += displayMs;
      });
    }

    runScript();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const isTelegram = channel === "telegram";

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        variant="full"
        channel={channel}
        subtitle={isTelegram ? "via Telegram" : "Online"}
      />

      {/* Messages */}
      <div
        className={cn(
          "flex flex-1 flex-col justify-end gap-2 overflow-hidden bg-cover bg-center p-3",
          channel === "whatsapp" && "bg-[url('/whatsapp-bg.png')] dark:bg-none dark:bg-[#0b141a]",
          channel === "instagram" && "bg-[#FAFAFA] dark:bg-black",
          channel === "telegram" && "bg-[#DCEAF5] dark:bg-[#0e1621] [background-image:radial-gradient(rgba(51,144,236,0.14)_1px,transparent_1px)] dark:[background-image:radial-gradient(rgba(51,144,236,0.18)_1px,transparent_1px)] [background-size:14px_14px]",
        )}
      >
        <AnimatePresence initial={false}>
          {visibleTurns.map((turn, idx) => (
            <TurnView key={`${idx}-${turn.kind}`} turn={turn} channel={channel} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Single turn renderer. Branches on `kind` and returns the matching shape.
 * Pulled out so the parent stays focused on orchestration.
 */
function TurnView({ turn, channel }: { turn: Turn; channel: Channel }) {
  if (turn.kind === "typing") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={`flex ${turn.side === "out" ? "justify-end" : "justify-start"}`}
      >
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white dark:bg-[#1f2c34] px-3 py-2.5 shadow-sm">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="inline-block h-1.5 w-1.5 rounded-full bg-ink-400 dark:bg-ink-300"
              style={{
                animation: `typing-dots 1.2s infinite ${delay}ms ease-in-out`,
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  if (turn.kind === "receipt") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-start"
      >
        <ReceiptCard
          status={turn.status}
          statusTone={turn.statusTone}
          amount={turn.amount}
          detail={turn.detail}
          reference={turn.reference}
          time={turn.time}
        />
      </motion.div>
    );
  }

  // Bubble
  return (
    <AnimatedBubble
      side={turn.side}
      time={turn.time}
      channel={channel}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {turn.text}
    </AnimatedBubble>
  );
}
