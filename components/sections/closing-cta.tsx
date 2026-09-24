"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { MagneticCta } from "@/components/ui/magnetic-cta";
import { MaskReveal } from "@/components/interactive/mask-reveal";
import { Reveal } from "@/components/interactive/reveal";
import { SITE } from "@/lib/data/site";
import Image from "next/image";
import telegramIcon from "@/public/icons/telegram.svg";

export function ClosingCta() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 1, 1.02]);

  return (
    <section ref={ref} className="relative px-3 py-[60px] md:px-[72px]" style={{ backgroundImage: "url('/closing-cta-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="px-[20px] py-[80px] rounded-[32px] bg-white border border-ink-100 md:py-[120px] shadow-sm">
        <motion.div style={{ scale }} className="flex flex-col items-center">
          <MaskReveal
            as="h2"
            text="Open a chat. Send a message. That's it."
            accent="Send a message."
            className="max-w-[820px] justify-center text-center text-[32px] sm:text-[54px] lg:text-[80px] font-semibold leading-[1.02] tracking-[-0.02em] text-ink-900"
          />

          <Reveal delay={0.15}>
            <p className="mt-6 max-w-lg mx-auto text-lg md:text-xl leading-relaxed text-center text-ink-700">
              No seed phrases to memorize. No complex order books. Your portfolio
              comes online with conversational mandates settled directly on OKX X Layer.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="group mt-12 flex w-fit flex-col items-center justify-center gap-[10px] rounded-[18px] bg-accent-500 p-4 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-12px_rgb(255_91_62/0.55)]">
              <div className="overflow-hidden rounded-lg bg-white p-2 transition-transform duration-300 group-hover:scale-[1.03]">
                <Image src="/qrcode.svg" alt="Scan to launch Meirei on Telegram or Web" width={180} height={180} />
              </div>
              <p className="text-lg text-white font-medium">Scan to start on Telegram</p>
            </div>
          </Reveal>

          <Reveal delay={0.35}>
            <div className="mt-12 flex mx-auto w-fit flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-5">
              <MagneticCta
                href="/app"
                className="group relative isolate overflow-hidden flex items-center gap-2 rounded-full text-base md:text-lg md:!px-9 md:!py-4 shadow-accent transition-transform duration-300 hover:-translate-y-0.5"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                />
                Launch Web Terminal
              </MagneticCta>

              {SITE.telegramLink && (
                <MagneticCta
                  href={SITE.telegramLink}
                  target="_blank"
                  rel="noopener"
                  className="group relative isolate overflow-hidden flex items-center gap-2 rounded-full !bg-ink-900 text-base md:text-lg md:!px-7 md:!py-4 text-white transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                  />
                  <Image src={telegramIcon} alt="" width={18} height={18} />
                  Start on Telegram
                </MagneticCta>
              )}

              <MagneticCta
                href="/coming-soon"
                className="group relative isolate overflow-hidden !bg-ink-100 rounded-full text-sm md:text-base md:!px-6 md:!py-3.5 text-ink-700 hover:text-ink-900 border border-ink-200 transition-transform duration-300 hover:-translate-y-0.5"
              >
                <span className="flex items-center gap-2">
                  <span>WhatsApp</span>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">Coming Soon</span>
                </span>
              </MagneticCta>

              <MagneticCta
                href="/coming-soon"
                className="group relative isolate overflow-hidden !bg-ink-100 rounded-full text-sm md:text-base md:!px-6 md:!py-3.5 text-ink-700 hover:text-ink-900 border border-ink-200 transition-transform duration-300 hover:-translate-y-0.5"
              >
                <span className="flex items-center gap-2">
                  <span>Instagram</span>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">Coming Soon</span>
                </span>
              </MagneticCta>
            </div>
          </Reveal>
        </motion.div>
      </div>
    </section>
  );
}
