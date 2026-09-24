import type { Metadata } from "next";
import { SITE } from "@/lib/data/site";

export const metadata: Metadata = {
  title: "Privacy Policy · meirei",
  description:
    "How Meirei collects, uses, and protects your information when you manage tokenized equity investment mandates on OKX X Layer.",
};

const LAST_UPDATED = "September 17, 2026";

export default function PrivacyPage() {
  return (
    <div className="legal-prose">
      <header className="mb-12 border-b border-ink-200 pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-[#C4820A]">
          Legal & Compliance
        </p>
        <h1 className="mt-2 font-display text-5xl text-ink-900">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-ink-500">
          Last updated: {LAST_UPDATED}
        </p>
      </header>

      <Section title="1. Overview & Business Identity">
        <p>
          This Privacy Policy explains how <strong>{SITE.legalName}</strong> (&ldquo;Meirei,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) collects,
          uses, shares, and protects personal information when you use our
          AI-native investment mandate terminal and web service at{" "}
          <a href="https://meirei.tella.cash" className="legal-link">https://meirei.tella.cash</a> (the &ldquo;Service&rdquo;).
          It applies in addition to our{" "}
          <a href="/terms" className="legal-link">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/cookies" className="legal-link">
            Cookie Policy
          </a>.
        </p>
        <p>
          We strictly respect global privacy frameworks including the Nigeria Data Protection Act 2023 (NDPA) and the General Data Protection Regulation (GDPR) in our role as a data controller. We operate a non-custodial interface; your private keys remain exclusively under your control.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p>
          <strong>You give us:</strong>
        </p>
        <ul>
          <li>
            <strong>Account & contact:</strong> your WhatsApp phone number,
            display name, and any name or label you set in chat.
          </li>
          <li>
            <strong>Identity verification:</strong> where required for
            regulatory compliance, your full legal name, date of birth, residential
            address, government ID details and images, and a selfie
            for liveness check. Collected through our regulated identity-verification
            partners.
          </li>
          <li>
            <strong>Transaction instructions:</strong> the messages you send
            us — including amounts, recipient names or addresses, memos, and
            natural-language phrases like &ldquo;send him the same as last
            week.&rdquo;
          </li>
          <li>
            <strong>Payment details:</strong> wallet addresses you interact with, sign from, or send mandates to on X Layer.
          </li>
          <li>
            <strong>PIN / authentication:</strong> a PIN or other factor you
            set, stored only as a salted hash.
          </li>
          <li>
            <strong>Support:</strong> anything you tell us when you contact
            support.
          </li>
        </ul>

        <p>
          <strong>We collect automatically:</strong>
        </p>
        <ul>
          <li>
            <strong>Usage & device data</strong> from our confirmation web
            pages: IP address, approximate location derived from IP, browser
            and OS, timestamps, and pages visited.
          </li>
          <li>
            <strong>Transaction metadata:</strong> onchain transaction hashes,
            block timestamps, balances, and counterparty addresses (public
            blockchain data).
          </li>
          <li>
            <strong>Cookies & similar:</strong> strictly necessary cookies on
            the confirmation flow to secure your session; we do not use
            advertising cookies.
          </li>
        </ul>

        <p>
          <strong>From third parties:</strong> we receive verification
          outcomes from our KYC provider, settlement data from the OKX X Layer
          network (Chain ID 196), and messaging metadata (e.g. delivery state) from Meta /
          WhatsApp and Twilio.
        </p>
      </Section>

      <Section title="3. Why we use it (and the legal basis)">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-ink-500">
              <th className="py-2 pr-4 font-medium">Purpose</th>
              <th className="py-2 font-medium">Legal basis (NDPA / GDPR)</th>
            </tr>
          </thead>
          <tbody className="text-ink-700">
            <tr className="border-b border-ink-200/60 align-top">
              <td className="py-3 pr-4">
                Run the Service — create wallets, parse your messages, quote
                and settle transactions, show balances.
              </td>
              <td className="py-3">Performance of a contract with you.</td>
            </tr>
            <tr className="border-b border-ink-200/60 align-top">
              <td className="py-3 pr-4">
                Identity verification, sanctions / AML screening, fraud
                detection, transaction monitoring, and record-keeping.
              </td>
              <td className="py-3">
                Compliance with a legal obligation; legitimate interest in
                preventing fraud and financial crime.
              </td>
            </tr>
            <tr className="border-b border-ink-200/60 align-top">
              <td className="py-3 pr-4">
                Customer support, debugging, and improving the Service.
              </td>
              <td className="py-3">
                Legitimate interest in operating and improving the Service.
              </td>
            </tr>
            <tr className="border-b border-ink-200/60 align-top">
              <td className="py-3 pr-4">
                Sending you transactional messages on WhatsApp (confirmations,
                alerts).
              </td>
              <td className="py-3">Performance of a contract.</td>
            </tr>
            <tr className="align-top">
              <td className="py-3 pr-4">
                Sending product updates or marketing.
              </td>
              <td className="py-3">Your consent — you can withdraw at any time.</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="4. Who we share it with">
        <p>We share personal information only as needed:</p>
        <ul>
          <li>
            <strong>Service providers / processors</strong> acting on our
            instructions, including:
            <ul>
              <li>
                <strong>Meta Platforms (WhatsApp Business)</strong> — messaging
                delivery.
              </li>
              <li>
                <strong>Twilio</strong> — messaging infrastructure.
              </li>
              <li>
                <strong>Circle</strong> — issuer of the USDC stablecoin.
              </li>
              <li>
                <strong>OKX X Layer network (Chain ID 196)</strong> — blockchain settlement.
                User operations and tokenized equity swaps settle non-custodially onchain.
              </li>
              <li>
                <strong>Supabase</strong> — application database and
                authentication infrastructure.
              </li>
              <li>
                <strong>SumSub &amp; Chainalysis</strong> — identity verification,
                AML sanctions screening, and compliance monitoring.
              </li>
            </ul>
          </li>
          <li>
            <strong>Public blockchains.</strong> Wallet addresses and
            transaction amounts are written to public ledgers that anyone can
            view. They are not anonymous.
          </li>
          <li>
            <strong>Regulators, courts, law enforcement</strong> where we are
            legally required to disclose, or to protect rights, safety, or
            property.
          </li>
          <li>
            <strong>Successors</strong> in a merger, acquisition, or
            reorganisation — subject to this Policy.
          </li>
        </ul>
        <p>We do not sell your personal information.</p>
      </Section>

      <Section title="5. International transfers">
        <p>
          Some of our processors operate outside Nigeria (for example, in the
          United States or the European Union). Where personal data is
          transferred outside Nigeria, we rely on lawful transfer mechanisms
          under the NDPA, including adequacy decisions or contractual
          safeguards with the recipient.
        </p>
      </Section>

      <Section title="6. How long we keep it">
        <p>
          We keep personal information for as long as your account is active
          and for as long as we are required to keep records under applicable
          financial-services law — typically <strong>at least five years</strong>
          {" "}after the end of the relationship or the date of a transaction,
          whichever is later. We may retain limited records longer where
          needed to defend legal claims or comply with regulators.
        </p>
        <p>
          Onchain data we have submitted (transaction hashes, addresses,
          amounts) cannot be deleted by us — that is a property of public
          blockchains, not a choice we make.
        </p>
      </Section>

      <Section title="7. How we protect it">
        <p>
          We use encryption in transit (TLS), encryption at rest for sensitive
          fields, hashed PINs, scoped database access, audit logging, and
          short lived confirmation tokens to reduce the risk of unauthorised
          access. No system is perfectly secure — keep your WhatsApp account
          and device protected, and never share your PIN or confirmation link
          with anyone.
        </p>
      </Section>

      <Section title="8. Your rights">
        <p>
          Subject to the NDPA (and, where applicable, the GDPR), you have the
          right to:
        </p>
        <ul>
          <li>access the personal information we hold about you;</li>
          <li>have inaccurate or incomplete information corrected;</li>
          <li>
            request deletion of your personal information, where we are not
            required to keep it;
          </li>
          <li>
            object to or restrict certain processing, including direct
            marketing;
          </li>
          <li>request portability of information you provided to us; and</li>
          <li>withdraw consent where we relied on it.</li>
        </ul>
        <p>
          To exercise these rights, message us in chat or email{" "}
          <a href="mailto:privacy@meirei.app" className="legal-link">
            privacy@meirei.app
          </a>
          . For a deletion request specifically, see our{" "}
          <a href="/data-deletion" className="legal-link">
            Data Deletion page
          </a>
          . You can also lodge a complaint with your supervisory authority.
        </p>
      </Section>

      <Section title="9. Age Consent & Protection of Children (Strictly 18+)">
        <p>
          Meirei is strictly restricted to individuals who are at least 18 years of age and possess full legal capacity to enter into binding financial agreements. We do not knowingly solicit, collect, or process personal data from children or minors under 18.
        </p>
        <p>
          If we discover or have reason to suspect that an individual under 18 has accessed the platform, created a wallet profile, or submitted mandates, all associated session data, identity mappings, and chat history will be permanently deleted immediately. Parents or guardians who believe a child has accessed the service may notify us at <a href="mailto:privacy@meirei.app" className="legal-link">privacy@meirei.app</a> for prompt removal.
        </p>
      </Section>

      <Section title="10. Communication Controls & Unsubscribe Mechanisms">
        <p>
          We respect your communication preferences. You can opt out of non-critical automated status messages at any time:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Chat Platforms (WhatsApp / Telegram):</strong> Reply &ldquo;STOP&rdquo;, &ldquo;UNSUBSCRIBE&rdquo;, or &ldquo;PAUSE&rdquo; in the chat thread to instantly halt proactive notifications and price alerts.</li>
          <li><strong>Email Notifications:</strong> Every automated email dispatch contains a one-click &ldquo;Unsubscribe&rdquo; link in the footer. Alternatively, email <a href="mailto:privacy@meirei.app" className="legal-link">privacy@meirei.app</a> with the subject &ldquo;Unsubscribe&rdquo;.</li>
        </ul>
      </Section>

      <Section title="11. Third-Party SDK Audit & Zero Dark Patterns">
        <p>
          We conduct continuous operational security audits on all third-party software development kits (SDKs) and RPC dependencies:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>OKX Onchain OS & DEX Aggregator:</strong> Sourcing decentralized liquidity across X Layer without custodial custody.</li>
          <li><strong>Supabase / PostgreSQL:</strong> Self-contained relational database enforcing Row Level Security (RLS) on all user tables.</li>
        </ul>
        <p>
          We strictly reject dark patterns: there are zero hidden recurring charges, zero artificial countdown timers, and no pre-checked consent checkboxes. All trade legs and fees are explicitly previewed prior to 2FA challenge authorization.
        </p>
      </Section>

      <Section title="12. Corporate Contact Details">
        <p>
          For privacy questions, GDPR/NDPA inquiries, or to contact our Data Protection Officer:
        </p>
        <div className="rounded-xl border border-ink-200 bg-surface-100 p-4 font-mono text-xs text-ink-800 space-y-1">
          <p className="font-bold text-ink-950">{SITE.legalName}</p>
          <p>Entity: Meirei Core Protocol Ltd.</p>
          <p>Data Protection Email: privacy@meirei.app</p>
          <p>Legal & Compliance: legal@meirei.app</p>
          <p>Registered Office: Meirei Global Operations, Victoria Island, Lagos & Decentralized Protocol Infrastructure</p>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-ink-900">{title}</h2>
      <div className="mt-3 space-y-4 text-ink-700">{children}</div>
    </section>
  );
}

