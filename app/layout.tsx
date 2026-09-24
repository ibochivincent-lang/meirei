import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "@/app/globals.css";
import { SmoothScroll } from "@/components/interactive/smooth-scroll";
import { CookieConsentBanner } from "@/components/ui/cookie_consent_banner";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const spaceGroteskWorks = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-works",
  display: "swap",
});

/**
 * JetBrains Mono — used sparingly for inline code, transaction references,
 * wallet addresses. Adds technical credibility where appropriate.
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};


const title = "Meirei · AI Native Investment Mandate Agent";
const description =
  "Turn one sentence investment mandates into live tokenized stock (xStocks) & USDG portfolios on X Layer via OKX DEX Aggregator.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://meirei.tella.cash"
  ),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "meirei",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${spaceGroteskWorks.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('meirei_theme', 'light');
              } catch (e) {}
            })();`,
          }}
        />
        <meta
          name="facebook-domain-verification"
          content="a29vfcnfljyix4jzf8nj06d2ulnh8m"
        />
        <meta name="facebook-domain-verification" content="nam5vl9755j1i63x1s6ziul42qp2p9" />
      </head>
      <body className="relative min-h-screen overflow-x-hidden">
        <MotionConfig reducedMotion="user">
          <SmoothScroll>
            {children}
          </SmoothScroll>
          <CookieConsentBanner />
        </MotionConfig>
      </body>
    </html>
  );
}
