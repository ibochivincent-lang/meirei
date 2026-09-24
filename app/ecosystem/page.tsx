import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import { Metadata } from "next";
import { ALLOWLIST } from "@/src/allowlist";

export const metadata: Metadata = {
  title: "Ecosystem | Meirei on X Layer",
  description: "Explore the X Layer ecosystem, OKX Onchain OS infrastructure, USDG liquidity pools, and tokenized equities.",
};

const ECOSYSTEM_PARTNERS = [
  {
    name: "X Layer (Chain 196)",
    role: "Zero-Knowledge Settlement Layer",
    description: "High-throughput EVM-compatible ZK rollup secured by Ethereum and powered by Polygon CDK. Sub-3s transaction finality with sub-cent gas fees.",
    link: "https://www.okx.com/xlayer",
  },
  {
    name: "OKX Onchain OS",
    role: "Agent Execution Infrastructure",
    description: "Core developer OS connecting autonomous AI agents to decentralized exchange routing, limit orders, wallet telemetry, and real-time market feeds.",
    link: "https://www.okx.com/web3",
  },
  {
    name: "OKX DEX Aggregator",
    role: "Smart Order Routing",
    description: "Multi-pool routing algorithm that calculates optimal split swaps across all automated market maker pools on X Layer to minimize price impact.",
    link: "https://www.okx.com/web3/dex",
  },
  {
    name: "USDG Global Dollar",
    role: "Base Settlement Stablecoin",
    description: "Compliant, fully-backed institutional stablecoin providing seamless 1:1 fiat redemption and serving as the primary quote currency for all xStocks.",
    link: "https://www.okx.com/web3/explorer/xlayer",
  },
];

export default function EcosystemPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F6F5EE] text-ink-900">
        <div className="border-b border-ink-200/60 pt-28 pb-14 px-6 sm:px-12 md:pt-36 md:pb-16">
          <div className="mx-auto max-w-[1400px]">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4820A]">
              X LAYER PROTOCOL INFRASTRUCTURE
            </span>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
              Meirei Ecosystem
            </h1>
            <p className="mt-3 max-w-2xl text-base text-ink-700 sm:text-lg">
              Meirei operates natively within the OKX Onchain OS and X Layer infrastructure, bridging traditional equity exposure with decentralized finance liquidity.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-6 py-14 sm:px-12">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {ECOSYSTEM_PARTNERS.map((partner) => (
              <div
                key={partner.name}
                className="rounded-2xl border border-ink-200 bg-white p-6 shadow-xs sm:p-8 flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent-700">
                    {partner.role}
                  </span>
                  <h2 className="font-display text-2xl font-bold text-ink-950 mt-1">
                    {partner.name}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink-700">
                    {partner.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-ink-100 flex items-center justify-between">
                  <a
                    href={partner.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-ink-900 hover:text-accent-600 transition-colors"
                  >
                    <span>View Network Resource</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Allowlisted Asset Bridge Section */}
          <div className="mt-12 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-2xl font-bold text-ink-950">
                Allowlisted Tokenized Stocks (xStocks) &amp; Stablecoins
              </h2>
              <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-100 text-ink-700">
                22 Verified Assets
              </span>
            </div>
            <p className="text-sm text-ink-700 leading-relaxed mb-6">
              All tokenized equities on X Layer maintain verifiable proof of reserve and trade 24/7 without centralized market halts:
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 font-mono text-xs">
              {ALLOWLIST.map((token) => (
                <div key={token.symbol} className="rounded-xl border border-ink-200 bg-surface-50 p-3 hover:border-accent-400 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink-900 block">{token.symbol}</span>
                    <span className="text-[10px] text-ink-400">{token.decimals}d</span>
                  </div>
                  <span className="text-ink-600 text-[11px] truncate block mt-0.5">{token.name}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-ink-500 font-mono">Chain ID: 196 · Finality: 3.2s</span>
              <Link
                href="/app"
                className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-ink-800"
              >
                <span>Trade on X Layer</span>
                <span className="text-xs font-bold leading-none">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
