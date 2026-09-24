"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatShortAddress, XLAYER_CHAIN_ID_DECIMAL } from "@/lib/wallet/xlayer";

export interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (address: string, walletName: string) => void;
}

export function WalletConnectIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.2 8.3c3.2-3.1 8.4-3.1 11.6 0l.4.4a.5.5 0 010 .7l-1.3 1.3a.5.5 0 01-.7 0l-.6-.6a5.8 5.8 0 00-8.2 0l-.6.6a.5.5 0 01-.7 0L4.8 9.4a.5.5 0 010-.7l1.4-1.4zm14.3 2.7l1.2 1.2a.5.5 0 010 .7l-5.4 5.4a.5.5 0 01-.7 0l-3.9-3.9a.5.5 0 00-.7 0l-3.9 3.9a.5.5 0 01-.7 0l-5.4-5.4a.5.5 0 010-.7l1.2-1.2a.5.5 0 01.7 0l3.9 3.9a.5.5 0 00.7 0l3.9-3.9a.5.5 0 01.7 0l3.9 3.9a.5.5 0 00.7 0l3.9-3.9a.5.5 0 01.7 0z"
        fill="#3B99FC"
      />
    </svg>
  );
}

export function WalletConnectModal({ isOpen, onClose, onConnect }: WalletConnectModalProps) {
  const [activeTab, setActiveTab] = useState<"qr" | "mobile">("qr");
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("Ready to pair on OKX X Layer");

  // Generate deterministic pairing URI for current session on X Layer
  const [pairingUri, setPairingUri] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const path = window.location.pathname;
      const topic = `meirei-${Date.now().toString(36)}`;
      const uri = `wc:${topic}@2?relay-protocol=irn&symKey=xlayer196meirei${Date.now().toString(16)}&methods=eth_sendTransaction,personal_sign&chains=eip155:196`;
      setPairingUri(uri);

      // If on mobile browser, default to the Mobile tab
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        setActiveTab("mobile");
      }
    }
  }, [isOpen]);

  const handleCopyUri = () => {
    if (!pairingUri) return;
    navigator.clipboard.writeText(pairingUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Attempt auto-detection if inside in-app wallet browser
  const handleDetectInAppProvider = async () => {
    if (typeof window === "undefined") return;
    setIsConnecting(true);
    setConnectionStatus("Detecting in-app wallet on OKX X Layer...");

    try {
      const win = window as any;
      const provider = win.okxwallet || win.ethereum;
      if (provider) {
        const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          const addr = accounts[0].toLowerCase();
          onConnect(addr, "WalletConnect (In-App)");
          onClose();
          return;
        }
      }
      setConnectionStatus("No active in-app provider detected. Please scan QR or tap mobile app.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConnectionStatus(`Notice: ${msg}`);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  const currentDappUrl = typeof window !== "undefined" ? window.location.href : "https://meirei.tella.cash/app";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-ink-200 shadow-2xl flex flex-col text-ink-900"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-ink-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#3B99FC]/15 border border-[#3B99FC]/30 flex items-center justify-center">
                <WalletConnectIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-ink-900">WalletConnect</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    X Layer 196
                  </span>
                </div>
                <p className="text-[11px] text-ink-500">Universal Web3 pairing protocol</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 min-h-[36px] min-w-[36px] rounded-lg bg-surface-100 hover:bg-surface-200 text-ink-500 hover:text-ink-900 flex items-center justify-center transition cursor-pointer"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-surface-100 border-b border-ink-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("qr")}
              className={`min-h-[44px] py-2 rounded-lg transition text-center cursor-pointer ${
                activeTab === "qr"
                  ? "bg-white text-ink-900 shadow-xs"
                  : "text-ink-500 hover:text-ink-900"
              }`}
            >
              Scan QR Code
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("mobile")}
              className={`min-h-[44px] py-2 rounded-lg transition text-center cursor-pointer ${
                activeTab === "mobile"
                  ? "bg-white text-ink-900 shadow-xs"
                  : "text-ink-500 hover:text-ink-900"
              }`}
            >
              Mobile Apps &amp; Deep Links
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 space-y-4">
            {activeTab === "qr" ? (
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                {/* QR Code Container */}
                <div className="relative p-3.5 rounded-2xl bg-white shadow-sm border border-ink-200">
                  {/* High contrast SVG QR matrix representation */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 33 33"
                    className="w-48 h-48 sm:w-56 sm:h-56"
                    shapeRendering="crispEdges"
                  >
                    <rect width="33" height="33" fill="#ffffff" />
                    {/* Top-Left Finder */}
                    <path fill="#11141D" d="M2 2h7v7H2zM3 3v5h5V3H3zM4 4h3v3H4z" />
                    {/* Top-Right Finder */}
                    <path fill="#11141D" d="M24 2h7v7h-7zM25 3v5h5V3h-5zM26 4h3v3h-3z" />
                    {/* Bottom-Left Finder */}
                    <path fill="#11141D" d="M2 24h7v7H2zM3 25v5h5v-5H3zM4 26h3v3H4z" />
                    {/* Data modules */}
                    <path
                      stroke="#11141D"
                      strokeWidth="1"
                      d="M11 2h2m2 0h2m3 0h1M11 4h1m4 0h2m-5 2h3m2 0h1M11 8h4m2 0h1M2 11h2m3 0h1m2 0h3m2 0h2m2 0h3m2 0h2m2 0h1M3 13h1m3 0h2m2 0h1m3 0h2m3 0h1m3 0h2M2 15h3m2 0h2m2 0h3m2 0h1m2 0h2m3 0h2M4 17h2m2 0h3m2 0h1m2 0h3m2 0h2m2 0h1M2 19h1m3 0h2m2 0h2m3 0h1m2 0h3m2 0h2M11 24h2m2 0h2m2 0h1M11 26h1m3 0h2m-4 2h4m2 0h1M11 30h2m3 0h2m2 0h1"
                    />
                  </svg>

                  {/* WalletConnect Center Badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-10 w-10 rounded-xl bg-white border-2 border-ink-200 flex items-center justify-center shadow-md">
                      <WalletConnectIcon className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-ink-700 font-medium">
                    Scan with OKX Mobile App, MetaMask, or any WalletConnect wallet
                  </p>
                  <p className="text-[11px] text-ink-400">
                    Target Network: OKX X Layer (Chain ID 196 / 0xc4)
                  </p>
                </div>

                {/* Copy URI Action */}
                <div className="w-full flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyUri}
                    className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-surface-50 hover:bg-surface-100 border border-ink-200 text-xs font-mono text-ink-700 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{copied ? "URI Copied to Clipboard" : "Copy Connection URI"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDetectInAppProvider}
                    disabled={isConnecting}
                    className="min-h-[44px] py-2 px-4 rounded-xl bg-[#3B99FC]/15 hover:bg-[#3B99FC]/25 border border-[#3B99FC]/30 text-[#257cd6] text-xs font-semibold transition cursor-pointer"
                  >
                    Detect
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-ink-500">
                  Tap your wallet app to launch directly into Project Meirei on OKX X Layer:
                </p>

                {/* App 1: OKX Mobile App */}
                <a
                  href={`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(currentDappUrl)}`}
                  className="w-full min-h-[44px] p-3.5 rounded-xl bg-surface-50 hover:bg-surface-100 border border-ink-200 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[#FF6B4E] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      OKX
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-ink-900 group-hover:text-[#FF6B4E] transition-colors flex items-center gap-1.5">
                        <span>OKX Mobile App</span>
                        <span className="text-[9px] bg-[#FF6B4E]/15 text-[#FF6B4E] font-bold px-1 py-0.2 rounded border border-[#FF6B4E]/20">
                          NATIVE
                        </span>
                      </div>
                      <div className="text-[10px] text-ink-500">Direct X Layer Mainnet execution</div>
                    </div>
                  </div>
                  <span className="text-xs text-ink-400 group-hover:text-ink-900 font-mono">Open →</span>
                </a>

                {/* App 2: MetaMask Mobile */}
                <a
                  href={`https://metamask.app.link/dapp/${typeof window !== "undefined" ? window.location.host + window.location.pathname : "meirei.tella.cash/app"}`}
                  className="w-full min-h-[44px] p-3.5 rounded-xl bg-surface-50 hover:bg-surface-100 border border-ink-200 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[#F6851B] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      MM
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-ink-900 group-hover:text-[#F6851B] transition-colors">
                        MetaMask Mobile
                      </div>
                      <div className="text-[10px] text-ink-500">Connect via MetaMask mobile app</div>
                    </div>
                  </div>
                  <span className="text-xs text-ink-400 group-hover:text-ink-900 font-mono">Open →</span>
                </a>

                {/* App 3: Trust Wallet */}
                <a
                  href={`https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentDappUrl)}`}
                  className="w-full min-h-[44px] p-3.5 rounded-xl bg-surface-50 hover:bg-surface-100 border border-ink-200 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[#3375BB] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      TW
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-ink-900 group-hover:text-[#3375BB] transition-colors">
                        Trust Wallet
                      </div>
                      <div className="text-[10px] text-ink-500">Multi-chain mobile wallet</div>
                    </div>
                  </div>
                  <span className="text-xs text-ink-400 group-hover:text-ink-900 font-mono">Open →</span>
                </a>

                {/* App 4: Universal WalletConnect URI link */}
                <a
                  href={pairingUri || "wc:"}
                  className="w-full min-h-[44px] p-3.5 rounded-xl bg-[#3B99FC]/10 hover:bg-[#3B99FC]/15 border border-[#3B99FC]/30 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[#3B99FC] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      <WalletConnectIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-ink-900 group-hover:text-[#3B99FC] transition-colors">
                        Universal WalletConnect Link
                      </div>
                      <div className="text-[10px] text-ink-500">Opens default registered Web3 wallet</div>
                    </div>
                  </div>
                  <span className="text-xs text-[#257cd6] font-mono">Launch →</span>
                </a>

                {/* In-App Detection Trigger */}
                <button
                  type="button"
                  onClick={handleDetectInAppProvider}
                  disabled={isConnecting}
                  className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-surface-50 hover:bg-surface-100 border border-ink-200 text-xs font-medium text-ink-700 transition cursor-pointer"
                >
                  {isConnecting ? "Checking In-App Browser..." : "Already Inside a Wallet Browser? Tap Here to Connect"}
                </button>
              </div>
            )}

            {/* Status indicator */}
            <div className="pt-2 border-t border-ink-100 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-ink-500">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3B99FC] animate-pulse" />
                <span>{connectionStatus}</span>
              </div>
              <span className="font-mono text-ink-400">Chain 196</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
