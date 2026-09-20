export interface UsageScene {
  id: string;
  title: string;
  description: string;
  amount: string;
  recipient: string;
  scene: "students" | "families" | "small-investors" | "traders";
}

export const USAGE_SCENES: UsageScene[] = [
  {
    id: "students",
    title: "Student DCA into tech",
    description: "Setting aside $50 USDG every month into AAPLx. No high broker commissions or minimum account balances.",
    amount: "$50 USDG",
    recipient: "AAPLx · Apple xStock",
    scene: "students",
  },
  {
    id: "families",
    title: "Family wealth protection",
    description: "Holding dollar-denominated savings in USDG and auto-rebalancing across blue-chip stocks right from WhatsApp.",
    amount: "$1,200 USDG",
    recipient: "US Stock Basket",
    scene: "families",
  },
  {
    id: "small-investors",
    title: "Fractional stock diversification",
    description: "Purchasing fractional shares of TSLAx and NVDAx with instant settlement on X Layer via OKX DEX Aggregator.",
    amount: "$400 USDG",
    recipient: "TSLAx & NVDAx",
    scene: "small-investors",
  },
  {
    id: "traders",
    title: "Algorithmic mandate rebalancing",
    description: "Executing complex portfolio mandates: 60% tech, 20% USDG cash sleeve with strict 8% single-asset cap protection.",
    amount: "$15,000 USDG",
    recipient: "Mag7 Sleeve",
    scene: "traders",
  },
];
