import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Coming Soon · WhatsApp & Instagram Channels | Meirei",
  description:
    "WhatsApp and Instagram automated mandate execution channels are currently undergoing Phase 2 security audits. Experience live portfolio management today via our Web Terminal.",
};

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-surface-50 text-ink-900 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-900 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Phase 2 Expansion Roadmap</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-ink-900">
            WhatsApp &amp; Instagram Coming Soon
          </h1>

          <p className="text-sm sm:text-base text-ink-600 leading-relaxed max-w-lg mx-auto">
            To maintain institutional security, prevent social engineering vulnerabilities, and verify transaction-bound OTP challenge gates, WhatsApp and Instagram channels are undergoing Phase 2 audits before general release.
          </p>

          <div className="p-5 sm:p-6 rounded-2xl border border-ink-200 bg-white shadow-xs text-left space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">Live Channels Today</h3>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-50 border border-ink-100">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-ink-900">Web Terminal (Chain 196)</div>
                  <div className="text-xs text-ink-500">Full conversational interface with OKX Wallet &amp; EOA signing</div>
                </div>
              </div>
              <Link
                href="/app"
                className="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 text-xs font-bold text-accent-500 hover:text-accent-600 px-3 py-1.5 rounded-lg border border-accent-500/20 sm:border-0"
              >
                Launch Terminal &rarr;
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-50 border border-ink-100">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-ink-900">Telegram Bot (@MeireiXLayerBot)</div>
                  <div className="text-xs text-ink-500">Live conversational parser, portfolio telemetry &amp; OTP signing gates</div>
                </div>
              </div>
              <a
                href="https://t.me/MeireiXLayerBot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 text-xs font-bold text-ink-900 hover:text-accent-500 px-3 py-1.5 rounded-lg border border-ink-200 sm:border-0"
              >
                Open Telegram &rarr;
              </a>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] gap-2 rounded-xl bg-accent-500 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-accent-600 transition-colors"
            >
              <span>Explore Web Terminal</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] rounded-xl border border-ink-200 bg-white px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-surface-100 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
