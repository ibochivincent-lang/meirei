"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Reveal } from "@/components/interactive/reveal";
import { MaskReveal } from "@/components/interactive/mask-reveal";
import { PhoneFrame } from "@/components/ui/phone-frame";
import { ChatScreen, StaticBubble } from "@/components/ui/chat-mockup";
import { EASE } from "@/lib/animation/variants";
import { cn } from "@/lib/utils/cn";

interface UseCase {
  id: string;
  label: string;
  amount: string;
  sentLabel: string;
  photos: [PhotoCard, PhotoCard];
  messages: Message[];
}

interface PhotoCard {
  title: string;
  subtitle: string;
  src: string;
  placement: string;
  objectPosition?: string;
}

interface Message {
  side: "in" | "out";
  text: string;
  time: string;
  receipt?: {
    status: string;
    amount: string;
    detail: string;
  };
}

const USE_CASES: UseCase[] = [
  {
    id: "monthly_dca",
    label: "Monthly Savings",
    amount: "$50 USDG",
    sentLabel: "monthly DCA [Illustrative]",
    photos: [
      {
        title: "Campus life",
        subtitle: "Starting early",
        src: "/Images/Freelancer 1.png",
        placement: "left-0 top-[330px] h-[250px] w-[246px] lg:left-[5%] lg:top-[330px] lg:h-[321px] lg:w-[307px]",
        objectPosition: "object-center",
      },
      {
        title: "Study desk",
        subtitle: "Auto invest active",
        src: "/Images/Freelancer 2.png",
        placement: "right-2 top-20 h-[230px] w-[220px] lg:right-[7%] lg:top-0 lg:h-[321px] lg:w-[307px]",
        objectPosition: "object-center",
      },
    ],
    messages: [
      { side: "out", text: "Put $50 into AAPLx every month", time: "10:14" },
      { side: "in", text: "Recurring mandate configured: $50 USDG into AAPLx on X Layer on the 1st of each month. Start now?", time: "10:14" },
      { side: "out", text: "yes", time: "10:15" },
      {
        side: "in",
        text: "First trade simulated via OKX DEX on X Layer.",
        time: "10:15",
        receipt: {
          status: "DCA Executed [Simulated]",
          amount: "+ 0.150 AAPLx",
          detail: "Swapped $50.00 USDG",
        },
      },
    ],
  },
  {
    id: "inflation_shield",
    label: "Inflation Shield",
    amount: "$500 USDG",
    sentLabel: "dollar hedge [Illustrative]",
    photos: [
      {
        title: "Family home",
        subtitle: "Dollar savings",
        src: "/Images/families 1.jpg",
        placement: "left-3 top-20 h-[240px] w-[228px] lg:left-[12%] lg:top-[52px] lg:h-[321px] lg:w-[307px]",
        objectPosition: "object-center",
      },
      {
        title: "Weekend plan",
        subtitle: "Portfolio balanced",
        src: "/Images/families 2.jpg",
        placement: "right-0 top-[380px] h-[240px] w-[228px] lg:right-[8%] lg:top-[332px] lg:h-[310px] lg:w-[300px]",
        objectPosition: "object-center",
      },
    ],
    messages: [
      { side: "out", text: "Hedge local inflation: $250 USDG cash reserve and $250 into SPYx ETF", time: "08:31" },
      { side: "in", text: "Mandate parsed: 50% USDG stable reserve, 50% SPYx S&P 500 ETF. Total: $500 USDG. Confirm?", time: "08:31" },
      { side: "out", text: "confirm", time: "08:32" },
      {
        side: "in",
        text: "Portfolio updated on X Layer.",
        time: "08:32",
        receipt: {
          status: "Mandate Settled [Simulated]",
          amount: "$500.00 USDG",
          detail: "Reserve + SPYx ETF",
        },
      },
    ],
  },
  {
    id: "tech_leaders",
    label: "Tech Growth",
    amount: "$150 USDG",
    sentLabel: "blue-chip equities [Illustrative]",
    photos: [
      {
        title: "Coffee shop",
        subtitle: "Zero minimums",
        src: "/Images/small business owner 1.jpg",
        placement: "right-4 top-12 h-[240px] w-[230px] lg:right-[13%] lg:top-[18px] lg:h-[321px] lg:w-[307px]",
        objectPosition: "object-center",
      },
      {
        title: "Workspace",
        subtitle: "Global equities",
        src: "/Images/small business owner 2.jpg",
        placement: "left-0 top-[392px] h-[240px] w-[230px] lg:left-[6%] lg:top-[360px] lg:h-[310px] lg:w-[300px]",
        objectPosition: "object-center",
      },
    ],
    messages: [
      { side: "out", text: "Buy $50 each of Nvidia, Microsoft, and Google", time: "15:26" },
      { side: "in", text: "Allocating $150 USDG across NVDAx, MSFTx, and GOOGLx. Max slippage 0.50%. Ready to sign in wallet?", time: "15:26" },
      { side: "out", text: "ready", time: "15:27" },
      {
        side: "in",
        text: "Non-custodial signature approved on X Layer.",
        time: "15:27",
        receipt: {
          status: "Trade Executed [Simulated]",
          amount: "+ NVDAx, MSFTx, GOOGLx",
          detail: "Swapped $150.00 USDG",
        },
      },
    ],
  },
  {
    id: "micro_mandate",
    label: "Weekly Habit",
    amount: "$25 USDG",
    sentLabel: "weekly fractional [Illustrative]",
    photos: [
      {
        title: "Market desk",
        subtitle: "Recurring discipline",
        src: "/Images/Trader 1.jpg",
        placement: "left-2 top-20 h-[240px] w-[228px] lg:left-[10%] lg:top-[60px] lg:h-[321px] lg:w-[307px]",
        objectPosition: "object-center",
      },
      {
        title: "Screen view",
        subtitle: "Nasdaq-100 target",
        src: "/Images/Trader 2.jpg",
        placement: "right-2 top-[370px] h-[240px] w-[228px] lg:right-[7%] lg:top-[320px] lg:h-[310px] lg:w-[300px]",
        objectPosition: "object-center",
      },
    ],
    messages: [
      { side: "out", text: "Invest $25 into QQQx every Friday", time: "16:40" },
      { side: "in", text: "Weekly micro-mandate enabled: $25 USDG into Invesco QQQx every Friday at 16:00 UTC. Confirm schedule?", time: "16:40" },
      { side: "out", text: "confirm schedule", time: "16:41" },
      {
        side: "in",
        text: "Micro-mandate registered on X Layer.",
        time: "16:41",
        receipt: {
          status: "Schedule Active [Simulated]",
          amount: "$25.00 USDG / week",
          detail: "QQQx Tokenized ETF",
        },
      },
    ],
  },
  {
    id: "algorithmic_rebalance",
    label: "Dynamic Sleeve",
    amount: "$15,000 USDG",
    sentLabel: "cap-constrained mandate [Illustrative]",
    photos: [
      {
        title: "Trading workspace",
        subtitle: "Algorithmic rules",
        src: "/Images/nightout.jpg",
        placement: "right-0 top-[330px] h-[250px] w-[246px] lg:right-[4%] lg:top-[342px] lg:h-[321px] lg:w-[307px]",
        objectPosition: "object-center",
      },
      {
        title: "Terminal setup",
        subtitle: "Sub second execution",
        src: "/Images/nightout 1.jpg",
        placement: "left-2 top-16 h-[230px] w-[220px] lg:left-[8%] lg:top-4 lg:h-[300px] lg:w-[286px]",
        objectPosition: "object-center",
      },
    ],
    messages: [
      { side: "out", text: "60% mag7, 20% USDG, max single 8%", time: "21:08" },
      { side: "in", text: "Calculated 7 swap legs to rebalance drift. Max single bounded at 8%, excess absorbed by USDG cash sleeve. Proceed?", time: "21:08" },
      { side: "out", text: "confirm and execute", time: "21:09" },
      {
        side: "in",
        text: "All 7 legs executed via OKX DEX Aggregator on X Layer.",
        time: "21:09",
        receipt: {
          status: "Mandate Completed",
          amount: "$15,000.00 USDG",
          detail: "7 xStock legs executed",
        },
      },
    ],
  },
];

export function UseCasesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeCase = USE_CASES[activeIndex];

  useEffect(() => {
    const timeout = setTimeout(() => {
      setActiveIndex((current) => (current + 1) % USE_CASES.length);
    }, 15_000);

    return () => clearTimeout(timeout);
  }, [activeIndex]);

  return (
    <section id="use-cases" className="relative overflow-hidden bg-white dark:bg-surface-0 px-3 py-16 sm:px-[72px] md:py-24">
      <div className="mx-auto max-w-[1296px]">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center">
            <MaskReveal
              as="h2"
              text="Move money directly from chat"
              accent="from chat"
              className="justify-center font-display text-[32px] md:text-[52px] lg:text-[60px] font-medium leading-[1.04] tracking-[-0.02em] text-black dark:text-ink-50"
            />
            <Reveal delay={0.15}>
              <p className="mt-4 text-base leading-relaxed text-ink-700 dark:text-ink-300 md:text-xl">
                How Meirei becomes part of everyday life
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-2 max-w-xl text-sm text-ink-500 dark:text-ink-400 md:text-base">
                Dollar-denominated equity investing by message. Built for individuals and savers in high-inflation markets seeking global purchasing power through simple conversational mandates.
              </p>
              <div className="mt-4 max-w-2xl rounded-2xl border border-accent-500/20 dark:border-accent-700/40 bg-accent-50/60 dark:bg-accent-950/30 p-4 text-xs leading-relaxed text-ink-800 dark:text-accent-200 md:text-sm shadow-xs">
                Turn your messaging app into a global wealth preservation vehicle. Save in dollar stablecoins (USDG) and acquire fractional US blue-chip equities with plain text commands like &ldquo;$50 into AAPLx monthly&rdquo; on OKX X Layer.
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.25}>
            <div
              className="flex w-full max-w-full flex-wrap content-start items-start gap-1.5 rounded-2xl bg-[#F5F5F5] dark:bg-surface-100 p-2 md:w-auto md:flex-nowrap md:overflow-x-auto"
              role="tablist"
              aria-label="Use case examples"
            >
              {USE_CASES.map((useCase, index) => {
                const isActive = index === activeIndex;

                return (
                  <button
                    key={useCase.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`use-case-panel-${useCase.id}`}
                    className={cn(
                      "relative shrink-0 rounded-xl px-4 py-2.5 text-sm leading-5 transition-colors md:px-5 md:py-3 md:text-lg font-medium",
                      isActive ? "text-black dark:text-ink-50" : "text-ink-500 hover:text-black dark:text-ink-400 dark:hover:text-ink-50",
                    )}
                    onClick={() => setActiveIndex(index)}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="usecase-tab"
                        className="absolute inset-0 -z-10 rounded-xl bg-white dark:bg-surface-200 shadow-soft"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                    {useCase.label}
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div
            id={`use-case-panel-${activeCase.id}`}
            role="tabpanel"
            className="relative mt-8 min-h-[760px] sm:mt-12 lg:min-h-[700px]"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCase.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="absolute inset-0 flex items-center justify-center py-[60px]"
              >
                {activeCase.photos.map((photo, index) => (
                  <PersonaPhoto
                    key={`${activeCase.id}-${photo.title}`}
                    photo={photo}
                    index={index}
                  />
                ))}

                <div className="relative z-10">
                  <PhoneFrame className="!w-[280px] sm:!w-[303px] lg:!w-[330px] max-w-full">
                    <ChatSurface useCase={activeCase} />
                  </PhoneFrame>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PersonaPhoto({ photo, index }: { photo: PhotoCard; index: number }) {
  const mobilePlacement =
    index === 0
      ? "left-2 bottom-4 h-[110px] w-[105px] sm:left-4 sm:bottom-6 sm:h-[126px] sm:w-[120px]"
      : "right-2 top-2 h-[110px] w-[105px] sm:right-4 sm:top-4 sm:h-[124px] sm:w-[118px]";
  const desktopPlacement =
    index === 0
      ? "lg:left-[14px] lg:top-[383px] lg:bottom-auto lg:h-[321px] lg:w-[307px]"
      : "lg:left-[959px] lg:right-auto lg:top-0 lg:h-[321px] lg:w-[307px]";

  return (
    <div
      className={cn(
        "absolute z-20 rounded-[6px] bg-[#F5F5F5] dark:bg-surface-100 p-[3px] shadow-soft transition-all duration-700 md:z-0 md:rounded-2xl md:p-2",
        mobilePlacement,
        desktopPlacement,
      )}
      aria-label={`${photo.title}: ${photo.subtitle}`}
      role="img"
    >
      <div className="relative h-full w-full overflow-hidden rounded-[5px] bg-[#F5F5F5] dark:bg-surface-200 md:rounded-xl">
        <Image
          src={photo.src}
          alt={`${photo.title} - ${photo.subtitle}`}
          fill
          sizes="(min-width: 1024px) 307px, (min-width: 768px) 246px, 120px"
          className={cn("object-cover", photo.objectPosition)}
        />
        <div className="absolute inset-x-4 bottom-4 hidden rounded-lg bg-white dark:bg-[#11141D] border border-ink-200 dark:border-zinc-800 p-3 shadow-md md:block">
          <p className="text-sm font-medium leading-5 text-black dark:text-ink-50">{photo.title}</p>
          <p className="text-xs leading-4 text-ink-500 dark:text-ink-400">{photo.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function ChatSurface({ useCase }: { useCase: UseCase }) {
  return (
    <ChatScreen variant="compact" subtitle={useCase.label} align="end">
      {useCase.messages.map((message) => (
        <ChatMessage key={`${useCase.id}-${message.time}-${message.text}`} message={message} />
      ))}
    </ChatScreen>
  );
}

function ChatMessage({ message }: { message: Message }) {
  return (
    <StaticBubble side={message.side === "out" ? "out" : "in"} time={message.time}>
      <p>{message.text}</p>
      {message.receipt && (
        <div className="mt-2 rounded-xl bg-[#F5F5F5] dark:bg-[#182533] p-2.5 text-ink-900 dark:text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] font-medium uppercase tracking-wider text-ink-500 dark:text-ink-300">
              {message.receipt.status}
            </span>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[8px] font-medium text-emerald-700 dark:text-emerald-300">
              Confirmed
            </span>
          </div>
          <p className="mt-1 font-sans text-xl font-semibold leading-none tabular-nums text-black dark:text-white">
            {message.receipt.amount}
          </p>
          <p className="mt-1 text-[10px] text-ink-500 dark:text-ink-300">
            {message.receipt.detail}
          </p>
        </div>
      )}
    </StaticBubble>
  );
}
