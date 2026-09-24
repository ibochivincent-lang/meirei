"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  checkWalletConnection,
  connectInjectedWallet,
  signAndExecuteSwap,
  Web3ProviderState,
  SigningResult,
} from "@/lib/wallet/xlayer_signer";
import { formatShortAddress } from "@/lib/wallet/xlayer";

export interface Web3SigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSymbol: string;
  fromAmountUsdg: number;
  estimatedUnits: number;
  spotPrice: number;
  userAddress: string;
  onSuccess?: (result: SigningResult & { executedAmountUsdg: number; executedUnits: number }) => void;
}

export function Web3SigningModal({
  isOpen,
  onClose,
  targetSymbol,
  fromAmountUsdg,
  spotPrice,
  userAddress,
  onSuccess,
}: Web3SigningModalProps) {
  const [providerState, setProviderState] = useState<Web3ProviderState>({
    hasProvider: false,
    providerName: null,
    connectedAddress: null,
    chainId: null,
    isXLayer: false,
  });

  const [inputAmount, setInputAmount] = useState<number>(fromAmountUsdg || 100);
  const [selectedMandate, setSelectedMandate] = useState<number>(1);
  const [mandateText, setMandateText] = useState<string>(`Deploy ${targetSymbol} with dynamic momentum trailing stop.`);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [signingStatusText, setSigningStatusText] = useState<string>("");
  const [signingError, setSigningError] = useState<string | null>(null);
  const [signingResult, setSigningResult] = useState<SigningResult | null>(null);

  // Recalculate units based on input amount and spot price
  const activePrice = spotPrice > 0 ? spotPrice : 1;
  const currentUnits = inputAmount > 0 ? inputAmount / activePrice : 0;

  // Sync mandate text with selection and target symbol
  useEffect(() => {
    if (selectedMandate === 1) {
      setMandateText(`Deploy ${targetSymbol} with dynamic momentum trailing stop.`);
    } else if (selectedMandate === 2) {
      setMandateText(`Accumulate ${targetSymbol} on >3% dips with USDG reserve.`);
    } else if (selectedMandate === 3) {
      setMandateText(`Execute portfolio rebalance swap into ${targetSymbol}.`);
    } else {
      setMandateText(`Non-custodial algorithmic trade for ${targetSymbol}.`);
    }
  }, [selectedMandate, targetSymbol]);

  useEffect(() => {
    if (isOpen) {
      setSigningError(null);
      setSigningResult(null);
      setInputAmount(fromAmountUsdg > 0 ? fromAmountUsdg : 100);
      checkWalletConnection().then((state) => {
        setProviderState(state);
      });
    }
  }, [isOpen, fromAmountUsdg]);

  const handleConnectWallet = async () => {
    setIsSigning(true);
    setSigningError(null);
    try {
      await connectInjectedWallet();
      const updated = await checkWalletConnection();
      setProviderState(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSigningError(msg);
    } finally {
      setIsSigning(false);
    }
  };

  const handleSignTransaction = async () => {
    if (inputAmount <= 0) {
      setSigningError("Please enter a valid investment amount greater than 0 USDG.");
      return;
    }

    setIsSigning(true);
    setSigningError(null);
    setSigningStatusText("Requesting transaction confirmation in your Web3 wallet...");

    try {
      let activeAddr = providerState.connectedAddress || userAddress;
      if (!providerState.connectedAddress) {
        try {
          const res = await connectInjectedWallet();
          if (res && res.address) activeAddr = res.address;
        } catch {
          // Proceed with current active address or non-custodial simulation
        }
      }

      setSigningStatusText("Awaiting signature confirmation on OKX X Layer...");
      const result = await signAndExecuteSwap({
        fromSymbol: "USDG",
        toSymbol: targetSymbol,
        fromAmount: inputAmount,
        expectedOutput: currentUnits,
        slippagePercent: 0.05,
        userAddress: activeAddr,
      });

      if (result.ok && result.txHash) {
        setSigningResult(result);
        if (onSuccess) {
          onSuccess({
            ...result,
            executedAmountUsdg: inputAmount,
            executedUnits: currentUnits,
          });
        }
      } else {
        setSigningError(result.error || "Transaction signature was cancelled or rejected in wallet.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSigningError(`Signature failed: ${msg}`);
    } finally {
      setIsSigning(false);
      setSigningStatusText("");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-ink-200 bg-white text-ink-900 shadow-2xl p-4 sm:p-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-ink-100">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-700">
                OKX X Layer (Chain ID 196) · Non-Custodial
              </span>
              <h3 className="text-sm font-bold text-ink-950 font-display">
                Mandate Swap &amp; Non-Custodial Execution
              </h3>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-full text-ink-400 hover:text-ink-950 hover:bg-surface-100 transition-colors cursor-pointer text-xs font-bold"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {signingResult ? (
            /* Success State */
            <div className="py-5 space-y-3.5 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-xl shadow-xs">
                ✓
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink-950 font-display">Mandate Swap Confirmed</h4>
                <p className="text-[11px] text-ink-600 mt-0.5">
                  Executed non-custodially on OKX X Layer Mainnet.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-50 border border-ink-200 text-left font-mono text-xs space-y-1.5">
                <div className="flex justify-between text-ink-500">
                  <span>Mandate Type:</span>
                  <span className="font-bold text-ink-900">Mandate #{selectedMandate}</span>
                </div>
                <div className="flex justify-between text-ink-500">
                  <span>Rule:</span>
                  <span className="font-semibold text-ink-800 text-[10px] text-right truncate max-w-[200px]">{mandateText}</span>
                </div>
                <div className="flex justify-between text-ink-500">
                  <span>Target Equity:</span>
                  <span className="font-bold text-ink-900">{targetSymbol}</span>
                </div>
                <div className="flex justify-between text-ink-500">
                  <span>Units Acquired:</span>
                  <span className="font-bold text-emerald-600">{currentUnits.toFixed(4)} {targetSymbol}</span>
                </div>
                <div className="flex justify-between text-ink-500">
                  <span>Total Capital:</span>
                  <span className="font-bold text-ink-900">${inputAmount.toFixed(2)} USDG</span>
                </div>
                <div className="flex justify-between text-ink-500">
                  <span>Execution Price:</span>
                  <span className="font-medium text-ink-700">${activePrice.toFixed(2)} USDG</span>
                </div>
                <div className="flex justify-between text-ink-500 pt-1.5 border-t border-ink-200/80">
                  <span>Transaction Hash:</span>
                  <span className="font-semibold truncate max-w-[180px] text-accent-700">
                    {signingResult.txHash}
                  </span>
                </div>
              </div>

              {signingResult.explorerUrl && (
                <a
                  href={signingResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center text-xs font-bold text-accent-600 hover:text-accent-700 hover:underline gap-1"
                >
                  <span>View on OKLink X Layer Explorer</span>
                  <span>→</span>
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-ink-950 hover:bg-accent-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Close &amp; Return to Terminal
              </button>
            </div>
          ) : (
            /* Execution Review & Quick Buy Form */
            <div className="mt-3.5 space-y-3">
              {/* Select Mandate Type (1, 2, 3, 4) */}
              <div className="rounded-xl border border-ink-200 bg-surface-50/70 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-ink-900 uppercase tracking-wider">
                    Select Mandate
                  </label>
                  <span className="text-[10px] font-mono text-accent-700 font-bold">
                    Mandate #{selectedMandate}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 1, label: "Momentum" },
                    { id: 2, label: "Dip DCA" },
                    { id: 3, label: "Rebalance" },
                    { id: 4, label: "Custom" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMandate(m.id)}
                      className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                        selectedMandate === m.id
                          ? "bg-ink-950 text-white border-ink-950 font-bold shadow-2xs"
                          : "bg-white text-ink-700 border-ink-200 hover:bg-surface-100"
                      }`}
                    >
                      <span className="block font-mono text-xs">#{m.id}</span>
                      <span className="block text-[9px] truncate">{m.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-ink-500">
                    <span>Mandate Directive:</span>
                    <span className="text-[9px] text-accent-700 font-semibold">Editable Rule</span>
                  </div>
                  <input
                    type="text"
                    value={mandateText}
                    onChange={(e) => setMandateText(e.target.value)}
                    placeholder={`Write mandate rule for ${targetSymbol}...`}
                    className="w-full text-[10px] font-mono text-ink-900 bg-white p-2 rounded-lg border border-ink-200 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Amount Selection & Input */}
              <div className="rounded-xl border border-ink-200 bg-surface-50/70 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-ink-900 uppercase tracking-wider">
                    Swap Capital (USDG)
                  </label>
                  <span className="text-[10px] font-mono text-ink-500">
                    Spot: ${activePrice.toFixed(2)}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-400 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={inputAmount || ""}
                    onChange={(e) => setInputAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter USDG amount..."
                    className="w-full pl-7 pr-14 py-2 rounded-xl border border-ink-200 bg-white text-ink-950 font-mono text-xs font-bold focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none transition-all shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-600 font-mono">
                    USDG
                  </span>
                </div>

                {/* Quick amount chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[50, 100, 250, 500, 1000].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setInputAmount(chip)}
                      className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        inputAmount === chip
                          ? "border-ink-950 bg-ink-950 text-white"
                          : "border-ink-200 bg-white text-ink-700 hover:bg-surface-100"
                      }`}
                    >
                      ${chip >= 1000 ? `${chip / 1000}k` : chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction Breakdown Card */}
              <div className="p-3 rounded-xl bg-surface-50 border border-ink-200 space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center text-ink-600">
                  <span>Swap Route:</span>
                  <span className="font-mono font-bold text-ink-950">
                    ${inputAmount.toFixed(2)} USDG → {currentUnits.toFixed(4)} {targetSymbol}
                  </span>
                </div>
                <div className="flex justify-between items-center text-ink-600">
                  <span>Slippage / Gas:</span>
                  <span className="font-mono text-emerald-700 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    &lt;0.05% · Sponsored (Free)
                  </span>
                </div>
              </div>

              {/* Signature Authorization Method (Strict Web3 Wallet) */}
              <div className="p-2.5 rounded-xl bg-white border border-ink-200 text-xs flex items-center justify-between shadow-2xs">
                <div>
                  <div className="font-bold text-ink-950 flex items-center gap-1 text-[11px]">
                    <span>OKX Wallet / Web3 EOA</span>
                    <span className="rounded bg-accent-100 text-accent-800 text-[9px] font-bold px-1.5 py-0.2">
                      Active
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-500 font-mono">
                    {providerState.connectedAddress
                      ? formatShortAddress(providerState.connectedAddress)
                      : formatShortAddress(userAddress)}
                  </div>
                </div>

                {!providerState.connectedAddress && (
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    disabled={isSigning}
                    className="px-2.5 py-1 rounded-lg bg-accent-600 text-white text-[11px] font-bold hover:bg-accent-700 transition-colors cursor-pointer"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* Error Message */}
              {signingError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {signingError}
                </div>
              )}

              {/* Status Notice */}
              {isSigning && signingStatusText && (
                <div className="text-xs text-center text-accent-700 font-semibold animate-pulse">
                  {signingStatusText}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSignTransaction}
                  disabled={isSigning || inputAmount <= 0}
                  className="w-full py-2.5 rounded-xl bg-ink-950 hover:bg-accent-600 text-white text-xs font-bold tracking-wide disabled:opacity-50 transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{isSigning ? "Awaiting Signature..." : `Sign Mandate Swap (${currentUnits.toFixed(4)} ${targetSymbol})`}</span>
                  {!isSigning && <span className="text-sm leading-none">→</span>}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
