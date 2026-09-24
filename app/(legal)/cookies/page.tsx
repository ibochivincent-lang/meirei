import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/data/site";
import { CookiePreferenceControls } from "@/components/ui/cookie_preference_controls";

export const metadata: Metadata = {
  title: "Cookie Policy | Meirei",
  description: "Learn how Meirei uses strictly essential cookies and local storage to deliver non-custodial trading on X Layer.",
};

const LAST_UPDATED = "September 20, 2026";

export default function CookiePolicyPage() {
  return (
    <div className="legal-prose text-ink-900 leading-relaxed font-sans max-w-3xl mx-auto py-12">
      <header className="mb-10 border-b border-ink-200 pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-700 font-bold">
          Compliance &amp; Transparency
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl font-bold text-ink-950">
          Cookie Policy
        </h1>
        <p className="mt-3 text-sm text-ink-500">Last updated: {LAST_UPDATED}</p>
      </header>

      {/* Interactive Cookie Preference Reset & Management Bar */}
      <div className="mb-10">
        <CookiePreferenceControls />
      </div>

      <section className="space-y-4 mb-8">
        <h2 className="font-display text-2xl font-bold text-ink-950">1. Overview</h2>
        <p className="text-ink-700">
          This Cookie Policy explains how {SITE.legalName} (&quot;Meirei&quot;, &quot;we&quot;, &quot;us&quot;) uses cookies and local browser storage on our website (<Link href="/" className="underline text-accent-700">meirei.app</Link>) and our trading terminal application (<Link href="/app" className="underline text-accent-700">meirei.app/app</Link>).
        </p>
        <p className="text-ink-700">
          We believe in radical user privacy. We do not sell user data, nor do we employ third-party advertising tracking cookies or surveillance beacons.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="font-display text-2xl font-bold text-ink-950">2. Categories of Storage We Use</h2>
        
        <div className="rounded-xl border border-ink-200 bg-white p-5 space-y-3 shadow-xs">
          <h3 className="font-bold text-base text-ink-950">A. Strictly Necessary &amp; Functional Storage</h3>
          <p className="text-sm text-ink-700">
            These items are vital for the terminal to function securely. Without them, you cannot authenticate, sign transactions, or retain session security:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs text-ink-700 font-mono">
            <li><code>meirei_otp_auth</code>: Ephemeral authorization session token verifying 2FA completion (10-minute validity).</li>
            <li><code>meirei_theme</code>: Stores your UI display preferences.</li>
            <li><code>meirei_cookie_consent</code>: Stores your cookie preference choices (essential or all).</li>
            <li><code>meirei_connected_wallet</code>: Cached non-custodial public EVM address for display purposes.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-ink-200 bg-white p-5 space-y-3 shadow-xs mt-4">
          <h3 className="font-bold text-base text-ink-950">B. Analytics &amp; Telemetry (Zero Third-Party Trackers)</h3>
          <p className="text-sm text-ink-700">
            We do not load third-party ad networks (e.g. Meta Pixel, Google AdSense, or data broker beacons). Minimal performance telemetry is anonymized and processed self-hosted to measure RPC latency and DEX aggregator swap success rates on OKX X Layer (Chain ID 196).
          </p>
        </div>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="font-display text-2xl font-bold text-ink-950">3. Managing and Disabling Cookies</h2>
        <p className="text-ink-700">
          You can adjust or revoke your cookie choices at any time via the Cookie Consent Banner or through your browser settings. If you block all local storage, core trading features that require ephemeral 2FA authorization tokens will be unable to persist state between preview quotes and execution.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="font-display text-2xl font-bold text-ink-950">4. Contact &amp; Data Protection Officer</h2>
        <p className="text-ink-700">
          For questions regarding our privacy practices or cookie management, please write to our Data Protection compliance team at:
        </p>
        <div className="rounded-xl bg-surface-100 border border-ink-200 p-4 font-mono text-sm text-ink-800">
          <p className="font-bold text-ink-950">{SITE.legalName}</p>
          <p>Email: legal@meirei.app</p>
          <p>Inquiries: privacy@meirei.app</p>
        </div>
      </section>
    </div>
  );
}
