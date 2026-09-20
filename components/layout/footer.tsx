"use client";

import Link from "next/link";
import Image from "next/image";
import { BrandMark } from "@/components/ui/brand-mark";
import { SITE } from "@/lib/data/site";
import whatsappIcon from "@/public/icons/whatsapp.svg";
import telegramIcon from "@/public/icons/telegram.svg";

export function Footer() {
  const openCookiePreferences = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("meirei:open-cookies"));
    }
  };

  return (
    <footer className="bg-ink-900 py-16 text-surface-50">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-6">
          <BrandMark />
          <p className="max-w-md text-base md:text-lg leading-relaxed text-surface-50/60">
            Money, by message. Built for the way people already talk.
          </p>
          <p className="text-base text-surface-50/50">
            meirei is a service operated by {SITE.legalName}.
          </p>

          <div className="flex flex-col gap-3 pt-2 text-base text-surface-50/70">
            <a
              href={SITE.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 transition-colors hover:text-surface-50"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-500">
                <Image src={whatsappIcon} alt="" width={13} height={13} />
              </span>
              WhatsApp
            </a>
            {SITE.telegramLink && (
              <a
                href={SITE.telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 transition-colors hover:text-surface-50"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-50/10">
                  <Image src={telegramIcon} alt="" width={13} height={13} />
                </span>
                Telegram
              </a>
            )}
            {SITE.instagramLink && (
              <a
                href={SITE.instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 transition-colors hover:text-surface-50"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-white stroke-2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                  </svg>
                </span>
                Instagram
              </a>
            )}
          </div>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-12 sm:gap-20">
          {/* LEARN Column matching Image 1 */}
          <div className="space-y-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-surface-50/50">
              LEARN
            </p>
            <ul className="flex flex-col space-y-3 text-base text-surface-50/70">
              <li>
                <Link href="/docs" className="transition-colors hover:text-white">
                  Docs
                </Link>
              </li>
              <li>
                <Link href="/whitepaper" className="transition-colors hover:text-white">
                  Whitepaper
                </Link>
              </li>
              <li>
                <Link href="/docs/internals" className="transition-colors hover:text-white">
                  Internals
                </Link>
              </li>
              <li>
                <Link href="/research" className="transition-colors hover:text-white">
                  Research
                </Link>
              </li>
              <li>
                <Link href="/ecosystem" className="transition-colors hover:text-white">
                  Ecosystem
                </Link>
              </li>
              <li>
                <Link href="/brand" className="transition-colors hover:text-white">
                  Brand
                </Link>
              </li>
              <li>
                <Link href="/compliance" className="transition-colors hover:text-white">
                  Compliance
                </Link>
              </li>
              <li>
                <Link href={SITE.privacyUrl} className="transition-colors hover:text-white">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href={SITE.termsUrl} className="transition-colors hover:text-white">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="transition-colors hover:text-white">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* PLATFORM Column */}
          <div className="space-y-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-surface-50/50">
              PLATFORM
            </p>
            <ul className="flex flex-col space-y-3 text-base text-surface-50/70">
              <li>
                <Link href="/app" className="font-medium text-surface-50 transition-colors hover:text-white">
                  Simple Mode Terminal
                </Link>
              </li>
              <li>
                <Link href="/app" className="transition-colors hover:text-white">
                  Advanced Mode (Advisor & Catalysts)
                </Link>
              </li>
              <li>
                <a
                  href="https://www.okx.com/web3/explorer/xlayer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-white"
                >
                  X Layer Explorer ↗
                </a>
              </li>
              <li>
                <Link href={SITE.dataDeletionUrl} className="transition-colors hover:text-white">
                  Data Deletion
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openCookiePreferences}
                  className="text-left transition-colors hover:text-white cursor-pointer"
                >
                  Cookie Preferences
                </button>
              </li>
              {SITE.twitterUrl && (
                <li>
                  <a
                    href={SITE.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-white"
                  >
                    Twitter / X
                  </a>
                </li>
              )}
            </ul>
          </div>
        </nav>
      </div>

      <div className="mt-12 border-t border-surface-50/10">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 pt-8 text-sm text-surface-50/40">
          <span>
            © {new Date().getFullYear()} {SITE.legalName}. All rights reserved.
          </span>
          <span className="font-mono">v0.2</span>
        </div>
      </div>
    </footer>
  );
}
