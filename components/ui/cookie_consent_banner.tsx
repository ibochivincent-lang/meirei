"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("meirei_cookie_consent");
      if (!consent) {
        setShowBanner(true);
      }
    } catch {
      // In case localStorage is blocked by user
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem("meirei_cookie_consent", "all");
    } catch {}
    setShowBanner(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem("meirei_cookie_consent", "essential");
    } catch {}
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <aside
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 bg-ink-950/95 text-white backdrop-blur-md border-t border-ink-800 shadow-2xl"
    >
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl text-sm">
          <p className="font-semibold text-white">
            Transparent Privacy & Essential Cookie Notice
          </p>
          <p className="text-surface-50/80 leading-relaxed text-xs sm:text-sm">
            Meirei uses strictly necessary local storage to secure your non-custodial trading sessions, maintain 2FA authorization gates, and store accessibility settings. We do not use third-party advertising trackers or sell personal data. Read our{" "}
            <Link href="/cookies" className="underline hover:text-accent-400 font-medium">
              Cookie Policy
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-accent-400 font-medium">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="px-4 py-2 rounded-full border border-ink-700 bg-ink-900 text-xs font-semibold text-surface-50 hover:bg-ink-800 transition-colors cursor-pointer"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="px-5 py-2 rounded-full bg-white text-ink-950 text-xs font-bold hover:bg-surface-100 transition-colors shadow-xs cursor-pointer"
          >
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
}
