import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/sections/hero";
import { Reveal } from "@/components/interactive/reveal";
import { MaskReveal } from "@/components/interactive/mask-reveal";
import { FeatureSection } from "@/components/sections/feature-section";
import { SecuritySection } from "@/components/sections/security-section";
import { UseCasesSection } from "@/components/sections/use-cases-section";
import { FaqSection } from "@/components/sections/faq-section";
import { ClosingCta } from "@/components/sections/closing-cta";
import { HowItWorksWrapper } from "@/components/sections/how-it-works-wrapper";
import { LiveAgentFeature } from "@/components/interactive/live_agent_feature";
import {
  BalanceIllustration,
  ReceiveIllustration,
  ContextIllustration,
} from "@/components/illustrations/feature-illustrations";

import { ResearchSpotlight } from "@/components/sections/research_spotlight";
import { LiquidityRoutingSection } from "@/components/sections/liquidity-routing-section";
import { RoadmapSection } from "@/components/sections/roadmap-section";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ResearchSpotlight />

        <HowItWorksWrapper>
          {/* Sticky header — pins below the navbar while the feature cards stack underneath */}
          <div id="how-it-works" className="relative z-10 bg-[#FFF5F2] md:sticky md:top-[72px]">
            <div className="mx-auto max-w-[1440px] px-3 pb-6 pt-5 md:px-[72px] md:pt-10">
              <MaskReveal
                as="h2"
                text="How it works"
                className="max-w-[760px] font-display text-[32px] md:text-[52px] lg:text-[60px] font-medium leading-[1.04] tracking-[-0.02em] text-black"
              />
              <Reveal delay={0.15}>
                <p className="mt-4 max-w-[680px] text-base leading-relaxed text-ink-700 md:text-xl">
                  Financial inclusion for everyone — old and young alike. Bridging billions of everyday social media users to tokenized equities on OKX X Layer. Issue mandates anywhere, receive automated weekly progress updates, and stay in complete control.
                </p>
              </Reveal>
            </div>
          </div>

          <LiveAgentFeature />

          <FeatureSection
            index='2'
            heading='Stay updated with your portfolio & active mandates'
            description="Stay updated with the latest happenings in your portfolio and what our mandate is doing 24/7. We want to be part of your everyday life and everyday app use — always staying connected on Telegram, WhatsApp, or Web to deliver seamless portfolio tracking and automated weekly updates without complex wallet friction."
            visual={<BalanceIllustration />}
            reverse
          >
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <div className="rounded-xl border border-ink-200/80 bg-surface-50 p-3.5 shadow-2xs">
                <span className="font-mono text-xs font-bold text-accent-700">Everyday App Connected</span>
                <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                  Part of your everyday life and daily messaging apps. Receive automated portfolio progress, mandate execution logs, and live balance updates.
                </p>
              </div>
              <div className="rounded-xl border border-ink-200/80 bg-surface-50 p-3.5 shadow-2xs">
                <span className="font-mono text-xs font-bold text-accent-700">Latest Mandate Happenings</span>
                <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                  Real-time visibility into what your mandate is doing: automated drift rebalances, stop-loss protection triggers, and dollar accumulation.
                </p>
              </div>
            </div>
          </FeatureSection>

          <FeatureSection
            index='3'
            heading='Rebalance with a single sentence & autonomous AI'
            description="We show you the latest news, real-time market catalysts, and operate an autonomous AI trading agent on OKX X Layer. Say 'allocate 20% each into mag7 and usdg' and Meirei will synthesize market news, calculate the portfolio diff, and execute the necessary swaps instantly."
            visual={<ReceiveIllustration />}
          >
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <div className="rounded-xl border border-ink-200/80 bg-surface-50 p-3.5 shadow-2xs">
                <span className="font-mono text-xs font-bold text-accent-700">Autonomous AI Trading Agent</span>
                <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                  Acts as your tireless 24/7 autonomous trading co-pilot on OKX X Layer (Chain 196) with sponsored gas and instant execution.
                </p>
              </div>
              <div className="rounded-xl border border-ink-200/80 bg-surface-50 p-3.5 shadow-2xs">
                <span className="font-mono text-xs font-bold text-accent-700">Latest Market News & Intelligence</span>
                <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                  Shows you the latest breaking news and institutional signals to continuously guide algorithmic rebalancing and drift prevention.
                </p>
              </div>
            </div>
          </FeatureSection>

          <FeatureSection
            index='4'
            heading='Talk naturally in any form. Meirei understands'
            description="Talk naturally in any form of way — we understand you. Meirei understands every word you say in different languages. We currently support English, Spanish, Chinese, Japanese, and are actively adding more languages so anyone worldwide can invest with zero crypto friction."
            visual={<ContextIllustration />}
            reverse
          >
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <div className="rounded-xl border border-ink-200/80 bg-surface-50 p-3.5 shadow-2xs">
                <span className="font-mono text-xs font-bold text-accent-700">Multilingual NLP Engine</span>
                <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                  Understands every word you say across English, Español, 中文, and 日本語. No crypto jargon, technical hex, or complex setups required.
                </p>
              </div>
              <div className="rounded-xl border border-ink-200/80 bg-surface-50 p-3.5 shadow-2xs">
                <span className="font-mono text-xs font-bold text-accent-700">More Languages Being Added</span>
                <p className="mt-1 text-xs text-ink-600 leading-relaxed">
                  Expanding rapidly to French, German, Korean, Vietnamese, and Arabic to bring financial inclusion to billions across the globe.
                </p>
              </div>
            </div>
          </FeatureSection>
        </HowItWorksWrapper>

        <SecuritySection />
        <LiquidityRoutingSection />
        <UseCasesSection />
        <RoadmapSection />
        <FaqSection />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
