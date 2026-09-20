import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BrandMark } from "@/components/ui/brand-mark";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand Assets & Identity | Meirei",
  description: "Official brand identity, design tokens, typography, and logo assets for Meirei.",
};

export default function BrandPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F6F5EE] dark:bg-surface-50 text-ink-900 dark:text-ink-100">
        <div className="border-b border-ink-200/60 dark:border-surface-200 pt-28 pb-14 px-6 sm:px-12 md:pt-36 md:pb-16">
          <div className="mx-auto max-w-[1400px]">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4820A] dark:text-amber-400">
              DESIGN SYSTEM & IDENTITY
            </span>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink-950 dark:text-ink-50 sm:text-5xl">
              Brand & Design Assets
            </h1>
            <p className="mt-3 max-w-2xl text-base text-ink-700 dark:text-ink-300 sm:text-lg">
              Official identity guidelines, color palettes, typographic hierarchy, and brand assets for the Meirei protocol. Authored by IboTV.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-6 py-14 sm:px-12 space-y-12">
          {/* Brand Mark Preview Card */}
          <section className="space-y-4 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-ink-50">Primary Brandmark</h2>
            <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
              The Meirei wordmark embodies typographic precision and authority. The Japanese kanji 命令 (&quot;mandate / directive&quot;) reflects algorithmic execution triggered by conversational intent.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-between rounded-xl bg-ink-950 p-8 text-white mt-4">
              <BrandMark />
              <span className="font-mono text-xs text-surface-50/60">Light on Dark / Primary SVG</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-between rounded-xl border border-ink-200 dark:border-surface-200 bg-surface-50 dark:bg-surface-200 p-8 text-ink-900 dark:text-ink-100 mt-2">
              <div className="scale-110 origin-left">
                <BrandMark />
              </div>
              <span className="font-mono text-xs text-ink-500 dark:text-ink-400">Dark on Light / Primary SVG</span>
            </div>
          </section>

          {/* Color Palette */}
          <section className="space-y-4 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-ink-50">Color Architecture</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 font-mono text-xs">
              <div className="space-y-2">
                <div className="h-20 rounded-xl border border-ink-200 dark:border-surface-300 shadow-xs" style={{ backgroundColor: "#F6F5EE" }} />
                <p className="font-bold text-ink-900 dark:text-ink-100">Parchment</p>
                <p className="text-ink-500 dark:text-ink-400">#F6F5EE</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-xl bg-ink-950 shadow-xs" />
                <p className="font-bold text-ink-900 dark:text-ink-100">Carbon Ink</p>
                <p className="text-ink-500 dark:text-ink-400">#0B0B0C</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-xl bg-[#C4820A] shadow-xs" />
                <p className="font-bold text-ink-900 dark:text-ink-100">Research Amber</p>
                <p className="text-ink-500 dark:text-ink-400">#C4820A</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-xl bg-emerald-600 shadow-xs" />
                <p className="font-bold text-ink-900 dark:text-ink-100">Settlement Green</p>
                <p className="text-ink-500 dark:text-ink-400">#059669</p>
              </div>
            </div>
          </section>

          {/* Typography */}
          <section className="space-y-4 rounded-2xl border border-ink-200 dark:border-surface-200 bg-white dark:bg-surface-100 p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-ink-50">Typographic Hierarchy</h2>
            <div className="space-y-4 text-sm mt-4">
              <div className="border-b border-ink-100 dark:border-surface-200 pb-3">
                <span className="font-mono text-xs text-ink-400 uppercase">Display Headings</span>
                <p className="font-display text-2xl font-medium text-ink-950 dark:text-ink-50 mt-1">Syne / Instrument Serif</p>
              </div>
              <div className="border-b border-ink-100 dark:border-surface-200 pb-3">
                <span className="font-mono text-xs text-ink-400 uppercase">Body & Interfaces</span>
                <p className="font-sans text-base text-ink-900 dark:text-ink-100 mt-1">Inter / SF Pro Display</p>
              </div>
              <div>
                <span className="font-mono text-xs text-ink-400 uppercase">Monospace & Numerical Telemetry</span>
                <p className="font-mono text-base font-bold text-ink-900 dark:text-ink-100 mt-1">JetBrains Mono</p>
              </div>
            </div>
          </section>

          {/* Attribution */}
          <section className="rounded-2xl border border-ink-200 dark:border-surface-200 bg-surface-100 dark:bg-surface-200 p-6 font-mono text-xs text-ink-700 dark:text-ink-300">
            <p className="font-bold text-ink-900 dark:text-ink-50 mb-1">Architecture & Design Ownership</p>
            <p>Designed, engineered, and formally verified by IboTV. All rights reserved.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
