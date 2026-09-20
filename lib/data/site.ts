/**
 * Site configuration and official contact channels.
 *
 * Privacy and legal inquiries are routed to privacy@meirei.app and legal@meirei.app.
 */
const CONTACT_EMAIL = "privacy@meirei.app";

// The bot username also drives the server-side Telegram deep link in
// lib/agent/handler.ts (TELEGRAM_BOT_USERNAME), but that var isn't visible
// to client components — anything read here needs the NEXT_PUBLIC_ prefix
// to make it into the browser bundle. Until it's set, telegramLink is null
// and callers skip rendering the Telegram CTA rather than link to nothing.
const TELEGRAM_BOT_USERNAME = (
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ""
).replace(/^@/, "");

export const SITE = {
  brandName: "meirei",
  legalName: "meirei CORE LTD",
  whatsappNumber: "2349043580863",
  whatsappLink:
    "https://wa.me/2349043580863?text=" + encodeURIComponent("Hi meirei"),
  telegramLink: TELEGRAM_BOT_USERNAME
    ? `https://t.me/${TELEGRAM_BOT_USERNAME}`
    : (null as string | null),
  instagramLink: "https://instagram.com/meirei.agent",

  privacyEmail: CONTACT_EMAIL,
  legalEmail: "legal@meirei.app",
  supportEmail: "support@meirei.app",

  // Social links are omitted rather than pointed at dead URLs. twitterUrl
  // was "https://x.com/" — the bare site, rendered in the footer as though
  // it were a profile — and facebookUrl was "#". A link that goes nowhere
  // reads as an abandoned product. Set these to real profiles to bring the
  // icons back; the footer skips whichever is null.
  twitterUrl: null as string | null,
  facebookUrl: null as string | null,

  termsUrl: "/terms",
  privacyUrl: "/privacy",
  dataDeletionUrl: "/data-deletion",
} as const;

/** Indicates whether contact addresses are configured. */
export const HAS_PLACEHOLDER_CONTACT = false;

export const NAV_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Docs", href: "/docs" },
  { label: "Whitepaper", href: "/whitepaper" },
  { label: "Research", href: "/research" },
] as const;

