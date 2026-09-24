import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Internals & Protocol Architecture | Meirei Docs",
  description: "Deep dive into the execution engine, OKX DEX router, zero-database security models, and mathematical rebalance engine.",
};

export default function InternalsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface-50 text-ink-900">
        <div className="border-b border-ink-200/60 pt-28 pb-14 px-6 sm:px-12 md:pt-36 md:pb-16 bg-[#F6F5EE]">
          <div className="mx-auto max-w-[1400px]">
            <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold uppercase tracking-wider text-accent-700">
              <Link href="/docs" className="hover:underline">Docs</Link>
              <span>/</span>
              <span>Internals</span>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
              System Internals &amp; Rendered Architecture
            </h1>
            <p className="mt-3 max-w-2xl text-base text-ink-700 sm:text-lg">
              Visual teardown of the Meirei on-chain execution pipeline, convex rebalance optimizer, and OKX DEX routing on X Layer (chain 196).
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-6 py-14 sm:px-12 space-y-12">
          {/* Visual Rendered Architecture Map */}
          <section className="space-y-6 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent-700">
                  Rendered Flow Diagram
                </span>
                <h2 className="font-display text-2xl font-bold text-ink-950 mt-1">
                  Full End-to-End System Topology
                </h2>
              </div>
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 font-mono text-xs font-bold text-emerald-800">
                OKX X Layer (Chain 196)
              </span>
            </div>

            {/* Rendered Pipeline Diagram Box */}
            <div className="rounded-2xl border border-ink-200 bg-surface-50 p-5 text-ink-900 shadow-xs">
              <div className="grid gap-4 sm:grid-cols-4 text-xs font-mono">
                {/* Step 1 */}
                <div className="rounded-xl border border-ink-200 bg-white p-3.5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-ink-500">
                    <span className="font-bold text-accent-700">01. INGESTION</span>
                    <span>Chat / Web</span>
                  </div>
                  <p className="font-bold text-ink-950 text-sm">Client Channels</p>
                  <ul className="text-ink-600 space-y-1 text-[11px]">
                    <li>• Telegram Bot (@MeireiXLayerBot)</li>
                    <li>• WhatsApp Cloud API</li>
                    <li>• Trading Web Terminal</li>
                    <li>• OKX Wallet Bridge</li>
                  </ul>
                </div>

                {/* Step 2 */}
                <div className="rounded-xl border border-ink-200 bg-white p-3.5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-ink-500">
                    <span className="font-bold text-amber-700">02. SECURITY</span>
                    <span>Zero Database</span>
                  </div>
                  <p className="font-bold text-ink-950 text-sm">In-Memory Gateway</p>
                  <ul className="text-ink-600 space-y-1 text-[11px]">
                    <li>• SHA-256 Identity Anchor</li>
                    <li>• Token-Bucket Rate Limiter</li>
                    <li>• Idempotency Nonce Guard</li>
                    <li>• /freeze Circuit Breaker</li>
                  </ul>
                </div>

                {/* Step 3 */}
                <div className="rounded-xl border border-ink-200 bg-white p-3.5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-ink-500">
                    <span className="font-bold text-emerald-700">03. MANDATE</span>
                    <span>Onchain OS</span>
                  </div>
                  <p className="font-bold text-ink-950 text-sm">Optimizer &amp; 2FA</p>
                  <ul className="text-ink-600 space-y-1 text-[11px]">
                    <li>• Natural-Language NLP</li>
                    <li>• Convex Diff Engine</li>
                    <li>• 6-Digit OTP / WebAuthn</li>
                    <li>• Constant-Time Timing Check</li>
                  </ul>
                </div>

                {/* Step 4 */}
                <div className="rounded-xl border border-ink-200 bg-white p-3.5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-ink-500">
                    <span className="font-bold text-sky-700">04. EXECUTE</span>
                    <span>X Layer 196</span>
                  </div>
                  <p className="font-bold text-ink-950 text-sm">OKX DEX Router</p>
                  <ul className="text-ink-600 space-y-1 text-[11px]">
                    <li>• 12 Allowlisted xStocks &amp; ETFs</li>
                    <li>• Multi-Pool Aggregation</li>
                    <li>• Sponsored Paymaster Gas</li>
                    <li>• Real-Time Tx Explorer Link</li>
                  </ul>
                </div>
              </div>

              {/* Data Flow Direction Indicators */}
              <div className="mt-4 pt-4 border-t border-ink-200 flex flex-wrap items-center justify-between text-[11px] font-mono text-ink-600">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Direction: Natural Language Prompt → In-Memory 2FA → Atomic OKX DEX Swaps → Verified X Layer Receipt</span>
                </span>
                <span className="text-ink-700 font-bold">100% Non-Custodial</span>
              </div>
            </div>
          </section>

          {/* Architecture Pipeline Stages */}
          <section className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-ink-950">1. Autonomous Execution Pipeline</h2>
            <p className="text-ink-700 leading-relaxed">
              When an instruction is submitted, the Meirei state engine executes a synchronous four-stage pipeline:
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 my-4">
              <div className="rounded-xl border border-ink-200 bg-surface-50 p-4">
                <span className="font-mono text-xs font-bold text-accent-700">STAGE 01</span>
                <h3 className="font-display text-base font-bold text-ink-950 mt-1">Intent Parsing</h3>
                <p className="text-xs text-ink-600 mt-1">Normalizes freeform natural language text into structured asset weights and single-stock trade legs.</p>
              </div>
              <div className="rounded-xl border border-ink-200 bg-surface-50 p-4">
                <span className="font-mono text-xs font-bold text-accent-700">STAGE 02</span>
                <h3 className="font-display text-base font-bold text-ink-950 mt-1">On-Chain State Query</h3>
                <p className="text-xs text-ink-600 mt-1">Queries live ERC-20 balances on X Layer via RPC node and fetches OKX DEX Aggregator depth.</p>
              </div>
              <div className="rounded-xl border border-ink-200 bg-surface-50 p-4">
                <span className="font-mono text-xs font-bold text-accent-700">STAGE 03</span>
                <h3 className="font-display text-base font-bold text-ink-950 mt-1">2FA Challenge Gate</h3>
                <p className="text-xs text-ink-600 mt-1">Intercepts execution. Requires verification of 6-digit challenge before granting signed authorization token.</p>
              </div>
              <div className="rounded-xl border border-ink-200 bg-surface-50 p-4">
                <span className="font-mono text-xs font-bold text-accent-700">STAGE 04</span>
                <h3 className="font-display text-base font-bold text-ink-950 mt-1">Atomic DEX Broadcast</h3>
                <p className="text-xs text-ink-600 mt-1">Executes swaps via OKX Aggregator router on X Layer, settling into USDG with protocol fee attribution.</p>
              </div>
            </div>
          </section>

          {/* Mathematical Rebalance Model */}
          <section className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-ink-950">2. Portfolio Optimization Formalism</h2>
            <p className="text-ink-700 leading-relaxed">
              Given a current portfolio vector <code>W_c</code> and a mandate target vector <code>W_t</code>, the rebalance optimizer minimizes the total number of swap transactions while observing maximum concentration constraints:
            </p>
            <div className="rounded-xl bg-surface-100 border border-ink-200 p-5 font-mono text-xs text-ink-900 overflow-x-auto shadow-xs">
{`minimize:  Count(legs)
subject to:
  sum(w_target_i) = 1.0
  w_target_i <= max_single_weight (default: 0.35)
  | w_target_i - w_current_i | >= drift_tolerance (default: 0.05)
  slippage <= 0.01 (1.00% max bound)`}
            </div>
            <p className="text-ink-700 leading-relaxed text-sm">
              Any sleeve allocation exceeding <code>max_single_weight</code> automatically cascades into the liquid cash reserve asset (<code>USDG</code>).
            </p>
          </section>

          {/* Dual State Architecture */}
          <section className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-ink-950">3. Dual State Architecture: Ephemeral Redis &amp; Durable Supabase</h2>
            <p className="text-ink-700 leading-relaxed">
              Meirei cleanly separates ephemeral high-frequency security state from durable user identity records:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm text-ink-700">
              <li><strong>Ephemeral Security State (Upstash Redis):</strong> Account freeze flags (<code>SET freeze:&#123;profileId&#125; 1</code>), atomic idempotency locks (<code>SET idem:&#123;hash&#125; 1 NX EX 86400</code>), sliding-window rate limit buckets, and HMAC-SHA256 OTP challenges bound to calldata digests.</li>
              <li><strong>Durable Identity &amp; Audit State (Supabase):</strong> Persists the non-financial mapping between verified chat handles (WhatsApp, Telegram, email) and public X Layer EVM wallet addresses, alongside immutable transaction execution audit logs.</li>
              <li><strong>Zero Server-Held Private Keys:</strong> Transactions are signed client-side via standard EOA wallets (OKX Wallet, MetaMask). Server-held private keys are strictly prohibited.</li>
              <li><strong>Live On-Chain State:</strong> Balances, allowances, and swap execution receipts are queried and verified directly against OKX X Layer Mainnet (Chain ID 196).</li>
            </ul>
          </section>

          {/* Circuit Breakers */}
          <section className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-ink-950">4. Emergency Panic Circuit Breaker</h2>
            <p className="text-ink-700 leading-relaxed">
              If a client detects compromised communication credentials, they can broadcast the panic freeze directive (<code>/freeze</code>). This triggers an immediate in-memory freeze for that profile, revoking all active 2FA authorization tokens and rejecting any pending mandate execution until manual identity unfreeze is verified via the 6-digit recovery code (<code>/unfreeze &lt;code&gt;</code>).
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
