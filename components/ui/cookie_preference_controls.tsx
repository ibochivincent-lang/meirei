"use client";

import { useState, useEffect } from "react";

/**
 * Cookie Preference Controls
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Allows users to inspect active cookie consent status, open the consent modal,
 * or reset their preferences instantly.
 */
export function CookiePreferenceControls() {
  const [consentStatus, setConsentStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("meirei_cookie_consent");
      setConsentStatus(stored || "Not yet configured");
    } catch {
      setConsentStatus("Unknown");
    }
  }, []);

  const openBanner = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("meirei:open-cookies"));
    }
  };

  const resetPreferences = () => {
    try {
      localStorage.removeItem("meirei_cookie_consent");
      setConsentStatus("Reset (Unset)");
      setMessage("Preferences cleared. Re-opening cookie consent modal...");
      setTimeout(() => {
        openBanner();
        setMessage(null);
      }, 600);
    } catch {
      setMessage("Unable to clear local storage.");
    }
  };

  return (
    <div className="rounded-2xl border border-ink-200 dark:border-zinc-800 bg-white dark:bg-[#11141D] p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400">
            Active Preference State
          </span>
          <h3 className="font-display text-base font-bold text-ink-900 dark:text-white mt-0.5">
            Current Status: <span className="text-accent-500 capitalize">{consentStatus || "Loading..."}</span>
          </h3>
          <p className="text-xs text-ink-500 dark:text-zinc-400 mt-1">
            You can re-open the cookie banner or reset your choices at any time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={resetPreferences}
            className="px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-surface-50 dark:bg-[#161B26] text-xs font-semibold text-ink-700 dark:text-zinc-200 hover:border-red-500 hover:text-red-500 transition-colors cursor-pointer"
          >
            Reset Choices
          </button>
          <button
            type="button"
            onClick={openBanner}
            className="px-4 py-2 rounded-xl bg-accent-500 text-white text-xs font-bold hover:bg-accent-600 transition-colors shadow-sm cursor-pointer"
          >
            Open Cookie Banner
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 border-t border-ink-100 dark:border-zinc-800 pt-2">
          {message}
        </p>
      )}
    </div>
  );
}
