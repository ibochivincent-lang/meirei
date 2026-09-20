import Link from "next/link";

export function ResearchSpotlight() {
  return (
    <section id="research-spotlight" className="relative border-y border-ink-100 bg-[#F6F5EE] dark:bg-surface-50 dark:border-surface-200 py-20 px-6 sm:px-12 md:py-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="max-w-4xl">
          {/* Research Kicker matching reference */}
          <div className="mb-4 flex items-center gap-2">
            <span className="font-mono text-xs font-semibold tracking-wider text-[#C4820A] dark:text-amber-400 uppercase sm:text-sm">
              RESEARCH · MEIREI LABS · SEPTEMBER 2026
            </span>
          </div>

          {/* Headline matching reference display */}
          <h2 className="font-display text-3xl font-medium leading-[1.08] tracking-[-0.02em] text-ink-900 dark:text-ink-50 sm:text-5xl md:text-6xl">
            A guardrailed, self-evolving investment mandate architecture for tokenized equities on X Layer.
          </h2>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-700 dark:text-ink-300 sm:text-lg">
            Authored by IboTV. This paper introduces an autonomous non-custodial rebalancing agent that combines intent-based natural language parsing with cryptographic 2FA authorization and atomic execution via OKX DEX on X Layer (chain 196).
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/whitepaper"
              className="inline-flex items-center gap-2 rounded-full bg-ink-900 dark:bg-white dark:text-ink-950 px-6 py-3 text-sm font-semibold text-white shadow-xs transition-all hover:bg-ink-800 dark:hover:bg-ink-100"
            >
              <span>Read Whitepaper</span>
              <span className="text-xs font-bold leading-none">↗</span>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-ink-300 dark:border-zinc-700 bg-white dark:bg-[#161B26] px-6 py-3 text-sm font-semibold text-ink-900 dark:text-white shadow-xs transition-all hover:bg-surface-100 dark:hover:bg-[#202736] hover:border-ink-500"
            >
              <span>Explore Docs</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
