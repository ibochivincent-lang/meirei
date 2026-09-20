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
      <div className="px-[20px] py-[80px] rounded-[32px] bg-white dark:bg-surface-50 dark:border dark:border-surface-200 md:py-[120px]">
        <motion.div style={{ scale }} className="flex flex-col items-center">
          <MaskReveal
            as="h2"
            text="Open a chat. Send a message. That's it."
            accent="Send a message."
            className="max-w-[820px] justify-center text-center text-[32px] sm:text-[54px] lg:text-[80px] font-semibold leading-[1.02] tracking-[-0.02em] text-ink-900 dark:text-ink-50"
          />

          <Reveal delay={0.15}>
            <p className="mt-6 max-w-lg mx-auto text-lg md:text-xl leading-relaxed text-center text-ink-700 dark:text-ink-300">
              No download. No signup form. No menus to memorize. Your wallet
              comes online the moment you say hello, on whichever app you
              already have open.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="group mt-12 flex w-fit flex-col items-center justify-center gap-[10px] rounded-[18px] bg-accent-500 p-4 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-12px_rgb(255_91_62/0.55)]">
              <div className="overflow-hidden rounded-lg bg-white p-2 transition-transform duration-300 group-hover:scale-[1.03]">
                <Image src="/qrcode.svg" alt="Scan to open meirei on WhatsApp" width={180} height={180} />
              </div>
              <p className="text-lg text-white">Scan to start</p>
            </div>
          </Reveal>

          <Reveal delay={0.35}>
            <div className="mt-12 flex mx-auto w-fit flex-wrap items-center justify-center gap-4 md:gap-5">
              <MagneticCta
                href="/app"
                className="group relative isolate overflow-hidden flex items-center gap-2 rounded-full text-base md:text-lg md:!px-9 md:!py-4 shadow-accent transition-transform duration-300 hover:-translate-y-0.5"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                />
                Try the app
              </MagneticCta>

              <MagneticCta
                href={SITE.whatsappLink}
                target="_blank"
                rel="noopener"
                className="group relative isolate overflow-hidden !bg-black rounded-full text-base md:text-lg md:!px-7 md:!py-4 text-white transition-transform duration-300 hover:-translate-y-0.5"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                />
                Start on WhatsApp
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

              {SITE.instagramLink && (
                <MagneticCta
                  href={SITE.instagramLink}
                  target="_blank"
                  rel="noopener"
                  className="group relative isolate overflow-hidden flex items-center gap-2 rounded-full !bg-gradient-to-r !from-[#833AB4] !via-[#FD1D1D] !to-[#F77737] text-base md:text-lg md:!px-7 md:!py-4 text-white transition-transform duration-300 hover:-translate-y-0.5 shadow-sm"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  Start on Instagram
                </MagneticCta>
              )}
            </div>
          </Reveal>
        </motion.div>
      </div>
    </section>
  );
}
