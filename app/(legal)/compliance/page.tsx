import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Regulatory Compliance Architecture — Meirei",
  description:
    "Honest breakdown of Meirei's compliance architecture on OKX X Layer: what is implemented today, what is planned on the roadmap, and what is strictly out of scope.",
};

export default function CompliancePage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4 border-b border-ink-200/60 pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-600">
          Regulatory Architecture & Disclosures
        </p>
        <h1 className="font-display text-4xl font-normal text-ink-900 sm:text-5xl">
          Compliance & Operational Scope
        </h1>
        <p className="text-sm text-ink-500">
          Effective Date: September 2026 · Network: OKX X Layer (Chain ID 196)
        </p>
      </header>

      <section className="space-y-6">
        <div className="rounded-xl border border-ink-200 bg-surface-50 p-6 text-sm text-ink-700">
          <p>
            Meirei operates as an AI-assisted interface for executing self-directed investment mandates
            on OKX X Layer (Chain ID 196). Below is an honest, verified account of our technical
            controls, roadmap milestones, and operational boundaries.
          </p>
        </div>

        {/* Section 1: Implemented Today */}
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-ink-900 border-b border-ink-200/60 pb-2">
            1. What is Implemented Today
          </h2>
          <div className="legal-prose space-y-4 text-sm text-ink-800">
            <div>
              <h3 className="font-semibold text-ink-900 text-base">Non-Custodial Client-Side Signing</h3>
              <p>
                All on-chain transactions are signed exclusively on the client side through standard EOA
                wallets (OKX Wallet, MetaMask, or WalletConnect). Meirei servers never generate, store,
                or transmit private keys, seed phrases, or unencrypted signing credentials.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink-900 text-base">Sanctions Screening Prior to Quote Generation</h3>
              <p>
                Every wallet address is screened against the Chainalysis Sanctions Oracle and known OFAC
                Specially Designated Nationals (SDN) registries before any swap quote, calldata, or mandate
                is synthesized. Flagged addresses are immediately denied service.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink-900 text-base">Architectural LLM Boundary Enforcement</h3>
              <p>
                Natural language commands are strictly parsed into typed Zod intent schemas with bounded
                slippage, hard spend caps, and an immutable 10-token asset allowlist. The language model
                has zero discretionary authority to route to unlisted contracts or execute transfers.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink-900 text-base">Ephemeral Security State in Redis</h3>
              <p>
                High-frequency security state (account freezes, atomic idempotency deduplication with NX locks,
                and sliding-window rate limiting) is stored in Upstash Redis. Account freezes immediately block
                quote generation and message processing.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink-900 text-base">Durable Identity Linkage in Supabase</h3>
              <p>
                Supabase is utilized strictly for durable application state: mapping verified communication
                channels (email, WhatsApp, Telegram) to public EVM wallet addresses and maintaining audit
                trails. No financial secrets reside in the database.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: What is Planned */}
        <div className="space-y-4 pt-6">
          <h2 className="font-display text-2xl text-ink-900 border-b border-ink-200/60 pb-2">
            2. What is Planned (Roadmap)
          </h2>
          <div className="legal-prose space-y-4 text-sm text-ink-800">
            <div>
              <h3 className="font-semibold text-ink-900 text-base">ERC-4337 Account Abstraction & Passkey Signers</h3>
              <p>
                Transitioning from direct EOA signing to ERC-4337 smart accounts governed by WebAuthn
                (P-256) passkey signers. This will enable session keys with contract-level spend caps,
                removing seed phrases without introducing custody.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink-900 text-base">Cryptographic On-Chain Mandate Guardrails</h3>
              <p>
                Enforcing drawdown breakers, single-asset maximum weights, and daily expenditure caps
                directly inside smart contract session-key validators rather than relying exclusively on
                off-chain middleware verification.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink-900 text-base">Jurisdictional Licensing & Securities Legal Review</h3>
              <p>
                Engaging legal counsel to establish jurisdictional clarity regarding retail access to
                synthetic equity derivatives (xStocks) across key distribution markets, ensuring full
                regulatory alignment before expanding fiat on-ramps.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink-900 text-base">Automated Travel Rule & Institutional KYB</h3>
              <p>
                Integrating standardized VASP-to-VASP messaging protocols and automated identity
                verification for transactions exceeding applicable regulatory thresholds.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: What is Out of Scope */}
        <div className="space-y-4 pt-6">
          <h2 className="font-display text-2xl text-ink-900 border-b border-ink-200/60 pb-2">
            3. What is Out of Scope
          </h2>
          <div className="legal-prose space-y-4 text-sm text-ink-800">
            <div>
              <h3 className="font-semibold text-ink-900 text-base">Custodial Asset Holding</h3>
              <p>
                Meirei does not hold, pool, or custody user assets, stablecoins, or equity tokens. Users
                retain complete and sole custody of their private keys and assets at all times.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink-900 text-base">Internal Exchange Matching & Market Making</h3>
              <p>
                Meirei is not an exchange, broker-dealer, or market maker. All swaps and rebalancing operations
                route through decentralized automated market makers and aggregators on X Layer (Chain ID 196).
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ink-900 text-base">Discretionary Investment Management</h3>
              <p>
                Meirei does not exercise independent discretion over funds. The software acts purely as an
                automated execution translator for explicit, user-defined mandate rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-200/60 pt-6 text-xs text-ink-500">
        <p>
          Related legal documentation:{" "}
          <Link href="/terms" className="underline hover:text-ink-900">Terms of Service</Link> ·{" "}
          <Link href="/privacy" className="underline hover:text-ink-900">Privacy Policy</Link> ·{" "}
          <Link href="/cookies" className="underline hover:text-ink-900">Cookie Policy</Link>
        </p>
      </footer>
    </div>
  );
}
