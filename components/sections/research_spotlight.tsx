import Link from "next/link";

export function ResearchSpotlight() {
  return (
    <section id="research-spotlight" className="relative border-y border-ink-100 bg-[#F6F5EE] py-20 px-6 sm:px-12 md:py-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="max-w-4xl">
          {/* Research Kicker */}
          <div className="mb-4 flex items-center gap-2">
            <span className="font-mono text-xs font-semibold tracking-wider text-[#C4820A] uppercase sm:text-sm">
              RESEARCH · MEIREI LABS · SEPTEMBER 2026
            </span>
          </div>

          {/* Headline */}
          <h2 className="font-display text-3xl font-medium leading-[1.08] tracking-[-0.02em] text-ink-900 sm:text-5xl md:text-6xl">
            A deterministic, guardrailed investment mandate architecture for tokenized equities on OKX X Layer.
          </h2>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-700 sm:text-lg">
            Authored by IboTV. This paper introduces an autonomous non-custodial rebalancing agent that combines intent-based natural language parsing with transaction-bound HMAC challenge gates and atomic execution via OKX DEX Aggregator on X Layer (chain 196).
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/whitepaper"
              className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-6 py-3 min-h-[44px] text-sm font-semibold text-white shadow-xs transition-all hover:bg-ink-800"
            >
              <span>Read Whitepaper</span>
              <span className="text-xs font-bold leading-none">↗</span>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-ink-300 bg-white px-6 py-3 min-h-[44px] text-sm font-semibold text-ink-900 shadow-xs transition-all hover:bg-surface-100 hover:border-ink-500"
            >
              <span>Explore Docs</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
