import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Internals & Protocol Architecture | Meirei Docs",
  description: "Deep dive into the execution engine, OKX DEX router, database models, and mathematical rebalance engine.",
};

export default function InternalsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F6F5EE] dark:bg-surface-50 text-ink-900 dark:text-ink-100">
        <div className="border-b border-ink-200/60 dark:border-surface-200 pt-28 pb-14 px-6 sm:px-12 md:pt-36 md:pb-16">
          <div className="mx-auto max-w-[1400px]">
            <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold uppercase tracking-wider text-[#C4820A] dark:text-amber-400">
              <Link href="/docs" className="hover:underline">Docs</Link>
              <span>/</span>
              <span>Internals</span>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 dark:text-ink-50 sm:text-5xl">
              System Internals & Architecture
            </h1>
            <p className="mt-3 max-w-2xl text-base text-ink-700 dark:text-ink-300 sm:text-lg">
              Teardown of the Meirei on-chain execution pipeline, convex rebalance optimizer, and OKX DEX routing on X Layer (chain 196).
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-6 py-14 sm:px-12 space-y-12">
          {/* Architecture Pipeline */}
          <section className="space-y-4 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-ink-50">1. Autonomous Execution Pipeline</h2>
            <p className="text-ink-700 dark:text-ink-300 leading-relaxed">
              When an instruction is submitted, the Meirei state engine executes a synchronous four-stage pipeline:
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 my-4">
              <div className="rounded-xl border border-ink-200 dark:border-surface-200 bg-surface-50 dark:bg-surface-200 p-4">
                <span className="font-mono text-xs font-bold text-accent-700 dark:text-accent-400">STAGE 01</span>
                <h3 className="font-display text-base font-bold text-ink-900 dark:text-ink-50 mt-1">Intent Parsing</h3>
                <p className="text-xs text-ink-600 dark:text-ink-400 mt-1">Normalizes freeform natural language text into structured asset weights and single-stock trade legs.</p>
              </div>
              <div className="rounded-xl border border-ink-200 dark:border-surface-200 bg-surface-50 dark:bg-surface-200 p-4">
                <span className="font-mono text-xs font-bold text-accent-700 dark:text-accent-400">STAGE 02</span>
                <h3 className="font-display text-base font-bold text-ink-900 dark:text-ink-50 mt-1">On-Chain State Query</h3>
                <p className="text-xs text-ink-600 dark:text-ink-400 mt-1">Queries live ERC-20 balances on X Layer via RPC node and fetches OKX DEX Aggregator depth.</p>
              </div>
              <div className="rounded-xl border border-ink-200 dark:border-surface-200 bg-surface-50 dark:bg-surface-200 p-4">
                <span className="font-mono text-xs font-bold text-accent-700 dark:text-accent-400">STAGE 03</span>
                <h3 className="font-display text-base font-bold text-ink-900 dark:text-ink-50 mt-1">2FA Challenge Gate</h3>
                <p className="text-xs text-ink-600 dark:text-ink-400 mt-1">Intercepts execution. Requires verification of 6-digit challenge before granting signed authorization token.</p>
              </div>
              <div className="rounded-xl border border-ink-200 dark:border-surface-200 bg-surface-50 dark:bg-surface-200 p-4">
                <span className="font-mono text-xs font-bold text-accent-700 dark:text-accent-400">STAGE 04</span>
                <h3 className="font-display text-base font-bold text-ink-900 dark:text-ink-50 mt-1">Atomic DEX Broadcast</h3>
                <p className="text-xs text-ink-600 dark:text-ink-400 mt-1">Executes swaps via OKX Aggregator router on X Layer, settling into USDG with protocol fee attribution.</p>
              </div>
            </div>
          </section>

          {/* Mathematical Rebalance Model */}
          <section className="space-y-4 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-ink-50">2. Portfolio Optimization Formalism</h2>
            <p className="text-ink-700 dark:text-ink-300 leading-relaxed">
              Given a current portfolio vector <code>W_c</code> and a mandate target vector <code>W_t</code>, the rebalance optimizer minimizes the total number of swap transactions while observing maximum concentration constraints:
            </p>
            <div className="rounded-xl bg-ink-950 p-5 font-mono text-xs text-emerald-400 overflow-x-auto">
{`minimize:  Count(legs)
subject to:
  sum(w_target_i) = 1.0
  w_target_i <= max_single_weight (default: 0.35)
  | w_target_i - w_current_i | >= drift_tolerance (default: 0.05)
  slippage <= 0.01 (1.00% max bound)`}
            </div>
            <p className="text-ink-700 dark:text-ink-300 leading-relaxed text-sm">
              Any sleeve allocation exceeding <code>max_single_weight</code> automatically cascades into the liquid cash reserve asset (<code>USDG</code>).
            </p>
          </section>

          {/* Database Models */}
          <section className="space-y-4 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-ink-50">3. Persistence Schema (Migration 0029)</h2>
            <p className="text-ink-700 dark:text-ink-300 leading-relaxed">
              Meirei persists on-chain users, mandates, and execution receipts using PostgreSQL:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-ink-700 dark:text-ink-300">
              <li><code>meirei_users</code>: 0x-prefixed 40-byte hex EVM wallet addresses mapped to external chat handles.</li>
              <li><code>meirei_mandates</code>: Mandate target weights JSON, frequency, cash symbol, rebalance drift tolerance.</li>
              <li><code>meirei_executions</code>: Transaction hash array on X Layer, notional USD total, protocol fee receipts.</li>
              <li><code>meirei_portfolio_snapshots</code>: Historical point-in-time balance and net asset value snapshots.</li>
            </ul>
          </section>

          {/* Circuit Breakers */}
          <section className="space-y-4 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-ink-50">4. Emergency Panic Circuit Breaker</h2>
            <p className="text-ink-700 dark:text-ink-300 leading-relaxed">
              If a client detects compromised communication credentials, they can broadcast the panic freeze directive (<code>/api/panic/freeze</code>). This triggers an immediate system freeze for that wallet address, revoking all active 2FA authorization tokens and rejecting any pending mandate execution until manual identity unfreeze is verified.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
