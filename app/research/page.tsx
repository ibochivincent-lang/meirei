import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research | Meirei Labs",
  description: "Institutional research publications and algorithmic architecture for X Layer tokenized equities by IboTV.",
};

const PUBLICATIONS = [
  {
    id: "pub_1",
    date: "SEPTEMBER 2026",
    kicker: "RESEARCH · MEIREI LABS · SEPTEMBER 2026",
    title: "A guardrailed, self-evolving investment mandate architecture for tokenized equities on X Layer",
    summary:
      "Formalizing natural language mandate parsing into convex portfolio targets with mandatory cryptographic 2FA verification gates and atomic DEX execution.",
    author: "IboTV",
    tags: ["X Layer", "RWA Equities", "2FA Security", "OKX Onchain OS"],
    href: "/whitepaper",
  },
  {
    id: "pub_2",
    date: "AUGUST 2026",
    kicker: "TECHNICAL BRIEF · OKX DEX ON X LAYER",
    title: "Slippage minimization and concentrated liquidity dynamics in xStock secondary pools",
    summary:
      "Analyzing market impact, routing depth, and price discovery across synthetic equity pools settling in USDG and USDC.",
    author: "IboTV",
    tags: ["Liquidity Routing", "Slippage Bounds", "USDG Settlement"],
    href: "/docs/internals",
  },
  {
    id: "pub_3",
    date: "JULY 2026",
    kicker: "SECURITY AUDIT BRIEF · ZERO KNOWLEDGE GUARDS",
    title: "Preventing rogue AI agency via time-decaying HMAC session authorization tokens",
    summary:
      "Architectural teardown of the 2FA challenge barrier that stops prompt-injection state modifications in custodial and non-custodial chat environments.",
    author: "IboTV",
    tags: ["Agent Security", "HMAC-SHA256", "Prompt Defense"],
    href: "/docs",
  },
];

export default function ResearchPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F6F5EE] dark:bg-surface-50 text-ink-900 dark:text-ink-100">
        <div className="border-b border-ink-200/60 dark:border-surface-200 pt-28 pb-16 px-6 sm:px-12 md:pt-36 md:pb-20">
          <div className="mx-auto max-w-[1400px]">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4820A] dark:text-amber-400">
              MEIREI CORE LABS
            </span>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink-950 dark:text-ink-50 sm:text-6xl">
              Research & Publications
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-ink-700 dark:text-ink-300">
              Foundational research papers, mathematical specifications, and security audits published by IboTV and the Meirei architecture team.
            </p>
          </div>
        </div>

        <section className="mx-auto max-w-[1400px] px-6 py-16 sm:px-12">
          <div className="space-y-12">
            {PUBLICATIONS.map((pub) => (
              <article
                key={pub.id}
                className="group rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 shadow-xs transition-all hover:border-ink-400 dark:hover:border-surface-300 hover:shadow-sm sm:p-8"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="space-y-3">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#C4820A] dark:text-amber-400">
                      {pub.kicker}
                    </span>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950 dark:text-ink-50 group-hover:text-accent-600 transition-colors sm:text-3xl">
                      <Link href={pub.href}>{pub.title}</Link>
                    </h2>
                    <p className="max-w-3xl text-base text-ink-700 dark:text-ink-300 leading-relaxed">
                      {pub.summary}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {pub.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-surface-100 dark:bg-surface-200 px-3 py-1 font-mono text-xs font-semibold text-ink-700 dark:text-ink-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-4 shrink-0 md:items-end">
                    <div className="text-right">
                      <span className="block text-xs uppercase font-mono text-ink-400">Author</span>
                      <span className="font-semibold text-ink-900 dark:text-ink-100">{pub.author}</span>
                    </div>
                    <Link
                      href={pub.href}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink-900 dark:border-ink-200 px-4 py-2 text-xs font-semibold text-ink-900 dark:text-ink-100 transition-all hover:bg-ink-900 hover:text-white dark:hover:bg-white dark:hover:text-ink-950"
                    >
                      <span>Read Paper</span>
                      <span className="text-xs font-bold leading-none">↗</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
