import Link from "next/link";
import { Reveal } from "@/components/interactive/reveal";
import { MaskReveal } from "@/components/interactive/mask-reveal";

export function LiquidityRoutingSection() {
  return (
    <section id="liquidity-routing" className="relative border-b border-surface-200 bg-white py-16 px-6 sm:px-12 md:py-24">
      <div className="mx-auto max-w-[1400px]">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-accent-600 font-bold">
              OKX Ecosystem Integration
            </div>
          </Reveal>
          <MaskReveal
            as="h2"
            text="Liquidity & Execution Routing"
            className="mt-4 justify-center font-display text-3xl font-medium tracking-tight text-ink-950 sm:text-5xl md:text-6xl"
          />
          <Reveal delay={0.15}>
            <p className="mx-auto mt-6 max-w-3xl text-base md:text-xl leading-relaxed text-ink-700">
              Plugged directly into OKX Exchange OS on X Layer (Chain 196), Meirei&apos;s routing engine aggregates decentralized liquidity across all 20 allowlisted tokenized equities and USDG/USDC. By routing multi-leg orders through Exchange OS, Meirei ensures that conversational mandates receive optimal spot execution with deterministic slippage protection.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3 md:mt-16">
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-surface-200 bg-surface-50 p-6 text-left shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 font-mono text-sm font-bold">
                01
              </div>
              <h3 className="mt-4 font-sans text-lg font-semibold text-ink-950">
                Intent-to-Sign Solver
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                The bot structures multi-asset mandate calldata and pushes one-click signing prompts. Private keys remain secure inside the user&apos;s OKX Wallet.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="rounded-2xl border border-accent-300 bg-accent-50/60 p-6 text-left relative overflow-hidden shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-600 text-white font-mono text-sm font-bold shadow-xs">
                02
              </div>
              <h3 className="mt-4 font-sans text-lg font-semibold text-ink-950">
                OKX Exchange OS Aggregator
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Mandates route through Exchange OS decentralized liquidity orderbooks on X Layer to guarantee minimal price impact and spot efficiency.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="rounded-2xl border border-surface-200 bg-surface-50 p-6 text-left shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 font-mono text-sm font-bold">
                03
              </div>
              <h3 className="mt-4 font-sans text-lg font-semibold text-ink-950">
                X Layer Sub-Second Settlement
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Transactions settle on OKX X Layer (Chain ID 196) with Polygon CDK zero-knowledge validity proofs in approximately 3 to 5 seconds.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/whitepaper"
            className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-accent-700 hover:text-accent-800 transition-colors uppercase tracking-wider"
          >
            <span>Read the technical architecture</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
