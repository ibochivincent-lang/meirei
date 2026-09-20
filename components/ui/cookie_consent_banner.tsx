"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * Cookie Consent Banner & Floating Preferences Widget
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Solid high-contrast dark design with zero transparency bleed.
 * Provides instant persistent access to cookie preferences via floating trigger
 * and footer custom event dispatch.
 */
export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [consentStatus, setConsentStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("meirei_cookie_consent");
      setConsentStatus(consent);
      if (!consent) {
        setShowBanner(true);
      }
    } catch {
      setShowBanner(true);
    }

    const handleOpenBanner = () => {
      setShowBanner(true);
    };

    window.addEventListener("meirei:open-cookies", handleOpenBanner);
    window.addEventListener("open-cookie-banner", handleOpenBanner);
    return () => {
      window.removeEventListener("meirei:open-cookies", handleOpenBanner);
      window.removeEventListener("open-cookie-banner", handleOpenBanner);
    };
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem("meirei_cookie_consent", "all");
    } catch {}
    setConsentStatus("all");
    setShowBanner(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem("meirei_cookie_consent", "essential");
    } catch {}
    setConsentStatus("essential");
    setShowBanner(false);
  };

  return (
    <>
      {/* Floating Persistent Cookie Trigger Button (Always visible when banner is closed) */}
      {!showBanner && (
        <button
          type="button"
          onClick={() => setShowBanner(true)}
          aria-label="Manage Cookie & Privacy Preferences"
          title="Manage Cookie & Privacy Preferences"
          className="fixed bottom-5 left-5 z-[99999] flex items-center gap-2.5 rounded-full border border-zinc-700 bg-[#0B0E14] px-4 py-2 text-xs font-bold text-zinc-100 shadow-2xl hover:border-accent-500 hover:bg-[#161B26] hover:text-white transition-all cursor-pointer ring-1 ring-white/10"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Cookies &amp; Privacy</span>
        </button>
      )}

      {/* Main Cookie Consent Banner */}
      {showBanner && (
        <aside
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-0 inset-x-0 z-[99999] border-t-2 border-zinc-800 bg-[#0B0E14] text-white shadow-[0_-20px_50px_rgba(0,0,0,0.85)] p-5 sm:p-7"
        >
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl text-sm">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="font-bold text-white text-base tracking-tight">
                  Cookie &amp; Non-Custodial Privacy Preferences
                </p>
                <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                  X Layer Chain 196
                </span>
                <span className="rounded-full bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  Zero Ad Trackers
                </span>
              </div>
              <p className="text-zinc-300 leading-relaxed text-xs sm:text-sm">
                Meirei uses local browser storage strictly to safeguard your non-custodial sessions, manage 2FA OTP authorization gates, and store theme settings. We never use advertising cookies, trackers, or commercial surveillance beacons. Read our{" "}
                <Link href="/cookies" className="underline text-accent-400 hover:text-accent-300 font-semibold">
                  Cookie Policy
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline text-accent-400 hover:text-accent-300 font-semibold">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 self-end lg:self-center">
              <Link
                href="/cookies"
                className="px-3.5 py-2 rounded-xl border border-zinc-700 bg-[#161B26] text-xs font-semibold text-zinc-300 hover:bg-[#202736] hover:text-white transition-colors"
              >
                Learn More
              </Link>
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="px-4 py-2 rounded-xl border border-zinc-700 bg-[#161B26] text-xs font-semibold text-zinc-200 hover:bg-[#202736] hover:text-white transition-colors cursor-pointer"
              >
                Essential Only
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-5 py-2 rounded-xl bg-accent-500 text-white text-xs font-bold hover:bg-accent-600 transition-colors shadow-md cursor-pointer"
              >
                Accept All
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
