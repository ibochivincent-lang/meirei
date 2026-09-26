export const CONVERSATION_TEMPLATES = [
  // Sales Playbook Templates
  {
    id: "sp_1",
    title: "The Traditional Stock Investor (Focus on Spot Trading & Gasless Quotes)",
    keywords: ["traditional", "legacy", "gas", "fees", "commission", "fractional"],
    dialogue: "Rep: Hey [Name], you trade major equities on legacy brokerages, but have you ever paid hidden fees or gas fees?\nClient: Commission fees add up fast, plus managing fractional shares is annoying.\nRep: Our platform features instant spot trading and fractional share computation with 100% sponsored gas—meaning zero blockchain transaction fees for you. In plain English: you get exact pricing instantly without paying network fees.\nClient: Zero gas fees? That makes micro-investing actually profitable. Let’s do a test trade."
  },
  {
    id: "sp_2",
    title: "The Crypto Native (Focus on Portfolio Drift Rebalancing)",
    keywords: ["crypto", "drift", "rebalance", "rebalancing", "weights", "automated"],
    dialogue: "Rep: Hey [Name], when your tokenized equity portfolio drifts out of balance, do you manually rebalance?\nClient: I try, but market swings happen so fast I always miss the window.\nRep: Our Portfolio Drift Rebalance engine handles that automatically. If Apple surges and throws off your asset weights, it trims winners and tops up laggards in the background.\nClient: Automated rebalancing? That saves me hours of tracking and manual swapping.\nRep: Exactly. Set your targets once, and let the protocol protect your risk profile."
  },
  {
    id: "sp_3",
    title: "The Busy Professional (Focus on Weekly DCA Accumulation)",
    keywords: ["busy", "time", "dca", "weekly", "accumulation", "savings", "autopilot"],
    dialogue: "Rep: Hi [Name], do you struggle to consistently time the stock market each week?\nClient: Yes, I'm too busy with work to log in and buy stocks every single week.\nRep: With our Weekly DCA Accumulation mandate, the system automatically stacks fractional stock units on autopilot from your cash balance every week.\nClient: So it's like a set-it-and-forget-it savings plan for tokenized stocks?\nRep: Exactly. It smooths out market volatility while you focus on your day job."
  },
  {
    id: "sp_4",
    title: "The Risk-Averse Trader (Focus on Volatility Circuit Breakers)",
    keywords: ["risk", "crash", "crashes", "circuit breaker", "volatility", "panic", "shield"],
    dialogue: "Rep: Hey [Name], how do you protect your equity portfolio during sudden market crashes?\nClient: I usually watch my portfolio bleed out before I can react.\nRep: Our platform features a Volatility Circuit Breaker. If markets dip sharply by over 8%, it automatically pauses trading or safely rotates your funds into USDG stablecoin.\nClient: An automated safety shield during market panics? That gives me immense peace of mind.\nRep: It's built right into the smart contract architecture to protect your capital 24/7."
  },
  {
    id: "sp_5",
    title: "The Tactical Investor (Focus on Dip Buyer & Take-Profit)",
    keywords: ["tactical", "dip", "dips", "take profit", "gains", "emotion"],
    dialogue: "Rep: Hi [Name], do you find yourself missing market dips because you're asleep or away from your screen?\nClient: All the time. Great dips happen overnight and I miss out.\nRep: Our Dip Buyer & Take-Profit mandate automates this: it automatically buys when stocks dip 5% and locks in gains when targets hit +15%.\nClient: Buy the dip and take profit on autopilot? That's incredible discipline.\nRep: It removes emotion from trading and executes your exact strategy around the clock."
  },
  {
    id: "sp_6",
    title: "The International Investor (Combining Spot Trading & DCA)",
    keywords: ["international", "wire", "us stocks", "barrier"],
    dialogue: "Rep: Hey [Name], buying US stocks internationally usually means high wire fees and manual execution.\nClient: Exactly. High fees make weekly investing practically impossible.\nRep: Our Spot Trading & Weekly DCA features let you accumulate US fractions with 100% sponsored gas fees and zero recurring transaction overhead.\nClient: That eliminates my biggest barrier to entry. Let's set up a weekly accumulation schedule."
  },
  {
    id: "sp_7",
    title: "The Portfolio Manager (Combining Drift Rebalance & Circuit Breakers)",
    keywords: ["portfolio manager", "manager", "shocks", "risk management"],
    dialogue: "Rep: Hello [Name], how do you manage both drift rebalancing and sudden market shocks in one system?\nClient: I use multiple tools, and they never talk to each other cleanly.\nRep: Our protocol combines Portfolio Drift Rebalance to keep weights steady with a Volatility Circuit Breaker that shifts to USDG during an 8% drop.\nClient: An all-in-one risk management system? That is extremely sophisticated.\nRep: It runs natively on-chain so you never have to micromanage your risk parameters."
  },
  {
    id: "sp_8",
    title: "The Active Swing Trader (Combining Dip Buyer & Gasless Spot Trading)",
    keywords: ["swing trader", "active", "margins", "profit"],
    dialogue: "Rep: Hey [Name], high gas fees on every swing trade eat into your short-term profits, right?\nClient: Brutally. Frequent trading fees destroy my margins.\nRep: With 100% sponsored gas on Spot Trading and automated Dip Buyer & Take-Profit triggers, every trade retains 100% of its margin.\nClient: Zero gas eating my profits while my dip triggers fire automatically? Sign me up.\nRep: Let's get your trading vault configured today."
  },
  {
    id: "sp_9",
    title: "The Conservative Saver (Combining Weekly DCA & Circuit Breakers)",
    keywords: ["conservative", "saver", "wealth", "bear market"],
    dialogue: "Rep: Hi [Name], want to build wealth steadily via DCA, but terrified of a sudden market crash wiping you out?\nClient: Exactly. DCA is great until a major bear market hits.\nRep: We pair Weekly DCA Accumulation with our Volatility Circuit Breaker, which automatically parks your funds in USDG if the market drops over 8%.\nClient: So it builds when calm, and hides in safety during a storm?\nRep: Precisely. Automated growth paired with automated downside defense."
  },
  {
    id: "sp_10",
    title: "The Institutional Treasury Manager (All Mandates Integrated)",
    keywords: ["institutional", "treasury", "corporate", "compliance"],
    dialogue: "Rep: Good morning [Name], does your corporate treasury need automated yield, rebalancing, and risk protection?\nClient: Our committee requires institutional automation and strict downside guardrails.\nRep: Our platform integrates Spot Trading with sponsored gas, Portfolio Drift Rebalancing, and Volatility Circuit Breakers to safeguard corporate capital.\nClient: That covers all our compliance and risk mandates. Please share the integration spec."
  },

  // Customer Journey Templates
  {
    id: "cj_1",
    title: "The Beginner",
    keywords: ["beginner", "what are tokenized stocks", "start", "what is"],
    dialogue: "Customer: Hi, I keep hearing about tokenized stocks. What exactly are they?\nAgent: Hi! Great question. A tokenized stock is a blockchain-based representation of exposure to an underlying stock... Fractional access, fees, liquidity, and legal rights depend on the specific product.\nCustomer: Why would I use it?\nAgent: The appeal is combining familiar equity exposure with blockchain-based transfer and settlement."
  },
  {
    id: "cj_2",
    title: "The Busy Investor",
    keywords: ["simple", "complicated", "track", "monitoring"],
    dialogue: "Customer: I don't have time to deal with complicated investing.\nAgent: I understand. Tokenized-stock platforms can simplify the user experience by putting access, transactions, and portfolio tracking in one digital environment."
  },
  {
    id: "cj_3",
    title: "The Fractional-Access Conversation",
    keywords: ["fractional", "full share", "own", "dividends"],
    dialogue: "Customer: I want exposure to major companies, but I don't have enough money for a full share.\nAgent: That's one reason people look at tokenized and fractional products. Some platforms allow smaller units of exposure.\nCustomer: Does that mean I own the actual company shares?\nAgent: Not necessarily. A token may represent a claim or derivative exposure. You need to read the product documentation."
  },
  {
    id: "cj_4",
    title: "The Blockchain-Native Customer",
    keywords: ["crypto", "24/7", "liquidity", "blockchain-native"],
    dialogue: "Customer: I'm already using crypto. Why would tokenized stocks interest me?\nAgent: They can bring traditional-asset exposure into a blockchain-based environment, potentially making settlement and portfolio management more compatible with digital assets."
  },
  {
    id: "cj_5",
    title: "The Risk-Aware Customer",
    keywords: ["losing money", "risk", "risks", "mistakes"],
    dialogue: "Customer: I'm interested, but I'm worried about losing money.\nAgent: That's a valid concern. Tokenized stocks still carry investment risk. The underlying stock can fall, and the token structure can introduce additional counterparty, custody, liquidity, technology, and regulatory risks."
  },
  {
    id: "cj_6",
    title: "The 'Is It Real?' Conversation",
    keywords: ["real stock", "real", "crypto token", "verify"],
    dialogue: "Customer: Is this a real stock or just a crypto token?\nAgent: It depends on the product. Some tokenized assets are backed by or linked to real-world securities; others provide synthetic or contractual exposure. You should not assume that a token equals direct ownership of the underlying stock."
  },
  {
    id: "cj_7",
    title: "The Comparison Conversation",
    keywords: ["normal stocks", "better", "comparison", "traditional"],
    dialogue: "Customer: Why not just buy normal stocks?\nAgent: Traditional shares and tokenized products can differ in ownership rights, settlement, trading hours, fees, custody, accessibility, and regulation.\nCustomer: Which one is better?\nAgent: There isn't one answer for everyone. It depends on what you value and what the specific products offer."
  },
  {
    id: "cj_8",
    title: "The Small-Start Conversation",
    keywords: ["small", "lot of money", "reassess"],
    dialogue: "Customer: I don't want to put a lot of money into it.\nAgent: You don't have to start with a large amount if the platform allows smaller purchases. Starting small can help you learn how the product works."
  },
  {
    id: "cj_9",
    title: "The Long-Term Conversation",
    keywords: ["long time", "long term", "long-term", "hold", "buy and hold"],
    dialogue: "Customer: I'm interested in holding stock exposure for a long time.\nAgent: Then your main questions should be about the underlying asset, the token's long-term structure, fees, custody, and your ability to maintain or redeem the position over time."
  },
  {
    id: "cj_10",
    title: "The Technology Conversation",
    keywords: ["technology", "advantage", "safer", "blockchain"],
    dialogue: "Customer: What is the advantage of putting stocks on blockchain?\nAgent: Tokenization can use blockchain infrastructure for recording ownership or claims, transferring tokens, and settling transactions... Blockchain can provide transparent transaction records, but smart contracts, wallets, issuers, custodians, and market infrastructure can introduce other risks."
  }
];

export function findBestTemplate(query: string) {
  const lowerQuery = query.toLowerCase();
  
  // Find templates where keywords match
  const matches = CONVERSATION_TEMPLATES.filter(t => 
    t.keywords.some(k => lowerQuery.includes(k.toLowerCase()))
  );

  if (matches.length > 0) {
    // Pick a random match from the relevant ones
    return matches[Math.floor(Math.random() * matches.length)];
  }

  // Fallback: pick a random template if no keywords match
  return CONVERSATION_TEMPLATES[Math.floor(Math.random() * CONVERSATION_TEMPLATES.length)];
}
