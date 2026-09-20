import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation | Meirei Protocol",
  description: "Official documentation and developer reference for Meirei AI Investment Mandate Agent on X Layer.",
};

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F6F5EE] dark:bg-surface-50 text-ink-900 dark:text-ink-100">
        <div className="border-b border-ink-200/60 dark:border-surface-200 pt-28 pb-14 px-6 sm:px-12 md:pt-36 md:pb-16">
          <div className="mx-auto max-w-[1400px]">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4820A] dark:text-amber-400">
              DEVELOPER & PROTOCOL GUIDE
            </span>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink-950 dark:text-ink-50 sm:text-5xl">
              Meirei Documentation
            </h1>
            <p className="mt-3 max-w-2xl text-base text-ink-700 dark:text-ink-300 sm:text-lg">
              Comprehensive guide to conversational mandates, the cryptographic 2FA authorization barrier, and on-chain execution on X Layer.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-6 py-12 sm:px-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Sidebar navigation */}
            <aside className="lg:col-span-3">
              <nav className="sticky top-28 space-y-6 text-sm">
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-2">
                    Overview
                  </h3>
                  <ul className="space-y-2 text-ink-700 dark:text-ink-300">
                    <li><a href="#intro" className="font-semibold text-accent-600 dark:text-accent-400">Introduction</a></li>
                    <li><a href="#quickstart" className="hover:text-ink-950 dark:hover:text-ink-50 transition-colors">Quickstart</a></li>
                    <li><a href="#assets" className="hover:text-ink-950 dark:hover:text-ink-50 transition-colors">Allowlisted xStocks</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-2">
                    Security & 2FA
                  </h3>
                  <ul className="space-y-2 text-ink-700 dark:text-ink-300">
                    <li><a href="#otp-architecture" className="hover:text-ink-950 dark:hover:text-ink-50 transition-colors">2FA OTP Barrier</a></li>
                    <li><a href="#token-validation" className="hover:text-ink-950 dark:hover:text-ink-50 transition-colors">HMAC-SHA256 Tokens</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-2">
                    API Reference
                  </h3>
                  <ul className="space-y-2 text-ink-700 dark:text-ink-300">
                    <li><a href="#api-chat" className="hover:text-ink-950 dark:hover:text-ink-50 transition-colors">POST /api/chat</a></li>
                    <li><a href="#api-otp" className="hover:text-ink-950 dark:hover:text-ink-50 transition-colors">POST /api/auth/otp</a></li>
                    <li><a href="#api-news" className="hover:text-ink-950 dark:hover:text-ink-50 transition-colors">GET /api/news</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400 mb-2">
                    Deep Dive
                  </h3>
                  <ul className="space-y-2 text-ink-700 dark:text-ink-300">
                    <li><Link href="/docs/internals" className="font-medium text-ink-900 dark:text-ink-100 hover:text-accent-600 dark:hover:text-accent-400 transition-colors">System Internals ↗</Link></li>
                    <li><Link href="/whitepaper" className="font-medium text-ink-900 dark:text-ink-100 hover:text-accent-600 dark:hover:text-accent-400 transition-colors">Research Whitepaper ↗</Link></li>
                  </ul>
                </div>
              </nav>
            </aside>

            {/* Documentation Content */}
            <div className="space-y-12 lg:col-span-9 max-w-3xl">
              {/* Introduction */}
              <section id="intro" className="space-y-4 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 sm:p-8 shadow-xs">
                <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-ink-50">1. Introduction</h2>
                <p className="text-ink-700 dark:text-ink-300 leading-relaxed">
                  Meirei (命令) is an autonomous, AI-native investment mandate agent built for X Layer (EVM Chain 196). It accepts natural-language directives from everyday chat platforms (WhatsApp, Telegram, Web Terminal) and calculates minimal-slippage rebalancing plans across tokenized equities.
                </p>
                <p className="text-ink-700 dark:text-ink-300 leading-relaxed">
                  Unlike conventional bots that demand full custodial control over user funds, Meirei strictly enforces an isolated computation model: preview quotes are generated freely, but on-chain settlement strictly requires a cryptographically verified 2FA OTP challenge.
                </p>
              </section>

              {/* Quickstart */}
              <section id="quickstart" className="space-y-4 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 sm:p-8 shadow-xs">
                <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-ink-50">2. Conversational Syntax Examples</h2>
                <div className="space-y-3 font-mono text-xs">
                  <div className="rounded-xl bg-surface-100 dark:bg-surface-200 p-4">
                    <p className="font-bold text-ink-900 dark:text-ink-50">Querying Spot Prices:</p>
                    <p className="text-accent-700 dark:text-accent-400 mt-1">&quot;What is the price of NVDAx?&quot; or &quot;Price of AAPLx&quot;</p>
                  </div>
                  <div className="rounded-xl bg-surface-100 dark:bg-surface-200 p-4">
                    <p className="font-bold text-ink-900 dark:text-ink-50">Checking Live Wallet Holdings:</p>
                    <p className="text-accent-700 dark:text-accent-400 mt-1">&quot;Check balance&quot; or &quot;My portfolio&quot;</p>
                  </div>
                  <div className="rounded-xl bg-surface-100 dark:bg-surface-200 p-4">
                    <p className="font-bold text-ink-900 dark:text-ink-50">Direct Stock Buy / Sell Orders:</p>
                    <p className="text-accent-700 dark:text-accent-400 mt-1">&quot;Buy 250 USDG of NVDAx&quot; or &quot;Sell 1 AAPLx&quot; or &quot;Exit TSLAx&quot;</p>
                  </div>
                  <div className="rounded-xl bg-surface-100 dark:bg-surface-200 p-4">
                    <p className="font-bold text-ink-900 dark:text-ink-50">Multi-Asset Rebalancing Mandate:</p>
                    <p className="text-accent-700 dark:text-accent-400 mt-1">&quot;60% mag7, 20% USDG, max 8% single asset&quot;</p>
                  </div>
                </div>
              </section>

              {/* Security & 2FA Architecture */}
              <section id="otp-architecture" className="space-y-4 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 sm:p-8 shadow-xs">
                <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-ink-50">3. 2FA Cryptographic Authorization Barrier</h2>
                <p className="text-ink-700 dark:text-ink-300 leading-relaxed">
                  Every trade confirmation requires passing an ephemeral challenge. The workflow operates as follows:
                </p>
                <ol className="list-decimal pl-6 space-y-2 text-ink-700 dark:text-ink-300">
                  <li><strong>Preview Request:</strong> Client receives price quote and price impact estimate.</li>
                  <li><strong>Challenge Minting:</strong> Upon confirming order, server emits <code>type: &quot;otp_required&quot;</code> and creates a 6-digit challenge in memory (5-minute TTL, max 3 attempts).</li>
                  <li><strong>Verification:</strong> Client submits code to <code>/api/auth/otp</code>. When valid, a signed authorization token is issued.</li>
                  <li><strong>Atomic Broadcast:</strong> Client sends authorization token with confirm request. Execution runs via OKX DEX Aggregator on X Layer (chain 196).</li>
                </ol>
              </section>

              {/* API Reference */}
              <section id="api-chat" className="space-y-4 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 sm:p-8 shadow-xs">
                <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-ink-50">4. API Reference</h2>

                <div className="space-y-6 font-mono text-xs">
                  <div>
                    <h3 className="font-sans font-bold text-sm text-ink-900 dark:text-ink-50 mb-1">POST /api/chat</h3>
                    <p className="font-sans text-xs text-ink-600 dark:text-ink-400 mb-2">Process natural language prompts, quotes, or trade executions.</p>
                    <pre className="rounded-xl bg-ink-950 p-4 text-emerald-400 overflow-x-auto">
{`// Request body
{
  "message": "Buy 250 USDG of NVDAx",
  "walletAddress": "0x7f17d6224e7d48606598732c3f511412b5c1e922",
  "confirm": true,
  "otpToken": "<HMAC_SIGNED_TOKEN>" // Optional for preview, required for execution
}`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-sans font-bold text-sm text-ink-900 dark:text-ink-50 mb-1">POST /api/auth/otp</h3>
                    <p className="font-sans text-xs text-ink-600 dark:text-ink-400 mb-2">Generate and verify 6-digit 2FA authorization challenges.</p>
                    <pre className="rounded-xl bg-ink-950 p-4 text-emerald-400 overflow-x-auto">
{`// Step 1: Request Challenge
{ "action": "request", "identifier": "0x7f17..." }

// Response: { "ok": true, "challengeId": "otp_...", "expiresAt": 1789633747479 }

// Step 2: Verify Code
{ "action": "verify", "challengeId": "otp_...", "code": "313987" }

// Response: { "ok": true, "otpToken": "eyJhbGci..." }`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-sans font-bold text-sm text-ink-900 dark:text-ink-50 mb-1">GET /api/news</h3>
                    <p className="font-sans text-xs text-ink-600 dark:text-ink-400 mb-2">Fetch live market catalysts and AI impact analyses for tokenized equities.</p>
                    <pre className="rounded-xl bg-ink-950 p-4 text-emerald-400 overflow-x-auto">
{`// Response
{
  "catalysts": [
    {
      "id": "cat_1",
      "ticker": "NVDAx",
      "headline": "Blackwell Architecture Production Ramps...",
      "impact": "Bullish",
      "marketEffectAnalysis": "Strong spot demand catalyst on X Layer...",
      "suggestedAction": { "label": "Accumulate NVDAx", "tradePrompt": "Buy 250 USDG of NVDAx" }
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
