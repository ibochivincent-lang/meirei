import Link from "next/link";

export function ResearchSpotlight() {
  return (
    <section id="research-spotlight" className="relative bg-[#FFF5F2] dark:bg-[#14141d] px-3 py-6 md:px-[72px] md:py-8 transition-colors">
      <div className="mx-auto w-full max-w-[1296px]">
        <div className="rounded-[19px] bg-white dark:bg-[#181822] border border-ink-200/70 dark:border-white/10 p-6 sm:p-8 md:p-12 shadow-xs transition-colors">
          <div className="max-w-4xl">
            {/* Research Kicker */}
            <div className="mb-4 flex items-center gap-2">
              <span className="font-mono text-xs font-semibold tracking-wider text-[#C4820A] dark:text-[#E5A83B] uppercase sm:text-sm">
                RESEARCH · MEIREI LABS · SEPTEMBER 2026
              </span>
            </div>

            {/* Headline */}
            <h2 className="font-display text-2xl font-medium leading-[1.12] tracking-[-0.02em] text-ink-900 dark:text-white sm:text-4xl md:text-5xl">
              A deterministic, guardrailed investment mandate architecture for tokenized equities on OKX X Layer.
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-700 dark:text-ink-300 sm:text-lg">
              This paper introduces an autonomous non-custodial rebalancing agent that combines intent-based natural language parsing with transaction-bound HMAC challenge gates and atomic execution via OKX DEX Aggregator on X Layer (chain 196).
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/whitepaper"
                className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-6 py-3 min-h-[44px] text-sm font-semibold text-white shadow-xs transition-all hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100"
              >
                <span>Read Whitepaper</span>
                <span className="text-xs font-bold leading-none">↗</span>
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-full border border-ink-300 bg-white px-6 py-3 min-h-[44px] text-sm font-semibold text-ink-900 shadow-xs transition-all hover:bg-surface-100 hover:border-ink-500 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                <span>Explore Docs</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
