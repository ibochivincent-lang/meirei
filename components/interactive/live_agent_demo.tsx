"use client";

import { useState, useRef, useEffect } from "react";
import { PhoneFrame } from "@/components/ui/phone-frame";
import { ChatHeader, ReceiptCard } from "@/components/ui/chat-mockup";
import { cn } from "@/lib/utils/cn";

interface ChatTurn {
  id: string;
  side: "in" | "out";
  text: string;
  time: string;
  receipt?: {
    status: string;
    statusTone: "confirmed" | "new" | "received";
    amount: string;
    detail: string;
    reference: string;
    time: string;
  };
}

const INITIAL_TURNS: ChatTurn[] = [
  {
    id: "init-1",
    side: "in",
    text: "Hello! I am Meirei (命令), your AI mandate agent on X Layer. Ask for your balance, query real-time stock prices (e.g. AAPLx, NVDAx), or type an investment mandate.",
    time: "10:00",
  },
];

const SUGGESTIONS = [
  "How much is my balance?",
  "Price of AAPLx",
  "Price of NVDAx",
  "Buy 1 AAPLx",
  "60% mag7, 20% USDG, max 8%",
];

export function LiveAgentDemo() {
  const [turns, setTurns] = useState<ChatTurn[]>(INITIAL_TURNS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [turns, loading]);

  const sendMessage = async (textToSend?: string) => {
    const message = (textToSend || input).trim();
    if (!message || loading) return;

    setInput("");
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      side: "out",
      text: message,
      time: now,
    };

    setTurns((prev) => [...prev, userTurn]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (res.ok && data.reply) {
        const agentTurn: ChatTurn = {
          id: `agent-${Date.now()}`,
          side: "in",
          text: data.reply,
          time: replyTime,
          receipt: data.receipt,
        };
        setTurns((prev) => [...prev, agentTurn]);
      } else {
        setTurns((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            side: "in",
            text: data.error || "Unable to process mandate on X Layer. Please retry.",
            time: replyTime,
          },
        ]);
      }
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          side: "in",
          text: "Network error connecting to Meirei on X Layer.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid w-full gap-8 lg:grid-cols-12 lg:items-center">
      {/* Phone Mockup Screen */}
      <div className="order-2 flex justify-center lg:order-1 lg:col-span-6">
        <PhoneFrame className="w-full max-w-[340px] shadow-2xl">
          <div className="flex h-full flex-col">
            <ChatHeader variant="compact" subtitle="Online · X Layer" />
            <div
              ref={scrollAreaRef}
              className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-cover bg-center p-3.5 bg-[url('/whatsapp-bg.png')]"
              style={{ maxHeight: "430px" }}
            >
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={cn("flex flex-col", turn.side === "out" ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-[84%] rounded-2xl px-3.5 py-2 text-[12px] leading-snug shadow-sm",
                      turn.side === "out"
                        ? "rounded-br-md bg-accent-500 text-white"
                        : "rounded-bl-md bg-white text-ink-900",
                    )}
                  >
                    <p className="whitespace-pre-line">{turn.text}</p>
                    <span
                      className={cn(
                        "mt-1 block text-right text-[9px]",
                        turn.side === "out" ? "text-white/70" : "text-ink-400",
                      )}
                    >
                      {turn.time}
                    </span>
                  </div>

                  {turn.receipt && (
                    <div className="mt-2 w-[90%]">
                      <ReceiptCard
                        status={turn.receipt.status}
                        statusTone={turn.receipt.statusTone}
                        amount={turn.receipt.amount}
                        detail={turn.receipt.detail}
                        reference={turn.receipt.reference}
                        time={turn.receipt.time}
                      />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-2.5 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </PhoneFrame>
      </div>

      {/* Interactive Chat Control Box */}
      <div className="order-1 flex flex-col items-start lg:order-2 lg:col-span-6">
        <div className="w-full rounded-2xl border border-ink-200/80 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between border-b border-ink-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-display text-sm font-semibold tracking-tight text-ink-900">
                Live Meirei Agent Console
              </span>
            </div>
            <span className="rounded bg-accent-50 px-2 py-0.5 font-mono text-[10px] font-medium text-accent-700">
              X Layer Chain 196
            </span>
          </div>

          <p className="mt-3 text-xs text-ink-500 md:text-sm">
            Type any question or investment mandate below. Your message replicates into the live phone simulation in real time:
          </p>

          {/* Prompt pills */}
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => sendMessage(sug)}
                disabled={loading}
                className="rounded-full border border-ink-200 bg-surface-50 px-3 py-1 text-[11px] font-medium text-ink-700 transition-all hover:border-accent-500 hover:bg-accent-50 hover:text-accent-700 disabled:opacity-50"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Form input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="mt-4 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. How much is my balance? or Price of AAPLx"
              disabled={loading}
              className="flex-1 rounded-xl border border-ink-200 bg-surface-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-all focus:border-accent-500 focus:bg-white focus:ring-1 focus:ring-accent-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center justify-center rounded-xl bg-accent-500 px-4 py-2.5 font-sans text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-600 active:scale-95 disabled:opacity-50"
            >
              {loading ? "..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
