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
      <main className="min-h-screen bg-[#F6F5EE] text-ink-900">
        <div className="border-b border-ink-200/60 pt-28 pb-14 px-6 sm:px-12 md:pt-36 md:pb-16">
          <div className="mx-auto max-w-[1400px]">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4820A]">
              DEVELOPER &amp; PROTOCOL GUIDE
            </span>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
              Meirei Documentation
            </h1>
            <p className="mt-3 max-w-2xl text-base text-ink-700 sm:text-lg">
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
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">
                    Overview
                  </h3>
                  <ul className="space-y-2 text-ink-700">
                    <li><a href="#intro" className="font-semibold text-accent-600">Introduction</a></li>
                    <li><a href="#quickstart" className="hover:text-ink-950 transition-colors">Quickstart</a></li>
                    <li><a href="#assets" className="hover:text-ink-950 transition-colors">Allowlisted xStocks</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">
                    Security &amp; 2FA
                  </h3>
                  <ul className="space-y-2 text-ink-700">
                    <li><a href="#otp-architecture" className="hover:text-ink-950 transition-colors">2FA OTP Barrier</a></li>
                    <li><a href="#token-validation" className="hover:text-ink-950 transition-colors">HMAC-SHA256 Tokens</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">
                    API Reference
                  </h3>
                  <ul className="space-y-2 text-ink-700">
                    <li><a href="#api-chat" className="hover:text-ink-950 transition-colors">POST /api/chat</a></li>
                    <li><a href="#api-otp" className="hover:text-ink-950 transition-colors">POST /api/auth/otp</a></li>
                    <li><a href="#api-news" className="hover:text-ink-950 transition-colors">GET /api/news</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">
                    Deep Dive
                  </h3>
                  <ul className="space-y-2 text-ink-700">
                    <li><Link href="/docs/internals" className="font-medium text-ink-900 hover:text-accent-600 transition-colors">System Internals ↗</Link></li>
                    <li><Link href="/whitepaper" className="font-medium text-ink-900 hover:text-accent-600 transition-colors">Research Whitepaper ↗</Link></li>
                  </ul>
                </div>
              </nav>
            </aside>

            {/* Documentation Content */}
            <div className="space-y-12 lg:col-span-9 max-w-3xl">
              {/* Introduction */}
              <section id="intro" className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
                <h2 className="font-display text-2xl font-bold text-ink-950">1. Introduction</h2>
                <p className="text-ink-700 leading-relaxed">
                  Meirei (命令) is an autonomous, AI-native investment mandate agent built for X Layer (EVM Chain 196). It accepts natural-language directives from everyday chat platforms (WhatsApp, Telegram, Web Terminal) and calculates minimal-slippage rebalancing plans across tokenized equities.
                </p>
                <p className="text-ink-700 leading-relaxed">
                  Unlike conventional bots that demand full custodial control over user funds, Meirei strictly enforces an isolated computation model: preview quotes are generated freely, but on-chain settlement strictly requires a cryptographically verified 2FA OTP challenge.
                </p>
              </section>

              {/* Quickstart */}
              <section id="quickstart" className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
                <h2 className="font-display text-2xl font-bold text-ink-950">2. Conversational Syntax Examples</h2>
                <div className="space-y-3 font-mono text-xs">
                  <div className="rounded-xl bg-surface-100 p-4">
                    <p className="font-bold text-ink-900">Querying Spot Prices:</p>
                    <p className="text-accent-700 mt-1">&quot;What is the price of NVDAx?&quot; or &quot;Price of AAPLx&quot;</p>
                  </div>
                  <div className="rounded-xl bg-surface-100 p-4">
                    <p className="font-bold text-ink-900">Checking Live Wallet Holdings:</p>
                    <p className="text-accent-700 mt-1">&quot;Check balance&quot; or &quot;My portfolio&quot;</p>
                  </div>
                  <div className="rounded-xl bg-surface-100 p-4">
                    <p className="font-bold text-ink-900">Direct Stock Buy / Sell Orders:</p>
                    <p className="text-accent-700 mt-1">&quot;Buy 250 USDG of NVDAx&quot; or &quot;Sell 1 AAPLx&quot; or &quot;Exit TSLAx&quot;</p>
                  </div>
                  <div className="rounded-xl bg-surface-100 p-4">
                    <p className="font-bold text-ink-900">Multi-Asset Rebalancing Mandate:</p>
                    <p className="text-accent-700 mt-1">&quot;60% mag7, 20% USDG, max 8% single asset&quot;</p>
                  </div>
                </div>
              </section>

              {/* Allowlisted Assets */}
              <section id="assets" className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl font-bold text-ink-950">3. Allowlisted xStocks &amp; Stablecoins</h2>
                  <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold">20 Equities + 2 Cash · Chain 196</span>
                </div>
                <p className="text-ink-700 leading-relaxed text-sm">
                  Meirei strictly restricts trade execution to verified tokenized stocks and settlement stablecoins deployed on OKX X Layer (Chain ID 196). Non-allowlisted assets are rejected at intent parsing before quote generation:
                </p>
                <div className="overflow-x-auto rounded-xl border border-ink-200 bg-surface-50 p-2">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-ink-200 text-ink-500">
                        <th className="p-2 font-bold">Symbol</th>
                        <th className="p-2 font-bold">Name</th>
                        <th className="p-2 font-bold">Decimals</th>
                        <th className="p-2 font-bold">Contract Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 text-ink-800">
                      <tr><td className="p-2 font-bold text-ink-950">AAPLx</td><td className="p-2 font-sans">Apple xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">MSFTx</td><td className="p-2 font-sans">Microsoft xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x5621737f42dae558b81269fcb9e9e70c19aa6b35</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">NVDAx</td><td className="p-2 font-sans">NVIDIA xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0xc845b2894dbddd03858fd2d643b4ef725fe0849d</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">GOOGLx</td><td className="p-2 font-sans">Alphabet xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0xe92f673ca36c5e2efd2de7628f815f84807e803f</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">AMZNx</td><td className="p-2 font-sans">Amazon.com xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x3557ba345b01efa20a1bddc61f573bfd87195081</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">METAx</td><td className="p-2 font-sans">Meta xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x96702be57cd9777f835117a809c7124fe4ec989a</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">TSLAx</td><td className="p-2 font-sans">Tesla xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">COINx</td><td className="p-2 font-sans">Coinbase xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x1d5338302f3dd78f7aa9580bc53c4d445ec6ba25</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">SPYx</td><td className="p-2 font-sans">S&amp;P 500 ETF xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x42f7461c360980ff62c3e1db6aa5229c15d48721</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">QQQx</td><td className="p-2 font-sans">Invesco QQQ xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x71c50b69107cc6ea56795f54070a7f1a8c9e5033</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">AMDx</td><td className="p-2 font-sans">AMD xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x89e13b8602b9ff9b867cfae4f8d55d71fa8430e2</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">CRWDx</td><td className="p-2 font-sans">CrowdStrike xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x3a4b69c5819772bf258b3506c74ad64a787965df</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">MSTRx</td><td className="p-2 font-sans">MicroStrategy xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x7b58c9320b92f72bc97e79391ab1a457492c13fa</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">TSMx</td><td className="p-2 font-sans">Taiwan Semiconductor</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x2a946b5d92e8c614efabcf6e1598da4c4e7926b1</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">AVGOx</td><td className="p-2 font-sans">Broadcom xStock</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x6f31b87a912852643a6d71ec9103cba7e48df528</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">INTCx</td><td className="p-2 font-sans">Intel Corporation</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x18c4b726ae0d4f5b2f67ea9a36729a571c8901eb</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">MUx</td><td className="p-2 font-sans">Micron Technology</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x91d3e74a812b704c356da7fe63098514ef1a52fc</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">MRVLx</td><td className="p-2 font-sans">Marvell Technology</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x48e1c67d301ba593fa88d5e4905cf71286b24a35</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">IWMx</td><td className="p-2 font-sans">Russell 2000 ETF</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x3c71a54b9d0263f1ec78b4a8e0380c5984cf7632</td></tr>
                      <tr><td className="p-2 font-bold text-ink-950">DELLx</td><td className="p-2 font-sans">Dell Technologies</td><td className="p-2">18</td><td className="p-2 text-ink-600">0x83e5fa62d908e234bc5719ab4c5770df594e9b7a</td></tr>
                      <tr><td className="p-2 font-bold text-amber-700">USDG</td><td className="p-2 font-sans">Global Dollar (Settlement)</td><td className="p-2 font-bold text-amber-700">6</td><td className="p-2 text-ink-600">0x4ae46a509f6b1d9056937ba4500cb143933d2dc8</td></tr>
                      <tr><td className="p-2 font-bold text-amber-700">USDC</td><td className="p-2 font-sans">USD Coin (Secondary)</td><td className="p-2 font-bold text-amber-700">6</td><td className="p-2 text-ink-600">0xb6ceceab302e2e4948951ee7843fc24e92933061</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Security & 2FA Architecture */}
              <section id="otp-architecture" className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
                <h2 className="font-display text-2xl font-bold text-ink-950">4. 2FA Cryptographic Authorization Barrier</h2>
                <p className="text-ink-700 leading-relaxed">
                  Every trade confirmation requires passing an ephemeral challenge. The workflow operates as follows:
                </p>
                <ol className="list-decimal pl-6 space-y-2 text-ink-700">
                  <li><strong>Preview Request:</strong> Client receives price quote and price impact estimate.</li>
                  <li><strong>Challenge Minting:</strong> Upon confirming order, server emits <code>type: &quot;otp_required&quot;</code> and creates a 6-digit challenge in memory (5-minute TTL, max 3 attempts).</li>
                  <li><strong>Verification:</strong> Client submits code to <code>/api/auth/otp</code>. When valid, a signed authorization token is issued.</li>
                  <li><strong>Atomic Broadcast:</strong> Client sends authorization token with confirm request. Execution runs via OKX DEX Aggregator on X Layer (chain 196).</li>
                </ol>
              </section>

              {/* Token Validation Details */}
              <section id="token-validation" className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
                <h2 className="font-display text-2xl font-bold text-ink-950">5. HMAC-SHA256 Token Validation</h2>
                <p className="text-ink-700 leading-relaxed text-sm">
                  Authorization tokens granted by <code>/api/auth/otp</code> use HMAC-SHA256 signatures to prevent replay and forgery. Each token is strictly bound to the specific wallet address, timestamp, and challenge ID:
                </p>
                <div className="rounded-xl bg-ink-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto space-y-2">
                  <p className="text-ink-400">// Token Structure</p>
                  <p>token = base64Url(payload) + &quot;.&quot; + hex(hmacSha256(payload, secret))</p>
                  <p className="pt-2 text-ink-400">// Invariants &amp; Security Checks</p>
                  <p>• Constant-time timingSafeEqual comparison prevents timing side-channels.</p>
                  <p>• Strict 5-minute validity window (expired tokens rejected with HTTP 401).</p>
                  <p>• Challenge IDs are single-use and invalidated immediately upon successful redemption.</p>
                </div>
              </section>

              {/* API Reference */}
              <section className="space-y-6 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8 shadow-xs">
                <h2 className="font-display text-2xl font-bold text-ink-950">6. API Reference</h2>

                <div className="space-y-8 font-mono text-xs">
                  <div id="api-chat" className="scroll-mt-28">
                    <h3 className="font-sans font-bold text-sm text-ink-900 mb-1">POST /api/chat</h3>
                    <p className="font-sans text-xs text-ink-600 mb-2">Process natural language prompts, quotes, or trade executions.</p>
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

                  <div id="api-otp" className="scroll-mt-28">
                    <h3 className="font-sans font-bold text-sm text-ink-900 mb-1">POST /api/auth/otp</h3>
                    <p className="font-sans text-xs text-ink-600 mb-2">Generate and verify 6-digit 2FA authorization challenges.</p>
                    <pre className="rounded-xl bg-ink-950 p-4 text-emerald-400 overflow-x-auto">
{`// Step 1: Request Challenge
{ "action": "request", "identifier": "0x7f17..." }

// Response: { "ok": true, "challengeId": "otp_...", "expiresAt": 1789633747479 }

// Step 2: Verify Code
{ "action": "verify", "challengeId": "otp_...", "code": "313987" }

// Response: { "ok": true, "otpToken": "eyJhbGci..." }`}
                    </pre>
                  </div>

                  <div id="api-news" className="scroll-mt-28">
                    <h3 className="font-sans font-bold text-sm text-ink-900 mb-1">GET /api/news</h3>
                    <p className="font-sans text-xs text-ink-600 mb-2">Fetch live market catalysts and AI impact analyses for tokenized equities.</p>
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
