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
  onSuccess?: (result: SigningResult) => void;
}

type SigningMethod = "web3" | "passkey" | "otp_session";

export function Web3SigningModal({
  isOpen,
  onClose,
  targetSymbol,
  fromAmountUsdg,
  estimatedUnits,
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

  const [signingMethod, setSigningMethod] = useState<SigningMethod>("web3");
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [signingStatusText, setSigningStatusText] = useState<string>("");
  const [signingError, setSigningError] = useState<string | null>(null);
  const [signingResult, setSigningResult] = useState<SigningResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSigningError(null);
      setSigningResult(null);
      checkWalletConnection().then((state) => {
        setProviderState(state);
        if (!state.hasProvider) {
          setSigningMethod("otp_session");
        }
      });
    }
  }, [isOpen]);

  const handleConnectWallet = async () => {
    setIsSigning(true);
    setSigningError(null);
    try {
      const conn = await connectInjectedWallet();
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
    setIsSigning(true);
    setSigningError(null);
    setSigningStatusText("Requesting client signature in wallet...");

    try {
      if (signingMethod === "web3") {
        if (!providerState.connectedAddress) {
          await connectInjectedWallet();
        }

        setSigningStatusText("Awaiting confirmation in OKX Wallet...");
        const result = await signAndExecuteSwap({
          fromSymbol: "USDG",
          toSymbol: targetSymbol,
          fromAmount: fromAmountUsdg,
          expectedOutput: estimatedUnits,
          slippagePercent: 0.5,
          userAddress: providerState.connectedAddress || userAddress,
        });

        if (result.ok && result.txHash) {
          setSigningResult(result);
          if (onSuccess) onSuccess(result);
        } else {
          setSigningError(result.error || "Transaction signature was rejected.");
        }
      } else {
        // OTP session execution via backend verified session
        setSigningStatusText("Submitting mandate with verified OTP session token...");
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Confirm buy ${estimatedUnits.toFixed(4)} ${targetSymbol} for ${fromAmountUsdg} USDG`,
            walletAddress: userAddress,
            confirm: true,
          }),
        });
        const data = await res.json();
        const returnedHash = data.receipt?.reference || data.delivery?.txs?.[0]?.hash;

        if (!returnedHash) {
          throw new Error(data.error || "No confirmed transaction reference returned from X Layer router.");
        }

        const result: SigningResult = {
          ok: true,
          txHash: returnedHash,
          explorerUrl: `https://www.oklink.com/xlayer/tx/${returnedHash}`,
        };
        setSigningResult(result);
        if (onSuccess) onSuccess(result);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-ink-200 bg-white text-ink-900 shadow-2xl p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-ink-100">
            <div>
              <h3 className="text-base font-bold tracking-tight">Non-Custodial Mandate Execution</h3>
              <p className="text-xs text-ink-500 mt-0.5">OKX X Layer (Chain ID 196) · Zero Server Custody</p>
            </div>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
              aria-label="Close modal"
            >
              [X]
            </button>
          </div>

          {signingResult ? (
            /* Success State */
            <div className="py-6 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold text-lg">
                OK
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink-900">Transaction Broadcasted</h4>
                <p className="text-xs text-ink-500 mt-1">
                  Successfully signed and submitted on X Layer Mainnet.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-ink-50 border border-ink-200 text-left font-mono text-xs space-y-1.5">
                <div className="flex justify-between text-ink-500">
                  <span>Target Asset:</span>
                  <span className="font-semibold text-ink-900">{targetSymbol}</span>
                </div>
                <div className="flex justify-between text-ink-500">
                  <span>Units Acquired:</span>
                  <span className="font-semibold text-emerald-600">{estimatedUnits.toFixed(4)} {targetSymbol}</span>
                </div>
                <div className="flex justify-between text-ink-500">
                  <span>Total Notional:</span>
                  <span className="font-semibold text-ink-900">${fromAmountUsdg.toFixed(2)} USDG</span>
                </div>
                <div className="flex justify-between text-ink-500 pt-1 border-t border-ink-200">
                  <span>Tx Hash:</span>
                  <span className="font-semibold truncate max-w-[200px] text-ink-700">
                    {signingResult.txHash}
                  </span>
                </div>
              </div>

              {signingResult.explorerUrl && (
                <a
                  href={signingResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center min-h-[44px] text-xs font-semibold text-accent hover:underline"
                >
                  View on OKLink X Layer Explorer -&gt;
                </a>
              )}

              <button
                onClick={onClose}
                className="w-full mt-2 min-h-[44px] py-2.5 rounded-xl bg-ink-900 text-white text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          ) : (
            /* Execution Review & Signing Form */
            <div className="mt-4 space-y-4">
              {/* Transaction Breakdown Card */}
              <div className="p-4 rounded-xl bg-ink-50 border border-ink-200 space-y-2 text-xs">
                <div className="flex justify-between items-center text-ink-500">
                  <span>Swap Route</span>
                  <span className="font-mono font-medium text-ink-900">
                    {fromAmountUsdg} USDG -&gt; {estimatedUnits.toFixed(4)} {targetSymbol}
                  </span>
                </div>
                <div className="flex justify-between items-center text-ink-500">
                  <span>Spot Price</span>
                  <span className="font-mono font-medium text-ink-900">
                    ${spotPrice.toFixed(2)} USDG per {targetSymbol}
                  </span>
                </div>
                <div className="flex justify-between items-center text-ink-500">
                  <span>Max Slippage</span>
                  <span className="font-mono font-medium text-ink-900">0.50%</span>
                </div>
                <div className="flex justify-between items-center text-ink-500">
                  <span>Est. Network Gas</span>
                  <span className="font-mono text-emerald-600 font-medium">
                    &lt; 0.0001 OKB (~$0.002)
                  </span>
                </div>
                <div className="flex justify-between items-center text-ink-500 pt-2 border-t border-ink-200">
                  <span>Execution Router</span>
                  <span className="font-mono text-[11px] text-ink-600 truncate max-w-[200px]">
                    OKX DEX Aggregator (X Layer 196)
                  </span>
                </div>
              </div>

              {/* Signing Method Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  Signature Authorization Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSigningMethod("web3")}
                    className={`min-h-[44px] p-2.5 rounded-xl border text-left text-xs transition-all ${
                      signingMethod === "web3"
                        ? "border-accent bg-accent/5 font-bold text-accent"
                        : "border-ink-200 hover:border-ink-300 text-ink-600"
                    }`}
                  >
                    <div className="font-semibold">OKX Wallet / Injected</div>
                    <div className="text-[10px] text-ink-500 mt-0.5">Non-Custodial EOA Signing</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSigningMethod("otp_session")}
                    className={`min-h-[44px] p-2.5 rounded-xl border text-left text-xs transition-all ${
                      signingMethod === "otp_session"
                        ? "border-accent bg-accent/5 font-bold text-accent"
                        : "border-ink-200 hover:border-ink-300 text-ink-600"
                    }`}
                  >
                    <div className="font-semibold">2FA OTP Session</div>
                    <div className="text-[10px] text-ink-500 mt-0.5">Calldata-Bound Token</div>
                  </button>
                </div>

                <div className="p-2 rounded-lg bg-surface-100 border border-dashed border-ink-200 flex items-center justify-between text-[11px] text-ink-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>Phase 2 Roadmap: ERC-4337 Smart Accounts with Passkey Signers</span>
                  </span>
                  <span className="font-mono text-[10px] text-amber-500">Coming Soon</span>
                </div>
              </div>

              {/* Web3 Provider Connection State */}
              {signingMethod === "web3" && (
                <div className="p-3 rounded-xl bg-ink-50 border border-ink-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-ink-500">Connected Wallet: </span>
                    <span className="font-mono font-medium text-ink-900">
                      {providerState.connectedAddress
                        ? formatShortAddress(providerState.connectedAddress)
                        : formatShortAddress(userAddress)}
                    </span>
                  </div>
                  {!providerState.connectedAddress && (
                    <button
                      type="button"
                      onClick={handleConnectWallet}
                      disabled={isSigning}
                      className="min-h-[44px] px-3 py-1.5 rounded-lg bg-accent text-white text-[11px] font-bold hover:opacity-90 transition-opacity"
                    >
                      Connect Extension
                    </button>
                  )}
                </div>
              )}

              {/* Non-Custodial Disclosure */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-700 leading-relaxed">
                Self-Custodial Guarantee: Private keys never touch Meirei servers or databases. Your signature is authorized locally on your device hardware.
              </div>

              {/* Error Message */}
              {signingError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-medium">
                  {signingError}
                </div>
              )}

              {/* Status Notice */}
              {isSigning && signingStatusText && (
                <div className="text-xs text-center text-accent font-medium animate-pulse">
                  {signingStatusText}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSignTransaction}
                disabled={isSigning}
                className="w-full min-h-[44px] py-3 rounded-xl bg-accent text-white text-xs font-bold tracking-wide hover:opacity-95 disabled:opacity-50 transition-all shadow-md cursor-pointer"
              >
                {isSigning ? "Authorizing on X Layer..." : "Sign & Broadcast on X Layer"}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
