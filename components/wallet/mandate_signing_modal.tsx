"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  checkWalletConnection,
  connectInjectedWallet,
  Web3ProviderState,
} from "@/lib/wallet/xlayer_signer";
import { signMandateDeployment, MandateSignatureResult } from "@/lib/wallet/eip2612_permit";
import { formatShortAddress } from "@/lib/wallet/xlayer";

export interface MandateSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyName: string;
  capitalUsdg: number;
  stablecoin: string;
  allocations: Array<{ symbol: string; weightPercent: number }>;
  mandateRule: string;
  rebalanceInterval: string;
  downsideProtection: string;
  userAddress: string;
  onSuccess: (receipt: {
    mandateId: string;
    timestamp: string;
    strategy: string;
    capital: number;
    stablecoin: string;
    rule: string;
    txHash: string;
    signature: string;
    status: string;
    allocations: Array<{ symbol: string; weightPercent: number }>;
  }) => void;
}

export function MandateSigningModal({
  isOpen,
  onClose,
  strategyName,
  capitalUsdg,
  stablecoin,
  allocations,
  mandateRule,
  rebalanceInterval,
  downsideProtection,
  userAddress,
  onSuccess,
}: MandateSigningModalProps) {
  const [providerState, setProviderState] = useState<Web3ProviderState>({
    hasProvider: false,
    providerName: null,
    connectedAddress: null,
    chainId: null,
    isXLayer: false,
  });

  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>("");
  const [signingError, setSigningError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [signatureResult, setSignatureResult] = useState<MandateSignatureResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSigningError(null);
      setIsConfirmed(false);
      setSignatureResult(null);
      setIsSigning(false);
      checkWalletConnection().then((state) => {
        setProviderState(state);
      });
    }
  }, [isOpen]);

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

  const handleConfirmAndSign = async () => {
    setIsSigning(true);
    setSigningError(null);
    setStatusText("Requesting EIP-712 / EIP-2612 mandate signature in your Web3 wallet...");

    const activeAddress = providerState.connectedAddress || userAddress || "0x1960000000000000000000000000000000000196";
    const mandateId = `MAN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      const res = await signMandateDeployment({
        mandateId,
        strategyName,
        capitalUsdg,
        allocations,
        rebalanceBand: rebalanceInterval,
        downsideFloor: downsideProtection,
        owner: activeAddress,
      });

      setSignatureResult(res);
      setIsConfirmed(true);
      setStatusText("Mandate Authorization Confirmed on OKX X Layer (Chain 196)!");

      setTimeout(() => {
        onSuccess({
          mandateId,
          timestamp: res.timestamp,
          strategy: strategyName,
          capital: capitalUsdg,
          stablecoin,
          rule: mandateRule,
          txHash: res.mandateHash,
          signature: res.signature,
          status: "Active & Session-Guarded on Chain 196",
          allocations,
        });
        onClose();
      }, 1100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSigningError(msg);
    } finally {
      setIsSigning(false);
    }
  };

  if (!isOpen) return null;

  const activeAddr = providerState.connectedAddress || userAddress;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg rounded-3xl border border-ink-200/90 bg-white p-6 shadow-2xl text-ink-900 relative selection:bg-accent-500/20"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent-700">
                  OKX X Layer (Chain 196)
                </span>
                <span className="rounded bg-accent-100 px-2 py-0.5 font-mono text-[9px] font-bold text-accent-800">
                  Non-Custodial EIP-712
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-ink-950 sm:text-lg">
                Confirm Wallet Signature: Execute Mandate
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSigning}
              className="rounded-full p-2 text-ink-400 hover:bg-surface-100 hover:text-ink-950 transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4 stroke-current stroke-2 fill-none">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>

          {/* Body Content */}
          <div className="mt-4 space-y-4 text-xs">
            {/* Strategy & Capital Summary */}
            <div className="rounded-2xl border border-ink-200/80 bg-surface-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-ink-500 font-semibold">Strategy</span>
                  <p className="font-display text-sm font-bold text-ink-950">{strategyName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-ink-500 font-semibold">Deployment Capital</span>
                  <p className="font-mono text-base font-bold text-accent-600">
                    ${capitalUsdg.toLocaleString()} {stablecoin}
                  </p>
                </div>
              </div>

              {/* Basket Allocation Breakdown */}
              <div className="border-t border-ink-200/60 pt-2.5">
                <span className="text-[10px] font-mono uppercase text-ink-500 font-bold block mb-1.5">
                  Target Equity Basket Allocation:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {allocations.map((a) => {
                    const allocUsd = (capitalUsdg * a.weightPercent) / 100;
                    return (
                      <div
                        key={a.symbol}
                        className="flex items-center justify-between rounded-lg bg-white border border-ink-200/70 px-2.5 py-1.5 font-mono text-[11px]"
                      >
                        <span className="font-bold text-ink-900">{a.symbol}</span>
                        <span className="text-ink-600">
                          {a.weightPercent}% (${allocUsd.toLocaleString()})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Guardrails summary */}
              <div className="grid grid-cols-2 gap-2 border-t border-ink-200/60 pt-2.5 text-[11px]">
                <div>
                  <span className="text-ink-500 font-medium">Rebalance Band:</span>
                  <p className="font-bold text-ink-900 font-mono">{rebalanceInterval}</p>
                </div>
                <div>
                  <span className="text-ink-500 font-medium">Downside Floor:</span>
                  <p className="font-bold text-ink-900 font-mono">{downsideProtection}</p>
                </div>
              </div>
            </div>

            {/* Network & Gas Guarantees */}
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-emerald-950 text-xs">OKX X Layer Paymaster</span>
              </div>
              <span className="rounded bg-emerald-200/80 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-900">
                100% Sponsored Gas (0 OKB)
              </span>
            </div>

            {/* Wallet Signer Info */}
            <div className="flex items-center justify-between rounded-xl border border-ink-200/80 bg-surface-50/80 px-3.5 py-2.5">
              <div>
                <span className="text-[10px] font-mono uppercase text-ink-500 font-semibold block">Signing Wallet</span>
                <span className="font-mono text-xs font-bold text-ink-900">
                  {activeAddr ? formatShortAddress(activeAddr) : "Web3 Session Account"}
                </span>
                <span className="text-[10px] text-ink-500 font-mono ml-1.5">
                  ({providerState.providerName || "OKX X Layer Session"})
                </span>
              </div>
              {!providerState.connectedAddress && (
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  disabled={isSigning}
                  className="rounded-lg bg-ink-900 hover:bg-ink-800 text-white font-bold text-[11px] px-3 py-1 transition-colors cursor-pointer"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            {/* Error Message */}
            {signingError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs">
                <strong>Signature Error:</strong> {signingError}
              </div>
            )}

            {/* Confirmed State */}
            {isConfirmed && signatureResult && (
              <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-3 text-emerald-900 space-y-1 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px]">
                    ✓
                  </span>
                  <span>Signature Confirmed! Mandate Active on Chain 196</span>
                </div>
                <p className="font-mono text-[10px] text-emerald-700 truncate">
                  Tx Hash: {signatureResult.mandateHash}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSigning || isConfirmed}
                className="w-1/3 py-2.5 rounded-xl border border-ink-200 bg-white hover:bg-surface-100 text-ink-800 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAndSign}
                disabled={isSigning || isConfirmed}
                className="w-2/3 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSigning ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Signing in Wallet...</span>
                  </>
                ) : isConfirmed ? (
                  <span>Confirmed ✓</span>
                ) : (
                  <>
                    <span>Confirm Wallet Signature</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
