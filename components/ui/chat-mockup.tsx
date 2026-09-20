import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import logo from "@/public/logo.svg";

/**
 * Shared WhatsApp chat-mockup building blocks — the header chrome, message
 * area, bubbles, and receipt card used across the hero's looping chat, the
 * four "how it works" illustrations, and the use-cases phone. Consolidated
 * here so a fix (e.g. the currency-font rule) only has to happen once
 * instead of being reapplied in three near-identical implementations.
 */

/** Which chat app the mockup is dressed as — WhatsApp's dark header and
 *  green sent-bubble tint, or Telegram's light header and blue gradient
 *  bubble. Everything else (bezel, status bar, receipt card) is shared
 *  chrome, since that's the phone, not the app. */
export type Channel = "whatsapp" | "telegram" | "instagram";

interface ChatHeaderProps {
  /** "full" shows back-arrow + video/voice buttons (hero, feature illustrations).
   *  "compact" shows just avatar + name + status (use-cases phone). */
  variant?: "full" | "compact";
  /** Subtitle under "meirei" — defaults to "Online", but use-cases swaps in
   *  the active persona label (e.g. "Freelancers"). */
  subtitle?: string;
  channel?: Channel;
}

export function ChatHeader({ variant = "full", subtitle = "Online", channel = "whatsapp" }: ChatHeaderProps) {
  const isTelegram = channel === "telegram";
  const isInstagram = channel === "instagram";

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 pb-2.5 pt-12",
        isInstagram
          ? "border-b border-ink-100 dark:border-ink-800 bg-white dark:bg-[#121212] text-ink-900 dark:text-white"
          : isTelegram
          ? "border-b border-ink-200/60 dark:border-ink-800 bg-white dark:bg-[#17212b] text-ink-900 dark:text-white"
          : "bg-[#1F2C34] text-white",
      )}
    >
      {variant === "full" && (
        <button
          type="button"
          aria-label="Back"
          className="flex items-center gap-0.5"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path
              d="M14 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span className="text-[13px] font-medium">1</span>
        </button>
      )}

      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white",
          isTelegram && "ring-1 ring-ink-200 dark:ring-ink-700",
        )}
      >
        <Image src={logo} alt="meirei" width={20} height={20} />
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-1.5">
          <p className="text-[14px] font-semibold">meirei</p>
          <span className="rounded bg-accent-500/20 px-1 py-0.5 text-[9px] font-medium text-accent-300">命令</span>
          {variant === "full" && !isTelegram && (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0">
              <circle cx="12" cy="12" r="10" fill="#22C55E" />
              <path
                d="M8 12.2l2.6 2.6 5-5"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          )}
          {variant === "compact" && (
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
          )}
        </div>
        <p className={cn("text-[10px]", isTelegram ? "text-[#3390EC] font-medium" : "text-white/60")}>
          {subtitle}
        </p>
      </div>

      {variant === "full" && (
        <>
          <button
            type="button"
            aria-label="Video call"
            className="grid h-9 w-9 shrink-0 place-items-center"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <rect
                x="2"
                y="6"
                width="14"
                height="12"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <path d="M22 7v10l-6-4v-2l6-4z" fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Voice call"
            className="grid h-9 w-9 shrink-0 place-items-center"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

interface ChatScreenProps {
  children: ReactNode;
  variant?: "full" | "compact";
  subtitle?: string;
  channel?: Channel;
  /** "justify-end" (default) bottom-anchors short scripted threads;
   *  feature illustrations that fill the frame from the top use "justify-start". */
  align?: "start" | "end";
}

export function ChatScreen({
  children,
  variant = "full",
  subtitle,
  channel = "whatsapp",
  align = "start",
}: ChatScreenProps) {
  const isTelegram = channel === "telegram";
  const isInstagram = channel === "instagram";
  return (
    <div className="flex h-full flex-col">
      <ChatHeader variant={variant} subtitle={subtitle} channel={channel} />
      <div
        className={cn(
          "flex flex-1 flex-col gap-2 overflow-hidden bg-cover bg-center p-3",
          !isTelegram && !isInstagram && "bg-[url('/whatsapp-bg.png')] dark:bg-none dark:bg-[#0b141a]",
          isInstagram && "bg-[#FAFAFA] dark:bg-black",
          isTelegram && "bg-[#DCEAF5] dark:bg-[#0e1621] [background-image:radial-gradient(rgba(51,144,236,0.14)_1px,transparent_1px)] dark:[background-image:radial-gradient(rgba(51,144,236,0.18)_1px,transparent_1px)] [background-size:14px_14px]",
          align === "end" && "justify-end",
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface BubbleProps {
  side: "in" | "out";
  time: string;
  channel?: Channel;
  children: ReactNode;
}

/** Plain, non-animated bubble — used by the static feature illustrations. */
export function StaticBubble({ side, time, channel = "whatsapp", children }: BubbleProps) {
  const isOut = side === "out";
  const isTelegram = channel === "telegram";
  const isInstagram = channel === "instagram";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 text-[12px] leading-snug",
          isOut
            ? cn(
                "rounded-br-md text-white",
                isInstagram
                  ? "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040]"
                  : isTelegram
                  ? "bg-gradient-to-br from-[#5cb2f3] to-[#2AABEE]"
                  : "bg-accent-500",
              )
            : cn(
                "rounded-bl-md",
                isInstagram
                  ? "bg-[#EFEFEF] dark:bg-[#262626] text-ink-900 dark:text-white"
                  : isTelegram
                  ? "bg-white dark:bg-[#182533] text-ink-900 dark:text-white"
                  : "bg-white dark:bg-[#1f2c34] text-ink-900 dark:text-white",
              ),
        )}
      >
        <div>{children}</div>
        <div
          className={`mt-0.5 text-right text-[9px] ${
            isOut ? "text-white/60" : "text-ink-400 dark:text-ink-300"
          }`}
        >
          {time}
        </div>
      </div>
    </div>
  );
}

/**
 * Same visual markup as `StaticBubble`, `motion.div`-wrapped so the hero's
 * scripted auto-play thread can animate turns in/out. The caller
 * (`LiveChatThread`) still owns all timing/sequencing — this only shares
 * the bubble's inner JSX, not the orchestration.
 */
export function AnimatedBubble({
  side,
  time,
  channel = "whatsapp",
  children,
  ...motionProps
}: BubbleProps & HTMLMotionProps<"div">) {
  const isOut = side === "out";
  const isTelegram = channel === "telegram";
  const isInstagram = channel === "instagram";
  return (
    <motion.div
      {...motionProps}
      className={`flex ${isOut ? "justify-end" : "justify-start"}`}
    >
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 text-[12px] leading-snug",
          isOut
            ? cn(
                "rounded-br-md text-white",
                isInstagram
                  ? "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040]"
                  : isTelegram
                  ? "bg-gradient-to-br from-[#5cb2f3] to-[#2AABEE]"
                  : "bg-accent-500",
              )
            : cn(
                "rounded-bl-md",
                isInstagram
                  ? "bg-[#EFEFEF] dark:bg-[#262626] text-ink-900 dark:text-white"
                  : isTelegram
                  ? "bg-white dark:bg-[#182533] text-ink-900 dark:text-white"
                  : "bg-white dark:bg-[#1f2c34] text-ink-900 dark:text-white",
              ),
        )}
      >
        <div>{children}</div>
        <div
          className={`mt-0.5 text-right text-[9px] ${
            isOut ? "text-white/60" : "text-ink-400 dark:text-ink-300"
          }`}
        >
          {time}
        </div>
      </div>
    </motion.div>
  );
}

interface ReceiptCardProps {
  /** Eyebrow label, e.g. "Cashed out", "Received", "Paid". */
  status: string;
  statusTone: "confirmed" | "received" | "new";
  /** Full amount string including the currency symbol, e.g. "$250 USDG". */
  amount: string;
  /** Secondary line, e.g. "Swapped 250 USDG on X Layer" or "AAPLx yield". */
  detail: string;
  reference?: string;
  time?: string;
  className?: string;
}

const STATUS_BADGE: Record<ReceiptCardProps["statusTone"], { label: string; className: string }> = {
  confirmed: { label: " Confirmed", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
  received: { label: "Confirmed", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
  new: { label: " New", className: "bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-300" },
};

/**
 * The single source of truth for every "receipt" card shown inside a chat
 * mockup. Amount ALWAYS renders as `font-sans font-semibold tabular-nums`.
 */
export function ReceiptCard({
  status,
  statusTone,
  amount,
  detail,
  reference,
  time,
  className,
}: ReceiptCardProps) {
  const badge = STATUS_BADGE[statusTone];
  const statusColor = statusTone === "new" ? "text-accent-600 dark:text-accent-400" : "text-ink-500 dark:text-ink-300";

  return (
    <div
      className={cn(
        "w-[82%] rounded-2xl rounded-bl-md bg-white dark:bg-[#1f2c34] p-3 shadow-sm ring-1 ring-ink-200/40 dark:ring-ink-700/60",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] font-medium uppercase tracking-wider", statusColor)}>
          {status}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-medium", badge.className)}>
          {badge.label}
        </span>
      </div>
      <p className="mt-1.5 font-sans text-2xl font-semibold leading-none tabular-nums text-ink-900 dark:text-white">
        {amount}
      </p>
      <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-300">{detail}</p>
      {(reference || time) && (
        <p className="mt-2 font-mono text-[9px] text-ink-300 dark:text-ink-400">
          {reference}
          {reference && time ? " · " : ""}
          {time}
        </p>
      )}
    </div>
  );
}
