"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { BrandMark } from "@/components/ui/brand-mark";
import { MagneticCta } from "@/components/ui/magnetic-cta";
import { NAV_LINKS, SITE } from "@/lib/data/site";
import telegramIcon from "@/public/icons/telegram.svg";

export function Navbar() {
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.85]);
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 0.08]);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("meirei_theme", "light");
    }
  }, []);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close the sheet if the viewport grows past the mobile breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", mq.matches ? () => {} : onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b border-surface-200 bg-surface-50/95 backdrop-blur-md transition-colors px-[10px] sm:px-[72px]">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-4 sm:py-5">
        <Link href="/" aria-label="meirei - home" data-cursor="grow">
          <BrandMark />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-10 font-medium text-base text-ink-700">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="group relative transition-colors hover:text-ink-900"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-ink-900 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/cookies"
                className="group relative transition-colors hover:text-ink-900"
              >
                Cookies
              </Link>
            </li>
          </ul>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-900 bg-surface-0 px-4 py-2 text-sm font-semibold text-ink-900 transition-all hover:bg-ink-900 hover:text-white cursor-pointer min-h-[44px]"
          >
            <span>Launch app</span>
            <span className="text-xs font-bold leading-none">↗</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="relative grid h-11 w-11 place-items-center rounded-lg text-ink-900 transition-colors hover:bg-ink-900/5 active:bg-ink-900/10 cursor-pointer"
          >
            <span className="sr-only">Menu</span>
            <span aria-hidden="true" className="relative block h-4 w-5">
              <span
                className={`absolute left-0 right-0 top-0 h-[2px] rounded-full bg-current transition-transform duration-200 ${
                  open ? "translate-y-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-current transition-opacity duration-200 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-current transition-transform duration-200 ${
                  open ? "-translate-y-[7px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="md:hidden"
          >
            <nav
              aria-label="Mobile"
              className="border-t border-surface-200 bg-surface-50 shadow-lg"
            >
              <ul className="flex flex-col gap-1 px-6 py-4 font-semibold text-base text-ink-700">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-md py-3 min-h-[44px] flex items-center transition-colors hover:text-ink-900"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link
                    href="/cookies"
                    onClick={() => setOpen(false)}
                    className="block rounded-md py-3 min-h-[44px] flex items-center transition-colors hover:text-ink-900"
                  >
                    Cookies &amp; Privacy
                  </Link>
                </li>
                <li className="pt-3">
                  <MagneticCta
                    href="/app"
                    onClick={() => setOpen(false)}
                    className="min-h-[44px] flex items-center justify-center"
                  >
                    Launch app ↗
                  </MagneticCta>
                </li>
                {SITE.telegramLink && (
                  <li className="pt-3">
                    <MagneticCta
                      href={SITE.telegramLink}
                      target="_blank"
                      rel="noopener"
                      className="!bg-ink-900 min-h-[44px] flex items-center justify-center"
                    >
                      Chat on Telegram
                    </MagneticCta>
                  </li>
                )}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
