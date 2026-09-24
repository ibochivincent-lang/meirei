import Link from "next/link";
import { Reveal } from "@/components/interactive/reveal";
import { MaskReveal } from "@/components/interactive/mask-reveal";

export function RoadmapSection() {
  return (
    <section id="roadmap" className="relative border-b border-surface-200 bg-[#FAF9F5] py-20 px-6 sm:px-12 md:py-28">
      <div className="mx-auto max-w-[1400px]">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-100 border border-accent-300 px-3 py-1 font-mono text-xs uppercase tracking-wider text-accent-800 font-bold">
              <span>Market Evolution &amp; Growth</span>
            </div>
          </Reveal>
          <MaskReveal
            as="h2"
            text="Product Roadmap & Ecosystem Vision"
            className="mt-4 justify-center font-display text-3xl font-medium tracking-tight text-ink-950 sm:text-5xl md:text-6xl"
          />
          <Reveal delay={0.15}>
            <p className="mx-auto mt-6 max-w-3xl text-base md:text-xl leading-relaxed text-ink-700">
              Financial inclusion for everyone — old and young alike. We are bringing Wall Street equities directly to social media where billions of people already spend their time. From simple messaging onboarding to a global non-custodial mobile app, here is how Meirei scales on OKX X Layer (Chain 196).
            </p>
          </Reveal>
        </div>

        {/* 4-Stage Roadmap Cards */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 md:mt-20">
          {/* Phase 1 */}
          <Reveal delay={0.1}>
            <div className="h-full rounded-2xl border border-accent-300 bg-white p-6 shadow-xs relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase text-accent-700 tracking-wider">
                    Stage 01 · Active
                  </span>
                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Live
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-ink-950">
                  Social-First Identity &amp; Onboarding
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">
                  Live on Telegram (<strong>@MeireiXLayerBot</strong>) with WhatsApp in pipeline. Users stay updated and link identity simply by providing their email or wallet address — <strong>no browser extensions, no seed phrase barriers, zero friction</strong>.
                </p>
              </div>
              <div className="mt-6 border-t border-ink-100 pt-4 text-xs font-mono text-ink-500">
                Telegram Bot · Email &amp; Wallet Anchor · 100% Sponsored Gas
              </div>
            </div>
          </Reveal>

          {/* Phase 2 */}
          <Reveal delay={0.2}>
            <div className="h-full rounded-2xl border border-surface-200 bg-white p-6 shadow-xs relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase text-ink-500 tracking-wider">
                    Stage 02 · In Pipeline
                  </span>
                  <span className="rounded-full bg-accent-50 border border-accent-200 px-2 py-0.5 text-[10px] font-bold text-accent-700">
                    Next
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-ink-950">
                  Conversational Execution &amp; Weekly Progress
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">
                  Issue mandates directly in chat in plain words (e.g. <em>&quot;Put $50 into AAPLx monthly&quot;</em>). Receive automated weekly progress reports, PnL digests, and 1-word commands (<code>PAUSE</code>, <code>REPORT</code>, <code>STOP</code>) with complete user control.
                </p>
              </div>
              <div className="mt-6 border-t border-ink-100 pt-4 text-xs font-mono text-ink-500">
                Plain English Mandates · Automated Weekly Digests · 1-Word Controls
              </div>
            </div>
          </Reveal>

          {/* Phase 3 */}
          <Reveal delay={0.3}>
            <div className="h-full rounded-2xl border border-surface-200 bg-white p-6 shadow-xs relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase text-ink-500 tracking-wider">
                    Stage 03 · Operational
                  </span>
                  <span className="rounded-full bg-blue-100 border border-blue-300 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    Available
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-ink-950">
                  Institutional Web Terminal (/app)
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">
                  Dual operational modes: <strong>Basic Mode</strong> for quick buys and spot unit calculations with sponsored gas, alongside <strong>Advanced Mode</strong> with 4 integrated OKX AI skills (Trading Plan Generator, Sentiment, Smart Money, Market Feed).
                </p>
              </div>
              <div className="mt-6 border-t border-ink-100 pt-4 text-xs font-mono text-ink-500">
                20 xStocks on X Layer · 4 OKX AI Skills · EIP-2612 Gasless Permits
              </div>
            </div>
          </Reveal>

          {/* Phase 4 */}
          <Reveal delay={0.4}>
            <div className="h-full rounded-2xl border border-surface-200 bg-white p-6 shadow-xs relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase text-ink-500 tracking-wider">
                    Stage 04 · Vision
                  </span>
                  <span className="rounded-full bg-purple-100 border border-purple-300 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                    Scaling
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-ink-950">
                  Global Native Mobile App
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">
                  Native iOS &amp; Android applications featuring WebAuthn / FaceID biometric passkeys, instant local fiat-to-USDG onramps via OKX Pay / P2P, and real-time push telemetry for portfolio rebalance events.
                </p>
              </div>
              <div className="mt-6 border-t border-ink-100 pt-4 text-xs font-mono text-ink-500">
                iOS &amp; Android · FaceID Passkeys · Instant Fiat-to-USDG Onramps
              </div>
            </div>
          </Reveal>
        </div>

        {/* Strategic Importance to OKX & Marketing Strategy Grid */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {/* Card 1: Why Important to OKX */}
          <Reveal delay={0.15}>
            <div className="h-full rounded-3xl border border-ink-200 bg-white p-8 md:p-10 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-600 text-white font-mono text-base font-bold shadow-xs">
                  OKX
                </span>
                <div>
                  <span className="font-mono text-xs uppercase font-bold tracking-wider text-accent-700">
                    Ecosystem Value Driver
                  </span>
                  <h3 className="font-display text-2xl font-bold text-ink-950">
                    Why Meirei Is Critical for OKX
                  </h3>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm text-ink-700 leading-relaxed">
                <div className="flex items-start gap-3">
                  <span className="h-2 w-2 rounded-full bg-accent-600 mt-2 shrink-0" />
                  <p>
                    <strong>3.5+ Billion User Acquisition Funnel:</strong> Meets mainstream users on WhatsApp and Telegram, onboarding them directly onto OKX X Layer (Chain 196) without crypto complexity.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-2 w-2 rounded-full bg-accent-600 mt-2 shrink-0" />
                  <p>
                    <strong>Persistent TVL &amp; Spot Volume Flywheel:</strong> Recurring mandates settle in USDG/USDC and swap across the 20 tokenized equities, generating non-stop on-chain DEX volume.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-2 w-2 rounded-full bg-accent-600 mt-2 shrink-0" />
                  <p>
                    <strong>Showcase for OKX Onchain OS &amp; Paymaster:</strong> Live proof-of-concept of OKX AI Agent Service Provider (ASP) standards, Account Abstraction, and zero-gas execution.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-2 w-2 rounded-full bg-accent-600 mt-2 shrink-0" />
                  <p>
                    <strong>Inflation Hedge in Emerging Markets:</strong> Delivers accessible, dollar-denominated blue-chip equities to users facing domestic fiat inflation.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 2: Marketing Strategy */}
          <Reveal delay={0.25}>
            <div className="h-full rounded-3xl border border-ink-200 bg-white p-8 md:p-10 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white font-mono text-base font-bold shadow-xs">
                  GTM
                </span>
                <div>
                  <span className="font-mono text-xs uppercase font-bold tracking-wider text-ink-600">
                    Go-To-Market Execution
                  </span>
                  <h3 className="font-display text-2xl font-bold text-ink-950">
                    Marketing &amp; Growth Strategies
                  </h3>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm text-ink-700 leading-relaxed">
                <div className="flex items-start gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <p>
                    <strong>Viral Group Chat Integration:</strong> Community admins add @MeireiXLayerBot to group chats for instant stock quotes (<code>/price NVDAx</code>) and social mandate competitions.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <p>
                    <strong>&quot;Grandparent-Proof&quot; Video Campaigns:</strong> Relatable, 15-second social media clips showing young and old commanding Wall Street investments via chat: <em>&quot;If you can text, you can invest.&quot;</em>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <p>
                    <strong>OKX Trading Challenges:</strong> Partnering with OKX X Layer for seasonal mandate competitions, rewarding top risk-managed portfolios with sponsored USDG rewards.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 mt-2 shrink-0" />
                  <p>
                    <strong>Creator Mandate Templates:</strong> Financial creators publish verified allocation strategies (e.g. <em>&quot;AI Infrastructure Basket&quot;</em>) with 1-click execution links for their audiences.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* CTA Bar */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-full bg-accent-600 px-7 py-3.5 text-sm font-bold text-white shadow-xs transition-all hover:bg-accent-700 cursor-pointer"
          >
            <span>Launch Web Terminal (/app)</span>
            <span>→</span>
          </Link>
          <a
            href="https://t.me/MeireiXLayerBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-white px-7 py-3.5 text-sm font-bold text-sky-700 shadow-xs transition-all hover:bg-sky-50"
          >
            <span>Open Telegram Bot (@MeireiXLayerBot)</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
