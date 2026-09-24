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
      "Meirei (命令) is an AI-native investment mandate agent built on OKX Onchain OS and executing directly on OKX X Layer (Chain 196). It translates natural language conversational instructions into live tokenized equity portfolios and USDG/USDC settlement directly via Telegram (@MeireiXLayerBot) and the Web Browser Console (/app).",
  },
  {
    id: "what-can-i-trade",
    question: "What stocks and assets can I trade?",
    answer:
      "You can trade 20 allowlisted tokenized equities on OKX X Layer: NVDAx (NVIDIA), AAPLx (Apple), MSFTx (Microsoft), GOOGLx (Alphabet), AMZNx (Amazon), METAx (Meta), TSLAx (Tesla), COINx (Coinbase), TSMx (Taiwan Semiconductor), AVGOx (Broadcom), AMDx (AMD), INTCx (Intel), MUx (Micron), MRVLx (Marvell), CRWDx (CrowdStrike), MSTRx (MicroStrategy), DELLx (Dell), SPYx (S&P 500 ETF), QQQx (Invesco QQQ), and IWMx (Russell 2000 ETF), settled natively in USDG and USDC stablecoins. Unlisted tokens and memecoins are strictly blocked for your security.",
  },
  {
    id: "okx-ai-skills",
    question: "What OKX AI skills power the market intelligence and advisory engine?",
    answer:
      "Meirei integrates 4 specialized OKX AI skills: (1) 'trading-plan-generator' for calibrated risk scoring and multi-horizon valuation trajectories (1D to 90D); (2) 'okx-sentiment-tracker' for community conviction and social sentiment velocity; (3) 'okx-cex-smartmoney' for whale order-book tracking and net institutional inflows; and (4) 'okx-cex-market' for live 24h volume, bid-ask spreads, and CEX benchmark pricing.",
  },
  {
    id: "modes-difference",
    question: "What is the difference between Basic Mode and Advanced Mode?",
    answer:
      "Basic Mode provides an intuitive interface for everyday investors: a live Price Comparison & Unit Calculator, interactive spot charts, an allowed stock list with 1-click 'Quick Buy' buttons, and the Conversational Chat Console. Advanced Mode provides institutional advisory tools: an interactive SVG Alpha & Valuation Trajectory Chart with explicit X & Y axes, live OKX AI skills telemetry directory, and session-key guarded mandate deployment.",
  },
  {
    id: "channels",
    question: "Which platforms and channels are supported?",
    answer:
      "Meirei supports the official Telegram Direct Bot (@MeireiXLayerBot) and the Institutional Web Browser Console (/app). Both interfaces share synchronized portfolio holdings, verified balances, and execution history on OKX X Layer.",
  },
  {
    id: "login-passkey",
    question: "How does non-custodial wallet signing work?",
    answer:
      "Meirei is strictly non-custodial. When you execute a trade or activate an investment mandate, Meirei constructs the rebalance calldata and prompts you to review and sign directly via OKX Wallet, MetaMask, or WalletConnect. Your private keys never leave your device, and transactions are 100% gas-sponsored via the OKX Paymaster.",
  },
  {
    id: "how-it-works",
    question: "How does mandate trading work?",
    answer:
      "Simply state your intent in natural language (for example: 'Buy $250 NVDAx' or 'Set a 60% AI chip and 40% S&P 500 portfolio, rebalance on 5% drift'). Meirei calculates portfolio drift, queries the OKX DEX Aggregator on X Layer, and requires your explicit non-custodial approval before any transaction is broadcast.",
  },
  {
    id: "settlement",
    question: "How fast is settlement on OKX X Layer?",
    answer:
      "Settlement on OKX X Layer (Chain 196) achieves sub-second finality, typically confirming within ~2 to 3 seconds. All trades settle directly on-chain with verifiable transaction hashes viewable on OKX Web3 Explorer.",
  },
  {
    id: "fees",
    question: "Are there any gas or service fees?",
    answer:
      "On OKX X Layer, gas fees are 100% sponsored by the OKX Paymaster. Trade execution utilizes optimal routing across OKX DEX liquidity pools with transparent quotes and zero hidden spreads.",
  },
  {
    id: "lost-phone",
    question: "What if I lose my device or want to pause trading?",
    answer:
      "You can access the Emergency Security Portal from any web browser to freeze your account in two clicks. All automated mandates and trading activity pause immediately until you complete verified unfreeze.",
  },
];
