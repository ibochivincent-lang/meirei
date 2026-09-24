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
import { StockSelectorGrid } from "@/components/interactive/stock_selector_grid";
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
            heading='Your portfolio, one message away'
            description="Check your holdings, track weekly progress, and stay updated simply by providing your email or wallet address — no complex wallet extensions required."
            visual={<BalanceIllustration />}
            reverse
          />

          <FeatureSection
            index='3'
            heading='Rebalance with a single sentence'
            description="Say 'allocate 20% each into mag7 and usdg' and Meirei will calculate the diff and execute the necessary swaps instantly."
            visual={<ReceiveIllustration />}
          >
            <div className="mt-2 w-full">
              <StockSelectorGrid />
            </div>
          </FeatureSection>

          <FeatureSection
            index='4'
            heading='Talk naturally. Meirei understands'
            description="Connect in one tap and talk naturally. Ask live stock prices, check balances, or execute rebalance mandates with zero crypto friction."
            visual={<ContextIllustration />}
            reverse
          />
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
