import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-50 text-ink-900 flex flex-col items-center justify-center px-4 sm:px-6 py-16">
      <div className="max-w-lg w-full text-center space-y-6">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-900 shadow-xs">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span>404 · Channel / Resource Coming Soon</span>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-ink-900">
            Coming Soon
          </h1>
          <p className="text-sm sm:text-base text-ink-600 leading-relaxed max-w-md mx-auto">
            The requested page or channel is currently under Phase 2 development. WhatsApp and Instagram conversational integrations are in private testnet auditing. Our Web Terminal and Telegram assistant are live today on OKX X Layer.
          </p>
        </div>

        {/* Channel Status Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Web Terminal</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">LIVE</span>
            </div>
            <p className="text-xs text-emerald-700 mt-1.5">Interactive xStocks mandate terminal on OKX X Layer (Chain ID 196).</p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Telegram Bot</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">LIVE</span>
            </div>
            <p className="text-xs text-emerald-700 mt-1.5">Live inbound webhook with intent parsing and non-custodial signing links.</p>
          </div>

          <div className="p-4 rounded-xl border border-ink-200 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-ink-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>WhatsApp</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">PHASE 2</span>
            </div>
            <p className="text-xs text-ink-500 mt-1.5">Coming Soon. Scheduled for release following security audits.</p>
          </div>

          <div className="p-4 rounded-xl border border-ink-200 bg-white shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-ink-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Instagram</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">PHASE 2</span>
            </div>
            <p className="text-xs text-ink-500 mt-1.5">Coming Soon. Direct message mandate parsing undergoing validation.</p>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <Link
            href="/app"
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] gap-2 rounded-xl bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-600 transition-colors"
          >
            <span>Launch Web Terminal</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] rounded-xl border border-ink-200 bg-white px-6 py-2.5 text-sm font-semibold text-ink-700 hover:bg-surface-100 transition-colors"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
