import Link from "next/link";
import { Reveal } from "@/components/interactive/reveal";
import { MaskReveal } from "@/components/interactive/mask-reveal";

export function LiquidityRoutingSection() {
  return (
    <section id="liquidity-routing" className="relative border-b border-surface-200 dark:border-zinc-800 bg-white dark:bg-[#0B0E14] py-16 px-6 sm:px-12 md:py-24">
      <div className="mx-auto max-w-[1400px]">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-accent-500">
              OKX Ecosystem Integration
            </div>
          </Reveal>
          <MaskReveal
            as="h2"
            text="Liquidity & Execution Routing"
            className="mt-4 justify-center font-display text-3xl font-medium tracking-tight text-ink-900 dark:text-zinc-50 sm:text-5xl md:text-6xl"
          />
          <Reveal delay={0.15}>
            <p className="mx-auto mt-6 max-w-3xl text-base md:text-xl leading-relaxed text-ink-700 dark:text-zinc-300">
              While currently operating with synthetic mock assets for the hackathon, Meirei&apos;s routing engine is architecturally designed to plug directly into OKX Exchange OS on X Layer. By aggregating decentralized liquidity via Exchange OS, Meirei ensures that bot-driven mandates receive optimal spot execution with minimal slippage.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3 md:mt-16">
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-[#11141D] p-6 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 font-mono text-sm font-bold">
                01
              </div>
              <h3 className="mt-4 font-sans text-lg font-semibold text-ink-900 dark:text-white">
                Intent-to-Sign Solver
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-zinc-400">
                The bot structures multi-asset mandate calldata and pushes one-click signing prompts. Private keys remain secure inside the user&apos;s OKX Wallet.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="rounded-2xl border border-accent-500/30 dark:border-accent-500/20 bg-accent-50/50 dark:bg-accent-500/[0.04] p-6 text-left relative overflow-hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500 text-white font-mono text-sm font-bold shadow-xs">
                02
              </div>
              <h3 className="mt-4 font-sans text-lg font-semibold text-ink-900 dark:text-white">
                OKX Exchange OS Aggregator
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-zinc-400">
                Mandates route through Exchange OS decentralized liquidity orderbooks on X Layer to guarantee minimal price impact and spot efficiency.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="rounded-2xl border border-surface-200 dark:border-zinc-800 bg-surface-50 dark:bg-[#11141D] p-6 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-mono text-sm font-bold">
                03
              </div>
              <h3 className="mt-4 font-sans text-lg font-semibold text-ink-900 dark:text-white">
                X Layer Sub-Second Settlement
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-zinc-400">
                Transactions settle on OKX X Layer (Chain ID 196) with Polygon CDK zero-knowledge validity proofs in approximately 3 to 5 seconds.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/whitepaper"
            className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-accent-500 hover:text-accent-600 transition-colors uppercase tracking-wider"
          >
            <span>Read the technical architecture</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
