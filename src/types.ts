/** Cash / stablecoin sleeve symbols that exist on X Layer (196). */
export type CashSymbol = "USDG" | "USDC";

export type Target = { symbol: string; weight: number };

export type Mandate = {
  targets: Target[];
  cashSymbol: CashSymbol;
  /** Max weight for any single equity name (cash is exempt). */
  maxSingle: number;
  /** Dead-band: ignore drift smaller than this fraction of portfolio value. */
  rebalanceBand: number;
};

export type Holding = { symbol: string; amount: number; valueUsd: number };

export type Leg = { side: "buy" | "sell"; symbol: string; notionalUsd: number; from: string; to: string };

export type Quote = {
  legIndex: number;
  route: string;
  /** Fraction, e.g. 0.003 = 0.30%. */
  priceImpact: number;
  estimatedOutput: number;
  quoteId?: string;
};

export type Plan = { mandate: Mandate; holdings: Holding[]; legs: Leg[]; quotes?: Quote[] };

export type RebalancePlan = {
  legs: Leg[];
  quotes?: Quote[];
  totalUsd: number;
  cashSymbol: CashSymbol;
  cashUsd: number;
  buyUsd: number;
  sellUsd: number;
  /** True when cash + sell proceeds cover every buy leg. */
  funded: boolean;
  warnings: string[];
};

export type TxResult = {
  symbol: string;
  hash: string;
  explorerUrl: string;
  status: "success" | "failed";
  error?: string;
};

export type FeeReceipt = {
  amount: string;
  asset: "USDT" | CashSymbol;
  status: "settled" | "pending" | "failed";
  txHash?: string;
  escrowId?: string;
  /** Why the fee is not settled, e.g. no fee address configured. */
  reason?: string;
};

export type Delivery = {
  service: string;
  chain: number;
  mandate: Mandate;
  plan: Plan;
  txs: TxResult[];
  portfolio: { holdings: Holding[]; totalUsd: number };
  fee: FeeReceipt;
  timestamp: number;
  warnings?: string[];
};

export type AllowlistEntry = { symbol: string; address: string; decimals: number; name: string };

export type SwapOptions = {
  confirm: boolean;
  /** Slippage tolerance in PERCENT, matching `onchainos swap execute --slippage`. 0.5 = 0.5%. */
  slippagePercent?: number;
};

export type SwapResult = {
  status: "preview" | "executed" | "failed";
  quotes?: Quote[];
  txs?: TxResult[];
  summary?: { succeeded: number; failed: number };
  error?: string;
};

export type FeeOptions = { mode: "fixed" | "percentage" | "a2a-escrow"; amountUsd?: number; percentageBps?: number };

export type AgentInput = {
  mandate: string;
  walletAddress: string;
  confirm?: boolean;
  feeOptions?: FeeOptions;
  /** Slippage tolerance in percent (0.5 = 0.5%). */
  slippagePercent?: number;
};

export type AgentOutput = { success: boolean; delivery?: Delivery; error?: string };