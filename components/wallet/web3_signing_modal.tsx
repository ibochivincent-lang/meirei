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
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [signingStatusText, setSigningStatusText] = useState<string>("");
  const [signingError, setSigningError] = useState<string | null>(null);
  const [signingResult, setSigningResult] = useState<SigningResult | null>(null);

  // Recalculate units based on input amount and spot price
  const activePrice = spotPrice > 0 ? spotPrice : 1;
  const currentUnits = inputAmount > 0 ? inputAmount / activePrice : 0;

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
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-ink-200 bg-white text-ink-900 shadow-2xl p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-ink-100">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-700">
                OKX X Layer (Chain ID 196) · Non-Custodial
              </span>
              <h3 className="text-base font-bold text-ink-950 font-display">
                Transaction Approval &amp; Wallet Confirmation
              </h3>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full text-ink-400 hover:text-ink-950 hover:bg-surface-100 transition-colors cursor-pointer text-sm font-bold"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {signingResult ? (
            /* Success State */
            <div className="py-6 space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-2xl shadow-xs">
                ✓
              </div>
              <div>
                <h4 className="text-base font-bold text-ink-950 font-display">Transaction Successfully Confirmed</h4>
                <p className="text-xs text-ink-600 mt-1">
                  Non-custodial swap signed and broadcasted on OKX X Layer Mainnet.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-50 border border-ink-200 text-left font-mono text-xs space-y-2">
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
                  <span>Spot Execution Price:</span>
                  <span className="font-medium text-ink-700">${activePrice.toFixed(2)} USDG</span>
                </div>
                <div className="flex justify-between text-ink-500 pt-2 border-t border-ink-200/80">
                  <span>Transaction Hash:</span>
                  <span className="font-semibold truncate max-w-[200px] text-accent-700">
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
                className="w-full mt-2 py-3 rounded-xl bg-ink-950 hover:bg-accent-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Close &amp; Return to Terminal
              </button>
            </div>
          ) : (
            /* Execution Review & Quick Buy Form */
            <div className="mt-4 space-y-4">
              {/* Amount Selection & Input */}
              <div className="rounded-2xl border border-ink-200 bg-surface-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                    Quick Buy Capital (USDG)
                  </label>
                  <span className="text-[11px] font-mono text-ink-500">
                    Spot: ${activePrice.toFixed(2)}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-400 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={inputAmount || ""}
                    onChange={(e) => setInputAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter USDG amount..."
                    className="w-full pl-8 pr-16 py-2.5 rounded-xl border border-ink-200 bg-white text-ink-950 font-mono text-sm font-bold focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none transition-all shadow-2xs"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-600 font-mono">
                    USDG
                  </span>
                </div>

                {/* Quick amount chips */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[50, 100, 250, 500, 1000].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setInputAmount(chip)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                        inputAmount === chip
                          ? "border-accent-600 bg-accent-50 text-accent-700"
                          : "border-ink-200 bg-white text-ink-700 hover:bg-surface-100"
                      }`}
                    >
                      ${chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction Breakdown Card */}
              <div className="p-4 rounded-2xl bg-surface-50 border border-ink-200 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-ink-600">
                  <span>Swap Route:</span>
                  <span className="font-mono font-bold text-ink-950">
                    ${inputAmount.toFixed(2)} USDG → {currentUnits.toFixed(4)} {targetSymbol}
                  </span>
                </div>
                <div className="flex justify-between items-center text-ink-600">
                  <span>Spot Execution Price:</span>
                  <span className="font-mono font-semibold text-ink-900">
                    ${activePrice.toFixed(2)} USDG per {targetSymbol}
                  </span>
                </div>
                <div className="flex justify-between items-center text-ink-600">
                  <span>Max Slippage Corridor:</span>
                  <span className="font-mono font-semibold text-ink-900">&lt; 0.05%</span>
                </div>
                <div className="flex justify-between items-center text-ink-600">
                  <span>Est. Network Gas:</span>
                  <span className="font-mono text-emerald-700 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Sponsored (0.00 OKB / Free)
                  </span>
                </div>
                <div className="flex justify-between items-center text-ink-600 pt-2 border-t border-ink-200/80">
                  <span>Execution Venue:</span>
                  <span className="font-mono text-[11px] text-ink-700 font-medium">
                    OKX DEX Aggregator (X Layer 196)
                  </span>
                </div>
              </div>

              {/* Signature Authorization Method (Strict Web3 Wallet) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-600 block">
                  Signature Authorization
                </label>

                <div className="p-3.5 rounded-2xl bg-white border border-ink-200 text-xs flex items-center justify-between shadow-2xs">
                  <div>
                    <div className="font-bold text-ink-950 flex items-center gap-1.5">
                      <span>OKX Wallet / Web3 EOA</span>
                      <span className="rounded bg-accent-100 text-accent-800 text-[9px] font-bold px-1.5 py-0.2">
                        Active
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-500 font-mono mt-0.5">
                      Connected:{" "}
                      <span className="font-bold text-ink-800">
                        {providerState.connectedAddress
                          ? formatShortAddress(providerState.connectedAddress)
                          : formatShortAddress(userAddress)}
                      </span>
                    </div>
                  </div>

                  {!providerState.connectedAddress && (
                    <button
                      type="button"
                      onClick={handleConnectWallet}
                      disabled={isSigning}
                      className="px-3 py-1.5 rounded-xl bg-accent-600 text-white text-[11px] font-bold hover:bg-accent-700 transition-colors cursor-pointer"
                    >
                      Connect Wallet
                    </button>
                  )}
                </div>
              </div>

              {/* Non-Custodial Security Guarantee */}
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                <span className="text-sm leading-none">🛡️</span>
                <p>
                  <strong>Self-Custodial Guarantee:</strong> Private keys never touch Meirei servers or databases. Your signature is authorized locally through your connected Web3 hardware/extension.
                </p>
              </div>

              {/* Error Message */}
              {signingError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
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
              <button
                type="button"
                onClick={handleSignTransaction}
                disabled={isSigning || inputAmount <= 0}
                className="w-full py-3.5 rounded-2xl bg-ink-950 hover:bg-accent-600 text-white text-xs font-bold tracking-wide disabled:opacity-50 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isSigning ? "Awaiting Wallet Signature..." : `Confirm & Sign Quick Buy (${currentUnits.toFixed(4)} ${targetSymbol})`}</span>
                {!isSigning && <span>→</span>}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
