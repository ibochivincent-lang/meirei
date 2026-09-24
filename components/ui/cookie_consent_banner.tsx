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
          className="fixed bottom-5 left-5 z-[99999] min-h-[44px] flex items-center gap-2.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-xs font-bold text-ink-900 shadow-xl hover:border-accent-500 hover:text-accent-600 transition-all cursor-pointer ring-1 ring-ink-100"
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
          className="fixed bottom-0 inset-x-0 z-[99999] border-t border-ink-200 bg-white text-ink-900 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-5 sm:p-7"
        >
          <div className="mx-auto max-w-7xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl text-sm">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="font-bold text-ink-900 text-base tracking-tight">
                  Cookie &amp; Non-Custodial Privacy Preferences
                </p>
                <span className="rounded-full bg-surface-100 border border-ink-200 px-2 py-0.5 text-[10px] font-mono text-ink-700">
                  X Layer Chain 196
                </span>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono text-emerald-800">
                  Zero Ad Trackers
                </span>
              </div>
              <p className="text-ink-600 leading-relaxed text-xs sm:text-sm">
                Meirei uses local browser storage strictly to safeguard your non-custodial sessions, manage 2FA OTP authorization gates, and store preferences. We never use advertising cookies, trackers, or commercial surveillance beacons. Read our{" "}
                <Link href="/cookies" className="underline text-accent-600 hover:text-accent-700 font-semibold">
                  Cookie Policy
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline text-accent-600 hover:text-accent-700 font-semibold">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 self-end lg:self-center">
              <Link
                href="/cookies"
                className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 rounded-xl border border-ink-200 bg-surface-50 text-xs font-semibold text-ink-700 hover:bg-surface-100 hover:text-ink-900 transition-colors"
              >
                Learn More
              </Link>
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-ink-200 bg-surface-50 text-xs font-semibold text-ink-700 hover:bg-surface-100 hover:text-ink-900 transition-colors cursor-pointer"
              >
                Essential Only
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-accent-500 text-white text-xs font-bold hover:bg-accent-600 transition-colors shadow-sm cursor-pointer"
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
