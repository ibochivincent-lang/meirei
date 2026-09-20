import type { Metadata } from "next";
import { SITE } from "@/lib/data/site";

export const metadata: Metadata = {
  title: "Terms of Service · meirei",
  description:
    "The terms that govern your use of meirei — a messaging-based interface for sending and managing USDC.",
};

const LAST_UPDATED = "May 14, 2026";

export default function TermsPage() {
  return (
    <div className="legal-prose">
      <header className="mb-12 border-b border-ink-200 pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-500">
          Legal
        </p>
        <h1 className="mt-2 font-display text-5xl text-ink-900">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-ink-500">
          Last updated: {LAST_UPDATED}
        </p>
      </header>

      <Section title="1. Who we are">
        <p>
          Meirei (&ldquo;Meirei,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) is an AI-native investment mandate interface that lets you trade tokenized
          stocks (xStocks) and manage digital dollar portfolios (USDG/USDC) on X Layer (chain 196) — through
          our web terminal, WhatsApp, Telegram, and Instagram chats.
          These Terms of Service
          (&ldquo;Terms&rdquo;) form a binding agreement between you and <strong>{SITE.legalName}</strong> (Meirei Core Protocol Ltd., RC-7849102).
        </p>
        <p>
          By accessing the web terminal, interacting with our messaging bots, or creating a wallet profile,
          you agree to these Terms, our{" "}
          <a href="/privacy" className="legal-link">
            Privacy Policy
          </a>
          , and our{" "}
          <a href="/cookies" className="legal-link">
            Cookie Policy
          </a>
          . If you do not agree, do not use the Service.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>You may use meirei only if you:</p>
        <ul>
          <li>
            are at least 18 years old and have full legal capacity to enter a
            contract;
          </li>
          <li>
            are not located in, or a resident of, a jurisdiction subject to
            comprehensive sanctions, and are not on any sanctions or
            prohibited-party list;
          </li>
          <li>
            access the Service for lawful, personal purposes (or with proper
            authorization on behalf of a business that you can bind); and
          </li>
          <li>
            comply with all applicable laws of Nigeria and the jurisdiction in
            which you reside, including tax, anti-money-laundering, and
            foreign-exchange laws.
          </li>
        </ul>
        <p>
          We may refuse, suspend, or terminate access at our discretion,
          including for failed verification or suspected misuse.
        </p>
      </Section>

      <Section title="3. The Service">
        <p>Through WhatsApp messages, meirei lets you:</p>
        <ul>
          <li>
            create a non-custodial or custodial wallet (as described in-product)
            backed by our wallet infrastructure provider;
          </li>
          <li>send USDC to other wallets you specify;</li>
          <li>
            receive USDC and have the equivalent value reflected in your
            balance;
          </li>
          <li>
            execute tokenized stock swaps and rebalance mandates via OKX DEX Aggregator on X Layer; and
          </li>
          <li>
            view balances, portfolio asset allocations, and execution transaction hashes.
          </li>
        </ul>
        <p>
          meirei is an <strong>interface</strong>. Supported chat applications carry the
          conversation; meirei&rsquo;s platform does the work, executing and settling on
          the X Layer network (chain 196) through OKX Onchain OS infrastructure.
          We do not control blockchains, and once a blockchain
          transaction is broadcast it is generally <strong>irreversible</strong>
          .
        </p>
      </Section>

      <Section title="4. Verification (KYC)">
        <p>
          To comply with Nigerian and international anti-money-laundering
          requirements, we may require you to provide and verify identity
          information before, during, or after onboarding — including your
          legal name, date of birth, phone number, BVN/NIN where applicable,
          and a government-issued ID. You authorize us and our verification
          providers to verify the information you submit. We may pause or
          decline transactions while verification is in progress.
        </p>
      </Section>

      <Section title="5. Sending and confirmation">
        <p>
          Most actions require a confirmation step — typing back to confirm,
          tapping a confirmation link, or entering a PIN. You are responsible
          for:
        </p>
        <ul>
          <li>
            the accuracy of every detail you submit, including amounts,
            recipient names, wallet addresses, and instructions written in
            natural language;
          </li>
          <li>
            reviewing the on-screen summary before confirming — once you
            confirm, the transaction will be submitted and is generally
            irreversible; and
          </li>
          <li>
            keeping your WhatsApp account, device, and PIN secure. We treat any
            instruction sent from your verified WhatsApp number, and confirmed
            via the required factor, as authorized by you.
          </li>
        </ul>
        <p>
          Quoted payout rates are valid only for the short window shown in chat. We
          may decline, delay, or reverse a transaction where required by law,
          where we suspect fraud, or where settlement at the quoted rate is no
          longer possible.
        </p>
      </Section>

      <Section title="6. Fees">
        <p>
          meirei may charge a margin on the payout rate and/or a flat fee for
          certain transactions. Network/gas fees may also apply onchain. Fees
          and applicable rates are shown in chat before you confirm. We may
          change our fees at any time on prospective transactions.
        </p>
      </Section>

      <Section title="7. Acceptable use">
        <p>You must not use meirei to:</p>
        <ul>
          <li>
            violate any law, regulation, or third-party right, including
            sanctions, securities, or tax laws;
          </li>
          <li>
            fund, facilitate, or receive proceeds from fraud, money laundering,
            terrorism financing, ransomware, gambling where prohibited, or
            illegal goods or services;
          </li>
          <li>
            impersonate another person, provide false information, or
            circumvent our verification, geographic, or risk controls;
          </li>
          <li>
            attempt to reverse engineer, scrape, overload, or interfere with
            the Service, our infrastructure, or our messaging partner; or
          </li>
          <li>resell access to the Service without our written consent.</li>
        </ul>
      </Section>

      <Section title="8. Risks you accept">
        <p>
          Digital assets and cross-border payments carry real risk. By using
          meirei you acknowledge that:
        </p>
        <ul>
          <li>
            the value of USDC and NGN can change, and payout rates fluctuate;
          </li>
          <li>
            blockchain transactions are typically irreversible — a typo,
            phishing message, or mistaken address can result in permanent loss;
          </li>
          <li>
            WhatsApp, blockchain networks, and partner services may experience
            outages, delays, or congestion outside our control;
          </li>
          <li>
            regulatory changes in Nigeria or elsewhere may force us to
            suspend, limit, or stop offering the Service to you with little
            notice; and
          </li>
          <li>
            messaging-based interfaces depend on natural-language
            understanding. You agree to review the on-screen confirmation
            rather than relying on meirei&rsquo;s interpretation of an ambiguous
            instruction.
          </li>
        </ul>
      </Section>

      <Section title="9. Third-party services">
        <p>
          meirei relies on third parties, including (without limitation) Meta /
          WhatsApp and Telegram for messaging, Circle and Tether as issuers of stablecoins, the OKX X Layer
          network (Chain ID 196) for settlement, Twilio for messaging delivery, and our
          identity-verification providers. Their terms and privacy practices
          govern your interaction with them. We are not responsible for
          outages, errors, or actions of third parties, except as required by
          law.
        </p>
      </Section>

      <Section title="10. Disclaimers">
        <p>
          The Service is provided <strong>&ldquo;as is&rdquo;</strong> and
          <strong> &ldquo;as available.&rdquo;</strong> To the maximum extent
          permitted by law we disclaim all warranties, express or implied,
          including merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Service will be
          uninterrupted, error-free, or secure, or that any rate or quote will
          remain available.
        </p>
        <p>
          Nothing in meirei is financial, investment, tax, or legal advice. You
          are responsible for your own tax reporting and compliance.
        </p>
      </Section>

      <Section title="11. Limitation of liability">
        <p>
          To the maximum extent permitted by law, we and our affiliates,
          officers, employees, and partners are not liable for any indirect,
          incidental, special, consequential, or punitive damages, or for loss
          of profits, revenues, data, or goodwill, arising out of or related
          to your use of the Service. Our total aggregate liability for any
          claim arising under or related to these Terms is capped at the
          greater of (a) the fees you paid us in the three months immediately
          before the event giving rise to the claim, or (b){" "}
          our total aggregate liability for all claims under or arising out of these Terms is limited to $100 USDG or the total protocol fees received from your transactions during the preceding three (3) months.
        </p>
      </Section>

      <Section title="12. Indemnity">
        <p>
          You agree to defend, indemnify, and hold harmless meirei and its
          affiliates from any claim, loss, or expense (including reasonable
          legal fees) arising out of your breach of these Terms, your misuse of
          the Service, or your violation of law or any third-party right.
        </p>
      </Section>

      <Section title="13. Transparent Fees & No Hidden Charges">
        <p>
          All trades and mandate rebalances are subject to a transparent protocol fee of 0.05% of notional volume, plus network gas on X Layer (typically &lt; $0.01). There are zero hidden fees, zero deposit charges, and zero recurring maintenance subscriptions. All fees are clearly quoted in USDG/USDC prior to 2FA trade confirmation.
        </p>
      </Section>

      <Section title="14. Risk Disclosure & No Unsupported Claims">
        <p>
          Meirei is an algorithmic software tool. We do not provide personalized financial, legal, or tax advice, and we make no guarantees of investment profit, yield, or specific trading returns. Tokenized real-world assets (xStocks) are volatile, and past performance does not indicate future results.
        </p>
      </Section>

      <Section title="15. Governing Law and Dispute Resolution">
        <p>
          These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to conflict-of-laws principles. Any dispute will be resolved exclusively by the competent commercial courts of Lagos, Nigeria, except where mandatory consumer protection law in your jurisdiction requires otherwise.
        </p>
      </Section>

      <Section title="16. Legal Inquiries">
        <p>
          Questions regarding these Terms should be directed to our legal department at{" "}
          <a href="mailto:legal@meirei.app" className="legal-link">
            legal@meirei.app
          </a>
          .
        </p>
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

