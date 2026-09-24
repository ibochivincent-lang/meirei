import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research | Meirei Labs",
  description: "Institutional research publications and algorithmic architecture for X Layer tokenized equities.",
};

const PUBLICATIONS = [
  {
    id: "pub_1",
    date: "SEPTEMBER 2026",
    kicker: "RESEARCH · MEIREI LABS · SEPTEMBER 2026",
    title: "A deterministic, guardrailed investment mandate architecture for tokenized equities on OKX X Layer",
    summary:
      "Formalizing natural language mandate parsing into cap-constrained quadratic portfolio targets with mandatory transaction-bound HMAC challenge gates and atomic DEX execution.",
    author: "Meirei Core Research",
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
    author: "Meirei Core Research",
    tags: ["Liquidity Routing", "Slippage Bounds", "USDG Settlement"],
    href: "/docs",
  },
  {
    id: "pub_3",
    date: "JULY 2026",
    kicker: "SECURITY AUDIT BRIEF · CRYPTOGRAPHIC GUARDS",
    title: "Preventing rogue AI agency via time-decaying HMAC session authorization tokens",
    summary:
      "Architectural teardown of the 2FA challenge barrier that stops prompt-injection state modifications in non-custodial chat environments.",
    author: "Meirei Core Research",
    tags: ["Agent Security", "HMAC-SHA256", "Prompt Defense"],
    href: "/docs",
  },
];

export default function ResearchPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F6F5EE] text-ink-900">
        <div className="border-b border-ink-200/60 pt-28 pb-16 px-6 sm:px-12 md:pt-36 md:pb-20">
          <div className="mx-auto max-w-[1400px]">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4820A]">
              MEIREI CORE LABS
            </span>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink-950 sm:text-6xl">
              Research &amp; Publications
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-ink-700">
              Technical briefs, algorithmic formalisms, and security specifications for autonomous agent execution on OKX X Layer.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-6 py-16 sm:px-12">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {PUBLICATIONS.map((pub) => (
              <article
                key={pub.id}
                className="group flex flex-col justify-between rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs hover:border-ink-400 hover:shadow-sm transition-all"
              >
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#C4820A]">
                    {pub.kicker}
                  </span>
                  <h2 className="mt-3 font-display text-xl font-bold tracking-tight text-ink-950 group-hover:text-accent-600 transition-colors">
                    {pub.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink-700">
                    {pub.summary}
                  </p>
                </div>

                <div className="mt-6 border-t border-ink-100 pt-4">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {pub.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-surface-100 px-2 py-0.5 font-mono text-[10px] text-ink-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={pub.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-900 group-hover:text-accent-500 transition-colors min-h-[44px]"
                  >
                    <span>Read Publication</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
