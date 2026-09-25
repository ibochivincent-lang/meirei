"use client";

import { useState, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface StockItem {
  symbol: string;
  name: string;
  price: string;
  isLive: boolean;
  color: string;
  logo: React.ReactNode;
  change24h?: string;
  high24h?: string;
  low24h?: string;
  volume24h?: string;
  chartPoints?: number[];
}

export const STOCKS: StockItem[] = [
  {
    symbol: "NVDAx",
    name: "NVIDIA",
    price: "$213.9",
    isLive: true,
    color: "#76B900",
    change24h: "+2.45%",
    high24h: "$216.50",
    low24h: "$211.20",
    volume24h: "$1.84M USDG",
    chartPoints: [211.2, 211.8, 212.5, 212.1, 213.4, 212.9, 214.2, 215.1, 214.6, 216.5, 215.8, 213.9],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M8.9 7.4c.5-1.1 1.4-2.1 2.5-2.7C10.1 4.2 8.7 4 7.3 4.2c-3.7.6-6.4 3.7-6.3 7.5.1 4.2 3.5 7.6 7.7 7.7 2.2.1 4.3-.8 5.8-2.3-1.6.4-3.3.2-4.8-.6-2.5-1.4-3.9-4.2-3.1-7 .3-.8.8-1.5 1.3-2.1zM14.5 9c-.5-.6-1.2-1-2-1.1-.9-.1-1.8.2-2.4.8-.8.8-1.1 1.9-.8 3 .3 1.1 1.2 1.9 2.3 2.1 1 .1 2-.3 2.6-1.1.7-.8.8-1.9.4-2.9l1.9-1.9c1 1.4 1.2 3.3.6 4.9-1 2.5-3.5 4-6.1 3.7-2.6-.3-4.7-2.3-5.1-4.9-.5-2.8 1.1-5.5 3.8-6.3 1.5-.5 3.2-.3 4.5.5l.7.4-1.4 1.8z" />
      </svg>
    ),
  },
  {
    symbol: "AAPLx",
    name: "Apple",
    price: "$332.41",
    isLive: true,
    color: "#A2AAAD",
    change24h: "+1.82%",
    high24h: "$335.10",
    low24h: "$329.80",
    volume24h: "$2.42M USDG",
    chartPoints: [329.8, 330.4, 331.2, 330.9, 332.0, 331.5, 333.1, 334.2, 333.8, 335.1, 333.9, 332.41],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.62 1.34-.57.65-1.06 1.71-.93 2.73 1 .08 2.02-.48 2.63-1.22z" />
      </svg>
    ),
  },
  {
    symbol: "MSFTx",
    name: "Microsoft",
    price: "$490.3",
    isLive: true,
    color: "#00A4EF",
    change24h: "+0.94%",
    high24h: "$493.20",
    low24h: "$487.60",
    volume24h: "$1.65M USDG",
    chartPoints: [487.6, 488.2, 489.1, 488.8, 490.2, 489.7, 491.5, 492.4, 491.8, 493.2, 491.6, 490.3],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <rect x="2" y="2" width="9" height="9" fill="#F25022" />
        <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
        <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
        <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
      </svg>
    ),
  },
  {
    symbol: "METAx",
    name: "Meta",
    price: "$673.31",
    isLive: true,
    color: "#0668E1",
    change24h: "+3.12%",
    high24h: "$678.90",
    low24h: "$665.40",
    volume24h: "$2.10M USDG",
    chartPoints: [665.4, 667.1, 669.8, 668.5, 671.2, 670.0, 674.5, 676.8, 675.2, 678.9, 676.0, 673.31],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#0668E1">
        <path d="M12 7.2c-2.4 0-4.3 1.8-5.3 3.7C5.3 8.7 3.8 7.5 2 7.5 0 7.5 0 10.3 0 12.3c0 3.3 2.1 5.9 4.8 5.9 2 0 3.5-1.2 4.4-2.8 1.1 1.7 2.8 2.8 4.8 2.8 2 0 3.7-1.1 4.8-2.8.9 1.6 2.4 2.8 4.4 2.8 2.7 0 4.8-2.6 4.8-5.9 0-2 0-4.8-2-4.8-1.8 0-3.3 1.2-4.7 3.4-1-1.9-2.9-3.7-5.3-3.7zm-7.2 8.6c-1.5 0-2.6-1.5-2.6-3.5 0-1.4.6-2.5 1.7-2.5 1.3 0 2.4 1.8 3.2 3.6-.6 1.5-1.4 2.4-2.3 2.4zm14.4 0c-.9 0-1.7-.9-2.3-2.4.8-1.8 1.9-3.6 3.2-3.6 1.1 0 1.7 1.1 1.7 2.5 0 2-1.1 3.5-2.6 3.5z" />
      </svg>
    ),
  },
  {
    symbol: "TSLAx",
    name: "Tesla",
    price: "$358.42",
    isLive: true,
    color: "#E82127",
    change24h: "+2.18%",
    high24h: "$364.50",
    low24h: "$352.10",
    volume24h: "$1.85M USDG",
    chartPoints: [350, 351.4, 353.2, 352.0, 354.8, 355.5, 357.2, 356.1, 358.9, 360.4, 359.2, 358.42],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M12 4.5C9.8 4.5 4.5 5 2 6.5l.5 1.5c2-.9 5.8-1.4 9.5-1.4 3.7 0 7.5.5 9.5 1.4l.5-1.5c-2.5-1.5-7.8-2-10-2zm0 3.8c-2.5 0-4.6.4-6.2 1.1L7 11.2c1.3-.5 3-.8 5-.8s3.7.3 5 .8l1.2-1.8c-1.6-.7-3.7-1.1-6.2-1.1zm-1.2 5v7.2h2.4v-7.2c2.1-.3 4.2-.8 5.8-1.6L18 10.4c-1.6.8-3.8 1.3-6 1.3s-4.4-.5-6-1.3l-1 1.3c1.6.8 3.7 1.3 5.8 1.6z" />
      </svg>
    ),
  },
  {
    symbol: "AMZNx",
    name: "Amazon",
    price: "$246.85",
    isLive: true,
    color: "#111111",
    change24h: "+1.35%",
    high24h: "$249.20",
    low24h: "$243.60",
    volume24h: "$1.42M USDG",
    chartPoints: [242.0, 243.1, 244.5, 243.8, 245.2, 246.0, 245.6, 247.4, 248.8, 247.6, 246.2, 246.85],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M14.6 14.8c-.8 0-1.5-.2-2-.6-.5-.4-.8-1-.8-1.7 0-.8.3-1.4.9-1.8.6-.4 1.4-.6 2.4-.6h1.2v.9c0 .7-.3 1.3-.7 1.8-.4.7-1.1 1-1.9 1.1l.9.9zm-8.8 3.8c4.6 3.4 11 .3 12.4-1.2.2-.2.2-.5 0-.7-.2-.2-.5-.1-.7.1-1.3 1.2-7.1 4-11.2 1.1-.3-.2-.6 0-.7.3-.1.2 0 .4.2.4zm14.3-1.6c-.3-.4-1.8-.2-2.7.2-.3.1-.3.4-.1.6.8.6 1.7 1.2 2.3 1.4.3.1.5 0 .6-.2.2-.5.2-1.6-.1-2z" />
      </svg>
    ),
  },
  {
    symbol: "GOOGLx",
    name: "Alphabet",
    price: "$344.18",
    isLive: true,
    color: "#4285F4",
    change24h: "+0.85%",
    high24h: "$347.50",
    low24h: "$341.20",
    volume24h: "$1.62M USDG",
    chartPoints: [340.2, 341.5, 342.8, 341.9, 343.4, 344.5, 343.9, 345.6, 346.8, 345.5, 344.0, 344.18],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    symbol: "COINx",
    name: "Coinbase",
    price: "$286.70",
    isLive: true,
    color: "#0052FF",
    change24h: "+4.15%",
    high24h: "$291.80",
    low24h: "$278.40",
    volume24h: "$2.05M USDG",
    chartPoints: [278.4, 280.2, 282.5, 281.8, 284.1, 285.8, 286.4, 288.9, 291.8, 289.4, 287.1, 286.7],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <circle cx="12" cy="12" r="10" />
        <rect x="8" y="8" width="8" height="8" rx="2" fill="#0052FF" />
      </svg>
    ),
  },
  {
    symbol: "SPYx",
    name: "S&P 500 ETF",
    price: "$572.50",
    isLive: true,
    color: "#1E3A8A",
    change24h: "+0.78%",
    high24h: "$574.80",
    low24h: "$569.20",
    volume24h: "$4.12M USDG",
    chartPoints: [569.2, 569.8, 570.1, 571.4, 570.8, 572.0, 571.5, 572.8, 573.1, 574.8, 573.6, 572.5],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M4 18h16v2H4v-2zm0-5h16v2H4v-2zm0-5h16v2H4V8zm0-5h16v2H4V3z" />
      </svg>
    ),
  },
  {
    symbol: "QQQx",
    name: "Invesco QQQ",
    price: "$495.20",
    isLive: true,
    color: "#6D28D9",
    change24h: "+1.24%",
    high24h: "$498.40",
    low24h: "$491.10",
    volume24h: "$3.85M USDG",
    chartPoints: [491.1, 491.8, 492.5, 494.0, 493.2, 495.8, 497.1, 496.5, 497.6, 498.4, 496.9, 495.2],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
    ),
  },
  {
    symbol: "AMDx",
    name: "AMD",
    price: "$156.40",
    isLive: true,
    color: "#ED1C24",
    change24h: "+2.85%",
    high24h: "$159.20",
    low24h: "$153.50",
    volume24h: "$1.92M USDG",
    chartPoints: [153.5, 154.2, 155.6, 154.8, 156.9, 158.1, 157.4, 159.2, 157.8, 156.4],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    symbol: "CRWDx",
    name: "CrowdStrike",
    price: "$318.20",
    isLive: true,
    color: "#DC2626",
    change24h: "+1.65%",
    high24h: "$322.00",
    low24h: "$314.10",
    volume24h: "$1.45M USDG",
    chartPoints: [314.1, 315.6, 317.0, 316.2, 318.5, 320.1, 319.4, 322.0, 320.5, 318.2],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
      </svg>
    ),
  },
  {
    symbol: "MSTRx",
    name: "MicroStrategy",
    price: "$135.20",
    isLive: true,
    color: "#F7931A",
    change24h: "+4.12%",
    high24h: "$138.50",
    low24h: "$131.00",
    volume24h: "$3.82M USDG",
    chartPoints: [131.0, 132.4, 131.8, 133.5, 134.2, 136.0, 135.4, 138.5, 137.1, 135.2],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M4 4h4v16H4V4zm6 0h4v16h-4V4zm6 0h4v16h-4V4z" />
      </svg>
    ),
  },
  {
    symbol: "TSMx",
    name: "Taiwan Semi",
    price: "$175.80",
    isLive: true,
    color: "#0055A5",
    change24h: "+2.15%",
    high24h: "$178.20",
    low24h: "$173.40",
    volume24h: "$2.65M USDG",
    chartPoints: [173.4, 174.1, 174.8, 175.2, 176.0, 177.3, 176.8, 178.2, 177.0, 175.8],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    ),
  },
  {
    symbol: "AVGOx",
    name: "Broadcom",
    price: "$168.40",
    isLive: true,
    color: "#CC092F",
    change24h: "+1.92%",
    high24h: "$170.80",
    low24h: "$166.20",
    volume24h: "$1.95M USDG",
    chartPoints: [166.2, 166.8, 167.5, 168.1, 167.9, 169.4, 168.8, 170.8, 169.5, 168.4],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
      </svg>
    ),
  },
  {
    symbol: "INTCx",
    name: "Intel",
    price: "$23.50",
    isLive: true,
    color: "#0071C5",
    change24h: "+0.85%",
    high24h: "$24.10",
    low24h: "$23.10",
    volume24h: "$1.12M USDG",
    chartPoints: [23.1, 23.3, 23.2, 23.5, 23.7, 24.1, 23.9, 23.8, 23.6, 23.5],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <circle cx="12" cy="12" r="9" stroke="#FFFFFF" strokeWidth="2" fill="none" />
        <path d="M9 9h6v6H9z" />
      </svg>
    ),
  },
  {
    symbol: "MUx",
    name: "Micron Tech",
    price: "$92.40",
    isLive: true,
    color: "#002D62",
    change24h: "+2.88%",
    high24h: "$94.20",
    low24h: "$90.80",
    volume24h: "$1.55M USDG",
    chartPoints: [90.8, 91.2, 91.8, 92.5, 92.1, 93.4, 92.9, 94.2, 93.5, 92.4],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M3 5h3v14H3V5zm5 0h3l4 8V5h3v14h-3l-4-8v8H8V5z" />
      </svg>
    ),
  },
  {
    symbol: "MRVLx",
    name: "Marvell",
    price: "$68.20",
    isLive: true,
    color: "#6A0DAD",
    change24h: "+1.75%",
    high24h: "$69.50",
    low24h: "$67.10",
    volume24h: "$880K USDG",
    chartPoints: [67.1, 67.5, 67.9, 68.3, 68.0, 68.8, 68.5, 69.5, 68.9, 68.2],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M4 18h16V6H4v12zm2-10h12v8H6V8z" />
      </svg>
    ),
  },
  {
    symbol: "IWMx",
    name: "Russell 2000",
    price: "$215.60",
    isLive: true,
    color: "#059669",
    change24h: "+1.10%",
    high24h: "$217.20",
    low24h: "$214.00",
    volume24h: "$1.78M USDG",
    chartPoints: [214.0, 214.5, 215.2, 214.8, 215.9, 216.5, 216.0, 217.2, 216.4, 215.6],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 10h4v7H7v-7zm6-3h4v10h-4V7z" />
      </svg>
    ),
  },
  {
    symbol: "DELLx",
    name: "Dell Tech",
    price: "$118.50",
    isLive: true,
    color: "#007DB8",
    change24h: "+2.30%",
    high24h: "$120.40",
    low24h: "$116.80",
    volume24h: "$1.34M USDG",
    chartPoints: [116.8, 117.3, 118.0, 117.6, 118.9, 119.5, 119.0, 120.4, 119.8, 118.5],
    logo: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFFFFF">
        <path d="M4 6h16v12H4V6zm2 2v8h12V8H6zm3 2h2v4H9v-4zm4 0h2v4h-2v-4z" />
      </svg>
    ),
  },
];

interface StockSelectorGridProps {
  onSelectStock?: (stock: StockItem) => void;
  selectedSymbol?: string;
}

export function StockSelectorGrid({ onSelectStock, selectedSymbol = "NVDAx" }: StockSelectorGridProps) {
  const [selected, setSelected] = useState<string>(selectedSymbol);
  const [timeframe, setTimeframe] = useState<string>("1D");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);
  const gradientId = useId();

  const activeStock = STOCKS.find((s) => s.symbol === selected) || STOCKS[0];

  const handleSelect = (stock: StockItem) => {
    setSelected(stock.symbol);
    setHoverIndex(null);
    onSelectStock?.(stock);
  };

  // Generate SVG path from points scaled proportionally to match active stock price and timeframe
  const TIMEFRAME_CURVES: Record<string, number[]> = {
    "1D": [1.0, 1.002, 1.001, 1.004, 1.003, 1.005, 1.006, 1.004, 1.007, 1.008, 1.006, 1.0],
    "1W": [0.97, 0.975, 0.98, 0.985, 0.98, 0.99, 0.995, 1.01, 1.005, 1.02, 1.01, 1.0],
    "1M": [0.93, 0.94, 0.935, 0.95, 0.96, 0.955, 0.97, 0.98, 0.975, 0.99, 0.995, 1.0],
    "1Y": [0.75, 0.78, 0.81, 0.80, 0.84, 0.87, 0.89, 0.92, 0.95, 0.94, 0.98, 1.0],
    "ALL": [0.55, 0.60, 0.63, 0.68, 0.72, 0.76, 0.81, 0.85, 0.89, 0.94, 0.97, 1.0],
  };

  const rawPoints = activeStock.chartPoints || [100, 102, 101, 103, 104, 103.5, 105];
  const targetPrice = parseFloat(activeStock.price.replace(/[^0-9.]/g, "")) || 100;
  const curve = TIMEFRAME_CURVES[timeframe] || TIMEFRAME_CURVES["1D"];
  const shapedPoints = rawPoints.map((p, idx) => p * (curve[idx % curve.length] || 1.0));
  const lastPoint = shapedPoints[shapedPoints.length - 1] || targetPrice;
  const scaleFactor = lastPoint > 0 ? targetPrice / lastPoint : 1.0;
  const points = shapedPoints.map((p) => Math.round(p * scaleFactor * 100) / 100);
  const minVal = points.length > 0 ? Math.min(...points) : 0;
  const maxVal = points.length > 0 ? Math.max(...points) : 100;
  const range = maxVal - minVal || 1;

  const width = 500;
  const height = 140;
  const paddingY = 16;
  const chartHeight = height - paddingY * 2;

  const coords = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - paddingY - ((p - minVal) / range) * chartHeight;
    return { x, y, val: p };
  });

  // Bezier smoothing for SVG path
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  // Currently displayed price (either hovered or spot)
  const currentDisplayPrice = hoverIndex !== null && coords[hoverIndex]
    ? `$${coords[hoverIndex].val.toFixed(2)}`
    : activeStock.price;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartSvgRef.current) return;
    const rect = chartSvgRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(width, ((e.clientX - rect.left) / rect.width) * width));
    const closestIdx = Math.round((relX / width) * (points.length - 1));
    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className="w-full rounded-2xl border border-ink-200/80 bg-[#FAFAF8] p-4 shadow-sm md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
        <h4 className="font-display text-base font-semibold tracking-tight text-ink-900 md:text-lg">
          Choose a stock
        </h4>
        <span className="text-xs text-ink-400 md:text-sm font-normal">
          More list as X Layer liquidity deepens.
        </span>
      </div>

      {/* Grid of 8 stock cards matching the user screenshot */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-3.5">
        {STOCKS.map((stock) => {
          const isSelected = selected === stock.symbol;

          // Icon container styling matching the screenshot
          let iconBg = "bg-white border border-ink-200/60";
          if (stock.symbol === "NVDAx") iconBg = "bg-[#76B900]";
          else if (stock.symbol === "AAPLx" || stock.symbol === "AMZNx") iconBg = "bg-black";
          else if (stock.symbol === "TSLAx") iconBg = "bg-[#E82127]";
          else if (stock.symbol === "COINx") iconBg = "bg-[#0052FF]";

          return (
            <button
              key={stock.symbol}
              type="button"
              onClick={() => handleSelect(stock)}
              className={cn(
                "group relative flex min-h-[110px] flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer md:p-4",
                isSelected
                  ? "border-[#E5A93C] bg-[#FFFBF2] shadow-sm ring-1 ring-[#E5A93C]/50"
                  : "border-ink-200/70 bg-white hover:border-ink-300 hover:bg-[#FCFCFA]",
              )}
            >
              {/* Top row: Styled Logo Icon + Live/Soon Badge */}
              <div className="flex items-center justify-between">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl p-2 shadow-xs transition-transform group-hover:scale-105", iconBg)}>
                  {stock.logo}
                </div>

                {stock.isLive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3DC] px-2 py-0.5 text-[11px] font-medium text-[#B26B00]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF9900]" />
                    Live
                  </span>
                ) : (
                  <span className="rounded-md bg-surface-100 px-2 py-0.5 font-mono text-[9px] font-medium tracking-wider text-ink-400">
                    SOON
                  </span>
                )}
              </div>

              {/* Middle row: Symbol & Company Name */}
              <div className="mt-3 leading-tight">
                <p className="font-display text-base font-bold text-ink-900">
                  {stock.symbol}
                </p>
                <p className="text-xs text-ink-500 font-normal">{stock.name}</p>
              </div>

              {/* Bottom row: Price or Coming Soon */}
              <div className="mt-2.5 border-t border-ink-100/60 pt-2">
                <p
                  className={cn(
                    "font-sans text-sm font-semibold tabular-nums",
                    stock.isLive ? "text-ink-900" : "text-xs font-normal text-ink-400",
                  )}
                >
                  {stock.price}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Stock Price Chart */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-ink-200/80 bg-white p-4 shadow-sm md:p-5">
        {/* Chart Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-100 p-2 font-display text-xs font-bold text-ink-900 shadow-xs">
              {activeStock.symbol.slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h5 className="font-display text-base font-bold text-ink-900 md:text-lg">
                  {activeStock.symbol} / USDG
                </h5>
                <span className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-600">
                  {activeStock.name}
                </span>
                {activeStock.isLive ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                    Live Oracle
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-600/20">
                    Roadmap Tier
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-500">X Layer Chain 196 · OKX DEX Feed</p>
            </div>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-100 p-1 text-xs">
            {["1D", "1W", "1M", "1Y", "ALL"].map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "min-h-[36px] min-w-[36px] rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer",
                  timeframe === tf
                    ? "bg-white text-ink-900 shadow-xs"
                    : "text-ink-500 hover:text-ink-900",
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Current Price Ticker & Change */}
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-2xl font-bold tracking-tight text-ink-900 md:text-3xl tabular-nums">
                {currentDisplayPrice}
              </span>
              {activeStock.isLive && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
                    <path d="M6 2.5l4 4.5H2l4-4.5z" />
                  </svg>
                  {activeStock.change24h} today
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-ink-400">
              {hoverIndex !== null ? "Scrubbing 24h timeline" : "Real time spot price settleable via OKX DEX Aggregator"}
            </p>
          </div>

          <div className="flex gap-4 text-right text-xs">
            <div>
              <p className="text-[10px] text-ink-400 uppercase">24h High</p>
              <p className="font-mono font-semibold text-ink-800">{activeStock.high24h}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-400 uppercase">24h Low</p>
              <p className="font-mono font-semibold text-ink-800">{activeStock.low24h}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-400 uppercase">Liquidity / Vol</p>
              <p className="font-mono font-semibold text-ink-800">{activeStock.volume24h}</p>
            </div>
          </div>
        </div>

        {/* SVG Interactive Area Chart */}
        <div className="relative mt-4 h-[140px] w-full select-none">
          <svg
            ref={chartSvgRef}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="h-full w-full cursor-crosshair overflow-visible"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activeStock.isLive ? "#FF5B3E" : "#71717A"} stopOpacity="0.28" />
                <stop offset="100%" stopColor={activeStock.isLive ? "#FF5B3E" : "#71717A"} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle grid lines */}
            <line x1="0" y1={paddingY} x2={width} y2={paddingY} stroke="currentColor" className="text-[#F0F0EE]" strokeDasharray="3 3" />
            <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" className="text-[#F0F0EE]" strokeDasharray="3 3" />
            <line x1="0" y1={height - paddingY} x2={width} y2={height - paddingY} stroke="currentColor" className="text-[#F0F0EE]" strokeDasharray="3 3" />

            {/* Gradient Area Fill */}
            <path d={areaD} fill={`url(#${gradientId})`} />

            {/* Main Price Curve Line */}
            <path
              d={pathD}
              fill="none"
              stroke={activeStock.isLive ? "#FF5B3E" : "#71717A"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover Crosshair & Dot */}
            {hoverIndex !== null && coords[hoverIndex] && (
              <g>
                <line
                  x1={coords[hoverIndex].x}
                  y1={0}
                  x2={coords[hoverIndex].x}
                  y2={height}
                  stroke="#FF5B3E"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  opacity="0.75"
                />
                <circle
                  cx={coords[hoverIndex].x}
                  cy={coords[hoverIndex].y}
                  r="5"
                  fill="#FF5B3E"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {/* Floating Tooltip during scrub */}
          <AnimatePresence>
            {hoverIndex !== null && coords[hoverIndex] && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  left: `${(coords[hoverIndex].x / width) * 100}%`,
                  top: `${(coords[hoverIndex].y / height) * 100}%`,
                }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-9 rounded-md bg-ink-900 px-2 py-1 text-[10px] font-semibold text-white shadow-md"
              >
                ${coords[hoverIndex].val.toFixed(2)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick action footer */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3 text-xs">
          <div className="flex items-center gap-1.5 text-ink-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>X Layer sub second finality via OKX DEX Aggregator</span>
          </div>

          <button
            type="button"
            onClick={() => onSelectStock?.(activeStock)}
            className="min-h-[44px] flex items-center gap-1 rounded-lg bg-accent-50 px-3.5 py-2 font-semibold text-accent-700 hover:bg-accent-100 transition-colors cursor-pointer"
          >
            <span>Ask Meirei for {activeStock.symbol} Quote</span>
            <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
              <path d="M2 6h8m0 0L6 2m4 4L6 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
