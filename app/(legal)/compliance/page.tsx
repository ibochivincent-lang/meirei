import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "International Regulatory Compliance & Standards — Meirei",
  description:
    "Comprehensive disclosure of Meirei's adherence to international standards, including FATF Travel Rule, OFAC sanctions screening, tiered KYC/AML policies, and non-custodial smart contract custody on X Layer.",
};

export default function CompliancePage() {
  return (
    <div className="space-y-12">
      <header className="space-y-4 border-b border-ink-200/60 pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-600">
          Regulatory Architecture
        </p>
        <h1 className="font-display text-4xl font-normal text-ink-900 sm:text-5xl">
          International Compliance & Standards
        </h1>
        <p className="text-sm text-ink-500">
          Effective Date: September 17, 2026 · Author: IboTV · Version 2.4
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-ink-900">
          1. Global Regulatory Framework Overview
        </h2>
        <div className="legal-prose space-y-3">
          <p>
            Meirei operates as an autonomous, AI-native investment mandate routing agent
            deployed on OKX Chain (X Layer, Chain ID 196). We are committed to strict
            compliance with international regulatory standards, financial crime prevention
            protocols, and non-custodial security principles.
          </p>
          <p>
            Our compliance architecture is designed in alignment with guidelines from the
            Financial Action Task Force (FATF), the United States Office of Foreign Assets Control
            (OFAC), the European Union Anti-Money Laundering Directives (AMLD 5/6), the UK Financial
            Conduct Authority (FCA) guidance on automated financial advisory algorithms, and global
            data protection mandates (EU GDPR and NDPA).
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-ink-900">
          2. Non-Custodial Architecture & Private Key Governance
        </h2>
        <div className="legal-prose space-y-3">
          <p>
            <strong>Strict Non-Custodial Principle:</strong> Meirei does not hold, manage,
            store, or have access to user private keys, recovery seed phrases, or unencrypted
            signing material at any point in its operation.
          </p>
          <ul>
            <li>
              <strong>Key Storage Location:</strong> All cryptographic signing keys remain
              exclusively within the user&apos;s own OKX Layer wallet, WebAuthn Passkey secure enclave,
              or self-hosted signer.
            </li>
            <li>
              <strong>Database Separation:</strong> The Meirei database only maintains a linkage
              between the user&apos;s verified email (the universal identity anchor across WhatsApp,
              Telegram, and Web sessions) and their public X Layer EVM address (e.g., 0x...).
            </li>
            <li>
              <strong>Smart Contract Execution:</strong> Every asset allocation, swap, or rebalance
              requires explicit cryptographic authorization via signed ERC-4337 UserOperations or
              2FA challenge proofs. Meirei algorithms cannot execute unilateral transfers or withdraw
              funds to unauthorized external destinations.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-ink-900">
          3. Know Your Customer (KYC) & Verification Tiers
        </h2>
        <div className="legal-prose space-y-3">
          <p>
            To balance financial inclusion with global anti-money laundering requirements, Meirei
            implements a risk-based, tiered verification framework:
          </p>
          <div className="overflow-x-auto rounded-xl border border-ink-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-100 text-ink-900 font-semibold border-b border-ink-200">
                <tr>
                  <th className="p-3">Tier Level</th>
                  <th className="p-3">Verification Required</th>
                  <th className="p-3">24-Hour Spending Cap</th>
                  <th className="p-3">Eligible Capabilities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200/60 bg-white text-ink-700">
                <tr>
                  <td className="p-3 font-semibold text-ink-900">Tier 0 (Read-Only)</td>
                  <td className="p-3">Public session / No credentials</td>
                  <td className="p-3 font-mono">$0 USDG</td>
                  <td className="p-3">Market research, catalyst inspection, chart visualization</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-ink-900">Tier 1 (Standard)</td>
                  <td className="p-3">Verified Email + Multi-Channel 2FA (OTP/Passkey)</td>
                  <td className="p-3 font-mono">$2,500 USDG / day</td>
                  <td className="p-3">Simple Mode trades, natural language mandates, social bot</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-ink-900">Tier 2 (Advanced)</td>
                  <td className="p-3">Government ID + Automated Liveness + Address</td>
                  <td className="p-3 font-mono">$25,000 USDG / day</td>
                  <td className="p-3">Institutional Advisory Studio, momentum rebalancing, API webhooks</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-ink-900">Tier 3 (Institutional)</td>
                  <td className="p-3">Corporate Entity KYB + UBO Review + Source of Funds</td>
                  <td className="p-3 font-mono">Custom / $250,000+ USDG</td>
                  <td className="p-3">Unlimited mandate band execution, custom liquidity routes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-ink-900">
          4. FATF Travel Rule Compliance (Recommendation 16)
        </h2>
        <div className="legal-prose space-y-3">
          <p>
            In compliance with Financial Action Task Force (FATF) Recommendation 16 for Virtual
            Asset Service Providers (VASPs) and cross-border transactions:
          </p>
          <ul>
            <li>
              Transactions exceeding 1,000 USDG or national thresholds transmit originator and
              beneficiary metadata through standardized, encrypted inter-VASP protocols.
            </li>
            <li>
              Counterparty wallet addresses are screened against known unhosted wallet criteria and
              verified institutional liquidity pools before order settlement on X Layer.
            </li>
            <li>
              Audit logs of transactional metadata are immutably retained in tamper-evident storage
              for five (5) years in compliance with international statute of limitations.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-ink-900">
          5. Sanctions Screening & Prohibited Jurisdictions
        </h2>
        <div className="legal-prose space-y-3">
          <p>
            Meirei employs automated, real-time sanctions screening across all incoming messaging
            interactions and smart contract interactions. We cross-reference addresses and counterparty
            data against:
          </p>
          <ul>
            <li>US Office of Foreign Assets Control (OFAC) Specially Designated Nationals (SDN) list.</li>
            <li>United Nations Security Council Sanctions Committee lists.</li>
            <li>European Union Consolidated Financial Sanctions List.</li>
            <li>UK HM Treasury Sanctions List.</li>
          </ul>
          <p>
            Users located in, organized under, or resident of sanctioned jurisdictions (including Cuba,
            Iran, North Korea, Syria, and restricted regions of Ukraine) are strictly barred from
            initiating mandate executions. Any flagged transaction will be immediately aborted.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-ink-900">
          6. Age Verification & Legal Capacity
        </h2>
        <div className="legal-prose space-y-3">
          <p>
            Meirei services are strictly prohibited for minors. By deploying a mandate or connecting
            a chat channel (WhatsApp, Telegram, Instagram) to Meirei, you certify under penalty of
            perjury that:
          </p>
          <ul>
            <li>You are at least eighteen (18) years of age, or the legal age of majority in your jurisdiction.</li>
            <li>You possess full legal capacity to enter into binding financial arrangements.</li>
            <li>You are the authorized holder of the linked email address and non-custodial smart wallet.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-ink-900">
          7. Data Protection, Privacy & GDPR Rights
        </h2>
        <div className="legal-prose space-y-3">
          <p>
            Meirei is engineered according to the principle of Privacy by Design:
          </p>
          <ul>
            <li>
              <strong>Data Minimization:</strong> We never harvest extraneous telemetry. Only the
              user&apos;s verified email, messaging channel identifier, and public wallet address are
              stored for routing purposes.
            </li>
            <li>
              <strong>Right to Erasure (GDPR Art. 17):</strong> Users may submit an off-chain data
              deletion request at any time by contacting{" "}
              <a href="mailto:privacy@meirei.app" className="legal-link">
                privacy@meirei.app
              </a>. All associated messaging logs and device fingerprints will be purged within thirty (30) days.
            </li>
            <li>
              <strong>Zero Data Monetization:</strong> We do not sell, rent, or commercialize user
              data, trading prompts, or portfolio balances to third-party advertisers.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-ink-900">
          8. Contact Compliance Officers
        </h2>
        <div className="legal-prose space-y-3">
          <p>
            For compliance inquiries, legal process service, or law enforcement coordination, contact
            the Meirei Compliance and Legal Operations Department:
          </p>
          <div className="rounded-xl border border-ink-200 bg-surface-100 p-4 font-mono text-xs text-ink-800 space-y-1">
            <p><strong>Compliance Email:</strong> compliance@meirei.app</p>
            <p><strong>Data Protection Officer:</strong> dpo@meirei.app</p>
            <p><strong>Chief Architect:</strong> IboTV</p>
            <p><strong>Network:</strong> OKX Chain / X Layer (Chain ID 196)</p>
          </div>
          <p>
            Related documentation:{" "}
            <Link href="/terms" className="legal-link">Terms of Service</Link> ·{" "}
            <Link href="/privacy" className="legal-link">Privacy Policy</Link> ·{" "}
            <Link href="/cookies" className="legal-link">Cookie Policy</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
