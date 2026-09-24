"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView, useScroll, useTransform, type Variants } from "framer-motion";
import { PhoneFrame } from "@/components/ui/phone-frame";
import { ChatHeader, ReceiptCard } from "@/components/ui/chat-mockup";
import { EASE } from "@/lib/animation/variants";
import { cn } from "@/lib/utils/cn";

import { STOCKS } from "@/components/interactive/stock_selector_grid";

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
  chartPreview?: {
    symbol: string;
    name: string;
    price: string;
    change: string;
    isLive: boolean;
  };
}

const INITIAL_TURNS: ChatTurn[] = [
  {
    id: "init-1",
    side: "in",
    text: "Hello! I am Meirei (命令), your AI mandate agent on X Layer. Ask for your balance, query live stock prices (NVDAx, AAPLx, MSFTx, METAx, TSLAx, AMZNx, GOOGLx, COINx), or send an investment mandate.",
    time: "10:00",
  },
  {
    id: "init-2",
    side: "out",
    text: "Price of NVDAx",
    time: "10:01",
  },
  {
    id: "init-3",
    side: "in",
    text: "Live spot price on X Layer (chain 196): 1 NVDAx = $213.90 USDG (via OKX Market Feed). Settles with sub second finality.",
    time: "10:01",
    chartPreview: {
      symbol: "NVDAx",
      name: "NVIDIA",
      price: "$213.90",
      change: "+2.45%",
      isLive: true,
    },
  },
];

const SUGGESTIONS = [
  "How much is my balance?",
  "Price of NVDAx",
  "Price of AAPLx",
  "Price of MSFTx",
  "Price of METAx",
  "Price of TSLAx",
  "Price of AMZNx",
  "Price of GOOGLx",
  "Price of COINx",
  "Buy 1 AAPLx",
  "60% mag7, 20% USDG, max 8%",
];

export function LiveAgentFeature() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(cardRef, {
    once: true,
    amount: 0.3,
    margin: "-10% 0px -10% 0px",
  });
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["end end", "end start"],
  });
  const exitOpacityRaw = useTransform(scrollYProgress, [0, 1], [1, 0.4]);
  const exitScaleRaw = useTransform(scrollYProgress, [0, 1], [1, 0.97]);
  const exitOpacity = isDesktop ? exitOpacityRaw : 1;
  const exitScale = isDesktop ? exitScaleRaw : 1;

  const cardVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
  };
  const visualVariants: Variants = {
    hidden: isDesktop ? { opacity: 0, x: -60, scale: 0.96 } : { opacity: 1, x: 0, scale: 1 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.7, ease: EASE } },
  };
  const textVariants: Variants = {
    hidden: isDesktop ? { opacity: 0, x: 24 } : { opacity: 1, x: 0 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
  };

  const animateState = !isDesktop || isInView ? "visible" : "hidden";

  // Interactive chat state
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
        let chartPreview = undefined;
        if (data.type === "price" && data.symbol) {
          const matched = STOCKS.find((s) => s.symbol.toLowerCase() === data.symbol.toLowerCase());
          chartPreview = {
            symbol: data.symbol,
            name: matched?.name || data.symbol,
            price: data.priceUsd ? `$${data.priceUsd.toFixed(2)}` : (matched?.price || "$213.90"),
            change: matched?.change24h || "+2.45%",
            isLive: matched?.isLive ?? true,
          };
        }

        const agentTurn: ChatTurn = {
          id: `agent-${Date.now()}`,
          side: "in",
          text: data.reply,
          time: replyTime,
          receipt: data.receipt,
          chartPreview,
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
    <div ref={wrapperRef} className="relative md:h-[120vh]">
      <section
        id="features"
        className="relative flex items-center overflow-visible bg-[#FFF5F2] px-3 pb-6 md:sticky md:top-0 md:h-screen md:min-h-screen md:overflow-hidden md:px-[72px] md:py-10"
      >
        <motion.div
          ref={cardRef}
          initial="hidden"
          animate={animateState}
          variants={cardVariants}
          style={{ opacity: exitOpacity, scale: exitScale }}
          className="mx-auto w-full max-w-[1296px] origin-top rounded-[24px] bg-white p-4 shadow-sm md:p-6"
        >
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            {/* Visual: Live Phone Mockup */}
            <motion.div
              variants={visualVariants}
              className="relative order-2 flex min-h-[540px] items-center justify-center overflow-hidden rounded-[24px] bg-[#F5F5F5] px-4 py-6 md:order-1 md:min-h-[480px] lg:col-span-6 lg:min-h-[580px] lg:px-6"
            >
              <div className="relative mx-auto w-fit">
                <PhoneFrame className="!w-[300px] sm:!w-[330px] lg:!w-[340px] shadow-2xl">
                  <div className="flex h-full flex-col">
                    <ChatHeader variant="compact" subtitle="Online · X Layer" />
                    <div
                      ref={scrollAreaRef}
                      className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-cover bg-center p-3.5 bg-[url('/whatsapp-bg.png')]"
                      style={{ maxHeight: "420px" }}
                    >
                      {turns.map((turn) => (
                        <div
                          key={turn.id}
                          className={cn("flex flex-col", turn.side === "out" ? "items-end" : "items-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3.5 py-2 text-[12px] leading-snug shadow-sm",
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

                          {turn.chartPreview && (
                            <div className="mt-2 w-[90%] rounded-xl border border-ink-200/80 bg-white p-3 shadow-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-display text-xs font-bold text-ink-900">{turn.chartPreview.symbol}</span>
                                  <span className="text-[10px] text-ink-500">{turn.chartPreview.name}</span>
                                </div>
                                <span className={cn("text-[10px] font-semibold", turn.chartPreview.isLive ? "text-emerald-600" : "text-amber-600")}>
                                  {turn.chartPreview.change}
                                </span>
                              </div>
                              <div className="mt-1 flex items-baseline justify-between">
                                <span className="font-display text-base font-bold text-ink-900">{turn.chartPreview.price}</span>
                                <span className="text-[9px] text-ink-400">X Layer · Chain 196</span>
                              </div>
                              <div className="mt-1.5 h-6 w-full">
                                <svg viewBox="0 0 100 24" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                                  <path
                                    d="M 0 18 Q 20 6, 40 14 T 70 8 T 100 4"
                                    fill="none"
                                    stroke={turn.chartPreview.isLive ? "#FF5B3E" : "#71717A"}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </div>
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
            </motion.div>

            {/* Text & Live Chatbox Control */}
            <motion.div
              variants={textVariants}
              className="order-1 flex flex-col items-start md:order-2 lg:col-span-6"
            >
              <div className="w-full">
                <div className="flex items-center gap-3 md:gap-4">
                  <span className="flex min-h-[34px] min-w-[44px] items-center justify-center rounded-full bg-accent-500 px-4 py-1.5 text-sm font-semibold leading-5 text-white md:text-base">
                    1
                  </span>
                  <h3 className="min-w-0 flex-1 font-display text-xl font-medium leading-7 tracking-[-0.01em] text-ink-900 md:text-2xl md:leading-9 lg:text-[30px] lg:leading-[1.15]">
                    Trade stocks like sending a text
                  </h3>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-ink-700 md:text-lg">
                  Just type what you want to buy or sell. Meirei parses the mandate, grabs the best quote via OKX DEX, and executes on X Layer.
                </p>

                {/* Live Chatbox Console */}
                <div className="mt-6 w-full rounded-2xl border border-ink-200/80 bg-surface-50 p-4 shadow-sm md:p-5">
                  <div className="flex items-center justify-between border-b border-ink-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      <span className="font-display text-sm font-bold text-ink-900">
                        Interactive Live Agent
                      </span>
                    </div>
                    <span className="rounded bg-accent-50 px-2 py-0.5 font-mono text-[10px] font-medium text-accent-700">
                      Chain 196
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs text-ink-600">
                    Click a prompt or type below to test Meirei with live onchain data:
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => sendMessage(sug)}
                        disabled={loading}
                        className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-medium text-ink-700 transition-colors hover:border-accent-500 hover:bg-accent-50 hover:text-accent-700 disabled:opacity-50"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage();
                    }}
                    className="mt-3.5 flex gap-2"
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask Meirei (e.g. How much is my balance?)"
                      disabled={loading}
                      className="flex-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs text-ink-900 outline-none transition-all focus:border-accent-500 focus:ring-1 focus:ring-accent-500 disabled:opacity-50 md:text-sm"
                    />
                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="flex items-center justify-center rounded-xl bg-accent-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-600 active:scale-95 disabled:opacity-50 md:text-sm"
                    >
                      {loading ? "..." : "Send"}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
