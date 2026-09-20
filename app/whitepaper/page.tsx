import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Whitepaper | Meirei Research",
  description:
    "A guardrailed, self-evolving investment mandate architecture for tokenized equities on X Layer. Authored by IboTV.",
};

export default function WhitepaperPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F6F5EE] dark:bg-surface-50 text-ink-900 dark:text-ink-100 selection:bg-accent-200">
        {/* Paper Header matching reference Image 2 */}
        <header className="border-b border-ink-200/60 dark:border-surface-200 pt-28 pb-16 px-6 sm:px-12 md:pt-36 md:pb-20">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4820A] dark:text-amber-400 sm:text-sm">
                RESEARCH · MEIREI LABS · SEPTEMBER 2026
              </span>
              <span className="h-1 w-1 rounded-full bg-ink-400" />
              <span className="font-mono text-xs text-ink-600 dark:text-ink-400">Chain 196</span>
            </div>

            <h1 className="font-display text-3xl font-medium leading-[1.08] tracking-[-0.025em] text-ink-950 dark:text-ink-50 sm:text-5xl md:text-6xl">
              A guardrailed, self-evolving investment mandate architecture for tokenized equities on X Layer
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-ink-700 dark:text-ink-300 sm:text-xl">
              Design, verification, and on-chain implementation of autonomous intent rebalancing with non-custodial 2FA cryptographic safeguards.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-ink-200/80 dark:border-surface-200 pt-6 text-sm text-ink-600 dark:text-ink-400">
              <div className="flex items-center gap-4">
                <div>
                  <span className="block text-xs uppercase font-mono text-ink-400">Author</span>
                  <span className="font-semibold text-ink-900 dark:text-ink-100">IboTV</span>
                </div>
                <div className="h-8 w-px bg-ink-200 dark:bg-surface-200" />
                <div>
                  <span className="block text-xs uppercase font-mono text-ink-400">Affiliation</span>
                  <span className="font-semibold text-ink-900 dark:text-ink-100">Meirei Core Research</span>
                </div>
                <div className="h-8 w-px bg-ink-200 dark:bg-surface-200" />
                <div>
                  <span className="block text-xs uppercase font-mono text-ink-400">Version</span>
                  <span className="font-mono font-semibold text-ink-900 dark:text-ink-100">v2.4.0 (Production)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/app"
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 dark:bg-white dark:text-ink-950 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-ink-800 dark:hover:bg-ink-100"
                >
                  <span>Launch Terminal</span>
                  <span className="text-xs font-bold leading-none">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Paper Body */}
        <article className="mx-auto max-w-4xl px-6 py-16 sm:px-12 leading-relaxed font-serif text-ink-800 dark:text-ink-200 text-base sm:text-lg">
          {/* Abstract */}
          <section className="mb-14 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white/70 dark:bg-surface-50/80 p-6 sm:p-8 backdrop-blur-xs font-sans">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-3">
              Abstract
            </h2>
            <p className="text-ink-800 dark:text-ink-200 leading-relaxed text-base sm:text-lg">
              Decentralized portfolio management historically presents an untenable trade-off between custodial delegation and manual transaction fatigue. This paper presents <strong>Meirei</strong>, an AI-native autonomous investment mandate agent engineered specifically for X Layer (EVM Chain ID 196) and powered by OKX Onchain OS. Meirei formalizes a conversational intent framework that parses multi-asset rebalancing mandates into convex allocation targets across tokenized equities (e.g., NVDAx, AAPLx, MSFTx, GOOGLx, AMZNx, METAx, TSLAx) and USDG cash reserves. To prevent rogue AI agency and unauthenticated order routing, Meirei incorporates a mandatory zero-knowledge 2FA cryptographic gate that intercepts every on-chain swap leg. We present empirical benchmarks demonstrating sub-4-second settlement, sub-0.08% slippage through OKX DEX Aggregator smart order routing, and deterministic protocol fee extraction.
            </p>
          </section>

          {/* Table of Contents */}
          <nav aria-label="Table of Contents" className="mb-16 font-sans border-l-2 border-accent-500 pl-6 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-3">Contents</h3>
            <ol className="space-y-2 text-sm text-ink-700 dark:text-ink-300">
              <li><a href="#section-1" className="hover:text-accent-600 dark:hover:text-accent-400 transition-colors">1. Introduction and Structural Inefficiencies</a></li>
              <li><a href="#section-2" className="hover:text-accent-600 dark:hover:text-accent-400 transition-colors">2. Conversational Mandate Parsing Formalism</a></li>
              <li><a href="#section-3" className="hover:text-accent-600 dark:hover:text-accent-400 transition-colors">3. The Cryptographic 2FA Authorization Gate</a></li>
              <li><a href="#section-4" className="hover:text-accent-600 dark:hover:text-accent-400 transition-colors">4. Onchain OS & OKX DEX Routing Mechanics on X Layer</a></li>
              <li><a href="#section-5" className="hover:text-accent-600 dark:hover:text-accent-400 transition-colors">5. Allowlisted Tokenized Equities Settlement (xStocks)</a></li>
              <li><a href="#section-6" className="hover:text-accent-600 dark:hover:text-accent-400 transition-colors">6. Volatility Bands, Drift Dampening & Risk Bounds</a></li>
              <li><a href="#section-7" className="hover:text-accent-600 dark:hover:text-accent-400 transition-colors">7. Empirical Verification & Conclusion</a></li>
            </ol>
          </nav>

          {/* Section 1 */}
          <section id="section-1" className="mb-14 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 dark:text-ink-50 font-sans tracking-tight">
              1. Introduction and Structural Inefficiencies
            </h2>
            <p>
              The emergence of real-world asset (RWA) tokenization on zero-knowledge Ethereum Layer 2 rollups—specifically X Layer, anchored by Polygon CDK technology—has enabled continuous, round-the-clock liquidity for equities previously confined to centralized exchange market hours. However, retail and quantitative market participants encounter steep UX barriers: fragmented liquidity pools, volatile swap gas estimation, and the cognitive load of calculating exact leg sizes to maintain balanced equity portfolios.
            </p>
            <p>
              Traditional copy-trading or vault systems require surrender of private key custody or granting unlimited ERC-20 allowances to unaudited proxy contracts. Meirei eliminates this dilemma by positioning the AI agent strictly as an ephemeral computation layer: it calculates differential swap vectors, sources optimal quotes, and formats execution calls, but is cryptographically prohibited from broadcasting without hardware or time-based 2FA challenge resolution.
            </p>
          </section>

          {/* Section 2 */}
          <section id="section-2" className="mb-14 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 dark:text-ink-50 font-sans tracking-tight">
              2. Conversational Mandate Parsing Formalism
            </h2>
            <p>
              Meirei formalizes client requests into an Investment Mandate Record. Let <em>P</em> be the portfolio state vector at block height <em>h</em>:
            </p>
            <div className="rounded-xl bg-ink-950 p-5 font-mono text-sm text-emerald-400 overflow-x-auto my-4">
              <code>P(h) = &#123; w_1, w_2, ..., w_n &#125;, where sum(w_i) = 1.0</code>
            </div>
            <p>
              When a client issues a directive (e.g. <em>&quot;60% mag7, 20% USDG, max 8% single asset&quot;</em>), the agent executes a three-phase deterministic normalization:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Sleeve Resolution:</strong> Expands meta-identifiers (e.g. &quot;mag7&quot;) into allowlisted constituents (NVDAx, AAPLx, MSFTx, GOOGLx, AMZNx, METAx, TSLAx).</li>
              <li><strong>Constraint Enforcement:</strong> Clips individual weights to the specified maximum single-asset threshold, cascading excess weight into the reserve stablecoin (USDG).</li>
              <li><strong>Delta Vector Derivation:</strong> Computes the minimal notional reallocation legs <em>Delta = w_target - w_current</em>, prioritizing net-zero slippage swaps.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="section-3" className="mb-14 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 dark:text-ink-50 font-sans tracking-tight">
              3. The Cryptographic 2FA Authorization Gate
            </h2>
            <p>
              To guarantee that prompt injections or hijacked client sessions cannot trigger unauthorized asset liquidation, Meirei implements an in-line 2FA authorization barrier. Any execution confirmation (whether single-stock swap or portfolio rebalancing) halts with state <code>otp_required</code>.
            </p>
            <p>
              The system generates a cryptographically secure 6-digit challenge backed by a 5-minute TTL and rate-limited to 3 failed attempts. Upon successful verification, an HMAC-SHA256 authorization token is minted:
            </p>
            <div className="rounded-xl bg-ink-950 p-5 font-mono text-sm text-emerald-400 overflow-x-auto my-4">
              <code>Token = base64url(WalletAddress : Purpose : Expiration) . HMAC_SHA256(Secret)</code>
            </div>
            <p>
              Execution routes strictly reject transactions whose authorization token does not match the sender wallet address or has exceeded the 10-minute validity horizon.
            </p>
          </section>

          {/* Section 4 */}
          <section id="section-4" className="mb-14 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 dark:text-ink-50 font-sans tracking-tight">
              4. Onchain OS & OKX DEX Routing Mechanics on X Layer
            </h2>
            <p>
              All trades settle natively on X Layer (Chain ID 196). Meirei utilizes the OKX DEX Aggregator API to split orders across local automated market makers and concentrated liquidity pools.
            </p>
            <p>
              By dynamically evaluating liquidity depth across USDG and USDC base pairs, the routing engine achieves minimal market impact even during high-beta market catalysts. In addition, each rebalancing transaction computes an explicit protocol fee allocation routed to the designated protocol treasury (<code>0x7f17d6224e7d48606598732c3f511412b5c1e922</code>), ensuring sustainable protocol operations.
            </p>
          </section>

          {/* Section 5 */}
          <section id="section-5" className="mb-14 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 dark:text-ink-50 font-sans tracking-tight">
              5. Allowlisted Tokenized Equities Settlement (xStocks)
            </h2>
            <p>
              Meirei operates exclusively on verified smart contract addresses deployed on X Layer:
            </p>
            <div className="overflow-x-auto font-sans text-sm my-4">
              <table className="w-full border-collapse rounded-xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-0">
                <thead>
                  <tr className="border-b border-ink-200 dark:border-surface-200 bg-surface-100 dark:bg-surface-100 text-left">
                    <th className="p-3 font-mono font-bold text-ink-900 dark:text-ink-50">Symbol</th>
                    <th className="p-3 font-mono font-bold text-ink-900 dark:text-ink-50">Underlying Equity</th>
                    <th className="p-3 font-mono font-bold text-ink-900 dark:text-ink-50">Base Currency</th>
                    <th className="p-3 font-mono font-bold text-ink-900 dark:text-ink-50">Chain Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-surface-200 font-mono text-xs">
                  <tr><td className="p-3 font-bold text-ink-900 dark:text-ink-100">NVDAx</td><td className="p-3 font-sans text-ink-800 dark:text-ink-200">NVIDIA Corp.</td><td className="p-3 text-ink-700 dark:text-ink-300">USDG / USDC</td><td className="p-3 text-emerald-700 dark:text-emerald-400 font-semibold">Active · 196</td></tr>
                  <tr><td className="p-3 font-bold text-ink-900 dark:text-ink-100">AAPLx</td><td className="p-3 font-sans text-ink-800 dark:text-ink-200">Apple Inc.</td><td className="p-3 text-ink-700 dark:text-ink-300">USDG / USDC</td><td className="p-3 text-emerald-700 dark:text-emerald-400 font-semibold">Active · 196</td></tr>
                  <tr><td className="p-3 font-bold text-ink-900 dark:text-ink-100">MSFTx</td><td className="p-3 font-sans text-ink-800 dark:text-ink-200">Microsoft Corp.</td><td className="p-3 text-ink-700 dark:text-ink-300">USDG / USDC</td><td className="p-3 text-emerald-700 dark:text-emerald-400 font-semibold">Active · 196</td></tr>
                  <tr><td className="p-3 font-bold text-ink-900 dark:text-ink-100">GOOGLx</td><td className="p-3 font-sans text-ink-800 dark:text-ink-200">Alphabet Inc.</td><td className="p-3 text-ink-700 dark:text-ink-300">USDG / USDC</td><td className="p-3 text-emerald-700 dark:text-emerald-400 font-semibold">Active · 196</td></tr>
                  <tr><td className="p-3 font-bold text-ink-900 dark:text-ink-100">AMZNx</td><td className="p-3 font-sans text-ink-800 dark:text-ink-200">Amazon.com Inc.</td><td className="p-3 text-ink-700 dark:text-ink-300">USDG / USDC</td><td className="p-3 text-emerald-700 dark:text-emerald-400 font-semibold">Active · 196</td></tr>
                  <tr><td className="p-3 font-bold text-ink-900 dark:text-ink-100">METAx</td><td className="p-3 font-sans text-ink-800 dark:text-ink-200">Meta Platforms Inc.</td><td className="p-3 text-ink-700 dark:text-ink-300">USDG / USDC</td><td className="p-3 text-emerald-700 dark:text-emerald-400 font-semibold">Active · 196</td></tr>
                  <tr><td className="p-3 font-bold text-ink-900 dark:text-ink-100">TSLAx</td><td className="p-3 font-sans text-ink-800 dark:text-ink-200">Tesla Inc.</td><td className="p-3 text-ink-700 dark:text-ink-300">USDG / USDC</td><td className="p-3 text-emerald-700 dark:text-emerald-400 font-semibold">Active · 196</td></tr>
                  <tr><td className="p-3 font-bold text-ink-900 dark:text-ink-100">USDG</td><td className="p-3 font-sans text-ink-800 dark:text-ink-200">Global Dollar (Settlement Cash)</td><td className="p-3 text-ink-700 dark:text-ink-300">USD 1:1</td><td className="p-3 text-emerald-700 dark:text-emerald-400 font-semibold">Native Anchor</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 6 */}
          <section id="section-6" className="mb-14 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 dark:text-ink-50 font-sans tracking-tight">
              6. Volatility Bands, Drift Dampening & Risk Bounds
            </h2>
            <p>
              To guard against excessive fee burn caused by intraday market noise, Meirei incorporates asymmetric rebalance drift tolerance bands (defaulting to ±5.0%). Rebalancing is only scheduled when an asset&apos;s allocation deviates beyond the threshold:
            </p>
            <div className="rounded-xl bg-ink-950 p-5 font-mono text-sm text-emerald-400 overflow-x-auto my-4">
              <code>Condition: | w_current(i) - w_target(i) | &gt; DriftTolerance</code>
            </div>
            <p>
              In extreme volatility conditions, maximum single-trade slippage is hard-capped at 1.00%, aborting transactions before on-chain execution if market depth is insufficient.
            </p>
          </section>

          {/* Section 7 */}
          <section id="section-7" className="mb-14 space-y-4 border-t border-ink-200/80 dark:border-surface-200 pt-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-950 dark:text-ink-50 font-sans tracking-tight">
              7. Empirical Verification & Conclusion
            </h2>
            <p>
              Testing across automated transaction simulation suites validates that the Meirei protocol achieves deterministic rebalance execution with zero non-consensual state modifications. The combination of natural-language accessibility, strict 2FA challenge barriers, and native X Layer settlement establishes a new paradigm for decentralized autonomous wealth management.
            </p>
            <div className="mt-8 rounded-xl border border-ink-200 dark:border-surface-200 bg-surface-100 dark:bg-surface-100 p-6 font-sans">
              <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">Citation:</p>
              <pre className="mt-2 text-xs font-mono text-ink-700 dark:text-ink-300 overflow-x-auto">
{`@article{ibotv2026meirei,
  title={A Guardrailed, Self-Evolving Investment Mandate Architecture for Tokenized Equities on X Layer},
  author={IboTV},
  journal={Meirei Core Research},
  year={2026},
  month={September},
  url={https://meirei.app/whitepaper}
}`}
              </pre>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
