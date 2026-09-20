export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQS: FaqItem[] = [
  {
    id: "what-is-meirei",
    question: "What exactly is Meirei (命令)?",
    answer:
      "Meirei (命令) is an AI native investment mandate agent built on OKX Onchain OS and executing on X Layer (chain 196). It translates simple conversational messages into live tokenized stock (xStocks) and USDG stablecoin portfolios right inside WhatsApp, Telegram, and Instagram.",
  },
  {
    id: "what-can-i-trade",
    question: "What stocks and assets can I trade?",
    answer:
      "You can trade allowlisted tokenized stocks on X Layer including AAPLx (Apple), NVDAx (NVIDIA), MSFTx (Microsoft), GOOGLx (Alphabet), AMZNx (Amazon), METAx (Meta), and TSLAx (Tesla), settled in USDG and USDC. Unlisted tokens and memecoins are strictly blocked for your safety.",
  },
  {
    id: "channels",
    question: "Which chat apps are supported?",
    answer:
      "WhatsApp, Telegram, and Instagram. You can also interact with Meirei directly on this website. Your wallet balance and mandate history remain completely synchronized across all channels.",
  },
  {
    id: "login-passkey",
    question: "How do I access my personalized account without a passkey?",
    answer:
      "Zero passkeys, zero codes, and zero seed phrases. Your verified chat identity on WhatsApp, Telegram, or Instagram automatically maps to your personalized OKX Onchain OS smart account on X Layer (chain 196).",
  },
  {
    id: "how-it-works",
    question: "How does mandate trading work?",
    answer:
      "Simply state your intent (for example: 'buy 500 USDG of AAPLx' or '60% mag7, 20% USDG, max 8%'). Meirei calculates the portfolio drift, fetches live quotes from the OKX DEX Aggregator on X Layer, and always requires your explicit confirmation before any trade is broadcast.",
  },
  {
    id: "settlement",
    question: "How fast is settlement on X Layer?",
    answer:
      "Settlement on X Layer is sub second, typically confirming within ~3 to 5 seconds. All trades settle directly onchain with verifiable transaction hashes on OKX Web3 Explorer.",
  },
  {
    id: "fees",
    question: "Are there any fees?",
    answer:
      "Meirei operates transparently. Any service fee is quoted up front and settled via OKX A2A payment links or native contract execution. No hidden charges or unexpected spreads.",
  },
  {
    id: "no-app",
    question: "Do I need to download a new app?",
    answer:
      "No. Meirei works directly in the messaging apps you already have installed on your phone. No separate dashboard, no app store downloads, and no complex DEX interfaces.",
  },
  {
    id: "lost-phone",
    question: "What if I lose my device?",
    answer:
      "You can access the security portal from any web browser to freeze your account in two taps. All automated mandates and trading activity pause immediately until you complete identity recovery.",
  },
];
